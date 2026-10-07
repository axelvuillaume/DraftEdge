// Même interface que app/src/services/api.js, derrière le pont IPC : le token JWT vit dans le process principal
const api = {
  get: (path) => window.draftedge.api.get(path),
  post: (path, body) => window.draftedge.api.post(path, body),
  put: (path, body) => window.draftedge.api.put(path, body)
}

export default api
