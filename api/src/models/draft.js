const mongoose = require('mongoose');

const MODELNAME = 'draft';

const Schema = new mongoose.Schema(
  {
    name: { type: String },
    team_id: { type: String, required: true },
    team_name: { type: String, required: true },
    opponent_id: { type: String },
    opponent_name: { type: String },
  },
  { timestamps: true },
);

const Draft = mongoose.model(MODELNAME, Schema);
module.exports = Draft;
