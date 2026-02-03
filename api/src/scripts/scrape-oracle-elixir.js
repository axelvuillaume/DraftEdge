const mongoose = require('mongoose');
const https = require('https');
const { parse } = require('csv-parse');
const { MONGODB_ENDPOINT } = require('../config.js');
const ProMatch = require('../models/pro-game.js');

// Google Sheets ID for 2026 LoL esports data (exports as CSV)
const GOOGLE_SHEETS_ID = '1NPTrBsHpoPoqofVOIl8B6P5r-NlpGjSy1Ij5ysUyRR8';

// URL to download CSV from Google Sheets
const CSV_URL = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEETS_ID}/export?format=csv`;

// Configuration
const YEAR = 2026;
const BATCH_SIZE = 100;

async function connectDB() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_ENDPOINT);
  console.log('MongoDB Connected');
}

function downloadCSV(url) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading CSV from: ${url}`);

    const request = (urlToFetch) => {
      https
        .get(urlToFetch, (response) => {
          // Handle redirects
          if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307) {
            console.log(`Redirecting to: ${response.headers.location}`);
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
          response.on('end', () => {
            console.log(`Downloaded ${data.length} bytes`);
            resolve(data);
          });
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

    parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    })
      .on('data', (row) => {
        records.push(row);
      })
      .on('end', () => {
        resolve(records);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

function parseDuration(gamelength) {
  // gamelength is in seconds, convert to "MM:SS" format
  if (!gamelength || isNaN(gamelength)) return null;
  const totalSeconds = parseInt(gamelength, 10);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function parseDate(dateStr) {
  // Format: "2026-01-08 17:08:27"
  if (!dateStr) return null;
  return new Date(dateStr);
}

// Remove spaces from champion names: "Xin Zhao" => "XinZhao", "Lee Sin" => "LeeSin"
function normalizeChampionName(name) {
  if (!name) return name;
  return name.replace(/[\s']+/g, '');
}

// Build a map of champion -> role for each game/team from player rows
function buildChampionRoleMap(rows) {
  // Key: "gameid-teamname", Value: { championName: role }
  const map = {};
  for (const row of rows) {
    const participantId = parseInt(row.participantid, 10);
    // Player rows have participantid 1-10
    if (participantId >= 1 && participantId <= 10) {
      const key = `${row.gameid}-${row.teamname}`;
      if (!map[key]) {
        map[key] = {};
      }
      if (row.champion && row.position) {
        map[key][normalizeChampionName(row.champion)] = row.position;
      }
    }
  }
  return map;
}

function transformRowToMatch(row, championRoleMap) {
  // Only process team rows (participantid 100 = blue team, 200 = red team)
  const participantId = parseInt(row.participantid, 10);
  if (participantId !== 100 && participantId !== 200) {
    return null;
  }

  const side = participantId === 100 ? 'blue' : 'red';

  // Parse bans (ban1-ban5)
  const bans = [];
  for (let i = 1; i <= 5; i++) {
    if (row[`ban${i}`]) {
      bans.push(normalizeChampionName(row[`ban${i}`]));
    }
  }

  // Parse picks (pick1-pick5) in draft pick order with role
  const picks = [];
  const roleMap = championRoleMap[`${row.gameid}-${row.teamname}`] || {};
  for (let i = 1; i <= 5; i++) {
    if (row[`pick${i}`]) {
      const champion = normalizeChampionName(row[`pick${i}`]);
      picks.push({
        champion: champion,
        role: roleMap[champion] || '',
      });
    }
  }

  // Determine winner based on result (1 = win, 0 = loss)

  return {
    matchId: row.gameid,
    team_name: row.teamname,
    winner: parseInt(row.result, 10) === 1 ? true : false,
    side: side,
    patch: row.patch,
    dateTime: parseDate(row.date),
    league: row.league,
    year: parseInt(row.year, 10) || YEAR,
    split: row.split,
    gameNumber: parseInt(row.game, 10) || 1,
    duration: parseDuration(row.gamelength),
    bans: bans,
    picks: picks,
    kills: parseInt(row.teamkills, 10) || 0,
    gold: parseInt(row.totalgold, 10) || 0,
    towers: parseInt(row.towers, 10) || 0,
    dragons: parseInt(row.dragons, 10) || 0,
    barons: parseInt(row.barons, 10) || 0,
  };
}

async function scrapeAndImport() {
  try {
    await connectDB();

    // Download CSV from Google Sheets
    const csvData = await downloadCSV(CSV_URL);

    console.log('Parsing CSV data...');
    const rows = await parseCSV(csvData);
    console.log(`Total rows in CSV: ${rows.length}`);

    // Build champion -> role mapping from player rows
    const championRoleMap = buildChampionRoleMap(rows);
    console.log(`Champion-role mappings built for ${Object.keys(championRoleMap).length} game-team combinations`);

    // Filter and transform team rows
    const matches = [];
    const processedGameIds = new Set();

    for (const row of rows) {
      const match = transformRowToMatch(row, championRoleMap);
      if (match && match.matchId && match.team_name) {
        // Create a unique key for deduplication
        const key = `${match.matchId}-${match.team_name}`;
        if (!processedGameIds.has(key)) {
          processedGameIds.add(key);
          matches.push(match);
        }
      }
    }

    console.log(`Team rows to import: ${matches.length}`);

    if (matches.length === 0) {
      console.log('No matches to import. Check if CSV has correct format.');
      return;
    }

    // Show sample match
    console.log('\nSample match:', JSON.stringify(matches[0], null, 2));

    // Import in batches
    let imported = 0;
    let updated = 0;
    let errors = 0;

    for (let i = 0; i < matches.length; i += BATCH_SIZE) {
      const batch = matches.slice(i, i + BATCH_SIZE);

      const operations = batch.map((match) => ({
        updateOne: {
          filter: { matchId: match.matchId, team_name: match.team_name },
          update: { $set: match },
          upsert: true,
        },
      }));

      try {
        const result = await ProMatch.bulkWrite(operations);
        imported += result.upsertedCount;
        updated += result.modifiedCount;
        console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${result.upsertedCount} inserted, ${result.modifiedCount} updated`);
      } catch (error) {
        console.error(`Error in batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message);
        errors += batch.length;
      }
    }

    console.log('\n=== Import Summary ===');
    console.log(`Total matches processed: ${matches.length}`);
    console.log(`New matches inserted: ${imported}`);
    console.log(`Existing matches updated: ${updated}`);
    console.log(`Errors: ${errors}`);
  } catch (error) {
    console.error('Error during import:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
}

// Run the scraper
scrapeAndImport();
