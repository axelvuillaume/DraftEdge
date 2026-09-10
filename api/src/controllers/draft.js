const express = require('express');
const router = express.Router();
const passport = require('passport');
const Draft = require('../models/draft');
const DraftScenario = require('../models/draft-scenario');
const ERROR_CODES = require('../utils/errorCodes');
const { capture } = require('../services/sentry');

router.get('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    let draft = await Draft.findById(req.params.id);
    if (!draft) {
      // legacy links store a scenario id — resolve to its parent draft
      const scenario = await DraftScenario.findById(req.params.id);
      if (scenario?.draft_id) draft = await Draft.findById(scenario.draft_id);
    }
    if (!draft) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });

    return res.status(200).send({ ok: true, data: draft });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.put('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const draft = await Draft.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!draft) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });
    return res.status(200).send({ ok: true, data: draft });
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
    if (req.body.search) query.name = { $regex: req.body.search, $options: 'i' };
    const limit = req.body.limit || 50;
    const skip = req.body.offset || 0;
    const total = await Draft.countDocuments(query);
    const drafts = await Draft.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);

    const counts = await DraftScenario.aggregate([{ $match: { draft_id: { $in: drafts.map((d) => d._id.toString()) } } }, { $group: { _id: '$draft_id', n: { $sum: 1 } } }]);
    const data = drafts.map((d) => ({ ...d.toObject(), scenarioCount: counts.find((c) => c._id === d._id.toString())?.n || 0 }));

    return res.status(200).send({ ok: true, data, total });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.post('/', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    if (!req.body.name) return res.status(400).send({ ok: false, code: ERROR_CODES.INVALID_BODY });
    const draft = await Draft.create({ ...req.body, team_id: req.user.team_id, team_name: req.user.team_name });

    return res.status(200).send({ ok: true, data: draft });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, data: { code: ERROR_CODES.SERVER_ERROR } });
  }
});

router.delete('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const draft = await Draft.findByIdAndDelete(req.params.id);
    if (!draft) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });

    await DraftScenario.deleteMany({ draft_id: req.params.id });

    return res.status(200).send({ ok: true });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

module.exports = router;
