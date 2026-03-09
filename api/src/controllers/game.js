const express = require('express');
const router = express.Router();
const passport = require('passport');
const https = require('https');
const WebSocket = require('ws');
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
          const tierUpper = p.tier.toUpperCase();
          const isMasterPlus = ['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(tierUpper);
          const t = isMasterPlus ? TIER_VALUE['MASTER'] : (TIER_VALUE[tierUpper] ?? 0);
          const r = isMasterPlus ? 0 : (RANK_VALUE[p.rank] ?? 0);
          return t + r + (p.league_points ?? 0);
        })
        .filter((e) => e !== null);
      return elos.length > 0 ? elos.reduce((a, b) => a + b, 0) / elos.length : null;
    };

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

// ============================================
// DRAFT FETCHING (drafter.lol / dawe.gg)
// ============================================

function fetchFromDrafter(draftUrl) {
  const parsed = new URL(draftUrl);
  const game = parseInt(parsed.searchParams.get('game')) || 1;
  const url = draftUrl.includes('?') ? draftUrl : `${draftUrl}?game=1`;

  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let html = '';
      res.on('data', (chunk) => (html += chunk));
      res.on('end', () => {
        const startMarker = '\\"drafts\\":[';
        const endMarker = '],\\"fearless\\"';
        const startIdx = html.indexOf(startMarker);
        if (startIdx === -1) return reject('Données de draft introuvables dans la page');

        const arrayStart = startIdx + startMarker.length;
        const endIdx = html.indexOf(endMarker, arrayStart);
        if (endIdx === -1) return reject('Impossible de trouver la fin du tableau de drafts');

        const rawDrafts = html.substring(arrayStart, endIdx);
        const cleaned = rawDrafts.replace(/\\"/g, '"');
        const drafts = JSON.parse(`[${cleaned}]`);

        const draft = drafts[game - 1];
        if (!draft) return reject(`Game ${game} introuvable`);

        const fearlessRestricted = {};
        if (draft.fearless && game > 1) {
          const prevDrafts = drafts.slice(0, game - 1);
          const blue = draft.drafterBlue;
          const red = draft.drafterRed;
          fearlessRestricted[blue] = [];
          fearlessRestricted[red] = [];

          for (const prev of prevDrafts) {
            const prevBlue = prev.drafterBlue;
            const prevRed = prev.drafterRed;
            const bluePicks = [prev.bluePick1, prev.bluePick2, prev.bluePick3, prev.bluePick4, prev.bluePick5];
            const redPicks = [prev.redPick1, prev.redPick2, prev.redPick3, prev.redPick4, prev.redPick5];

            if (prevBlue === blue) fearlessRestricted[blue].push(...bluePicks);
            else if (prevBlue === red) fearlessRestricted[red].push(...bluePicks);

            if (prevRed === blue) fearlessRestricted[blue].push(...redPicks);
            else if (prevRed === red) fearlessRestricted[red].push(...redPicks);
          }
        }

        resolve({
          source: 'drafter',
          fearless: draft.fearless || false,
          blueBans: [draft.blueBan1, draft.blueBan2, draft.blueBan3, draft.blueBan4, draft.blueBan5],
          redBans: [draft.redBan1, draft.redBan2, draft.redBan3, draft.redBan4, draft.redBan5],
          bluePicks: [draft.bluePick1, draft.bluePick2, draft.bluePick3, draft.bluePick4, draft.bluePick5],
          redPicks: [draft.redPick1, draft.redPick2, draft.redPick3, draft.redPick4, draft.redPick5],
          fearlessRestricted,
        });
      });
      res.on('error', reject);
    });
  });
}

function fetchFromDawe(roomId) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('wss://draftlol.dawe.gg');

    const timeout = setTimeout(() => {
      ws.close();
      reject('Timeout: pas de réponse du serveur');
    }, 10000);

    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'joinroom', roomId }));
    });

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'statechange') {
        clearTimeout(timeout);
        ws.close();
        const d = msg.newState;
        const clean = (arr) => (Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : []);

        resolve({
          source: 'dawe',
          bluePicks: clean(d.bluePicks),
          redPicks: clean(d.redPicks),
          blueBans: clean(d.blueBans),
          redBans: clean(d.redBans),
          fearless: false,
          fearlessRestricted: {
            [d.blueName]: clean(d.fearlessBlueChamps),
            [d.redName]: clean(d.fearlessRedChamps),
          },
        });
      }

      if (msg.type === 'error') {
        clearTimeout(timeout);
        ws.close();
        reject('Erreur serveur: ' + msg.reason);
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      reject('WebSocket error: ' + err.message);
    });
  });
}

function detectDraftSource(url) {
  if (url.includes('dawe.gg')) return 'dawe';
  if (url.includes('drafter.lol')) return 'drafter';
  return null;
}

function extractDraftId(url) {
  const parts = url.split('/').filter(Boolean);
  return parts[parts.length - 1].split('?')[0];
}

router.put('/:id/draft', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ ok: false, error: 'URL requise' });

    const source = detectDraftSource(url);
    if (!source) return res.status(400).json({ ok: false, error: 'URL non reconnue. Utilisez un lien drafter.lol ou dawe.gg' });

    const draft = source === 'drafter' ? await fetchFromDrafter(url) : await fetchFromDawe(extractDraftId(url));

    const game = await Game.findByIdAndUpdate(
      req.params.id,
      {
        bluePicks: draft.bluePicks,
        redPicks: draft.redPicks,
        blueBans: draft.blueBans,
        redBans: draft.redBans,
        fearless: draft.fearless || false,
        fearlessRestricted: draft.fearlessRestricted,
        source: source,
        source_url: url,
      },
      { new: true },
    );

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
        const tierUpper = p.tier.toUpperCase();
        const isMasterPlus = ['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(tierUpper);
        const t = isMasterPlus ? TIER_VALUE['MASTER'] : (TIER_VALUE[tierUpper] ?? 0);
        const r = isMasterPlus ? 0 : (RANK_VALUE[p.rank] ?? 0);
        return t + r + (p.league_points ?? 0);
      })
      .filter((e) => e !== null);

    const avgElo = elos.length > 0 ? elos.reduce((a, b) => a + b, 0) / elos.length : 0;

    const getRankFromElo = (elo) => {
      // Master+ : LP are cumulative from MASTER base, determine tier by thresholds but always show cumulative LP
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
      const indices = Object.keys(slotObj).map(Number).sort((a, b) => a - b);
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

    const responseData = {
      bans: { blue: toTop3(banStats.blue), red: toTop3(banStats.red) },
      picks: { blue: toTop3(pickStats.blue), red: toTop3(pickStats.red) },
    };

    return res.status(200).send({
      ok: true,
      data: responseData,
      totalGames: games.length,
    });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

module.exports = router;
