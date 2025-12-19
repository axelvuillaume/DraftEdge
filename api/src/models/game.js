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
  },
  { timestamps: true }
);

const OBJ = mongoose.model(MODELNAME, Schema);
module.exports = OBJ;
