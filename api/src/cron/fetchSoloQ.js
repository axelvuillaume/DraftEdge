const Player = require('../models/player');
const SoloqMatch = require('../models/soloq-match');
const { getMatchIdsByPuuid, getMatchById } = require('../services/riotgames');

const QUEUE_ID = 420;
const DELAY_MS = 1300;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchSoloQ() {
  const players = await Player.find({ puuid: { $exists: true, $ne: null }, connected_at: { $exists: true, $ne: null } });
  const validPlayers = players.filter((p) => p.puuid && p.puuid.trim() !== '');

  if (validPlayers.length === 0) return;

  let totalSaved = 0;

  for (const player of validPlayers) {
    try {
      const platform = player.region || 'euw1';
      // Fetch last 50 match IDs
      const matchIds = await getMatchIdsByPuuid(player.puuid, { queue: QUEUE_ID, count: 10, platform });

      if (!matchIds || matchIds.length === 0) continue;

      // Check which ones are already in DB
      const existing = await SoloqMatch.find({ matchId: { $in: matchIds }, puuid: player.puuid }, { matchId: 1 }).lean();
      const existingSet = new Set(existing.map((d) => d.matchId));
      const newIds = matchIds.filter((id) => !existingSet.has(id));

      if (newIds.length === 0) continue;

      // console.log(`  [soloq-cron] ${player.game_name}: ${newIds.length} new matches`);

      for (let i = 0; i < newIds.length; i++) {
        try {
          const { metadata, info } = await getMatchById(newIds[i], platform);
          if (info.queueId !== QUEUE_ID) continue;

          const p = info.participants.find((x) => x.puuid === player.puuid);
          if (!p) continue;

          const { participants, teams, ...infoRest } = info;
          const team = teams.find((t) => t.teamId === p.teamId);

          const doc = {
            ...metadata,
            ...infoRest,
            ...p,
            gameDate: info.gameStartTimestamp ? new Date(info.gameStartTimestamp) : undefined,
            player_id: player._id.toString(),
            player_name: player.game_name,
            team_id: player.team_id,
            team_name: player.team_name,
            side: p.teamId === 100 ? 'blue' : 'red',
            teamObjectives: team?.objectives,
            teamBans: team?.bans,
          };

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
