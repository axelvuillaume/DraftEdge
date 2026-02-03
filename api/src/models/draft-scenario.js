const mongoose = require('mongoose');

const MODELNAME = 'draft-scenario';

const Schema = new mongoose.Schema(
  {
    name: { type: String },
    description: { type: String },
    team_id: { type: String, required: true },
    team_name: { type: String, required: true },
    blueBans: [{ type: String }],
    redBans: [{ type: String }],
    bluePicks: [{ type: String }],
    redPicks: [{ type: String }],
  },
  { timestamps: true },
);

const Folder = mongoose.model(MODELNAME, Schema);
module.exports = Folder;
