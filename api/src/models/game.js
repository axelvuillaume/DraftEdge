const mongoose = require('mongoose');

const MODELNAME = 'game';

const Schema = new mongoose.Schema(
  {
    name: { type: String },
    game_id: { type: String },
    duration: { type: Number },
    patch: { type: String },
    date: { type: Date },
    screenshot: { type: String },

    // Contexte équipe (ton équipe)
    team_id: { type: String },
    team_name: { type: String },
    team_side: { type: String, enum: ['blue', 'red'] },
    win: { type: Boolean },
    opponent_name: { type: String },

    // Stats équipes
    blue_team: {
      win: { type: Boolean },
      kills: { type: Number, default: 0 },
      deaths: { type: Number, default: 0 },
      assists: { type: Number, default: 0 },
      gold: { type: Number, default: 0 },
      dragons: { type: Number, default: 0 },
      barons: { type: Number, default: 0 },
      heralds: { type: Number, default: 0 },
      grubs: { type: Number, default: 0 },
      towers: { type: Number, default: 0 },
      inhibitors: { type: Number, default: 0 },
    },
    red_team: {
      win: { type: Boolean },
      kills: { type: Number, default: 0 },
      deaths: { type: Number, default: 0 },
      assists: { type: Number, default: 0 },
      gold: { type: Number, default: 0 },
      dragons: { type: Number, default: 0 },
      barons: { type: Number, default: 0 },
      heralds: { type: Number, default: 0 },
      grubs: { type: Number, default: 0 },
      towers: { type: Number, default: 0 },
      inhibitors: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

Schema.index({ date: 1, duration: 1, team_id: 1, win: 1 }, { unique: true });

const OBJ = mongoose.model(MODELNAME, Schema);
module.exports = OBJ;
