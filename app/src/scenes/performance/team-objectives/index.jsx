import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "react-hot-toast"
import api from "@/services/api"
import useStore from "@/services/store"
import Modal from "@/components/modal"
import {
  Plus,
  Target,
  TrendingUp,
  Trophy,
  AlertTriangle,
  Trash2,
  ChevronDown,
  ChevronUp,
  XCircle,
  CheckCircle2,
  User,
  Users,
  ToggleLeft,
  Pencil,
  Check
} from "lucide-react"
import { ROLES, ROLE_LABELS } from "@/utils"
import DraftScenarioSelect from "@/components/DraftScenarioSelect"
import StratMapSelect from "@/components/StratMapSelect"

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

function getSuccessRateColor(rate) {
  if (rate == null) return "text-slate-500"
  if (rate < 30) return "text-red-400"
  if (rate < 50) return "text-amber-400"
  if (rate < 70) return "text-amber-300"
  return "text-emerald-400"
}

function getSuccessRateBg(rate) {
  if (rate == null) return "bg-slate-700"
  if (rate < 30) return "bg-red-500"
  if (rate < 50) return "bg-amber-500"
  if (rate < 70) return "bg-amber-400"
  return "bg-emerald-500"
}

export default function TeamObjectives() {
  return (
    <div className="min-h-screen bg-slate-900 p-4 lg:p-6">
      <div className="max-w-[1800px] mx-auto space-y-5">
        <ScrimObjectives />
      </div>
    </div>
  )
}

