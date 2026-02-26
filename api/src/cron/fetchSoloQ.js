const Player = require('../models/player');
const SoloqMatch = require('../models/soloq-match');
const SoloObjectif = require('../models/solo-objectif');
const SoloObjectifResult = require('../models/solo-objectif-result');
const { getMatchIdsByPuuid, getMatchById, getTimelineById } = require('../services/riotgames');

const QUEUE_ID = 420;
const DELAY_MS = 1300;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Metrics basées sur les events timeline (pas dispo dans participantFrames)
const EVENT_METRICS = new Set(['kills', 'deaths', 'assists']);

function getEventBasedMetric(timeline, participantId, metric, maxTimestamp) {
  let count = 0;
  for (const frame of timeline.info.frames) {
    if (frame.timestamp > maxTimestamp) break;
    for (const event of frame.events) {
      if (event.type !== 'CHAMPION_KILL') continue;
      if (event.timestamp > maxTimestamp) continue;
      if (metric === 'deaths' && event.victimId === participantId) count++;
      if (metric === 'kills' && event.killerId === participantId) count++;
      if (metric === 'assists' && event.assistingParticipantIds?.includes(participantId)) count++;
    }
  }
  return count;
}

function evaluate(operator, actual, target) {
  if (actual == null) return false;
  if (operator === '>') return actual > target;
  if (operator === '>=') return actual >= target;
  if (operator === '<') return actual < target;
  if (operator === '<=') return actual <= target;
  if (operator === '==') return actual === target;
  return false;
}

async function fetchSoloQ() {
  const players = await Player.find({ puuid: { $exists: true, $ne: null }, connected_at: { $exists: true, $ne: null } });
  const validPlayers = players.filter((p) => p.puuid && p.puuid.trim() !== '');

  if (validPlayers.length === 0) return;

  let totalSaved = 0;

  for (const player of validPlayers) {
    try {
      const platform = player.region || 'euw1';
      const matchIds = await getMatchIdsByPuuid(player.puuid, { queue: QUEUE_ID, count: 10, platform });

      if (!matchIds || matchIds.length === 0) continue;

      const existing = await SoloqMatch.find({ matchId: { $in: matchIds }, puuid: player.puuid }, { matchId: 1 }).lean();
      const existingSet = new Set(existing.map((d) => d.matchId));
      const newIds = matchIds.filter((id) => !existingSet.has(id));

      if (newIds.length === 0) continue;

      // Charger les objectifs du joueur une seule fois
      const objectives = await SoloObjectif.find({ player_id: player._id.toString(), 'rule.metric': { $exists: true } }).lean();
      const needsTimeline = objectives.some((o) => o.rule.source === 'timeline');

      for (let i = 0; i < newIds.length; i++) {
        try {
          const matchData = await getMatchById(newIds[i], platform);
          if (!matchData) continue;

          if (matchData.info.queueId !== QUEUE_ID) continue;

          const p = matchData.info.participants.find((x) => x.puuid === player.puuid);
          if (!p) continue;

          const { participants, teams, ...infoRest } = matchData.info;
          const team = teams.find((t) => t.teamId === p.teamId);

          const doc = {
            ...matchData.metadata,
            ...infoRest,
            ...p,
            gameDate: matchData.info.gameStartTimestamp ? new Date(matchData.info.gameStartTimestamp) : undefined,
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

          // Évaluer les objectifs pour ce match
          if (objectives.length > 0) {
            let timeline = null;
            let participantId = null;

            if (needsTimeline) {
              await sleep(DELAY_MS);
              timeline = await getTimelineById(newIds[i], platform);
              if (timeline?.info?.participants) {
                const tlP = timeline.info.participants.find((x) => x.puuid === player.puuid);
                participantId = tlP?.participantId;
              }
            }

            const results = [];

            for (const obj of objectives) {
              const { metric, operator, value, timing, source } = obj.rule;
              let actual_value = undefined;

              if (source === 'endgame') {
                actual_value = metric.split('.').reduce((o, key) => o?.[key], doc);
              }

              if (source === 'timeline' && timeline && participantId != null) {
                const targetMs = timing * 60 * 1000;
                const baseMetric = metric.split('.')[0];

                if (EVENT_METRICS.has(baseMetric)) {
                  actual_value = getEventBasedMetric(timeline, participantId, baseMetric, targetMs);
                } else {
                  const frame = timeline.info.frames.find((f) => f.timestamp >= targetMs);
                  if (frame) {
                    const pFrame = frame.participantFrames[String(participantId)];
                    if (pFrame) {
                      actual_value = metric.split('.').reduce((o, key) => o?.[key], pFrame);
                    }
                  }
                }
              }

              if (actual_value === undefined) continue;

              results.push({
                solo_objectif_id: obj._id.toString(),
                solo_objectif_name: obj.name,
                matchId: newIds[i],
                actual_value: Math.round(actual_value * 100) / 100,
                success: evaluate(operator, actual_value, value),
                game_date: doc.gameDate,
                champion: doc.championName,
                player_id: player._id.toString(),
                player_name: player.game_name,
                team_id: player.team_id,
                team_name: player.team_name,
              });
            }

            if (results.length > 0) await SoloObjectifResult.insertMany(results);
          }
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
