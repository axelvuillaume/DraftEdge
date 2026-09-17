const express = require('express');
const router = express.Router();
const passport = require('passport');
const SoloObjectif = require('../models/solo-objectif');
const SoloObjectifResult = require('../models/solo-objectif-result');
const ERROR_CODES = require('../utils/errorCodes');
const { capture } = require('../services/sentry');
const { parseObjectiveRequest } = require('../services/solo-objectif-parser');
const { getPuuidByRiotId } = require('../services/riotgames');

router.get('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const soloObjectif = await SoloObjectif.findById(req.params.id);
    if (!soloObjectif) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });
    return res.status(200).send({ ok: true, data: soloObjectif });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.put('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const soloObjectif = await SoloObjectif.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!soloObjectif) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });
    return res.status(200).send({ ok: true, data: soloObjectif });
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
    const data = await SoloObjectif.find(query).sort({ createdAt: -1 });
    return res.status(200).send({ ok: true, data });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.post('/check-account', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const { game_name, tag_line, region } = req.body;
    if (!game_name || !tag_line) return res.status(400).send({ ok: false, code: 'MISSING_RIOT_ID' });
    const puuid = await getPuuidByRiotId(game_name, tag_line, region || 'euw1');
    if (!puuid) return res.status(404).send({ ok: false, code: 'ACCOUNT_NOT_FOUND' });
    return res.status(200).send({ ok: true, data: { puuid, game_name, tag_line, region: region || 'euw1' } });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.post('/', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const { name, request, player_id, player_name, champions, role, side, account } = req.body;

    const parsed = await parseObjectiveRequest(name, request);
    if (!parsed) return res.status(422).send({ ok: false, code: ERROR_CODES.RULE_GENERATION_FAILED });

    const soloObjectif = await SoloObjectif.create({
      name,
      request,
      type: parsed.type,
      rule: parsed.rule,
      ...(parsed.type === 'aggregate' && { aggregate: parsed.aggregate }),
      ...(parsed.type === 'streak' && { streak_count: parsed.streak_count }),
      champions: champions || [],
      role: role || null,
      side: side || null,
      player_id,
      player_name,
      team_id: req.user.team_id,
      team_name: req.user.team_name,
      ...(account?.puuid && { account }),
    });

    return res.status(200).send({ ok: true, data: soloObjectif });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.delete('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const soloObjectif = await SoloObjectif.findByIdAndDelete(req.params.id);
    if (!soloObjectif) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });
    await SoloObjectifResult.deleteMany({ solo_objectif_id: req.params.id });
    return res.status(200).send({ ok: true, data: soloObjectif });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

module.exports = router;
