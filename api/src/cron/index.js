const cron = require('node-cron');

const { ENVIRONMENT } = require('../config');
const getElo = require('./getElo');
const getEloLeague = require('./getEloLeague');
const fetchSoloQ = require('./fetchSoloQ');
const scrapeOracleElixir = require('./scrapeOracleElixir');

let running = {};

const run = async (fn, id) => {
  try {
    if (running[id]) return;
    running[id] = true;
    console.log(`Running cron job: ${id}`);
    await fn();
    console.log(`Completed cron job: ${id}`);
  } catch (error) {
    console.error(`Error in cron job ${id}:`, error);
  } finally {
    running[id] = false;
  }
};

if (ENVIRONMENT !== 'production') return;

console.log('Cron jobs initialized');
cron.schedule('*/15 * * * *', () => run(getElo, 'getElo'));
cron.schedule('*/15 * * * *', () => run(fetchSoloQ, 'fetchSoloQ'));
cron.schedule('0 3 * * *', () => run(getEloLeague, 'getEloLeague'));
// cron.schedule('0 6 * * *', () => run(scrapeOracleElixir, 'scrapeOracleElixir'));
