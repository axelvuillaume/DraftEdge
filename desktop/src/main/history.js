// Lecture de l'historique du client League et normalisation pour DraftEdge

const PAGE_SIZE = 60
const MAX_DETAILS = 40

function sideFromTeamId(teamId) {
  return Number(teamId) === 100 ? 'blue' : 'red'
}

function normalizeParticipants(game) {
  const identities = game.participantIdentities || []
  return (game.participants || []).map((p) => {
    const identity = identities.find((i) => i.participantId === p.participantId)?.player || {}
    return {
      participantId: p.participantId,
      teamId: p.teamId,
      side: sideFromTeamId(p.teamId),
      championId: p.championId,
      puuid: identity.puuid || null,
      gameName: identity.gameName || identity.summonerName || '',
      tagLine: identity.tagLine || '',
      win: !!p.stats?.win
    }
  })
}

function normalizeGame(game, selfPuuid, detailed) {
  const participants = normalizeParticipants(game)
  const self = participants.find((p) => p.puuid && p.puuid === selfPuuid) || participants[0] || null
  const platformId = (game.platformId || 'EUW1').toUpperCase()
  return {
    gameId: game.gameId,
    riotGameId: `${platformId}-${game.gameId}`,
    platformId,
    region: platformId.toLowerCase(),
    creation: game.gameCreation,
    duration: game.gameDuration,
    gameType: game.gameType,
    gameMode: game.gameMode,
    queueId: game.queueId,
    mapId: game.mapId,
    gameVersion: game.gameVersion,
    isCustom: game.gameType === 'CUSTOM_GAME' || game.queueId === 0,
    mySide: self ? self.side : null,
    myWin: self ? self.win : null,
    myChampionId: self ? self.championId : null,
    detailed,
    participants
  }
}

// Renvoie une page de l'historique (begIndex inclus, PAGE_SIZE games max) + hasMore
export async function fetchHistory(lcu, { detailCustoms = true, begIndex = 0 } = {}) {
  const selfPuuid = lcu.summoner?.puuid
  const endIndex = begIndex + PAGE_SIZE
  const list = await lcu.get(`/lol-match-history/v1/products/lol/current-summoner/matches?begIndex=${begIndex}&endIndex=${endIndex}`)
  const rawGames = list?.games?.games || []

  const games = rawGames.map((g) => normalizeGame(g, selfPuuid, false))
  const hasMore = rawGames.length >= PAGE_SIZE
  if (!detailCustoms) return { games, hasMore, nextIndex: endIndex }

  // Détail (10 joueurs) uniquement pour les customs : c'est ce qu'on importe
  const customs = games.filter((g) => g.isCustom).slice(0, MAX_DETAILS)
  for (const g of customs) {
    try {
      const full = await lcu.get(`/lol-match-history/v1/games/${g.gameId}`)
      if (!full) continue
      const detailed = normalizeGame(full, selfPuuid, true)
      Object.assign(g, detailed)
    } catch (e) {
      console.error('[history] détail indisponible pour', g.gameId, e.message)
    }
  }
  return { games, hasMore, nextIndex: endIndex }
}

export async function fetchChampions(lcu) {
  const summary = await lcu.get('/lol-game-data/assets/v1/champion-summary.json')
  const map = {}
  for (const c of summary || []) {
    if (c.id > 0) map[c.id] = { id: c.id, name: c.name, alias: c.alias }
  }
  return map
}
