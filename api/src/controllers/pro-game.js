const express = require('express');
const router = express.Router();
const passport = require('passport');
const ProGame = require('../models/pro-game');
const ERROR_CODES = require('../utils/errorCodes');
const { capture } = require('../services/sentry');

// Get most played champions per role for a team
// picks is an array of { champion, role } in draft pick order
// role values from Oracle's Elixir: "top", "jng", "mid", "bot", "sup"
const ROLE_KEYS = ['TOP', 'JGL', 'MID', 'ADC', 'SUP'];
const ROLE_SWITCH = {
  $switch: {
    branches: [
      { case: { $eq: [{ $toLower: '$picks.role' }, 'top'] }, then: 'TOP' },
      { case: { $eq: [{ $toLower: '$picks.role' }, 'jng'] }, then: 'JGL' },
      { case: { $eq: [{ $toLower: '$picks.role' }, 'mid'] }, then: 'MID' },
      { case: { $eq: [{ $toLower: '$picks.role' }, 'bot'] }, then: 'ADC' },
      { case: { $eq: [{ $toLower: '$picks.role' }, 'sup'] }, then: 'SUP' },
    ],
    default: { $toUpper: '$picks.role' },
  },
};

// Helper to apply league filter to a query (supports single league or array of leagues)
const applyLeagueFilter = (query, league, leagues) => {
  if (leagues && leagues.length > 0) query.league = { $in: leagues };
  else if (league) query.league = league;
};

