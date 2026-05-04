const SoloObjectifObject = require('../models/solo-objectif');

// Player roles are lowercase ('top', 'jungle', ...) — solo-objectif roles are uppercase.
const ROLE_MAP = { top: 'TOP', jungle: 'JUNGLE', mid: 'MIDDLE', bottom: 'BOTTOM', support: 'UTILITY' };

// Default solo-objectifs created when a player is added. Edit/add per role freely.
const DEFAULTS_BY_ROLE = {
  TOP: [
    { name: 'CS at 10 >= 90', rule: { metric: 'challenges.laneMinionsFirst10Minutes', operator: '>=', value: 90, source: 'endgame' } },
    { name: 'Solo kill', rule: { metric: 'challenges.soloKills', operator: '>=', value: 1, source: 'endgame' } },
    { name: 'Kill participation 55%', rule: { metric: 'challenges.killParticipation', operator: '>=', value: 0.55, source: 'endgame' } },
    { name: 'KDA >= 3', rule: { metric: 'challenges.kda', operator: '>=', value: 3, source: 'endgame' } },
    { name: 'Less than 4 deaths at 10min', rule: { metric: 'deaths', operator: '<=', value: 3, timing: 10, source: 'timeline' } },
  ],
  JUNGLE: [
    { name: 'Kill participation 65%', rule: { metric: 'challenges.killParticipation', operator: '>=', value: 0.65, source: 'endgame' } },
    { name: 'Dragon takedowns >= 2', rule: { metric: 'challenges.dragonTakedowns', operator: '>=', value: 2, source: 'endgame' } },
    { name: 'Vision score >= 25', rule: { metric: 'visionScore', operator: '>=', value: 25, source: 'endgame' } },
    { name: 'Less than 5 deaths', rule: { metric: 'deaths', operator: '<=', value: 4, source: 'endgame' } },
    { name: 'KDA >= 3', rule: { metric: 'challenges.kda', operator: '>=', value: 3, source: 'endgame' } },
    { name: 'Less than 4 deaths at 10min', rule: { metric: 'deaths', operator: '<=', value: 3, timing: 10, source: 'timeline' } },
  ],
  MIDDLE: [
    { name: 'Damage per minute >= 800', rule: { metric: 'challenges.damagePerMinute', operator: '>=', value: 800, source: 'endgame' } },
    { name: 'CS at 10 >= 90', rule: { metric: 'challenges.laneMinionsFirst10Minutes', operator: '>=', value: 90, source: 'endgame' } },
    { name: 'Kill participation 60%', rule: { metric: 'challenges.killParticipation', operator: '>=', value: 0.6, source: 'endgame' } },
    { name: 'Solo kill', rule: { metric: 'challenges.soloKills', operator: '>=', value: 1, source: 'endgame' } },
    { name: 'Less than 4 deaths at 10min', rule: { metric: 'deaths', operator: '<=', value: 3, timing: 10, source: 'timeline' } },
  ],
  BOTTOM: [
    { name: 'CS at 10 >= 90', rule: { metric: 'challenges.laneMinionsFirst10Minutes', operator: '>=', value: 90, source: 'endgame' } },
    { name: 'Damage per minute >= 800', rule: { metric: 'challenges.damagePerMinute', operator: '>=', value: 800, source: 'endgame' } },
    { name: 'Less than 4 deaths at 10min', rule: { metric: 'deaths', operator: '<=', value: 3, timing: 10, source: 'timeline' } },
  ],
  UTILITY: [
    { name: 'Control wards placed >= 10', rule: { metric: 'challenges.controlWardsPlaced', operator: '>=', value: 10, source: 'endgame' } },
    { name: 'Kill participation 65%', rule: { metric: 'challenges.killParticipation', operator: '>=', value: 0.65, source: 'endgame' } },
    { name: 'Vision score per minute >= 2,8', rule: { metric: 'challenges.visionScorePerMinute', operator: '>=', value: 2.8, source: 'endgame' } },
    { name: 'Less than 4 deaths at 10min', rule: { metric: 'deaths', operator: '<=', value: 3, timing: 10, source: 'timeline' } },
  ],
};

const seedPlayerSoloObjectifs = (player) => {
  const role = ROLE_MAP[player.role];
  if (!role) return Promise.resolve([]);
  const defaults = DEFAULTS_BY_ROLE[role] || [];
  return SoloObjectifObject.create(
    defaults.map((d) => ({
      name: d.name,
      type: 'per_game',
      active: true,
      rule: { ...d.rule, target_tier: null, target_division: null, target_lp: 0 },
      role,
      team_id: player.team_id,
      team_name: player.team_name,
      player_id: player._id.toString(),
      player_name: player.game_name,
      account: { puuid: player.puuid, game_name: player.game_name, tag_line: player.tag_line, region: player.region },
    })),
  );
};

module.exports = { seedPlayerSoloObjectifs, DEFAULTS_BY_ROLE, ROLE_MAP };
