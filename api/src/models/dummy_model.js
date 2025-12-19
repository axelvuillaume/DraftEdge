const mongoose = require("mongoose");

const MODELNAME = "dummy_model";

const Schema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },

  createdAt: { type: Date, default: Date.now },
});

const OBJ = mongoose.model(MODELNAME, Schema);
module.exports = OBJ;
