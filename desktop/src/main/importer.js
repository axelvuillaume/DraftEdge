// Pipeline d'import : pour chaque game sélectionnée, .rofl via le client → POST /parser/import
import fs from 'fs'
import path from 'path'
import { ensureReplay } from './replay'

function puuidMap(game) {
  const map = {}
  for (const p of game.participants || []) {
    if (p.puuid && p.gameName) map[`${p.gameName}#${p.tagLine || ''}`] = p.puuid
  }
  return map
}

async function countGamesInSession(api, sessionId) {
  const res = await api.post('/game/search', { session_id: sessionId, limit: 500 })
  if (!res.ok) return 0
  return (res.data || []).length
}

async function refreshSessionStats(api, session, patch) {
  const res = await api.post('/game/search', { session_id: session._id, limit: 500 })
  if (!res.ok) return
  const games = res.data || []
  const win = games.filter((g) => g.win).length
  const loss = games.filter((g) => !g.win).length
  const update = { win, loss, winrate: games.length > 0 ? Math.round((win / games.length) * 100) : 0 }
  if (!session.patch && patch) update.patch = patch
  await api.put(`/scrim-session/${session._id}`, update)
}

export class Importer {
  constructor({ lcu, api }) {
    this.lcu = lcu
    this.api = api
    this.cancelled = false
  }

  cancel() {
    this.cancelled = true
  }

  /**
   * games : games normalisées (history.js), triées chronologiquement
   * session : bloc DraftEdge ; user : utilisateur connecté
   * onProgress(event) : { gameId, status, message, progress }
   */
  async run({ games, session, user }, onProgress = () => {}) {
    const results = []
    const ordered = [...games].sort((a, b) => a.creation - b.creation)
    let index = await countGamesInSession(this.api, session._id)
    let lastPatch = null

    for (const game of ordered) {
      if (this.cancelled) {
        results.push({ gameId: game.gameId, status: 'cancelled' })
        onProgress({ gameId: game.gameId, status: 'cancelled', message: 'Annulé' })
        continue
      }

      try {
        onProgress({ gameId: game.gameId, status: 'downloading', message: 'Replay…' })
        const { filePath } = await ensureReplay(this.lcu, game, ({ state, progress }) => {
          const pct = typeof progress === 'number' ? ` ${Math.round(progress)}%` : ''
          onProgress({ gameId: game.gameId, status: 'downloading', message: `Replay (${state})${pct}`, progress })
        })

        onProgress({ gameId: game.gameId, status: 'uploading', message: 'Envoi vers DraftEdge…' })
        const buffer = fs.readFileSync(filePath)
        const form = new FormData()
        form.append('replay', new Blob([buffer]), path.basename(filePath))
        form.append('team_side', game.mySide || 'blue')
        form.append('game_id', game.riotGameId)
        form.append('region', game.region)
        form.append('date', new Date(game.creation).toISOString())
        form.append('source_import', 'desktop')
        form.append('puuids', JSON.stringify(puuidMap(game)))
        form.append('name', `Game ${index + 1}`)
        form.append('session_id', session._id)
        if (session.name) form.append('session_name', session.name)
        if (session.opponent_id) form.append('opponent_id', session.opponent_id)
        if (session.opponent_name) form.append('opponent_name', session.opponent_name)
        if (session.folder_id) form.append('folder_id', session.folder_id)
        if (session.folder_name) form.append('folder_name', session.folder_name)
        if (user?.team_id) form.append('team_id', user.team_id)
        if (user?.team_name) form.append('team_name', user.team_name)

        const res = await this.api.postFormData('/parser/import', form)

        if (res.ok) {
          index += 1
          lastPatch = res.data?.game?.patch || lastPatch
          results.push({ gameId: game.gameId, status: 'done', game: res.data?.game })
          onProgress({ gameId: game.gameId, status: 'done', message: `Importée · ${res.data?.game?.name || ''}`.trim() })
          continue
        }

        if (res.code === 'This game already exists') {
          results.push({ gameId: game.gameId, status: 'duplicate', existing_game_id: res.existing_game_id })
          onProgress({ gameId: game.gameId, status: 'duplicate', message: 'Déjà importée' })
          continue
        }

        throw new Error(res.details || res.code || 'Import refusé')
      } catch (e) {
        results.push({ gameId: game.gameId, status: 'error', message: e.message })
        onProgress({ gameId: game.gameId, status: 'error', message: e.message })
      }
    }

    if (results.some((r) => r.status === 'done')) {
      try {
        await refreshSessionStats(this.api, session, lastPatch)
      } catch (e) {
        console.error('[import] refresh stats bloc', e.message)
      }
    }

    return { ok: true, results }
  }
}
