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

router.post('/stats', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
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

module.exports = router;
