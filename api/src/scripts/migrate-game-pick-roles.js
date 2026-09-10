/* One-off migration: convert games' string picks into { champ, role } objects,
   the role coming from the champion's player-stats row in that game.
   Run from api/: node src/scripts/migrate-game-pick-roles.js */
require('dotenv').config();
const mongoose = require('mongoose');
const { MONGODB_ENDPOINT } = require('../config');
const Game = require('../models/game');
const PlayerStats = require('../models/player-stats');

(async () => {
  await mongoose.connect(MONGODB_ENDPOINT);

  const games = await Game.find({ $or: [{ 'bluePicks.0': { $type: 'string' } }, { 'redPicks.0': { $type: 'string' } }] });
  console.log(`games with legacy string picks: ${games.length}`);

  const normalize = (name) => (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  for (const game of games) {
    const stats = await PlayerStats.find({ game_id: game._id.toString() });
    const roleByChamp = {};
    for (const s of stats) {
      if (s.champion && s.role) roleByChamp[normalize(s.champion)] = s.role;
    }
    const toPick = (p) => {
      if (!p) return null;
      if (typeof p !== 'string') return p;
      return { champ: p, role: roleByChamp[normalize(p)] || null };
    };
    await Game.findByIdAndUpdate(game._id, { bluePicks: (game.bluePicks || []).map(toPick), redPicks: (game.redPicks || []).map(toPick) });
    console.log(`migrated game ${game._id}`);
  }

  console.log('done');
  await mongoose.disconnect();
})();
