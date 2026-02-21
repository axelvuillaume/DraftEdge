const CONFIG = require('../config');

const RIOT_API_KEY = CONFIG.RIOT_API_KEY;

const PLATFORM_TO_REGIONAL = {
  euw1: 'europe',
  eun1: 'europe',
  tr1: 'europe',
  ru: 'europe',
  na1: 'americas',
  br1: 'americas',
  la1: 'americas',
  la2: 'americas',
  kr: 'asia',
  jp1: 'asia',
  oc1: 'sea',
  ph2: 'sea',
  sg2: 'sea',
  th2: 'sea',
  tw2: 'sea',
  vn2: 'sea',
  me1: 'europe',
};

const SERVERS = [
  { value: 'euw1', label: 'EUW' },
  { value: 'eun1', label: 'EUNE' },
  { value: 'na1', label: 'NA' },
  { value: 'kr', label: 'KR' },
  { value: 'br1', label: 'BR' },
  { value: 'jp1', label: 'JP' },
  { value: 'la1', label: 'LAN' },
  { value: 'la2', label: 'LAS' },
  { value: 'oc1', label: 'OCE' },
  { value: 'tr1', label: 'TR' },
  { value: 'ru', label: 'RU' },
  { value: 'ph2', label: 'PH' },
  { value: 'sg2', label: 'SG' },
  { value: 'th2', label: 'TH' },
  { value: 'tw2', label: 'TW' },
  { value: 'vn2', label: 'VN' },
  { value: 'me1', label: 'ME' },
];

function getRegional(platform) {
  return PLATFORM_TO_REGIONAL[platform] || 'europe';
}

async function getMatchIdsByPuuid(puuid, count = 20, platform = 'euw1') {
  try {
    const regional = getRegional(platform);
    const url = `https://${regional}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=${count}&api_key=${RIOT_API_KEY}`;
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

async function getMatchById(matchId, platform = 'euw1') {
  try {
    const regional = getRegional(platform);
    const url = `https://${regional}.api.riotgames.com/lol/match/v5/matches/${matchId}?api_key=${RIOT_API_KEY}`;
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

async function getGamesByPuuid(puuid, number = 20, platform = 'euw1') {
  try {
    const matchIds = await getMatchIdsByPuuid(puuid, number, platform);
    if (!matchIds) return null;

    const matches = await Promise.all(matchIds.map((id) => getMatchById(id, platform)));
    return matches.filter(Boolean);
  } catch (error) {
    console.error('Error fetching games by puuid:', error.message);
    return null;
  }
}

async function getRankByPuuid(puuid, platform = 'euw1') {
  try {
    const url = `https://${platform}.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuid}?api_key=${RIOT_API_KEY}`;
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

async function getPuuidByRiotId(gameName, tagLine, platform = 'euw1') {
  try {
    const regional = getRegional(platform);
    const url = `https://${regional}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}?api_key=${RIOT_API_KEY}`;
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

module.exports = { getMatchIdsByPuuid, getMatchById, getGamesByPuuid, getRankByPuuid, getPuuidByRiotId, PLATFORM_TO_REGIONAL, SERVERS };