router.post('/most-played', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const { league, leagues, year, split, limit: topN, team_name } = req.body;
    const query = {};
    applyLeagueFilter(query, league, leagues);
    if (year) query.year = year;
    if (split) query.split = split;
    if (team_name) query.team_name = team_name;

    const [totalGames, roleData] = await Promise.all([
      ProGame.countDocuments(query),
      ProGame.aggregate([
        { $match: query },
        { $unwind: '$picks' },
        { $match: { 'picks.champion': { $ne: null }, 'picks.role': { $ne: null } } },
        { $addFields: { normalizedRole: ROLE_SWITCH } },
        { $match: { normalizedRole: { $in: ROLE_KEYS } } },
        { $group: { _id: { role: '$normalizedRole', champion: '$picks.champion' }, games: { $sum: 1 }, wins: { $sum: { $cond: ['$winner', 1, 0] } } } },
        { $sort: { games: -1 } },
        { $group: { _id: '$_id.role', champions: { $push: { name: '$_id.champion', games: '$games', wins: '$wins' } } } },
      ]),
    ]);

    if (totalGames === 0) return res.status(200).send({ ok: true, data: {}, totalGames: 0 });

    const result = {};
    for (const role of ROLE_KEYS) result[role] = [];
    for (const r of roleData) {
      result[r._id] = r.champions.slice(0, topN || 3).map((c) => ({
        name: c.name,
        games: c.games,
        pr: Math.round((c.games / totalGames) * 100),
        wr: c.games > 0 ? Math.round((c.wins / c.games) * 100) : 0,
      }));
    }

    return res.status(200).send({ ok: true, data: result, totalGames });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.post('/draft-averages', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const { league, leagues, year, split } = req.body;
    const query = {};
    applyLeagueFilter(query, league, leagues);
    if (year) query.year = year;
    if (split) query.split = split;

    const sideQuery = { ...query, side: { $ne: null } };

    const [totalGames, banData, pickData] = await Promise.all([
      ProGame.countDocuments(query),
      ProGame.aggregate([
        { $match: sideQuery },
        { $unwind: { path: '$bans', includeArrayIndex: 'idx' } },
        { $match: { bans: { $ne: null } } },
        { $group: { _id: { side: '$side', idx: '$idx', champ: '$bans' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $group: { _id: { side: '$_id.side', idx: '$_id.idx' }, champions: { $push: '$_id.champ' } } },
        { $project: { champions: { $slice: ['$champions', 3] } } },
        { $sort: { '_id.idx': 1 } },
        { $group: { _id: '$_id.side', slots: { $push: '$champions' } } },
      ]),
      ProGame.aggregate([
        { $match: sideQuery },
        { $unwind: { path: '$picks', includeArrayIndex: 'idx' } },
        { $match: { 'picks.champion': { $ne: null } } },
        { $group: { _id: { side: '$side', idx: '$idx', champ: '$picks.champion' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $group: { _id: { side: '$_id.side', idx: '$_id.idx' }, champions: { $push: '$_id.champ' } } },
        { $project: { champions: { $slice: ['$champions', 3] } } },
        { $sort: { '_id.idx': 1 } },
        { $group: { _id: '$_id.side', slots: { $push: '$champions' } } },
      ]),
    ]);

    if (totalGames === 0) return res.status(200).send({ ok: true, data: { bans: { blue: [], red: [] }, picks: { blue: [], red: [] } } });

    const bans = { blue: [], red: [] };
    const picks = { blue: [], red: [] };
    for (const b of banData) bans[b._id] = b.slots;
    for (const p of pickData) picks[p._id] = p.slots;

    return res.status(200).send({ ok: true, data: { bans, picks }, totalGames });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.post('/synergies', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const { champion, league, leagues, year, split } = req.body;
    if (!champion) return res.status(400).send({ ok: false, code: ERROR_CODES.INVALID_BODY });

    const query = { 'picks.champion': champion };
    applyLeagueFilter(query, league, leagues);
    if (year) query.year = year;
    if (split) query.split = split;

    const [mostPlayedWith, mostPlayedAgainst] = await Promise.all([
      ProGame.aggregate([
        { $match: query },
        { $unwind: '$picks' },
        { $match: { 'picks.champion': { $nin: [null, champion] } } },
        { $group: { _id: '$picks.champion', games: { $sum: 1 }, wins: { $sum: { $cond: ['$winner', 1, 0] } } } },
        { $match: { games: { $gte: 2 } } },
        { $sort: { games: -1 } },
        { $limit: 3 },
        { $project: { _id: 0, name: '$_id', games: 1, wr: { $round: [{ $multiply: [{ $divide: ['$wins', '$games'] }, 100] }, 0] } } },
      ]),
      ProGame.aggregate([
        { $match: query },
        {
          $lookup: {
            from: 'pro-games',
            let: { matchId: '$matchId', side: '$side' },
            pipeline: [{ $match: { $expr: { $and: [{ $eq: ['$matchId', '$$matchId'] }, { $ne: ['$side', '$$side'] }] } } }, { $unwind: '$picks' }, { $match: { 'picks.champion': { $ne: null } } }, { $project: { _id: 0, champion: '$picks.champion' } }],
            as: 'opponentPicks',
          },
        },
        { $unwind: '$opponentPicks' },
        { $group: { _id: '$opponentPicks.champion', games: { $sum: 1 }, wins: { $sum: { $cond: ['$winner', 1, 0] } } } },
        { $match: { games: { $gte: 2 } } },
        { $sort: { games: -1 } },
        { $limit: 3 },
        { $project: { _id: 0, name: '$_id', games: 1, wr: { $round: [{ $multiply: [{ $divide: ['$wins', '$games'] }, 100] }, 0] } } },
      ]),
    ]);

    return res.status(200).send({ ok: true, data: { mostPlayedWith, mostPlayedAgainst } });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.post('/best-combos', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const { league, leagues, year, split, team_name } = req.body;

    const query = {};
    applyLeagueFilter(query, league, leagues);
    if (year) query.year = year;
    if (split) query.split = split;
    if (team_name) query.team_name = team_name;

    const combos = await ProGame.aggregate([
      { $match: query },
      {
        $addFields: {
          champNames: {
            $filter: { input: { $map: { input: { $ifNull: ['$picks', []] }, as: 'p', in: '$$p.champion' } }, as: 'c', cond: { $ne: ['$$c', null] } },
          },
        },
      },
      { $addFields: { champNames2: '$champNames' } },
      { $unwind: { path: '$champNames', includeArrayIndex: 'i' } },
      { $unwind: { path: '$champNames2', includeArrayIndex: 'j' } },
      { $match: { $expr: { $lt: ['$i', '$j'] } } },
      {
        $addFields: {
          c1: { $cond: { if: { $lt: ['$champNames', '$champNames2'] }, then: '$champNames', else: '$champNames2' } },
          c2: { $cond: { if: { $lt: ['$champNames', '$champNames2'] }, then: '$champNames2', else: '$champNames' } },
        },
      },
      { $group: { _id: { champ1: '$c1', champ2: '$c2' }, games: { $sum: 1 }, wins: { $sum: { $cond: ['$winner', 1, 0] } } } },
      { $match: { games: { $gte: req.body.minGames || 2 } } },
      { $addFields: { wr: { $round: [{ $multiply: [{ $divide: ['$wins', '$games'] }, 100] }, 0] } } },
      { $sort: { games: -1, wr: -1 } },
      { $limit: req.body.limit || 3 },
      { $project: { _id: 0, champ1: '$_id.champ1', champ2: '$_id.champ2', games: 1, wr: 1 } },
    ]);

    return res.status(200).send({ ok: true, data: combos });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.post('/most-flexed', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const { league, leagues, year, split, limit: topN } = req.body;
    const query = {};
    applyLeagueFilter(query, league, leagues);
    if (year) query.year = year;
    if (split) query.split = split;

    const [totalGames, champData] = await Promise.all([
      ProGame.countDocuments(query),
      ProGame.aggregate([
        { $match: query },
        { $unwind: '$picks' },
        { $match: { 'picks.champion': { $ne: null }, 'picks.role': { $ne: null } } },
        { $addFields: { normalizedRole: ROLE_SWITCH } },
        { $group: { _id: { champion: '$picks.champion', role: '$normalizedRole' }, games: { $sum: 1 }, wins: { $sum: { $cond: ['$winner', 1, 0] } } } },
        {
          $group: {
            _id: '$_id.champion',
            roles: { $push: { role: '$_id.role', games: '$games', wins: '$wins' } },
            totalGames: { $sum: '$games' },
            rolesCount: { $sum: 1 },
          },
        },
        { $match: { rolesCount: { $gte: 2 } } },
        { $sort: { rolesCount: -1, totalGames: -1 } },
        { $limit: topN || 6 },
      ]),
    ]);

    if (totalGames === 0) return res.status(200).send({ ok: true, data: [], totalGames: 0 });

    const flexed = champData.map((c) => ({
      name: c._id,
      roles: c.roles.map((r) => ({
        role: r.role,
        games: r.games,
        pr: Math.round((r.games / totalGames) * 100),
        wr: r.games > 0 ? Math.round((r.wins / r.games) * 100) : 0,
      })),
      rolesCount: c.rolesCount,
      games: c.totalGames,
    }));

    return res.status(200).send({ ok: true, data: flexed, totalGames });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

// Get all distinct leagues
router.get('/leagues/list', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const leagues = await ProGame.distinct('league');
    return res.status(200).send({ ok: true, data: leagues.filter(Boolean).sort() });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

// Live draft suggestions — decision tree (depth 3: pick → synergy → counter)
// Uses standard draft order: B1 → R1,R2 → B2,B3 → R3 → [bans] → R4 → B4,B5 → R5
// picks[] in ProGame are in draft order: picks[0] = team's 1st pick, picks[1] = 2nd, etc.
function getDraftPhaseInfo(blueCount, redCount) {
  if (blueCount === 0 && redCount === 0) return { suggestSide: 'blue', pickIndices: [0] };
  if (blueCount >= 1 && redCount < 2) {
    const indices = [];
    for (let i = redCount; i < 2; i++) indices.push(i);
    return { suggestSide: 'red', pickIndices: indices };
  }
  if (redCount >= 2 && blueCount < 3) {
    const indices = [];
    for (let i = Math.max(blueCount, 1); i < 3; i++) indices.push(i);
    return { suggestSide: 'blue', pickIndices: indices };
  }
  if (blueCount >= 3 && redCount < 3) return { suggestSide: 'red', pickIndices: [2] };
  if (blueCount >= 3 && redCount < 4) return { suggestSide: 'red', pickIndices: [3] };
  if (redCount >= 4 && blueCount < 5) {
    const indices = [];
    for (let i = Math.max(blueCount, 3); i < 5; i++) indices.push(i);
    return { suggestSide: 'blue', pickIndices: indices };
  }
  if (blueCount >= 5 && redCount < 5) return { suggestSide: 'red', pickIndices: [4] };
  return null;
}

// Get the full multi-pick phase range for a given side/pickIndices.
// E.g. if pickIndices=[2] but we're in blue's B2+B3 phase, return [1,2].
// This ensures we scan both draft order slots even when one is already filled.
function getFullPhaseRange(suggestSide, pickIndices) {
  const multiPickPhases =
    suggestSide === 'blue'
      ? [
          [1, 2],
          [3, 4],
        ]
      : [[0, 1]];
  for (const phase of multiPickPhases) {
    if (pickIndices.some((idx) => phase.includes(idx))) {
      return phase;
    }
  }
  return pickIndices;
}

// After the current phase completes, find the next phase for a specific side
function getNextPhaseForSide(targetSide, currentSide, blueCount, redCount, pickIndices) {
  let newBlue = blueCount,
    newRed = redCount;
  if (currentSide === 'blue') {
    newBlue = Math.max(newBlue, Math.max(...pickIndices) + 1);
  } else {
    newRed = Math.max(newRed, Math.max(...pickIndices) + 1);
  }
  let phase = getDraftPhaseInfo(newBlue, newRed);
  while (phase && phase.suggestSide !== targetSide) {
    if (phase.suggestSide === 'blue') {
      newBlue = Math.max(newBlue, Math.max(...phase.pickIndices) + 1);
    } else {
      newRed = Math.max(newRed, Math.max(...phase.pickIndices) + 1);
    }
    phase = getDraftPhaseInfo(newBlue, newRed);
  }
  if (!phase) return null;
  return { ...phase, blueCount: newBlue, redCount: newRed };
}

router.post('/draft-suggestions', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const { bluePicks, redPicks, blueBans, redBans, leagues } = req.body;

    const blueChamps = (bluePicks || []).filter(Boolean);
    const redChamps = (redPicks || []).filter(Boolean);

    const allUsed = new Set([...blueChamps, ...redChamps, ...(blueBans || []).filter(Boolean), ...(redBans || []).filter(Boolean)]);

    const phase = getDraftPhaseInfo(blueChamps.length, redChamps.length);
    if (!phase) {
      return res.status(200).send({ ok: true, data: { tree: [], suggestSide: null, totalGames: 0 } });
    }

    const { suggestSide, pickIndices } = phase;

    const baseQuery = {};
    applyLeagueFilter(baseQuery, null, leagues);

    const contextChamps = suggestSide === 'blue' ? redChamps : blueChamps;
    const ownChamps = suggestSide === 'blue' ? blueChamps : redChamps;
    const oppSide = suggestSide === 'blue' ? 'red' : 'blue';

    let matchIds = null;

    if (contextChamps.length > 0) {
      matchIds = new Set(await ProGame.distinct('matchId', { ...baseQuery, side: oppSide, 'picks.champion': { $all: contextChamps } }));

      if (matchIds.size < 20 && contextChamps.length > 1) {
        matchIds = new Set(await ProGame.distinct('matchId', { ...baseQuery, side: oppSide, 'picks.champion': { $in: contextChamps } }));
      }
    }

    const scanIndices = getFullPhaseRange(suggestSide, pickIndices);
    if (ownChamps.length > 0 && matchIds && matchIds.size > 0) {
      const filteredIds = new Set(await ProGame.distinct('matchId', { ...baseQuery, side: suggestSide, matchId: { $in: [...matchIds] }, 'picks.champion': { $all: ownChamps } }));
      if (filteredIds.size >= 10 || (scanIndices.length > pickIndices.length && filteredIds.size > 0)) {
        matchIds = filteredIds;
      }
    }

    const suggestQuery = { ...baseQuery, side: suggestSide };
    if (matchIds && matchIds.size > 0) {
      suggestQuery.matchId = { $in: [...matchIds] };
    }

    const games = await ProGame.find(suggestQuery);

    const champStats = {};
    const champMatchIds = {};
    const champGameDetails = {};
    for (const game of games) {
      if (!game.picks) continue;
      for (const idx of scanIndices) {
        const pick = game.picks[idx];
        if (!pick?.champion || allUsed.has(pick.champion)) continue;
        if (!champStats[pick.champion]) {
          champStats[pick.champion] = { games: 0, wins: 0 };
          champMatchIds[pick.champion] = [];
          champGameDetails[pick.champion] = [];
        }
        champStats[pick.champion].games++;
        if (game.winner) champStats[pick.champion].wins++;
        champMatchIds[pick.champion].push(game.matchId);
        champGameDetails[pick.champion].push({ matchId: game.matchId, atIndex: idx, game });
      }
    }

    const top2 = Object.entries(champStats)
      .map(([name, s]) => ({ name, games: s.games, wr: s.games > 0 ? Math.round((s.wins / s.games) * 100) : 0 }))
      .sort((a, b) => b.games - a.games)
      .slice(0, 2);

    const responsePhase = getNextPhaseForSide(oppSide, suggestSide, blueChamps.length, redChamps.length, pickIndices);

    const tree = [];

    if (pickIndices.length >= 2) {
      // Phase 1: Compute synergies for all branches (no extra DB query needed)
      const branchSynData = [];
      const allCounterMatchIds = new Set();

      for (const branch of top2) {
        const excludeSet = new Set([...allUsed, branch.name]);
        const synStats = {};
        const synMids = {};

        for (const detail of champGameDetails[branch.name]) {
          for (const idx of scanIndices.filter((i) => i !== detail.atIndex)) {
            const pick = detail.game.picks[idx];
            if (!pick?.champion || excludeSet.has(pick.champion)) continue;
            if (!synStats[pick.champion]) {
              synStats[pick.champion] = { games: 0, wins: 0 };
              synMids[pick.champion] = [];
            }
            synStats[pick.champion].games++;
            if (detail.game.winner) synStats[pick.champion].wins++;
            synMids[pick.champion].push(detail.matchId);
          }
        }

        const topSynergies = Object.entries(synStats)
          .map(([name, s]) => ({ name, games: s.games, wr: s.games > 0 ? Math.round((s.wins / s.games) * 100) : 0 }))
          .sort((a, b) => b.games - a.games)
          .slice(0, 2);

        for (const syn of topSynergies) {
          for (const mid of synMids[syn.name]) allCounterMatchIds.add(mid);
        }

        branchSynData.push({ branch, topSynergies, synMids, excludeSet });
      }

      // Phase 2: Single batched counter query for all branches+synergies
      const counterGamesByMatch = {};
      if (responsePhase && allCounterMatchIds.size > 0) {
        const counterGames = await ProGame.find({ ...baseQuery, side: responsePhase.suggestSide, matchId: { $in: [...allCounterMatchIds] } });
        for (const g of counterGames) {
          if (!counterGamesByMatch[g.matchId]) counterGamesByMatch[g.matchId] = [];
          counterGamesByMatch[g.matchId].push(g);
        }
      }

      // Phase 3: Build tree from pre-fetched data
      for (const { branch, topSynergies, synMids, excludeSet } of branchSynData) {
        const branchData = { ...branch, synergies: [] };

        for (const syn of topSynergies) {
          const synData = { ...syn, counters: [] };

          if (responsePhase) {
            const counterExclude = new Set([...excludeSet, syn.name]);
            const counterStats = {};

            for (const mid of [...new Set(synMids[syn.name])]) {
              for (const game of counterGamesByMatch[mid] || []) {
                if (!game.picks) continue;
                for (const idx of responsePhase.pickIndices) {
                  const pick = game.picks[idx];
                  if (!pick?.champion || counterExclude.has(pick.champion)) continue;
                  if (!counterStats[pick.champion]) counterStats[pick.champion] = { games: 0, wins: 0 };
                  counterStats[pick.champion].games++;
                  if (game.winner) counterStats[pick.champion].wins++;
                }
              }
            }

            synData.counters = Object.entries(counterStats)
              .map(([name, s]) => ({ name, games: s.games, wr: s.games > 0 ? Math.round((s.wins / s.games) * 100) : 0 }))
              .sort((a, b) => b.games - a.games)
              .slice(0, 2);
          }

          branchData.synergies.push(synData);
        }

        tree.push(branchData);
      }
    } else {
      // Single batched counter query for all branches
      const allBranchMatchIds = new Set();
      for (const branch of top2) {
        for (const mid of champMatchIds[branch.name]) allBranchMatchIds.add(mid);
      }

      const counterGamesByMatch = {};
      if (responsePhase && allBranchMatchIds.size > 0) {
        const counterGames = await ProGame.find({ ...baseQuery, side: responsePhase.suggestSide, matchId: { $in: [...allBranchMatchIds] } });
        for (const g of counterGames) {
          if (!counterGamesByMatch[g.matchId]) counterGamesByMatch[g.matchId] = [];
          counterGamesByMatch[g.matchId].push(g);
        }
      }

      for (const branch of top2) {
        const branchData = { ...branch, responses: [] };

        if (responsePhase) {
          const excludeSet = new Set([...allUsed, branch.name]);
          const respStats = {};

          for (const mid of [...new Set(champMatchIds[branch.name])]) {
            for (const game of counterGamesByMatch[mid] || []) {
              if (!game.picks) continue;
              for (const idx of responsePhase.pickIndices) {
                const pick = game.picks[idx];
                if (!pick?.champion || excludeSet.has(pick.champion)) continue;
                if (!respStats[pick.champion]) respStats[pick.champion] = { games: 0, wins: 0 };
                respStats[pick.champion].games++;
                if (game.winner) respStats[pick.champion].wins++;
              }
            }
          }

          branchData.responses = Object.entries(respStats)
            .map(([name, s]) => ({ name, games: s.games, wr: s.games > 0 ? Math.round((s.wins / s.games) * 100) : 0 }))
            .sort((a, b) => b.games - a.games)
            .slice(0, 2);
        }

        tree.push(branchData);
      }
    }

    return res.status(200).send({
      ok: true,
      data: { tree, suggestSide, totalGames: games.length, depth: pickIndices.length >= 2 ? 3 : 2 },
    });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.get('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const proGame = await ProGame.findById(req.params.id);
    if (!proGame) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });

    return res.status(200).send({ ok: true, data: proGame });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.put('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const proGame = await ProGame.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!proGame) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });
    return res.status(200).send({ ok: true, data: proGame });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.post('/search', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const query = {};

    if (req.body.team_id) query.team_id = req.body.team_id;
    const total = await ProGame.countDocuments(query);
    const data = await ProGame.find(query)
      .sort({ createdAt: -1 })
      .skip(req.body.offset || 0)
      .limit(req.body.limit || 50);
    return res.status(200).send({ ok: true, data, total });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.post('/', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    if (!req.body.name) return res.status(400).send({ ok: false, code: ERROR_CODES.INVALID_BODY });
    const proGame = await ProGame.create({ ...req.body, team_id: req.user.team_id, team_name: req.user.team_name });

    return res.status(200).send({ ok: true, data: proGame });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.delete('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const proGame = await ProGame.findByIdAndDelete(req.params.id);
    if (!proGame) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });

    return res.status(200).send({ ok: true });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

module.exports = router;
