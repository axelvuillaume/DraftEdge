import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'path'
import { LcuClient } from './lcu'
import { Store } from './store'
import { DraftEdgeApi } from './api'
import { fetchHistory, fetchChampions } from './history'
import { Importer } from './importer'
import { watchReplay } from './replay'
import { setupUpdater } from './updater'

// Deep link draftedge://watch/<gameId> : le bouton "Watch replay" du site ouvre l'app pour lancer le replay dans le client
const PROTOCOL = 'draftedge'

let mainWindow = null
let store = null
let api = null
let currentImport = null
let updater = null
let currentWatch = null
let lastReplayStatus = null
let pendingDeepLink = null
let championsCache = null
let appReady = false
const lcu = new LcuClient()

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: 'DraftEdge',
    backgroundColor: '#0f172a',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow.show())

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
    return
  }
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
}

function registerProtocol() {
  // En dev (electron .), il faut passer l'exécutable et le script pour que l'OS relance la bonne commande
  if (process.defaultApp && process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])])
    return
  }
  app.setAsDefaultProtocolClient(PROTOCOL)
}

function extractDeepLink(argv) {
  return (argv || []).find((a) => typeof a === 'string' && a.startsWith(`${PROTOCOL}://`)) || null
}

function focusWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow()
    return
  }
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.focus()
}

// Attend que le renderer soit chargé pour ne pas perdre les événements envoyés au démarrage à froid
function waitForRenderer() {
  return new Promise((resolve) => {
    if (!mainWindow || mainWindow.isDestroyed()) return resolve()
    if (!mainWindow.webContents.isLoading()) return resolve()
    mainWindow.webContents.once('did-finish-load', () => resolve())
  })
}

function sendReplayStatus(event) {
  lastReplayStatus = event
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('replay:status', event)
}

async function runWatch(gameId) {
  if (currentWatch) return { ok: false, code: 'A replay is already launching' }
  currentWatch = gameId
  sendReplayStatus({ gameId, status: 'running', message: 'Preparing replay…' })
  try {
    const result = await watchReplay({ lcu, api, gameId, onProgress: (p) => sendReplayStatus({ gameId, status: 'running', ...p }) })
    sendReplayStatus({ gameId, status: 'done', message: result.via === 'client' ? 'Replay launched in the League client' : 'Replay file opened with League' })
    return { ok: true, ...result }
  } catch (e) {
    sendReplayStatus({ gameId, status: 'error', message: e.message })
    return { ok: false, code: e.message }
  } finally {
    currentWatch = null
  }
}

async function handleDeepLink(url) {
  if (!url) return
  if (!appReady) {
    pendingDeepLink = url
    return
  }
  let parsed
  try {
    parsed = new URL(url)
  } catch (e) {
    return
  }
  // draftedge://watch/<id> → host "watch", pathname "/<id>"
  const action = parsed.host
  const id = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''))
  focusWindow()
  await waitForRenderer()
  if (action === 'watch' && id) await runWatch(id)
}

function registerIpc() {
  // Auth DraftEdge
  ipcMain.handle('auth:login', (_e, { email, password }) => api.login(email, password))
  ipcMain.handle('auth:me', () => api.me())
  ipcMain.handle('auth:logout', () => api.logout())

  // Réglages
  ipcMain.handle('settings:get', () => store.settings())
  ipcMain.handle('settings:set', (_e, patch) => {
    const allowed = ['apiUrl', 'lockfilePath']
    const clean = Object.fromEntries(Object.entries(patch || {}).filter(([k]) => allowed.includes(k)))
    const settings = store.set(clean)
    lcu.customPath = store.get('lockfilePath')
    return settings
  })

  // Client League
  ipcMain.handle('lcu:status', () => lcu.status)
  ipcMain.handle('lcu:refresh', async () => {
    await lcu.refresh()
    return lcu.status
  })
  ipcMain.handle('lcu:history', async (_e, opts) => {
    try {
      const data = await fetchHistory(lcu, opts || {})
      // Enrichit chaque game pour le renderer : nom des champions et statut "déjà importée" côté DraftEdge
      if (!championsCache) championsCache = await fetchChampions(lcu).catch(() => ({}))
      for (const g of data.games) for (const p of g.participants) p.championName = championsCache[p.championId]?.name || null
      const ids = data.games.filter((g) => g.isCustom).map((g) => g.riotGameId)
      const check = ids.length ? await api.post('/parser/check', { game_ids: ids }) : { ok: true, data: { existing: {} } }
      for (const g of data.games) g.imported = (check.ok && check.data?.existing?.[g.riotGameId]) || null
      return { ok: true, data }
    } catch (e) {
      return { ok: false, code: e.message }
    }
  })
  ipcMain.handle('lcu:champions', async () => {
    try {
      return { ok: true, data: await fetchChampions(lcu) }
    } catch (e) {
      return { ok: false, code: e.message }
    }
  })

  // Passe-plat générique vers l'API DraftEdge (JSON uniquement)
  ipcMain.handle('api:request', (_e, { method, path: p, json }) => api.request(method, p, { json }))

  // Import
  ipcMain.handle('import:run', async (_e, payload) => {
    if (currentImport) return { ok: false, code: 'An import is already running' }
    currentImport = new Importer({ lcu, api })
    try {
      return await currentImport.run(payload, (event) => {
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('import:progress', event)
      })
    } catch (e) {
      return { ok: false, code: e.message }
    } finally {
      currentImport = null
    }
  })
  ipcMain.handle('import:cancel', () => {
    if (currentImport) currentImport.cancel()
    return { ok: true }
  })

  // Replays (lancement dans le client depuis le site)
  ipcMain.handle('replay:watch', (_e, { gameId }) => runWatch(gameId))
  ipcMain.handle('replay:last', () => lastReplayStatus)

  // Mises à jour
  ipcMain.handle('update:check', () => updater.check())
  ipcMain.handle('update:install', () => updater.install())
  ipcMain.handle('app:version', () => app.getVersion())

  lcu.onStatus((status) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('lcu:status', status)
  })
}

// Une seule instance : sur Windows/Linux le deep link arrive dans l'argv de la seconde instance
const gotSingleInstanceLock = app.requestSingleInstanceLock()
if (!gotSingleInstanceLock) app.quit()

if (gotSingleInstanceLock) {
  app.on('second-instance', (_e, argv) => {
    focusWindow()
    handleDeepLink(extractDeepLink(argv))
  })

  // macOS : le deep link arrive par cet événement, parfois avant whenReady (mis en attente)
  app.on('open-url', (e, url) => {
    e.preventDefault()
    handleDeepLink(url)
  })

  app.whenReady().then(async () => {
    store = new Store()
    api = new DraftEdgeApi(store)
    lcu.customPath = store.get('lockfilePath')

    updater = setupUpdater((event) => {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('update:status', event)
    })
    registerProtocol()
    registerIpc()
    createWindow()
    lcu.startPolling(3000)
    // Le client peut mettre quelques secondes à être détecté par le polling : on le cherche tout de suite pour un deep link à froid
    await lcu.refresh().catch(() => {})
    appReady = true

    const coldStartLink = pendingDeepLink || extractDeepLink(process.argv)
    pendingDeepLink = null
    if (coldStartLink) handleDeepLink(coldStartLink)

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
}

app.on('window-all-closed', () => {
  lcu.stopPolling()
  if (process.platform !== 'darwin') app.quit()
})
