const express = require('express');
const router = express.Router();
const passport = require('passport');
const ERROR_CODES = require('../utils/errorCodes');
const { capture } = require('../services/sentry');
const PlayerStats = require('../models/playerstats');

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

router.post('/best_wr', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const playerStats = await PlayerStats.find({ team_id: req.user.team_id });

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
    const thisWeekStart = new Date();
    thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
    thisWeekStart.setHours(0, 0, 0, 0);

    // const playerStats = await PlayerStats.find({ team_id: req.user.team_id, createdAt: { $gte: thisWeekStart }, opponent: false });

    const playerStats = await PlayerStats.find({ team_id: req.user.team_id, opponent: false });
    const enemyStats = await PlayerStats.find({ team_id: req.user.team_id, opponent: true });

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
      { kills: 0, deaths: 0, assists: 0, gold: 0, level: 0, nb_games: 0 }
    );

    const alliesKda = alliesTotals.deaths > 0 ? (alliesTotals.kills + alliesTotals.assists) / alliesTotals.deaths : alliesTotals.kills + alliesTotals.assists;

    // Format allies roles
    const alliesRoles = Object.keys(alliesStatsByRole).reduce((acc, role) => {
      const roleStats = alliesStatsByRole[role];
      const nb_games = playerStats.filter((p) => p.role === role).length;
      const kda = roleStats.deaths > 0 ? (roleStats.kills + roleStats.assists) / roleStats.deaths : roleStats.kills + roleStats.assists;

      acc[role] = {
        kills: roleStats.kills,
        deaths: roleStats.deaths,
        assists: roleStats.assists,
        kda: Math.round(kda * 100) / 100,
        gold: roleStats.gold,
        level: roleStats.level,
        nb_games: nb_games,
      };
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
      { kills: 0, deaths: 0, assists: 0, gold: 0, nb_games: 0 }
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
          total: {
            kills: alliesTotals.kills,
            deaths: alliesTotals.deaths,
            assists: alliesTotals.assists,
            kda: Math.round(alliesKda * 100) / 100,
            gold: alliesTotals.gold,
            level: alliesTotals.level,
            nb_games: alliesTotals.nb_games,
          },
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

router.post('/player_stats', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const playerStats = await PlayerStats.find({ team_id: req.user.team_id, opponent: false });

    const statsByPlayer = playerStats.reduce((acc, curr) => {
      const playerName = curr.summoner_name;
      if (!acc[playerName]) {
        acc[playerName] = {
          summoner_name: playerName,
          champions: {},
          total_kills: 0,
          total_deaths: 0,
          total_assists: 0,
          total_creep: 0,
          total_gold: 0,
          total_duration: 0,
          wins: 0,
          games: 0,
        };
      }

      const player = acc[playerName];
      player.total_kills += curr.kills || 0;
      player.total_deaths += curr.deaths || 0;
      player.total_assists += curr.assists || 0;
      player.total_creep += curr.cs || 0;
      player.total_gold += curr.gold || 0;
      player.total_duration += curr.game_duration || 0;
      if (curr.game_win) player.wins += 1;
      player.games += 1;

      if (!player.champions[curr.champion]) {
        player.champions[curr.champion] = {
          champion: curr.champion,
          total_kills: 0,
          total_deaths: 0,
          total_assists: 0,
          total_creep: 0,
          total_gold: 0,
          total_duration: 0,
          wins: 0,
          games: 0,
        };
      }

      const champStats = player.champions[curr.champion];
      champStats.total_kills += curr.kills || 0;
      champStats.total_deaths += curr.deaths || 0;
      champStats.total_assists += curr.assists || 0;
      champStats.total_creep += curr.cs || 0;
      champStats.total_gold += curr.gold || 0;
      champStats.total_duration += curr.game_duration || 0;
      if (curr.game_win) champStats.wins += 1;
      champStats.games += 1;

      return acc;
    }, {});

    const result = Object.values(statsByPlayer).map((player) => {
      const avgKda = player.total_deaths > 0 ? (player.total_kills + player.total_assists) / player.total_deaths : player.total_kills + player.total_assists;
      const csPerMin = player.total_duration / 60 > 0 ? player.total_creep / player.total_duration / 60 : 0;
      const champions = Object.values(player.champions).map((champ) => {
        const champKda = champ.total_deaths > 0 ? (champ.total_kills + champ.total_assists) / champ.total_deaths : champ.total_kills + champ.total_assists;
        const champCsPerMin = champ.total_duration / 60 > 0 ? champ.total_creep / champ.total_duration / 60 : 0;

        return {
          champion: champ.champion,
          kda: Math.round(champKda * 100) / 100,
          win_rate: Math.round(champ.games > 0 ? champ.wins / champ.games : 0 * 1000) / 1000,
          cs_per_min: Math.round(champCsPerMin * 10) / 10,
          games: champ.games,
          wins: champ.wins,
          kills: champ.total_kills,
          deaths: champ.total_deaths,
          assists: champ.total_assists,
          creep: champ.total_creep,
          gold: champ.total_gold,
        };
      });

      return {
        summoner_name: player.summoner_name,
        kda: Math.round(avgKda * 100) / 100,
        win_rate: Math.round(player.games > 0 ? player.wins / player.games : 0 * 1000) / 1000,
        cs_per_min: Math.round(csPerMin * 10) / 10,
        games: player.games,
        wins: player.wins,
        total_kills: player.total_kills,
        total_deaths: player.total_deaths,
        total_assists: player.total_assists,
        total_creep: player.total_creep,
        total_gold: player.total_gold,
        champions: champions.sort((a, b) => b.games - a.games),
      };
    });

    return res.status(200).send({ ok: true, data: result });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.post('/bubble_stats', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const query = { team_id: req.user.team_id };
    const allTeamStats = await PlayerStats.find({ team_id: req.user.team_id, opponent: false });
    const playerStats = req.body.role ? allTeamStats.filter((s) => s.role === req.body.role) : allTeamStats;

    const allEnemyStats = await PlayerStats.find({ team_id: req.user.team_id, opponent: true });
    const enemyStats = req.body.role ? allEnemyStats.filter((s) => s.role === req.body.role) : allEnemyStats;

    const calculateScore = (teamStats, enemyStats) => {
      if (!teamStats.length) return 50;
      const aggregate = (stats) =>
        stats.reduce(
          (acc, curr) => ({
            kills: acc.kills + (curr.kills || 0),
            deaths: acc.deaths + (curr.deaths || 0),
            assists: acc.assists + (curr.assists || 0),
            damage: acc.damage + (curr.damage?.total_to_champions || 0),
            duration: acc.duration + (curr.game_duration || 0),
            games: acc.games + 1,
          }),
          { kills: 0, deaths: 0, assists: 0, damage: 0, duration: 0, games: 0 }
        );

      const t = aggregate(teamStats);
      const e = aggregate(enemyStats);
      if (t.games === 0) return 50;
      const eGames = e.games || 1;

      const getPerGame = (total, games) => total / games;
      const getPerMin = (total, duration) => (duration > 0 ? total / (duration / 60) : 0);

      const metrics = [
        {
          // DMG / min
          team: getPerMin(t.damage, t.duration),
          enemy: getPerMin(e.damage, e.duration),
          weight: 1,
        },
        {
          // Kills / game
          team: getPerGame(t.kills, t.games),
          enemy: getPerGame(e.kills, eGames),
          weight: 1,
        },
        {
          // Deaths / game (Lower is better, so invert comparison)
          team: getPerGame(t.deaths, t.games),
          enemy: getPerGame(e.deaths, eGames),
          weight: 1,
          invert: true,
        },
        {
          // KDA
          team: t.deaths > 0 ? (t.kills + t.assists) / t.deaths : t.kills + t.assists,
          enemy: e.deaths > 0 ? (e.kills + e.assists) / e.deaths : e.kills + e.assists,
          weight: 1,
        },
      ];

      let totalScoreChange = 0;

      metrics.forEach((m) => {
        if (m.enemy === 0) return;
        let diffPercent = ((m.team - m.enemy) / m.enemy) * 100;
        if (m.invert) diffPercent = -diffPercent;
        totalScoreChange += Math.max(Math.min(diffPercent, 100), -100) * 0.25;
      });

      let score = 50 + totalScoreChange;
      return Math.round(Math.max(0, Math.min(100, score)));
    };

    const roles = ['top', 'jungle', 'mid', 'bottom', 'support'];
    const scores = roles.map((role) => {
      const roleTeamStats = allTeamStats.filter((s) => s.role === role);
      const roleEnemyStats = allEnemyStats.filter((s) => s.role === role);
      return { role, score: calculateScore(roleTeamStats, roleEnemyStats) };
    });

    const aggregateStats = (stats) => {
      return stats.reduce(
        (acc, curr) => {
          acc.kills += curr.kills || 0;
          acc.deaths += curr.deaths || 0;
          acc.assists += curr.assists || 0;
          acc.gold += curr.gold || 0;
          acc.damage += curr.damage?.total_to_champions || 0;
          acc.duration += curr.game_duration || 0;
          acc.first_blood += curr.combat?.first_blood ? 1 : 0;
          acc.games += 1;
          return acc;
        },
        { kills: 0, deaths: 0, assists: 0, gold: 0, damage: 0, duration: 0, first_blood: 0, games: 0 }
      );
    };

    const team = aggregateStats(playerStats);
    const enemy = aggregateStats(enemyStats);

    const formatMetrics = (teamStats, enemyStats) => {
      const getAvg = (total, games) => (games > 0 ? total / games : 0);
      const getPerMin = (total, duration) => (duration > 0 ? total / (duration / 60) : 0);

      const metrics = [
        {
          label: 'DMG / min',
          team: Math.round(getPerMin(teamStats.damage, teamStats.duration)),
          enemy: Math.round(getPerMin(enemyStats.damage, enemyStats.duration)),
        },
        {
          label: 'Kills / game',
          team: parseFloat(getAvg(teamStats.kills, teamStats.games).toFixed(1)),
          enemy: parseFloat(getAvg(enemyStats.kills, enemyStats.games).toFixed(1)),
        },
        {
          label: 'Deaths / game',
          team: parseFloat(getAvg(teamStats.deaths, teamStats.games).toFixed(1)),
          enemy: parseFloat(getAvg(enemyStats.deaths, enemyStats.games).toFixed(1)),
          invert: true,
        },
        {
          label: 'Team KDA',
          team: parseFloat((teamStats.deaths > 0 ? (teamStats.kills + teamStats.assists) / teamStats.deaths : teamStats.kills + teamStats.assists).toFixed(1)),
          enemy: parseFloat((enemyStats.deaths > 0 ? (enemyStats.kills + enemyStats.assists) / enemyStats.deaths : enemyStats.kills + enemyStats.assists).toFixed(1)),
        },
        {
          label: 'First Blood %',
          team: Math.round(getAvg(teamStats.first_blood, teamStats.games) * 100),
          enemy: Math.round(getAvg(enemyStats.first_blood, enemyStats.games) * 100),
        },
        {
          label: 'DMG / Gold',
          team: parseFloat((teamStats.gold > 0 ? teamStats.damage / teamStats.gold : 0).toFixed(2)),
          enemy: parseFloat((enemyStats.gold > 0 ? enemyStats.damage / enemyStats.gold : 0).toFixed(2)),
        },
      ];

      return metrics.map((m) => {
        const diff = m.enemy > 0 ? ((m.team - m.enemy) / m.enemy) * 100 : 0;
        const sign = diff > 0 ? '+' : '';
        return { ...m, diff: `${sign}${diff.toFixed(1)}%` };
      });
    };

    return res.status(200).send({ ok: true, data: formatMetrics(team, enemy), scores });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});
module.exports = router;
