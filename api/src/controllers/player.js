const express = require('express');
const router = express.Router();
const passport = require('passport');
const Player = require('../models/player');
const ERROR_CODES = require('../utils/errorCodes');
const { capture } = require('../services/sentry');
const { getPuuidByRiotId, getRankByPuuid, getMatchIdsByPuuid, getMatchById, PLATFORM_TO_REGIONAL, SERVERS } = require('../services/riotgames');
const SoloqMatch = require('../models/soloq-match');

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
    const player = await Player.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!player) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });

    return res.status(200).send({ ok: true, data: player });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.put('/:id/resync', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const player = await Player.findById(req.params.id);
    if (!player) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });

    const riotIdChanged = req.body.game_name !== player.game_name || req.body.tag_line !== player.tag_line;
    const regionChanged = req.body.region && req.body.region !== player.region;
    const region = req.body.region || player.region || 'euw1';

    Object.assign(player, req.body);

    if ((riotIdChanged || regionChanged) && req.body.game_name && req.body.tag_line) {
      const puuid = await getPuuidByRiotId(req.body.game_name, req.body.tag_line, region);
      if (!puuid) return res.status(400).send({ ok: false, code: 'Riot ID not found' });
      player.puuid = puuid;
      const rank = await getRankByPuuid(puuid, region);
      player.region = region;
      player.connected_at = new Date();
      if (!rank) return res.status(400).send({ ok: false, code: 'Rank not found' });
      player.current_tier = rank.tier;
      player.current_rank = rank.rank;
      player.current_lp = rank.leaguePoints;
      player.current_wins = rank.wins;
      player.current_losses = rank.losses;
      player.last_fetched_at = new Date();
    }

    await player.save();
    return res.status(200).send({ ok: true, data: player });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

// =====================================================================
// SYNC SOLOQ — fetches all ranked solo matches for a player (like GetAllSoloQ.js)
// =====================================================================
const SEASON_START = new Date('2026-01-08T00:00:00Z');
const QUEUE_ID = 420;
const DELAY_MS = 1300;

const IGNORED_KEYS = new Set([
  'eligibleForProgression', 'playerScore0', 'playerScore1', 'playerScore2', 'playerScore3',
  'playerScore4', 'playerScore5', 'playerScore6', 'playerScore7', 'playerScore8',
  'playerScore9', 'playerScore10', 'playerScore11', 'missions', 'killsOnRecentlyHealedByAramPack',
  'snowballsHit', 'poroExplosions', 'placement', 'subteamPlacement',
  'playerAugment1', 'playerAugment2', 'playerAugment3', 'playerAugment4',
  'playerAugment5', 'playerAugment6', 'playerSubteamId',
]);

function mapMatch(data, puuid, player) {
  const p = data.info.participants.find((x) => x.puuid === puuid);
  if (!p) return null;

  const team = data.info.teams.find((t) => t.teamId === p.teamId);
  const participant = {};
  for (const [key, value] of Object.entries(p)) {
    if (!IGNORED_KEYS.has(key)) participant[key] = value;
  }
  if (participant.challenges) {
    const clean = {};
    for (const [key, value] of Object.entries(participant.challenges)) {
      if (!key.startsWith('SWARM_') && !IGNORED_KEYS.has(key)) clean[key] = value;
    }
    participant.challenges = clean;
  }

  return {
    matchId: data.metadata.matchId,
    dataVersion: data.metadata.dataVersion,
    endOfGameResult: data.info.endOfGameResult,
    gameCreation: data.info.gameCreation,
    gameDuration: data.info.gameDuration,
    gameEndTimestamp: data.info.gameEndTimestamp,
    gameStartTimestamp: data.info.gameStartTimestamp,
    gameDate: data.info.gameStartTimestamp ? new Date(data.info.gameStartTimestamp) : undefined,
    gameId: data.info.gameId,
    gameMode: data.info.gameMode,
    gameName: data.info.gameName,
    gameType: data.info.gameType,
    gameVersion: data.info.gameVersion,
    mapId: data.info.mapId,
    platformId: data.info.platformId,
    queueId: data.info.queueId,
    player_id: player._id.toString(),
    player_name: player.game_name,
    team_id: player.team_id,
    team_name: player.team_name,
    side: p.teamId === 100 ? 'blue' : 'red',
    ...participant,
    teamObjectives: team?.objectives,
    teamBans: team?.bans,
  };
}

