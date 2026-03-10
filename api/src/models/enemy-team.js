const mongoose = require('mongoose');

const MODELNAME = 'enemy-team';

const Schema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    team_id: { type: String, required: true },
    team_name: { type: String, required: true },
    league: { type: String, default: '' },
    multi_opgg: { type: String, default: '' },
    contact_name: { type: String, default: '' },
    contact_role: { type: String, default: '' },
    contact_discord: { type: String, default: '' },
    contact_twitter: { type: String, default: '' },
    notes: { type: String, default: '' },
  },
  { timestamps: true },
);

const OBJ = mongoose.model(MODELNAME, Schema);
module.exports = OBJ;
