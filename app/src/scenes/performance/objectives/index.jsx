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
  Swords,
  Gamepad2,
  ChevronDown,
  ChevronUp,
  XCircle,
  CheckCircle2,
  User,
  Users,
  ToggleLeft,
  Search,
  X,
  Pencil
} from "lucide-react"
import { ROLES, ROLE_LABELS, ALL_CHAMPIONS, getChampionIcon } from "@/utils"
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

export default function Objectives() {
  const [tab, setTab] = useState("scrim")

  return (
    <div className="min-h-screen bg-slate-900 p-4 lg:p-6">
      <div className="max-w-[1800px] mx-auto space-y-5">
        <div className="flex items-center gap-1 bg-slate-800/60 border border-slate-700/50 rounded-lg p-1 w-fit">
          <button
            onClick={() => setTab("scrim")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              tab === "scrim" ? "bg-amber-500 text-slate-900" : "text-slate-400 hover:text-white"
            }`}
          >
            <Swords className="w-4 h-4" />
            Scrim
          </button>
          <button
            onClick={() => setTab("soloq")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              tab === "soloq" ? "bg-violet-500 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
            SoloQ
          </button>
        </div>

        {tab === "scrim" ? <ScrimObjectives /> : <SoloQObjectives />}
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
          <div className="p-12 text-center">
            <Target className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No objectives yet</p>
            <p className="text-slate-600 text-xs mt-1">Add objectives to track your team&apos;s improvement</p>
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
            {objectif.player_name ? (
              <span className="text-xs text-amber-400/80 bg-amber-500/10 px-1.5 py-0.5 rounded font-medium shrink-0">{objectif.player_name}</span>
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
                  if (objectif.draft_scenario_id) navigate(`/scrim-hub/draft/${objectif.draft_scenario_id}`)
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
                  if (objectif.strat_map_id) navigate(`/scrim-hub/map/${objectif.strat_map_id}`)
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
              <Target className="w-8 h-8 text-slate-700 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No evaluations yet</p>
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
                          if (r.session_id) navigate(`/scrim-hub/scrims/${r.session_id}`)
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
  const [playerId, setPlayerId] = useState("")
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
      setAssignTo(objective.player_id ? "player" : "team")
      setPlayerId(objective.player_id || players[0]._id)
      setRatingType(objective.rating_type || "rating")
      setDraftScenarioId(objective.draft_scenario_id || null)
      setDraftScenarioName(objective.draft_scenario_name || null)
      setStratMapId(objective.strat_map_id || null)
      setStratMapName(objective.strat_map_name || null)
    } else {
      setName("")
      setDescription("")
      setAssignTo("team")
      setPlayerId(players[0]._id)
      setRatingType("rating")
      setDraftScenarioId(null)
      setDraftScenarioName(null)
      setStratMapId(null)
      setStratMapName(null)
    }
  }, [isOpen, players])

  const handleSubmit = async () => {
    if (!name.trim()) return
    try {
      const selectedPlayer = players.find(p => p._id === playerId)
      if (objective?._id) {
        const { ok, code } = await api.put(`/scrim-objectif/${objective._id}`, {
          name,
          description,
          rating_type: ratingType,
          player_id: assignTo === "player" && playerId ? playerId : null,
          player_name: assignTo === "player" && playerId ? selectedPlayer?.player_name || selectedPlayer?.game_name : null,
          draft_scenario_id: draftScenarioId,
          draft_scenario_name: draftScenarioName,
          strat_map_id: stratMapId,
          strat_map_name: stratMapName
        })
        if (!ok) return toast.error(code || "Failed to update objective")
      } else {
        const { ok, code } = await api.post("/scrim-objectif", {
          name,
          description,
          team_id: user?.team_id,
          team_name: user?.team_name,
          rating_type: ratingType,
          ...(assignTo === "player" && playerId && { player_id: playerId, player_name: selectedPlayer?.player_name || selectedPlayer?.game_name }),
          ...(draftScenarioId && { draft_scenario_id: draftScenarioId, draft_scenario_name: draftScenarioName }),
          ...(stratMapId && { strat_map_id: stratMapId, strat_map_name: stratMapName })
        })
        if (!ok) return toast.error(code || "Failed to add objective")
      }
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
              <label className="text-slate-400 text-xs font-medium mb-1.5 block">Player</label>
              <select
                value={playerId}
                onChange={e => setPlayerId(e.target.value)}
                className="w-full bg-slate-700/50 border-0 outline-none ring-0 focus:ring-1 focus:ring-amber-500 rounded-lg px-3 py-2.5 text-white text-sm"
              >
                {players.map(p => (
                  <option key={p._id} value={p._id}>
                    {ROLE_LABELS[p.role] || p.role} - {p.player_name || p.game_name}
                  </option>
                ))}
              </select>
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

// SOLOQ OBJECTIVES
function SoloQObjectives() {
  const [objectives, setObjectives] = useState([])
  const [players, setPlayers] = useState([])
  const { user } = useStore()
  const [editingObjective, setEditingObjective] = useState(null)

  const fetchObjectives = async () => {
    try {
      const { ok, data, code } = await api.post("/solo-objectif/search", { team_id: user?.team_id })
      if (!ok) return toast.error(code || "Failed to fetch objectives")
      setObjectives(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch objectives")
    }
  }

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
    fetchObjectives()
    fetchPlayers()
  }, [user?.team_id])

  const handleDelete = async id => {
    try {
      const { ok, code } = await api.delete(`/solo-objectif/${id}`)
      if (!ok) return toast.error(code || "Failed to delete objective")
      fetchObjectives()
    } catch (error) {
      toast.error(error.code || "Failed to delete objective")
    }
  }

  const objectivesByPlayer = {}
  for (const obj of objectives) {
    if (!objectivesByPlayer[obj.player_id]) objectivesByPlayer[obj.player_id] = []
    objectivesByPlayer[obj.player_id].push(obj)
  }

  return (
    <>
      <div className="flex items-center justify-end">
        <button
          onClick={() => setEditingObjective({})}
          className="flex items-center gap-2 px-4 py-2 bg-violet-500 hover:bg-violet-400 text-white font-semibold rounded-lg transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          New SoloQ Objective
        </button>
      </div>

      <SoloQStatsPanel objectives={objectives} />

      {players.length === 0 ? (
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-12 text-center">
          <User className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No active players</p>
          <p className="text-slate-600 text-xs mt-1">Add players to your roster to create SoloQ objectives</p>
        </div>
      ) : (
        <div className="space-y-4">
          {players.map(player => (
            <div key={player._id} className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-700/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded">{ROLE_LABELS[player.role] || player.role}</span>
                  <span className="text-white text-sm font-medium">{player.player_name}</span>
                  {player.game_name && (
                    <span className="text-slate-500 text-xs">
                      {player.game_name}#{player.tag_line}
                    </span>
                  )}
                </div>
                <span className="text-slate-500 text-xs">
                  {(objectivesByPlayer[player._id] || []).length} objective{(objectivesByPlayer[player._id] || []).length !== 1 ? "s" : ""}
                </span>
              </div>

              {!(objectivesByPlayer[player._id] || []).length ? (
                <div className="p-6 text-center">
                  <p className="text-slate-600 text-xs">No objectives for this player</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-700/30">
                  {(objectivesByPlayer[player._id] || []).map(obj => (
                    <SoloQObjectiveRow key={obj._id} objective={obj} onDelete={handleDelete} onEdit={setEditingObjective} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <SoloObjectifModal isOpen={!!editingObjective} objective={editingObjective} onClose={() => setEditingObjective(null)} onSuccess={fetchObjectives} />
    </>
  )
}

function SoloQStatsPanel({ objectives }) {
  const [stats, setStats] = useState({ globalSuccessRate: null, totalSuccess: 0, totalResults: 0, best: null, worst: null })
  const { user } = useStore()

  const fetchStats = async () => {
    try {
      const { ok, data, code } = await api.post("/solo-objectif-result/stats", { team_id: user?.team_id })
      if (!ok) return toast.error(code || "Failed to fetch stats")
      setStats(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch stats")
    }
  }

  useEffect(() => {
    fetchStats()
  }, [user?.team_id])

  if (objectives.length === 0) return null

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Target className="w-4 h-4 text-violet-400" />
          <span className="text-slate-400 text-xs font-medium">Objectives</span>
        </div>
        <span className="text-2xl font-bold text-white tabular-nums">{objectives.length}</span>
      </div>

      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-violet-400" />
          <span className="text-slate-400 text-xs font-medium">Success Rate</span>
        </div>
        {stats.globalSuccessRate != null ? (
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-bold tabular-nums ${getSuccessRateColor(stats.globalSuccessRate)}`}>{stats.globalSuccessRate}%</span>
            <span className="text-slate-600 text-sm">
              {stats.totalSuccess}/{stats.totalResults}
            </span>
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
            <span className="text-2xl font-bold tabular-nums text-emerald-400">{stats.best.rate}%</span>
            <p className="text-slate-500 text-xs truncate mt-0.5">{stats.best.obj.name}</p>
            <p className="text-slate-600 text-xs truncate">{stats.best.obj.player_name}</p>
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
        {stats.worst && stats.worst.obj._id !== stats.best?.obj._id ? (
          <>
            <span className="text-2xl font-bold tabular-nums text-red-400">{stats.worst.rate}%</span>
            <p className="text-slate-500 text-xs truncate mt-0.5">{stats.worst.obj.name}</p>
            <p className="text-slate-600 text-xs truncate">{stats.worst.obj.player_name}</p>
          </>
        ) : (
          <span className="text-slate-600 text-sm">-</span>
        )}
      </div>
    </div>
  )
}

