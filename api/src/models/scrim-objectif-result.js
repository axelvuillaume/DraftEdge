const mongoose = require('mongoose');

const MODELNAME = 'scrim-objectif-result';

const Schema = new mongoose.Schema(
  {
    objectif_id: { type: String },
    objectif_name: { type: String },
    session_id: { type: String },
    session_name: { type: String },
    team_id: { type: String, required: true },
    team_name: { type: String, required: true },
    result: { type: Number },
    patch: { type: String },
    comment: { type: String },
    game_id: { type: String },
    game_name: { type: String },
  },
  { timestamps: true },
);

const OBJ = mongoose.model(MODELNAME, Schema);
module.exports = OBJ;
