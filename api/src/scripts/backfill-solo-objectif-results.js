/* One-off backfill: copy opponent_champion and win from the soloq match onto
   existing solo-objectif-results that were created before these fields existed.
   Run: node api/src/scripts/backfill-solo-objectif-results.js (from anywhere) */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const { MONGODB_ENDPOINT } = require('../config');
const SoloObjectifResult = require('../models/solo-objectif-result');
const SoloqMatch = require('../models/soloq-match');

(async () => {
  await mongoose.connect(MONGODB_ENDPOINT);

  const results = await SoloObjectifResult.find({ matchId: { $ne: null }, $or: [{ win: null }, { win: { $exists: false } }] }, { matchId: 1, player_id: 1 }).lean();
  console.log(`results to backfill: ${results.length}`);

  const matchIds = [...new Set(results.map((r) => r.matchId))];
  const matches = await SoloqMatch.find({ matchId: { $in: matchIds } }, { matchId: 1, player_id: 1, opponentChampion: 1, win: 1 }).lean();
  const byKey = {};
  for (const m of matches) byKey[`${m.matchId}|${m.player_id}`] = m;
  console.log(`matches loaded: ${matches.length}`);

  const ops = [];
  let missing = 0;
  for (const r of results) {
    const m = byKey[`${r.matchId}|${r.player_id}`];
    if (!m) {
      missing++;
      continue;
    }
    ops.push({ updateOne: { filter: { _id: r._id }, update: { $set: { opponent_champion: m.opponentChampion || null, win: m.win ?? null } } } });
  }

  let updated = 0;
  for (let i = 0; i < ops.length; i += 1000) {
    const res = await SoloObjectifResult.bulkWrite(ops.slice(i, i + 1000), { ordered: false });
    updated += res.modifiedCount;
    console.log(`  ${Math.min(i + 1000, ops.length)}/${ops.length}`);
  }

  console.log(`updated: ${updated}, no match found: ${missing}`);
  await mongoose.disconnect();
})();