const TYPE_BADGES = {
  per_game: { label: "Per Game", className: "text-violet-400/80 bg-violet-500/10" },
  aggregate: { label: "Aggregate", className: "text-amber-400/80 bg-amber-500/10" },
  streak: { label: "Streak", className: "text-cyan-400/80 bg-cyan-500/10" }
}

function SoloQObjectiveRow({ objective, onDelete, onEdit }) {
  if (objective.type === "aggregate") return <AggregateObjectiveRow objective={objective} onDelete={onDelete} onEdit={onEdit} />
  return <PerGameObjectiveRow objective={objective} onDelete={onDelete} onEdit={onEdit} />
}

function ObjectiveRowHeader({ objective, onDelete, onEdit, expanded, setExpanded, rightContent }) {
  return (
    <div className="px-5 py-3 hover:bg-slate-800/40 transition-colors flex items-center gap-4 cursor-pointer" onClick={() => setExpanded(e => !e)}>
      <button className="p-0.5">{expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}</button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-white text-sm font-medium truncate">{objective.name}</h3>
          {TYPE_BADGES[objective.type || "per_game"] && objective.type !== "per_game" && (
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${TYPE_BADGES[objective.type].className}`}>{TYPE_BADGES[objective.type].label}</span>
          )}
          {objective.account?.game_name && (
            <span className="text-xs text-amber-400/80 bg-amber-500/10 px-1.5 py-0.5 rounded font-medium">
              {objective.account.game_name}#{objective.account.tag_line}
            </span>
          )}
          {objective.role && (
            <span className="text-xs text-violet-400/80 bg-violet-500/10 px-1.5 py-0.5 rounded font-medium">
              {SOLOQ_ROLES.find(r => r.value === objective.role)?.label || objective.role}
            </span>
          )}
          {objective.side && (
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${objective.side === "blue" ? "text-blue-400/80 bg-blue-500/10" : "text-red-400/80 bg-red-500/10"}`}>
              {objective.side === "blue" ? "Blue" : "Red"}
            </span>
          )}
          {objective.champions?.length > 0 && (
            <div className="flex items-center gap-0.5">
              {objective.champions.slice(0, 3).map(c => (
                <img key={c} src={getChampionIcon(c)} alt={c} className="w-5 h-5 rounded" title={c} />
              ))}
              {objective.champions.length > 3 && <span className="text-xs text-slate-500 ml-0.5">+{objective.champions.length - 3}</span>}
            </div>
          )}
        </div>
        {objective.request && <p className="text-slate-500 text-xs mt-0.5 truncate">{objective.request}</p>}
      </div>
      {rightContent}
      <button
        onClick={e => {
          e.stopPropagation()
          onEdit(objective)
        }}
        className="p-1.5 rounded-lg text-slate-600 hover:text-violet-400 hover:bg-violet-500/10 transition-colors opacity-0 group-hover:opacity-100"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={e => {
          e.stopPropagation()
          onDelete(objective._id)
        }}
        className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

function PerGameObjectiveRow({ objective, onDelete, onEdit }) {
  const [results, setResults] = useState([])
  const [expanded, setExpanded] = useState(false)

  const fetchResults = async () => {
    try {
      const { ok, data, code } = await api.post("/solo-objectif-result/search", { solo_objectif_id: objective._id })
      if (!ok) return toast.error(code || "Failed to fetch results")
      setResults(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch results")
    }
  }

  useEffect(() => {
    fetchResults()
  }, [objective._id])

  const successCount = results.filter(r => r.success).length
  const rate = results.length > 0 ? Math.round((successCount / results.length) * 100) : null
  const failed = results.filter(r => !r.success)

  return (
    <div className="group">
      <ObjectiveRowHeader
        objective={objective}
        onDelete={onDelete}
        onEdit={onEdit}
        expanded={expanded}
        setExpanded={setExpanded}
        rightContent={
          <div className="w-32 hidden sm:block">
            {rate != null ? (
              <div className="space-y-1">
                <div className="w-full h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${getSuccessRateBg(rate)}`} style={{ width: `${rate}%` }} />
                </div>
                <div className="text-right">
                  <span className={`text-xs font-bold tabular-nums ${getSuccessRateColor(rate)}`}>{rate}%</span>
                  <span className="text-slate-600 text-xs ml-1">
                    {successCount}/{results.length}
                  </span>
                </div>
              </div>
            ) : (
              <span className="text-slate-600 text-xs">No data</span>
            )}
          </div>
        }
      />

      {expanded && (
        <div className="border-t border-slate-700/50 px-5 py-3 space-y-2">
          {objective.rule && (
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded font-mono">
                {objective.rule.metric} {objective.rule.operator} {objective.rule.value}
                {objective.rule.timing != null && ` @ ${objective.rule.timing}min`}
              </span>
              {objective.type === "streak" && (
                <span className="text-xs text-cyan-400/80 bg-cyan-500/10 px-2 py-0.5 rounded font-medium">{objective.streak_count || 2}x in a row</span>
              )}
            </div>
          )}
          {results.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-2">No results yet.</p>
          ) : failed.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <p className="text-sm text-emerald-400/70">All {results.length} games passed!</p>
            </div>
          ) : (
            failed.map(result => (
              <div key={result._id} className="flex items-center gap-3 bg-red-500/5 border border-red-500/10 rounded-lg px-3 py-2">
                <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                <div className="flex-1 min-w-0 flex items-center gap-3">
                  {result.champion && <span className="text-xs text-slate-300 font-medium">{result.champion}</span>}
                  {result.actual_value !== undefined && <span className="text-xs text-red-400/80">Value: {result.actual_value}</span>}
                </div>
                {result.game_date && <span className="text-xs text-slate-600 shrink-0">{new Date(result.game_date).toLocaleDateString()}</span>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function AggregateObjectiveRow({ objective, onDelete, onEdit }) {
  const [aggData, setAggData] = useState(null)
  const [expanded, setExpanded] = useState(false)

  const fetchAggregate = async () => {
    try {
      const { ok, data, code } = await api.post("/solo-objectif-result/aggregate", { solo_objectif_id: objective._id })
      if (!ok) return toast.error(code || "Failed to fetch aggregate")
      setAggData(data[0] || null)
    } catch (error) {
      toast.error(error.code || "Failed to fetch aggregate")
    }
  }

  useEffect(() => {
    fetchAggregate()
  }, [objective._id])

  return (
    <div className="group">
      <ObjectiveRowHeader
        objective={objective}
        onDelete={onDelete}
        onEdit={onEdit}
        expanded={expanded}
        setExpanded={setExpanded}
        rightContent={
          <div className="w-36 hidden sm:block">
            {aggData ? (
              <div className="space-y-1">
                <div className="w-full h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${aggData.success ? "bg-emerald-500" : "bg-amber-500"}`}
                    style={{ width: `${Math.min(100, ((aggData.current || 0) / aggData.target) * 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold tabular-nums ${aggData.success ? "text-emerald-400" : "text-amber-400"}`}>
                    {aggData.current ?? 0}/{aggData.target}
                  </span>
                  <span className="text-slate-600 text-xs">{objective.aggregate?.period === "weekly" ? "week" : "today"}</span>
                </div>
              </div>
            ) : (
              <span className="text-slate-600 text-xs">No data</span>
            )}
          </div>
        }
      />

      {expanded && (
        <div className="border-t border-slate-700/50 px-5 py-3 space-y-2">
          <div className="flex items-center gap-2">
            {objective.rule && (
              <span className="text-xs text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded font-mono">
                {objective.aggregate?.fn}({objective.rule.metric}) {objective.rule.operator} {objective.rule.value}
              </span>
            )}
            <span className="text-xs text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded font-medium">{objective.aggregate?.period === "weekly" ? "Weekly" : "Daily"}</span>
          </div>
          {aggData ? (
            <div className="flex items-center gap-3 py-2">
              {aggData.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Target className="w-4 h-4 text-amber-400" />}
              <span className={`text-sm ${aggData.success ? "text-emerald-400/70" : "text-amber-400/70"}`}>
                {aggData.success ? "Objective completed!" : `${aggData.current ?? 0}/${aggData.target} — ${aggData.total_games} games played`}
              </span>
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-2">No data for this period.</p>
          )}
        </div>
      )}
    </div>
  )
}

const ROLE_TO_RIOT = { top: "TOP", jungle: "JUNGLE", mid: "MIDDLE", bottom: "BOTTOM", support: "UTILITY" }

const SOLOQ_ROLES = [
  { value: "", label: "All roles" },
  { value: "TOP", label: "Top" },
  { value: "JUNGLE", label: "Jungle" },
  { value: "MIDDLE", label: "Mid" },
  { value: "BOTTOM", label: "ADC" },
  { value: "UTILITY", label: "Support" }
]

function SoloObjectifModal({ isOpen, objective, onClose, onSuccess }) {
  const [name, setName] = useState("")
  const [request, setRequest] = useState("")
  const [playerId, setPlayerId] = useState("")
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState("")
  const [side, setSide] = useState("")
  const [champions, setChampions] = useState([])
  const [champSearch, setChampSearch] = useState("")
  const [showChampPicker, setShowChampPicker] = useState(false)
  const [smurfAccount, setSmurfAccount] = useState(null)
  const [checkingAccount, setCheckingAccount] = useState(false)
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
      setRequest(objective.request || "")
      setPlayerId(objective.player_id || "")
      setRole(objective.role || "")
      setSide(objective.side || "")
      setChampions(objective.champions || [])
      setSmurfAccount(objective.account?.puuid ? objective.account : null)
    } else {
      setName("")
      setRequest("")
      setPlayerId(players[0]._id)
      setRole(ROLE_TO_RIOT[players[0].role] || "")
      setSide("")
      setChampions([])
      setSmurfAccount(null)
    }
    setChampSearch("")
    setShowChampPicker(false)
  }, [isOpen, players])

  const handlePlayerChange = id => {
    setPlayerId(id)
    setRole(ROLE_TO_RIOT[players.find(p => p._id === id)?.role] || "")
  }

  const handleCheckAccount = async () => {
    if (!smurfAccount?.game_name?.trim() || !smurfAccount?.tag_line?.trim()) return
    setCheckingAccount(true)
    try {
      const { ok, data, code } = await api.post("/solo-objectif/check-account", {
        game_name: smurfAccount.game_name.trim(),
        tag_line: smurfAccount.tag_line.trim(),
        region: smurfAccount.region
      })
      if (!ok) return toast.error(code || "Account not found")
      setSmurfAccount(data)
      toast.success(`Account found: ${data.game_name}#${data.tag_line}`)
    } catch (error) {
      toast.error(error.code || "Account not found")
    } finally {
      setCheckingAccount(false)
    }
  }

  const handleSubmit = async () => {
    if (!name.trim() || !playerId) return
    if (smurfAccount && !smurfAccount.puuid) return toast.error("Check the smurf account first")
    setLoading(true)
    try {
      if (objective?._id) {
        const { ok, code } = await api.put(`/solo-objectif/${objective._id}`, {
          name: name.trim(),
          request: request.trim(),
          player_id: playerId,
          player_name: players.find(p => p._id === playerId)?.player_name,
          champions,
          role: role || null,
          side: side || null,
          account: smurfAccount?.puuid ? smurfAccount : null
        })
        if (!ok) return toast.error(code || "Failed to update objective")
      } else {
        const { ok, code } = await api.post("/solo-objectif", {
          name: name.trim(),
          request: request.trim(),
          player_id: playerId,
          player_name: players.find(p => p._id === playerId)?.player_name,
          champions,
          role: role || null,
          side: side || null,
          ...(smurfAccount?.puuid && { account: smurfAccount })
        })
        if (!ok) return toast.error(code || "Failed to add objective")
      }
      onClose()
      onSuccess()
    } catch (error) {
      toast.error(error.code || "Failed to save objective")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="w-full max-w-lg bg-slate-800 p-6">
      <div className="space-y-4">
        <h2 className="text-white font-semibold text-lg">{objective?._id ? "Edit SoloQ Objective" : "New SoloQ Objective"}</h2>
        <div className="space-y-3">
          <div>
            <label className="text-slate-400 text-xs font-medium mb-1.5 block">Player</label>
            <select
              value={playerId}
              onChange={e => handlePlayerChange(e.target.value)}
              className="w-full bg-slate-700/50 border-0 outline-none ring-0 focus:ring-1 focus:ring-violet-500 rounded-lg px-3 py-2.5 text-white text-sm"
            >
              {players.map(p => (
                <option key={p._id} value={p._id}>
                  {ROLE_LABELS[p.role] || p.role} - {p.player_name || p.game_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!smurfAccount}
                onChange={e => setSmurfAccount(e.target.checked ? { game_name: "", tag_line: "", region: "euw1" } : null)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-0"
              />
              <span className="text-slate-400 text-xs font-medium">Use smurf account</span>
            </label>
          </div>
          {smurfAccount && (
            <div className="space-y-2 bg-slate-700/30 rounded-lg p-3">
              <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                <input
                  type="text"
                  placeholder="Game Name"
                  value={smurfAccount.game_name}
                  onChange={e => setSmurfAccount(prev => ({ ...prev, game_name: e.target.value, puuid: undefined }))}
                  className="bg-slate-700/50 border-0 outline-none ring-0 focus:ring-1 focus:ring-violet-500 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm"
                />
                <input
                  type="text"
                  placeholder="Tag"
                  value={smurfAccount.tag_line}
                  onChange={e => setSmurfAccount(prev => ({ ...prev, tag_line: e.target.value, puuid: undefined }))}
                  className="w-20 bg-slate-700/50 border-0 outline-none ring-0 focus:ring-1 focus:ring-violet-500 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm"
                />
                <select
                  value={smurfAccount.region}
                  onChange={e => setSmurfAccount(prev => ({ ...prev, region: e.target.value, puuid: undefined }))}
                  className="bg-slate-700/50 border-0 outline-none ring-0 focus:ring-1 focus:ring-violet-500 rounded-lg px-2 py-2 text-white text-sm"
                >
                  <option value="euw1">EUW</option>
                  <option value="eun1">EUNE</option>
                  <option value="na1">NA</option>
                  <option value="kr">KR</option>
                </select>
              </div>
              <button
                onClick={handleCheckAccount}
                disabled={!smurfAccount.game_name?.trim() || !smurfAccount.tag_line?.trim() || checkingAccount}
                className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  smurfAccount.puuid
                    ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/50"
                    : "bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
                }`}
              >
                {checkingAccount ? (
                  <div className="w-4 h-4 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
                ) : smurfAccount.puuid ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                {checkingAccount ? "Checking..." : smurfAccount.puuid ? `Verified: ${smurfAccount.game_name}#${smurfAccount.tag_line}` : "Check Account"}
              </button>
            </div>
          )}
          <div>
            <label className="text-slate-400 text-xs font-medium mb-1.5 block">Role filter (optional)</label>
            <div className="flex gap-1.5">
              {SOLOQ_ROLES.map(r => (
                <button
                  key={r.value}
                  onClick={() => setRole(r.value)}
                  className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    role === r.value ? "bg-violet-500/20 text-violet-400 ring-1 ring-violet-500/50" : "bg-slate-700/50 text-slate-400 hover:text-white"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-slate-400 text-xs font-medium mb-1.5 block">Side filter (optional)</label>
            <div className="flex gap-1.5">
              {[
                { value: "", label: "Both sides" },
                { value: "blue", label: "Blue" },
                { value: "red", label: "Red" }
              ].map(s => (
                <button
                  key={s.value}
                  onClick={() => setSide(s.value)}
                  className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    side === s.value ? "bg-violet-500/20 text-violet-400 ring-1 ring-violet-500/50" : "bg-slate-700/50 text-slate-400 hover:text-white"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-slate-400 text-xs font-medium mb-1.5 block">Champions filter (optional)</label>
            {champions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {champions.map(c => (
                  <span key={c} className="flex items-center gap-1.5 bg-violet-500/10 text-violet-400 px-2 py-1 rounded-lg text-xs font-medium">
                    <img src={getChampionIcon(c)} alt={c} className="w-4 h-4 rounded" />
                    {c}
                    <button onClick={() => setChampions(prev => prev.filter(x => x !== c))} className="hover:text-red-400 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {showChampPicker ? (
              <div className="bg-slate-700/50 rounded-lg overflow-hidden">
                <div className="relative p-2">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search champion..."
                    value={champSearch}
                    onChange={e => setChampSearch(e.target.value)}
                    className="w-full bg-slate-600/50 border-0 outline-none rounded-md pl-9 pr-3 py-1.5 text-white placeholder-slate-400 text-sm"
                    autoFocus
                  />
                </div>
                <div className="p-2 max-h-48 overflow-y-auto grid grid-cols-6 gap-1">
                  {ALL_CHAMPIONS.filter(c => c.toLowerCase().includes(champSearch.toLowerCase())).map(c => (
                    <button
                      key={c}
                      onClick={() => {
                        if (!champions.includes(c)) setChampions(prev => [...prev, c])
                      }}
                      disabled={champions.includes(c)}
                      className={`flex flex-col items-center p-1 rounded-lg transition-colors ${champions.includes(c) ? "opacity-30" : "hover:bg-slate-600/50"}`}
                    >
                      <img src={getChampionIcon(c)} alt={c} className="w-8 h-8 rounded-lg" />
                      <span className="text-[10px] text-slate-400 truncate w-full text-center mt-0.5">{c}</span>
                    </button>
                  ))}
                </div>
                <div className="p-2 border-t border-slate-600/50">
                  <button onClick={() => setShowChampPicker(false)} className="text-xs text-slate-400 hover:text-white transition-colors">
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowChampPicker(true)}
                className="w-full bg-slate-700/50 rounded-lg px-3 py-2 text-slate-500 text-sm text-left hover:text-slate-300 transition-colors"
              >
                {champions.length === 0 ? "All champions (click to filter)" : "Add more champions..."}
              </button>
            )}
          </div>
          <div>
            <label className="text-slate-400 text-xs font-medium mb-1.5 block">Objective</label>
            <input
              type="text"
              placeholder="e.g. CS superieur a 100 a 10min"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-slate-700/50 border-0 outline-none ring-0 focus:ring-1 focus:ring-violet-500 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 text-sm"
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
            />
          </div>
          <div>
            <label className="text-slate-400 text-xs font-medium mb-1.5 block">Description (optional)</label>
            <input
              type="text"
              placeholder="Additional details..."
              value={request}
              onChange={e => setRequest(e.target.value)}
              className="w-full bg-slate-700/50 border-0 outline-none ring-0 focus:ring-1 focus:ring-violet-500 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 text-sm"
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || !playerId || loading}
            className="px-5 py-2 bg-violet-500 hover:bg-violet-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors text-sm flex items-center gap-2"
          >
            {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {loading ? "Saving..." : objective?._id ? "Save" : "Add"}
          </button>
        </div>
      </div>
    </Modal>
  )
}
