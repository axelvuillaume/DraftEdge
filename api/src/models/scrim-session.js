const mongoose = require('mongoose');

const MODELNAME = 'scrim-session';

const Schema = new mongoose.Schema(
  {
    name: { type: String },
    date: { type: Date, default: Date.now },
    opponent: { type: String },
    team_id: { type: String, required: true },
    team_name: { type: String, required: true },
    comment: { type: String },
    patch: { type: String },
  },
  { timestamps: true },
);

const OBJ = mongoose.model(MODELNAME, Schema);
module.exports = OBJ;
