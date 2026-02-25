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

async function apiFetch(url) {
  const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}api_key=${RIOT_API_KEY}`);

  if (res.status === 429) {
    const wait = (parseInt(res.headers.get('Retry-After'), 10) || 120) * 1000;
    console.log(`  [riot] Rate limited — waiting ${wait / 1000}s`);
    await new Promise((r) => setTimeout(r, wait));
    return apiFetch(url);
  }

  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

async function getMatchIdsByPuuid(puuid, { count = 20, start = 0, queue, startTime, platform = 'euw1' } = {}) {
  try {
    const regional = PLATFORM_TO_REGIONAL[platform] || 'europe';
    const params = new URLSearchParams({ start: String(start), count: String(count) });
    if (queue != null) params.set('queue', String(queue));
    if (startTime != null) params.set('startTime', String(startTime));
    const url = `https://${regional}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?${params}`;
    return await apiFetch(url);
  } catch (error) {
    console.error('Error fetching match IDs:', error.message);
    return null;
  }
}

async function getMatchById(matchId, platform = 'euw1') {
  try {
    const regional = PLATFORM_TO_REGIONAL[platform] || 'europe';
    const url = `https://${regional}.api.riotgames.com/lol/match/v5/matches/${matchId}`;
    return await apiFetch(url);
  } catch (error) {
    console.error(`Error fetching match ${matchId}:`, error.message);
    return null;
  }
}

async function getTimelineById(matchId, platform = 'euw1') {
  try {
    const regional = PLATFORM_TO_REGIONAL[platform] || 'europe';
    const url = `https://${regional}.api.riotgames.com/lol/match/v5/matches/${matchId}/timeline`;
    return await apiFetch(url);
  } catch (error) {
    console.error(`Error fetching timeline ${matchId}:`, error.message);
    return null;
  }
}

async function getGamesByPuuid(puuid, number = 20, platform = 'euw1') {
  try {
    const matchIds = await getMatchIdsByPuuid(puuid, { count: number, platform });
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
    const url = `https://${platform}.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuid}`;
    const data = await apiFetch(url);
    const soloQueue = data.find((entry) => entry.queueType === 'RANKED_SOLO_5x5');
    return soloQueue || null;
  } catch (error) {
    console.error('Error fetching rank:', error.message);
    return null;
  }
}

async function getPuuidByRiotId(gameName, tagLine, platform = 'euw1') {
  try {
    const regional = PLATFORM_TO_REGIONAL[platform] || 'europe';
    const url = `https://${regional}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
    const data = await apiFetch(url);
    return data.puuid || null;
  } catch (error) {
    console.error('Error fetching PUUID:', error.message);
    return null;
  }
}

module.exports = { apiFetch, getMatchIdsByPuuid, getMatchById, getTimelineById, getGamesByPuuid, getRankByPuuid, getPuuidByRiotId, PLATFORM_TO_REGIONAL, SERVERS };
