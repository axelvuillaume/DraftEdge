// Auto-update via GitHub Releases (electron-updater). Actif uniquement sur l'app packagée.
import { app } from 'electron'
import { autoUpdater } from 'electron-updater'

const CHECK_INTERVAL_MS = 60 * 60 * 1000

export function setupUpdater(send) {
  if (!app.isPackaged) return { check: async () => ({ ok: false, code: 'dev' }), install: () => {} }

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.logger = console

  autoUpdater.on('checking-for-update', () => send({ status: 'checking' }))
  autoUpdater.on('update-available', (info) => send({ status: 'available', version: info.version }))
  autoUpdater.on('update-not-available', () => send({ status: 'up-to-date', version: app.getVersion() }))
  autoUpdater.on('download-progress', (p) => send({ status: 'downloading', percent: Math.round(p.percent) }))
  autoUpdater.on('update-downloaded', (info) => send({ status: 'ready', version: info.version }))
  autoUpdater.on('error', (err) => send({ status: 'error', message: err?.message || String(err) }))

  const check = async () => {
    try {
      const r = await autoUpdater.checkForUpdates()
      return { ok: true, version: r?.updateInfo?.version || null }
    } catch (e) {
      return { ok: false, code: e.message }
    }
  }

  // Premier check peu après le démarrage, puis toutes les heures
  setTimeout(check, 5000)
  setInterval(check, CHECK_INTERVAL_MS)

  return { check, install: () => autoUpdater.quitAndInstall(false, true) }
}
