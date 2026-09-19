const express = require('express');
const router = express.Router();
const passport = require('passport');
const ERROR_CODES = require('../utils/errorCodes');
const { capture } = require('../services/sentry');
const SoloQMatch = require('../models/soloq-match');
const PlayerStats = require('../models/player-stats');
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
    if (req.body.queueId != null) query.queueId = req.body.queueId;
    if (req.body.from_date) query.gameDate = { $gte: new Date(req.body.from_date) };
    const limit = req.body.limit != null ? req.body.limit : 5000;
    const skip = req.body.offset || 0;
    const fields = req.body.fields || null;
    const total = await SoloQMatch.countDocuments(query);
    // Sort on gameDate (indexed with team_id / player_id) to avoid an in-memory sort on large result sets
    const data = await SoloQMatch.find(query, fields).sort({ gameDate: -1 }).skip(skip).limit(limit).allowDiskUse(true);
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

    // Team scope (whole roster, no position/champion): the scrim side sums the 5 players of a game,
    // so soloq is aggregated per position first, then summed across positions to keep the same unit.
    const teamScope = !req.body.puuid && !req.body.position && !req.body.championName;
    const agg = await SoloQMatch.aggregate([
      { $match: match },
      {
        $group: {
          _id: teamScope ? '$teamPosition' : null,
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
          pingOnMyWay: { $sum: '$onMyWayPings' },
          pingRetreat: { $sum: '$dangerPings' },
          pingEnemyMissing: { $sum: '$enemyMissingPings' },
          pingAssistMe: { $sum: '$assistMePings' },
          pingEnemyVision: { $sum: '$enemyVisionPings' },
          killParticipation: { $avg: '$challenges.killParticipation' },
        },
      },
    ]);

    if (!agg.length) return res.status(200).send({ ok: true, data: {} });

    // Per-row averages: one row per position in team scope, a single row otherwise
    const perRow = agg.map((s) => {
      const n = s.n;
      const durationMin = s.duration / 60;
      return {
        n,
        dmgPerMin: durationMin > 0 ? s.damage / durationMin : 0,
        kills: s.kills / n,
        deaths: s.deaths / n,
        kp: (s.killParticipation || 0) * 100,
        damage: s.damage,
        gold: s.gold,
        dragons: s.dragons / n,
        barons: s.barons / n,
        turrets: s.turrets / n,
        visionPerMin: durationMin > 0 ? s.visionScore / durationMin : 0,
        wardsPlaced: s.wardsPlaced / n,
        wardsKilled: s.wardsKilled / n,
        controlWards: s.controlWards / n,
        goldPerMin: durationMin > 0 ? s.gold / durationMin : 0,
        csPerMin: durationMin > 0 ? s.cs / durationMin : 0,
        enemyJungle: s.enemyJungle / n,
        pingOnMyWay: s.pingOnMyWay / n,
        pingRetreat: s.pingRetreat / n,
        pingEnemyMissing: s.pingEnemyMissing / n,
        pingAssistMe: s.pingAssistMe / n,
        pingEnemyVision: s.pingEnemyVision / n,
      };
    });

    // Team scope: sum the per-position averages (synthetic 5-man team), KP stays an average
    const sumKey = (key) => perRow.reduce((acc, r) => acc + r[key], 0);
    const t = {
      total: sumKey('n'),
      dmgPerMin: sumKey('dmgPerMin'),
      kills: sumKey('kills'),
      deaths: sumKey('deaths'),
      kp: sumKey('kp') / perRow.length,
      dmgPerGold: sumKey('gold') > 0 ? sumKey('damage') / sumKey('gold') : 0,
      dragons: sumKey('dragons'),
      barons: sumKey('barons'),
      turrets: sumKey('turrets'),
      visionPerMin: sumKey('visionPerMin'),
      wardsPlaced: sumKey('wardsPlaced'),
      wardsKilled: sumKey('wardsKilled'),
      controlWards: sumKey('controlWards'),
      goldPerMin: sumKey('goldPerMin'),
      csPerMin: sumKey('csPerMin'),
      enemyJungle: sumKey('enemyJungle'),
      pingOnMyWay: sumKey('pingOnMyWay'),
      pingRetreat: sumKey('pingRetreat'),
      pingEnemyMissing: sumKey('pingEnemyMissing'),
      pingAssistMe: sumKey('pingAssistMe'),
      pingEnemyVision: sumKey('pingEnemyVision'),
    };

    const result = {
      Combat: {
        'DMG / min': round1(t.dmgPerMin),
        'Kills / game': round1(t.kills),
        'Deaths / game': round1(t.deaths),
        'Kill Participation %': round1(t.kp),
        'DMG / Gold': round2(t.dmgPerGold),
      },
      Objectives: {
        'Dragons / game': round1(t.dragons),
        'Heralds / game': '-',
        'Barons / game': round1(t.barons),
        'Turrets / game': round1(t.turrets),
      },
      Vision: {
        'Vision Score / min': round1(t.visionPerMin),
        'Wards Placed / game': round1(t.wardsPlaced),
        'Wards Killed / game': round1(t.wardsKilled),
        'Control Wards / game': round1(t.controlWards),
        'Ward Clear %': '-',
      },
      Income: {
        'Gold / min': round1(t.goldPerMin),
        'CS / min': round1(t.csPerMin),
        'Enemy Jungle / game': round1(t.enemyJungle),
        'Plates Gold / game': '-',
      },
      Pings: {
        'On My Way / game': round1(t.pingOnMyWay),
        'Danger / game': round1(t.pingRetreat),
        'Enemy Missing / game': round1(t.pingEnemyMissing),
        'Assist Me / game': round1(t.pingAssistMe),
        'Enemy Vision / game': round1(t.pingEnemyVision),
      },
    };

    return res.status(200).send({ ok: true, data: result, total: t.total });
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

