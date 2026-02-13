const Game = require('../models/game');

/**
 * Builds filter queries based on Game-level filters (patch, folder, opponent).
 * Returns objects to spread into PlayerStats.find() and Game.find() calls.
 *
 * @param {Object} params
 * @param {string} params.team_id
 * @param {string} [params.patch]
 * @param {string} [params.folder_id]
 * @param {string} [params.opponent_name]
 * @returns {Promise<{ gameIdFilter: Object, gameQuery: Object }>}
 */
async function buildGameFilters({ team_id, patch, folder_id, opponent_name }) {
  if (!patch && !folder_id && !opponent_name) return { gameIdFilter: {}, gameQuery: {} };

  const gameQuery = {};
  if (patch) gameQuery.patch = { $regex: `^${patch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}` };
  if (folder_id === 'none') gameQuery.folder_id = { $in: [null, undefined] };
  else if (folder_id) gameQuery.folder_id = folder_id;
  if (opponent_name) gameQuery.opponent_name = opponent_name;

  const games = await Game.find({ team_id, ...gameQuery }, { _id: 1 }).lean();
  const gameIds = games.map((g) => g._id.toString());

  return { gameIdFilter: { game_id: { $in: gameIds } }, gameQuery };
}

function extractFilters(body) {
  return { patch: body.patch || null, folder_id: body.folder_id || null, opponent_name: body.opponent_name || null };
}

module.exports = { buildGameFilters, extractFilters };
