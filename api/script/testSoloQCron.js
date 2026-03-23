/**
 * Re-evaluate solo objectives on the last 10 existing matches for a specific player.
 * Only fetches timelines from Riot (no match list / match detail calls).
 */
const mongoose = require('mongoose');
const { MONGODB_ENDPOINT } = require('../src/config');
const Player = require('../src/models/player');
const SoloObjectif = require('../src/models/solo-objectif');
const SoloObjectifResult = require('../src/models/solo-objectif-result');
const SoloqMatch = require('../src/models/soloq-match');
const { getTimelineById } = require('../src/services/riotgames');

const PLAYER_ID = '69bf01ea20c06004d293a22e';
const QUEUE_ID = 420;
const DELAY_MS = 1300;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const EVENT_METRICS = new Set(['kills', 'deaths', 'assists']);
const BOOLEAN_METRICS = new Set(['win', 'firstBloodKill', 'firstBloodAssist', 'firstTowerKill', 'firstTowerAssist', 'gameEndedInSurrender', 'gameEndedInEarlySurrender']);
const COMPUTED_METRICS = {
  cs_per_min: (doc) => (doc.totalMinionsKilled + doc.neutralMinionsKilled) / (doc.gameDuration / 60),
  kda: (doc) => (doc.kills + doc.assists) / Math.max(1, doc.deaths),
};

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
  if (COMPUTED_METRICS[metric]) return COMPUTED_METRICS[metric](doc);
  let val = metric.split('.').reduce((o, key) => o?.[key], doc);
  if (typeof val === 'boolean' || BOOLEAN_METRICS.has(metric.split('.')[0])) val = val ? 1 : 0;
  return val;
}

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

async function run() {
  await mongoose.connect(MONGODB_ENDPOINT);
  console.log('Connected to DB');

  const player = await Player.findById(PLAYER_ID);
  if (!player) { console.log('Player not found!'); return process.exit(1); }
  console.log(`Player: ${player.game_name} | puuid: ${player.puuid}`);

  // Fetch objectives
  const objectives = await SoloObjectif.find({
    player_id: PLAYER_ID,
    'rule.metric': { $exists: true },
    active: { $ne: false },
    type: { $ne: 'aggregate' },
  });
  console.log(`\n${objectives.length} objectives:`);
  for (const obj of objectives) {
    console.log(`  - ${obj.name} (${obj.type}) metric=${obj.rule.metric} op=${obj.rule.operator} val=${obj.rule.value} source=${obj.rule.source} timing=${obj.rule.timing} role=${obj.role}`);
  }

  if (objectives.length === 0) {
    console.log('No objectives, nothing to do.');
    await mongoose.disconnect();
    return;
  }

  // Last 10 matches in DB (by puuid, not player_id — matches may be stored under a different player_id)
  const matches = await SoloqMatch.find({ puuid: player.puuid, queueId: QUEUE_ID }).sort({ gameDate: -1 }).limit(10);
  console.log(`\n${matches.length} matches in DB (last 10)`);

  if (matches.length === 0) {
    console.log('No matches in DB.');
    await mongoose.disconnect();
    return;
  }

  const needsTimeline = objectives.some((o) => o.rule.source === 'timeline');
  let totalResults = 0;

  for (const match of matches) {
    console.log(`\n--- ${match.matchId} | ${match.championName} ${match.teamPosition} | ${match.win ? 'WIN' : 'LOSS'} ---`);

    // Remove existing results for this match+player to avoid duplicates
    const deleted = await SoloObjectifResult.deleteMany({ matchId: match.matchId, player_id: PLAYER_ID });
    if (deleted.deletedCount > 0) console.log(`  Cleaned ${deleted.deletedCount} old results`);

    let timeline = null;
    let participantId = null;

    if (needsTimeline) {
      const platform = match.platformId?.toLowerCase()?.replace('_', '') || 'euw1';
      console.log(`  Fetching timeline (${platform})...`);
      await sleep(DELAY_MS);
      timeline = await getTimelineById(match.matchId, platform);
      if (timeline?.info?.participants) {
        const tlP = timeline.info.participants.find((x) => x.puuid === match.puuid);
        participantId = tlP?.participantId;
        console.log(`  participantId: ${participantId}`);
      }
      if (!timeline) console.log('  Timeline not available');
    }

    const results = [];

    for (const obj of objectives) {
      if (obj.champions?.length > 0 && !obj.champions.includes(match.championName)) {
        console.log(`  [SKIP champion] ${obj.name} (${obj.champions} vs ${match.championName})`);
        continue;
      }
      if (obj.role && obj.role !== match.teamPosition) {
        console.log(`  [SKIP role] ${obj.name} (${obj.role} vs ${match.teamPosition})`);
        continue;
      }
      if (obj.side && obj.side !== match.side) {
        console.log(`  [SKIP side] ${obj.name}`);
        continue;
      }

      const { metric, operator, value, timing, source } = obj.rule;
      let actual_value = undefined;

      if (source === 'endgame') {
        actual_value = resolveMetric(match, metric);
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

      if (actual_value === undefined) {
        console.log(`  [NO VALUE] ${obj.name}`);
        continue;
      }

      const success = evaluate(operator, actual_value, value);
      console.log(`  ${success ? 'OK' : 'FAIL'} ${obj.name}: ${actual_value} ${operator} ${value}`);

      results.push({
        solo_objectif_id: obj._id.toString(),
        solo_objectif_name: obj.name,
        matchId: match.matchId,
        actual_value: Math.round(actual_value * 100) / 100,
        success,
        game_date: match.gameDate,
        champion: match.championName,
        player_id: PLAYER_ID,
        player_name: match.player_name,
        team_id: match.team_id,
        team_name: match.team_name,
      });
    }

    if (results.length > 0) {
      await SoloObjectifResult.insertMany(results);
      totalResults += results.length;
    }
  }

  console.log(`\n=== Done! Created ${totalResults} results ===`);
  await mongoose.disconnect();
}

run().catch((err) => { console.error(err); process.exit(1); });
