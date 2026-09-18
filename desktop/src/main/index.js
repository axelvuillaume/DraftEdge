import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'path'
import { LcuClient } from './lcu'
import { Store } from './store'
import { DraftEdgeApi } from './api'
import { fetchHistory, fetchChampions } from './history'
import { Importer } from './importer'
import { setupUpdater } from './updater'

let mainWindow = null
let store = null
let api = null
let currentImport = null
let updater = null
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
      return { ok: true, data: await fetchHistory(lcu, opts || {}) }
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
    if (currentImport) return { ok: false, code: 'Un import est déjà en cours' }
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

  // Mises à jour
  ipcMain.handle('update:check', () => updater.check())
  ipcMain.handle('update:install', () => updater.install())
  ipcMain.handle('app:version', () => app.getVersion())

  lcu.onStatus((status) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('lcu:status', status)
  })
}

app.whenReady().then(() => {
  store = new Store()
  api = new DraftEdgeApi(store)
  lcu.customPath = store.get('lockfilePath')

  updater = setupUpdater((event) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('update:status', event)
  })
  registerIpc()
  createWindow()
  lcu.startPolling(3000)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  lcu.stopPolling()
  if (process.platform !== 'darwin') app.quit()
})
