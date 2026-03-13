const express = require('express');
const router = express.Router();
const passport = require('passport');
const ProGame = require('../models/pro-game');
const ERROR_CODES = require('../utils/errorCodes');
const { capture } = require('../services/sentry');

// Get most played champions per role for a team
// picks is an array of { champion, role } in draft pick order
// role values from Oracle's Elixir: "top", "jng", "mid", "bot", "sup"
const ROLE_MAP = { top: 'TOP', jng: 'JGL', mid: 'MID', bot: 'ADC', sup: 'SUP' };
const ROLE_KEYS = ['TOP', 'JGL', 'MID', 'ADC', 'SUP'];

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

    const games = await ProGame.find(query);

    if (games.length === 0) return res.status(200).send({ ok: true, data: {}, totalGames: 0 });

    // Aggregate per role using the role field from each pick
    const roleStats = {};
    for (const key of ROLE_KEYS) roleStats[key] = {};

    for (const game of games) {
      if (!game.picks) continue;
      for (const pick of game.picks) {
        if (!pick.champion || !pick.role) continue;
        const normalizedRole = ROLE_MAP[pick.role.toLowerCase()] || pick.role.toUpperCase();
        if (!roleStats[normalizedRole]) continue;
        if (!roleStats[normalizedRole][pick.champion]) roleStats[normalizedRole][pick.champion] = { games: 0, wins: 0 };
        roleStats[normalizedRole][pick.champion].games++;
        if (game.winner) roleStats[normalizedRole][pick.champion].wins++;
      }
    }

    // Sort by games played per role, take top N
    const result = {};
    for (const role of ROLE_KEYS) {
      result[role] = Object.entries(roleStats[role])
        .map(([name, s]) => ({
          name,
          games: s.games,
          pr: Math.round((s.games / games.length) * 100),
          wr: s.games > 0 ? Math.round((s.wins / s.games) * 100) : 0,
        }))
        .sort((a, b) => b.games - a.games)
        .slice(0, topN || 3);
    }

    return res.status(200).send({ ok: true, data: result, totalGames: games.length });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

