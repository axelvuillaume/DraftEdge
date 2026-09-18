import { useState } from 'react'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await window.draftedge.auth.login(email, password)
    setLoading(false)
    if (!res.ok) {
      if (res.code === 'UNAUTHORIZED' || res.status === 401) return setError('Email ou mot de passe invalide')
      if (res.code === 'NETWORK_ERROR') return setError(`Serveur injoignable (${res.details}). Vérifie ta connexion internet.`)
      return setError(`Connexion impossible (${res.code || 'erreur inconnue'})`)
    }
    onLogin(res.user)
  }

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Connexion</h1>
          <p className="text-slate-400 text-sm mt-1">Utilise ton compte DraftEdge.</p>
        </div>

        <label className="block">
          <span className="text-xs text-slate-400">Email</span>
          <input type="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
        </label>
        <label className="block">
          <span className="text-xs text-slate-400">Mot de passe</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button type="submit" disabled={loading || !email || !password} className="w-full rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 font-semibold py-2 text-sm">
          {loading ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </div>
  )
}
