const express = require('express');
const router = express.Router();
const passport = require('passport');
const ERROR_CODES = require('../utils/errorCodes');
const { capture } = require('../services/sentry');
const PlayerStats = require('../models/player-stats');
const Game = require('../models/game');
const Player = require('../models/player');
const { client: geminiClient } = require('../services/gemini');
const { buildGameFilters, extractFilters } = require('../utils/gameFilters');

// --- Shared helpers ---
const round1 = (val) => Math.round(val * 10) / 10;
const round2 = (val) => Math.round(val * 100) / 100;
const getAvg = (total, count) => (count > 0 ? total / count : 0);
const getPerMin = (total, duration) => (duration > 0 ? total / (duration / 60) : 0);

const aggregateStats = (stats) => {
  return stats.reduce(
    (acc, curr) => {
      acc.kills += curr.kills || 0;
      acc.deaths += curr.deaths || 0;
      acc.assists += curr.assists || 0;
      acc.gold += curr.gold || 0;
      acc.damage += curr.damage?.total_to_champions || 0;
      acc.duration += curr.game_duration || 0;
      acc.cs += curr.cs || 0;
      acc.wins += curr.game_win ? 1 : 0;
      acc.solo_kills += curr.combat?.solo_kills || 0;
      acc.damage_objectives += curr.damage?.to_objectives || 0;
      acc.tank_taken += curr.tank?.total_taken || 0;
      acc.tank_mitigated += curr.tank?.self_mitigated || 0;
      acc.control_wards_placed += curr.vision?.control_wards_placed || 0;
      acc.control_wards_bought += curr.vision?.control_wards_bought || 0;
      acc.vision_score += curr.vision?.score || 0;
      acc.wards_placed += curr.vision?.wards_placed || 0;
      acc.wards_killed += curr.vision?.wards_killed || 0;
      acc.level += curr.level || 0;
      acc.turrets += curr.objectives?.turrets || 0;
      acc.dragons += curr.objectives?.dragons || 0;
      acc.barons += curr.objectives?.barons || 0;
      acc.heralds += curr.objectives?.heralds || 0;
      acc.enemy_jungle += curr.farm?.enemy_jungle || 0;
      acc.gold_from_turret_plates += curr.gold_from_turret_plates || 0;
      acc.gold_from_shutdowns += curr.gold_from_shutdowns || 0;
      acc.games += 1;
      return acc;
    },
    {
      kills: 0,
      deaths: 0,
      assists: 0,
      gold: 0,
      damage: 0,
      duration: 0,
      cs: 0,
      wins: 0,
      solo_kills: 0,
      damage_objectives: 0,
      tank_taken: 0,
      tank_mitigated: 0,
      control_wards_placed: 0,
      control_wards_bought: 0,
      vision_score: 0,
      wards_placed: 0,
      wards_killed: 0,
      level: 0,
      turrets: 0,
      dragons: 0,
      barons: 0,
      heralds: 0,
      enemy_jungle: 0,
      gold_from_turret_plates: 0,
      gold_from_shutdowns: 0,
      games: 0,
    },
  );
};

const getMetrics = (t, e, category) => {
  if (category === 'Combat') {
    return [
      { name: 'DMG / min', team: round1(getPerMin(t.damage, t.duration)), enemies: round1(getPerMin(e.damage, e.duration)) },
      { name: 'Kills / game', team: round1(getAvg(t.kills, t.games)), enemies: round1(getAvg(e.kills, e.games)) },
      { name: 'Deaths / game', team: round1(getAvg(t.deaths, t.games)), enemies: round1(getAvg(e.deaths, e.games)), invert: true },
      {
        name: 'Kill Participation %',
        team: round1(t.kills + t.deaths + t.assists > 0 ? (t.kills / (t.kills + t.deaths + t.assists)) * 100 : 0),
        enemies: round1(e.kills + e.deaths + e.assists > 0 ? (e.kills / (e.kills + e.deaths + e.assists)) * 100 : 0),
      },
      { name: 'DMG / Gold', team: round2(t.gold > 0 ? t.damage / t.gold : 0), enemies: round2(e.gold > 0 ? e.damage / e.gold : 0) },
    ];
  }
  if (category === 'Objectives') {
    return [
      { name: 'Dragons / game', team: round1(getAvg(t.dragons, t.games)), enemies: round1(getAvg(e.dragons, e.games)) },
      { name: 'Heralds / game', team: round1(getAvg(t.heralds, t.games)), enemies: round1(getAvg(e.heralds, e.games)) },
      { name: 'Barons / game', team: round1(getAvg(t.barons, t.games)), enemies: round1(getAvg(e.barons, e.games)) },
      { name: 'Turrets / game', team: round1(getAvg(t.turrets, t.games)), enemies: round1(getAvg(e.turrets, e.games)) },
      { name: 'Objective DMG / game', team: round1(getAvg(t.damage_objectives, t.games)), enemies: round1(getAvg(e.damage_objectives, e.games)) },
    ];
  }
  if (category === 'Vision') {
    return [
      { name: 'Vision Score / min', team: round1(getPerMin(t.vision_score, t.duration)), enemies: round1(getPerMin(e.vision_score, e.duration)) },
      { name: 'Wards Placed / game', team: round1(getAvg(t.wards_placed, t.games)), enemies: round1(getAvg(e.wards_placed, e.games)) },
      { name: 'Wards Killed / game', team: round1(getAvg(t.wards_killed, t.games)), enemies: round1(getAvg(e.wards_killed, e.games)) },
      { name: 'Control Wards / game', team: round1(getAvg(t.control_wards_placed, t.games)), enemies: round1(getAvg(e.control_wards_placed, e.games)) },
      {
        name: 'Ward Clear %',
        team: round1(e.wards_placed > 0 ? (t.wards_killed / e.wards_placed) * 100 : 0),
        enemies: round1(t.wards_placed > 0 ? (e.wards_killed / t.wards_placed) * 100 : 0),
      },
    ];
  }
  if (category === 'Income') {
    return [
      { name: 'Gold / min', team: round1(getPerMin(t.gold, t.duration)), enemies: round1(getPerMin(e.gold, e.duration)) },
      { name: 'CS / min', team: round1(getPerMin(t.cs, t.duration)), enemies: round1(getPerMin(e.cs, e.duration)) },
      { name: 'Level / game', team: round1(getAvg(t.level, t.games)), enemies: round1(getAvg(e.level, e.games)) },
      { name: 'Enemy Jungle / game', team: round1(getAvg(t.enemy_jungle, t.games)), enemies: round1(getAvg(e.enemy_jungle, e.games)) },
      { name: 'Plates Gold / game', team: round1(getAvg(t.gold_from_turret_plates, t.games)), enemies: round1(getAvg(e.gold_from_turret_plates, e.games)) },
    ];
  }
  return [];
};

const calculateScore = (metrics) => {
  let totalChange = 0;
  let count = 0;
  metrics.forEach((m) => {
    if (m.enemies === 0 && m.team === 0) return;
    let diff = m.enemies > 0 ? ((m.team - m.enemies) / m.enemies) * 100 : 10;
    if (m.invert) diff = -diff;
    totalChange += Math.max(Math.min(diff, 100), -100);
    count++;
  });
  const avgChange = count > 0 ? totalChange / count : 0;
  return Math.round(Math.max(0, Math.min(100, 50 + avgChange * 0.5)));
};

const getAllMetrics = (teamAgg, enemyAgg) => {
  const result = {};
  ['Combat', 'Objectives', 'Vision', 'Income'].forEach((cat) => {
    result[cat] = getMetrics(teamAgg, enemyAgg, cat).map((m) => {
      let diff = m.enemies > 0 ? ((m.team - m.enemies) / m.enemies) * 100 : m.team > 0 ? 100 : 0;
      if (m.invert) diff = -diff;
      return { name: m.name, team: m.team, enemies: m.enemies, diff: round1(diff) };
    });
  });
  return result;
};

