const express = require('express');
const router = express.Router();
const passport = require('passport');
const EnemyTeam = require('../models/enemy-team');
const Game = require('../models/game');
const ERROR_CODES = require('../utils/errorCodes');
const { capture } = require('../services/sentry');

router.get('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const enemyTeam = await EnemyTeam.findById(req.params.id);
    if (!enemyTeam) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });

    return res.status(200).send({ ok: true, data: enemyTeam });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.put('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const enemyTeam = await EnemyTeam.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!enemyTeam) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });
    return res.status(200).send({ ok: true, data: enemyTeam });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.post('/search', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    let query = {};

    if (req.body.team_id) query.team_id = req.body.team_id;
    if (req.body.search) query.name = { $regex: req.body.search, $options: 'i' };
    if (req.body.league) query.league = req.body.league;
    const limit = req.body.limit || 50;
    const skip = req.body.offset || 0;
    const total = await EnemyTeam.countDocuments(query);
    const data = await EnemyTeam.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);
    return res.status(200).send({ ok: true, data, total });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.post('/filters', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const leagues = await EnemyTeam.aggregate([
      { $match: { team_id: req.user.team_id, league: { $exists: true, $nin: [null, ''] } } },
      { $group: { _id: '$league' } },
      { $sort: { _id: 1 } },
    ]);

    return res.status(200).send({ ok: true, data: { leagues: leagues.map((l) => l._id).filter(Boolean) } });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.post('/', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    if (!req.body.name) return res.status(400).send({ ok: false, code: ERROR_CODES.INVALID_BODY });
    const enemyTeam = await EnemyTeam.create({ ...req.body, team_id: req.user.team_id, team_name: req.user.team_name });

    return res.status(200).send({ ok: true, data: enemyTeam });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, data: { code: ERROR_CODES.SERVER_ERROR } });
  }
});

router.delete('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const enemyTeam = await EnemyTeam.findByIdAndDelete(req.params.id);
    if (!enemyTeam) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });

    return res.status(200).send({ ok: true });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

// Manager space
router.post('/stats', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const team_id = req.user.team_id;

    const stats = await Game.aggregate([
      { $match: { team_id, opponent_name: { $ne: null, $exists: true } } },
      {
        $group: {
          _id: '$opponent_name',
          total_games: { $sum: 1 },
          wins: { $sum: { $cond: ['$win', 1, 0] } },
          losses: { $sum: { $cond: ['$win', 0, 1] } },
        },
      },
    ]);

    const data = stats.map((s) => ({ opponent_name: s._id, total_games: s.total_games, wins: s.wins, losses: s.losses, win_rate: s.total_games > 0 ? s.wins / s.total_games : 0 }));

    return res.status(200).send({ ok: true, data });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

module.exports = router;
