// Téléchargement des .rofl via le client League (plugin lol-replays)
import fs from 'fs'
import path from 'path'

const POLL_MS = 1500
const DOWNLOAD_TIMEOUT_MS = 120000

// États renvoyés par /lol-replays/v1/metadata/{gameId}
const READY_STATES = new Set(['watch'])
const DOWNLOADABLE_STATES = new Set(['download', 'retryDownload'])
const FAILED_STATES = new Set(['incompatible', 'lost', 'missing', 'missingOrExpired', 'unsupported', 'error'])

const FAILED_MESSAGES = {
  incompatible: 'Replay incompatible with the current client patch',
  lost: 'Replay expired on Riot side',
  missing: 'Replay not found on Riot side',
  missingOrExpired: 'Replay not found or expired on Riot side',
  unsupported: 'Replay not supported by the client',
  error: 'Client error on this replay'
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export async function getReplaysFolder(lcu) {
  const p = await lcu.get('/lol-replays/v1/rofls/path')
  if (typeof p !== 'string' || !p) throw new Error('Replays folder not found')
  return p
}

export function replayFilename(game) {
  return `${game.platformId}-${game.gameId}.rofl`
}

// 404 = le client n'a encore aucune info sur ce replay (téléchargement jamais demandé) : on renvoie null
async function getMetadata(lcu, gameId) {
  try {
    return await lcu.get(`/lol-replays/v1/metadata/${gameId}`)
  } catch (e) {
    if (/→ 404\b/.test(e.message) || /"httpStatus":404/.test(e.message)) return null
    throw e
  }
}

function findExistingFile(folder, game) {
  const expected = path.join(folder, replayFilename(game))
  if (fs.existsSync(expected)) return expected
  // Certains clients nomment sans le suffixe de plateforme
  const alt = path.join(folder, `${game.gameId}.rofl`)
  if (fs.existsSync(alt)) return alt
  return null
}

/**
 * S'assure que le .rofl d'une game est présent sur le disque, en le téléchargeant via le client si besoin.
 * onProgress({ state, progress }) est appelé pendant l'attente.
 */
export async function ensureReplay(lcu, game, onProgress = () => {}) {
  const folder = await getReplaysFolder(lcu)

  const existing = findExistingFile(folder, game)
  if (existing) return { filePath: existing, downloaded: false }

  let meta = await getMetadata(lcu, game.gameId)

  // Première rencontre avec ce replay : le plugin demande de créer les métadonnées avant tout
  if (!meta) {
    onProgress({ state: 'create', progress: null })
    await lcu.post(`/lol-replays/v2/metadata/${game.gameId}/create`, {
      gameEnd: (game.creation || Date.now()) + (game.duration || 0) * 1000,
      gameType: game.gameType || 'CUSTOM_GAME',
      gameVersion: game.gameVersion || '',
      queueId: game.queueId ?? 0
    })
    meta = await getMetadata(lcu, game.gameId)
  }

  // Laisser le client finir son "checking" avant de décider
  for (let i = 0; i < 10 && meta && (meta.state === 'checking' || meta.state === 'found'); i++) {
    onProgress({ state: meta.state, progress: null })
    await sleep(POLL_MS)
    meta = await getMetadata(lcu, game.gameId)
  }

  if (meta && FAILED_STATES.has(meta.state)) throw new Error(FAILED_MESSAGES[meta.state] || `Replay unavailable (${meta.state})`)

  if (meta && READY_STATES.has(meta.state)) {
    const file = findExistingFile(folder, game)
    if (file) return { filePath: file, downloaded: false }
  }

  if (!meta || DOWNLOADABLE_STATES.has(meta.state) || meta.state === 'found') {
    onProgress({ state: 'request', progress: null })
    try {
      await lcu.post(`/lol-replays/v1/rofls/${game.gameId}/download`, { componentType: 'replay-button_match-history' })
    } catch (e) {
      if (!/→ 404\b/.test(e.message) && !/"httpStatus":404/.test(e.message)) throw e
      // Variante d'endpoint selon la version du client
      await lcu.post(`/lol-replays/v1/rofls/${game.gameId}/download/graceful`, { componentType: 'replay-button_match-history' })
    }
  }

  const started = Date.now()
  while (Date.now() - started < DOWNLOAD_TIMEOUT_MS) {
    await sleep(POLL_MS)
    meta = await getMetadata(lcu, game.gameId)
    const state = meta?.state || 'waiting'
    // downloadProgress n'a de sens qu'en cours de téléchargement (valeur parasite sinon)
    const progress = state === 'downloading' && meta.downloadProgress >= 0 && meta.downloadProgress <= 100 ? meta.downloadProgress : null
    onProgress({ state, progress })

    if (FAILED_STATES.has(state)) throw new Error(FAILED_MESSAGES[state] || `Replay unavailable (${state})`)

    if (READY_STATES.has(state)) {
      // Le client peut annoncer "watch" quelques instants avant la fin d'écriture du fichier
      for (let i = 0; i < 10; i++) {
        const file = findExistingFile(folder, game)
        if (file) return { filePath: file, downloaded: true }
        await sleep(500)
      }
      throw new Error('Replay downloaded but file not found in ' + folder)
    }
  }
  throw new Error('Replay download timed out')
}
