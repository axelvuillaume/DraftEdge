import { useState, useEffect, useMemo } from "react"
import { toast } from "react-hot-toast"
import api from "@/services/api"
import useStore from "@/services/store"
import Modal from "@/components/modal"
import { useNavigate } from "react-router-dom"
import { Plus, Target, TrendingUp, Trophy, AlertTriangle, Trash2, ChevronRight } from "lucide-react"

const RATING_MAX = 10

function getRatingText(value) {
  if (!value) return "text-slate-500"
  if (value <= 3) return "text-red-400"
  if (value <= 5) return "text-amber-400"
  if (value <= 7) return "text-amber-300"
  return "text-emerald-400"
}

function getRatingBgSolid(value) {
  if (!value) return "bg-slate-700"
  if (value <= 3) return "bg-red-500"
  if (value <= 5) return "bg-amber-500"
  if (value <= 7) return "bg-amber-400"
  return "bg-emerald-500"
}

function getRatingBg(value) {
  if (!value) return "bg-slate-700/40"
  if (value <= 3) return "bg-red-500/20"
  if (value <= 5) return "bg-amber-500/15"
  if (value <= 7) return "bg-amber-400/15"
  return "bg-emerald-500/20"
}

export default function List() {
  const navigate = useNavigate()
  const [objectifs, setObjectifs] = useState([])
  const [teamResults, setTeamResults] = useState([])
  const [sessions, setSessions] = useState([])
  const { user, globalFilters } = useStore()
  const [showAddObjectifModal, setShowAddObjectifModal] = useState(false)
  const [showAddSessionModal, setShowAddSessionModal] = useState(false)
  const [showSessions, setShowSessions] = useState(false)

  const fetchObjectifs = async () => {
    try {
      const { ok, data, code } = await api.post("/scrim-objectif/search", { team_id: user?.team_id })
      if (!ok) return toast.error(code)
      setObjectifs(data)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const fetchTeamResults = async () => {
    try {
      const { ok, data, code } = await api.post("/scrim-objectif-result/search", { team_id: user?.team_id, ...(globalFilters.patch && { patch: globalFilters.patch }) })
      if (!ok) return toast.error(code)
      setTeamResults(data)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const fetchSessions = async () => {
    try {
      const { ok, data, code } = await api.post("/scrim-session/search", {
        team_id: user?.team_id,
        ...(globalFilters.patch && { patch: globalFilters.patch }),
        ...(globalFilters.opponent_name && { opponent: globalFilters.opponent_name })
      })
      if (!ok) return toast.error(code)
      setSessions(data)
    } catch (error) {
      toast.error(error.message)
    }
  }

  useEffect(() => {
    fetchObjectifs()
    fetchTeamResults()
    fetchSessions()
  }, [user?.team_id, globalFilters.patch, globalFilters.opponent_name])

  const handleDelete = async id => {
    try {
      const { ok, code } = await api.delete(`/scrim-objectif/${id}`)
      if (!ok) return toast.error(code)
      fetchObjectifs()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleDeleteSession = async id => {
    if (!window.confirm("Are you sure you want to delete this session?")) return
    try {
      const { ok, code } = await api.delete(`/scrim-session/${id}`)
      if (!ok) return toast.error(code)
      fetchSessions()
    } catch (error) {
      toast.error(error.message)
    }
  }
  // Compute aggregated stats
  const stats = useMemo(() => {
    let allRatings = []
    const byObjectif = {}

    for (const obj of objectifs) {
      byObjectif[obj._id] = { ratings: [], results: [] }
    }

    for (const result of teamResults) {
      const bucket = byObjectif[result.objectif_id]
      if (!bucket) continue
      if (result.result != null) bucket.ratings.push(result.result)
      bucket.results.push(result)
    }

    for (const [id, bucket] of Object.entries(byObjectif)) {
      const avg = bucket.ratings.length > 0 ? bucket.ratings.reduce((a, b) => a + b, 0) / bucket.ratings.length : null
      byObjectif[id] = {
        ...bucket,
        avg,
        count: bucket.ratings.length
      }
      allRatings = allRatings.concat(bucket.ratings)
    }

    const globalAvg = allRatings.length > 0 ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length : null

    const sorted = Object.entries(byObjectif)
      .filter(([, v]) => v.avg != null)
      .sort((a, b) => b[1].avg - a[1].avg)

    const best = sorted[0] ? { id: sorted[0][0], ...sorted[0][1], obj: objectifs.find(o => o._id === sorted[0][0]) } : null
    const worst = sorted[sorted.length - 1]
      ? { id: sorted[sorted.length - 1][0], ...sorted[sorted.length - 1][1], obj: objectifs.find(o => o._id === sorted[sorted.length - 1][0]) }
      : null

    return { globalAvg, totalEvaluations: allRatings.length, byObjectif, best, worst }
  }, [objectifs, teamResults])

  return (
    <div className="min-h-screen bg-slate-900 p-4 lg:p-6">
      <div className="max-w-[1200px] mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white font-bold text-xl tracking-tight">Scrim Hub</h1>
            <p className="text-slate-500 text-sm mt-0.5">Track and improve your team objectives across scrim sessions</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddObjectifModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors text-sm border border-slate-700"
            >
              <Plus className="w-4 h-4" />
              Objective
            </button>
            <button
              onClick={() => setShowAddSessionModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded-lg transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              New Session
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        {objectifs.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-amber-500" />
                <span className="text-slate-400 text-xs font-medium">Objectives</span>
              </div>
              <span className="text-2xl font-bold text-white tabular-nums">{objectifs.length}</span>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-amber-500" />
                <span className="text-slate-400 text-xs font-medium">Avg Score</span>
              </div>
              {stats.globalAvg != null ? (
                <div className="flex items-baseline gap-1">
                  <span className={`text-2xl font-bold tabular-nums ${getRatingText(Math.round(stats.globalAvg))}`}>{stats.globalAvg.toFixed(1)}</span>
                  <span className="text-slate-600 text-sm">/{RATING_MAX}</span>
                </div>
              ) : (
                <span className="text-slate-600 text-sm">-</span>
              )}
            </div>

            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-400 text-xs font-medium">Best</span>
              </div>
              {stats.best ? (
                <>
                  <span className="text-2xl font-bold tabular-nums text-emerald-400">{stats.best.avg.toFixed(1)}</span>
                  <p className="text-slate-500 text-xs truncate mt-0.5">{stats.best.obj?.name}</p>
                </>
              ) : (
                <span className="text-slate-600 text-sm">-</span>
              )}
            </div>

            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-slate-400 text-xs font-medium">Needs Work</span>
              </div>
              {stats.worst && stats.worst.id !== stats.best?.id ? (
                <>
                  <span className="text-2xl font-bold tabular-nums text-red-400">{stats.worst.avg.toFixed(1)}</span>
                  <p className="text-slate-500 text-xs truncate mt-0.5">{stats.worst.obj?.name}</p>
                </>
              ) : (
                <span className="text-slate-600 text-sm">-</span>
              )}
            </div>
          </div>
        )}

        {/* Objectives List */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-700/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-amber-500" />
              <div className="flex items-center bg-slate-800/70 border border-slate-700 rounded-lg p-0.5">
                <button
                  onClick={() => setShowSessions(false)}
                  className={`px-2.5 py-1 text-xs rounded-md transition-colors ${!showSessions ? "bg-amber-500 text-slate-900 font-semibold" : "text-slate-300 hover:text-white"}`}
                >
                  Objectives Overview
                </button>
                <button
                  onClick={() => setShowSessions(true)}
                  className={`px-2.5 py-1 text-xs rounded-md transition-colors ${showSessions ? "bg-amber-500 text-slate-900 font-semibold" : "text-slate-300 hover:text-white"}`}
                >
                  Scrim sessions
                </button>
              </div>
            </div>
            <span className="text-slate-500 text-xs">{showSessions ? `${sessions.length} sessions` : `${stats.totalEvaluations} evaluations`}</span>
          </div>

          {showSessions ? (
            sessions.length === 0 ? (
              <div className="p-12 text-center">
                <Target className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No scrim sessions yet</p>
                <p className="text-slate-600 text-xs mt-1">Create a new session to start reviewing</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-700/30">
                {sessions.map(session => (
                  <button key={session._id} onClick={() => navigate(`/scrim-hub/${session._id}`)} className="w-full text-left px-5 py-4 hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">{session.name || "Untitled session"}</p>
                        <p className="text-slate-500 text-xs mt-0.5 truncate">
                          {session.date || "No date"} {session.opponent ? `• vs ${session.opponent}` : ""}
                        </p>
                      </div>
                      <Trash2
                        className="w-4 h-4 text-slate-500 hover:text-red-500 transition-colors cursor-pointer"
                        onClick={e => (e.stopPropagation(), handleDeleteSession(session._id))}
                        title="Delete session"
                      />
                    </div>
                  </button>
                ))}
              </div>
            )
          ) : objectifs.length === 0 ? (
            <div className="p-12 text-center">
              <Target className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No objectives yet</p>
              <p className="text-slate-600 text-xs mt-1">Add objectives to track your team&apos;s improvement</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/30">
              {objectifs.map(objectif => {
                return (
                  <div key={objectif._id} className="px-5 py-4 hover:bg-slate-800/40 transition-colors group">
                    <ObjectifOverviewRow objectif={objectif} onDelete={handleDelete} />
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Quick action */}
        <button
          onClick={() => setShowAddSessionModal(true)}
          className="w-full flex items-center justify-between px-5 py-4 bg-slate-800/40 border border-slate-700/30 border-dashed rounded-xl hover:border-amber-500/30 hover:bg-amber-500/5 transition-all group"
        >
          <div className="flex items-center gap-3">
            <Plus className="w-5 h-5 text-slate-500 group-hover:text-amber-500 transition-colors" />
            <span className="text-slate-400 group-hover:text-slate-200 text-sm transition-colors">Start a new scrim session review</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-amber-500 transition-colors" />
        </button>

        <AddObjectifModal isOpen={showAddObjectifModal} onClose={() => setShowAddObjectifModal(false)} onSuccess={fetchObjectifs} />
        <AddSessionModal isOpen={showAddSessionModal} onClose={() => setShowAddSessionModal(false)} onSuccess={sessionId => navigate(`/scrim-hub/${sessionId}`)} />
      </div>
    </div>
  )
}

function ObjectifOverviewRow({ objectif, onDelete }) {
  const [results, setResults] = useState([])
  const fetchResults = async () => {
    try {
      const { ok, data, code } = await api.post("/scrim-objectif-result/search", { objectif_id: objectif._id })
      if (!ok) return toast.error(code)
      setResults(data)
    } catch (error) {
      toast.error(error.message)
    }
  }

  useEffect(() => {
    fetchResults()
  }, [objectif._id])

  const ratings = results.filter(r => r.result != null).map(r => r.result)
  const avg = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null
  return (
    <div className="flex items-center gap-4">
      {/* Name + description */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-white text-sm font-medium truncate">{objectif.name}</h3>
          {ratings.length > 0 && <span className="text-slate-600 text-xs">{ratings.length} evals</span>}
        </div>
        {objectif.description && <p className="text-slate-500 text-xs mt-0.5 truncate">{objectif.description}</p>}
      </div>
      {/* Progress bar + avg */}
      <div className="w-32 hidden sm:block">
        {avg != null ? (
          <div className="space-y-1">
            <div className="w-full h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${getRatingBgSolid(Math.round(avg))}`} style={{ width: `${avg != null ? (avg / RATING_MAX) * 100 : 0}%` }} />
            </div>
            <div className="text-right">
              <span className={`text-xs font-bold tabular-nums ${getRatingText(Math.round(avg))}`}>{avg.toFixed(1)}</span>
              <span className="text-slate-600 text-xs">/{RATING_MAX}</span>
            </div>
          </div>
        ) : (
          <span className="text-slate-600 text-xs">No data</span>
        )}
      </div>

      {/* Delete */}
      <button
        onClick={() => onDelete(objectif._id)}
        className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

function AddObjectifModal({ isOpen, onClose, onSuccess }) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const { user } = useStore()

  const handleAdd = async () => {
    if (!name.trim()) return
    try {
      const { ok, code } = await api.post("/scrim-objectif", { name, description, team_id: user?.team_id, team_name: user?.team_name })
      if (!ok) return toast.error(code)
      setName("")
      setDescription("")
      onClose()
      onSuccess()
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="w-full max-w-md bg-slate-800 p-6">
      <div className="space-y-4">
        <h2 className="text-white font-semibold text-lg">New Objective</h2>
        <div className="space-y-3">
          <div>
            <label className="text-slate-400 text-xs font-medium mb-1.5 block">Name</label>
            <input
              type="text"
              placeholder="e.g. Slow push into dive top"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-slate-700/50 border-0 outline-none ring-0 focus:ring-1 focus:ring-amber-500 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 text-sm"
              onKeyDown={e => e.key === "Enter" && handleAdd()}
              autoFocus
            />
          </div>
          <div>
            <label className="text-slate-400 text-xs font-medium mb-1.5 block">Description (optional)</label>
            <input
              type="text"
              placeholder="Brief description of the objective..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-slate-700/50 border-0 outline-none ring-0 focus:ring-1 focus:ring-amber-500 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 text-sm"
              onKeyDown={e => e.key === "Enter" && handleAdd()}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={handleAdd}
            disabled={!name.trim()}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 font-semibold rounded-lg transition-colors text-sm"
          >
            Add
          </button>
        </div>
      </div>
    </Modal>
  )
}

function AddSessionModal({ isOpen, onClose, onSuccess }) {
  const [name, setName] = useState("")

  const handleAdd = async () => {
    if (!name.trim()) return
    try {
      const { ok, data, code } = await api.post("/scrim-session", { name })
      if (!ok) return toast.error(code)
      setName("")
      onClose()
      onSuccess(data._id)
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="w-full max-w-md bg-slate-800 p-6">
      <div className="space-y-4">
        <h2 className="text-white font-semibold text-lg">New Session</h2>
        <div>
          <label className="text-slate-400 text-xs font-medium mb-1.5 block">Name</label>
          <input
            type="text"
            placeholder="e.g. Scrim vs Team B"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-slate-700/50 border-0 outline-none ring-0 focus:ring-1 focus:ring-amber-500 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 text-sm"
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={handleAdd}
            disabled={!name.trim()}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 font-semibold rounded-lg transition-colors text-sm"
          >
            Create
          </button>
        </div>
      </div>
    </Modal>
  )
}
