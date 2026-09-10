/* One-off migration: wrap each existing root draft-scenario (no draft_id) in a new draft document.
   Run from api/: node src/scripts/migrate-drafts.js [team_id] */
require('dotenv').config();
const mongoose = require('mongoose');
const { MONGODB_ENDPOINT } = require('../config');
const Draft = require('../models/draft');
const DraftScenario = require('../models/draft-scenario');

(async () => {
  await mongoose.connect(MONGODB_ENDPOINT);

  const team_id = process.argv[2];
  if (team_id) console.log(`migrating only team ${team_id}`);

  const roots = await DraftScenario.find({
    ...(team_id ? { team_id } : {}),
    $and: [{ $or: [{ draft_id: null }, { draft_id: { $exists: false } }] }, { $or: [{ parent_id: null }, { parent_id: { $exists: false } }] }],
  });
  console.log(`root scenarios without draft: ${roots.length}`);

  for (const root of roots) {
    const draft = await Draft.create({
      name: root.name || 'Untitled',
      team_id: root.team_id,
      team_name: root.team_name,
      opponent_id: root.opponent_id || null,
      opponent_name: root.opponent_name || null,
    });

    let ids = [root._id.toString()];
    while (ids.length) {
      await DraftScenario.updateMany({ _id: { $in: ids } }, { $set: { draft_id: draft._id.toString() } });
      const children = await DraftScenario.find({ parent_id: { $in: ids } });
      ids = children.map((c) => c._id.toString());
    }
    console.log(`migrated "${root.name}" -> draft ${draft._id}`);
  }

  const orphans = await DraftScenario.countDocuments({ $or: [{ draft_id: null }, { draft_id: { $exists: false } }] });
  console.log(`scenarios still without draft_id: ${orphans}`);
  await mongoose.disconnect();
})();
