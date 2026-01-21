const mongoose = require('mongoose');

const MODELNAME = 'aifeedback';

const Schema = new mongoose.Schema(
  {
    role: { type: String, required: true },
    strengths: [{ title: { type: String, required: true }, description: { type: String, required: true } }],
    improvements: [{ title: { type: String, required: true }, description: { type: String, required: true } }],
    type: { type: String, enum: ['combat', 'objectives', 'vision', 'income'], required: true },
    team_id: { type: String, required: true },
    team_name: { type: String, required: true },
    statsPrompt: { type: String, required: true },
  },
  { timestamps: true }
);

const OBJ = mongoose.model(MODELNAME, Schema);
module.exports = OBJ;
