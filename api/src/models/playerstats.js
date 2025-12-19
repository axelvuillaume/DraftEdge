const mongoose = require('mongoose');

const MODELNAME = 'playerstats';

const Schema = new mongoose.Schema(
  {
    summoner_name: { type: String },
    team_id: { type: String },
    team_name: { type: String },
    opponent: { type: Boolean },
    game_id: { type: String },
    game_name: { type: String },
    kills: { type: Number },
    deaths: { type: Number },
    role: { type: String, enum: ['top', 'jungle', 'mid', 'bottom', 'support'] },
    assists: { type: Number },
    creep: { type: Number },
    gold: { type: Number },
    level: { type: Number },
    champion: { type: String },
  },
  { timestamps: true }
);

const OBJ = mongoose.model(MODELNAME, Schema);
module.exports = OBJ;
