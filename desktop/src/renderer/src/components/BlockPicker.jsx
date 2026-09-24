import { useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function BlockPicker({ user, value, onChange }) {
  const [sessions, setSessions] = useState([])
  const [enemies, setEnemies] = useState([])
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', opponentId: '', date: new Date().toISOString().slice(0, 10) })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const [s, e] = await Promise.all([window.draftedge.api.post('/scrim-session/search', { team_id: user.team_id }), window.draftedge.api.post('/enemy-team/search', { team_id: user.team_id, limit: 200 })])
    if (s.ok) setSessions(s.data)
    if (e.ok) setEnemies(e.data)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.team_id])

  async function create(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    const opponent = enemies.find((x) => x._id === form.opponentId)
    const res = await window.draftedge.api.post('/scrim-session', {
      name: form.name.trim(),
      opponent_id: opponent?._id,
      opponent_name: opponent?.name,
      date: new Date(form.date).toISOString()
    })
    setSaving(false)
    if (!res.ok) return setError(res.code || 'Could not create session')
    setSessions((prev) => [res.data, ...prev])
    onChange(res.data)
    setCreating(false)
    setForm({ name: '', opponentId: '', date: new Date().toISOString().slice(0, 10) })
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Scrim session</h2>
        <button onClick={() => setCreating((v) => !v)} className="text-xs flex items-center gap-1 text-slate-400 hover:text-white">
          {creating ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
          {creating ? 'Cancel' : 'New session'}
        </button>
      </div>

      {!creating && (
        <select value={value?._id || ''} onChange={(e) => onChange(sessions.find((s) => s._id === e.target.value) || null)} className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm focus:outline-none focus:border-amber-500">
          <option value="">Pick a session…</option>
          {sessions.map((s) => (
            <option key={s._id} value={s._id}>
              {formatDate(s.date)} · {s.name || 'Untitled'}
              {s.opponent_name ? ` vs ${s.opponent_name}` : ''}
            </option>
          ))}
        </select>
      )}

      {creating && (
        <form onSubmit={create} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input placeholder="Session name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
          <select value={form.opponentId} onChange={(e) => setForm({ ...form, opponentId: e.target.value })} className="rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm focus:outline-none focus:border-amber-500">
            <option value="">Opponent…</option>
            {enemies.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="flex-1 rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
            <button type="submit" disabled={saving || !form.name.trim()} className="rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 font-semibold px-3 text-sm">
              {saving ? '…' : 'Create'}
            </button>
          </div>
          {error && <p className="text-xs text-red-400 sm:col-span-3">{error}</p>}
        </form>
      )}

      {value && (
        <p className="text-xs text-slate-400">
          {value.opponent_name ? (
            <>
              Opponent <span className="text-slate-200">{value.opponent_name}</span> ·{' '}
            </>
          ) : (
            <span className="text-amber-400">No opponent set · </span>
          )}
          {formatDate(value.date)}
          {value.patch ? ` · patch ${value.patch}` : ''}
        </p>
      )}
    </div>
  )
}