async function syncSoloqForPlayer(player) {
  const region = player.region || 'euw1';
  const startTime = Math.floor(SEASON_START.getTime() / 1000);
  const allIds = [];
  let start = 0;

  while (true) {
    const ids = await getMatchIdsByPuuid(player.puuid, { count: 100, start, queue: QUEUE_ID, startTime, platform: region });
    if (!ids || ids.length === 0) break;
    allIds.push(...ids);
    if (ids.length < 100) break;
    start += 100;
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  if (allIds.length === 0) return { saved: 0, errors: 0 };

  const existingDocs = await SoloqMatch.find({ matchId: { $in: allIds }, puuid: player.puuid }, { matchId: 1 });
  const existingSet = new Set(existingDocs.map((d) => d.matchId));
  const newIds = allIds.filter((id) => !existingSet.has(id));

  let saved = 0;
  let errors = 0;
  const BULK_SIZE = 25;
  let bulkOps = [];

  async function flushBulk() {
    if (bulkOps.length === 0) return;
    const ops = bulkOps;
    bulkOps = [];
    try {
      const result = await SoloqMatch.bulkWrite(ops, { ordered: false });
      saved += result.upsertedCount + result.modifiedCount;
    } catch (err) {
      const partial = err.result;
      if (partial) saved += (partial.nUpserted || 0) + (partial.nModified || 0);
      errors += ops.length - ((partial?.nUpserted || 0) + (partial?.nModified || 0));
    }
  }

  for (let i = 0; i < newIds.length; i++) {
    try {
      const data = await getMatchById(newIds[i], region);
      if (!data || data.info.queueId !== QUEUE_ID) continue;
      if (data.info.gameStartTimestamp && data.info.gameStartTimestamp < SEASON_START.getTime()) break;

      const doc = mapMatch(data, player.puuid, player);
      if (!doc) { errors++; continue; }

      bulkOps.push({ updateOne: { filter: { matchId: doc.matchId, puuid: doc.puuid }, update: { $set: doc }, upsert: true } });
      if (bulkOps.length >= BULK_SIZE) await flushBulk();
    } catch (err) {
      errors++;
    }
    if (i < newIds.length - 1) await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  await flushBulk();
  return { saved, errors };
}

router.put('/:id/sync-soloq', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const player = await Player.findById(req.params.id);
    if (!player) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });
    if (!player.puuid) return res.status(400).send({ ok: false, code: 'Player has no PUUID' });

    player.sync_soloq = 'pending';
    await player.save();

    // Respond immediately, sync in background
    res.status(200).send({ ok: true, data: player });

    try {
      await syncSoloqForPlayer(player);
      player.sync_soloq = 'done';
      await player.save();
    } catch (err) {
      capture(err);
      player.sync_soloq = undefined;
      await player.save().catch(() => {});
    }
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.post('/search', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    let query = {};

    if (req.body.team_id) query.team_id = req.body.team_id;
    if (req.body.team_league_id) query.team_league_id = req.body.team_league_id;
    if (req.body.active !== undefined) query.active = req.body.active;
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

    const puuid = await getPuuidByRiotId(req.body.game_name, req.body.tag_line, region);
    if (!puuid) return res.status(400).send({ ok: false, code: 'Riot ID not found' });

    const existing = await Player.findOne({ puuid, team_id: req.user.team_id, active: true });
    if (existing) return res.status(200).send({ ok: true, data: existing });

    const playerData = { ...req.body, region, active: true, team_id: req.user.team_id, team_name: req.user.team_name, puuid };

    const rank = await getRankByPuuid(puuid, region);
    if (rank) {
      playerData.current_tier = rank.tier;
      playerData.current_rank = rank.rank;
      playerData.current_lp = rank.leaguePoints;
      playerData.current_wins = rank.wins;
      playerData.current_losses = rank.losses;
      playerData.last_fetched_at = new Date();
      playerData.connected_at = new Date();
    }

    const player = await Player.create(playerData);

    return res.status(200).send({ ok: true, data: player });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
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
