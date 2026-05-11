const mongoose = require('mongoose');

const MODELNAME = 'league';

const Schema = new mongoose.Schema(
  {
    name: { type: String },
    description: { type: String },
    region: { type: String },
    tier: { type: String },
    has_points: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const League = mongoose.model(MODELNAME, Schema);
module.exports = League;
