const express = require('express');
const router = express.Router();
const passport = require('passport');
const ScrimSession = require('../models/scrim-session');
const ERROR_CODES = require('../utils/errorCodes');
const { capture } = require('../services/sentry');

router.post('/patches', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const query = {};
    if (req.body.team_id) query.team_id = req.body.team_id;
    const patches = await ScrimSession.distinct('patch', query);
    const prefixes = [...new Set(patches.filter(Boolean).map((p) => p.split('.').slice(0, 2).join('.')))].sort().reverse();
    return res.status(200).send({ ok: true, data: prefixes });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.get('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const scrimSession = await ScrimSession.findById(req.params.id);
    if (!scrimSession) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });
    return res.status(200).send({ ok: true, data: scrimSession });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.put('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const scrimSession = await ScrimSession.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!scrimSession) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });
    return res.status(200).send({ ok: true, data: scrimSession });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.post('/search', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    let query = {};
    if (req.body.team_id) query.team_id = req.body.team_id;
    if (req.body.patch) query.patch = { $regex: `^${req.body.patch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}` };
    if (req.body.opponent_id) query.opponent_id = req.body.opponent_id;
    if (req.body.folder_id) query.folder_id = req.body.folder_id;
    if (req.body.search) {
      const escaped = req.body.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [{ name: { $regex: escaped, $options: 'i' } }, { opponent_name: { $regex: escaped, $options: 'i' } }, { patch: { $regex: escaped, $options: 'i' } }];
    }
    const data = await ScrimSession.find(query).sort({ date: -1 });
    return res.status(200).send({ ok: true, data });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.post('/', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const scrimSession = await ScrimSession.create({ ...req.body, team_id: req.user.team_id, team_name: req.user.team_name });
    return res.status(200).send({ ok: true, data: scrimSession });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.delete('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const scrimSession = await ScrimSession.findByIdAndDelete(req.params.id);
    if (!scrimSession) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });
    return res.status(200).send({ ok: true });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

module.exports = router;
