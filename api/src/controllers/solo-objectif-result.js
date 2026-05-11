const express = require('express');
const router = express.Router();
const passport = require('passport');
const SoloObjectifResult = require('../models/solo-objectif-result');
const SoloObjectif = require('../models/solo-objectif');
const SoloqMatch = require('../models/soloq-match');
const Player = require('../models/player');
const ERROR_CODES = require('../utils/errorCodes');
const { capture } = require('../services/sentry');

const COMPUTED_METRICS = {
  cs_per_min: (doc) => (doc.totalMinionsKilled + doc.neutralMinionsKilled) / (doc.gameDuration / 60),
  kda: (doc) => (doc.kills + doc.assists) / Math.max(1, doc.deaths),
};
const BOOLEAN_METRICS = new Set(['win', 'firstBloodKill', 'firstBloodAssist', 'firstTowerKill', 'firstTowerAssist']);

function resolveMetric(doc, metric) {
  if (COMPUTED_METRICS[metric]) return COMPUTED_METRICS[metric](doc);
  let val = metric.split('.').reduce((o, key) => o?.[key], doc);
  if (typeof val === 'boolean' || BOOLEAN_METRICS.has(metric.split('.')[0])) val = val ? 1 : 0;
  return val;
}

router.get('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const soloObjectifResult = await SoloObjectifResult.findById(req.params.id);
    if (!soloObjectifResult) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });
    return res.status(200).send({ ok: true, data: soloObjectifResult });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.put('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const soloObjectifResult = await SoloObjectifResult.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!soloObjectifResult) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });
    return res.status(200).send({ ok: true, data: soloObjectifResult });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.post('/stats', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    if (!req.body.team_id) return res.status(400).send({ ok: false, code: ERROR_CODES.INVALID_BODY });

    const objectives = await SoloObjectif.find({ team_id: req.body.team_id });
    const results = await SoloObjectifResult.find({ team_id: req.body.team_id });

    if (objectives.length === 0 || results.length === 0) {
      return res.status(200).send({ ok: true, data: { globalSuccessRate: null, totalSuccess: 0, totalResults: 0, best: null, worst: null } });
    }

    const totalSuccess = results.filter((r) => r.success).length;
    const globalSuccessRate = Math.round((totalSuccess / results.length) * 100);

    const byObjectif = {};
    for (const obj of objectives) byObjectif[obj._id.toString()] = { results: [] };

    for (const r of results) {
      if (!byObjectif[r.solo_objectif_id]) continue;
      byObjectif[r.solo_objectif_id].results.push(r);
    }

    const sorted = Object.entries(byObjectif)
      .map(([id, v]) => {
        const total = v.results.length;
        const success = v.results.filter((r) => r.success).length;
        return { id, rate: total > 0 ? Math.round((success / total) * 100) : null, total };
      })
      .filter((o) => o.rate != null && o.total >= 1)
      .sort((a, b) => b.rate - a.rate);

    const best = sorted[0] ? { rate: sorted[0].rate, obj: objectives.find((o) => o._id.toString() === sorted[0].id) } : null;
    const worst = sorted.length > 1 ? { rate: sorted.at(-1).rate, obj: objectives.find((o) => o._id.toString() === sorted.at(-1).id) } : null;

    return res.status(200).send({
      ok: true,
      data: { globalSuccessRate, totalSuccess, totalResults: results.length, best, worst },
    });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.post('/aggregate', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const query = { type: 'aggregate', active: { $ne: false } };
    if (req.body.team_id) query.team_id = req.body.team_id;
    if (req.body.player_id) query.player_id = req.body.player_id;
    if (req.body.solo_objectif_id) query._id = req.body.solo_objectif_id;

    const objectives = await SoloObjectif.find(query);
    if (objectives.length === 0) return res.status(200).send({ ok: true, data: [] });

    const results = [];

    for (const obj of objectives) {
      const { fn, period, minGames } = obj.aggregate || {};
      const { metric, operator, value } = obj.rule || {};
      if (!fn || !period || !metric) continue;

      // Calculer la date de début de période
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      let periodStart = null;
      if (period === 'daily') periodStart = startOfDay;
      if (period === 'weekly') {
        const day = now.getDay();
        periodStart = new Date(startOfDay);
        periodStart.setDate(periodStart.getDate() - (day === 0 ? 6 : day - 1)); // Lundi
      }

      // Query les matches du joueur sur la période (filtrer par puuid pour distinguer main/smurf)
      const matchQuery = { player_id: obj.player_id, queueId: 420 };
      if (periodStart) matchQuery.gameDate = { $gte: periodStart };
      if (obj.account?.puuid) matchQuery.puuid = obj.account.puuid;
      if (!obj.account?.puuid) {
        const player = await Player.findById(obj.player_id);
        if (player?.puuid) matchQuery.puuid = player.puuid;
      }
      if (obj.champions?.length > 0) matchQuery.championName = { $in: obj.champions };
      if (obj.role) matchQuery.teamPosition = obj.role;
      if (obj.side) matchQuery.side = obj.side;

      const matches = await SoloqMatch.find(matchQuery).sort({ gameDate: -1 });

      let current;
      let championsPlayed = null;
      if (metric === 'games_played') {
        // count simple : nombre de games jouées
        current = matches.length;
      }
      if (metric !== 'games_played' && metric === 'championId' && fn === 'count') {
        // count distinct : nombre de champions différents joués
        championsPlayed = [...new Set(matches.map((m) => m.championName).filter(Boolean))];
        current = championsPlayed.length;
      }
      if (current === undefined && fn === 'count') {
        // count conditionnel : compter les games où metric est truthy (win, firstBlood, etc.)
        current = matches.filter((m) => resolveMetric(m, metric) === 1).length;
      }
      if (current === undefined && fn === 'sum') {
        current = matches.reduce((acc, m) => acc + (resolveMetric(m, metric) || 0), 0);
      }
      if (current === undefined && fn === 'avg') {
        if (minGames && matches.length < minGames) current = null;
        if (current === undefined && matches.length === 0) current = null;
        if (current === undefined) current = matches.reduce((acc, m) => acc + (resolveMetric(m, metric) || 0), 0) / matches.length;
      }

      let success = false;
      if (current != null) {
        if (operator === '>') success = current > value;
        if (operator === '>=') success = current >= value;
        if (operator === '<') success = current < value;
        if (operator === '<=') success = current <= value;
        if (operator === '==') success = current === value;
      }

      results.push({
        solo_objectif_id: obj._id.toString(),
        solo_objectif_name: obj.name,
        player_id: obj.player_id,
        player_name: obj.player_name,
        team_id: obj.team_id,
        period,
        period_start: periodStart,
        current: current != null ? Math.round(current * 100) / 100 : null,
        target: value,
        success,
        total_games: matches.length,
        champions_played: championsPlayed,
      });
    }

    return res.status(200).send({ ok: true, data: results });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.post('/aggregate-history', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    if (!req.body.solo_objectif_id) return res.status(400).send({ ok: false, code: ERROR_CODES.INVALID_BODY });

    const obj = await SoloObjectif.findById(req.body.solo_objectif_id);
    if (!obj || obj.type !== 'aggregate') return res.status(200).send({ ok: true, data: [] });

    const { fn, period, minGames } = obj.aggregate || {};
    const { metric, operator, value } = obj.rule || {};
    if (!fn || !period || !metric) return res.status(200).send({ ok: true, data: [] });

    const matchPuuidQuery = {};
    if (obj.account?.puuid) matchPuuidQuery.puuid = obj.account.puuid;
    if (!obj.account?.puuid) {
      const player = await Player.findById(obj.player_id);
      if (player?.puuid) matchPuuidQuery.puuid = player.puuid;
    }

    const baseMatchQuery = { player_id: obj.player_id, queueId: 420, ...matchPuuidQuery };
    if (obj.champions?.length > 0) baseMatchQuery.championName = { $in: obj.champions };
    if (obj.role) baseMatchQuery.teamPosition = obj.role;
    if (obj.side) baseMatchQuery.side = obj.side;

    const now = new Date();
    const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const startOfWeek = (d) => {
      const day = d.getDay();
      const start = startOfDay(d);
      start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
      return start;
    };

    const buckets = [];
    if (period === 'total') {
      buckets.push({ start: new Date(obj.createdAt), end: now });
    }
    if (period === 'daily') {
      let cursor = startOfDay(new Date(obj.createdAt));
      const today = startOfDay(now);
      while (cursor <= today) {
        const end = new Date(cursor);
        end.setDate(end.getDate() + 1);
        buckets.push({ start: new Date(cursor), end });
        cursor = end;
      }
    }
    if (period === 'weekly') {
      let cursor = startOfWeek(new Date(obj.createdAt));
      const thisWeek = startOfWeek(now);
      while (cursor <= thisWeek) {
        const end = new Date(cursor);
        end.setDate(end.getDate() + 7);
        buckets.push({ start: new Date(cursor), end });
        cursor = end;
      }
    }

    const data = [];
    for (const b of buckets) {
      const matches = await SoloqMatch.find({ ...baseMatchQuery, gameDate: { $gte: b.start, $lt: b.end } }).sort({ gameDate: -1 });

      let current;
      let championsPlayed = null;
      if (metric === 'games_played') current = matches.length;
      if (current === undefined && metric === 'championId' && fn === 'count') {
        championsPlayed = [...new Set(matches.map((m) => m.championName).filter(Boolean))];
        current = championsPlayed.length;
      }
      if (current === undefined && fn === 'count') current = matches.filter((m) => resolveMetric(m, metric) === 1).length;
      if (current === undefined && fn === 'sum') current = matches.reduce((acc, m) => acc + (resolveMetric(m, metric) || 0), 0);
      if (current === undefined && fn === 'avg') {
        if (minGames && matches.length < minGames) current = null;
        if (current === undefined && matches.length === 0) current = null;
        if (current === undefined) current = matches.reduce((acc, m) => acc + (resolveMetric(m, metric) || 0), 0) / matches.length;
      }

      let success = false;
      if (current != null) {
        if (operator === '>') success = current > value;
        if (operator === '>=') success = current >= value;
        if (operator === '<') success = current < value;
        if (operator === '<=') success = current <= value;
        if (operator === '==') success = current === value;
      }

      const champStats = {};
      let wins = 0;
      for (const m of matches) {
        if (m.championName) {
          if (!champStats[m.championName]) champStats[m.championName] = { games: 0, wins: 0 };
          champStats[m.championName].games++;
          if (m.win) champStats[m.championName].wins++;
        }
        if (m.win) wins++;
      }
      const champions = Object.entries(champStats).map(([name, s]) => ({ name, games: s.games, wins: s.wins, losses: s.games - s.wins })).sort((a, b) => b.games - a.games);

      data.push({
        period_start: b.start,
        period_end: b.end,
        current: current != null ? Math.round(current * 100) / 100 : null,
        target: value,
        success,
        total_games: matches.length,
        wins,
        champions_played: championsPlayed,
        champions,
      });
    }

    return res.status(200).send({ ok: true, data });
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
    const data = await SoloObjectifResult.find(query).sort({ createdAt: -1 });
    return res.status(200).send({ ok: true, data });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.post('/', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const soloObjectifResult = await SoloObjectifResult.create({ ...req.body, team_id: req.user.team_id, team_name: req.user.team_name });
    return res.status(200).send({ ok: true, data: soloObjectifResult });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.delete('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const soloObjectifResult = await SoloObjectifResult.findByIdAndDelete(req.params.id);
    if (!soloObjectifResult) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });
    return res.status(200).send({ ok: true, data: soloObjectifResult });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

module.exports = router;
