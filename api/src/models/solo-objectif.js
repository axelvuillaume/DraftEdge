const mongoose = require('mongoose');

const MODELNAME = 'solo-objectif';

const Schema = new mongoose.Schema(
  {
    name: { type: String },
    request: { type: String },
    rule: {
      metric: { type: String },
      operator: { type: String, enum: ['>', '>=', '<', '<=', '=='] },
      value: { type: Number },
      timing: { type: Number, default: null },
      source: { type: String, enum: ['timeline', 'endgame'], default: 'endgame' },
    },
    champions: [{ type: String }],
    role: { type: String, enum: ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY', null], default: null },
    team_id: { type: String },
    team_name: { type: String },
    player_id: { type: String },
    player_name: { type: String },
  },
  { timestamps: true },
);

const OBJ = mongoose.model(MODELNAME, Schema);
module.exports = OBJ;
