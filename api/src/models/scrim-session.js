const mongoose = require('mongoose');

const MODELNAME = 'scrim-session';

const Schema = new mongoose.Schema(
  {
    name: { type: String },
    date: { type: Date, default: Date.now },
    opponent_id: { type: String },
    opponent_name: { type: String },
    team_id: { type: String, required: true },
    team_name: { type: String, required: true },
    comment: { type: String },
    summary: { type: String },
    communication: { type: String },
    player_notes: [{ player_id: { type: String }, player_name: { type: String }, role: { type: String }, comment: { type: String } }],
    patch: { type: String },
    folder_id: { type: String },
    folder_name: { type: String },
    win: { type: Number },
    loss: { type: Number },
    winrate: { type: Number },
    objectif_ids: { type: [String], default: [] },
  },
  { timestamps: true },
);

const OBJ = mongoose.model(MODELNAME, Schema);
module.exports = OBJ;
