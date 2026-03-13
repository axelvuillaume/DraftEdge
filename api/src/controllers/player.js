const express = require('express');
const router = express.Router();
const passport = require('passport');
const Player = require('../models/player');
const ERROR_CODES = require('../utils/errorCodes');
const { capture } = require('../services/sentry');
const { getPuuidByRiotId, getRankByPuuid, SERVERS } = require('../services/riotgames');

router.get('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const player = await Player.findOne({ _id: req.params.id });
    if (!player) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });

    return res.status(200).send({ ok: true, data: player });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.put('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const player = await Player.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!player) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });

    return res.status(200).send({ ok: true, data: player });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.put('/:id/resync', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const player = await Player.findById(req.params.id);
    if (!player) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });

    const riotIdChanged = req.body.game_name !== player.game_name || req.body.tag_line !== player.tag_line;
    const regionChanged = req.body.region && req.body.region !== player.region;
    const region = req.body.region || player.region || 'euw1';

    Object.assign(player, req.body);

    if ((riotIdChanged || regionChanged) && req.body.game_name && req.body.tag_line) {
      const puuid = await getPuuidByRiotId(req.body.game_name, req.body.tag_line, region);
      if (!puuid) return res.status(400).send({ ok: false, code: 'Riot ID not found' });
      player.puuid = puuid;
      const rank = await getRankByPuuid(puuid, region);
      player.region = region;
      player.connected_at = new Date();
      if (!rank) return res.status(400).send({ ok: false, code: 'Rank not found' });
      player.current_tier = rank.tier;
      player.current_rank = rank.rank;
      player.current_lp = rank.leaguePoints;
      player.current_wins = rank.wins;
      player.current_losses = rank.losses;
      player.last_fetched_at = new Date();
    }

    await player.save();
    return res.status(200).send({ ok: true, data: player });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.post('/search', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    let query = {};

    if (req.body.team_id) query.team_id = req.body.team_id;
    if (req.body.active !== undefined) query.active = req.body.active;
    const limit = req.body.limit || 50;
    const skip = req.body.offset || 0;
    const total = await Player.countDocuments(query);
    const data = await Player.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);
    return res.status(200).send({ ok: true, data, total });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.post('/', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const region = req.body.region || 'euw1';

    const puuid = await getPuuidByRiotId(req.body.game_name, req.body.tag_line, region);
    if (!puuid) return res.status(400).send({ ok: false, code: 'Riot ID not found' });

    const playerData = { ...req.body, region, active: true, team_id: req.user.team_id, team_name: req.user.team_name, puuid };

    const rank = await getRankByPuuid(puuid, region);
    if (rank) {
      playerData.current_tier = rank.tier;
      playerData.current_rank = rank.rank;
      playerData.current_lp = rank.leaguePoints;
      playerData.current_wins = rank.wins;
      playerData.current_losses = rank.losses;
      playerData.last_fetched_at = new Date();
      playerData.connected_at = new Date();
    }

    const player = await Player.create(playerData);

    return res.status(200).send({ ok: true, data: player });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.delete('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const player = await Player.findByIdAndDelete(req.params.id);
    if (!player) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });

    return res.status(200).send({ ok: true });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

module.exports = router;