const calculateWinRateBySide = (statsList) => {
  const gamesBySide = {};
  statsList.forEach((s) => {
    if (!s.game_id || !s.side) return;
    if (!gamesBySide[s.game_id]) {
      gamesBySide[s.game_id] = { side: s.side, win: s.game_win };
    }
  });
  let blueWins = 0,
    blueTotal = 0,
    redWins = 0,
    redTotal = 0;
  Object.values(gamesBySide).forEach((g) => {
    if (g.side === 'blue') {
      blueTotal++;
      if (g.win) blueWins++;
    } else if (g.side === 'red') {
      redTotal++;
      if (g.win) redWins++;
    }
  });
  return {
    blue: blueTotal > 0 ? Math.round((blueWins / blueTotal) * 100) : 0,
    red: redTotal > 0 ? Math.round((redWins / redTotal) * 100) : 0,
    blueGames: blueTotal,
    redGames: redTotal,
  };
};

const calculateWinRateByDuration = (statsList) => {
  const gamesByDuration = {};
  statsList.forEach((s) => {
    if (!s.game_id) return;
    if (!gamesByDuration[s.game_id]) {
      gamesByDuration[s.game_id] = { duration: s.game_duration || 0, win: s.game_win };
    }
  });
  const buckets = [
    { label: '-20', min: 0, max: 20 },
    { label: '20-25', min: 20, max: 25 },
    { label: '25-30', min: 25, max: 30 },
    { label: '30-35', min: 30, max: 35 },
    { label: '35+', min: 35, max: Infinity },
  ];
  return buckets.map((b) => {
    const bucketGames = Object.values(gamesByDuration).filter((g) => {
      const durationMin = g.duration / 60;
      return durationMin >= b.min && durationMin < b.max;
    });
    const wins = bucketGames.filter((g) => g.win).length;
    return { label: b.label, value: bucketGames.length > 0 ? Math.round((wins / bucketGames.length) * 100) : 0, games: bucketGames.length };
  });
};

router.get('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const playerStats = await PlayerStats.findById(req.params.id);
    if (!playerStats) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });

    return res.status(200).send({ ok: true, data: playerStats });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.put('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const playerStats = await PlayerStats.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!playerStats) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });
    return res.status(200).send({ ok: true, data: playerStats });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.post('/search', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    let query = {};

    if (req.body.team_id) query.team_id = req.body.team_id;
    if (req.body.role) query.role = req.body.role;
    if (req.body.game_id) query.game_id = req.body.game_id;
    const limit = req.body.limit || 50;
    const skip = req.body.offset || 0;
    const total = await PlayerStats.countDocuments(query);
    const data = await PlayerStats.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);
    return res.status(200).send({ ok: true, data, total });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.post('/', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    if (!req.body.summoner_name || !req.body.game_id || !req.body.champion) return res.status(400).send({ ok: false, code: ERROR_CODES.INVALID_BODY });
    const playerStats = await PlayerStats.create(req.body);

    return res.status(200).send({ ok: true, data: playerStats });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, data: { code: ERROR_CODES.SERVER_ERROR } });
  }
});

router.delete('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const playerStats = await PlayerStats.findByIdAndDelete(req.params.id);
    if (!playerStats) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });

    return res.status(200).send({ ok: true });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

