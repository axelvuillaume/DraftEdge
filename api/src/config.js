/* eslint-disable no-undef */
const ENVIRONMENT = process.env.ENVIRONMENT || 'development';
const PORT = process.env.PORT || 8080;
const MONGODB_ENDPOINT = process.env.MONGODB_ENDPOINT || 'mongodb://localhost:27017/draftedge';
const SECRET = process.env.SECRET || 'not-so-secret';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const SENTRY_DSN = process.env.SENTRY_DSN || '';

const S3_ENDPOINT = process.env.S3_ENDPOINT || '';
const S3_ACCESSKEYID = process.env.S3_ACCESSKEYID || '';
const S3_SECRETACCESSKEY = process.env.S3_SECRETACCESSKEY || '';

const BREVO_KEY = process.env.BREVO_KEY || '';

const RIOT_API_KEY = process.env.RIOT_API_KEY || '';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID || '';

const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY || '';
const POSTHOG_HOST = process.env.POSTHOG_HOST || 'https://eu.i.posthog.com';

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
  GEMINI_API_KEY,
  RIOT_API_KEY,
  POSTHOG_API_KEY,
  POSTHOG_HOST,
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET,
  STRIPE_PRICE_ID,
};

if (ENVIRONMENT === 'development') console.log(CONFIG);

module.exports = CONFIG;