// ==================== CHAMPION COMPARISON (SoloQ vs Scrim per champion) ====================

router.post('/champion-comparison', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const { player_id, limit } = req.body;
    if (!player_id) return res.status(400).send({ ok: false, code: ERROR_CODES.INVALID_BODY });

    const player = await Player.findById(player_id);
    if (!player) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });

    const soloqMatches = await SoloQMatch.find({ puuid: player.puuid, queueId: 420, gameDuration: { $gte: 300 } });
    const scrimStats = await PlayerStats.find({ puuid: player.puuid, opponent: false });

    const byChamp = {};
    for (const m of soloqMatches) {
      if (!m.championName) continue;
      if (!byChamp[m.championName]) byChamp[m.championName] = { soloq: [], scrim: [] };
      byChamp[m.championName].soloq.push(m);
    }
    for (const s of scrimStats) {
      if (!s.champion) continue;
      if (!byChamp[s.champion]) byChamp[s.champion] = { soloq: [], scrim: [] };
      byChamp[s.champion].scrim.push(s);
    }

    const champions = Object.entries(byChamp)
      .map(([name, buckets]) => ({ name, soloq: aggregateSoloQ(buckets.soloq), scrim: aggregateScrim(buckets.scrim) }))
      .sort((a, b) => (b.soloq?.games || 0) + (b.scrim?.games || 0) - ((a.soloq?.games || 0) + (a.scrim?.games || 0)))
      .slice(0, limit || 5);

    return res.status(200).send({ ok: true, data: champions });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

function aggregateScrim(stats) {
  const n = stats.length;
  if (n === 0) return null;
  const totals = stats.reduce(
    (acc, s) => {
      acc.wins += s.game_win ? 1 : 0;
      acc.kills += s.kills || 0;
      acc.deaths += s.deaths || 0;
      acc.assists += s.assists || 0;
      acc.cs += s.cs || 0;
      acc.damage += s.damage?.total_to_champions || 0;
      acc.duration += s.game_duration || 0;
      return acc;
    },
    { wins: 0, kills: 0, deaths: 0, assists: 0, cs: 0, damage: 0, duration: 0 },
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
  };
}

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
      acc.controlWards += m.visionWardsBoughtInGame || 0;
      acc.duration += m.gameDuration || 0;
      return acc;
    },
    { wins: 0, kills: 0, deaths: 0, assists: 0, cs: 0, gold: 0, damage: 0, visionScore: 0, controlWards: 0, duration: 0 },
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
    controlWardsPerGame: round1(totals.controlWards / n),
  };
}

module.exports = router;
