const Player = require('../models/player');
const SoloqMatch = require('../models/soloq-match');
const { RIOT_API_KEY } = require('../config');
const { PLATFORM_TO_REGIONAL } = require('../services/riotgames');

const QUEUE_ID = 420;
const DELAY_MS = 1300;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const IGNORED_KEYS = new Set([
  'eligibleForProgression',
  'playerScore0', 'playerScore1', 'playerScore2', 'playerScore3', 'playerScore4',
  'playerScore5', 'playerScore6', 'playerScore7', 'playerScore8', 'playerScore9',
  'playerScore10', 'playerScore11', 'missions',
  'killsOnRecentlyHealedByAramPack', 'snowballsHit', 'poroExplosions',
  'placement', 'subteamPlacement',
  'playerAugment1', 'playerAugment2', 'playerAugment3', 'playerAugment4', 'playerAugment5', 'playerAugment6',
  'playerSubteamId',
]);

async function apiFetch(url) {
  const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}api_key=${RIOT_API_KEY}`);

  if (res.status === 429) {
    const wait = (parseInt(res.headers.get('Retry-After'), 10) || 120) * 1000;
    console.log(`  [soloq-cron] Rate limited — waiting ${wait / 1000}s`);
    await sleep(wait);
    return apiFetch(url);
  }

  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

function mapMatch(data, puuid, player) {
  const { metadata, info } = data;
  const p = info.participants.find((x) => x.puuid === puuid);
  if (!p) return null;

  const team = info.teams.find((t) => t.teamId === p.teamId);

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
    matchId: metadata.matchId,
    dataVersion: metadata.dataVersion,
    endOfGameResult: info.endOfGameResult,
    gameCreation: info.gameCreation,
    gameDuration: info.gameDuration,
    gameEndTimestamp: info.gameEndTimestamp,
    gameStartTimestamp: info.gameStartTimestamp,
    gameDate: info.gameStartTimestamp ? new Date(info.gameStartTimestamp) : undefined,
    gameId: info.gameId,
    gameMode: info.gameMode,
    gameName: info.gameName,
    gameType: info.gameType,
    gameVersion: info.gameVersion,
    mapId: info.mapId,
    platformId: info.platformId,
    queueId: info.queueId,
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

async function fetchSoloQ() {
  const players = await Player.find({ puuid: { $exists: true, $ne: null }, connected_at: { $exists: true, $ne: null } }).lean();
  const validPlayers = players.filter((p) => p.puuid && p.puuid.trim() !== '');

  if (validPlayers.length === 0) return;

  let totalSaved = 0;

  for (const player of validPlayers) {
    try {
      const regional = PLATFORM_TO_REGIONAL[player.region] || PLATFORM_TO_REGIONAL['euw1'];
      const MATCH_V5_BASE = `https://${regional}.api.riotgames.com/lol/match/v5/matches`;

      // Fetch last 50 match IDs
      const url = `${MATCH_V5_BASE}/by-puuid/${player.puuid}/ids?queue=${QUEUE_ID}&start=0&count=50`;
      const matchIds = await apiFetch(url);

      if (!matchIds || matchIds.length === 0) continue;

      // Check which ones are already in DB
      const existing = await SoloqMatch.find(
        { matchId: { $in: matchIds }, puuid: player.puuid },
        { matchId: 1 },
      ).lean();
      const existingSet = new Set(existing.map((d) => d.matchId));
      const newIds = matchIds.filter((id) => !existingSet.has(id));

      if (newIds.length === 0) {
        console.log(`  [soloq-cron] ${player.game_name}: up to date`);
        continue;
      }

      console.log(`  [soloq-cron] ${player.game_name}: ${newIds.length} new matches`);

      for (let i = 0; i < newIds.length; i++) {
        try {
          const data = await apiFetch(`${MATCH_V5_BASE}/${newIds[i]}`);

          if (data.info.queueId !== QUEUE_ID) continue;

          const doc = mapMatch(data, player.puuid, player);
          if (!doc) continue;

          await SoloqMatch.updateOne({ matchId: doc.matchId, puuid: doc.puuid }, { $set: doc }, { upsert: true });
          totalSaved++;
        } catch (err) {
          console.error(`  [soloq-cron] ${player.game_name} ${newIds[i]}: ${err.message}`);
        }

        if (i < newIds.length - 1) await sleep(DELAY_MS);
      }
    } catch (err) {
      console.error(`  [soloq-cron] Error for ${player.game_name}: ${err.message}`);
    }

    await sleep(DELAY_MS);
  }

  console.log(`  [soloq-cron] Done — ${totalSaved} new matches saved`);
}

module.exports = fetchSoloQ;
