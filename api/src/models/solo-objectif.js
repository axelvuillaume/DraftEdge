const mongoose = require('mongoose');

const MODELNAME = 'solo-objectif';

const Schema = new mongoose.Schema(
  {
    name: { type: String },
    request: { type: String },
    type: { type: String, enum: ['per_game', 'aggregate', 'streak'], default: 'per_game' },
    active: { type: Boolean, default: true },
    rule: {
      metric: { type: String },
      operator: { type: String, enum: ['>', '>=', '<', '<=', '=='] },
      value: { type: Number },
      timing: { type: Number, default: null },
      source: { type: String, enum: ['timeline', 'endgame'], default: 'endgame' },
    },
    aggregate: {
      fn: { type: String, enum: ['count', 'sum', 'avg', null], default: null },
      period: { type: String, enum: ['daily', 'weekly', null], default: null },
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
