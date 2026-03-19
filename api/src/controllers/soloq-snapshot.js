const express = require('express');
const router = express.Router();
const passport = require('passport');
const ERROR_CODES = require('../utils/errorCodes');
const { capture } = require('../services/sentry');
const SoloQSnapshot = require('../models/soloq-snapshot');
const Player = require('../models/player');

const RANKED_TIERS = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'];
const DIVS = { IV: 0, III: 1, II: 2, I: 3 };

function toLP(tier, rank, lp = 0) {
  const i = RANKED_TIERS.indexOf(tier);
  if (i === -1) return 0;
  return i >= 7 ? 2800 + lp : i * 400 + (DIVS[rank] || 0) * 100 + lp;
}

router.post('/best-grinder', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const { team_id } = req.body;
    if (!team_id) return res.status(400).send({ ok: false, code: ERROR_CODES.INVALID_PARAMS });

    const players = await Player.find({ team_id, puuid: { $exists: true, $ne: '' }, active: { $ne: false } });
    if (players.length === 0) return res.status(200).send({ ok: true, data: null });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const snapshots = await SoloQSnapshot.find({ team_id, fetched_at: { $gte: today } }).sort({ fetched_at: 1 });

    let best = null;
    for (const player of players) {
      const playerSnaps = snapshots.filter(s => s.player_id === player._id.toString()).sort((a, b) => new Date(a.fetched_at) - new Date(b.fetched_at));
      if (playerSnaps.length < 2) continue;
      const lpChange = toLP(playerSnaps.at(-1).tier, playerSnaps.at(-1).rank, playerSnaps.at(-1).league_points) - toLP(playerSnaps[0].tier, playerSnaps[0].rank, playerSnaps[0].league_points);
      if (lpChange > 0 && (!best || lpChange > best.lpChange)) {
        best = { game_name: player.game_name, current_tier: player.current_tier, lpChange };
      }
    }

    return res.status(200).send({ ok: true, data: best });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.post('/today-leaderboard', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const { team_id } = req.body;
    if (!team_id) return res.status(400).send({ ok: false, code: ERROR_CODES.INVALID_PARAMS });

    const players = await Player.find({ team_id, puuid: { $exists: true, $ne: '' }, active: { $ne: false } });
    if (players.length === 0) return res.status(200).send({ ok: true, data: [] });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const snapshots = await SoloQSnapshot.find({ team_id, fetched_at: { $gte: today } }).sort({ fetched_at: 1 });

    const results = [];
    for (const player of players) {
      const playerSnaps = snapshots.filter(s => s.player_id === player._id.toString()).sort((a, b) => new Date(a.fetched_at) - new Date(b.fetched_at));
      if (playerSnaps.length < 2) {
        results.push({ game_name: player.game_name, current_tier: player.current_tier, lpChange: 0, games: 0 });
        continue;
      }
      results.push({
        game_name: player.game_name,
        current_tier: player.current_tier,
        lpChange: toLP(playerSnaps.at(-1).tier, playerSnaps.at(-1).rank, playerSnaps.at(-1).league_points) - toLP(playerSnaps[0].tier, playerSnaps[0].rank, playerSnaps[0].league_points),
        games: (playerSnaps.at(-1).wins + playerSnaps.at(-1).losses) - (playerSnaps[0].wins + playerSnaps[0].losses),
        wins: playerSnaps.at(-1).wins - playerSnaps[0].wins,
        losses: playerSnaps.at(-1).losses - playerSnaps[0].losses,
      });
    }

    results.sort((a, b) => b.lpChange - a.lpChange);
    return res.status(200).send({ ok: true, data: results });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.get('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const soloQSnapshot = await SoloQSnapshot.findOne({ _id: req.params.id });
    if (!soloQSnapshot) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });

    return res.status(200).send({ ok: true, data: soloQSnapshot });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.put('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const soloQSnapshot = await SoloQSnapshot.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!soloQSnapshot) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });
    return res.status(200).send({ ok: true, data: soloQSnapshot });
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
    if (req.body.from_date) query.fetched_at = { $gte: new Date(req.body.from_date) };
    const limit = req.body.limit != null ? req.body.limit : 50;
    const skip = req.body.offset || 0;
    const total = await SoloQSnapshot.countDocuments(query);
    const data = await SoloQSnapshot.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);
    return res.status(200).send({ ok: true, data, total });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.post('/', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const soloQSnapshot = await SoloQSnapshot.create({ ...req.body, team_id: req.user.team_id, team_name: req.user.team_name });
    return res.status(200).send({ ok: true, data: soloQSnapshot });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, data: { code: ERROR_CODES.SERVER_ERROR } });
  }
});

router.delete('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const soloQSnapshot = await SoloQSnapshot.findByIdAndDelete(req.params.id);
    if (!soloQSnapshot) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });

    return res.status(200).send({ ok: true });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

module.exports = router;
