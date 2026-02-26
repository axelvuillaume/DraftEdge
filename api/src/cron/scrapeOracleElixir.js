const https = require('https');
const { parse } = require('csv-parse');
const ProMatch = require('../models/pro-game');
const ProGamePlayerStats = require('../models/pro-game-playerstats');

const GOOGLE_DRIVE_FILE_ID = '1hnpbrUpBMS1TZI7IovfpKeZfWJH1Aptm';
const CSV_URL = `https://drive.google.com/uc?export=download&id=${GOOGLE_DRIVE_FILE_ID}`;
const YEAR = 2026;
const BATCH_SIZE = 100;

function downloadCSV(url) {
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
          let data = '';
          response.on('data', (chunk) => {
            data += chunk;
          });
          response.on('end', () => resolve(data));
          response.on('error', reject);
        })
        .on('error', reject);
    };
    request(url);
  });
}

function parseCSV(csvData) {
  return new Promise((resolve, reject) => {
    const records = [];
    parse(csvData, { columns: true, skip_empty_lines: true, trim: true, relax_column_count: true })
      .on('data', (row) => records.push(row))
      .on('end', () => resolve(records))
      .on('error', reject);
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

function buildChampionRoleMap(rows) {
  const map = {};
  for (const row of rows) {
    const participantId = parseInt(row.participantid, 10);
    if (participantId >= 1 && participantId <= 10) {
      const key = `${row.gameid}-${row.teamname}`;
      if (!map[key]) map[key] = {};
      if (row.champion && row.position) {
        map[key][normalizeChampionName(row.champion)] = row.position;
      }
    }
  }
  return map;
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

async function scrapeOracleElixir() {
  const csvData = await downloadCSV(CSV_URL);
  const rows = await parseCSV(csvData);
  console.log(`[OracleElixir] Total rows in CSV: ${rows.length}`);

  const championRoleMap = buildChampionRoleMap(rows);

  const matches = [];
  const processedGameIds = new Set();

  for (const row of rows) {
    const match = transformRowToMatch(row, championRoleMap);
    if (match && match.matchId && match.team_name) {
      const key = `${match.matchId}-${match.team_name}`;
      if (!processedGameIds.has(key)) {
        processedGameIds.add(key);
        matches.push(match);
      }
    }
  }

  console.log(`[OracleElixir] Team rows to import: ${matches.length}`);

  // Process player stats (participantid 1-10)
  const playerStats = [];
  for (const row of rows) {
    const stat = transformRowToPlayerStats(row);
    if (stat && stat.gameid && stat.playername) {
      playerStats.push(stat);
    }
  }

  console.log(`[OracleElixir] Player stats to import: ${playerStats.length}`);

  // Import team matches
  let imported = 0;
  let updated = 0;

  if (matches.length > 0) {
    for (let i = 0; i < matches.length; i += BATCH_SIZE) {
      const batch = matches.slice(i, i + BATCH_SIZE);
      const operations = batch.map((match) => ({
        updateOne: {
          filter: { matchId: match.matchId, team_name: match.team_name },
          update: { $set: match },
          upsert: true,
        },
      }));

      const result = await ProMatch.bulkWrite(operations);
      imported += result.upsertedCount;
      updated += result.modifiedCount;
    }
  }

  console.log(`[OracleElixir] Matches: ${imported} inserted, ${updated} updated`);

  // Import player stats
  let psImported = 0;
  let psUpdated = 0;

  if (playerStats.length > 0) {
    for (let i = 0; i < playerStats.length; i += BATCH_SIZE) {
      const batch = playerStats.slice(i, i + BATCH_SIZE);
      const operations = batch.map((stat) => ({
        updateOne: {
          filter: { gameid: stat.gameid, participantid: stat.participantid },
          update: { $set: stat },
          upsert: true,
        },
      }));

      const result = await ProGamePlayerStats.bulkWrite(operations);
      psImported += result.upsertedCount;
      psUpdated += result.modifiedCount;
    }
  }

  console.log(`[OracleElixir] Player stats: ${psImported} inserted, ${psUpdated} updated`);
}

module.exports = scrapeOracleElixir;
