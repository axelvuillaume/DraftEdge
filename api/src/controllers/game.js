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
const { fetchAndSaveDraft, saveManualDraft } = require('../utils/parserDraft');
const { getPatchPrefixes } = require('../utils/patch');

const TIER_VALUE = { IRON: 0, BRONZE: 400, SILVER: 800, GOLD: 1200, PLATINUM: 1600, EMERALD: 2000, DIAMOND: 2400, MASTER: 2800, GRANDMASTER: 3300, CHALLENGER: 4000 };
const RANK_VALUE = { IV: 0, III: 100, II: 200, I: 300 };

// Get available filter options (patches, opponents, folders)
router.post('/filter-options', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const team_id = req.user.team_id;
    const [patches, enemyTeams, folders] = await Promise.all([Game.distinct('patch', { team_id }), EnemyTeam.find({ team_id }, { name: 1 }).lean(), Folder.find({ team_id }, { name: 1 }).lean()]);

    // Group patches by major.minor (e.g. "25.S2.3" → "25.S2")
    const majorMinor = getPatchPrefixes(patches);

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

router.put('/:id/draft/manual', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const game = await saveManualDraft(req.params.id, req.body || {});
    if (!game) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });
    return res.status(200).send({ ok: true, data: game });
  } catch (error) {
    capture(error);
    return res.status(400).json({ ok: false, error: typeof error === 'string' ? error : error.message });
  }
});

router.put('/:id/draft', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ ok: false, code: 'URL required' });

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
    if (req.body.official !== undefined) {
      await PlayerStats.updateMany({ game_id: game._id }, { game_official: req.body.official });
    }
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
    if (req.body.official === false) query.official = { $ne: true };
    if (req.body.search) {
      const s = req.body.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: s, $options: 'i' } },
        { opponent_name: { $regex: s, $options: 'i' } },
        { patch: { $regex: s, $options: 'i' } },
        { game_id: { $regex: s, $options: 'i' } },
      ];
    }
    const limit = req.body.limit || 50;
    const skip = req.body.offset || 0;
    const total = await Game.countDocuments(query);
    const data = await Game.find(query).sort(req.body.sort || { createdAt: -1 }).skip(skip).limit(limit);
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

