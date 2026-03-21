const express = require('express');
const router = express.Router();
const passport = require('passport');
const ProGamePlayerstats = require('../models/pro-game-player-stats');
const ERROR_CODES = require('../utils/errorCodes');
const { capture } = require('../services/sentry');

const ROLE_TO_POSITION = { top: 'top', jungle: 'jng', mid: 'mid', bottom: 'bot', support: 'sup' };

// Uses MongoDB $group instead of loading all docs into memory
router.get('/teams/list', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const match = { participantid: { $lte: 10 } };
    if (req.query.league) match.league = req.query.league;
    const teams = await ProGamePlayerstats.distinct('teamname', match);
    return res.status(200).send({ ok: true, data: teams.filter(Boolean).sort() });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

// Uses MongoDB $group to deduplicate instead of loading all docs
router.get('/players/list', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const match = { participantid: { $lte: 10 }, playername: { $ne: null } };
    if (req.query.position) match.position = ROLE_TO_POSITION[req.query.position] || req.query.position;
    if (req.query.league) match.league = req.query.league;

    const players = await ProGamePlayerstats.aggregate([{ $match: match }, { $group: { _id: '$playername', team: { $last: '$teamname' }, position: { $last: '$position' } } }, { $project: { _id: 0, name: '$_id', team: 1, position: 1 } }, { $sort: { name: 1 } }]);

    return res.status(200).send({ ok: true, data: players });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.get('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const proGamePlayerstats = await ProGamePlayerstats.findById(req.params.id);
    if (!proGamePlayerstats) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });

    return res.status(200).send({ ok: true, data: proGamePlayerstats });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.put('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const proGamePlayerstats = await ProGamePlayerstats.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!proGamePlayerstats) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });
    return res.status(200).send({ ok: true, data: proGamePlayerstats });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.post('/search', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    let query = {};

    if (req.body.team_id) query.team_id = req.body.team_id;
    if (req.body.pro_game_id) query.pro_game_id = req.body.pro_game_id;
    if (req.body.session_id) query.session_id = req.body.session_id;
    if (req.body.patch) query.patch = { $regex: `^${req.body.patch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}` };
    const limit = req.body.limit || 50;
    const skip = req.body.offset || 0;
    const total = await ProGamePlayerstats.countDocuments(query);
    const data = await ProGamePlayerstats.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);
    return res.status(200).send({ ok: true, data, total });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.post('/', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    if (!req.body.pro_game_id) return res.status(400).send({ ok: false, code: ERROR_CODES.INVALID_BODY });
    const proGamePlayerstats = await ProGamePlayerstats.create({ ...req.body });

    return res.status(200).send({ ok: true, data: proGamePlayerstats });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, data: { code: ERROR_CODES.SERVER_ERROR } });
  }
});

router.delete('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const proGamePlayerstats = await ProGamePlayerstats.findByIdAndDelete(req.params.id);
    if (!proGamePlayerstats) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });

    return res.status(200).send({ ok: true });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

// Aggregate pro stats — all computation done in MongoDB, no docs loaded into Node.js memory
const round1 = (val) => Math.round(val * 10) / 10;
const round2 = (val) => Math.round(val * 100) / 100;

router.post('/aggregate', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const match = { participantid: { $lte: 10 } };

    if (req.body.position) match.position = ROLE_TO_POSITION[req.body.position] || req.body.position;
    if (req.body.patch) match.patch = { $regex: `^${req.body.patch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}` };
    if (req.body.leagues?.length) match.league = { $in: req.body.leagues };
    else if (req.body.league) match.league = req.body.league;
    if (req.body.teamname) match.teamname = req.body.teamname;
    if (req.body.playername) match.playername = req.body.playername;
    if (req.body.champion) {
      match.$expr = {
        $eq: [
          { $replaceAll: { input: { $replaceAll: { input: { $replaceAll: { input: { $toLower: '$champion' }, find: ' ', replacement: '' } }, find: '.', replacement: '' } }, find: "'", replacement: '' } },
          req.body.champion.toLowerCase().replace(/[\s.']+/g, ''),
        ],
      };
    }

    const agg = await ProGamePlayerstats.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          n: { $sum: 1 },
          kills: { $avg: '$kills' },
          deaths: { $avg: '$deaths' },
          assists: { $avg: '$assists' },
          totalKills: { $sum: '$kills' },
          totalDeaths: { $sum: '$deaths' },
          totalAssists: { $sum: '$assists' },
          damagetochampions: { $sum: '$damagetochampions' },
          totalgold: { $sum: '$totalgold' },
          dpm: { $avg: '$dpm' },
          dragons: { $avg: '$dragons' },
          heralds: { $avg: '$heralds' },
          barons: { $avg: '$barons' },
          towers: { $avg: '$towers' },
          vspm: { $avg: '$vspm' },
          wardsplaced: { $avg: '$wardsplaced' },
          wardskilled: { $avg: '$wardskilled' },
          totalWardskilled: { $sum: '$wardskilled' },
          controlwardsbought: { $avg: '$controlwardsbought' },
          earned_gpm: { $avg: '$earned_gpm' },
          cspm: { $avg: '$cspm' },
          gameIds: { $addToSet: '$gameid' },
        },
      },
    ]);

    if (!agg.length) return res.status(200).send({ ok: true, data: {} });

    const s = agg[0];
    const n = s.n;

    // Ward Clear %: wardskilled / enemy wardsplaced
    let wardClearPct = 0;
    if (s.gameIds.length && s.totalWardskilled > 0) {
      const wardAgg = await ProGamePlayerstats.aggregate([
        { $match: { gameid: { $in: s.gameIds }, participantid: { $lte: 10 } } },
        { $group: { _id: '$gameid', totalWardsplaced: { $sum: '$wardsplaced' } } },
        { $group: { _id: null, totalWardsplaced: { $sum: '$totalWardsplaced' } } },
      ]);
      // Enemy wards ≈ half of total wards placed (both teams)
      const totalWardsplaced = wardAgg[0]?.totalWardsplaced || 0;
      const enemyWardsPlaced = totalWardsplaced / 2;
      wardClearPct = enemyWardsPlaced > 0 ? round1((s.totalWardskilled / enemyWardsPlaced) * 100) : 0;
    }

    const result = {
      Combat: {
        'DMG / min': round1(s.dpm),
        'Kills / game': round1(s.kills),
        'Deaths / game': round1(s.deaths),
        'Kill Participation %': round1(s.totalKills + s.totalDeaths + s.totalAssists > 0 ? (s.totalKills / (s.totalKills + s.totalDeaths + s.totalAssists)) * 100 : 0),
        'DMG / Gold': round2(s.totalgold > 0 ? s.damagetochampions / s.totalgold : 0),
      },
      Objectives: {
        'Dragons / game': round1(s.dragons),
        'Heralds / game': round1(s.heralds),
        'Barons / game': round1(s.barons),
        'Turrets / game': round1(s.towers),
      },
      Vision: {
        'Vision Score / min': round1(s.vspm),
        'Wards Placed / game': round1(s.wardsplaced),
        'Wards Killed / game': round1(s.wardskilled),
        'Control Wards / game': round1(s.controlwardsbought),
        'Ward Clear %': wardClearPct,
      },
      Income: {
        'Gold / min': round1(s.earned_gpm),
        'CS / min': round1(s.cspm),
        'Enemy Jungle / game': '-',
        'Plates Gold / game': '-',
      },
    };

    return res.status(200).send({ ok: true, data: result, total: n });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

module.exports = router;
