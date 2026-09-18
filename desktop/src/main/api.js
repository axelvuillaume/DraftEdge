// Client HTTP vers l'API DraftEdge (même convention que app/src/services/api.js : header "JWT <token>")
export class DraftEdgeApi {
  constructor(store) {
    this.store = store
  }

  get baseUrl() {
    return (this.store.get('apiUrl') || '').replace(/\/$/, '')
  }

  headers(extra = {}) {
    const token = this.store.getToken()
    return { ...(token ? { Authorization: `JWT ${token}` } : {}), ...extra }
  }

  async request(method, path, { json, formData } = {}) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: this.headers(json ? { 'Content-Type': 'application/json' } : {}),
      body: json ? JSON.stringify(json) : formData || undefined
    })
    let data = null
    try {
      data = await res.json()
    } catch (e) {
      data = { ok: false, code: `HTTP ${res.status}` }
    }
    if (res.status === 401) data = { ...data, ok: false, code: data.code || 'UNAUTHORIZED', status: 401 }
    return data
  }

  get(path) {
    return this.request('GET', path)
  }

  post(path, json) {
    return this.request('POST', path, { json })
  }

  put(path, json) {
    return this.request('PUT', path, { json })
  }

  postFormData(path, formData) {
    return this.request('POST', path, { formData })
  }

  async login(email, password) {
    const res = await this.post('/user/signin', { email, password })
    if (res.ok && res.token) this.store.setToken(res.token)
    return res
  }

  // Valide le token stocké et le renouvelle
  async me() {
    if (!this.store.getToken()) return { ok: false, code: 'NO_TOKEN' }
    const res = await this.get('/user/signin_token')
    if (res.ok && res.token) this.store.setToken(res.token)
    if (res.status === 401) this.store.setToken(null)
    return res
  }

  logout() {
    this.store.setToken(null)
    return { ok: true }
  }
}