// Draft slot stats with win rates per champion per position
router.post('/draft-slot-stats', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const team_id = req.body.team_id || req.user.team_id;
    if (!team_id) return res.status(400).send({ ok: false, code: ERROR_CODES.INVALID_BODY });

    const filters = extractFilters(req.body);
    const { gameQuery } = await buildGameFilters({ team_id, ...filters });

    const games = await Game.find({ team_id, ...gameQuery }, { bluePicks: 1, redPicks: 1, blueBans: 1, redBans: 1, win: 1, team_side: 1 });

    const picks = { blue: {}, red: {} };
    const bans = { blue: {}, red: {} };
    const sideRecord = { blue: { wins: 0, total: 0 }, red: { wins: 0, total: 0 } };

    for (const game of games) {
      if (!game.team_side) continue;
      sideRecord[game.team_side].total++;
      if (game.win) sideRecord[game.team_side].wins++;

      const ourSide = game.team_side;
      const theirSide = ourSide === 'blue' ? 'red' : 'blue';

      // Our picks
      const ourPicks = ourSide === 'blue' ? game.bluePicks : game.redPicks;
      if (ourPicks) {
        for (let i = 0; i < ourPicks.length; i++) {
          const champ = ourPicks[i]?.champ;
          if (!champ) continue;
          if (!picks[ourSide][i]) picks[ourSide][i] = {};
          if (!picks[ourSide][i][champ]) picks[ourSide][i][champ] = { games: 0, wins: 0 };
          picks[ourSide][i][champ].games++;
          if (game.win) picks[ourSide][i][champ].wins++;
        }
      }

      // Enemy picks
      const theirPicks = theirSide === 'blue' ? game.bluePicks : game.redPicks;
      if (theirPicks) {
        for (let i = 0; i < theirPicks.length; i++) {
          const champ = theirPicks[i]?.champ;
          if (!champ) continue;
          if (!picks[theirSide][i]) picks[theirSide][i] = {};
          if (!picks[theirSide][i][champ]) picks[theirSide][i][champ] = { games: 0, wins: 0 };
          picks[theirSide][i][champ].games++;
          if (!game.win) picks[theirSide][i][champ].wins++;
        }
      }

      // Our bans
      const ourBans = ourSide === 'blue' ? game.blueBans : game.redBans;
      if (ourBans) {
        for (let i = 0; i < ourBans.length; i++) {
          if (!ourBans[i]) continue;
          if (!bans[ourSide][i]) bans[ourSide][i] = {};
          if (!bans[ourSide][i][ourBans[i]]) bans[ourSide][i][ourBans[i]] = { games: 0, wins: 0 };
          bans[ourSide][i][ourBans[i]].games++;
          if (game.win) bans[ourSide][i][ourBans[i]].wins++;
        }
      }

      // Enemy bans
      const theirBans = theirSide === 'blue' ? game.blueBans : game.redBans;
      if (theirBans) {
        for (let i = 0; i < theirBans.length; i++) {
          if (!theirBans[i]) continue;
          if (!bans[theirSide][i]) bans[theirSide][i] = {};
          if (!bans[theirSide][i][theirBans[i]]) bans[theirSide][i][theirBans[i]] = { games: 0, wins: 0 };
          bans[theirSide][i][theirBans[i]].games++;
          if (!game.win) bans[theirSide][i][theirBans[i]].wins++;
        }
      }
    }

    // Merge multiple slot indices into one rotation
    const mergeSlots = (slotObj, indices) => {
      const merged = {};
      for (const idx of indices) {
        if (!slotObj[idx]) continue;
        for (const [name, s] of Object.entries(slotObj[idx])) {
          if (!merged[name]) merged[name] = { games: 0, wins: 0 };
          merged[name].games += s.games;
          merged[name].wins += s.wins;
        }
      }
      return Object.entries(merged)
        .map(([name, s]) => ({ name, games: s.games, wins: s.wins, wr: s.games > 0 ? Math.round((s.wins / s.games) * 100) : 0 }))
        .sort((a, b) => (req.body.sort === 'wr' ? b.wr - a.wr || b.games - a.games : b.games - a.games || b.wr - a.wr))
        .slice(0, 5);
    };

    // Blue rotations: Rota1=[0], Rota2=[1,2], Rota3=[3,4]
    // Red rotations:  Rota1=[0,1], Rota2=[2,3], Rota3=[4]
    const blueRotations = [[0], [1, 2], [3, 4]].map((indices) => mergeSlots(picks.blue, indices));
    const redRotations = [[0, 1], [2, 3], [4]].map((indices) => mergeSlots(picks.red, indices));

    // Bans: Phase1=[0,1,2], Phase2=[3,4]
    const blueBanPhases = [[0, 1, 2], [3, 4]].map((indices) => mergeSlots(bans.blue, indices));
    const redBanPhases = [[0, 1, 2], [3, 4]].map((indices) => mergeSlots(bans.red, indices));

    return res.status(200).send({
      ok: true,
      data: {
        rotations: { blue: blueRotations, red: redRotations },
        bans: { blue: blueBanPhases, red: redBanPhases },
        sideRecord,
        totalGames: games.length,
      },
    });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

// Role distribution per draft slot group (e.g. what role is picked B1, R1+R2...)
router.post('/draft-slot-roles', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const team_id = req.body.team_id || req.user.team_id;
    if (!team_id) return res.status(400).send({ ok: false, code: ERROR_CODES.INVALID_BODY });

    const filters = extractFilters(req.body);
    const { gameQuery } = await buildGameFilters({ team_id, ...filters });

    const games = await Game.find({ team_id, ...gameQuery }, { bluePicks: 1, redPicks: 1 });

    const groups = [
      { key: 'B1', side: 'blue', indices: [0], rotation: 1, label: 'First pick' },
      { key: 'R1+R2', side: 'red', indices: [0, 1], rotation: 1, label: 'Red double pick' },
      { key: 'B2+B3', side: 'blue', indices: [1, 2], rotation: 1, label: 'Blue double pick' },
      { key: 'R3', side: 'red', indices: [2], rotation: 1, label: 'Last pick of rotation 1' },
      { key: 'R4', side: 'red', indices: [3], rotation: 2, label: 'First pick of rotation 2' },
      { key: 'B4+B5', side: 'blue', indices: [3, 4], rotation: 2, label: 'Blue double pick' },
      { key: 'R5', side: 'red', indices: [4], rotation: 2, label: 'Last pick / Counter' },
    ];

    const slots = groups.map((g) => {
      let slotGames = 0;
      const counts = { top: 0, jungle: 0, mid: 0, bottom: 0, support: 0 };
      for (const game of games) {
        const sidePicks = g.side === 'blue' ? game.bluePicks : game.redPicks;
        if (!sidePicks || !sidePicks.some((p) => p?.champ)) continue;
        slotGames++;
        for (const idx of g.indices) {
          if (!sidePicks[idx]?.role || counts[sidePicks[idx].role] === undefined) continue;
          counts[sidePicks[idx].role]++;
        }
      }
      return {
        key: g.key,
        side: g.side,
        rotation: g.rotation,
        label: g.label,
        games: slotGames,
        roles: Object.entries(counts)
          .map(([role, count]) => ({ role, count, pct: slotGames > 0 ? Math.round((count / slotGames) * 100) : 0 }))
          .sort((a, b) => b.pct - a.pct),
      };
    });

    return res.status(200).send({
      ok: true,
      data: [1, 2].map((rotation) => ({
        rotation,
        blue: slots.filter((s) => s.rotation === rotation && s.side === 'blue'),
        red: slots.filter((s) => s.rotation === rotation && s.side === 'red'),
      })),
    });
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
          const champ = game.bluePicks[i]?.champ;
          if (!champ) continue;
          pickStats.blue[i][champ] = (pickStats.blue[i][champ] || 0) + 1;
        }
      }

      // Red picks (draft order)
      if (game.redPicks && game.redPicks.length > 0) {
        gamesWithRedPicks++;
        for (let i = 0; i < game.redPicks.length; i++) {
          if (!pickStats.red[i]) pickStats.red[i] = {};
          const champ = game.redPicks[i]?.champ;
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
