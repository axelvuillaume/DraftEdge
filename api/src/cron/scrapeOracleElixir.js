const https = require('https');
const { parse } = require('csv-parse');
const ProMatch = require('../models/pro-game');
const ProGamePlayerStats = require('../models/pro-game-player-stats');

const GOOGLE_DRIVE_FILE_ID = '1hnpbrUpBMS1TZI7IovfpKeZfWJH1Aptm';
const CSV_URL = `https://drive.google.com/uc?export=download&id=${GOOGLE_DRIVE_FILE_ID}`;
const YEAR = 2026;
const BATCH_SIZE = 100;

function downloadCSVStream(url) {
  return new Promise((resolve, reject) => {
    const request = (urlToFetch) => {
      https
        .get(urlToFetch, (response) => {
          if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
            request(response.headers.location);
            return;
          }
          if (response.statusCode !== 200) {
            reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
            return;
          }
          resolve(response);
        })
        .on('error', reject);
    };
    request(url);
  });
}

function parseDuration(gamelength) {
  if (!gamelength || isNaN(gamelength)) return null;
  const totalSeconds = parseInt(gamelength, 10);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function normalizeChampionName(name) {
  if (!name) return name;
  return name.replace(/[\s']+/g, '');
}

// CSV columns with spaces/special chars → model field names
const CSV_FIELD_RENAMES = {
  'team kpm': 'team_kpm',
  'dragons (type unknown)': 'dragons_type_unknown',
  'earned gpm': 'earned_gpm',
  'total cs': 'total_cs',
};

function transformRowToPlayerStats(row) {
  const participantId = parseInt(row.participantid, 10);
  if (participantId < 1 || participantId > 10) return null;

  const stat = { pro_game_id: row.gameid };

  for (const [csvKey, value] of Object.entries(row)) {
    if (value === '' || value === undefined || value === null) continue;
    const fieldName = CSV_FIELD_RENAMES[csvKey] || csvKey;
    stat[fieldName] = value;
  }

  return stat;
}

function transformRowToMatch(row, championRoleMap) {
  const participantId = parseInt(row.participantid, 10);
  if (participantId !== 100 && participantId !== 200) return null;

  const side = participantId === 100 ? 'blue' : 'red';

  const bans = [];
  for (let i = 1; i <= 5; i++) {
    if (row[`ban${i}`]) bans.push(normalizeChampionName(row[`ban${i}`]));
  }

  const picks = [];
  const roleMap = championRoleMap[`${row.gameid}-${row.teamname}`] || {};
  for (let i = 1; i <= 5; i++) {
    if (row[`pick${i}`]) {
      const champion = normalizeChampionName(row[`pick${i}`]);
      picks.push({ champion, role: roleMap[champion] || '' });
    }
  }

  return {
    matchId: row.gameid,
    team_name: row.teamname,
    winner: parseInt(row.result, 10) === 1,
    side,
    patch: row.patch,
    dateTime: row.date ? new Date(row.date) : null,
    league: row.league,
    year: parseInt(row.year, 10) || YEAR,
    split: row.split,
    gameNumber: parseInt(row.game, 10) || 1,
    duration: parseDuration(row.gamelength),
    bans,
    picks,
    kills: parseInt(row.teamkills, 10) || 0,
    gold: parseInt(row.totalgold, 10) || 0,
    towers: parseInt(row.towers, 10) || 0,
    dragons: parseInt(row.dragons, 10) || 0,
    barons: parseInt(row.barons, 10) || 0,
  };
}

async function flushBatch(model, operations) {
  if (operations.length === 0) return { upsertedCount: 0, modifiedCount: 0 };
  return model.bulkWrite(operations);
}

async function scrapeOracleElixir() {
  const response = await downloadCSVStream(CSV_URL);

  // Single-pass streaming: build championRoleMap + flush playerStats in batches + collect matchRows
  const championRoleMap = {};
  const matchRows = [];
  let playerStatsBatch = [];
  let totalRows = 0;
  let psImported = 0;
  let psUpdated = 0;

  await new Promise((resolve, reject) => {
    const parser = parse({ columns: true, skip_empty_lines: true, trim: true, relax_column_count: true });

    parser.on('data', async (row) => {
      totalRows++;
      const participantId = parseInt(row.participantid, 10);

      // Player rows (1-10): build role map + batch insert stats
      if (participantId >= 1 && participantId <= 10) {
        // Build championRoleMap inline
        if (row.champion && row.position) {
          const key = `${row.gameid}-${row.teamname}`;
          if (!championRoleMap[key]) championRoleMap[key] = {};
          championRoleMap[key][normalizeChampionName(row.champion)] = row.position;
        }

        // Accumulate player stat
        const stat = transformRowToPlayerStats(row);
        if (stat && stat.gameid && stat.playername) {
          playerStatsBatch.push({
            updateOne: {
              filter: { gameid: stat.gameid, participantid: stat.participantid },
              update: { $set: stat },
              upsert: true,
            },
          });

          // Flush when batch is full
          if (playerStatsBatch.length >= BATCH_SIZE) {
            parser.pause();
            const batch = playerStatsBatch;
            playerStatsBatch = [];
            try {
              const result = await flushBatch(ProGamePlayerStats, batch);
              psImported += result.upsertedCount;
              psUpdated += result.modifiedCount;
            } catch (err) {
              console.error('[OracleElixir] Error flushing player stats batch:', err.message);
            }
            parser.resume();
          }
        }
      }

      // Team rows (100/200): store raw row for later (small — 2 per game)
      if (participantId === 100 || participantId === 200) {
        matchRows.push(row);
      }
    });

    parser.on('end', resolve);
    parser.on('error', reject);

    response.pipe(parser);
  });

  // Flush remaining player stats
  if (playerStatsBatch.length > 0) {
    const result = await flushBatch(ProGamePlayerStats, playerStatsBatch);
    psImported += result.upsertedCount;
    psUpdated += result.modifiedCount;
    playerStatsBatch = [];
  }

  console.log(`[OracleElixir] Total rows streamed: ${totalRows}`);
  console.log(`[OracleElixir] Player stats: ${psImported} inserted, ${psUpdated} updated`);

  // Transform and import matches using the complete championRoleMap
  const processedGameIds = new Set();
  let imported = 0;
  let updated = 0;
  let matchBatch = [];

  for (const row of matchRows) {
    const match = transformRowToMatch(row, championRoleMap);
    if (match && match.matchId && match.team_name) {
      const key = `${match.matchId}-${match.team_name}`;
      if (!processedGameIds.has(key)) {
        processedGameIds.add(key);
        matchBatch.push({
          updateOne: {
            filter: { matchId: match.matchId, team_name: match.team_name },
            update: { $set: match },
            upsert: true,
          },
        });

        if (matchBatch.length >= BATCH_SIZE) {
          const result = await flushBatch(ProMatch, matchBatch);
          imported += result.upsertedCount;
          updated += result.modifiedCount;
          matchBatch = [];
        }
      }
    }
  }

  // Flush remaining matches
  if (matchBatch.length > 0) {
    const result = await flushBatch(ProMatch, matchBatch);
    imported += result.upsertedCount;
    updated += result.modifiedCount;
  }

  console.log(`[OracleElixir] Matches: ${imported} inserted, ${updated} updated`);
}

module.exports = scrapeOracleElixir;
