/* eslint-disable no-undef */
const ENVIRONMENT = process.env.ENVIRONMENT || 'development';
const PORT = process.env.PORT || 8080;
const MONGODB_ENDPOINT = 'mongodb+srv://axelvuillaume:gtb5r5m0CSkOdC5o@cluster0.lwmxeaa.mongodb.net/?appName=Cluster0';
const SECRET = process.env.SECRET || 'not-so-secret';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const CLAUDE_API_KEY = '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';
const SENTRY_DSN = process.env.SENTRY_DSN || '';

const S3_ENDPOINT = process.env.S3_ENDPOINT || '';
const S3_ACCESSKEYID = process.env.S3_ACCESSKEYID || '';
const S3_SECRETACCESSKEY = process.env.S3_SECRETACCESSKEY || '';

const BREVO_KEY = process.env.BREVO_KEY || '';

const CONFIG = {
  ENVIRONMENT,
  PORT,
  MONGODB_ENDPOINT,
  SECRET,
  APP_URL,
  SENTRY_DSN,
  S3_ENDPOINT,
  S3_ACCESSKEYID,
  S3_SECRETACCESSKEY,
  BREVO_KEY,
  CLAUDE_API_KEY,
};

if (ENVIRONMENT === 'development') console.log(CONFIG);

module.exports = CONFIG;
