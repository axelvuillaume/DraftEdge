import fs from 'fs'
import path from 'path'
import { app, safeStorage } from 'electron'

export const DEFAULTS = {
  // En dev (non packagé) on vise l'API locale, comme app/ avec API_URL
  apiUrl: app.isPackaged ? 'https://api.draftedge.lol' : 'http://localhost:8080',
  lockfilePath: null
}

export class Store {
  constructor() {
    this.file = path.join(app.getPath('userData'), 'config.json')
    this.data = { ...DEFAULTS }
    this.load()
  }

  load() {
    try {
      if (!fs.existsSync(this.file)) return
      this.data = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(this.file, 'utf8')) }
    } catch (e) {
      console.error('[store] config illisible, valeurs par défaut', e.message)
    }
  }

  save() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true })
    fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2))
  }

  get(key) {
    return this.data[key]
  }

  set(patch) {
    this.data = { ...this.data, ...patch }
    this.save()
    return this.settings()
  }

  settings() {
    const { token, ...rest } = this.data
    return { ...rest, hasToken: !!token }
  }

  // Le token JWT est chiffré via le trousseau de l'OS quand c'est possible
  getToken() {
    const raw = this.data.token
    if (!raw) return null
    if (!raw.startsWith('enc:')) return raw
    if (!safeStorage.isEncryptionAvailable()) return null
    try {
      return safeStorage.decryptString(Buffer.from(raw.slice(4), 'base64'))
    } catch (e) {
      return null
    }
  }

  setToken(token) {
    if (!token) {
      delete this.data.token
      this.save()
      return
    }
    const value = safeStorage.isEncryptionAvailable() ? 'enc:' + safeStorage.encryptString(token).toString('base64') : token
    this.data.token = value
    this.save()
  }
}

