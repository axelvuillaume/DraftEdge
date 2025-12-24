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