// Get average pro draft: most common bans/picks per slot per side
router.post('/draft-averages', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const { league, leagues, year, split } = req.body;
    const query = {};
    applyLeagueFilter(query, league, leagues);
    if (year) query.year = year;
    if (split) query.split = split;

    const games = await ProGame.find(query);
    if (games.length === 0) return res.status(200).send({ ok: true, data: { bans: { blue: [], red: [] }, picks: { blue: [], red: [] } } });

    // Aggregate bans per slot per side
    const banStats = { blue: {}, red: {} };
    const pickStats = { blue: {}, red: {} };

    for (const game of games) {
      if (!game.side) continue;

      if (game.bans) {
        for (let i = 0; i < game.bans.length; i++) {
          if (!banStats[game.side][i]) banStats[game.side][i] = {};
          if (!game.bans[i]) continue;
          banStats[game.side][i][game.bans[i]] = (banStats[game.side][i][game.bans[i]] || 0) + 1;
        }
      }

      if (game.picks) {
        for (let i = 0; i < game.picks.length; i++) {
          if (!pickStats[game.side][i]) pickStats[game.side][i] = {};
          if (!game.picks[i]?.champion) continue;
          pickStats[game.side][i][game.picks[i].champion] = (pickStats[game.side][i][game.picks[i].champion] || 0) + 1;
        }
      }
    }

    // Convert to sorted arrays (top 3 per slot)
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

// Get most-played-with and most-played-against synergies for a champion from pro data
router.post('/synergies', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const { champion, league, leagues, year, split } = req.body;
    if (!champion) return res.status(400).send({ ok: false, code: ERROR_CODES.INVALID_BODY });

    const query = { 'picks.champion': champion };
    applyLeagueFilter(query, league, leagues);
    if (year) query.year = year;
    if (split) query.split = split;

    const games = await ProGame.find(query);
    if (games.length === 0) return res.status(200).send({ ok: true, data: { mostPlayedWith: [], mostPlayedAgainst: [] } });

    const allGamesInMatches = await ProGame.find({ matchId: { $in: games.map((g) => g.matchId) } });

    // Index opponent games by matchId+oppositeSide
    const opponentMap = {};
    for (const g of allGamesInMatches) {
      const key = `${g.matchId}-${g.side}`;
      opponentMap[key] = g;
    }

    const withStats = {};
    const againstStats = {};

    for (const game of games) {
      if (!game.picks) continue;
      for (const mate of game.picks.filter((p) => p.champion && p.champion !== champion).map((p) => p.champion)) {
        if (!withStats[mate]) withStats[mate] = { games: 0, wins: 0 };
        withStats[mate].games++;
        if (game.winner) withStats[mate].wins++;
      }

      for (const pick of opponentMap[`${game.matchId}-${game.side === 'blue' ? 'red' : 'blue'}`]?.picks || []) {
        if (!pick.champion) continue;
        if (!againstStats[pick.champion]) againstStats[pick.champion] = { games: 0, wins: 0 };
        againstStats[pick.champion].games++;
        if (game.winner) againstStats[pick.champion].wins++;
      }
    }

    const mostPlayedWith = Object.entries(withStats)
      .filter(([, s]) => s.games >= 2)
      .map(([name, s]) => ({ name, games: s.games, wr: Math.round((s.wins / s.games) * 100) }))
      .sort((a, b) => b.games - a.games)
      .slice(0, 3);

    const mostPlayedAgainst = Object.entries(againstStats)
      .filter(([, s]) => s.games >= 2)
      .map(([name, s]) => ({ name, games: s.games, wr: Math.round((s.wins / s.games) * 100) }))
      .sort((a, b) => b.games - a.games)
      .slice(0, 3);

    return res.status(200).send({ ok: true, data: { mostPlayedWith, mostPlayedAgainst } });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

// Best champion combos for a team (pairs that win together in pro games)
router.post('/best-combos', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const { league, leagues, year, split, team_name } = req.body;

    const query = {};
    applyLeagueFilter(query, league, leagues);
    if (year) query.year = year;
    if (split) query.split = split;
    if (team_name) query.team_name = team_name;

    const games = await ProGame.find(query);
    if (games.length === 0) return res.status(200).send({ ok: true, data: [] });

    // Count all champion pairs per game
    const pairStats = {};
    for (const game of games) {
      if (!game.picks) continue;
      const champs = game.picks.map((p) => p.champion).filter(Boolean);
      for (let i = 0; i < champs.length; i++) {
        for (let j = i + 1; j < champs.length; j++) {
          const key = [champs[i], champs[j]].sort().join('+');
          if (!pairStats[key]) pairStats[key] = { champ1: champs[i] < champs[j] ? champs[i] : champs[j], champ2: champs[i] < champs[j] ? champs[j] : champs[i], games: 0, wins: 0 };
          pairStats[key].games++;
          if (game.winner) pairStats[key].wins++;
        }
      }
    }

    const combos = Object.values(pairStats)
      .filter((p) => p.games >= (req.body.minGames || 2))
      .map((p) => ({ champ1: p.champ1, champ2: p.champ2, games: p.games, wr: Math.round((p.wins / p.games) * 100) }))
      .sort((a, b) => b.games - a.games || b.wr - a.wr)
      .slice(0, req.body.limit || 3);

    return res.status(200).send({ ok: true, data: combos });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

// Most flexed champions (played on most different roles) from pro data
router.post('/most-flexed', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const { league, leagues, year, split, limit: topN } = req.body;
    const query = {};
    applyLeagueFilter(query, league, leagues);
    if (year) query.year = year;
    if (split) query.split = split;

    const games = await ProGame.find(query);

    if (games.length === 0) return res.status(200).send({ ok: true, data: [], totalGames: 0 });

    // Aggregate champion stats per role
    const champStats = {};

    for (const game of games) {
      if (!game.picks) continue;
      for (const pick of game.picks) {
        if (!pick.champion || !pick.role) continue;
        const normalizedRole = ROLE_MAP[pick.role.toLowerCase()] || pick.role.toUpperCase();

        if (!champStats[pick.champion]) {
          champStats[pick.champion] = { roleStats: {}, totalGames: 0, totalWins: 0 };
        }
        if (!champStats[pick.champion].roleStats[normalizedRole]) {
          champStats[pick.champion].roleStats[normalizedRole] = { games: 0, wins: 0 };
        }
        champStats[pick.champion].roleStats[normalizedRole].games++;
        champStats[pick.champion].totalGames++;
        if (game.winner) {
          champStats[pick.champion].roleStats[normalizedRole].wins++;
          champStats[pick.champion].totalWins++;
        }
      }
    }

    // Filter champions with 2+ roles, sort by number of roles (desc), then by games (desc)
    const flexed = Object.entries(champStats)
      .filter(([, s]) => Object.keys(s.roleStats).length >= 2)
      .map(([name, s]) => {
        const roles = Object.entries(s.roleStats).map(([role, stats]) => ({
          role,
          games: stats.games,
          pr: Math.round((stats.games / games.length) * 100),
          wr: stats.games > 0 ? Math.round((stats.wins / stats.games) * 100) : 0,
        }));
        return {
          name,
          roles,
          rolesCount: roles.length,
          games: s.totalGames,
        };
      })
      .sort((a, b) => b.rolesCount - a.rolesCount || b.games - a.games)
      .slice(0, topN || 6);

    return res.status(200).send({ ok: true, data: flexed, totalGames: games.length });
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

    let matchIds = null;

    // Find games matching context picks on the opposing side
    if (contextChamps.length > 0) {
      matchIds = new Set((await ProGame.find({ ...baseQuery, side: suggestSide === 'blue' ? 'red' : 'blue', 'picks.champion': { $all: contextChamps } })).map((g) => g.matchId));

      if (matchIds.size < 20 && contextChamps.length > 1) {
        matchIds = new Set((await ProGame.find({ ...baseQuery, side: suggestSide === 'blue' ? 'red' : 'blue', 'picks.champion': { $in: contextChamps } })).map((g) => g.matchId));
      }
    }

    // Scan the FULL phase range (not just remaining indices).
    // E.g. if pickIndices=[2] but we're in blue's B2+B3 phase, scan [1,2].
    // Champions already picked (in allUsed) are excluded, so this captures
    // partners regardless of which draft order slot they were in.
    const scanIndices = getFullPhaseRange(suggestSide, pickIndices);
    if (ownChamps.length > 0 && matchIds && matchIds.size > 0) {
      const filteredIds = new Set((await ProGame.find({ ...baseQuery, side: suggestSide, matchId: { $in: [...matchIds] }, 'picks.champion': { $all: ownChamps } })).map((g) => g.matchId));
      // In a partial phase (e.g. 1 pick already made in a 2-pick phase),
      // always apply the filter to stay consistent with depth-3 synergy suggestions.
      // Otherwise, require at least 10 games.
      if (filteredIds.size >= 10 || (scanIndices.length > pickIndices.length && filteredIds.size > 0)) {
        matchIds = filteredIds;
      }
    }

    // Get games on the suggest side
    const suggestQuery = { ...baseQuery, side: suggestSide };
    if (matchIds && matchIds.size > 0) {
      suggestQuery.matchId = { $in: [...matchIds] };
    }

    const games = await ProGame.find(suggestQuery);

    // Level 1: Aggregate champions across the full phase range (excluding allUsed)
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
      .map(([name, s]) => ({
        name,
        games: s.games,
        wr: s.games > 0 ? Math.round((s.wins / s.games) * 100) : 0,
      }))
      .sort((a, b) => b.games - a.games)
      .slice(0, 2);

    // Opponent response phase (used in both depth-2 and depth-3)
    const responsePhase = getNextPhaseForSide(suggestSide === 'blue' ? 'red' : 'blue', suggestSide, blueChamps.length, redChamps.length, pickIndices);

    const tree = [];

    if (pickIndices.length >= 2) {
      // DEPTH 3: pick → synergy (other slot in same phase) → counter
      for (const branch of top2) {
        const branchData = { ...branch, synergies: [] };
        const excludeSet = new Set([...allUsed, branch.name]);
        const synStats = {};
        const synMatchIds = {};

        // Synergy = what was picked at the OTHER indices in the same phase
        for (const detail of champGameDetails[branch.name]) {
          const otherIndices = scanIndices.filter((i) => i !== detail.atIndex);
          for (const idx of otherIndices) {
            const pick = detail.game.picks[idx];
            if (!pick?.champion || excludeSet.has(pick.champion)) continue;
            if (!synStats[pick.champion]) {
              synStats[pick.champion] = { games: 0, wins: 0 };
              synMatchIds[pick.champion] = [];
            }
            synStats[pick.champion].games++;
            if (detail.game.winner) synStats[pick.champion].wins++;
            synMatchIds[pick.champion].push(detail.matchId);
          }
        }

        const topSynergies = Object.entries(synStats)
          .map(([name, s]) => ({
            name,
            games: s.games,
            wr: s.games > 0 ? Math.round((s.wins / s.games) * 100) : 0,
          }))
          .sort((a, b) => b.games - a.games)
          .slice(0, 2);

        // Level 3: For each synergy, find opponent counters
        for (const syn of topSynergies) {
          const synData = { ...syn, counters: [] };

          if (responsePhase) {
            const synUniqueMatchIds = [...new Set(synMatchIds[syn.name])];
            if (synUniqueMatchIds.length > 0) {
              const counterGames = await ProGame.find({
                ...baseQuery,
                side: responsePhase.suggestSide,
                matchId: { $in: synUniqueMatchIds },
              });

              const counterExclude = new Set([...excludeSet, syn.name]);
              const counterStats = {};

              for (const game of counterGames) {
                if (!game.picks) continue;
                for (const idx of responsePhase.pickIndices) {
                  const pick = game.picks[idx];
                  if (!pick?.champion || counterExclude.has(pick.champion)) continue;
                  if (!counterStats[pick.champion]) counterStats[pick.champion] = { games: 0, wins: 0 };
                  counterStats[pick.champion].games++;
                  if (game.winner) counterStats[pick.champion].wins++;
                }
              }

              synData.counters = Object.entries(counterStats)
                .map(([name, s]) => ({
                  name,
                  games: s.games,
                  wr: s.games > 0 ? Math.round((s.wins / s.games) * 100) : 0,
                }))
                .sort((a, b) => b.games - a.games)
                .slice(0, 2);
            }
          }

          branchData.synergies.push(synData);
        }

        tree.push(branchData);
      }
    } else {
      // DEPTH 2: pick → counter (opponent response)
      for (const branch of top2) {
        const uniqueMatchIds = [...new Set(champMatchIds[branch.name])];
        const branchData = { ...branch, responses: [] };

        if (responsePhase && uniqueMatchIds.length > 0) {
          const opponentGames = await ProGame.find({
            ...baseQuery,
            side: responsePhase.suggestSide,
            matchId: { $in: uniqueMatchIds },
          });

          const excludeSet = new Set([...allUsed, branch.name]);
          const respStats = {};

          for (const game of opponentGames) {
            if (!game.picks) continue;
            for (const idx of responsePhase.pickIndices) {
              const pick = game.picks[idx];
              if (!pick?.champion || excludeSet.has(pick.champion)) continue;
              if (!respStats[pick.champion]) respStats[pick.champion] = { games: 0, wins: 0 };
              respStats[pick.champion].games++;
              if (game.winner) respStats[pick.champion].wins++;
            }
          }

          branchData.responses = Object.entries(respStats)
            .map(([name, s]) => ({
              name,
              games: s.games,
              wr: s.games > 0 ? Math.round((s.wins / s.games) * 100) : 0,
            }))
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
    let query = {};

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
