const mongoose = require('mongoose');

const MODELNAME = 'replay-book';

const Schema = new mongoose.Schema(
  {
    team_id: { type: String },
    team_name: { type: String },
    link: { type: String },
    name: { type: String },
    notes: [{ title: { type: String }, description: { type: String }, timing: { type: Number } }],
  },
  { timestamps: true },
);

const OBJ = mongoose.model(MODELNAME, Schema);
module.exports = OBJ;
