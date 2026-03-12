const express = require('express');
const router = express.Router();
const passport = require('passport');
const SoloObjectifResult = require('../models/solo-objectif-result');
const SoloObjectif = require('../models/solo-objectif');
const ERROR_CODES = require('../utils/errorCodes');
const { capture } = require('../services/sentry');

router.get('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const soloObjectifResult = await SoloObjectifResult.findById(req.params.id);
    if (!soloObjectifResult) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });
    return res.status(200).send({ ok: true, data: soloObjectifResult });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.put('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const soloObjectifResult = await SoloObjectifResult.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!soloObjectifResult) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });
    return res.status(200).send({ ok: true, data: soloObjectifResult });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.post('/stats', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    if (!req.body.team_id) return res.status(400).send({ ok: false, code: ERROR_CODES.INVALID_BODY });

    const objectives = await SoloObjectif.find({ team_id: req.body.team_id });
    const results = await SoloObjectifResult.find({ team_id: req.body.team_id });

    if (objectives.length === 0 || results.length === 0) {
      return res.status(200).send({ ok: true, data: { globalSuccessRate: null, totalSuccess: 0, totalResults: 0, best: null, worst: null } });
    }

    const totalSuccess = results.filter(r => r.success).length;
    const globalSuccessRate = Math.round((totalSuccess / results.length) * 100);

    const byObjectif = {};
    for (const obj of objectives) byObjectif[obj._id.toString()] = { results: [] };

    for (const r of results) {
      if (!byObjectif[r.solo_objectif_id]) continue;
      byObjectif[r.solo_objectif_id].results.push(r);
    }

    const sorted = Object.entries(byObjectif)
      .map(([id, v]) => {
        const total = v.results.length;
        const success = v.results.filter(r => r.success).length;
        return { id, rate: total > 0 ? Math.round((success / total) * 100) : null, total };
      })
      .filter(o => o.rate != null && o.total >= 1)
      .sort((a, b) => b.rate - a.rate);

    const best = sorted[0] ? { rate: sorted[0].rate, obj: objectives.find(o => o._id.toString() === sorted[0].id) } : null;
    const worst = sorted.length > 1 ? { rate: sorted.at(-1).rate, obj: objectives.find(o => o._id.toString() === sorted.at(-1).id) } : null;

    return res.status(200).send({
      ok: true,
      data: { globalSuccessRate, totalSuccess, totalResults: results.length, best, worst },
    });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.post('/search', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    let query = {};
    if (req.body.team_id) query.team_id = req.body.team_id;
    if (req.body.player_id) query.player_id = req.body.player_id;
    if (req.body.solo_objectif_id) query.solo_objectif_id = req.body.solo_objectif_id;
    const data = await SoloObjectifResult.find(query).sort({ createdAt: -1 });
    return res.status(200).send({ ok: true, data });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.post('/', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const soloObjectifResult = await SoloObjectifResult.create({ ...req.body, team_id: req.user.team_id, team_name: req.user.team_name });
    return res.status(200).send({ ok: true, data: soloObjectifResult });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.delete('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const soloObjectifResult = await SoloObjectifResult.findByIdAndDelete(req.params.id);
    if (!soloObjectifResult) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });
    return res.status(200).send({ ok: true, data: soloObjectifResult });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

module.exports = router;
