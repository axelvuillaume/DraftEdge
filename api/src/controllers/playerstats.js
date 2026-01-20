const express = require('express');
const router = express.Router();
const passport = require('passport');
const ERROR_CODES = require('../utils/errorCodes');
const { capture } = require('../services/sentry');
const PlayerStats = require('../models/playerstats');
const Game = require('../models/game');

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
          win_rate: Math.round((champ.games > 0 ? champ.wins / champ.games : 0) * 1000) / 1000,
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
        win_rate: Math.round((player.games > 0 ? player.wins / player.games : 0) * 1000) / 1000,
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
    const { role, category } = req.body;
    if (category === 'Objectives') {
      const games = await Game.find({ team_id: req.user.team_id });
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
          }
        );
      };

      const agg = aggregateObjectives(games);
      const totalGames = agg.games;

      const getAvg = (val) => (totalGames > 0 ? parseFloat((val / totalGames).toFixed(1)) : 0);

      const calcDiff = (teamVal, enemyVal) => {
        if (enemyVal === 0 && teamVal === 0) return '0%';
        if (enemyVal === 0) return '+100%';
        const diff = ((teamVal - enemyVal) / enemyVal) * 100;
        const sign = diff > 0 ? '+' : '';
        return `${sign}${Math.round(diff)}%`;
      };

      const getTrend = (teamVal, enemyVal) => {
        if (teamVal > enemyVal) return 'up';
        if (teamVal < enemyVal) return 'down';
        return 'neutral';
      };

      const metrics = [
        { label: 'Dragons / game', team: getAvg(agg.team.dragons), enemy: getAvg(agg.enemy.dragons) },
        { label: 'Barons / game', team: getAvg(agg.team.barons), enemy: getAvg(agg.enemy.barons) },
        { label: 'Heralds / game', team: getAvg(agg.team.heralds), enemy: getAvg(agg.enemy.heralds) },
        { label: 'Grubs / game', team: getAvg(agg.team.grubs), enemy: getAvg(agg.enemy.grubs) },
        { label: 'Turrets / game', team: getAvg(agg.team.towers), enemy: getAvg(agg.enemy.towers) },
        { label: 'Inhibs / game', team: getAvg(agg.team.inhibitors), enemy: getAvg(agg.enemy.inhibitors) },
      ];

      // Calculate score for objectives
      let totalScoreChange = 0;
      let validMetricsCount = 0;
      metrics.forEach((m) => {
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
      const score = Math.round(Math.max(0, Math.min(100, 50 + avgChange * 0.5)));

      // Add diff and trend to metrics
      const dataMetrics = metrics.map((m) => ({
        ...m,
        diff: calcDiff(m.team, m.enemy),
        trend: getTrend(m.team, m.enemy),
      }));

      return res.status(200).send({ ok: true, data: dataMetrics, scores: [], score });
    }

    const allTeamStats = await PlayerStats.find({ team_id: req.user.team_id, opponent: false });
    const playerStats = role ? allTeamStats.filter((s) => s.role === role) : allTeamStats;

    const allEnemyStats = await PlayerStats.find({ team_id: req.user.team_id, opponent: true });
    const enemyStats = role ? allEnemyStats.filter((s) => s.role === role) : allEnemyStats;

    const aggregateStats = (stats) => {
      return stats.reduce(
        (acc, curr) => {
          acc.kills += curr.kills || 0;
          acc.deaths += curr.deaths || 0;
          acc.assists += curr.assists || 0;
          acc.gold += curr.gold || 0;
          acc.damage += curr.damage?.total_to_champions || 0;
          acc.duration += curr.game_duration || 0;

          // New aggregation fields
          acc.cs += curr.cs || 0;
          acc.wins += curr.game_win ? 1 : 0;
          acc.solo_kills += curr.combat?.solo_kills || 0;
          acc.damage_objectives += curr.damage?.to_objectives || 0;
          acc.tank_taken += curr.tank?.total_taken || 0;
          acc.tank_mitigated += curr.tank?.self_mitigated || 0;
          acc.vision_score += curr.vision?.score || 0;
          acc.wards_placed += curr.vision?.wards_placed || 0;
          acc.wards_killed += curr.vision?.wards_killed || 0;
          acc.control_wards_bought += curr.vision?.control_wards_bought || 0;
          acc.level += curr.level || 0;
          acc.turrets += curr.objectives?.turrets || 0;
          acc.dragons += curr.objectives?.dragons || 0;
          acc.barons += curr.objectives?.barons || 0;
          acc.enemy_jungle += curr.farm?.enemy_jungle || 0;
          acc.games += 1;
          return acc;
        },
        {
          level: 0,
          kills: 0,
          deaths: 0,
          assists: 0,
          gold: 0,
          damage: 0,
          duration: 0,
          games: 0,
          cs: 0,
          wins: 0,
          solo_kills: 0,
          damage_objectives: 0,
          tank_taken: 0,
          tank_mitigated: 0,
          vision_score: 0,
          wards_placed: 0,
          wards_killed: 0,
          control_wards_bought: 0,
          enemy_jungle: 0,
          turrets: 0,
          dragons: 0,
          barons: 0,
        }
      );
    };

    const getMetrics = (t, e) => {
      const getAvg = (total, games) => (games > 0 ? total / games : 0);
      const getPerMin = (total, duration) => (duration > 0 ? total / (duration / 60) : 0);

      if (category === 'Combat') {
        return [
          {
            label: 'DMG / min',
            team: parseFloat(getPerMin(t.damage, t.duration).toFixed(1)),
            enemy: parseFloat(getPerMin(e.damage, e.duration).toFixed(1)),
          },
          {
            label: 'Kills / game',
            team: parseFloat(getAvg(t.kills, t.games).toFixed(1)),
            enemy: parseFloat(getAvg(e.kills, e.games).toFixed(1)),
          },
          {
            label: 'Deaths / game',
            team: parseFloat(getAvg(t.deaths, t.games).toFixed(1)),
            enemy: parseFloat(getAvg(e.deaths, e.games).toFixed(1)),
            invert: true,
          },
          {
            label: 'KDA',
            team: parseFloat((t.deaths > 0 ? (t.kills + t.assists) / t.deaths : t.kills + t.assists).toFixed(2)),
            enemy: parseFloat((e.deaths > 0 ? (e.kills + e.assists) / e.deaths : e.kills + e.assists).toFixed(2)),
          },
          {
            label: 'DMG / Gold',
            team: parseFloat((t.gold > 0 ? t.damage / t.gold : 0).toFixed(2)),
            enemy: parseFloat((e.gold > 0 ? e.damage / e.gold : 0).toFixed(2)),
          },
        ];
      }
      if (category === 'Vision') {
        return [
          {
            label: 'Vision Score / min',
            team: parseFloat(getPerMin(t.vision_score, t.duration).toFixed(1)),
            enemy: parseFloat(getPerMin(e.vision_score, e.duration).toFixed(1)),
          },
          {
            label: 'Wards Placed / game',
            team: (t.wards_placed / t.games).toFixed(1),
            enemy: (e.wards_placed / e.games).toFixed(1),
          },
          {
            label: 'Wards / min',
            team: parseFloat(getPerMin(t.wards_placed, t.duration).toFixed(1)),
            enemy: parseFloat(getPerMin(e.wards_placed, e.duration).toFixed(1)),
          },
          {
            label: 'Control Wards Placed / game',
            team: (t.control_wards_bought / t.games).toFixed(1),
            enemy: (e.control_wards_bought / e.games).toFixed(1),
          },
          {
            label: 'Wards Killed / game',
            team: (t.wards_killed / t.games).toFixed(1),
            enemy: (e.wards_killed / e.games).toFixed(1),
          },
          {
            label: 'Ward Denial %',
            team: parseFloat((t.wards_killed / e.wards_placed) * 100).toFixed(1),
            enemy: parseFloat((e.wards_killed / t.wards_placed) * 100).toFixed(1),
          },
          {
            label: 'Control Wards Bought / game',
            team: (t.control_wards_bought / t.games).toFixed(1),
            enemy: (e.control_wards_bought / e.games).toFixed(1),
          },
        ];
      }

      if (category === 'Income') {
        return [
          {
            label: 'Gold / min',
            team: parseFloat(getPerMin(t.gold, t.duration).toFixed(1)),
            enemy: parseFloat(getPerMin(e.gold, e.duration).toFixed(1)),
          },
          {
            label: 'CS / game',
            team: (t.cs / t.games).toFixed(1),
            enemy: (e.cs / e.games).toFixed(1),
          },
          {
            label: 'Gold Efficiency',
            team: parseFloat((t.damage / t.gold).toFixed(1)),
            enemy: parseFloat((e.damage / e.gold).toFixed(1)),
          },
          {
            label: 'Level',
            team: parseFloat((t.level / t.games).toFixed(1)),
            enemy: parseFloat((e.level / e.games).toFixed(1)),
          },
          {
            label: 'Enemy jungle monsters / game',
            team: (t.enemy_jungle / t.games).toFixed(1),
            enemy: (e.enemy_jungle / e.games).toFixed(1),
          },
          {
            label: 'Gold Plates / game',
            team: 0,
            enemy: 0,
          },
          {
            label: 'Shutdown / game',
            team: 0,
            enemy: 0,
          },
        ];
      }
    };

    const calculateScore = (teamStats, enemyStats) => {
      if (!teamStats.length) return 50;
      const t = aggregateStats(teamStats);
      const e = aggregateStats(enemyStats);

      // Use the metrics relevant to the category for scoring too
      const metrics = getMetrics(t, e);

      let totalScoreChange = 0;
      let validMetricsCount = 0;

      metrics.forEach((m) => {
        if (m.enemy === 0 && m.team === 0) return;
        if (m.enemy === 0) {
          totalScoreChange += 10; // Bonus if enemy has 0 and we have something
          return;
        }
        let diffPercent = ((m.team - m.enemy) / m.enemy) * 100;
        if (m.invert) diffPercent = -diffPercent;

        // Cap impact of single metric
        totalScoreChange += Math.max(Math.min(diffPercent, 100), -100);
        validMetricsCount++;
      });

      const avgChange = validMetricsCount > 0 ? totalScoreChange / validMetricsCount : 0;
      // Scale result to be around 50 (0 change = 50, +20% change = 60, etc.)
      let score = 50 + avgChange * 0.5;
      return Math.round(Math.max(0, Math.min(100, score)));
    };

    const roles = ['top', 'jungle', 'mid', 'bottom', 'support'];
    const scores = roles.map((role) => {
      const roleTeamStats = allTeamStats.filter((s) => s.role === role);
      const roleEnemyStats = allEnemyStats.filter((s) => s.role === role);
      return { role, score: calculateScore(roleTeamStats, roleEnemyStats) };
    });

    const teamAgg = aggregateStats(playerStats);
    const enemyAgg = aggregateStats(enemyStats);

    // Get formatted metrics for response
    const dataMetrics = getMetrics(teamAgg, enemyAgg).map((m) => {
      const diff = m.enemy > 0 ? ((m.team - m.enemy) / m.enemy) * 100 : m.team > 0 ? 100 : 0;
      const sign = diff > 0 ? '+' : '';
      // Fix for infinite/NaN
      const safeDiff = isFinite(diff) ? diff : 0;
      return { ...m, diff: `${sign}${safeDiff.toFixed(1)}%` };
    });

    return res.status(200).send({ ok: true, data: dataMetrics, scores });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.post('/team_performance', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const allTeamStats = await PlayerStats.find({ team_id: req.user.team_id, opponent: false });
    const allEnemyStats = await PlayerStats.find({ team_id: req.user.team_id, opponent: true });

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
          acc.vision_score += curr.vision?.score || 0;
          acc.wards_placed += curr.vision?.wards_placed || 0;
          acc.wards_killed += curr.vision?.wards_killed || 0;
          acc.control_wards_bought += curr.vision?.control_wards_bought || 0;
          acc.level += curr.level || 0;
          acc.enemy_jungle += curr.farm?.enemy_jungle || 0;
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
          games: 0,
          cs: 0,
          wins: 0,
          vision_score: 0,
          wards_placed: 0,
          wards_killed: 0,
          control_wards_bought: 0,
          level: 0,
          enemy_jungle: 0,
        }
      );
    };

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
          { label: 'Wards Placed / game', team: t.games > 0 ? (t.wards_placed / t.games).toFixed(1) : 0, enemy: e.games > 0 ? (e.wards_placed / e.games).toFixed(1) : 0 },
          { label: 'Wards / min', team: parseFloat(getPerMin(t.wards_placed, t.duration).toFixed(1)), enemy: parseFloat(getPerMin(e.wards_placed, e.duration).toFixed(1)) },
          { label: 'Control Wards Placed / game', team: t.games > 0 ? t.control_wards_bought / t.games : 0, enemy: e.games > 0 ? e.control_wards_bought / e.games : 0 },
          { label: 'Wards Killed / game', team: t.games > 0 ? t.wards_killed / t.games : 0, enemy: e.games > 0 ? e.wards_killed / e.games : 0 },
          {
            label: 'Ward Denial %',
            team: e.wards_placed > 0 ? parseFloat((t.wards_killed / e.wards_placed) * 100).toFixed(1) : 0,
            enemy: t.wards_placed > 0 ? parseFloat((e.wards_killed / t.wards_placed) * 100).toFixed(1) : 0,
          },
          { label: 'Control Wards Bought / game', team: t.games > 0 ? t.control_wards_bought / t.games : 0, enemy: e.games > 0 ? e.control_wards_bought / e.games : 0 },
        ];
      }
      if (category === 'Income') {
        return [
          { label: 'Gold / min', team: parseFloat(getPerMin(t.gold, t.duration).toFixed(1)), enemy: parseFloat(getPerMin(e.gold, e.duration).toFixed(1)) },
          { label: 'CS / game', team: t.games > 0 ? (t.cs / t.games).toFixed(1) : 0, enemy: e.games > 0 ? (e.cs / e.games).toFixed(1) : 0 },
          { label: 'Gold Efficiency', team: parseFloat((t.gold > 0 ? t.damage / t.gold : 0).toFixed(1)), enemy: parseFloat((e.gold > 0 ? e.damage / e.gold : 0).toFixed(1)) },
          { label: 'Level', team: parseFloat((t.level / t.games).toFixed(1)), enemy: parseFloat((e.level / e.games).toFixed(1)) },
          { label: 'Enemy jungle monsters / game', team: t.games > 0 ? (t.enemy_jungle / t.games).toFixed(1) : 0, enemy: e.games > 0 ? (e.enemy_jungle / e.games).toFixed(1) : 0 },
          { label: 'Gold Plates / game', team: 0, enemy: 0 },
          { label: 'Shutdown / game', team: 0, enemy: 0 },
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
    const games = await Game.find({ team_id: req.user.team_id });
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
        }
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

module.exports = router;
