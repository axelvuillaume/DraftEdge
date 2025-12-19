const { GoogleGenAI } = require('@google/genai');

const GEMINI_API_KEY = 'AIzaSyC2wBlSuvXKBy0RNvlGYFC4rG5v1mtC2ag';
const client = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

module.exports = { client };
