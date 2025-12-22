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

router.post('/home_stats', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const thisWeekStart = new Date();
    thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
    thisWeekStart.setHours(0, 0, 0, 0);

    const playerStats = await PlayerStats.find({ team_id: req.user.team_id, createdAt: { $gte: thisWeekStart }, opponent: false });

    const statsByRole = playerStats.reduce((acc, curr) => {
      if (!acc[curr.role]) acc[curr.role] = { kills: 0, deaths: 0, assists: 0, gold: 0, level: 0 };
      acc[curr.role].kills += curr.kills;
      acc[curr.role].deaths += curr.deaths;
      acc[curr.role].assists += curr.assists;
      acc[curr.role].gold += curr.gold;
      acc[curr.role].level += curr.level;
      return acc;
    }, {});

    const stats = Object.keys(statsByRole).reduce((acc, role) => {
      const roleStats = statsByRole[role];
      const kda = roleStats.deaths > 0 ? (roleStats.kills + roleStats.assists) / roleStats.deaths : roleStats.kills + roleStats.assists;

      acc[role] = {
        kills: roleStats.kills,
        deaths: roleStats.deaths,
        assists: roleStats.assists,
        kda: Math.round(kda * 100) / 100,
        gold: roleStats.gold,
        level: roleStats.level,
        nb_games: playerStats.filter((p) => p.role === role).length,
      };
      return acc;
    }, {});

    return res.status(200).send({ ok: true, data: stats });
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
      player.total_creep += curr.creep || 0;
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
      champStats.total_creep += curr.creep || 0;
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
module.exports = router;