// Search endpoint for navigation bar - searches players and champions (ally & enemy)
router.post('/search_nav', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || query.trim().length < 2) {
      return res.status(200).send({ ok: true, data: { players: [], allyChampions: [], enemyChampions: [] } });
    }

    const searchQuery = query.trim().toLowerCase();
    const teamId = req.user.team_id;

    const filters = extractFilters(req.body);
    const { gameIdFilter } = await buildGameFilters({ team_id: teamId, ...filters });

    // Get all player stats for this team (both allies and opponents)
    const allStats = await PlayerStats.find({ team_id: teamId, ...gameIdFilter });

    // Build players list and champions data
    const playersMap = {};
    const allyChampionsMap = {};
    const enemyChampionsMap = {};

    allStats.forEach((stat) => {
      if (!stat.opponent) {
        if (!stat.puuid) return;
        if (!playersMap[stat.puuid]) playersMap[stat.puuid] = { puuid: stat.puuid, name: stat.summoner_name, role: stat.role, games: 0, wins: 0 };
        playersMap[stat.puuid].name = stat.summoner_name;
        playersMap[stat.puuid].games++;
        if (stat.game_win) playersMap[stat.puuid].wins++;

        const champKey = `${stat.puuid}-${stat.champion}`;
        if (!allyChampionsMap[champKey]) allyChampionsMap[champKey] = { name: stat.champion, puuid: stat.puuid, playerName: playersMap[stat.puuid].name, role: stat.role, games: 0, wins: 0, isAlly: true };
        allyChampionsMap[champKey].games++;
        if (stat.game_win) allyChampionsMap[champKey].wins++;
      } else {
        if (!enemyChampionsMap[stat.champion]) enemyChampionsMap[stat.champion] = { name: stat.champion, role: stat.role, games: 0, wins: 0, isAlly: false };
        enemyChampionsMap[stat.champion].games++;
        if (!stat.game_win) enemyChampionsMap[stat.champion].wins++;
      }
    });

    // Filter and format players
    const players = Object.values(playersMap)
      .filter((p) => p.name.toLowerCase().includes(searchQuery))
      .sort((a, b) => b.games - a.games)
      .slice(0, 5);

    // Filter and format ally champions
    const allyChampions = Object.values(allyChampionsMap)
      .filter((c) => c.name.toLowerCase().includes(searchQuery))
      .sort((a, b) => b.games - a.games)
      .slice(0, 5);

    // Filter and format enemy champions
    const enemyChampions = Object.values(enemyChampionsMap)
      .filter((c) => c.name.toLowerCase().includes(searchQuery))
      .sort((a, b) => b.games - a.games)
      .slice(0, 5);

    return res.status(200).send({ ok: true, data: { players, allyChampions, enemyChampions } });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.post('/best_wr', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const filters = extractFilters(req.body);
    const { gameIdFilter } = await buildGameFilters({ team_id: req.user.team_id, ...filters });
    const playerStats = await PlayerStats.find({ team_id: req.user.team_id, ...gameIdFilter });

    const calculateBestWR = (stats) => {
      const championsStats = stats.reduce((acc, curr) => {
        if (!curr.champion) return acc;
        if (!acc[curr.champion]) acc[curr.champion] = { wins: 0, games: 0 };
        acc[curr.champion].games += 1;
        if (curr.game_win) acc[curr.champion].wins += 1;
        return acc;
      }, {});

      return Object.entries(championsStats)
        .map(([champion, stats]) => ({
          champion,
          win_rate: stats.games > 0 ? stats.wins / stats.games : 0,
          wins: stats.wins,
          games: stats.games,
        }))
        .filter((item) => item.games > 0)
        .sort((a, b) => {
          if (b.win_rate !== a.win_rate) return b.win_rate - a.win_rate;
          return b.games - a.games;
        })
        .slice(0, 5)
        .map((item) => ({
          champion: item.champion,
          win_rate: Math.round(item.win_rate * 1000) / 1000,
          wins: item.wins,
          games: item.games,
        }));
    };

    const allies = calculateBestWR(playerStats.filter((s) => s.opponent === false));
    const enemies = calculateBestWR(playerStats.filter((s) => s.opponent === true));

    return res.status(200).send({ ok: true, data: { allies, enemies } });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.post('/card_average', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const filters = extractFilters(req.body);
    const { gameIdFilter } = await buildGameFilters({ team_id: req.user.team_id, ...filters });

    const playerStats = await PlayerStats.find({ team_id: req.user.team_id, opponent: false, ...gameIdFilter });
    const enemyStats = await PlayerStats.find({ team_id: req.user.team_id, opponent: true, ...gameIdFilter });

    // Calculate allies stats by role
    const alliesStatsByRole = playerStats.reduce((acc, curr) => {
      if (!curr.role) return acc;
      if (!acc[curr.role]) acc[curr.role] = { kills: 0, deaths: 0, assists: 0, gold: 0, level: 0 };
      acc[curr.role].kills += curr.kills || 0;
      acc[curr.role].deaths += curr.deaths || 0;
      acc[curr.role].assists += curr.assists || 0;
      acc[curr.role].gold += curr.gold || 0;
      acc[curr.role].level += curr.level || 0;
      return acc;
    }, {});

    // Calculate allies totals
    const alliesTotals = playerStats.reduce(
      (acc, curr) => {
        acc.kills += curr.kills || 0;
        acc.deaths += curr.deaths || 0;
        acc.assists += curr.assists || 0;
        acc.gold += curr.gold || 0;
        acc.level += curr.level || 0;
        acc.nb_games += 1;
        return acc;
      },
      { kills: 0, deaths: 0, assists: 0, gold: 0, level: 0, nb_games: 0 },
    );

    const alliesKda = alliesTotals.deaths > 0 ? (alliesTotals.kills + alliesTotals.assists) / alliesTotals.deaths : alliesTotals.kills + alliesTotals.assists;

    // Format allies roles
    const alliesRoles = Object.keys(alliesStatsByRole).reduce((acc, role) => {
      const roleStats = alliesStatsByRole[role];
      const nb_games = playerStats.filter((p) => p.role === role).length;
      const kda = roleStats.deaths > 0 ? (roleStats.kills + roleStats.assists) / roleStats.deaths : roleStats.kills + roleStats.assists;
      acc[role] = { kills: roleStats.kills, deaths: roleStats.deaths, assists: roleStats.assists, kda: Math.round(kda * 100) / 100, gold: roleStats.gold, level: roleStats.level, nb_games: nb_games };
      return acc;
    }, {});

    // Calculate enemies stats by role
    const enemiesStatsByRole = enemyStats.reduce((acc, curr) => {
      if (!curr.role) return acc;
      if (!acc[curr.role]) acc[curr.role] = { kills: 0, deaths: 0, assists: 0, gold: 0 };
      acc[curr.role].kills += curr.kills || 0;
      acc[curr.role].deaths += curr.deaths || 0;
      acc[curr.role].assists += curr.assists || 0;
      acc[curr.role].gold += curr.gold || 0;
      return acc;
    }, {});

    // Calculate enemies totals
    const enemiesTotals = enemyStats.reduce(
      (acc, curr) => {
        acc.kills += curr.kills || 0;
        acc.deaths += curr.deaths || 0;
        acc.assists += curr.assists || 0;
        acc.gold += curr.gold || 0;
        acc.nb_games += 1;
        return acc;
      },
      { kills: 0, deaths: 0, assists: 0, gold: 0, nb_games: 0 },
    );

    const enemiesKda = enemiesTotals.deaths > 0 ? (enemiesTotals.kills + enemiesTotals.assists) / enemiesTotals.deaths : enemiesTotals.kills + enemiesTotals.assists;

    // Format enemies roles (averages)
    const enemiesRoles = Object.keys(enemiesStatsByRole).reduce((acc, role) => {
      const roleStats = enemiesStatsByRole[role];
      const nb_games = enemyStats.filter((p) => p.role === role).length;
      const kda = roleStats.deaths > 0 ? (roleStats.kills + roleStats.assists) / roleStats.deaths : roleStats.kills + roleStats.assists;

      acc[role] = {
        kills: nb_games > 0 ? Math.round((roleStats.kills / nb_games) * 10) / 10 : 0,
        deaths: nb_games > 0 ? Math.round((roleStats.deaths / nb_games) * 10) / 10 : 0,
        assists: nb_games > 0 ? Math.round((roleStats.assists / nb_games) * 10) / 10 : 0,
        kda: Math.round(kda * 100) / 100,
        nb_games: nb_games,
      };
      return acc;
    }, {});

    return res.status(200).send({
      ok: true,
      data: {
        allies: {
          total: { kills: alliesTotals.kills, deaths: alliesTotals.deaths, assists: alliesTotals.assists, kda: Math.round(alliesKda * 100) / 100, gold: alliesTotals.gold, level: alliesTotals.level, nb_games: alliesTotals.nb_games },
          roles: alliesRoles,
        },
        enemies: {
          total: {
            kills: enemiesTotals.nb_games > 0 ? Math.round((enemiesTotals.kills / enemiesTotals.nb_games) * 10) / 10 : 0,
            deaths: enemiesTotals.nb_games > 0 ? Math.round((enemiesTotals.deaths / enemiesTotals.nb_games) * 10) / 10 : 0,
            assists: enemiesTotals.nb_games > 0 ? Math.round((enemiesTotals.assists / enemiesTotals.nb_games) * 10) / 10 : 0,
            kda: Math.round(enemiesKda * 100) / 100,
            gold: enemiesTotals.gold,
            nb_games: enemiesTotals.nb_games,
          },
          roles: enemiesRoles,
        },
      },
    });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.post('/bubble_stats', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const { role, category } = req.body;
    const filters = extractFilters(req.body);
    const { gameIdFilter, gameQuery } = await buildGameFilters({ team_id: req.user.team_id, ...filters });
    if (category === 'Objectives') {
      const games = await Game.find({ team_id: req.user.team_id, ...gameQuery });
      if (!games.length) return res.status(200).send({ ok: true, data: [], scores: [] });

      const aggregateObjectives = (gamesList) => {
        return gamesList.reduce(
          (acc, game) => {
            const isBlue = game.team_side === 'blue';
            const teamStats = isBlue ? game.blue_team : game.red_team;
            const enemyStats = isBlue ? game.red_team : game.blue_team;

            acc.team.dragons += teamStats?.dragons || 0;
            acc.team.barons += teamStats?.barons || 0;
            acc.team.heralds += teamStats?.heralds || 0;
            acc.team.grubs += teamStats?.grubs || 0;
            acc.team.towers += teamStats?.towers || 0;
            acc.team.inhibitors += teamStats?.inhibitors || 0;

            acc.enemy.dragons += enemyStats?.dragons || 0;
            acc.enemy.barons += enemyStats?.barons || 0;
            acc.enemy.heralds += enemyStats?.heralds || 0;
            acc.enemy.grubs += enemyStats?.grubs || 0;
            acc.enemy.towers += enemyStats?.towers || 0;
            acc.enemy.inhibitors += enemyStats?.inhibitors || 0;

            acc.games += 1;
            return acc;
          },
          {
            team: { dragons: 0, barons: 0, heralds: 0, grubs: 0, towers: 0, inhibitors: 0 },
            enemy: { dragons: 0, barons: 0, heralds: 0, grubs: 0, towers: 0, inhibitors: 0 },
            games: 0,
          },
        );
      };

      const agg = aggregateObjectives(games);
      const n = agg.games;
      const avg = (val) => (n > 0 ? round1(val / n) : 0);

      const metrics = [
        { label: 'Dragons / game', team: avg(agg.team.dragons), enemy: avg(agg.enemy.dragons) },
        { label: 'Barons / game', team: avg(agg.team.barons), enemy: avg(agg.enemy.barons) },
        { label: 'Heralds / game', team: avg(agg.team.heralds), enemy: avg(agg.enemy.heralds) },
        { label: 'Grubs / game', team: avg(agg.team.grubs), enemy: avg(agg.enemy.grubs) },
        { label: 'Turrets / game', team: avg(agg.team.towers), enemy: avg(agg.enemy.towers) },
        { label: 'Inhibs / game', team: avg(agg.team.inhibitors), enemy: avg(agg.enemy.inhibitors) },
      ];

      let totalScoreChange = 0;
      let validMetricsCount = 0;
      metrics.forEach((m) => {
        if (m.enemy === 0 && m.team === 0) return;
        if (m.enemy === 0) {
          totalScoreChange += 10;
          return;
        }
        totalScoreChange += Math.max(Math.min(((m.team - m.enemy) / m.enemy) * 100, 100), -100);
        validMetricsCount++;
      });
      const score = Math.round(Math.max(0, Math.min(100, 50 + (validMetricsCount > 0 ? totalScoreChange / validMetricsCount : 0) * 0.5)));

      const dataMetrics = metrics.map((m) => {
        const diffPct = m.enemy > 0 ? ((m.team - m.enemy) / m.enemy) * 100 : m.team > 0 ? 100 : 0;
        return {
          ...m,
          diff: m.enemy === 0 && m.team === 0 ? '0%' : `${diffPct > 0 ? '+' : ''}${Math.round(diffPct)}%`,
          trend: m.team > m.enemy ? 'up' : m.team < m.enemy ? 'down' : 'neutral',
        };
      });

      return res.status(200).send({ ok: true, data: dataMetrics, scores: [], score });
    }

    const allTeamStats = await PlayerStats.find({ team_id: req.user.team_id, opponent: false, ...gameIdFilter });
    const playerStats = role ? allTeamStats.filter((s) => s.role === role) : allTeamStats;

    const allEnemyStats = await PlayerStats.find({ team_id: req.user.team_id, opponent: true, ...gameIdFilter });
    const enemyStats = role ? allEnemyStats.filter((s) => s.role === role) : allEnemyStats;

    const roles = ['top', 'jungle', 'mid', 'bottom', 'support'];
    const scores = roles.map((r) => {
      const roleTeamStats = allTeamStats.filter((s) => s.role === r);
      const roleEnemyStats = allEnemyStats.filter((s) => s.role === r);
      if (!roleTeamStats.length) return { role: r, score: 50 };
      return { role: r, score: calculateScore(getMetrics(aggregateStats(roleTeamStats), aggregateStats(roleEnemyStats), category)) };
    });

    const teamAgg = aggregateStats(playerStats);
    const enemyAgg = aggregateStats(enemyStats);
    const metrics = getMetrics(teamAgg, enemyAgg, category);

    const dataMetrics = metrics.map((m) => {
      const diff = m.enemies > 0 ? ((m.team - m.enemies) / m.enemies) * 100 : m.team > 0 ? 100 : 0;
      const safeDiff = isFinite(diff) ? diff : 0;
      return { label: m.name, team: m.team, enemy: m.enemies, diff: `${safeDiff > 0 ? '+' : ''}${safeDiff.toFixed(1)}%` };
    });

    return res.status(200).send({ ok: true, data: dataMetrics, scores });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

// New endpoint for StatsV2 - returns team, players, and matchup data with category scores
router.post('/team_stats_v2', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const filters = extractFilters(req.body);
    const { gameIdFilter, gameQuery } = await buildGameFilters({ team_id: req.user.team_id, ...filters });
    const playerStats = await PlayerStats.find({ team_id: req.user.team_id, opponent: false, ...gameIdFilter });
    const opponentStats = await PlayerStats.find({ team_id: req.user.team_id, opponent: true, ...gameIdFilter });
    const games = await Game.find({ team_id: req.user.team_id, ...gameQuery });

    // Build opponent map for matchups
    const opponentMap = {};
    for (const opp of opponentStats) {
      if (opp.game_id && opp.role) {
        const key = `${opp.game_id}_${opp.role}`;
        opponentMap[key] = opp;
      }
    }

    // Calculate Objectives score from Game model
    const calculateObjectivesScoreFromGames = () => {
      if (!games.length) return 50;
      const agg = games.reduce(
        (acc, game) => {
          const isBlue = game.team_side === 'blue';
          const team = isBlue ? game.blue_team : game.red_team;
          const enemy = isBlue ? game.red_team : game.blue_team;
          acc.team.dragons += team?.dragons || 0;
          acc.team.barons += team?.barons || 0;
          acc.team.heralds += team?.heralds || 0;
          acc.team.towers += team?.towers || 0;
          acc.enemy.dragons += enemy?.dragons || 0;
          acc.enemy.barons += enemy?.barons || 0;
          acc.enemy.heralds += enemy?.heralds || 0;
          acc.enemy.towers += enemy?.towers || 0;
          acc.games++;
          return acc;
        },
        { team: { dragons: 0, barons: 0, heralds: 0, towers: 0 }, enemy: { dragons: 0, barons: 0, heralds: 0, towers: 0 }, games: 0 },
      );

      const objMetrics = [
        { team: agg.team.dragons / agg.games, enemies: agg.enemy.dragons / agg.games },
        { team: agg.team.barons / agg.games, enemies: agg.enemy.barons / agg.games },
        { team: agg.team.heralds / agg.games, enemies: agg.enemy.heralds / agg.games },
        { team: agg.team.towers / agg.games, enemies: agg.enemy.towers / agg.games },
      ];
      return calculateScore(objMetrics);
    };

    // Get category scores
    const getCategoryScores = (teamAgg, enemyAgg) => {
      const categories = ['Combat', 'Vision', 'Income'];
      const scores = {};
      categories.forEach((cat) => {
        const metrics = getMetrics(teamAgg, enemyAgg, cat);
        scores[cat] = calculateScore(metrics);
      });
      scores.Objectives = calculateObjectivesScoreFromGames();
      return scores;
    };

    // --- Build Team Data ---
    const teamAgg = aggregateStats(playerStats);
    const enemyAgg = aggregateStats(opponentStats);
    const teamCategoryScores = getCategoryScores(teamAgg, enemyAgg);
    const teamMetrics = getAllMetrics(teamAgg, enemyAgg);
    const teamWinRate = games.length > 0 ? round1((games.filter((g) => g.win).length / games.length) * 100) : 0;

    const teamData = {
      name: req.user.team_name || 'Team',
      score: Math.round(Object.values(teamCategoryScores).reduce((a, b) => a + b, 0) / Object.values(teamCategoryScores).length),
      winRate: teamWinRate,
      games: games.length,
      kda: round1(teamAgg.deaths > 0 ? (teamAgg.kills + teamAgg.assists) / teamAgg.deaths : teamAgg.kills + teamAgg.assists),
      categoryScores: teamCategoryScores,
      metrics: teamMetrics,
      winRateBySide: calculateWinRateBySide(playerStats),
      winRateByDuration: calculateWinRateByDuration(playerStats),
    };

    // --- Build Players Data (grouped by puuid, filtered to active roster) ---
    const activePlayers = await Player.find({ team_id: req.user.team_id, active: true });
    const activePuuids = new Set(activePlayers.map((p) => p.puuid).filter(Boolean));

    const playersById = {};
    playerStats.forEach((stat) => {
      if (!stat.puuid) return;
      if (!activePuuids.has(stat.puuid)) return;
      if (!playersById[stat.puuid]) playersById[stat.puuid] = { stats: [], name: stat.summoner_name, role: stat.role, riot_tag: stat.riot_tag };
      playersById[stat.puuid].stats.push(stat);
      playersById[stat.puuid].name = stat.summoner_name;
      if (stat.role) playersById[stat.puuid].role = stat.role;
      if (stat.riot_tag) playersById[stat.puuid].riot_tag = stat.riot_tag;
    });

    const players = Object.entries(playersById).map(([_key, data]) => {
      const name = data.name;

      // Determine primary role (most played)
      const roleCounts = {};
      data.stats.forEach((s) => {
        if (s.role) roleCounts[s.role] = (roleCounts[s.role] || 0) + 1;
      });
      const primaryRole = Object.entries(roleCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || data.role;

      const pStats = data.stats.filter((s) => s.role === primaryRole);
      const pGames = [...new Set(pStats.map((s) => s.game_id))];

      // Get opponent stats for this player's games
      const pOpponentStats = opponentStats.filter((o) => pGames.includes(o.game_id) && o.role === data.role);

      const pAgg = aggregateStats(pStats);
      const pEnemyAgg = aggregateStats(pOpponentStats);
      const pCategoryScores = getCategoryScores(pAgg, pEnemyAgg);

      // Build player's champions stats
      const playerChampionMap = {};
      pStats.forEach((stat) => {
        const champ = stat.champion;
        if (!champ) return;
        if (!playerChampionMap[champ]) playerChampionMap[champ] = { wins: 0, games: 0, stats: [] };
        playerChampionMap[champ].games++;
        if (stat.game_win) playerChampionMap[champ].wins++;
        playerChampionMap[champ].stats.push(stat);
      });

      const playerChampions = Object.entries(playerChampionMap).map(([champName, champData]) => {
        const champWinRate = champData.games > 0 ? round1((champData.wins / champData.games) * 100) : 0;
        const champAgg = aggregateStats(champData.stats);
        const champOpponentStats = opponentStats.filter((o) => champData.stats.some((s) => s.game_id === o.game_id && s.role === o.role));
        const champEnemyAgg = aggregateStats(champOpponentStats);
        const champCategoryScores = getCategoryScores(champAgg, champEnemyAgg);

        // Build matchups against enemy champions for this player champion
        const champMatchupMap = {};
        champData.stats.forEach((stat) => {
          const oppKey = `${stat.game_id}_${stat.role}`;
          const opponent = opponentMap[oppKey];
          if (!opponent) return;
          const oppChamp = opponent.champion;
          if (!champMatchupMap[oppChamp]) champMatchupMap[oppChamp] = { wins: 0, games: 0, teamStats: [], enemyStats: [] };
          champMatchupMap[oppChamp].games++;
          if (stat.game_win) champMatchupMap[oppChamp].wins++;
          champMatchupMap[oppChamp].teamStats.push(stat);
          champMatchupMap[oppChamp].enemyStats.push(opponent);
        });

        const champMatchups = Object.entries(champMatchupMap).map(([oppChamp, mData]) => {
          const mWinRate = mData.games > 0 ? round1((mData.wins / mData.games) * 100) : 0;
          const mDiff = round1(mWinRate - champWinRate);
          const mTeamAgg = aggregateStats(mData.teamStats);
          const mEnemyAgg = aggregateStats(mData.enemyStats);
          const mCategoryScores = getCategoryScores(mTeamAgg, mEnemyAgg);
          return {
            name: oppChamp,
            winRate: mWinRate,
            games: mData.games,
            diff: mDiff,
            score: Math.round(Object.values(mCategoryScores).reduce((a, b) => a + b, 0) / Object.values(mCategoryScores).length),
            categoryScores: mCategoryScores,
            metrics: getAllMetrics(mTeamAgg, mEnemyAgg),
            winRateBySide: calculateWinRateBySide(mData.teamStats),
            winRateByDuration: calculateWinRateByDuration(mData.teamStats),
          };
        });

        return {
          name: champName,
          winRate: champWinRate,
          games: champData.games,
          kda: round1(champAgg.deaths > 0 ? (champAgg.kills + champAgg.assists) / champAgg.deaths : champAgg.kills + champAgg.assists),
          score: Math.round(Object.values(champCategoryScores).reduce((a, b) => a + b, 0) / Object.values(champCategoryScores).length),
          categoryScores: champCategoryScores,
          metrics: getAllMetrics(champAgg, champEnemyAgg),
          winRateBySide: calculateWinRateBySide(champData.stats),
          winRateByDuration: calculateWinRateByDuration(champData.stats),
          champions: champMatchups,
        };
      });

      return {
        puuid: _key,
        name,
        riot_tag: data.riot_tag || '',
        role: primaryRole || data.role || 'Unknown',
        score: Math.round(Object.values(pCategoryScores).reduce((a, b) => a + b, 0) / Object.values(pCategoryScores).length),
        winRate: pAgg.games > 0 ? round1((pAgg.wins / pAgg.games) * 100) : 0,
        games: pAgg.games,
        kda: round1(pAgg.deaths > 0 ? (pAgg.kills + pAgg.assists) / pAgg.deaths : pAgg.kills + pAgg.assists),
        categoryScores: pCategoryScores,
        metrics: getAllMetrics(pAgg, pEnemyAgg),
        winRateBySide: calculateWinRateBySide(pStats),
        winRateByDuration: calculateWinRateByDuration(pStats),
        champions: playerChampions,
      };
    });

    // Sort players by role order
    const roleOrder = { top: 0, jungle: 1, mid: 2, bottom: 3, support: 4 };
    players.sort((a, b) => (roleOrder[a.role] ?? 5) - (roleOrder[b.role] ?? 5));

    return res.status(200).send({ ok: true, data: { ...teamData, players } });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

// Get enemy champion stats - stats when facing a specific enemy champion
router.post('/enemy_champion_stats', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const { championName } = req.body;
    if (!championName) {
      return res.status(400).send({ ok: false, code: ERROR_CODES.INVALID_BODY });
    }

    const filters = extractFilters(req.body);
    const { gameIdFilter, gameQuery } = await buildGameFilters({ team_id: req.user.team_id, ...filters });
    const playerStats = await PlayerStats.find({ team_id: req.user.team_id, opponent: false, ...gameIdFilter });
    const opponentStats = await PlayerStats.find({ team_id: req.user.team_id, opponent: true, ...gameIdFilter });
    const games = await Game.find({ team_id: req.user.team_id, ...gameQuery });

    const getCategoryScores = (teamAgg, enemyAgg) => {
      const categories = ['Combat', 'Objectives', 'Vision', 'Income'];
      const scores = {};
      categories.forEach((cat) => {
        const metrics = getMetrics(teamAgg, enemyAgg, cat);
        scores[cat] = calculateScore(metrics);
      });
      return scores;
    };

    // Find all games where this enemy champion was played
    const enemyChampStats = opponentStats.filter((s) => s.champion === championName);
    if (enemyChampStats.length === 0) {
      return res.status(404).send({ ok: false, code: 'CHAMPION_NOT_FOUND' });
    }

    // Get unique game IDs where this enemy champion appeared
    const gameIdsWithChamp = [...new Set(enemyChampStats.map((s) => s.game_id))];

    // Get our team's stats in those games
    const ourStatsVsChamp = playerStats.filter((s) => gameIdsWithChamp.includes(s.game_id));

    // Get the role of the enemy champion (most common)
    const roleCount = {};
    enemyChampStats.forEach((s) => {
      if (s.role) roleCount[s.role] = (roleCount[s.role] || 0) + 1;
    });
    const enemyRole = Object.entries(roleCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';

    // Aggregate stats
    const ourAgg = aggregateStats(ourStatsVsChamp);
    const enemyAgg = aggregateStats(enemyChampStats);

    // Win rate calculation (from our perspective - how many games we WON against this champion)
    const uniqueGames = [...new Set(ourStatsVsChamp.map((s) => s.game_id))];
    const winsVsChamp = uniqueGames.filter((gameId) => {
      const stat = ourStatsVsChamp.find((s) => s.game_id === gameId);
      return stat?.game_win;
    }).length;
    const winRateVsChamp = uniqueGames.length > 0 ? round1((winsVsChamp / uniqueGames.length) * 100) : 0;

    const categoryScores = getCategoryScores(ourAgg, enemyAgg);

    // Build matchups - which of our champions performed best/worst against this enemy champion
    const ourChampMatchupMap = {};
    ourStatsVsChamp.forEach((stat) => {
      // Only consider our player in the same role as the enemy champion
      if (stat.role !== enemyRole) return;
      const ourChamp = stat.champion;
      if (!ourChamp) return;
      if (!ourChampMatchupMap[ourChamp]) ourChampMatchupMap[ourChamp] = { wins: 0, games: 0, teamStats: [], enemyStats: [] };
      ourChampMatchupMap[ourChamp].games++;
      if (stat.game_win) ourChampMatchupMap[ourChamp].wins++;
      ourChampMatchupMap[ourChamp].teamStats.push(stat);

      // Find the corresponding enemy stat
      const enemyStat = enemyChampStats.find((e) => e.game_id === stat.game_id);
      if (enemyStat) ourChampMatchupMap[ourChamp].enemyStats.push(enemyStat);
    });

    const matchups = Object.entries(ourChampMatchupMap).map(([ourChamp, data]) => {
      const mWinRate = data.games > 0 ? round1((data.wins / data.games) * 100) : 0;
      const mDiff = round1(mWinRate - winRateVsChamp);
      return { name: ourChamp, winRate: mWinRate, games: data.games, diff: mDiff };
    });

    // Calculate enemy champion's win rate (inverse of ours) and KDA
    const enemyWinRate = uniqueGames.length > 0 ? round1(100 - winRateVsChamp) : 0;
    const enemyKDA = round1(enemyAgg.deaths > 0 ? (enemyAgg.kills + enemyAgg.assists) / enemyAgg.deaths : enemyAgg.kills + enemyAgg.assists);

    const result = {
      name: championName,
      role: enemyRole,
      isEnemy: true,
      score: Math.round(Object.values(categoryScores).reduce((a, b) => a + b, 0) / Object.values(categoryScores).length),
      // Our stats vs this champion
      ourWinRate: winRateVsChamp,
      ourKda: round1(ourAgg.deaths > 0 ? (ourAgg.kills + ourAgg.assists) / ourAgg.deaths : ourAgg.kills + ourAgg.assists),
      // Enemy champion's stats
      winRate: enemyWinRate,
      games: uniqueGames.length,
      kda: enemyKDA,
      categoryScores,
      metrics: getAllMetrics(ourAgg, enemyAgg),
      winRateBySide: calculateWinRateBySide(ourStatsVsChamp),
      winRateByDuration: calculateWinRateByDuration(ourStatsVsChamp),
      champions: matchups,
    };

    return res.status(200).send({ ok: true, data: result });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.post('/team_performance', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const filters = extractFilters(req.body);
    const { gameIdFilter, gameQuery } = await buildGameFilters({ team_id: req.user.team_id, ...filters });
    const allTeamStats = await PlayerStats.find({ team_id: req.user.team_id, opponent: false, ...gameIdFilter });
    const allEnemyStats = await PlayerStats.find({ team_id: req.user.team_id, opponent: true, ...gameIdFilter });

    const getMetricsByCategory = (t, e, category) => {
      const getAvg = (total, games) => (games > 0 ? total / games : 0);
      const getPerMin = (total, duration) => (duration > 0 ? total / (duration / 60) : 0);

      if (category === 'Combat') {
        return [
          { label: 'DMG / min', team: Math.round(getPerMin(t.damage, t.duration)), enemy: Math.round(getPerMin(e.damage, e.duration)) },
          { label: 'Kills / game', team: parseFloat(getAvg(t.kills, t.games).toFixed(1)), enemy: parseFloat(getAvg(e.kills, e.games).toFixed(1)) },
          { label: 'Deaths / game', team: parseFloat(getAvg(t.deaths, t.games).toFixed(1)), enemy: parseFloat(getAvg(e.deaths, e.games).toFixed(1)), invert: true },
          {
            label: 'KDA',
            team: parseFloat((t.deaths > 0 ? (t.kills + t.assists) / t.deaths : t.kills + t.assists).toFixed(2)),
            enemy: parseFloat((e.deaths > 0 ? (e.kills + e.assists) / e.deaths : e.kills + e.assists).toFixed(2)),
          },
          { label: 'DMG / Gold', team: parseFloat((t.gold > 0 ? t.damage / t.gold : 0).toFixed(2)), enemy: parseFloat((e.gold > 0 ? e.damage / e.gold : 0).toFixed(2)) },
        ];
      }
      if (category === 'Vision') {
        return [
          { label: 'Vision Score / min', team: parseFloat(getPerMin(t.vision_score, t.duration).toFixed(1)), enemy: parseFloat(getPerMin(e.vision_score, e.duration).toFixed(1)) },
          { label: 'Wards Placed / game', team: parseFloat(getAvg(t.wards_placed, t.games).toFixed(1)), enemy: parseFloat(getAvg(e.wards_placed, e.games).toFixed(1)) },
          { label: 'Wards / min', team: parseFloat(getPerMin(t.wards_placed, t.duration).toFixed(1)), enemy: parseFloat(getPerMin(e.wards_placed, e.duration).toFixed(1)) },
          { label: 'Wards Killed / game', team: parseFloat(getAvg(t.wards_killed, t.games).toFixed(1)), enemy: parseFloat(getAvg(e.wards_killed, e.games).toFixed(1)) },
          {
            label: 'Ward Placed / Killed',
            team: e.wards_placed > 0 ? parseFloat(((t.wards_killed / e.wards_placed) * 100).toFixed(1)) : 0,
            enemy: t.wards_placed > 0 ? parseFloat(((e.wards_killed / t.wards_placed) * 100).toFixed(1)) : 0,
          },
          {
            label: 'Control Wards Placed / game',
            team: parseFloat(getAvg(t.control_wards_placed, t.games).toFixed(1)),
            enemy: parseFloat(getAvg(e.control_wards_placed, e.games).toFixed(1)),
          },
        ];
      }
      if (category === 'Income') {
        return [
          { label: 'Gold / min', team: parseFloat(getPerMin(t.gold, t.duration).toFixed(1)), enemy: parseFloat(getPerMin(e.gold, e.duration).toFixed(1)) },
          { label: 'CS / game', team: parseFloat(getAvg(t.cs, t.games).toFixed(1)), enemy: parseFloat(getAvg(e.cs, e.games).toFixed(1)) },
          { label: 'Gold Efficiency', team: parseFloat((t.gold > 0 ? t.damage / t.gold : 0).toFixed(1)), enemy: parseFloat((e.gold > 0 ? e.damage / e.gold : 0).toFixed(1)) },
          { label: 'Level', team: parseFloat(getAvg(t.level, t.games).toFixed(1)), enemy: parseFloat(getAvg(e.level, e.games).toFixed(1)) },
          { label: 'Enemy jungle monsters / game', team: parseFloat(getAvg(t.enemy_jungle, t.games).toFixed(1)), enemy: parseFloat(getAvg(e.enemy_jungle, e.games).toFixed(1)) },
        ];
      }
      return [];
    };

    const calculateRoleScore = (teamStats, enemyStats, category) => {
      if (!teamStats.length) return 50;
      const t = aggregateStats(teamStats);
      const e = aggregateStats(enemyStats);
      const metrics = getMetricsByCategory(t, e, category);

      let totalScoreChange = 0;
      let validMetricsCount = 0;

      metrics.forEach((m) => {
        if (m.enemy === 0 && m.team === 0) return;
        if (m.enemy === 0) {
          totalScoreChange += 10;
          return;
        }
        let diffPercent = ((m.team - m.enemy) / m.enemy) * 100;
        if (m.invert) diffPercent = -diffPercent;
        totalScoreChange += Math.max(Math.min(diffPercent, 100), -100);
        validMetricsCount++;
      });

      const avgChange = validMetricsCount > 0 ? totalScoreChange / validMetricsCount : 0;
      return Math.round(Math.max(0, Math.min(100, 50 + avgChange * 0.5)));
    };

    // Calculate score per role for each category (same logic as bubble_stats)
    const roles = ['top', 'jungle', 'mid', 'bottom', 'support'];

    const categoryScores = ['Combat', 'Vision', 'Income'].map((category) => {
      const roleScores = roles.map((role) => {
        const roleTeamStats = allTeamStats.filter((s) => s.role === role);
        const roleEnemyStats = allEnemyStats.filter((s) => s.role === role);
        return calculateRoleScore(roleTeamStats, roleEnemyStats, category);
      });
      const avgScore = roleScores.reduce((sum, s) => sum + s, 0) / roleScores.length;
      return { category, score: Math.round(avgScore * 10) / 10 };
    });

    // Calculate Objectives score from Game model
    const games = await Game.find({ team_id: req.user.team_id, ...gameQuery });
    let objectivesScore = 50;
    if (games.length) {
      const agg = games.reduce(
        (acc, game) => {
          const isBlue = game.team_side === 'blue';
          const teamStats = isBlue ? game.blue_team : game.red_team;
          const enemyStats = isBlue ? game.red_team : game.blue_team;
          acc.team.dragons += teamStats?.dragons || 0;
          acc.team.barons += teamStats?.barons || 0;
          acc.team.heralds += teamStats?.heralds || 0;
          acc.team.grubs += teamStats?.grubs || 0;
          acc.team.towers += teamStats?.towers || 0;
          acc.team.inhibitors += teamStats?.inhibitors || 0;
          acc.enemy.dragons += enemyStats?.dragons || 0;
          acc.enemy.barons += enemyStats?.barons || 0;
          acc.enemy.heralds += enemyStats?.heralds || 0;
          acc.enemy.grubs += enemyStats?.grubs || 0;
          acc.enemy.towers += enemyStats?.towers || 0;
          acc.enemy.inhibitors += enemyStats?.inhibitors || 0;
          acc.games += 1;
          return acc;
        },
        {
          team: { dragons: 0, barons: 0, heralds: 0, grubs: 0, towers: 0, inhibitors: 0 },
          enemy: { dragons: 0, barons: 0, heralds: 0, grubs: 0, towers: 0, inhibitors: 0 },
          games: 0,
        },
      );

      const totalGames = agg.games;
      const getAvg = (val) => (totalGames > 0 ? val / totalGames : 0);
      const objMetrics = [
        { team: getAvg(agg.team.dragons), enemy: getAvg(agg.enemy.dragons) },
        { team: getAvg(agg.team.barons), enemy: getAvg(agg.enemy.barons) },
        { team: getAvg(agg.team.heralds), enemy: getAvg(agg.enemy.heralds) },
        { team: getAvg(agg.team.grubs), enemy: getAvg(agg.enemy.grubs) },
        { team: getAvg(agg.team.towers), enemy: getAvg(agg.enemy.towers) },
        { team: getAvg(agg.team.inhibitors), enemy: getAvg(agg.enemy.inhibitors) },
      ];

      let totalScoreChange = 0;
      let validMetricsCount = 0;
      objMetrics.forEach((m) => {
        if (m.enemy === 0 && m.team === 0) return;
        if (m.enemy === 0) {
          totalScoreChange += 10;
          return;
        }
        const diffPercent = ((m.team - m.enemy) / m.enemy) * 100;
        totalScoreChange += Math.max(Math.min(diffPercent, 100), -100);
        validMetricsCount++;
      });
      const avgChange = validMetricsCount > 0 ? totalScoreChange / validMetricsCount : 0;
      objectivesScore = Math.round(Math.max(0, Math.min(100, 50 + avgChange * 0.5)));
    }
    categoryScores.push({ category: 'Objectives', score: objectivesScore });

    const globalScore = Math.round((categoryScores.reduce((sum, c) => sum + c.score, 0) / categoryScores.length) * 10) / 10;

    return res.status(200).send({ ok: true, data: { globalScore, categoryScores } });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

// Most played champions per role for my team (from scrims/ranked data)
const ROLE_DISPLAY = { top: 'TOP', jungle: 'JGL', mid: 'MID', bottom: 'ADC', support: 'SUP' };

router.post('/most-played', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const team_id = req.body.team_id || req.user.team_id;
    if (!team_id) return res.status(400).send({ ok: false, code: ERROR_CODES.INVALID_BODY });

    const filters = extractFilters(req.body);
    const { gameIdFilter } = await buildGameFilters({ team_id, ...filters });
    const query = { team_id, opponent: false, ...gameIdFilter };

    // Count total unique games for PR calculation
    const totalGamesAgg = await PlayerStats.aggregate([{ $match: query }, { $group: { _id: '$game_id' } }, { $count: 'total' }]);
    const totalGames = totalGamesAgg[0]?.total || 0;
    if (totalGames === 0) return res.status(200).send({ ok: true, data: {}, totalGames: 0 });

    // Aggregate champion stats per role
    const stats = await PlayerStats.aggregate([
      { $match: query },
      {
        $group: {
          _id: { role: '$role', champion: '$champion' },
          games: { $sum: 1 },
          wins: { $sum: { $cond: ['$game_win', 1, 0] } },
        },
      },
      { $sort: { games: -1 } },
    ]);

    const topN = req.body.limit || 3;
    const result = {};
    for (const [roleKey, displayName] of Object.entries(ROLE_DISPLAY)) {
      result[displayName] = stats
        .filter((s) => s._id.role === roleKey)
        .slice(0, topN)
        .map((s) => ({
          name: s._id.champion,
          games: s.games,
          pr: Math.round((s.games / totalGames) * 100),
          wr: s.games > 0 ? Math.round((s.wins / s.games) * 100) : 0,
        }));
    }

    return res.status(200).send({ ok: true, data: result, totalGames });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

// Most flexed champions (played on most different roles) for my team
const ROLE_DISPLAY_FLEX = { top: 'TOP', jungle: 'JGL', mid: 'MID', bottom: 'ADC', support: 'SUP' };

router.post('/most-flexed', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const team_id = req.body.team_id || req.user.team_id;
    if (!team_id) return res.status(400).send({ ok: false, code: ERROR_CODES.INVALID_BODY });

    const filters = extractFilters(req.body);
    const { gameIdFilter } = await buildGameFilters({ team_id, ...filters });
    const query = { team_id, opponent: false, ...gameIdFilter };

    // Count total unique games for PR calculation
    const totalGamesAgg = await PlayerStats.aggregate([{ $match: query }, { $group: { _id: '$game_id' } }, { $count: 'total' }]);
    const totalGames = totalGamesAgg[0]?.total || 0;
    if (totalGames === 0) return res.status(200).send({ ok: true, data: [], totalGames: 0 });

    // Get all stats
    const stats = await PlayerStats.find(query, { champion: 1, role: 1, game_win: 1 }).lean();

    // Aggregate: for each champion, count per role stats
    const champStats = {};
    for (const s of stats) {
      if (!s.champion || !s.role) continue;
      const normalizedRole = ROLE_DISPLAY_FLEX[s.role] || s.role.toUpperCase();

      if (!champStats[s.champion]) champStats[s.champion] = { roleStats: {}, totalGames: 0, totalWins: 0 };
      if (!champStats[s.champion].roleStats[normalizedRole]) champStats[s.champion].roleStats[normalizedRole] = { games: 0, wins: 0 };
      champStats[s.champion].roleStats[normalizedRole].games++;
      champStats[s.champion].totalGames++;
      if (s.game_win) {
        champStats[s.champion].roleStats[normalizedRole].wins++;
        champStats[s.champion].totalWins++;
      }
    }

    // Filter champions with 2+ roles, sort by number of roles (desc), then by games (desc)
    const topN = req.body.limit || 6;
    const flexed = Object.entries(champStats)
      .filter(([, s]) => Object.keys(s.roleStats).length >= 2)
      .map(([name, s]) => {
        const roles = Object.entries(s.roleStats).map(([role, stats]) => ({ role, games: stats.games, pr: Math.round((stats.games / totalGames) * 100), wr: stats.games > 0 ? Math.round((stats.wins / stats.games) * 100) : 0 }));
        return { name, roles, rolesCount: roles.length, games: s.totalGames };
      })
      .sort((a, b) => b.rolesCount - a.rolesCount || b.games - a.games)
      .slice(0, topN);

    return res.status(200).send({ ok: true, data: flexed, totalGames });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

// Best champion combos for my team (pairs that win together in scrims)
router.post('/best-combos', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const team_id = req.body.team_id || req.user.team_id;
    if (!team_id) return res.status(400).send({ ok: false, code: ERROR_CODES.INVALID_BODY });

    const filters = extractFilters(req.body);
    const { gameIdFilter } = await buildGameFilters({ team_id, ...filters });
    // Get all ally player stats grouped by game
    const stats = await PlayerStats.find({ team_id, opponent: false, ...gameIdFilter }, { game_id: 1, champion: 1, game_win: 1 }).lean();

    // Group by game_id
    const gameMap = {};
    for (const s of stats) {
      if (!s.game_id || !s.champion) continue;
      if (!gameMap[s.game_id]) gameMap[s.game_id] = { champions: [], win: s.game_win };
      gameMap[s.game_id].champions.push(s.champion);
    }

    // Count all champion pairs
    const pairStats = {};
    for (const game of Object.values(gameMap)) {
      const champs = game.champions;
      for (let i = 0; i < champs.length; i++) {
        for (let j = i + 1; j < champs.length; j++) {
          const key = [champs[i], champs[j]].sort().join('+');
          if (!pairStats[key]) pairStats[key] = { champ1: champs[i] < champs[j] ? champs[i] : champs[j], champ2: champs[i] < champs[j] ? champs[j] : champs[i], games: 0, wins: 0 };
          pairStats[key].games++;
          if (game.win) pairStats[key].wins++;
        }
      }
    }

    const minGames = req.body.minGames || 2;
    const limit = req.body.limit || 3;
    const combos = Object.values(pairStats)
      .filter((p) => p.games >= minGames)
      .map((p) => ({ champ1: p.champ1, champ2: p.champ2, games: p.games, wr: Math.round((p.wins / p.games) * 100) }))
      .sort((a, b) => b.games - a.games || b.wr - a.wr)
      .slice(0, limit);

    return res.status(200).send({ ok: true, data: combos });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

// Most played with / most played against for a specific champion (from scrims)
router.post('/synergies', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const { champion } = req.body;
    if (!champion) return res.status(400).send({ ok: false, code: ERROR_CODES.INVALID_BODY });

    const team_id = req.body.team_id || req.user.team_id;
    if (!team_id) return res.status(400).send({ ok: false, code: ERROR_CODES.INVALID_BODY });

    const filters = extractFilters(req.body);
    const { gameIdFilter } = await buildGameFilters({ team_id, ...filters });

    // Get all stats for games where this champion was played by my team
    const champStats = await PlayerStats.find({ team_id, opponent: false, champion, ...gameIdFilter }, { game_id: 1, game_win: 1 }).lean();
    if (champStats.length === 0) return res.status(200).send({ ok: true, data: { mostPlayedWith: [], mostPlayedAgainst: [] } });

    const gameIds = [...new Set(champStats.map((s) => s.game_id))];
    const winByGame = {};
    for (const s of champStats) {
      winByGame[s.game_id] = s.game_win;
    }

    // Get all player stats in those games
    const allStatsInGames = await PlayerStats.find({ team_id, game_id: { $in: gameIds } }, { game_id: 1, champion: 1, opponent: 1, game_win: 1 }).lean();

    const withStats = {};
    const againstStats = {};

    for (const s of allStatsInGames) {
      if (!s.champion || s.champion === champion) continue;

      if (!s.opponent) {
        // Teammate
        if (!withStats[s.champion]) withStats[s.champion] = { games: 0, wins: 0 };
        withStats[s.champion].games++;
        if (winByGame[s.game_id]) withStats[s.champion].wins++;
      } else {
        // Enemy
        if (!againstStats[s.champion]) againstStats[s.champion] = { games: 0, wins: 0 };
        againstStats[s.champion].games++;
        if (winByGame[s.game_id]) againstStats[s.champion].wins++;
      }
    }

    const mostPlayedWith = Object.entries(withStats)
      .map(([name, s]) => ({ name, games: s.games, wr: s.games > 0 ? Math.round((s.wins / s.games) * 100) : 0 }))
      .sort((a, b) => b.games - a.games)
      .slice(0, 3);

    const mostPlayedAgainst = Object.entries(againstStats)
      .map(([name, s]) => ({ name, games: s.games, wr: s.games > 0 ? Math.round((s.wins / s.games) * 100) : 0 }))
      .sort((a, b) => b.games - a.games)
      .slice(0, 3);

    return res.status(200).send({ ok: true, data: { mostPlayedWith, mostPlayedAgainst } });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.post('/official_split', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const filters = extractFilters(req.body);
    const { gameIdFilter } = await buildGameFilters({ team_id: req.user.team_id, ...filters });

    let teamStats = await PlayerStats.find({ team_id: req.user.team_id, opponent: false, puuid: { $exists: true, $ne: null }, ...gameIdFilter });
    let enemyStats = await PlayerStats.find({ team_id: req.user.team_id, opponent: true, ...gameIdFilter });

    const position = req.body.position;
    const puuid = req.body.puuid;
    if (puuid) {
      teamStats = teamStats.filter((s) => s.puuid === puuid);
    }
    if (position) {
      teamStats = teamStats.filter((s) => s.role === position);
      enemyStats = enemyStats.filter((s) => s.role === position);
    }
    if (req.body.champion) {
      teamStats = teamStats.filter((s) => s.champion === req.body.champion);
      const champGameIds = new Set(teamStats.map((s) => s.game_id));
      enemyStats = enemyStats.filter((s) => champGameIds.has(s.game_id));
    }

    const buildCategoryValues = (tStats, eStats) => {
      if (!tStats.length) return null;
      const t = aggregateStats(tStats);
      const e = aggregateStats(eStats);
      const result = {};
      ['Combat', 'Objectives', 'Vision', 'Income'].forEach((cat) => {
        result[cat] = {};
        getMetrics(t, e, cat).forEach((m) => {
          result[cat][m.name] = m.team;
        });
      });
      return result;
    };

    const officialTeam = teamStats.filter((s) => s.game_official === true);
    const officialEnemy = enemyStats.filter((s) => s.game_official === true);
    const nonOfficialTeam = teamStats.filter((s) => !s.game_official);
    const nonOfficialEnemy = enemyStats.filter((s) => !s.game_official);

    return res.status(200).send({
      ok: true,
      data: {
        official: buildCategoryValues(officialTeam, officialEnemy),
        nonOfficial: buildCategoryValues(nonOfficialTeam, nonOfficialEnemy),
        officialGames: [...new Set(officialTeam.map((s) => s.game_id))].length,
        nonOfficialGames: [...new Set(nonOfficialTeam.map((s) => s.game_id))].length,
      },
    });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

module.exports = router;
