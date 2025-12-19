const mongoose = require('mongoose');

const MODELNAME = 'team';

const Schema = new mongoose.Schema(
  {
    name: { type: String, required: true },
  },
  { timestamps: true }
);

const OBJ = mongoose.model(MODELNAME, Schema);
module.exports = OBJ;
