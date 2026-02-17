const express = require('express');
const router = express.Router();
const passport = require('passport');
const Game = require('../models/game');
const PlayerStats = require('../models/playerstats');
const ERROR_CODES = require('../utils/errorCodes');
const { capture } = require('../services/sentry');
const { capture: posthogCapture } = require('../services/posthog');
const { client } = require('../services/gemini');
const Folder = require('../models/folder');
const EnemyTeam = require('../models/enemy-team');

const { buildGameFilters, extractFilters } = require('../utils/gameFilters');

const TIER_VALUE = { IRON: 0, BRONZE: 400, SILVER: 800, GOLD: 1200, PLATINUM: 1600, EMERALD: 2000, DIAMOND: 2400, MASTER: 2800, GRANDMASTER: 3300, CHALLENGER: 4000 };
const RANK_VALUE = { IV: 0, III: 100, II: 200, I: 300 };

// Get available filter options (patches, opponents, folders)
router.post('/filter-options', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const team_id = req.user.team_id;
    const [patches, enemyTeams, folders] = await Promise.all([Game.distinct('patch', { team_id }), EnemyTeam.find({ team_id }, { name: 1 }).lean(), Folder.find({ team_id }, { name: 1 }).lean()]);

    // Group patches by major.minor (e.g. "25.S2.3" → "25.S2")
    const majorMinor = [...new Set(patches.filter(Boolean).map((p) => p.split('.').slice(0, 2).join('.')))].sort().reverse();

    return res.status(200).send({ ok: true, data: { patches: majorMinor, opponents: enemyTeams.map((t) => ({ _id: t._id, name: t.name })), folders: folders.map((f) => ({ _id: f._id, name: f.name })) } });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

// Move games to folder - must be before /:id routes
router.put('/move', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const { game_ids, folder_id } = req.body;
    if (!game_ids || !Array.isArray(game_ids)) return res.status(400).send({ ok: false, code: ERROR_CODES.INVALID_BODY });

    await Game.updateMany({ _id: { $in: game_ids } }, { $set: { folder_id: folder_id || null } });

    return res.status(200).send({ ok: true });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.get('/:id/avg-elo', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const game = await Game.findById(req.params.id, { team_side: 1 }).lean();
    if (!game) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });

    const players = await PlayerStats.find({ game_id: game._id }, { side: 1, tier: 1, rank: 1, league_points: 1 }).lean();
    const computeAvg = (list) => {
      const elos = list
        .map((p) => {
          if (!p.tier) return null;
          const t = TIER_VALUE[p.tier.toUpperCase()] ?? 0;
          const r = ['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(p.tier.toUpperCase()) ? 0 : (RANK_VALUE[p.rank] ?? 0);
          return t + r + (p.league_points ?? 0);
        })
        .filter((e) => e !== null);
      return elos.length > 0 ? elos.reduce((a, b) => a + b, 0) / elos.length : null;
    };

    const getRankFromElo = (elo) => {
      const tiers = Object.keys(TIER_VALUE).reverse();
      for (const tier of tiers) {
        if (elo >= TIER_VALUE[tier]) {
          const remaining = elo - TIER_VALUE[tier];
          if (['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(tier)) return { tier, rank: '', lp: Math.round(remaining) };
          const ranks = Object.keys(RANK_VALUE).reverse();
          for (const rank of ranks) {
            if (remaining >= RANK_VALUE[rank]) return { tier, rank, lp: Math.round(remaining - RANK_VALUE[rank]) };
          }
        }
      }
      return { tier: 'IRON', rank: 'IV', lp: Math.round(elo) };
    };
    return res.status(200).send({
      ok: true,
      data: {
        team_avg_elo: computeAvg(players.filter((p) => p.side === game.team_side)) !== null ? getRankFromElo(computeAvg(players.filter((p) => p.side === game.team_side))) : null,
        enemy_avg_elo: computeAvg(players.filter((p) => p.side === (game.team_side === 'blue' ? 'red' : 'blue'))) !== null ? getRankFromElo(computeAvg(players.filter((p) => p.side === (game.team_side === 'blue' ? 'red' : 'blue')))) : null,
      },
    });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.get('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });

    return res.status(200).send({ ok: true, data: game });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.put('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const game = await Game.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!game) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });
    return res.status(200).send({ ok: true, data: game });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.post('/search', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    let query = {};

    if (req.body.team_id) query.team_id = req.body.team_id;
    if (req.body.session_id) query.session_id = req.body.session_id;
    // folder_id: null or undefined = all games, "none" = games without folder, otherwise filter by folder_id
    if (req.body.folder_id === 'none') query.folder_id = { $in: [null, undefined] };
    else if (req.body.folder_id) query.folder_id = req.body.folder_id;
    if (req.body.patch) query.patch = { $regex: `^${req.body.patch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}` };
    if (req.body.opponent_name) query.opponent_name = req.body.opponent_name;
    const limit = req.body.limit || 50;
    const skip = req.body.offset || 0;
    const total = await Game.countDocuments(query);
    const data = await Game.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);
    return res.status(200).send({ ok: true, data, total });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.post('/', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    if (!req.body.title || !req.body.message || !req.body.user_id) return res.status(400).send({ ok: false, code: ERROR_CODES.INVALID_BODY });
    const game = await Game.create(req.body);

    posthogCapture(req.user._id.toString(), 'game_created', { game_id: game._id.toString(), title: game.title });

    return res.status(200).send({ ok: true, data: game });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, data: { code: ERROR_CODES.SERVER_ERROR } });
  }
});

router.delete('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const game = await Game.findByIdAndDelete(req.params.id);
    if (!game) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });

    await PlayerStats.deleteMany({ game_id: game._id });

    posthogCapture(req.user._id.toString(), 'game_deleted', { game_id: game._id.toString() });

    return res.status(200).send({ ok: true });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

//home les card
router.post('/header-stats', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const filters = extractFilters(req.body);
    const { gameIdFilter, gameQuery } = await buildGameFilters({ team_id: req.user.team_id, ...filters });
    const games = await Game.find({ team_id: req.user.team_id, ...gameQuery });
    const playerStats = await PlayerStats.find({ team_id: req.user.team_id, opponent: true, ...gameIdFilter });

    const elos = playerStats
      .map((p) => {
        if (!p.tier) return null;
        const t = TIER_VALUE[p.tier.toUpperCase()] ?? 0;
        const r = ['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(p.tier.toUpperCase()) ? 0 : (RANK_VALUE[p.rank] ?? 0);
        return t + r + (p.league_points ?? 0);
      })
      .filter((e) => e !== null);

    const avgElo = elos.length > 0 ? elos.reduce((a, b) => a + b, 0) / elos.length : 0;

    const getRankFromElo = (elo) => {
      const tiers = Object.keys(TIER_VALUE).reverse();
      for (const tier of tiers) {
        if (elo >= TIER_VALUE[tier]) {
          const remaining = elo - TIER_VALUE[tier];
          if (['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(tier)) {
            return { tier, rank: '', lp: Math.round(remaining) };
          }
          const ranks = Object.keys(RANK_VALUE).reverse();
          for (const rank of ranks) {
            if (remaining >= RANK_VALUE[rank]) {
              return { tier, rank, lp: Math.round(remaining - RANK_VALUE[rank]) };
            }
          }
        }
      }
      return { tier: 'IRON', rank: 'IV', lp: Math.round(elo) };
    };

    const avgRank = getRankFromElo(avgElo);

    const stats = {
      win_rate: games.filter((game) => game.win).length / (games.length || 1),
      total_wins: games.filter((game) => game.win).length,
      total_losses: games.filter((game) => !game.win).length,
      total_games: games.length,
      avg_enemy_elo: avgElo,
      avg_enemy_rank: avgRank,
    };

    return res.status(200).send({ ok: true, data: stats });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

module.exports = router;
