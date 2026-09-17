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

router.post('/per-game-stats', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    if (!req.body.solo_objectif_id) return res.status(400).send({ ok: false, code: ERROR_CODES.INVALID_BODY });

    const obj = await SoloObjectif.findById(req.body.solo_objectif_id);
    if (!obj) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });

    const results = await SoloObjectifResult.find({ solo_objectif_id: obj._id.toString() }).sort({ game_date: 1, createdAt: 1 });

    const round1 = (v) => (v != null ? Math.round(v * 10) / 10 : null);
    const rate = (s, t) => (t > 0 ? Math.round((s / t) * 100) : null);
    const avg = (arr) => {
      const vals = arr.map((g) => g.value).filter((v) => v != null);
      if (vals.length === 0) return null;
      return round1(vals.reduce((a, v) => a + v, 0) / vals.length);
    };

    const games = results.map((r) => ({
      matchId: r.matchId,
      game_date: r.game_date || r.createdAt,
      champion: r.champion || null,
      opponent: r.opponent_champion || null,
      win: r.win ?? null,
      value: r.actual_value ?? null,
      success: !!r.success,
    }));

    // ---- KPIs
    const total = games.length;
    const successCount = games.filter((g) => g.success).length;
    const last10 = games.slice(-10);
    const prev10 = games.slice(-20, -10);
    const last10Rate = rate(last10.filter((g) => g.success).length, last10.length);
    const prev10Rate = rate(prev10.filter((g) => g.success).length, prev10.length);

    // ---- Win impact
    const withWin = games.filter((g) => g.win != null);
    const succ = withWin.filter((g) => g.success);
    const fail = withWin.filter((g) => !g.success);
    const succRate = rate(succ.filter((g) => g.win).length, succ.length);
    const failRate = rate(fail.filter((g) => g.win).length, fail.length);
    const impact = {
      success_wins: succ.filter((g) => g.win).length,
      success_total: succ.length,
      success_rate: succRate,
      fail_wins: fail.filter((g) => g.win).length,
      fail_total: fail.length,
      fail_rate: failRate,
      lift: succRate != null && failRate != null ? succRate - failRate : null,
    };

    // ---- Series (chronologique) avec moyenne glissante
    const WINDOW = games.length > 60 ? 10 : 5;
    const series = games.map((g, i) => {
      const win = games.slice(Math.max(0, i - WINDOW + 1), i + 1).map((x) => x.value).filter((v) => v != null);
      return { ...g, rolling: win.length > 0 ? Math.round((win.reduce((a, v) => a + v, 0) / win.length) * 100) / 100 : null };
    });

    // ---- Par jour (pour lisser le graph quand il y a beaucoup de games)
    const dayMap = {};
    for (const g of games) {
      if (g.value == null) continue;
      const d = new Date(g.game_date);
      const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
      if (!dayMap[key]) dayMap[key] = { date: key, games: [] };
      dayMap[key].games.push(g);
    }
    const dailyRaw = Object.values(dayMap)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map((d) => ({
        date: d.date,
        total: d.games.length,
        success: d.games.filter((g) => g.success).length,
        rate: rate(d.games.filter((g) => g.success).length, d.games.length),
        sum: d.games.reduce((a, g) => a + g.value, 0),
      }));
    // Tendance : moyenne pondérée par le nombre de games sur les N derniers jours joués
    const TREND_DAYS = dailyRaw.length > 30 ? 7 : 3;
    const daily = dailyRaw.map((d, i) => {
      const win = dailyRaw.slice(Math.max(0, i - TREND_DAYS + 1), i + 1);
      const games = win.reduce((a, x) => a + x.total, 0);
      return {
        date: d.date,
        total: d.total,
        success: d.success,
        rate: d.rate,
        avg: Math.round((d.sum / d.total) * 100) / 100,
        trend: Math.round((win.reduce((a, x) => a + x.sum, 0) / games) * 100) / 100,
      };
    });

    // ---- Par semaine (lundi → dimanche)
    const weekMap = {};
    for (const g of games) {
      const d = new Date(g.game_date);
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const day = start.getDay();
      start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
      const key = start.toISOString();
      if (!weekMap[key]) weekMap[key] = { start, games: [] };
      weekMap[key].games.push(g);
    }
    const weeksAsc = Object.values(weekMap).sort((a, b) => a.start - b.start);
    const weeks = weeksAsc.map((w, i) => {
      const end = new Date(w.start);
      end.setDate(end.getDate() + 7);
      const s = w.games.filter((g) => g.success).length;
      const r = rate(s, w.games.length);
      const prev = weeksAsc[i - 1];
      const prevRate = prev ? rate(prev.games.filter((g) => g.success).length, prev.games.length) : null;
      return {
        start: w.start,
        end,
        total: w.games.length,
        success: s,
        rate: r,
        avg: avg(w.games),
        delta: prevRate != null && r != null ? r - prevRate : null,
        games: [...w.games].sort((a, b) => new Date(b.game_date) - new Date(a.game_date)),
      };
    });
    weeks.reverse();

    // ---- Par champion + matchups
    const champMap = {};
    for (const g of games) {
      if (!g.champion) continue;
      if (!champMap[g.champion]) champMap[g.champion] = [];
      champMap[g.champion].push(g);
    }
    const champions = Object.entries(champMap)
      .map(([name, gs]) => {
        const oppMap = {};
        for (const g of gs) {
          if (!g.opponent) continue;
          if (!oppMap[g.opponent]) oppMap[g.opponent] = [];
          oppMap[g.opponent].push(g);
        }
        const withWinGs = gs.filter((g) => g.win != null);
        return {
          name,
          total: gs.length,
          success: gs.filter((g) => g.success).length,
          rate: rate(gs.filter((g) => g.success).length, gs.length),
          avg: avg(gs),
          winrate: rate(withWinGs.filter((g) => g.win).length, withWinGs.length),
          matchups: Object.entries(oppMap)
            .map(([opp, ogs]) => ({
              opponent: opp,
              total: ogs.length,
              success: ogs.filter((g) => g.success).length,
              rate: rate(ogs.filter((g) => g.success).length, ogs.length),
              avg: avg(ogs),
            }))
            .sort((a, b) => b.total - a.total),
        };
      })
      .sort((a, b) => b.total - a.total);

    return res.status(200).send({
      ok: true,
      data: {
        target: obj.rule?.value ?? null,
        metric: (obj.rule?.metric || '').split('.').pop(),
        operator: obj.rule?.operator || null,
        first_game_date: games[0]?.game_date || null,
        kpis: {
          total,
          success: successCount,
          fail: total - successCount,
          rate: rate(successCount, total),
          avg: avg(games),
          last10_rate: last10Rate,
          last10_delta: last10Rate != null && prev10Rate != null ? last10Rate - prev10Rate : null,
          impact_lift: impact.lift,
        },
        series,
        rolling_window: WINDOW,
        trend_days: TREND_DAYS,
        daily,
        weeks,
        champions,
        impact,
      },
    });
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
