const express = require('express');
const router = express.Router();
const passport = require('passport');
const ERROR_CODES = require('../utils/errorCodes');
const { capture } = require('../services/sentry');
const PlayerStats = require('../models/playerstats');
const Game = require('../models/game');
const { client: geminiClient } = require('../services/gemini');

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

    // Get all player stats for this team (both allies and opponents)
    const allStats = await PlayerStats.find({ team_id: teamId });

    // Build players list and champions data
    const playersMap = {};
    const allyChampionsMap = {};
    const enemyChampionsMap = {};

    allStats.forEach(stat => {
      const playerName = stat.summoner_name;
      const champion = stat.champion;
      const isOpponent = stat.opponent;

      if (!isOpponent) {
        // Aggregate player data (only allies)
        if (!playersMap[playerName]) {
          playersMap[playerName] = {
            name: playerName,
            role: stat.role,
            games: 0,
            wins: 0
          };
        }
        playersMap[playerName].games++;
        if (stat.game_win) playersMap[playerName].wins++;

        // Aggregate ally champion data (per player)
        const champKey = `${playerName}-${champion}`;
        if (!allyChampionsMap[champKey]) {
          allyChampionsMap[champKey] = {
            name: champion,
            playerName: playerName,
            role: stat.role,
            games: 0,
            wins: 0,
            isAlly: true
          };
        }
        allyChampionsMap[champKey].games++;
        if (stat.game_win) allyChampionsMap[champKey].wins++;
      } else {
        // Aggregate enemy champion data
        if (!enemyChampionsMap[champion]) {
          enemyChampionsMap[champion] = {
            name: champion,
            role: stat.role,
            games: 0,
            wins: 0,
            isAlly: false
          };
        }
        enemyChampionsMap[champion].games++;
        // For enemies, a win for them is a loss for us (game_win is from our perspective)
        if (!stat.game_win) enemyChampionsMap[champion].wins++;
      }
    });

    // Filter and format players
    const players = Object.values(playersMap)
      .filter(p => p.name.toLowerCase().includes(searchQuery))
      .sort((a, b) => b.games - a.games)
      .slice(0, 5);

    // Filter and format ally champions
    const allyChampions = Object.values(allyChampionsMap)
      .filter(c => c.name.toLowerCase().includes(searchQuery))
      .sort((a, b) => b.games - a.games)
      .slice(0, 5);

    // Filter and format enemy champions
    const enemyChampions = Object.values(enemyChampionsMap)
      .filter(c => c.name.toLowerCase().includes(searchQuery))
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
      { kills: 0, deaths: 0, assists: 0, gold: 0, level: 0, nb_games: 0 },
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
    // Fetch both team players and opponents to build matchup data
    const allStats = await PlayerStats.find({ team_id: req.user.team_id });
    const playerStats = allStats.filter((s) => !s.opponent);
    const opponentStats = allStats.filter((s) => s.opponent);

    // Build a map of game_id + role -> opponent champion for quick lookup
    const opponentMap = {};
    for (const opp of opponentStats) {
      if (opp.game_id && opp.role) {
        const key = `${opp.game_id}_${opp.role}`;
        opponentMap[key] = opp.champion;
      }
    }

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
          matchups: {},
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

      // Track matchup against opponent champion
      const opponentKey = `${curr.game_id}_${curr.role}`;
      const opponentChamp = opponentMap[opponentKey];
      if (opponentChamp) {
        if (!champStats.matchups[opponentChamp]) {
          champStats.matchups[opponentChamp] = {
            opponent: opponentChamp,
            wins: 0,
            games: 0,
            total_kills: 0,
            total_deaths: 0,
            total_assists: 0,
            total_creep: 0,
            total_duration: 0,
          };
        }
        const matchup = champStats.matchups[opponentChamp];
        matchup.games += 1;
        if (curr.game_win) matchup.wins += 1;
        matchup.total_kills += curr.kills || 0;
        matchup.total_deaths += curr.deaths || 0;
        matchup.total_assists += curr.assists || 0;
        matchup.total_creep += curr.cs || 0;
        matchup.total_duration += curr.game_duration || 0;
      }

      return acc;
    }, {});

    const result = Object.values(statsByPlayer).map((player) => {
      const avgKda = player.total_deaths > 0 ? (player.total_kills + player.total_assists) / player.total_deaths : player.total_kills + player.total_assists;
      const csPerMin = player.total_duration > 0 ? player.total_creep / (player.total_duration / 60) : 0;
      const champions = Object.values(player.champions).map((champ) => {
        const champKda = champ.total_deaths > 0 ? (champ.total_kills + champ.total_assists) / champ.total_deaths : champ.total_kills + champ.total_assists;
        const champCsPerMin = champ.total_duration > 0 ? champ.total_creep / (champ.total_duration / 60) : 0;

        // Build matchups array with win rates and stats
        const matchups = Object.values(champ.matchups).map((m) => {
          const matchupKda = m.total_deaths > 0 ? (m.total_kills + m.total_assists) / m.total_deaths : m.total_kills + m.total_assists;
          const matchupCsPerMin = m.total_duration > 0 ? m.total_creep / (m.total_duration / 60) : 0;
          return {
            opponent: m.opponent,
            games: m.games,
            wins: m.wins,
            win_rate: Math.round((m.games > 0 ? m.wins / m.games : 0) * 1000) / 1000,
            kda: Math.round(matchupKda * 100) / 100,
            cs_per_min: Math.round(matchupCsPerMin * 10) / 10,
            kills: m.total_kills,
            deaths: m.total_deaths,
            assists: m.total_assists,
          };
        });

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
          matchups: matchups.sort((a, b) => b.games - a.games),
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
          },
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
          acc.control_wards_placed += curr.vision?.control_wards_placed || 0;
          acc.vision_score += curr.vision?.score || 0;
          acc.wards_placed += curr.vision?.wards_placed || 0;
          acc.wards_killed += curr.vision?.wards_killed || 0;
          acc.control_wards_bought += curr.vision?.control_wards_bought || 0;
          acc.level += curr.level || 0;
          acc.turrets += curr.objectives?.turrets || 0;
          acc.dragons += curr.objectives?.dragons || 0;
          acc.barons += curr.objectives?.barons || 0;
          acc.enemy_jungle += curr.farm?.enemy_jungle || 0;
          acc.gold_from_turret_plates += curr.gold_from_turret_plates || 0;
          acc.gold_from_shutdowns += curr.gold_from_shutdowns || 0;
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
          control_wards_placed: 0,
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
          gold_from_turret_plates: 0,
          gold_from_shutdowns: 0,
        },
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
            label: 'Kill Participation',
            team: parseFloat((t.kills / (t.kills + t.deaths + t.assists)) * 100).toFixed(1),
            enemy: parseFloat((e.kills / (e.kills + e.deaths + e.assists)) * 100).toFixed(1),
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
          { label: 'Vision Score / min', team: parseFloat(getPerMin(t.vision_score, t.duration).toFixed(1)), enemy: parseFloat(getPerMin(e.vision_score, e.duration).toFixed(1)) },
          { label: 'Wards Placed / game', team: parseFloat(getAvg(t.wards_placed, t.games).toFixed(1)), enemy: parseFloat(getAvg(e.wards_placed, e.games).toFixed(1)) },
          { label: 'Wards Killed / game', team: parseFloat(getAvg(t.wards_killed, t.games).toFixed(1)), enemy: parseFloat(getAvg(e.wards_killed, e.games).toFixed(1)) },
          {
            label: 'Ward placed / killed',
            team: e.wards_placed > 0 ? parseFloat((t.wards_killed / e.wards_placed) * 100).toFixed(1) : 0,
            enemy: t.wards_placed > 0 ? parseFloat((e.wards_killed / t.wards_placed) * 100).toFixed(1) : 0,
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
          {
            label: 'Gold / min',
            team: parseFloat(getPerMin(t.gold, t.duration).toFixed(1)),
            enemy: parseFloat(getPerMin(e.gold, e.duration).toFixed(1)),
          },
          {
            label: 'CS / game',
            team: parseFloat(getAvg(t.cs, t.games).toFixed(1)),
            enemy: parseFloat(getAvg(e.cs, e.games).toFixed(1)),
          },
          {
            label: 'Level / game',
            team: parseFloat(getAvg(t.level, t.games).toFixed(1)),
            enemy: parseFloat(getAvg(e.level, e.games).toFixed(1)),
          },
          {
            label: 'Enemy jungle monsters / game',
            team: parseFloat(getAvg(t.enemy_jungle, t.games).toFixed(1)),
            enemy: parseFloat(getAvg(e.enemy_jungle, e.games).toFixed(1)),
          },
          {
            label: 'Plates / game',
            team: parseFloat(getAvg(t.gold_from_turret_plates, t.games).toFixed(1)),
            enemy: parseFloat(getAvg(e.gold_from_turret_plates, e.games).toFixed(1)),
          },
          {
            label: 'Shutdowns / game',
            team: parseFloat(getAvg(t.gold_from_shutdowns, t.games).toFixed(1)),
            enemy: parseFloat(getAvg(e.gold_from_shutdowns, e.games).toFixed(1)),
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

// New endpoint for StatsV2 - returns team, players, and matchup data with category scores
router.post('/team_stats_v2', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const allStats = await PlayerStats.find({ team_id: req.user.team_id });
    const playerStats = allStats.filter((s) => !s.opponent);
    const opponentStats = allStats.filter((s) => s.opponent);
    const games = await Game.find({ team_id: req.user.team_id });

    // Build opponent map for matchups
    const opponentMap = {};
    for (const opp of opponentStats) {
      if (opp.game_id && opp.role) {
        const key = `${opp.game_id}_${opp.role}`;
        opponentMap[key] = opp;
      }
    }

    // Helper functions
    const getAvg = (total, count) => (count > 0 ? total / count : 0);
    const getPerMin = (total, duration) => (duration > 0 ? total / (duration / 60) : 0);
    const round1 = (val) => Math.round(val * 10) / 10;
    const round2 = (val) => Math.round(val * 100) / 100;

    // Aggregate stats helper
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
          acc.control_wards_placed += curr.vision?.control_wards_placed || 0;
          acc.level += curr.level || 0;
          acc.enemy_jungle += curr.farm?.enemy_jungle || 0;
          acc.gold_from_turret_plates += curr.gold_from_turret_plates || 0;
          acc.damage_objectives += curr.damage?.to_objectives || 0;
          acc.turrets += curr.objectives?.turrets || 0;
          acc.dragons += curr.objectives?.dragons || 0;
          acc.barons += curr.objectives?.barons || 0;
          acc.heralds += curr.objectives?.heralds || 0;
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
          vision_score: 0,
          wards_placed: 0,
          wards_killed: 0,
          control_wards_placed: 0,
          level: 0,
          enemy_jungle: 0,
          gold_from_turret_plates: 0,
          damage_objectives: 0,
          turrets: 0,
          dragons: 0,
          barons: 0,
          heralds: 0,
          games: 0,
        },
      );
    };

    // Get metrics by category
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

    // Add diff to metrics
    const addDiff = (metrics) => {
      return metrics.map((m) => {
        let diff = m.enemies > 0 ? ((m.team - m.enemies) / m.enemies) * 100 : m.team > 0 ? 100 : 0;
        if (m.invert) diff = -diff;
        return { name: m.name, team: m.team, enemies: m.enemies, diff: round1(diff) };
      });
    };

    // Calculate score from metrics
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

    // Get all metrics by category
    const getAllMetrics = (teamAgg, enemyAgg) => {
      const result = {};
      ['Combat', 'Objectives', 'Vision', 'Income'].forEach((cat) => {
        result[cat] = addDiff(getMetrics(teamAgg, enemyAgg, cat));
      });
      return result;
    };

    // Calculate win rate by side using PlayerStats (side field)
    const calculateWinRateBySide = (statsList) => {
      // Group by game_id to count unique games, using PlayerStats side field
      const gamesBySide = {};
      statsList.forEach((s) => {
        if (!s.game_id || !s.side) return;
        if (!gamesBySide[s.game_id]) {
          gamesBySide[s.game_id] = { side: s.side, win: s.game_win };
        }
      });

      let blueWins = 0, blueTotal = 0, redWins = 0, redTotal = 0;
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
      };
    };

    // Calculate win rate by duration using PlayerStats (game_duration field)
    const calculateWinRateByDuration = (statsList) => {
      // Group by game_id to count unique games
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

    // Calculate global score
    const calculateGlobalScore = (categoryScores) => {
      const values = Object.values(categoryScores);
      return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
    };

    // --- Build Team Data ---
    const teamAgg = aggregateStats(playerStats);
    const enemyAgg = aggregateStats(opponentStats);
    const teamCategoryScores = getCategoryScores(teamAgg, enemyAgg);
    const teamMetrics = getAllMetrics(teamAgg, enemyAgg);
    const teamWinRate = games.length > 0 ? round1((games.filter((g) => g.win).length / games.length) * 100) : 0;

    // Calculate KDA helper
    const calculateKDA = (agg) => {
      if (agg.deaths === 0) return round1(agg.kills + agg.assists);
      return round1((agg.kills + agg.assists) / agg.deaths);
    };

    const teamData = {
      name: req.user.team_name || 'Team',
      score: calculateGlobalScore(teamCategoryScores),
      winRate: teamWinRate,
      games: games.length,
      kda: calculateKDA(teamAgg),
      categoryScores: teamCategoryScores,
      metrics: teamMetrics,
      winRateBySide: calculateWinRateBySide(playerStats),
      winRateByDuration: calculateWinRateByDuration(playerStats),
    };

    // --- Build Players Data ---
    const playersByName = {};
    playerStats.forEach((stat) => {
      const name = stat.summoner_name;
      if (!playersByName[name]) {
        playersByName[name] = { stats: [], role: stat.role };
      }
      playersByName[name].stats.push(stat);
      if (stat.role) playersByName[name].role = stat.role;
    });

    const players = Object.entries(playersByName).map(([name, data]) => {
      const pStats = data.stats;
      const pGames = [...new Set(pStats.map((s) => s.game_id))];
      const pGameDocs = games.filter((g) => pGames.includes(g.game_id));

      // Get opponent stats for this player's games
      const pOpponentStats = opponentStats.filter((o) => pGames.includes(o.game_id) && o.role === data.role);

      const pAgg = aggregateStats(pStats);
      const pEnemyAgg = aggregateStats(pOpponentStats);
      const pCategoryScores = getCategoryScores(pAgg, pEnemyAgg);

      // Build matchups
      const matchupMap = {};
      pStats.forEach((stat) => {
        const oppKey = `${stat.game_id}_${stat.role}`;
        const opponent = opponentMap[oppKey];
        if (!opponent) return;
        const oppChamp = opponent.champion;
        if (!matchupMap[oppChamp]) {
          matchupMap[oppChamp] = { teamStats: [], enemyStats: [] };
        }
        matchupMap[oppChamp].teamStats.push(stat);
        matchupMap[oppChamp].enemyStats.push(opponent);
      });

      const matchups = Object.entries(matchupMap).map(([champName, m]) => {
        const mTeamAgg = aggregateStats(m.teamStats);
        const mEnemyAgg = aggregateStats(m.enemyStats);
        const mCategoryScores = getCategoryScores(mTeamAgg, mEnemyAgg);
        const mScore = calculateGlobalScore(mCategoryScores);
        const mWinRate = mTeamAgg.games > 0 ? round1((mTeamAgg.wins / mTeamAgg.games) * 100) : 0;
        const avgWinRate = pAgg.games > 0 ? (pAgg.wins / pAgg.games) * 100 : 50;
        const diff = round1(mWinRate - avgWinRate);

        // Build sub-matchups: player's champion performance when facing this opponent champion
        const subMatchupMap = {};
        m.teamStats.forEach((stat) => {
          const playerChamp = stat.champion;
          if (!playerChamp) return;
          if (!subMatchupMap[playerChamp]) {
            subMatchupMap[playerChamp] = { wins: 0, games: 0 };
          }
          subMatchupMap[playerChamp].games++;
          if (stat.game_win) subMatchupMap[playerChamp].wins++;
        });

        const subMatchups = Object.entries(subMatchupMap).map(([playerChamp, stats]) => {
          const subWinRate = stats.games > 0 ? round1((stats.wins / stats.games) * 100) : 0;
          const subDiff = round1(subWinRate - mWinRate);
          return { name: playerChamp, winRate: subWinRate, games: stats.games, diff: subDiff };
        });

        const sortedSubMatchups = subMatchups.sort((a, b) => a.diff - b.diff);
        const mWeakAgainst = sortedSubMatchups.filter((s) => s.diff < 0).slice(0, 4);
        const mStrongAgainst = sortedSubMatchups.filter((s) => s.diff >= 0).sort((a, b) => b.diff - a.diff).slice(0, 4);

        return {
          name: champName,
          score: mScore,
          winRate: mWinRate,
          games: mTeamAgg.games,
          kda: calculateKDA(mTeamAgg),
          diff,
          categoryScores: mCategoryScores,
          metrics: getAllMetrics(mTeamAgg, mEnemyAgg),
          winRateBySide: calculateWinRateBySide(m.teamStats),
          winRateByDuration: calculateWinRateByDuration(m.teamStats),
          weakAgainst: mWeakAgainst,
          strongAgainst: mStrongAgainst,
        };
      });

      // Build player's champions stats (for Best/Worst WR display)
      const playerChampionMap = {};
      pStats.forEach((stat) => {
        const champ = stat.champion;
        if (!champ) return;
        if (!playerChampionMap[champ]) {
          playerChampionMap[champ] = { wins: 0, games: 0, stats: [] };
        }
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
          if (!champMatchupMap[oppChamp]) {
            champMatchupMap[oppChamp] = { wins: 0, games: 0, teamStats: [], enemyStats: [] };
          }
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
            score: calculateGlobalScore(mCategoryScores),
            categoryScores: mCategoryScores,
            metrics: getAllMetrics(mTeamAgg, mEnemyAgg),
            winRateBySide: calculateWinRateBySide(mData.teamStats),
            winRateByDuration: calculateWinRateByDuration(mData.teamStats),
          };
        });

        const sortedChampMatchups = champMatchups.sort((a, b) => a.winRate - b.winRate);
        const champWeakAgainst = sortedChampMatchups.slice(0, 4);
        const champStrongAgainst = [...champMatchups].sort((a, b) => b.winRate - a.winRate).slice(0, 4);

        return {
          name: champName,
          winRate: champWinRate,
          games: champData.games,
          kda: calculateKDA(champAgg),
          score: calculateGlobalScore(champCategoryScores),
          categoryScores: champCategoryScores,
          metrics: getAllMetrics(champAgg, champEnemyAgg),
          winRateBySide: calculateWinRateBySide(champData.stats),
          winRateByDuration: calculateWinRateByDuration(champData.stats),
          weakAgainst: champWeakAgainst,
          strongAgainst: champStrongAgainst,
        };
      });

      // Sort player's champions by winrate for Best/Worst WR
      const sortedPlayerChampions = [...playerChampions].sort((a, b) => a.winRate - b.winRate);
      const worstChampions = sortedPlayerChampions.slice(0, 4);
      const bestChampions = [...playerChampions].sort((a, b) => b.winRate - a.winRate).slice(0, 4);

      return {
        name,
        role: data.role || 'Unknown',
        score: calculateGlobalScore(pCategoryScores),
        winRate: pAgg.games > 0 ? round1((pAgg.wins / pAgg.games) * 100) : 0,
        games: pAgg.games,
        kda: calculateKDA(pAgg),
        categoryScores: pCategoryScores,
        metrics: getAllMetrics(pAgg, pEnemyAgg),
        winRateBySide: calculateWinRateBySide(pStats),
        winRateByDuration: calculateWinRateByDuration(pStats),
        weakAgainst: worstChampions,
        strongAgainst: bestChampions,
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

    const allStats = await PlayerStats.find({ team_id: req.user.team_id });
    const playerStats = allStats.filter((s) => !s.opponent);
    const opponentStats = allStats.filter((s) => s.opponent);
    const games = await Game.find({ team_id: req.user.team_id });

    // Helper functions
    const getAvg = (total, count) => (count > 0 ? total / count : 0);
    const getPerMin = (total, duration) => (duration > 0 ? total / (duration / 60) : 0);
    const round1 = (val) => Math.round(val * 10) / 10;
    const round2 = (val) => Math.round(val * 100) / 100;

    // Aggregate stats helper
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
          acc.control_wards_placed += curr.vision?.control_wards_placed || 0;
          acc.level += curr.level || 0;
          acc.enemy_jungle += curr.farm?.enemy_jungle || 0;
          acc.gold_from_turret_plates += curr.gold_from_turret_plates || 0;
          acc.damage_objectives += curr.damage?.to_objectives || 0;
          acc.turrets += curr.objectives?.turrets || 0;
          acc.dragons += curr.objectives?.dragons || 0;
          acc.barons += curr.objectives?.barons || 0;
          acc.heralds += curr.objectives?.heralds || 0;
          acc.games += 1;
          return acc;
        },
        {
          kills: 0, deaths: 0, assists: 0, gold: 0, damage: 0, duration: 0, cs: 0, wins: 0,
          vision_score: 0, wards_placed: 0, wards_killed: 0, control_wards_placed: 0,
          level: 0, enemy_jungle: 0, gold_from_turret_plates: 0, damage_objectives: 0,
          turrets: 0, dragons: 0, barons: 0, heralds: 0, games: 0,
        },
      );
    };

    // Get metrics by category
    const getMetrics = (t, e, category) => {
      if (category === 'Combat') {
        return [
          { name: 'DMG / min', team: round1(getPerMin(t.damage, t.duration)), enemies: round1(getPerMin(e.damage, e.duration)) },
          { name: 'Kills / game', team: round1(getAvg(t.kills, t.games)), enemies: round1(getAvg(e.kills, e.games)) },
          { name: 'Deaths / game', team: round1(getAvg(t.deaths, t.games)), enemies: round1(getAvg(e.deaths, e.games)), invert: true },
          { name: 'Kill Participation %', team: round1(t.kills + t.deaths + t.assists > 0 ? (t.kills / (t.kills + t.deaths + t.assists)) * 100 : 0), enemies: round1(e.kills + e.deaths + e.assists > 0 ? (e.kills / (e.kills + e.deaths + e.assists)) * 100 : 0) },
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
          { name: 'Ward Clear %', team: round1(e.wards_placed > 0 ? (t.wards_killed / e.wards_placed) * 100 : 0), enemies: round1(t.wards_placed > 0 ? (e.wards_killed / t.wards_placed) * 100 : 0) },
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

    const addDiff = (metrics) => {
      return metrics.map((m) => {
        let diff = m.enemies > 0 ? ((m.team - m.enemies) / m.enemies) * 100 : m.team > 0 ? 100 : 0;
        if (m.invert) diff = -diff;
        return { name: m.name, team: m.team, enemies: m.enemies, diff: round1(diff) };
      });
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

    const getCategoryScores = (teamAgg, enemyAgg) => {
      const categories = ['Combat', 'Objectives', 'Vision', 'Income'];
      const scores = {};
      categories.forEach((cat) => {
        const metrics = getMetrics(teamAgg, enemyAgg, cat);
        scores[cat] = calculateScore(metrics);
      });
      return scores;
    };

    const getAllMetrics = (teamAgg, enemyAgg) => {
      const result = {};
      ['Combat', 'Objectives', 'Vision', 'Income'].forEach((cat) => {
        result[cat] = addDiff(getMetrics(teamAgg, enemyAgg, cat));
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
      let blueWins = 0, blueTotal = 0, redWins = 0, redTotal = 0;
      Object.values(gamesBySide).forEach((g) => {
        if (g.side === 'blue') { blueTotal++; if (g.win) blueWins++; }
        else if (g.side === 'red') { redTotal++; if (g.win) redWins++; }
      });
      return {
        blue: blueTotal > 0 ? Math.round((blueWins / blueTotal) * 100) : 0,
        red: redTotal > 0 ? Math.round((redWins / redTotal) * 100) : 0,
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

    const calculateKDA = (agg) => {
      if (agg.deaths === 0) return round1(agg.kills + agg.assists);
      return round1((agg.kills + agg.assists) / agg.deaths);
    };

    const calculateGlobalScore = (categoryScores) => {
      const values = Object.values(categoryScores);
      return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
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
      if (!ourChampMatchupMap[ourChamp]) {
        ourChampMatchupMap[ourChamp] = { wins: 0, games: 0, teamStats: [], enemyStats: [] };
      }
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

    const sortedMatchups = matchups.sort((a, b) => a.winRate - b.winRate);
    const weakAgainst = sortedMatchups.filter((m) => m.winRate <= 50).slice(0, 4);
    const strongAgainst = [...matchups].sort((a, b) => b.winRate - a.winRate).filter((m) => m.winRate > 50).slice(0, 4);

    // Calculate enemy champion's win rate (inverse of ours) and KDA
    const enemyWinRate = uniqueGames.length > 0 ? round1(100 - winRateVsChamp) : 0;
    const enemyKDA = calculateKDA(enemyAgg);

    const result = {
      name: championName,
      role: enemyRole,
      isEnemy: true,
      score: calculateGlobalScore(categoryScores),
      // Our stats vs this champion
      ourWinRate: winRateVsChamp,
      ourKda: calculateKDA(ourAgg),
      // Enemy champion's stats
      winRate: enemyWinRate,
      games: uniqueGames.length,
      kda: enemyKDA,
      categoryScores,
      metrics: getAllMetrics(ourAgg, enemyAgg),
      winRateBySide: calculateWinRateBySide(ourStatsVsChamp),
      winRateByDuration: calculateWinRateByDuration(ourStatsVsChamp),
      weakAgainst,
      strongAgainst,
    };

    return res.status(200).send({ ok: true, data: result });
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
          acc.solo_kills += curr.combat?.solo_kills || 0;
          acc.vision_score += curr.vision?.score || 0;
          acc.wards_placed += curr.vision?.wards_placed || 0;
          acc.wards_killed += curr.vision?.wards_killed || 0;
          acc.control_wards_bought += curr.vision?.control_wards_bought || 0;
          acc.control_wards_placed += curr.vision?.control_wards_placed || 0;
          acc.level += curr.level || 0;
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
          solo_kills: 0,
          games: 0,
          cs: 0,
          wins: 0,
          vision_score: 0,
          wards_placed: 0,
          wards_killed: 0,
          control_wards_bought: 0,
          control_wards_placed: 0,
          level: 0,
          enemy_jungle: 0,
          gold_from_turret_plates: 0,
          gold_from_shutdowns: 0,
        },
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

module.exports = router;
