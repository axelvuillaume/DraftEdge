const CONFIG = require('../config');

const RIOT_API_KEY = CONFIG.RIOT_API_KEY;
const MATCH_V5_BASE = 'https://europe.api.riotgames.com/lol/match/v5/matches';
const LEAGUE_V4_BASE = 'https://euw1.api.riotgames.com/lol/league/v4/entries/by-puuid';

async function getMatchIdsByPuuid(puuid, count = 20) {
  try {
    const url = `${MATCH_V5_BASE}/by-puuid/${puuid}/ids?start=0&count=${count}&api_key=${RIOT_API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`Riot Match API error: ${response.status} ${response.statusText}`);
      return null;
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching match IDs:', error.message);
    return null;
  }
}

async function getMatchById(matchId) {
  try {
    const url = `${MATCH_V5_BASE}/${matchId}?api_key=${RIOT_API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`Riot Match API error for ${matchId}: ${response.status}`);
      return null;
    }

    return response.json();
  } catch (error) {
    console.error(`Error fetching match ${matchId}:`, error.message);
    return null;
  }
}

async function getGamesByPuuid(puuid, number = 20) {
  try {
    const matchIds = await getMatchIdsByPuuid(puuid, number);
    if (!matchIds) return null;

    const matches = await Promise.all(matchIds.map(getMatchById));
    return matches.filter(Boolean);
  } catch (error) {
    console.error('Error fetching games by puuid:', error.message);
    return null;
  }
}

async function getRankByPuuid(puuid) {
  try {
    const url = `${LEAGUE_V4_BASE}/${puuid}?api_key=${RIOT_API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`Riot League API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    const soloQueue = data.find((entry) => entry.queueType === 'RANKED_SOLO_5x5');

    if (!soloQueue) return null;

    return soloQueue;
  } catch (error) {
    console.error('Error fetching rank:', error.message);
    return null;
  }
}

async function getPuuidByRiotId(gameName, tagLine) {
  try {
    const url = `https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}?api_key=${RIOT_API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`Riot Account API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    return data.puuid || null;
  } catch (error) {
    console.error('Error fetching PUUID:', error.message);
    return null;
  }
}

module.exports = { getMatchIdsByPuuid, getMatchById, getGamesByPuuid, getRankByPuuid, getPuuidByRiotId };
