const express = require('express');
const router = express.Router();
const passport = require('passport');
const TeamLeague = require('../models/team-league');

const ERROR_CODES = require('../utils/errorCodes');
const { capture } = require('../services/sentry');

router.get('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const teamLeague = await TeamLeague.findById(req.params.id);
    if (!teamLeague) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });
    return res.status(200).send({ ok: true, data: teamLeague });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.put('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const teamLeague = await TeamLeague.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!teamLeague) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });
    return res.status(200).send({ ok: true, data: teamLeague });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

// Get all teams in a league by league_id
router.post('/search', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    let query = {};
    if (req.body.league_id) query.league_id = req.body.league_id;
    if (req.body.search) query.name = { $regex: req.body.search, $options: 'i' };
    if (req.body.group) query.group = req.body.group;

    const sortOptions = { lp: { total_lp: -1 }, points: { points: -1 } };
    const data = await TeamLeague.find(query).sort(sortOptions[req.body.sort] || { name: 1 });
    return res.status(200).send({ ok: true, data });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

// Distinct groups for a given league
router.post('/groups', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    if (!req.body.league_id) return res.status(200).send({ ok: true, data: [] });
    const result = await TeamLeague.aggregate([
      { $match: { league_id: req.body.league_id, group: { $exists: true, $nin: [null, ''] } } },
      { $group: { _id: '$group' } },
      { $sort: { _id: 1 } },
    ]);
    return res.status(200).send({ ok: true, data: result.map((r) => r._id) });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

module.exports = router;
