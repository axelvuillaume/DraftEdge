import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import api from "@/services/api"
import useStore from "@/services/store"
import Modal from "@/components/modal"
import { useNavigate } from "react-router-dom"
import OpponentDropdown from "@/components/OpponentDropdown"
import { Plus, Target, Trash2, ChevronDown, Search, X, Calendar, Trophy } from "lucide-react"

function formatDate(value) {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export default function List() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const { user } = useStore()
  const [showAddSessionModal, setShowAddSessionModal] = useState(false)
  const [filters, setFilters] = useState({ search: "", patch: "", opponent_name: "" })

  const fetchSessions = async () => {
    try {
      const { ok, data, code } = await api.post("/scrim-session/search", { team_id: user?.team_id, ...filters })
      if (!ok) return toast.error(code || "Failed to fetch sessions")
      setSessions(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch sessions")
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [filters])

  const handleDeleteSession = async (e, id) => {
    e.stopPropagation()
    if (!window.confirm("Are you sure you want to delete this session?")) return
    try {
      const { ok, code } = await api.delete(`/scrim-session/${id}`)
      if (!ok) return toast.error(code || "Failed to delete session")
      fetchSessions()
    } catch (error) {
      toast.error(error.code || "Failed to delete session")
    }
  }

  return (
    <div className="h-full overflow-hidden bg-slate-900 p-4 lg:p-6 flex flex-col">
      <div className="w-full mx-auto flex flex-col gap-4 min-h-0 flex-1">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="w-5 h-5 text-amber-500" />
            <h1 className="text-white text-lg font-semibold">Scrim Sessions</h1>
            <span className="text-slate-500 text-sm">{sessions.length} total</span>
          </div>
          <button
            onClick={() => setShowAddSessionModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded-lg transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            New Session
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search sessions..."
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              className="w-full pl-9 pr-3 py-2 bg-slate-800/60 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 text-sm outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
            />
          </div>

          <PatchFilterDropdown value={filters.patch} onChange={v => setFilters(f => ({ ...f, patch: v }))} />
          <OpponentFilterDropdown value={filters.opponent_name} onChange={v => setFilters(f => ({ ...f, opponent_name: v }))} />

          {(filters.patch || filters.opponent_name || filters.search.trim()) && (
            <button
              onClick={() => setFilters({ search: "", patch: "", opponent_name: "" })}
              className="flex items-center gap-1.5 px-3 py-2 text-slate-400 hover:text-white text-sm transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
          )}

          {sessions.reduce((sum, s) => sum + (s.win || 0) + (s.loss || 0), 0) > 0 && (
            <div className="ml-auto flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-emerald-400 font-medium">{sessions.reduce((sum, s) => sum + (s.win || 0), 0)}W</span>
                <span className="text-slate-600">-</span>
                <span className="text-red-400 font-medium">{sessions.reduce((sum, s) => sum + (s.loss || 0), 0)}L</span>
              </div>
              <span
                className={`font-semibold tabular-nums ${
                  Math.round((sessions.reduce((sum, s) => sum + (s.win || 0), 0) / sessions.reduce((sum, s) => sum + (s.win || 0) + (s.loss || 0), 0)) * 100) >= 50
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {Math.round((sessions.reduce((sum, s) => sum + (s.win || 0), 0) / sessions.reduce((sum, s) => sum + (s.win || 0) + (s.loss || 0), 0)) * 100)}%
              </span>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-y-auto min-h-0 flex-1">
          {sessions.length === 0 ? (
            <div className="p-16 text-center">
              <Target className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">
                {filters.patch || filters.opponent_name || filters.search.trim() ? "No sessions match your filters" : "No scrim sessions yet"}
              </p>
              {!(filters.patch || filters.opponent_name || filters.search.trim()) && <p className="text-slate-600 text-xs mt-1">Create a new session to start reviewing</p>}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left text-slate-500 text-[11px] font-medium uppercase tracking-wider px-5 py-3">Session</th>
                  <th className="text-left text-slate-500 text-[11px] font-medium uppercase tracking-wider px-4 py-3">Date</th>
                  <th className="text-left text-slate-500 text-[11px] font-medium uppercase tracking-wider px-4 py-3">Opponent</th>
                  <th className="text-center text-slate-500 text-[11px] font-medium uppercase tracking-wider px-4 py-3">Record</th>
                  <th className="text-center text-slate-500 text-[11px] font-medium uppercase tracking-wider px-4 py-3">WR</th>
                  <th className="text-left text-slate-500 text-[11px] font-medium uppercase tracking-wider px-4 py-3">Patch</th>

                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {sessions.map(session => (
                  <tr key={session._id} onClick={() => navigate(`/scrim-hub/scrims/${session._id}`)} className="hover:bg-slate-700/20 transition-colors cursor-pointer group">
                    <td className="px-5 py-3.5">
                      <span className="text-white text-sm font-medium">{session.name || "Untitled session"}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 text-slate-400 text-sm">
                        <Calendar className="w-3.5 h-3.5 text-slate-600" />
                        {formatDate(session.date)}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {session.opponent_name ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-sm text-slate-300">{session.opponent_name}</span>
                      ) : (
                        <span className="text-slate-600 text-sm">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      {(session.win || 0) + (session.loss || 0) > 0 ? (
                        <span className="text-sm tabular-nums">
                          <span className="text-emerald-400 font-medium">{session.win || 0}</span>
                          <span className="text-slate-600 mx-0.5">-</span>
                          <span className="text-red-400 font-medium">{session.loss || 0}</span>
                        </span>
                      ) : (
                        <span className="text-slate-600 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {(session.win || 0) + (session.loss || 0) > 0 && session.winrate != null ? (
                        <span className={`text-sm font-semibold tabular-nums ${session.winrate >= 50 ? "text-emerald-400" : "text-red-400"}`}>{session.winrate}%</span>
                      ) : (
                        <span className="text-slate-600 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {session.patch ? (
                        <span className="font-mono text-xs text-slate-300 px-2 py-0.5 rounded">{session.patch?.split(".").slice(0, 2).join(".")}</span>
                      ) : (
                        <span className="text-slate-600 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3.5">
                      <button
                        onClick={e => handleDeleteSession(e, session._id)}
                        className="p-1.5 rounded-md text-slate-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                        title="Delete session"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <AddSessionModal isOpen={showAddSessionModal} onClose={() => setShowAddSessionModal(false)} onSuccess={sessionId => navigate(`/scrim-hub/scrims/${sessionId}`)} />
      </div>
    </div>
  )
}

function PatchFilterDropdown({ value, onChange }) {
  const { user } = useStore()
  const [open, setOpen] = useState(false)
  const [patches, setPatches] = useState([])

  const fetchPatches = async () => {
    try {
      const { ok, data, code } = await api.post("/scrim-session/patches", { team_id: user?.team_id })
      if (!ok) return toast.error(code || "Failed to fetch patches")
      setPatches(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch patches")
    }
  }

  useEffect(() => {
    fetchPatches()
  }, [user?.team_id])

  if (patches.length === 0) return null

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
          value ? "bg-amber-500/10 border-amber-500/30 text-amber-400" : "bg-slate-800/60 border-slate-700/50 text-slate-400 hover:border-slate-600"
        }`}
      >
        <span>{value || "Patch"}</span>
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 overflow-hidden">
            <div className="max-h-56 overflow-y-auto p-1">
              <button
                onClick={() => {
                  onChange("")
                  setOpen(false)
                }}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${!value ? "bg-amber-500/20 text-amber-400" : "text-slate-400 hover:bg-slate-700/50"}`}
              >
                All Patches
              </button>
              {patches.map(p => (
                <button
                  key={p}
                  onClick={() => {
                    onChange(p)
                    setOpen(false)
                  }}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${value === p ? "bg-amber-500/20 text-amber-400" : "text-slate-300 hover:bg-slate-700/50"}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function OpponentFilterDropdown({ value, onChange }) {
  const { user } = useStore()
  const [open, setOpen] = useState(false)
  const [opponents, setOpponents] = useState([])

  const fetchOpponents = async () => {
    try {
      const { ok, data, code } = await api.post("/enemy-team/search", { team_id: user?.team_id })
      if (!ok) return toast.error(code || "Failed to fetch opponents")
      setOpponents(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch opponents")
    }
  }

  useEffect(() => {
    fetchOpponents()
  }, [user?.team_id])

  if (opponents.length === 0) return null

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
          value ? "bg-amber-500/10 border-amber-500/30 text-amber-400" : "bg-slate-800/60 border-slate-700/50 text-slate-400 hover:border-slate-600"
        }`}
      >
        <span>{value || "Opponent"}</span>
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 overflow-hidden">
            <div className="max-h-56 overflow-y-auto p-1">
              <button
                onClick={() => {
                  onChange("")
                  setOpen(false)
                }}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${!value ? "bg-amber-500/20 text-amber-400" : "text-slate-400 hover:bg-slate-700/50"}`}
              >
                All Opponents
              </button>
              {opponents.map(t => (
                <button
                  key={t._id}
                  onClick={() => {
                    onChange(t.name)
                    setOpen(false)
                  }}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${value === t.name ? "bg-amber-500/20 text-amber-400" : "text-slate-300 hover:bg-slate-700/50"}`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function AddSessionModal({ isOpen, onClose, onSuccess }) {
  const [form, setForm] = useState({ name: "", opponent: null, date: new Date().toISOString().slice(0, 10) })
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    if (!form.name.trim()) return toast.error("Session name is required")
    if (!form.opponent?._id) return toast.error("Select an opponent")
    setCreating(true)
    try {
      const { ok, data, code } = await api.post("/scrim-session", {
        name: form.name.trim(),
        opponent_id: form.opponent?._id,
        opponent_name: form.opponent?.name,
        date: form.date ? new Date(form.date).toISOString() : undefined
      })
      if (!ok) return toast.error(code || "Failed to create session")
      setForm({ name: "", opponent: null, date: new Date().toISOString().slice(0, 10) })
      onClose()
      onSuccess(data._id)
    } catch (error) {
      toast.error(error.code || "Failed to create session")
    } finally {
      setCreating(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="w-full max-w-md bg-slate-800 p-6">
      <div className="space-y-4">
        <h2 className="text-white font-semibold text-lg">New Scrim Session</h2>
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Session Name *</label>
          <input
            type="text"
            placeholder="e.g. Scrim vs Team B - Week 5"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            autoFocus
            className="w-full px-3 py-2.5 rounded-lg border border-slate-600 bg-slate-700/50 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none transition-all"
          />
        </div>
        <OpponentDropdown value={form.opponent?.name || ""} onChange={v => setForm(f => ({ ...f, opponent: v }))} label="Opponent Team *" />
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Date</label>
          <input
            type="date"
            value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-600 bg-slate-700/50 text-white focus:border-blue-500 focus:outline-none transition-all [color-scheme:dark]"
          />
        </div>
        <div className="flex justify-end pt-2">
          <button
            onClick={handleCreate}
            disabled={creating || !form.name.trim() || !form.opponent?._id}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 font-semibold rounded-lg transition-colors text-sm"
          >
            {creating ? "Creating..." : "Create Session"}
          </button>
        </div>
      </div>
    </Modal>
  )
}
