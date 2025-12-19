const Anthropic = require("@anthropic-ai/sdk");
const { CLAUDE_API_KEY } = require("../config");

const client = new Anthropic({ apiKey: CLAUDE_API_KEY });

module.exports = { client };
