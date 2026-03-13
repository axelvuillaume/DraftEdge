/* eslint-disable no-undef */
const ENVIRONMENT = process.env.ENVIRONMENT || 'development';
const PORT = process.env.PORT || 8080;
const MONGODB_ENDPOINT = 'mongodb+srv://axelvuillaume:gtb5r5m0CSkOdC5o@cluster0.lwmxeaa.mongodb.net/?appName=Cluster0';
const SECRET = process.env.SECRET || 'not-so-secret';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const CLAUDE_API_KEY = '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';
const GEMINI_API_KEY = 'AIzaSyDwE9dY83XGkuOsp-Wafqf-5KbjnUTyoog';
const SENTRY_DSN = process.env.SENTRY_DSN || '';

const S3_ENDPOINT = process.env.S3_ENDPOINT || '';
const S3_ACCESSKEYID = process.env.S3_ACCESSKEYID || '';
const S3_SECRETACCESSKEY = process.env.S3_SECRETACCESSKEY || '';

const BREVO_KEY = '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';

const RIOT_API_KEY = 'RGAPI-4262b941-2677-4e42-a8c7-f89750638407' || '';

const POSTHOG_API_KEY = 'phc_ytErKBckHNz5Rs3qW4sJqVbCiMLRBj6BTFZ1a5fVNrU';
const POSTHOG_HOST = 'https://eu.i.posthog.com';

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
};

if (ENVIRONMENT === 'development') console.log(CONFIG);

module.exports = CONFIG;
