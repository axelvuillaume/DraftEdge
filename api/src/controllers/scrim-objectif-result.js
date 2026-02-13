const express = require('express');
const router = express.Router();
const passport = require('passport');
const ScrimObjectifResult = require('../models/scrim-objectif-result');
const ERROR_CODES = require('../utils/errorCodes');
const { capture } = require('../services/sentry');

router.get('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const scrimObjectifResult = await ScrimObjectifResult.findById(req.params.id);
    if (!scrimObjectifResult) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });

    return res.status(200).send({ ok: true, data: scrimObjectifResult });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.put('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const scrimObjectifResult = await ScrimObjectifResult.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!scrimObjectifResult) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });
    return res.status(200).send({ ok: true, data: scrimObjectifResult });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.post('/search', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    let query = {};

    if (req.body.team_id) query.team_id = req.body.team_id;
    if (req.body.objectif_id) query.objectif_id = req.body.objectif_id;
    if (req.body.session_id) query.session_id = req.body.session_id;
    if (req.body.patch) query.patch = { $regex: `^${req.body.patch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}` };
    const limit = req.body.limit || 50;
    const skip = req.body.offset || 0;
    const total = await ScrimObjectifResult.countDocuments(query);
    const data = await ScrimObjectifResult.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);
    return res.status(200).send({ ok: true, data, total });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.post('/', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    if (!req.body.objectif_id) return res.status(400).send({ ok: false, code: ERROR_CODES.INVALID_BODY });
    const scrimObjectifResult = await ScrimObjectifResult.create({ ...req.body, team_id: req.user.team_id, team_name: req.user.team_name });

    return res.status(200).send({ ok: true, data: scrimObjectifResult });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, data: { code: ERROR_CODES.SERVER_ERROR } });
  }
});

router.delete('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const scrimObjectifResult = await ScrimObjectifResult.findByIdAndDelete(req.params.id);
    if (!scrimObjectifResult) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });

    return res.status(200).send({ ok: true });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

module.exports = router;
