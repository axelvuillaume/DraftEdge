const express = require('express');
const router = express.Router();
const passport = require('passport');
const Game = require('../models/game');
const PlayerStats = require('../models/player-stats');
const ERROR_CODES = require('../utils/errorCodes');
const { capture } = require('../services/sentry');
const { capture: posthogCapture } = require('../services/posthog');
const Folder = require('../models/folder');
const EnemyTeam = require('../models/enemy-team');

const { buildGameFilters, extractFilters } = require('../utils/gameFilters');
const { fetchAndSaveDraft } = require('../utils/parserDraft');

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

router.get('/home-stats', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const games = await Game.find({ team_id: req.user.team_id }, { win: 1 }).lean();
    const playerStats = await PlayerStats.find({ team_id: req.user.team_id, opponent: true }, { tier: 1, rank: 1, league_points: 1 }).lean();

    const elos = playerStats
      .map((p) => {
        if (!p.tier) return null;
        const tier = p.tier.toUpperCase();
        const isMasterPlus = ['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(tier);
        return (isMasterPlus ? TIER_VALUE['MASTER'] : (TIER_VALUE[tier] ?? 0)) + (isMasterPlus ? 0 : (RANK_VALUE[p.rank] ?? 0)) + (p.league_points ?? 0);
      })
      .filter((e) => e !== null);

    const avgElo = elos.length > 0 ? elos.reduce((a, b) => a + b, 0) / elos.length : 0;

    let avgRank = { tier: 'IRON', rank: 'IV', lp: Math.round(avgElo) };
    if (avgElo >= TIER_VALUE['MASTER']) {
      for (const tier of ['CHALLENGER', 'GRANDMASTER', 'MASTER']) {
        if (avgElo >= TIER_VALUE[tier]) {
          avgRank = { tier, rank: '', lp: Math.round(avgElo - TIER_VALUE['MASTER']) };
          break;
        }
      }
    } else {
      for (const tier of Object.keys(TIER_VALUE).reverse()) {
        if (['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(tier)) continue;
        if (avgElo >= TIER_VALUE[tier]) {
          for (const rank of Object.keys(RANK_VALUE).reverse()) {
            if (avgElo - TIER_VALUE[tier] >= RANK_VALUE[rank]) {
              avgRank = { tier, rank, lp: Math.round(avgElo - TIER_VALUE[tier] - RANK_VALUE[rank]) };
              break;
            }
          }
          break;
        }
      }
    }

    return res.status(200).send({ ok: true, data: { total_games: games.length, win_rate: games.length > 0 ? games.filter((g) => g.win).length / games.length : 0, avg_enemy_rank: avgRank } });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

// page games
router.get('/:id/avg-elo', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const game = await Game.findById(req.params.id, { team_side: 1 });
    if (!game) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });

    const players = await PlayerStats.find({ game_id: game._id });

    const toElo = (p) => {
      if (!p.tier) return null;
      const tier = p.tier.toUpperCase();
      const isMasterPlus = ['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(tier);
      return (isMasterPlus ? TIER_VALUE['MASTER'] : (TIER_VALUE[tier] ?? 0)) + (isMasterPlus ? 0 : (RANK_VALUE[p.rank] ?? 0)) + (p.league_points ?? 0);
    };

    const avgElo = (side) => {
      const { sum, count } = players.reduce(
        (acc, p) => {
          if (p.side !== side) return acc;
          const elo = toElo(p);
          return elo !== null ? { sum: acc.sum + elo, count: acc.count + 1 } : acc;
        },
        { sum: 0, count: 0 },
      );
      return count ? sum / count : null;
    };

    const toRank = (elo) => {
      if (elo === null) return null;
      if (elo >= TIER_VALUE['MASTER']) {
        const lp = Math.round(elo - TIER_VALUE['MASTER']);
        for (const tier of ['CHALLENGER', 'GRANDMASTER', 'MASTER']) {
          if (elo >= TIER_VALUE[tier]) return { tier, rank: '', lp };
        }
      }
      for (const tier of Object.keys(TIER_VALUE).reverse()) {
        if (['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(tier)) continue;
        if (elo >= TIER_VALUE[tier]) {
          const remaining = elo - TIER_VALUE[tier];
          for (const rank of Object.keys(RANK_VALUE).reverse()) {
            if (remaining >= RANK_VALUE[rank]) return { tier, rank, lp: Math.round(remaining - RANK_VALUE[rank]) };
          }
        }
      }
      return { tier: 'IRON', rank: 'IV', lp: Math.round(elo) };
    };

    return res.status(200).send({ ok: true, data: { team_avg_elo: toRank(avgElo(game.team_side)), enemy_avg_elo: toRank(avgElo(game.team_side === 'blue' ? 'red' : 'blue')) } });
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

router.put('/:id/draft', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ ok: false, code: 'URL requise' });

    const game = await fetchAndSaveDraft(req.params.id, url);
    if (!game) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });
    return res.status(200).send({ ok: true, data: game });
  } catch (error) {
    capture(error);
    return res.status(400).json({ ok: false, error: typeof error === 'string' ? error : error.message });
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
    else if (req.body.session_id === null) query.session_id = { $in: [null, undefined] };
    // folder_id: null or undefined = all games, "none" = games without folder, otherwise filter by folder_id
    if (req.body.folder_id === 'none') query.folder_id = { $in: [null, undefined] };
    else if (req.body.folder_id) query.folder_id = req.body.folder_id;
    if (req.body.patch) query.patch = { $regex: `^${req.body.patch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}` };
    if (req.body.opponent_id) query.opponent_id = req.body.opponent_id;
    if (req.body.official === true) query.official = true;
    else if (req.body.official === false) query.official = { $ne: true };
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

// pas utilise
router.post('/', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const game = await Game.create(req.body);
    posthogCapture(req.user._id.toString(), 'game_created', { game_id: game._id.toString(), name: game.name });
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

router.post('/header-stats', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const filters = extractFilters(req.body);
    const { gameIdFilter, gameQuery } = await buildGameFilters({ team_id: req.user.team_id, ...filters });
    const games = await Game.find({ team_id: req.user.team_id, ...gameQuery });
    const playerStats = await PlayerStats.find({ team_id: req.user.team_id, opponent: true, ...gameIdFilter });

    const elos = playerStats
      .map((p) => {
        if (!p.tier) return null;
        const tierUpper = p.tier.toUpperCase();
        const isMasterPlus = ['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(tierUpper);
        const t = isMasterPlus ? TIER_VALUE['MASTER'] : (TIER_VALUE[tierUpper] ?? 0);
        const r = isMasterPlus ? 0 : (RANK_VALUE[p.rank] ?? 0);
        return t + r + (p.league_points ?? 0);
      })
      .filter((e) => e !== null);

    const avgElo = elos.length > 0 ? elos.reduce((a, b) => a + b, 0) / elos.length : 0;

    const getRankFromElo = (elo) => {
      if (elo >= TIER_VALUE['MASTER']) {
        const cumulativeLp = Math.round(elo - TIER_VALUE['MASTER']);
        const tiers = ['CHALLENGER', 'GRANDMASTER', 'MASTER'];
        for (const tier of tiers) {
          if (elo >= TIER_VALUE[tier]) return { tier, rank: '', lp: cumulativeLp };
        }
      }
      const tiers = Object.keys(TIER_VALUE).reverse();
      for (const tier of tiers) {
        if (['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(tier)) continue;
        if (elo >= TIER_VALUE[tier]) {
          const remaining = elo - TIER_VALUE[tier];
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

// Draft averages for my team (pick/ban position stats)
router.post('/draft-averages', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const team_id = req.body.team_id || req.user.team_id;
    if (!team_id) return res.status(400).send({ ok: false, code: ERROR_CODES.INVALID_BODY });

    const filters = extractFilters(req.body);
    const { gameQuery } = await buildGameFilters({ team_id, ...filters });

    const games = await Game.find({ team_id, ...gameQuery }, { bluePicks: 1, redPicks: 1, blueBans: 1, redBans: 1 }).lean();
    if (games.length === 0) return res.status(200).send({ ok: true, data: { bans: { blue: [], red: [] }, picks: { blue: [], red: [] } }, totalGames: 0 });

    // Aggregate directly by blue/red side
    const banStats = { blue: {}, red: {} };
    const pickStats = { blue: {}, red: {} };
    let gamesWithBluePicks = 0;
    let gamesWithRedPicks = 0;

    for (const game of games) {
      // Blue bans
      if (game.blueBans) {
        for (let i = 0; i < game.blueBans.length; i++) {
          if (!banStats.blue[i]) banStats.blue[i] = {};
          const champ = game.blueBans[i];
          if (!champ) continue;
          banStats.blue[i][champ] = (banStats.blue[i][champ] || 0) + 1;
        }
      }

      // Red bans
      if (game.redBans) {
        for (let i = 0; i < game.redBans.length; i++) {
          if (!banStats.red[i]) banStats.red[i] = {};
          const champ = game.redBans[i];
          if (!champ) continue;
          banStats.red[i][champ] = (banStats.red[i][champ] || 0) + 1;
        }
      }

      // Blue picks (draft order)
      if (game.bluePicks && game.bluePicks.length > 0) {
        gamesWithBluePicks++;
        for (let i = 0; i < game.bluePicks.length; i++) {
          if (!pickStats.blue[i]) pickStats.blue[i] = {};
          const champ = game.bluePicks[i];
          if (!champ) continue;
          pickStats.blue[i][champ] = (pickStats.blue[i][champ] || 0) + 1;
        }
      }

      // Red picks (draft order)
      if (game.redPicks && game.redPicks.length > 0) {
        gamesWithRedPicks++;
        for (let i = 0; i < game.redPicks.length; i++) {
          if (!pickStats.red[i]) pickStats.red[i] = {};
          const champ = game.redPicks[i];
          if (!champ) continue;
          pickStats.red[i][champ] = (pickStats.red[i][champ] || 0) + 1;
        }
      }
    }

    const toTop3 = (slotObj) => {
      const result = [];
      const indices = Object.keys(slotObj)
        .map(Number)
        .sort((a, b) => a - b);
      for (const idx of indices) {
        result.push(
          Object.entries(slotObj[idx])
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([name]) => name),
        );
      }
      return result;
    };

    return res.status(200).send({
      ok: true,
      data: {
        bans: { blue: toTop3(banStats.blue), red: toTop3(banStats.red) },
        picks: { blue: toTop3(pickStats.blue), red: toTop3(pickStats.red) },
      },
      totalGames: games.length,
    });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

module.exports = router;
