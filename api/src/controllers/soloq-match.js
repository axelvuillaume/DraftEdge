const express = require('express');
const router = express.Router();
const passport = require('passport');
const ERROR_CODES = require('../utils/errorCodes');
const { capture } = require('../services/sentry');
const SoloQMatch = require('../models/soloq-match');
const Player = require('../models/player');

const round1 = (v) => Math.round(v * 10) / 10;
const round2 = (v) => Math.round(v * 100) / 100;

router.get('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const soloQMatch = await SoloQMatch.findOne({ _id: req.params.id });
    if (!soloQMatch) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });

    return res.status(200).send({ ok: true, data: soloQMatch });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.put('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const soloQMatch = await SoloQMatch.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!soloQMatch) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });
    return res.status(200).send({ ok: true, data: soloQMatch });
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
    if (req.body.puuid) query.puuid = req.body.puuid;
    if (req.body.from_date) query.gameDate = { $gte: new Date(req.body.from_date) };
    const limit = req.body.limit || 5000;
    const skip = req.body.offset || 0;
    const total = await SoloQMatch.countDocuments(query);
    const data = await SoloQMatch.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);
    return res.status(200).send({ ok: true, data, total });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.post('/', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const soloQMatch = await SoloQMatch.create({ ...req.body, team_id: req.user.team_id, team_name: req.user.team_name });
    return res.status(200).send({ ok: true, data: soloQMatch });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, data: { code: ERROR_CODES.SERVER_ERROR } });
  }
});

router.delete('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const soloQMatch = await SoloQMatch.findByIdAndDelete(req.params.id);
    if (!soloQMatch) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });

    return res.status(200).send({ ok: true });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

// ==================== AGGREGATE (for StatsV2 comparison) ====================

const POSITION_MAP = { top: 'TOP', jungle: 'JUNGLE', mid: 'MIDDLE', bottom: 'BOTTOM', support: 'UTILITY' };

router.post('/aggregate', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    let puuids;
    if (req.body.puuid) {
      puuids = [req.body.puuid];
    } else {
      const players = await Player.find({ team_id: req.user.team_id }).lean();
      puuids = players.map((p) => p.puuid).filter(Boolean);
    }
    if (!puuids.length) return res.status(200).send({ ok: true, data: {} });

    const match = { puuid: { $in: puuids }, queueId: 420, gameDuration: { $gte: 300 } };
    if (!req.body.puuid && req.body.position) match.teamPosition = POSITION_MAP[req.body.position] || req.body.position;
    if (req.body.championName) match.championName = req.body.championName;

    const agg = await SoloQMatch.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          n: { $sum: 1 },
          kills: { $sum: '$kills' },
          deaths: { $sum: '$deaths' },
          assists: { $sum: '$assists' },
          damage: { $sum: '$totalDamageDealtToChampions' },
          gold: { $sum: '$goldEarned' },
          cs: { $sum: { $add: ['$totalMinionsKilled', '$neutralMinionsKilled'] } },
          duration: { $sum: '$gameDuration' },
          visionScore: { $sum: '$visionScore' },
          wardsPlaced: { $sum: '$wardsPlaced' },
          wardsKilled: { $sum: '$wardsKilled' },
          controlWards: { $sum: '$visionWardsBoughtInGame' },
          dragons: { $sum: '$dragonKills' },
          barons: { $sum: '$baronKills' },
          turrets: { $sum: '$turretKills' },
          enemyJungle: { $sum: '$totalEnemyJungleMinionsKilled' },
        },
      },
    ]);

    if (!agg.length) return res.status(200).send({ ok: true, data: {} });

    const s = agg[0];
    const n = s.n;
    const durationMin = s.duration / 60;

    const result = {
      Combat: {
        'DMG / min': round1(durationMin > 0 ? s.damage / durationMin : 0),
        'Kills / game': round1(s.kills / n),
        'Deaths / game': round1(s.deaths / n),
        'Kill Participation %': round1(s.kills + s.deaths + s.assists > 0 ? (s.kills / (s.kills + s.deaths + s.assists)) * 100 : 0),
        'DMG / Gold': round2(s.gold > 0 ? s.damage / s.gold : 0),
      },
      Objectives: {
        'Dragons / game': round1(s.dragons / n),
        'Heralds / game': '-',
        'Barons / game': round1(s.barons / n),
        'Turrets / game': round1(s.turrets / n),
      },
      Vision: {
        'Vision Score / min': round1(durationMin > 0 ? s.visionScore / durationMin : 0),
        'Wards Placed / game': round1(s.wardsPlaced / n),
        'Wards Killed / game': round1(s.wardsKilled / n),
        'Control Wards / game': round1(s.controlWards / n),
        'Ward Clear %': '-',
      },
      Income: {
        'Gold / min': round1(durationMin > 0 ? s.gold / durationMin : 0),
        'CS / min': round1(durationMin > 0 ? s.cs / durationMin : 0),
        'Enemy Jungle / game': round1(s.enemyJungle / n),
        'Plates Gold / game': '-',
      },
    };

    return res.status(200).send({ ok: true, data: result, total: n });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

