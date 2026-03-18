const express = require('express');
const router = express.Router();
const passport = require('passport');
const SoloObjectifResult = require('../models/solo-objectif-result');
const SoloObjectif = require('../models/solo-objectif');
const SoloqMatch = require('../models/soloq-match');
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
      let periodStart;
      if (period === 'daily') {
        periodStart = startOfDay;
      } else {
        const day = now.getDay();
        periodStart = new Date(startOfDay);
        periodStart.setDate(periodStart.getDate() - (day === 0 ? 6 : day - 1)); // Lundi
      }

      // Query les matches du joueur sur la période (filtrer par puuid pour distinguer main/smurf)
      const matchQuery = { player_id: obj.player_id, queueId: 420, gameDate: { $gte: periodStart } };
      if (obj.account?.puuid) matchQuery.puuid = obj.account.puuid;
      if (obj.champions?.length > 0) matchQuery.championName = { $in: obj.champions };
      if (obj.role) matchQuery.teamPosition = obj.role;

      const matches = await SoloqMatch.find(matchQuery).sort({ gameDate: -1 });

      let current;
      if (metric === 'games_played') {
        // count simple : nombre de games jouées
        current = matches.length;
      } else if (fn === 'count') {
        // count conditionnel : compter les games où metric est truthy (win, firstBlood, etc.)
        current = matches.filter((m) => resolveMetric(m, metric) === 1).length;
      } else if (fn === 'sum') {
        current = matches.reduce((acc, m) => acc + (resolveMetric(m, metric) || 0), 0);
      } else if (fn === 'avg') {
        if (minGames && matches.length < minGames) {
          current = null; // Pas assez de games
        } else if (matches.length === 0) {
          current = null;
        } else {
          current = matches.reduce((acc, m) => acc + (resolveMetric(m, metric) || 0), 0) / matches.length;
        }
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
      });
    }

    return res.status(200).send({ ok: true, data: results });
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
