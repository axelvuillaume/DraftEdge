const express = require('express');
const router = express.Router();
const passport = require('passport');
const StratMap = require('../models/strat-map');
const ERROR_CODES = require('../utils/errorCodes');
const { capture } = require('../services/sentry');

router.get('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const stratMap = await StratMap.findById(req.params.id);
    if (!stratMap) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });
    return res.status(200).send({ ok: true, data: stratMap });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.put('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const stratMap = await StratMap.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!stratMap) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });
    return res.status(200).send({ ok: true, data: stratMap });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.post('/search', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    let query = {};

    if (req.body.team_id) query.team_id = req.body.team_id;
    if (req.body.opponent_id) query.opponent_id = req.body.opponent_id;
    if (req.body.name) query.name = { $regex: req.body.name, $options: 'i' };
    if (req.body.search) query.name = { $regex: req.body.search, $options: 'i' };
    const limit = req.body.limit != null ? req.body.limit : 50;
    const skip = req.body.offset || 0;
    const total = await StratMap.countDocuments(query);
    const data = await StratMap.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);
    return res.status(200).send({ ok: true, data, total });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.post('/', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const stratMap = await StratMap.create({ ...req.body, team_id: req.user.team_id, team_name: req.user.team_name });
    return res.status(200).send({ ok: true, data: stratMap });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.delete('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const stratMap = await StratMap.findByIdAndDelete(req.params.id);
    if (!stratMap) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });
    return res.status(200).send({ ok: true });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

module.exports = router;
