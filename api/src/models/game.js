const mongoose = require('mongoose');

const MODELNAME = 'game';

const Schema = new mongoose.Schema(
  {
    name: { type: String },
    duration: { type: String },
    side: { type: String, enum: ['blue', 'red'] },
    win: { type: Boolean },
    opponent_name: { type: String },
    date: { type: String },
    team_id: { type: String },
    team_name: { type: String },
    blue_team: { total_kills: { type: Number }, total_deaths: { type: Number }, total_assists: { type: Number } },
    red_team: { total_kills: { type: Number }, total_deaths: { type: Number }, total_assists: { type: Number } },
  },
  { timestamps: true }
);

const OBJ = mongoose.model(MODELNAME, Schema);
module.exports = OBJ;
