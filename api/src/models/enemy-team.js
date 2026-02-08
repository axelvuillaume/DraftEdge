const mongoose = require('mongoose');

const MODELNAME = 'enemy-team';

const Schema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    team_id: { type: String, required: true },
    team_name: { type: String, required: true },
  },
  { timestamps: true },
);

const OBJ = mongoose.model(MODELNAME, Schema);
module.exports = OBJ;
