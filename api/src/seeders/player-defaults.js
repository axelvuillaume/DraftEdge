const SoloObjectifObject = require('../models/solo-objectif');

// Player roles are lowercase ('top', 'jungle', ...) — solo-objectif roles are uppercase.
const ROLE_MAP = { top: 'TOP', jungle: 'JUNGLE', mid: 'MIDDLE', bottom: 'BOTTOM', support: 'UTILITY' };

// Default solo-objectifs created when a player is added. Edit/add per role freely.
// Each entry can specify type ('per_game' default | 'aggregate' | 'rank' | 'streak').
const DEFAULTS_BY_ROLE = {
  TOP: [
    { name: 'Default : CS at 10 >= 90', rule: { metric: 'challenges.laneMinionsFirst10Minutes', operator: '>=', value: 90, source: 'endgame' } },
    { name: 'Default : Solo kill', rule: { metric: 'challenges.soloKills', operator: '>=', value: 1, source: 'endgame' } },
    { name: 'Default : Kill participation 55%', rule: { metric: 'challenges.killParticipation', operator: '>=', value: 0.55, source: 'endgame' } },
    { name: 'Default : KDA >= 3', rule: { metric: 'challenges.kda', operator: '>=', value: 3, source: 'endgame' } },
    { name: 'Default : Less than 4 deaths at 10min', rule: { metric: 'deaths', operator: '<=', value: 3, timing: 10, source: 'timeline' } },
  ],
  JUNGLE: [
    { name: 'Default : Kill participation 65%', rule: { metric: 'challenges.killParticipation', operator: '>=', value: 0.65, source: 'endgame' } },
    { name: 'Default : Dragon takedowns >= 2', rule: { metric: 'challenges.dragonTakedowns', operator: '>=', value: 2, source: 'endgame' } },
    { name: 'Default : Vision score >= 25', rule: { metric: 'visionScore', operator: '>=', value: 25, source: 'endgame' } },
    { name: 'Default : Less than 5 deaths', rule: { metric: 'deaths', operator: '<=', value: 4, source: 'endgame' } },
    { name: 'Default : KDA >= 3', rule: { metric: 'challenges.kda', operator: '>=', value: 3, source: 'endgame' } },
    { name: 'Default : Less than 4 deaths at 10min', rule: { metric: 'deaths', operator: '<=', value: 3, timing: 10, source: 'timeline' } },
  ],
  MIDDLE: [
    { name: 'Default : Damage per minute >= 800', rule: { metric: 'challenges.damagePerMinute', operator: '>=', value: 800, source: 'endgame' } },
    { name: 'Default : CS at 10 >= 90', rule: { metric: 'challenges.laneMinionsFirst10Minutes', operator: '>=', value: 90, source: 'endgame' } },
    { name: 'Default : Kill participation 60%', rule: { metric: 'challenges.killParticipation', operator: '>=', value: 0.6, source: 'endgame' } },
    { name: 'Default : Solo kill', rule: { metric: 'challenges.soloKills', operator: '>=', value: 1, source: 'endgame' } },
    { name: 'Default : Less than 4 deaths at 10min', rule: { metric: 'deaths', operator: '<=', value: 3, timing: 10, source: 'timeline' } },
  ],
  BOTTOM: [
    { name: 'Default : CS at 10 >= 90', rule: { metric: 'challenges.laneMinionsFirst10Minutes', operator: '>=', value: 90, source: 'endgame' } },
    { name: 'Default : Damage per minute >= 800', rule: { metric: 'challenges.damagePerMinute', operator: '>=', value: 800, source: 'endgame' } },
    { name: 'Default : Less than 4 deaths at 10min', rule: { metric: 'deaths', operator: '<=', value: 3, timing: 10, source: 'timeline' } },
  ],
  UTILITY: [
    { name: 'Default : Control wards placed >= 10', rule: { metric: 'challenges.controlWardsPlaced', operator: '>=', value: 10, source: 'endgame' } },
    { name: 'Default : Kill participation 65%', rule: { metric: 'challenges.killParticipation', operator: '>=', value: 0.65, source: 'endgame' } },
    { name: 'Default : Vision score per minute >= 2,8', rule: { metric: 'challenges.visionScorePerMinute', operator: '>=', value: 2.8, source: 'endgame' } },
    { name: 'Default : Less than 4 deaths at 10min', rule: { metric: 'deaths', operator: '<=', value: 3, timing: 10, source: 'timeline' } },
  ],
};

// Common defaults applied to every player regardless of role.
const COMMON_DEFAULTS = [
  {
    type: 'aggregate',
    name: 'Default : 25 games per week',
    aggregate: { fn: 'count', period: 'weekly' },
    rule: { metric: 'games_played', operator: '>=', value: 25 },
  },
];

const buildObjective = (d, role, player) => ({
  name: d.name,
  type: d.type || 'per_game',
  active: true,
  rule: {
    metric: d.rule?.metric || null,
    operator: d.rule?.operator || null,
    value: d.rule?.value ?? null,
    timing: d.rule?.timing ?? null,
    source: d.rule?.source || 'endgame',
    target_tier: d.rule?.target_tier || null,
    target_division: d.rule?.target_division || null,
    target_lp: d.rule?.target_lp || 0,
  },
  aggregate: d.aggregate || { fn: null, period: null, minGames: null },
  streak_count: d.streak_count || null,
  role,
  team_id: player.team_id,
  team_name: player.team_name,
  player_id: player._id.toString(),
  player_name: player.game_name,
  // No `account`: these are main-account objectives. The cron treats any objectif
  // with `account.puuid` set as a smurf objectif and never evaluates it per-match.
});

const seedPlayerSoloObjectifs = (player) => {
  const role = ROLE_MAP[player.role];
  if (!role) return Promise.resolve([]);
  const defaults = [...(DEFAULTS_BY_ROLE[role] || []), ...COMMON_DEFAULTS];
  return SoloObjectifObject.create(defaults.map((d) => buildObjective(d, role, player)));
};

module.exports = { seedPlayerSoloObjectifs, DEFAULTS_BY_ROLE, COMMON_DEFAULTS, ROLE_MAP };
