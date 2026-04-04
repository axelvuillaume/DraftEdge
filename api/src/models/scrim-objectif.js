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
    draft_scenario_id: { type: String, default: null },
    draft_scenario_name: { type: String, default: null },
    strat_map_id: { type: String, default: null },
    strat_map_name: { type: String, default: null },
  },
  { timestamps: true },
);

const OBJ = mongoose.model(MODELNAME, Schema);
module.exports = OBJ;
