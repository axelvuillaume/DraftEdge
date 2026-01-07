const mongoose = require('mongoose');

const MODELNAME = 'game';

const Schema = new mongoose.Schema(
  {
    name: { type: String },
    duration: { type: Number },
    side: { type: String, enum: ['blue', 'red'] },
    win: { type: Boolean },
    opponent_name: { type: String },
    date: { type: String },
    team_id: { type: String },
    team_name: { type: String },
    screenshot: { type: String },
    blue_team: { total_kills: { type: Number }, total_deaths: { type: Number }, total_assists: { type: Number }, total_gold: { type: Number } },
    red_team: { total_kills: { type: Number }, total_deaths: { type: Number }, total_assists: { type: Number }, total_gold: { type: Number } },
  },
  { timestamps: true }
);

Schema.index({ date: 1, duration: 1, team_id: 1, win: 1 }, { unique: true });

const OBJ = mongoose.model(MODELNAME, Schema);
module.exports = OBJ;
