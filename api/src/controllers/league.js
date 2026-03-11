const express = require('express');
const router = express.Router();
const passport = require('passport');
const League = require('../models/league');
const ERROR_CODES = require('../utils/errorCodes');
const { capture } = require('../services/sentry');

router.post('/search', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    let query = {};
    if (req.body.region) query.region = req.body.region;
    if (req.body.tier) query.tier = req.body.tier;
    const data = await League.find(query).sort({ name: 1 });
    return res.status(200).send({ ok: true, data });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.get('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const league = await League.findById(req.params.id);
    if (!league) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });
    return res.status(200).send({ ok: true, data: league });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

module.exports = router;
