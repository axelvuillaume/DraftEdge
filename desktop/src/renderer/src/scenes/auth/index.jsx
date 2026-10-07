import { useState } from 'react'
import { toast } from 'react-hot-toast'

export default function Auth({ onLogin }) {
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { ok, code, status, details, user } = await window.draftedge.auth.login(form.email, form.password)
      setLoading(false)
      if (code === 'UNAUTHORIZED' || status === 401) return toast.error('Invalid email or password')
      if (code === 'NETWORK_ERROR') return toast.error(`Server unreachable (${details}). Check your internet connection.`)
      if (!ok) return toast.error(code || 'Login failed')
      onLogin(user)
    } catch (error) {
      setLoading(false)
      toast.error(error.code || 'Login failed')
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Log in</h1>
          <p className="text-slate-400 text-sm mt-1">Use your DraftEdge account.</p>
        </div>

        <label className="block">
          <span className="text-xs text-slate-400">Email</span>
          <input type="email" autoFocus value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} className="mt-1 w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
        </label>
        <label className="block">
          <span className="text-xs text-slate-400">Password</span>
          <input type="password" value={form.password} onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} className="mt-1 w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
        </label>

        <button type="submit" disabled={loading || !form.email || !form.password} className="w-full rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 font-semibold py-2 text-sm">
          {loading ? 'Logging in…' : 'Log in'}
        </button>
      </form>
    </div>
  )
}
