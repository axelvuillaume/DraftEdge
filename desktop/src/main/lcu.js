import fs from 'fs'
import https from 'https'
import { execFile } from 'child_process'

// Emplacements par défaut du lockfile écrit par le client League au démarrage
const LOCKFILE_PATHS = {
  darwin: ['/Applications/League of Legends.app/Contents/LoL/lockfile'],
  win32: ['C:\\Riot Games\\League of Legends\\lockfile', 'D:\\Riot Games\\League of Legends\\lockfile'],
  linux: []
}

export function parseLockfile(content) {
  // Format : name:pid:port:password:protocol
  const [name, pid, port, password, protocol] = content.trim().split(':')
  if (!port || !password) return null
  return { name, pid: Number(pid), port: Number(port), password, protocol: protocol || 'https' }
}

function readLockfile(customPath) {
  const candidates = [customPath, ...(LOCKFILE_PATHS[process.platform] || [])].filter(Boolean)
  for (const p of candidates) {
    try {
      if (!fs.existsSync(p)) continue
      const creds = parseLockfile(fs.readFileSync(p, 'utf8'))
      if (creds) return creds
    } catch (e) {
      // lockfile en cours d'écriture ou illisible : on essaie le suivant
    }
  }
  return null
}

// Fallback : lire les arguments du process LeagueClientUx (--app-port / --remoting-auth-token)
function readFromProcess() {
  return new Promise((resolve) => {
    const isWin = process.platform === 'win32'
    const cmd = isWin ? 'powershell' : 'ps'
    const args = isWin
      ? ['-NoProfile', '-Command', "Get-CimInstance Win32_Process -Filter \"name = 'LeagueClientUx.exe'\" | Select-Object -ExpandProperty CommandLine"]
      : ['-A', '-o', 'args=']
    execFile(cmd, args, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout) => {
      if (err || !stdout) return resolve(null)
      const line = stdout.split('\n').find((l) => l.includes('LeagueClientUx') && l.includes('--app-port='))
      if (!line) return resolve(null)
      const port = line.match(/--app-port=(\d+)/)?.[1]
      const password = line.match(/--remoting-auth-token=([\w-]+)/)?.[1]
      if (!port || !password) return resolve(null)
      resolve({ name: 'LeagueClient', pid: 0, port: Number(port), password, protocol: 'https' })
    })
  })
}

async function discover(customPath) {
  const fromFile = readLockfile(customPath)
  if (fromFile) return fromFile
  return readFromProcess()
}

function request(creds, method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null
    const req = https.request(
      {
        host: '127.0.0.1',
        port: creds.port,
        method,
        path,
        rejectUnauthorized: false, // certificat auto-signé Riot
        headers: {
          Authorization: 'Basic ' + Buffer.from(`riot:${creds.password}`).toString('base64'),
          Accept: 'application/json',
          ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {})
        },
        timeout: 8000
      },
      (res) => {
        let data = ''
        res.on('data', (c) => (data += c))
        res.on('end', () => {
          if (res.statusCode >= 400) return reject(new Error(`LCU ${method} ${path} → ${res.statusCode} ${data.slice(0, 200)}`))
          if (!data) return resolve(null)
          try {
            resolve(JSON.parse(data))
          } catch (e) {
            resolve(data)
          }
        })
      }
    )
    req.on('timeout', () => req.destroy(new Error('LCU timeout')))
    req.on('error', reject)
    if (payload) req.write(payload)
    req.end()
  })
}

export class LcuClient {
  constructor() {
    this.creds = null
    this.summoner = null
    this.customPath = null
    this.listeners = new Set()
    this.timer = null
  }

  onStatus(fn) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  get status() {
    return { connected: !!this.creds, summoner: this.summoner, port: this.creds?.port || null }
  }

  emit() {
    for (const fn of this.listeners) fn(this.status)
  }

  async refresh() {
    const creds = await discover(this.customPath)
    if (!creds) return this.setDisconnected()

    try {
      const summoner = await request(creds, 'GET', '/lol-summoner/v1/current-summoner')
      const wasConnected = !!this.creds
      this.creds = creds
      this.summoner = summoner ? { puuid: summoner.puuid, gameName: summoner.gameName, tagLine: summoner.tagLine, summonerId: summoner.summonerId } : null
      if (!wasConnected || !summoner) this.emit()
    } catch (e) {
      // Le client démarre encore ou l'utilisateur n'est pas loggé : on garde "déconnecté"
      this.setDisconnected()
    }
  }

  setDisconnected() {
    if (!this.creds && !this.summoner) return
    this.creds = null
    this.summoner = null
    this.emit()
  }

  startPolling(intervalMs = 3000) {
    if (this.timer) return
    this.refresh()
    this.timer = setInterval(() => this.refresh(), intervalMs)
  }

  stopPolling() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  get(path) {
    if (!this.creds) throw new Error('League client not connected')
    return request(this.creds, 'GET', path)
  }

  post(path, body) {
    if (!this.creds) throw new Error('League client not connected')
    return request(this.creds, 'POST', path, body)
  }
}

