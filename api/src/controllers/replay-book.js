const express = require('express');
const router = express.Router();
const passport = require('passport');
const ReplayBook = require('../models/replay-book');
const ERROR_CODES = require('../utils/errorCodes');
const { capture } = require('../services/sentry');

router.get('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const replayBook = await ReplayBook.findById(req.params.id);
    if (!replayBook) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });

    return res.status(200).send({ ok: true, data: replayBook });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.put('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const replayBook = await ReplayBook.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!replayBook) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });
    return res.status(200).send({ ok: true, data: replayBook });
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
    const data = await ReplayBook.find(query).sort({ createdAt: -1 });
    return res.status(200).send({ ok: true, data });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.post('/', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    if (!req.body.name || !req.body.link) return res.status(400).send({ ok: false, code: ERROR_CODES.INVALID_BODY });
    const replayBook = await ReplayBook.create(req.body);

    return res.status(200).send({ ok: true, data: replayBook });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, data: { code: ERROR_CODES.SERVER_ERROR } });
  }
});

router.delete('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const replayBook = await ReplayBook.findByIdAndDelete(req.params.id);
    if (!replayBook) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });

    return res.status(200).send({ ok: true });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

module.exports = router;
