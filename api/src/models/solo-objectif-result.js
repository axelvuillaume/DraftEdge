const mongoose = require('mongoose');

const MODELNAME = 'solo-objectif-result';

const Schema = new mongoose.Schema(
  {
    solo_objectif_id: { type: String },
    solo_objectif_name: { type: String },
    matchId: { type: String },
    actual_value: { type: Number },
    success: { type: Boolean, default: false },
    game_date: { type: Date },
    champion: { type: String },
    opponent_champion: { type: String, default: null },
    win: { type: Boolean, default: null },
    team_id: { type: String },
    team_name: { type: String },
    player_id: { type: String },
    player_name: { type: String },
    tier: { type: String, default: null },
    rank: { type: String, default: null },
    lp: { type: Number, default: null },
  },
  { timestamps: true },
);

const OBJ = mongoose.model(MODELNAME, Schema);
module.exports = OBJ;
