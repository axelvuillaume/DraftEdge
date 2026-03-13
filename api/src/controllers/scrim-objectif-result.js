const express = require('express');
const router = express.Router();
const passport = require('passport');
const ScrimObjectifResult = require('../models/scrim-objectif-result');
const ScrimObjectif = require('../models/scrim-objectif');
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

// utiliser dans page objective
router.post('/average-score', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    if (!req.body.team_id) return res.status(400).send({ ok: false, code: ERROR_CODES.INVALID_BODY });

    const objectives = await ScrimObjectif.find({ team_id: req.body.team_id });
    const results = await ScrimObjectifResult.find({ team_id: req.body.team_id });

    if (objectives.length === 0 || results.length === 0) return res.status(200).send({ ok: true, data: null });

    const objMap = Object.fromEntries(objectives.map((o) => [o._id.toString(), o]));
    let totalScore = 0;
    let count = 0;

    for (const r of results) {
      const obj = objMap[r.objectif_id];
      if (!obj) continue;
      if (obj.rating_type === 'toggle') {
        totalScore += r.result ? 10 : 0;
      } else {
        totalScore += r.result || 0;
      }
      count++;
    }

    return res.status(200).send({ ok: true, data: count > 0 ? totalScore / count : null });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.post('/stats', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    if (!req.body.team_id) return res.status(400).send({ ok: false, code: ERROR_CODES.INVALID_BODY });

    const objectives = await ScrimObjectif.find({ team_id: req.body.team_id });
    const results = await ScrimObjectifResult.find({ team_id: req.body.team_id });

    const byObjectif = {};
    let allRatings = [];

    for (const obj of objectives) byObjectif[obj._id.toString()] = { ratings: [] };

    for (const r of results) {
      if (!byObjectif[r.objectif_id]) continue;
      if (r.result != null) byObjectif[r.objectif_id].ratings.push(r.result);
    }

    for (const id of Object.keys(byObjectif)) {
      const ratings = byObjectif[id].ratings;
      byObjectif[id].avg = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
      allRatings = allRatings.concat(ratings);
    }

    const sorted = Object.entries(byObjectif)
      .filter(([, v]) => v.avg != null)
      .sort((a, b) => b[1].avg - a[1].avg);

    const best = sorted[0] ? { avg: sorted[0][1].avg, obj: objectives.find((o) => o._id.toString() === sorted[0][0]) } : null;
    const worst = sorted.at(-1) ? { avg: sorted.at(-1)[1].avg, obj: objectives.find((o) => o._id.toString() === sorted.at(-1)[0]) } : null;

    return res.status(200).send({
      ok: true,
      data: {
        globalAvg: allRatings.length > 0 ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length : null,
        totalEvaluations: allRatings.length,
        best,
        worst,
      },
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
