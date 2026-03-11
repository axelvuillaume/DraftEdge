const mongoose = require('mongoose');

const MODELNAME = 'scrim-objectif';

const Schema = new mongoose.Schema(
  {
    name: { type: String },
    description: { type: String },
    team_id: { type: String, required: true },
    team_name: { type: String, required: true },
    player_id: { type: String, default: null },
    player_name: { type: String, default: null },
    rating_type: { type: String, enum: ['rating', 'toggle'], default: 'rating' },
  },
  { timestamps: true },
);

const OBJ = mongoose.model(MODELNAME, Schema);
module.exports = OBJ;
