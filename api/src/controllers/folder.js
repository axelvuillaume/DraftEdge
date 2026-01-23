const express = require('express');
const router = express.Router();
const passport = require('passport');
const Folder = require('../models/folder');
const Game = require('../models/game');
const ERROR_CODES = require('../utils/errorCodes');
const { capture } = require('../services/sentry');

router.get('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id);
    if (!folder) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });

    return res.status(200).send({ ok: true, data: folder });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.put('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const folder = await Folder.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!folder) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });
    return res.status(200).send({ ok: true, data: folder });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.post('/search', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    let query = {};

    if (req.body.team_id) query.team_id = req.body.team_id;
    if (req.body.name) query.name = req.body.name;
    if (req.body.description) query.description = req.body.description;
    const limit = req.body.limit || 50;
    const skip = req.body.offset || 0;
    const total = await Folder.countDocuments(query);
    const data = await Folder.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);
    return res.status(200).send({ ok: true, data, total });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.post('/', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    if (!req.body.name) return res.status(400).send({ ok: false, code: ERROR_CODES.INVALID_BODY });
    const folder = await Folder.create({ ...req.body, team_id: req.user.team_id, team_name: req.user.team_name });

    return res.status(200).send({ ok: true, data: folder });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, data: { code: ERROR_CODES.SERVER_ERROR } });
  }
});

router.delete('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const folder = await Folder.findByIdAndDelete(req.params.id);
    if (!folder) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });

    await Game.updateMany({ folder_id: folder._id }, { $set: { folder_id: null } });

    return res.status(200).send({ ok: true });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

module.exports = router;
