// Téléchargement des .rofl via le client League (plugin lol-replays)
import fs from 'fs'
import path from 'path'
import { shell } from 'electron'

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

// Côté API : codes renvoyés par GET /game/:id/replay
const REPLAY_API_ERRORS = {
  REPLAY_NOT_STORED: 'This game was imported before replay storage, its file is not available',
  NOT_FOUND: 'Game not found',
  FORBIDDEN: 'This replay belongs to another team',
  UNAUTHORIZED: 'Sign in to DraftEdge desktop first'
}

function patchPrefix(version) {
  if (typeof version !== 'string') return null
  const m = version.match(/^(\d+)\.(\d+)/)
  return m ? `${m[1]}.${m[2]}` : null
}

// Version du jeu installé (ex. "16.20.824.8524") : un replay ne se lit que sur le même patch majeur.mineur.
// Vérifié en live : le client marque "incompatible" une game du patch précédent, mais laisse lancer un fichier déjà
// présent dans le dossier, d'où ce contrôle avant téléchargement.
async function getClientPatch(lcu) {
  try {
    const conf = await lcu.get('/lol-replays/v1/configuration')
    const fromConf = patchPrefix(conf?.gameVersion)
    if (fromConf) return fromConf
  } catch (e) {
    // plugin replays indisponible : on tente l'endpoint patch
  }
  try {
    return patchPrefix(await lcu.get('/lol-patch/v1/game-version'))
  } catch (e) {
    return null
  }
}

async function downloadToFile(url, dest, onProgress = () => {}) {
  const res = await fetch(url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) })
  if (!res.ok) throw new Error(`Replay download failed (HTTP ${res.status})`)
  const total = Number(res.headers.get('content-length')) || 0
  const tmp = `${dest}.part`
  const out = fs.createWriteStream(tmp)
  const reader = res.body.getReader()
  let received = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      out.write(Buffer.from(value))
      received += value.length
      if (total) onProgress(Math.round((received / total) * 100))
    }
    await new Promise((resolve, reject) => out.end((err) => (err ? reject(err) : resolve())))
    fs.renameSync(tmp, dest)
  } catch (e) {
    out.destroy()
    fs.rmSync(tmp, { force: true })
    throw e
  }
}

// Demande au client de lire un .rofl déjà présent dans son dossier replays
async function launchViaClient(lcu, numericGameId) {
  // Le scan force le client à indexer les fichiers déposés à la main dans le dossier
  await lcu.post('/lol-replays/v1/rofls/scan').catch(() => {})
  let meta = await getMetadata(lcu, numericGameId)
  for (let i = 0; i < 10 && meta && (meta.state === 'checking' || meta.state === 'found'); i++) {
    await sleep(500)
    meta = await getMetadata(lcu, numericGameId)
  }
  if (meta && FAILED_STATES.has(meta.state)) {
    const err = new Error(FAILED_MESSAGES[meta.state] || `Replay unavailable (${meta.state})`)
    err.fatal = true
    throw err
  }
  await lcu.post(`/lol-replays/v1/rofls/${numericGameId}/watch`, { componentType: 'replay-button_match-history' })
}

/**
 * Lance le replay d'une game DraftEdge dans le client League (bouton "Watch replay" du site, deep link draftedge://watch/<id>).
 * Récupère le .rofl stocké par l'API, le dépose dans le dossier replays du client, puis demande au client de le lire.
 * Repli : ouverture du fichier par l'OS (association .rofl), équivalent d'un double-clic.
 */
export async function watchReplay({ lcu, api, gameId, onProgress = () => {} }) {
  if (!lcu.status.connected) throw new Error('Open the League client first, then try again')

  onProgress({ state: 'fetching', message: 'Fetching replay…' })
  const res = await api.get(`/game/${gameId}/replay`)
  if (!res.ok) throw new Error(REPLAY_API_ERRORS[res.code] || res.code || 'Replay unavailable')
  const { url, filename, game_id, patch } = res.data

  const clientPatch = await getClientPatch(lcu)
  const replayPatch = patchPrefix(patch)
  if (clientPatch && replayPatch && clientPatch !== replayPatch) {
    throw new Error(`This replay is from patch ${replayPatch}, your client is on patch ${clientPatch}. Riot only plays replays from the current patch.`)
  }

  const folder = await getReplaysFolder(lcu)
  const dest = path.join(folder, filename)
  if (!fs.existsSync(dest)) {
    onProgress({ state: 'downloading', message: 'Downloading replay…', progress: 0 })
    await downloadToFile(url, dest, (progress) => onProgress({ state: 'downloading', message: `Downloading replay… ${progress}%`, progress }))
  }

  onProgress({ state: 'launching', message: 'Launching replay in the League client…' })
  const numericGameId = typeof game_id === 'string' ? game_id.split('-')[1] : null
  if (numericGameId) {
    try {
      await launchViaClient(lcu, numericGameId)
      return { filePath: dest, via: 'client' }
    } catch (e) {
      if (e.fatal) throw e
      console.error('[replay] client launch failed, opening file with the OS instead:', e.message)
    }
  }

  const openError = await shell.openPath(dest)
  if (openError) throw new Error(openError)
  return { filePath: dest, via: 'os' }
}