// ==================== SCRIM OBJECTIVES ====================
function ScrimObjectives() {
  const [objectifs, setObjectifs] = useState([])
  const { user } = useStore()
  const [editingObjective, setEditingObjective] = useState(null)

  const fetchObjectifs = async () => {
    try {
      const { ok, data, code } = await api.post("/scrim-objectif/search", { team_id: user?.team_id })
      if (!ok) return toast.error(code || "Failed to fetch objectives")
      setObjectifs(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch objectives")
    }
  }

  useEffect(() => {
    fetchObjectifs()
  }, [user?.team_id])

  const handleDelete = async id => {
    try {
      const { ok, code } = await api.delete(`/scrim-objectif/${id}`)
      if (!ok) return toast.error(code || "Failed to delete objective")
      fetchObjectifs()
    } catch (error) {
      toast.error(error.code || "Failed to delete objective")
    }
  }

  return (
    <>
      <div className="flex items-center justify-end">
        <button
          onClick={() => setEditingObjective({})}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded-lg transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          New Objective Scrim
        </button>
      </div>

      <ScrimStatsPanel objectifs={objectifs} />

      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
        {objectifs.length === 0 ? (
          <div className="relative py-16 px-6 flex flex-col items-center text-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 via-transparent to-transparent pointer-events-none" />
            <div className="relative flex items-center justify-center w-16 h-16 mb-5 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 ring-1 ring-amber-500/20">
              <Target className="w-7 h-7 text-amber-500/80" />
            </div>
            <h3 className="text-white text-base font-semibold mb-1.5">No objectives yet</h3>
            <p className="text-slate-400 text-sm max-w-xs mb-5">Create objectives to track and measure your team&apos;s progress across scrims</p>
            <button
              onClick={() => setEditingObjective({})}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded-lg transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Create your first objective
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/30">
            {objectifs.map(objectif => (
              <ScrimObjectiveRow key={objectif._id} objectif={objectif} onDelete={handleDelete} onEdit={setEditingObjective} />
            ))}
          </div>
        )}
      </div>

      <ScrimObjectifModal isOpen={!!editingObjective} objective={editingObjective} onClose={() => setEditingObjective(null)} onSuccess={fetchObjectifs} />
    </>
  )
}

function ScrimStatsPanel({ objectifs }) {
  const [stats, setStats] = useState({ globalAvg: null, totalEvaluations: 0, best: null, worst: null })
  const { user } = useStore()

  const fetchStats = async () => {
    try {
      const { ok, data, code } = await api.post("/scrim-objectif-result/stats", { team_id: user?.team_id })
      if (!ok) return toast.error(code || "Failed to fetch stats")
      setStats(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch stats")
    }
  }

  useEffect(() => {
    fetchStats()
  }, [user?.team_id])

  if (objectifs.length === 0) return null

  return (
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
        {stats.worst && stats.worst.obj?._id !== stats.best?.obj?._id ? (
          <>
            <span className="text-2xl font-bold tabular-nums text-red-400">{stats.worst.avg.toFixed(1)}</span>
            <p className="text-slate-500 text-xs truncate mt-0.5">{stats.worst.obj?.name}</p>
          </>
        ) : (
          <span className="text-slate-600 text-sm">-</span>
        )}
      </div>
    </div>
  )
}

function ScrimObjectiveRow({ objectif, onDelete, onEdit }) {
  const [results, setResults] = useState([])
  const [expanded, setExpanded] = useState(false)
  const navigate = useNavigate()

  const fetchResults = async () => {
    try {
      const { ok, data, code } = await api.post("/scrim-objectif-result/search", { objectif_id: objectif._id })
      if (!ok) return toast.error(code || "Failed to fetch results")
      setResults(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch results")
    }
  }

  useEffect(() => {
    fetchResults()
  }, [objectif._id])

  const ratings = results.filter(r => r.result != null).map(r => r.result)
  const avg = objectif.rating_type !== "toggle" && ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null
  const toggleRate = objectif.rating_type === "toggle" && ratings.length > 0 ? Math.round((ratings.filter(r => r === 1).length / ratings.length) * 100) : null

  return (
    <div className="group">
      <div className="px-5 py-4 hover:bg-slate-800/40 transition-colors cursor-pointer flex items-center gap-4" onClick={() => setExpanded(e => !e)}>
        <button className="p-0.5 shrink-0">{expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}</button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-white text-sm font-medium truncate">{objectif.name}</h3>
            {objectif.player?.length > 0 ? (
              objectif.player.map(p => (
                <span key={p.id} className="text-xs text-amber-400/80 bg-amber-500/10 px-1.5 py-0.5 rounded font-medium shrink-0">
                  {p.name}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-400 bg-slate-700/50 px-1.5 py-0.5 rounded font-medium shrink-0 flex items-center gap-1">
                <Users className="w-3 h-3" />
                Team
              </span>
            )}
            {objectif.rating_type === "toggle" && <ToggleLeft className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
            {ratings.length > 0 && <span className="text-slate-600 text-xs shrink-0">{ratings.length} evals</span>}
            {objectif.draft_scenario_name && (
              <span
                onClick={e => {
                  e.stopPropagation()
                  if (objectif.draft_scenario_id) navigate(`/performance/draft/${objectif.draft_scenario_id}`)
                }}
                className={`text-xs text-blue-400/80 bg-blue-500/10 px-1.5 py-0.5 rounded font-medium shrink-0 ${objectif.draft_scenario_id ? "hover:text-blue-300 cursor-pointer" : ""}`}
              >
                Draft: {objectif.draft_scenario_name}
              </span>
            )}
            {objectif.strat_map_name && (
              <span
                onClick={e => {
                  e.stopPropagation()
                  if (objectif.strat_map_id) navigate(`/performance/map/${objectif.strat_map_id}`)
                }}
                className={`text-xs text-teal-400/80 bg-teal-500/10 px-1.5 py-0.5 rounded font-medium shrink-0 ${objectif.strat_map_id ? "hover:text-teal-300 cursor-pointer" : ""}`}
              >
                Map: {objectif.strat_map_name}
              </span>
            )}
          </div>
          {objectif.description && <p className="text-slate-500 text-xs mt-0.5 truncate">{objectif.description}</p>}
        </div>
        <div className="w-32 hidden sm:block">
          {objectif.rating_type === "toggle" ? (
            toggleRate != null ? (
              <div className="space-y-1">
                <div className="w-full h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${getSuccessRateBg(toggleRate)}`} style={{ width: `${toggleRate}%` }} />
                </div>
                <div className="text-right">
                  <span className={`text-xs font-bold tabular-nums ${getSuccessRateColor(toggleRate)}`}>{toggleRate}%</span>
                  <span className="text-slate-600 text-xs ml-1">
                    {ratings.filter(r => r === 1).length}/{ratings.length}
                  </span>
                </div>
              </div>
            ) : (
              <span className="text-slate-600 text-xs">No data</span>
            )
          ) : avg != null ? (
            <div className="space-y-1">
              <div className="w-full h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${getRatingBgSolid(Math.round(avg))}`} style={{ width: `${(avg / RATING_MAX) * 100}%` }} />
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
        <button
          onClick={e => {
            e.stopPropagation()
            onEdit(objectif)
          }}
          className="p-1.5 rounded-lg text-slate-600 hover:text-amber-400 hover:bg-amber-500/10 transition-colors opacity-0 group-hover:opacity-100"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={e => {
            e.stopPropagation()
            onDelete(objectif._id)
          }}
          className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-slate-700/30 bg-slate-900/20">
          {objectif.description && (
            <div className="px-5 pt-3 pb-1">
              <p className="text-slate-400 text-xs">{objectif.description}</p>
            </div>
          )}
          {results.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <div className="flex items-center justify-center w-10 h-10 mx-auto mb-2.5 rounded-xl bg-slate-800/80 ring-1 ring-slate-700/50">
                <Target className="w-5 h-5 text-slate-600" />
              </div>
              <p className="text-slate-500 text-sm">No evaluations yet</p>
              <p className="text-slate-600 text-xs mt-0.5">Rate this objective during scrims to track progress</p>
            </div>
          ) : (
            <div className="px-5 py-3 space-y-1">
              {results.map(r => (
                <div key={r._id} className="flex items-center gap-3 rounded-lg px-3 py-2 bg-slate-800/30 hover:bg-slate-800/50 transition-colors">
                  <span className="text-[11px] text-slate-500 shrink-0 w-16 tabular-nums">
                    {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    {r.session_name && (
                      <span
                        onClick={e => {
                          e.stopPropagation()
                          if (r.session_id) navigate(`/performance/scrims/${r.session_id}`)
                        }}
                        className={`text-xs bg-slate-700/40 px-1.5 py-0.5 rounded truncate ${r.session_id ? "text-amber-400/80 hover:text-amber-300 cursor-pointer" : "text-slate-300"}`}
                      >
                        {r.session_name}
                      </span>
                    )}
                    {r.game_name && <span className="text-xs text-slate-500 truncate">{r.game_name}</span>}
                  </div>
                  {r.comment && <span className="text-xs text-slate-500 italic truncate max-w-[200px] hidden lg:block">{r.comment}</span>}
                  {objectif.rating_type === "toggle" ? (
                    r.result === 1 ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Done
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-red-400 font-medium shrink-0">
                        <XCircle className="w-3.5 h-3.5" />
                        Not done
                      </span>
                    )
                  ) : (
                    <span className={`text-xs font-bold tabular-nums shrink-0 ${getRatingText(r.result)}`}>
                      {r.result}/{RATING_MAX}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ScrimObjectifModal({ isOpen, objective, onClose, onSuccess }) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [assignTo, setAssignTo] = useState("team")
  const [selectedPlayerIds, setSelectedPlayerIds] = useState([])
  const [ratingType, setRatingType] = useState("rating")
  const [draftScenarioId, setDraftScenarioId] = useState(null)
  const [draftScenarioName, setDraftScenarioName] = useState(null)
  const [stratMapId, setStratMapId] = useState(null)
  const [stratMapName, setStratMapName] = useState(null)
  const [players, setPlayers] = useState([])
  const { user } = useStore()

  const fetchPlayers = async () => {
    try {
      const { ok, data, code } = await api.post("/player/search", { team_id: user?.team_id, active: true })
      if (!ok) return toast.error(code || "Failed to fetch players")
      setPlayers(data.sort((a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role)))
    } catch (error) {
      toast.error(error.code || "Failed to fetch players")
    }
  }

  useEffect(() => {
    if (isOpen) fetchPlayers()
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || players.length === 0) return
    if (objective?._id) {
      setName(objective.name || "")
      setDescription(objective.description || "")
      setAssignTo(objective.player?.length > 0 ? "player" : "team")
      setSelectedPlayerIds(objective.player?.map(p => p.id) || [])
      setRatingType(objective.rating_type || "rating")
      setDraftScenarioId(objective.draft_scenario_id || null)
      setDraftScenarioName(objective.draft_scenario_name || null)
      setStratMapId(objective.strat_map_id || null)
      setStratMapName(objective.strat_map_name || null)
      return
    }
    setName("")
    setDescription("")
    setAssignTo("team")
    setSelectedPlayerIds([])
    setRatingType("rating")
    setDraftScenarioId(null)
    setDraftScenarioName(null)
    setStratMapId(null)
    setStratMapName(null)
  }, [isOpen, players])

  const togglePlayer = id => {
    setSelectedPlayerIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))
  }

  const buildPlayerArray = () => {
    if (assignTo !== "player") return []
    return selectedPlayerIds.map(id => {
      const p = players.find(x => x._id === id)
      return { id, name: p?.player_name || p?.game_name }
    })
  }

  const handleSubmit = async () => {
    if (!name.trim()) return
    try {
      if (objective?._id) {
        const { ok, code } = await api.put(`/scrim-objectif/${objective._id}`, {
          name,
          description,
          rating_type: ratingType,
          player: buildPlayerArray(),
          draft_scenario_id: draftScenarioId,
          draft_scenario_name: draftScenarioName,
          strat_map_id: stratMapId,
          strat_map_name: stratMapName
        })
        if (!ok) return toast.error(code || "Failed to update objective")
        onClose()
        onSuccess()
        return
      }
      const { ok, code } = await api.post("/scrim-objectif", {
        name,
        description,
        team_id: user?.team_id,
        team_name: user?.team_name,
        rating_type: ratingType,
        player: buildPlayerArray(),
        ...(draftScenarioId && { draft_scenario_id: draftScenarioId, draft_scenario_name: draftScenarioName }),
        ...(stratMapId && { strat_map_id: stratMapId, strat_map_name: stratMapName })
      })
      if (!ok) return toast.error(code || "Failed to add objective")
      onClose()
      onSuccess()
    } catch (error) {
      toast.error(error.code || "Failed to save objective")
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="w-full max-w-md bg-slate-800 p-6">
      <div className="space-y-4">
        <h2 className="text-white font-semibold text-lg">{objective?._id ? "Edit Scrim Objective" : "New Scrim Objective"}</h2>
        <div className="space-y-3">
          <div>
            <label className="text-slate-400 text-xs font-medium mb-1.5 block">Assign to</label>
            <div className="flex gap-2">
              <button
                onClick={() => setAssignTo("team")}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  assignTo === "team" ? "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/50" : "bg-slate-700/50 text-slate-400 hover:text-white"
                }`}
              >
                <Users className="w-4 h-4" />
                Team
              </button>
              <button
                onClick={() => setAssignTo("player")}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  assignTo === "player" ? "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/50" : "bg-slate-700/50 text-slate-400 hover:text-white"
                }`}
              >
                <User className="w-4 h-4" />
                Player
              </button>
            </div>
          </div>
          {assignTo === "player" && players.length > 0 && (
            <div>
              <label className="text-slate-400 text-xs font-medium mb-1.5 block">Players</label>
              <div className="space-y-1 bg-slate-700/30 rounded-lg p-2">
                {players.map(p => (
                  <button
                    key={p._id}
                    type="button"
                    onClick={() => togglePlayer(p._id)}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-sm transition-all ${
                      selectedPlayerIds.includes(p._id) ? "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/40" : "text-slate-300 hover:bg-slate-700/50"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                        selectedPlayerIds.includes(p._id) ? "border-amber-500 bg-amber-500" : "border-slate-500"
                      }`}
                    >
                      {selectedPlayerIds.includes(p._id) && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <span className="text-xs font-bold uppercase text-slate-400">{ROLE_LABELS[p.role] || p.role}</span>
                    <span>{p.player_name || p.game_name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="text-slate-400 text-xs font-medium mb-1.5 block">Name</label>
            <input
              type="text"
              placeholder="e.g. Slow push into dive top"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-slate-700/50 border-0 outline-none ring-0 focus:ring-1 focus:ring-amber-500 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 text-sm"
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
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
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
            />
          </div>
          <div>
            <label className="text-slate-400 text-xs font-medium mb-1.5 block">Rating type</label>
            <div className="flex gap-2">
              <button
                onClick={() => setRatingType("rating")}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  ratingType === "rating" ? "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/50" : "bg-slate-700/50 text-slate-400 hover:text-white"
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                Rating /10
              </button>
              <button
                onClick={() => setRatingType("toggle")}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  ratingType === "toggle" ? "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/50" : "bg-slate-700/50 text-slate-400 hover:text-white"
                }`}
              >
                <ToggleLeft className="w-4 h-4" />
                Done / Not done
              </button>
            </div>
          </div>
          <div>
            <label className="text-slate-400 text-xs font-medium mb-1.5 block">Draft scenario (optional)</label>
            <DraftScenarioSelect
              value={draftScenarioId}
              onChange={(id, n) => {
                setDraftScenarioId(id)
                setDraftScenarioName(n)
              }}
            />
          </div>
          <div>
            <label className="text-slate-400 text-xs font-medium mb-1.5 block">Strat map (optional)</label>
            <StratMapSelect
              value={stratMapId}
              onChange={(id, n) => {
                setStratMapId(id)
                setStratMapName(n)
              }}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 font-semibold rounded-lg transition-colors text-sm"
          >
            {objective?._id ? "Save" : "Add"}
          </button>
        </div>
      </div>
    </Modal>
  )
}

