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

// Metrics calculées à partir des stats endgame
const COMPUTED_METRICS = {
  cs_per_min: (doc) => (doc.totalMinionsKilled + doc.neutralMinionsKilled) / (doc.gameDuration / 60),
  kda: (doc) => (doc.kills + doc.assists) / Math.max(1, doc.deaths),
};

// Booleans Riot qui doivent être castés en 0/1
const BOOLEAN_METRICS = new Set(['win', 'firstBloodKill', 'firstBloodAssist', 'firstTowerKill', 'firstTowerAssist', 'gameEndedInSurrender', 'gameEndedInEarlySurrender']);

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

function resolveMetric(doc, metric) {
  // Computed metrics
  if (COMPUTED_METRICS[metric]) return COMPUTED_METRICS[metric](doc);

  // Endgame: dot notation
  let val = metric.split('.').reduce((o, key) => o?.[key], doc);

  // Cast booleans to 0/1
  if (typeof val === 'boolean' || BOOLEAN_METRICS.has(metric.split('.')[0])) val = val ? 1 : 0;

  return val;
}

function evaluateObjectives(objectives, doc, timeline, participantId, matchId, player) {
  const results = [];

  for (const obj of objectives) {
    // Skip aggregate objectives — they are evaluated via API, not per-match
    if (obj.type === 'aggregate') continue;
    if (!obj.active) continue;
    if (obj.champions?.length > 0 && !obj.champions.includes(doc.championName)) continue;
    if (obj.role && obj.role !== doc.teamPosition) continue;

    const { metric, operator, value, timing, source } = obj.rule;
    let actual_value = undefined;

    if (source === 'endgame') {
      actual_value = resolveMetric(doc, metric);
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
      matchId,
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

  return results;
}

async function evaluateStreaks(streakObjectives, player, matchId, smurfPuuid) {
  const results = [];

  for (const obj of streakObjectives) {
    if (!obj.active) continue;

    // Check if we already have a result for this match + objective (avoid duplicates)
    const existing = await SoloObjectifResult.findOne({ solo_objectif_id: obj._id.toString(), matchId });
    if (existing) continue;

    const { metric, operator, value } = obj.rule;
    const count = obj.streak_count || 2;

    // Fetch the last N matches for this player, sorted by date desc
    const query = { player_id: player._id.toString(), queueId: QUEUE_ID };
    if (smurfPuuid) query.puuid = smurfPuuid;
    else query.puuid = player.puuid;
    if (obj.champions?.length > 0) query.championName = { $in: obj.champions };
    if (obj.role) query.teamPosition = obj.role;

    const recentMatches = await SoloqMatch.find(query).sort({ gameDate: -1 }).limit(count);

    if (recentMatches.length < count) continue;

    // Check if all N matches pass the condition
    const allPass = recentMatches.every((m) => {
      let val = resolveMetric(m, metric);
      return evaluate(operator, val, value);
    });

    results.push({
      solo_objectif_id: obj._id.toString(),
      solo_objectif_name: obj.name,
      matchId,
      actual_value: count,
      success: allPass,
      game_date: recentMatches[0].gameDate,
      champion: recentMatches[0].championName,
      player_id: player._id.toString(),
      player_name: player.game_name,
      team_id: player.team_id,
      team_name: player.team_name,
    });
  }

  return results;
}

async function fetchSoloQ() {
  const players = await Player.find({ puuid: { $exists: true, $ne: null }, connected_at: { $exists: true, $ne: null } });
  const validPlayers = players.filter((p) => p.puuid && p.puuid.trim() !== '');

  if (validPlayers.length === 0) return;

  let totalSaved = 0;

  for (const player of validPlayers) {
    try {
      const platform = player.region || 'euw1';
      const matchIds = await getMatchIdsByPuuid(player.puuid, { queue: QUEUE_ID, count: 3, platform });

      if (!matchIds || matchIds.length === 0) continue;

      const existing = await SoloqMatch.find({ matchId: { $in: matchIds }, puuid: player.puuid }, { matchId: 1 });
      const existingSet = new Set(existing.map((d) => d.matchId));
      const newIds = matchIds.filter((id) => !existingSet.has(id));

      if (newIds.length === 0) continue;

      // Charger les objectifs du joueur (compte principal uniquement)
      const objectives = await SoloObjectif.find({
        player_id: player._id.toString(),
        'rule.metric': { $exists: true },
        'account.puuid': { $exists: false },
        active: { $ne: false },
      });
      const perGameAndStreakObjs = objectives.filter((o) => o.type !== 'aggregate');
      const streakObjs = objectives.filter((o) => o.type === 'streak');
      const needsTimeline = perGameAndStreakObjs.some((o) => o.rule.source === 'timeline');

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

            const results = evaluateObjectives(perGameAndStreakObjs, doc, timeline, participantId, newIds[i], player);
            if (results.length > 0) await SoloObjectifResult.insertMany(results);

            // Évaluer les streaks après insertion du match
            if (streakObjs.length > 0) {
              const streakResults = await evaluateStreaks(streakObjs, player, newIds[i]);
              if (streakResults.length > 0) await SoloObjectifResult.insertMany(streakResults);
            }
          }
        } catch (err) {
          console.error(`  [soloq-cron] ${player.game_name} ${newIds[i]}: ${err.message}`);
        }

        if (i < newIds.length - 1) await sleep(DELAY_MS);
      }

      // Traiter les objectifs smurf de ce joueur
      const smurfObjectives = await SoloObjectif.find({
        player_id: player._id.toString(),
        'rule.metric': { $exists: true },
        'account.puuid': { $exists: true, $ne: null },
        active: { $ne: false },
      });

      // Grouper les objectifs smurf par puuid
      const smurfsByPuuid = {};
      for (const obj of smurfObjectives) {
        if (!smurfsByPuuid[obj.account.puuid]) {
          smurfsByPuuid[obj.account.puuid] = { account: obj.account, objectives: [] };
        }
        smurfsByPuuid[obj.account.puuid].objectives.push(obj);
      }

      for (const puuid of Object.keys(smurfsByPuuid)) {
        try {
          const { account, objectives: smurfObjs } = smurfsByPuuid[puuid];
          const smurfPlatform = account.region || platform;

          await sleep(DELAY_MS);
          const smurfMatchIds = await getMatchIdsByPuuid(puuid, { queue: QUEUE_ID, count: 3, platform: smurfPlatform });

          if (!smurfMatchIds || smurfMatchIds.length === 0) continue;

          // Checker via SoloqMatch (comme le main)
          const existingSmurf = await SoloqMatch.find({ matchId: { $in: smurfMatchIds }, puuid }, { matchId: 1 });
          const smurfExistingSet = new Set(existingSmurf.map((d) => d.matchId));
          const newSmurfIds = smurfMatchIds.filter((id) => !smurfExistingSet.has(id));

          if (newSmurfIds.length === 0) continue;

          const smurfPerGameAndStreakObjs = smurfObjs.filter((o) => o.type !== 'aggregate');
          const smurfStreakObjs = smurfObjs.filter((o) => o.type === 'streak');
          const smurfNeedsTimeline = smurfPerGameAndStreakObjs.some((o) => o.rule.source === 'timeline');

          for (let i = 0; i < newSmurfIds.length; i++) {
            try {
              await sleep(DELAY_MS);
              const matchData = await getMatchById(newSmurfIds[i], smurfPlatform);
              if (!matchData) continue;

              if (matchData.info.queueId !== QUEUE_ID) continue;

              const p = matchData.info.participants.find((x) => x.puuid === puuid);
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

              // Sauvegarder le match smurf dans SoloqMatch
              await SoloqMatch.updateOne({ matchId: doc.matchId, puuid: doc.puuid }, { $set: doc }, { upsert: true });

              let timeline = null;
              let participantId = null;

              if (smurfNeedsTimeline) {
                await sleep(DELAY_MS);
                timeline = await getTimelineById(newSmurfIds[i], smurfPlatform);
                if (timeline?.info?.participants) {
                  const tlP = timeline.info.participants.find((x) => x.puuid === puuid);
                  participantId = tlP?.participantId;
                }
              }

              const results = evaluateObjectives(smurfPerGameAndStreakObjs, doc, timeline, participantId, newSmurfIds[i], player);
              if (results.length > 0) await SoloObjectifResult.insertMany(results);

              // Évaluer les streaks smurf
              if (smurfStreakObjs.length > 0) {
                const streakResults = await evaluateStreaks(smurfStreakObjs, player, newSmurfIds[i], puuid);
                if (streakResults.length > 0) await SoloObjectifResult.insertMany(streakResults);
              }
            } catch (err) {
              console.error(`  [soloq-cron] ${player.game_name} smurf ${account.game_name} ${newSmurfIds[i]}: ${err.message}`);
            }
          }
        } catch (err) {
          console.error(`  [soloq-cron] ${player.game_name} smurf error: ${err.message}`);
        }
      }
    } catch (err) {
      console.error(`  [soloq-cron] Error for ${player.game_name}: ${err.message}`);
    }

    await sleep(DELAY_MS);
  }

  console.log(`  [soloq-cron] Done — ${totalSaved} new matches saved`);
}

module.exports = fetchSoloQ;
