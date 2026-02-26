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
    team_id: { type: String },
    team_name: { type: String },
    player_id: { type: String },
    player_name: { type: String },
  },
  { timestamps: true },
);

const OBJ = mongoose.model(MODELNAME, Schema);
module.exports = OBJ;
