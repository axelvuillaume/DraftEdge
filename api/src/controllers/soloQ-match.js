const express = require('express');
const router = express.Router();
const passport = require('passport');
const ERROR_CODES = require('../utils/errorCodes');
const { capture } = require('../services/sentry');
const SoloQMatch = require('../models/soloq-match');
const Player = require('../models/player');
const PlayerStats = require('../models/playerstats');

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
    const players = await Player.find({ team_id: req.user.team_id }).lean();
    const puuids = players.map((p) => p.puuid).filter(Boolean);
    if (!puuids.length) return res.status(200).send({ ok: true, data: {} });

    const match = { puuid: { $in: puuids }, queueId: 420, gameDuration: { $gte: 300 } };
    if (req.body.position) match.teamPosition = POSITION_MAP[req.body.position] || req.body.position;

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

// ==================== AUTO TIER CALCULATION ====================

function calculateAutoTier(soloq, team) {
  // Combine stats from both contexts (official games weighted 3x)
  const sqGames = soloq?.games || 0;
  const tmGames = team?.games || 0;
  const totalWeightedGames = sqGames + tmGames * 3;

  if (totalWeightedGames === 0) return { tier: null };

  // Minimum 15 games (weighted) to be rated
  if (totalWeightedGames < 15) return { tier: null };

  // Combined win rate (official weighted 3x)
  const sqWins = soloq?.wins || 0;
  const tmWins = team?.wins || 0;
  const combinedWR = ((sqWins + tmWins * 3) / (sqGames + tmGames * 3)) * 100;

  // Combined KDA (official weighted 3x)
  const sqKDA = soloq?.kda || 0;
  const tmKDA = team?.kda || 0;
  const combinedKDA = tmGames > 0 && sqGames > 0 ? (sqKDA * sqGames + tmKDA * tmGames * 3) / (sqGames + tmGames * 3) : sqGames > 0 ? sqKDA : tmKDA;

  // Score calculation (0-100), capped at 30 games weighted
  const gameScore = Math.min(totalWeightedGames / 30, 1) * 30;
  const wrScore = combinedWR * 0.5;
  const kdaScore = Math.min(combinedKDA / 5, 1) * 20;
  const score = gameScore + wrScore + kdaScore;

  let tier = null;
  if (score >= 70) tier = 'S';
  else if (score >= 60) tier = 'A';
  else if (score >= 45) tier = 'B';

  return { tier, autoScore: Math.round(score * 10) / 10, gamesScore: Math.round(gameScore * 10) / 10, wrScore: Math.round(wrScore * 10) / 10, kdaScore: Math.round(kdaScore * 10) / 10 };
}

// ==================== COMPARE SoloQ vs Team ====================

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

function aggregateTeam(stats) {
  const n = stats.length;
  if (n === 0) return null;
  const totals = stats.reduce(
    (acc, s) => {
      acc.wins += s.game_win ? 1 : 0;
      acc.kills += s.kills || 0;
      acc.deaths += s.deaths || 0;
      acc.assists += s.assists || 0;
      acc.cs += s.cs || 0;
      acc.gold += s.gold || 0;
      acc.damage += s.damage?.total_to_champions || 0;
      acc.visionScore += s.vision?.score || 0;
      acc.duration += s.game_duration || 0;
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

router.post('/compare', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const { player_id, min_soloq_games = 3, min_team_games = 1 } = req.body;
    if (!player_id) return res.status(400).send({ ok: false, code: ERROR_CODES.INVALID_BODY });

    const player = await Player.findById(player_id).lean();
    if (!player) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });

    // Fetch SoloQ matches by puuid (GetAllSoloQ.js stores puuid, not player_id)
    const soloqMatches = await SoloQMatch.find({
      puuid: player.puuid,
      queueId: 420,
      gameDuration: { $gte: 300 },
    }).lean();

    // Fetch team game stats by puuid
    const teamStats = await PlayerStats.find({ team_id: player.team_id, puuid: player.puuid, opponent: false }).lean();

    // Group by champion
    const soloqByChamp = {};
    for (const match of soloqMatches) {
      const champ = match.championName;
      if (!champ) continue;
      if (!soloqByChamp[champ]) soloqByChamp[champ] = [];
      soloqByChamp[champ].push(match);
    }

    const teamByChamp = {};
    for (const stat of teamStats) {
      const champ = stat.champion;
      if (!champ) continue;
      if (!teamByChamp[champ]) teamByChamp[champ] = [];
      teamByChamp[champ].push(stat);
    }

    // Build champion comparison list
    const allChampions = new Set([...Object.keys(soloqByChamp), ...Object.keys(teamByChamp)]);
    const champions = [];
    const pocketPicks = [];

    for (const champ of allChampions) {
      const sqAgg = soloqByChamp[champ] ? aggregateSoloQ(soloqByChamp[champ]) : null;
      const tmAgg = teamByChamp[champ] ? aggregateTeam(teamByChamp[champ]) : null;

      const { tier: autoTier, ...autoScoreDetails } = calculateAutoTier(sqAgg, tmAgg);

      // Pocket picks: enough SoloQ games, no team games
      if (sqAgg && sqAgg.games >= min_soloq_games && !tmAgg) {
        pocketPicks.push({ name: champ, soloq: sqAgg, team: null, onlyIn: 'soloq', autoTier, ...autoScoreDetails });
        continue;
      }

      // Skip champions with too few games in both contexts
      if (sqAgg && sqAgg.games < min_soloq_games && (!tmAgg || tmAgg.games < min_team_games)) continue;
      if (!sqAgg && tmAgg && tmAgg.games < min_team_games) continue;

      champions.push({
        name: champ,
        soloq: sqAgg,
        team: tmAgg,
        onlyIn: !sqAgg ? 'team' : !tmAgg ? 'soloq' : null,
        autoTier,
        ...autoScoreDetails,
      });
    }

    // Sort: both contexts first (by total games desc), then single-context
    champions.sort((a, b) => {
      if (a.onlyIn && !b.onlyIn) return 1;
      if (!a.onlyIn && b.onlyIn) return -1;
      const aGames = (a.soloq?.games || 0) + (a.team?.games || 0);
      const bGames = (b.soloq?.games || 0) + (b.team?.games || 0);
      return bGames - aGames;
    });

    pocketPicks.sort((a, b) => b.soloq.games - a.soloq.games);

    // Overall SoloQ aggregate
    const soloqOverall = aggregateSoloQ(soloqMatches);

    // Most played champions (sorted by games desc)
    const mostPlayed = Object.entries(soloqByChamp)
      .map(([name, matches]) => ({ name, ...aggregateSoloQ(matches) }))
      .sort((a, b) => b.games - a.games);

    return res.status(200).send({
      ok: true,
      data: {
        player: {
          _id: player._id,
          team_id: player.team_id,
          game_name: player.game_name,
          tag_line: player.tag_line,
          role: player.role,
          current_tier: player.current_tier,
          current_rank: player.current_rank,
          current_lp: player.current_lp,
          current_wins: player.current_wins,
          current_losses: player.current_losses,
          champion_pool: player.champion_pool || [],
          notes: player.notes || '',
        },
        soloqOverall,
        mostPlayed,
        champions,
        pocketPicks,
      },
    });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

module.exports = router;
