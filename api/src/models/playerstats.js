const mongoose = require('mongoose');

const MODELNAME = 'playerstats';

const Schema = new mongoose.Schema(
  {
    summoner_name: { type: String, trim: true },
    team_id: { type: String, trim: true },
    team_name: { type: String, trim: true },
    opponent: { type: Boolean },
    game_id: { type: String, trim: true },
    game_name: { type: String, trim: true },
    game_win: { type: Boolean },
    game_duration: { type: Number },

    // Basic stats
    kills: { type: Number },
    deaths: { type: Number },
    role: { type: String, enum: ['top', 'jungle', 'mid', 'bottom', 'support'] },
    assists: { type: Number },
    creep: { type: Number },
    gold: { type: Number },
    level: { type: Number },
    champion: { type: String },

    // Combat stats
    combat: {
      largestKillingSpree: { type: Number },
      largestMultiKill: { type: Number },
      crowdControlScore: { type: Number },
      firstBlood: { type: Boolean },
    },

    // Damage dealt stats
    damageDealt: {
      totalDamageToChampions: { type: Number },
      physicalDamageToChampions: { type: Number },
      magicDamageToChampions: { type: Number },
      trueDamageToChampions: { type: Number },
      totalDamageDealt: { type: Number },
      physicalDamageDealt: { type: Number },
      magicDamageDealt: { type: Number },
      trueDamageDealt: { type: Number },
      largestCriticalStrike: { type: Number },
      totalDamageToTowers: { type: Number },
      totalDamageToObjectives: { type: Number },
    },

    // Damage taken stats
    damageTaken: {
      damageHealed: { type: Number },
      totalDamageTaken: { type: Number },
      physicalDamageTaken: { type: Number },
      magicDamageTaken: { type: Number },
      trueDamageTaken: { type: Number },
      totalDamageSelfMitigated: { type: Number },
    },

    // Vision stats
    vision: {
      visionScore: { type: Number },
      wardsPlaced: { type: Number },
      wardsDestroyed: { type: Number },
      controlWardsPurchased: { type: Number },
    },

    // Income stats
    income: {
      goldEarned: { type: Number },
      goldSpent: { type: Number },
      totalMinionsKilled: { type: Number },
      neutralMinionsKilled: { type: Number },
      neutralMinionsKilledInTeamJungle: { type: Number },
      neutralMinionsKilledInEnemyJungle: { type: Number },
    },

    // Miscellaneous stats
    misc: {
      towersDestroyed: { type: Number },
      inhibitorsDestroyed: { type: Number },
    },
  },
  { timestamps: true }
);

const OBJ = mongoose.model(MODELNAME, Schema);
module.exports = OBJ;
