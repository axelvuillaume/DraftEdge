import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('draftedge', {
  auth: {
    login: (email, password) => ipcRenderer.invoke('auth:login', { email, password }),
    me: () => ipcRenderer.invoke('auth:me'),
    logout: () => ipcRenderer.invoke('auth:logout')
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (patch) => ipcRenderer.invoke('settings:set', patch)
  },
  lcu: {
    status: () => ipcRenderer.invoke('lcu:status'),
    refresh: () => ipcRenderer.invoke('lcu:refresh'),
    history: (opts) => ipcRenderer.invoke('lcu:history', opts),
    champions: () => ipcRenderer.invoke('lcu:champions'),
    onStatus: (cb) => {
      const handler = (_e, status) => cb(status)
      ipcRenderer.on('lcu:status', handler)
      return () => ipcRenderer.removeListener('lcu:status', handler)
    }
  },
  import: {
    run: (payload) => ipcRenderer.invoke('import:run', payload),
    cancel: () => ipcRenderer.invoke('import:cancel'),
    onProgress: (cb) => {
      const handler = (_e, event) => cb(event)
      ipcRenderer.on('import:progress', handler)
      return () => ipcRenderer.removeListener('import:progress', handler)
    }
  },
  update: {
    check: () => ipcRenderer.invoke('update:check'),
    install: () => ipcRenderer.invoke('update:install'),
    version: () => ipcRenderer.invoke('app:version'),
    onStatus: (cb) => {
      const handler = (_e, ev) => cb(ev)
      ipcRenderer.on('update:status', handler)
      return () => ipcRenderer.removeListener('update:status', handler)
    }
  },
  api: {
    get: (path) => ipcRenderer.invoke('api:request', { method: 'GET', path }),
    post: (path, json) => ipcRenderer.invoke('api:request', { method: 'POST', path, json }),
    put: (path, json) => ipcRenderer.invoke('api:request', { method: 'PUT', path, json })
  },
  platform: process.platform
})