// ==================== SOLOQ OVERVIEW (overall + top champions in 1 query) ====================

router.post('/soloq-overview', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const { player_id } = req.body;
    if (!player_id) return res.status(400).send({ ok: false, code: ERROR_CODES.INVALID_BODY });

    const player = await Player.findById(player_id);
    if (!player) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });

    const matches = await SoloQMatch.find({ puuid: player.puuid, queueId: 420, gameDuration: { $gte: 300 } });

    const overall = matches.length ? aggregateSoloQ(matches) : null;

    const byChamp = {};
    for (const match of matches) {
      if (!match.championName) continue;
      if (!byChamp[match.championName]) byChamp[match.championName] = [];
      byChamp[match.championName].push(match);
    }

    const topChampions = Object.entries(byChamp)
      .map(([name, champs]) => ({ name, ...aggregateSoloQ(champs) }))
      .sort((a, b) => b.games - a.games);

    return res.status(200).send({ ok: true, data: { overall, topChampions } });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

function aggregateSoloQ(matches) {
  const n = matches.length;
  if (n === 0) return null;
  const totals = matches.reduce(
    (acc, m) => {
      acc.wins += m.win ? 1 : 0;
      acc.kills += m.kills || 0;
      acc.deaths += m.deaths || 0;
      acc.assists += m.assists || 0;
      acc.cs += (m.totalMinionsKilled || 0) + (m.neutralMinionsKilled || 0);
      acc.gold += m.goldEarned || 0;
      acc.damage += m.totalDamageDealtToChampions || 0;
      acc.visionScore += m.visionScore || 0;
      acc.duration += m.gameDuration || 0;
      return acc;
    },
    { wins: 0, kills: 0, deaths: 0, assists: 0, cs: 0, gold: 0, damage: 0, visionScore: 0, duration: 0 },
  );

  const durationMin = totals.duration / 60;
  return {
    games: n,
    wins: totals.wins,
    winRate: round1((totals.wins / n) * 100),
    avgKills: round1(totals.kills / n),
    avgDeaths: round1(totals.deaths / n),
    avgAssists: round1(totals.assists / n),
    kda: round1(totals.deaths > 0 ? (totals.kills + totals.assists) / totals.deaths : totals.kills + totals.assists),
    csPerMin: round1(durationMin > 0 ? totals.cs / durationMin : 0),
    dmgPerMin: Math.round(durationMin > 0 ? totals.damage / durationMin : 0),
    goldPerMin: Math.round(durationMin > 0 ? totals.gold / durationMin : 0),
    visionScorePerMin: round2(durationMin > 0 ? totals.visionScore / durationMin : 0),
  };
}

module.exports = router;
