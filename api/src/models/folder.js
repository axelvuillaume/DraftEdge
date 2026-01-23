const mongoose = require('mongoose');

const MODELNAME = 'folder';

const Schema = new mongoose.Schema(
  {
    name: { type: String },
    description: { type: String },
    team_id: { type: String, required: true },
    team_name: { type: String, required: true },
  },
  { timestamps: true },
);

const Folder = mongoose.model(MODELNAME, Schema);
module.exports = Folder;
