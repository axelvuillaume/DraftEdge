const mongoose = require('mongoose');

const MODELNAME = 'solo-objectif';

const Schema = new mongoose.Schema(
  {
    name: { type: String },
    request: { type: String },
    type: { type: String, enum: ['per_game', 'aggregate', 'streak', 'rank'], default: 'per_game' },
    active: { type: Boolean, default: true },
    rule: {
      metric: { type: String },
      operator: { type: String, enum: ['>', '>=', '<', '<=', '=='] },
      value: { type: Number },
      timing: { type: Number, default: null },
      source: { type: String, enum: ['timeline', 'endgame'], default: 'endgame' },
      target_tier: { type: String, enum: ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER', null], default: null },
      target_division: { type: String, enum: ['I', 'II', 'III', 'IV', null], default: null },
      target_lp: { type: Number, default: 0 },
    },
    completed: { type: Boolean, default: false },
    completed_at: { type: Date, default: null },
    aggregate: {
      fn: { type: String, enum: ['count', 'sum', 'avg', null], default: null },
      period: { type: String, enum: ['daily', 'weekly', 'total', null], default: null },
      minGames: { type: Number, default: null },
    },
    streak_count: { type: Number, default: null },
    champions: [{ type: String }],
    role: { type: String, enum: ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY', null], default: null },
    side: { type: String, enum: ['blue', 'red', null], default: null },
    team_id: { type: String },
    team_name: { type: String },
    player_id: { type: String },
    player_name: { type: String },
    account: {
      puuid: { type: String },
      game_name: { type: String },
      tag_line: { type: String },
      region: { type: String },
    },
  },
  { timestamps: true },
);

const OBJ = mongoose.model(MODELNAME, Schema);
module.exports = OBJ;
