const express = require('express');
const router = express.Router();
const passport = require('passport');
const ProGamePlayerstats = require('../models/pro-game-playerstats');
const ERROR_CODES = require('../utils/errorCodes');
const { capture } = require('../services/sentry');

const ROLE_TO_POSITION = { top: 'top', jungle: 'jng', mid: 'mid', bottom: 'bot', support: 'sup' };

router.get('/teams/list', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const query = { participantid: { $lte: 10 } };
    if (req.query.league) query.league = req.query.league;
    const teams = await ProGamePlayerstats.distinct('teamname', query);
    return res.status(200).send({ ok: true, data: teams.filter(Boolean).sort() });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.get('/players/list', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const query = { participantid: { $lte: 10 } };
    if (req.query.position) query.position = ROLE_TO_POSITION[req.query.position] || req.query.position;
    if (req.query.league) query.league = req.query.league;
    const docs = await ProGamePlayerstats.find(query, { playername: 1, teamname: 1, position: 1 }).lean();
    const seen = new Set();
    const players = [];
    for (const d of docs) {
      if (!d.playername || seen.has(d.playername)) continue;
      seen.add(d.playername);
      players.push({ name: d.playername, team: d.teamname, position: d.position });
    }
    players.sort((a, b) => a.name.localeCompare(b.name));
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

// Aggregate pro stats by position, returning averages matching the same metric names as playerstats
const round1 = (val) => Math.round(val * 10) / 10;
const round2 = (val) => Math.round(val * 100) / 100;

router.post('/aggregate', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    let query = { participantid: { $lte: 10 } };

    if (req.body.position) query.position = ROLE_TO_POSITION[req.body.position] || req.body.position;
    if (req.body.patch) query.patch = { $regex: `^${req.body.patch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}` };
    if (req.body.leagues?.length) query.league = { $in: req.body.leagues };
    else if (req.body.league) query.league = req.body.league;
    if (req.body.teamname) query.teamname = req.body.teamname;
    if (req.body.playername) query.playername = req.body.playername;

    const stats = await ProGamePlayerstats.find(query).lean();
    if (!stats.length) return res.status(200).send({ ok: true, data: {} });

    const n = stats.length;
    const sum = (field) => stats.reduce((acc, s) => acc + (s[field] || 0), 0);
    const avg = (field) => round1(sum(field) / n);

    const totalKills = sum('kills');
    const totalDeaths = sum('deaths');
    const totalAssists = sum('assists');
    const totalDamage = sum('damagetochampions');
    const totalGold = sum('totalgold');

    // Ward Clear %: wardskilled / enemy wardsplaced
    const totalWardsKilled = sum('wardskilled');
    let wardClearPct = 0;
    const gameIds = [...new Set(stats.map((s) => s.gameid).filter(Boolean))];
    if (gameIds.length && totalWardsKilled > 0) {
      const wardAgg = await ProGamePlayerstats.aggregate([{ $match: { gameid: { $in: gameIds }, participantid: { $lte: 10 } } }, { $group: { _id: { gameid: '$gameid', side: '$side' }, wardsplaced: { $sum: '$wardsplaced' } } }]);
      const wardMap = {};
      wardAgg.forEach((w) => {
        wardMap[`${w._id.gameid}_${w._id.side}`] = w.wardsplaced;
      });
      let enemyWardsPlaced = 0;
      const seen = new Set();
      stats.forEach((s) => {
        if (!s.gameid || !s.side) return;
        const key = `${s.gameid}_${s.side}`;
        if (seen.has(key)) return;
        seen.add(key);
        const oppSide = s.side === 'Blue' ? 'Red' : 'Blue';
        enemyWardsPlaced += wardMap[`${s.gameid}_${oppSide}`] || 0;
      });
      wardClearPct = enemyWardsPlaced > 0 ? round1((totalWardsKilled / enemyWardsPlaced) * 100) : 0;
    }

    const result = {
      Combat: {
        'DMG / min': avg('dpm'),
        'Kills / game': avg('kills'),
        'Deaths / game': avg('deaths'),
        'Kill Participation %': round1(totalKills + totalDeaths + totalAssists > 0 ? (totalKills / (totalKills + totalDeaths + totalAssists)) * 100 : 0),
        'DMG / Gold': round2(totalGold > 0 ? totalDamage / totalGold : 0),
      },
      Objectives: {
        'Dragons / game': avg('dragons'),
        'Heralds / game': avg('heralds'),
        'Barons / game': avg('barons'),
        'Turrets / game': avg('towers'),
      },
      Vision: {
        'Vision Score / min': avg('vspm'),
        'Wards Placed / game': avg('wardsplaced'),
        'Wards Killed / game': avg('wardskilled'),
        'Control Wards / game': avg('controlwardsbought'),
        'Ward Clear %': wardClearPct,
      },
      Income: {
        'Gold / min': avg('earned_gpm'),
        'CS / min': avg('cspm'),
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
