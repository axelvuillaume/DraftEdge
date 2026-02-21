const express = require('express');
const router = express.Router();
const passport = require('passport');
const Player = require('../models/player');
const ERROR_CODES = require('../utils/errorCodes');
const { capture } = require('../services/sentry');
const { getPuuidByRiotId, getRankByPuuid, SERVERS } = require('../services/riotgames');

router.get('/servers', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), (req, res) => {
  return res.status(200).send({ ok: true, data: SERVERS });
});

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
    const player = await Player.findById(req.params.id);
    if (!player) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });

    const riotIdChanged = req.body.game_name !== player.game_name || req.body.tag_line !== player.tag_line;
    const regionChanged = req.body.region && req.body.region !== player.region;
    const region = req.body.region || player.region || 'euw1';

    Object.assign(player, req.body);

    if ((riotIdChanged || regionChanged) && req.body.game_name && req.body.tag_line) {
      const puuid = await getPuuidByRiotId(req.body.game_name, req.body.tag_line, region);
      if (!puuid) return res.status(400).send({ ok: false, code: ERROR_CODES.INVALID_BODY });
      player.puuid = puuid;
      const rank = await getRankByPuuid(puuid, region);
      if (rank) {
        player.current_tier = rank.tier;
        player.current_rank = rank.rank;
        player.current_lp = rank.leaguePoints;
        player.current_wins = rank.wins;
        player.current_losses = rank.losses;
        player.last_fetched_at = new Date();
      }
      player.region = region;
      player.connected_at = new Date();
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
    const player = await Player.create({ ...req.body, region, team_id: req.user.team_id, team_name: req.user.team_name });

    const puuid = await getPuuidByRiotId(player.game_name, player.tag_line, region);
    if (!puuid) return res.status(400).send({ ok: false, code: ERROR_CODES.INVALID_BODY });
    const rank = await getRankByPuuid(puuid, region);
    if (rank) {
      player.current_tier = rank.tier;
      player.current_rank = rank.rank;
      player.current_lp = rank.leaguePoints;
      player.current_wins = rank.wins;
      player.current_losses = rank.losses;
      player.last_fetched_at = new Date();
      player.connected_at = new Date();
    }
    player.puuid = puuid;

    await player.save();

    return res.status(200).send({ ok: true, data: player });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, data: { code: ERROR_CODES.SERVER_ERROR } });
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
