import { useState, useEffect } from "react"
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
  Loader2,
  CheckCircle2,
  User,
  Users,
  ToggleLeft
} from "lucide-react"

const RATING_MAX = 10
const ROLE_ORDER = ["top", "jungle", "mid", "bottom", "support"]
const ROLE_LABELS = { top: "Top", jungle: "Jungle", mid: "Mid", bottom: "Bot", support: "Support" }

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
  const [teamResults, setTeamResults] = useState([])
  const [sessions, setSessions] = useState([])
  const [players, setPlayers] = useState([])
  const { user, globalFilters } = useStore()
  const [showAddObjectifModal, setShowAddObjectifModal] = useState(false)

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
      const { ok, data, code } = await api.post("/scrim-objectif-result/search", { team_id: user?.team_id })
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
        ...(globalFilters.opponent_name && { opponent: globalFilters.opponent_name }),
        ...(globalFilters.folder_id && { folder_id: globalFilters.folder_id })
      })
      if (!ok) return toast.error(code)
      setSessions(data)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const fetchPlayers = async () => {
    try {
      const { ok, data } = await api.post("/player/search", { team_id: user?.team_id, active: true })
      if (ok) setPlayers(data.sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role)))
    } catch (error) {
      toast.error(error.message)
    }
  }

  useEffect(() => {
    fetchObjectifs()
    fetchTeamResults()
    fetchSessions()
    fetchPlayers()
  }, [user?.team_id, globalFilters.patch, globalFilters.opponent_name, globalFilters.folder_id])

  const handleDelete = async id => {
    try {
      const { ok, code } = await api.delete(`/scrim-objectif/${id}`)
      if (!ok) return toast.error(code)
      fetchObjectifs()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const hasActiveFilters = globalFilters.patch || globalFilters.opponent_name || globalFilters.folder_id
  const filteredSessionIds = new Set(sessions.map(s => s._id))
  const filteredResults = hasActiveFilters ? teamResults.filter(r => filteredSessionIds.has(r.session_id)) : teamResults

  const stats = (() => {
    let allRatings = []
    const byObjectif = {}

    for (const obj of objectifs) {
      byObjectif[obj._id] = { ratings: [], results: [] }
    }

    for (const result of filteredResults) {
      const bucket = byObjectif[result.objectif_id]
      if (!bucket) continue
      if (result.result != null) bucket.ratings.push(result.result)
      bucket.results.push(result)
    }

    for (const [id, bucket] of Object.entries(byObjectif)) {
      const avg = bucket.ratings.length > 0 ? bucket.ratings.reduce((a, b) => a + b, 0) / bucket.ratings.length : null
      byObjectif[id] = { ...bucket, avg, count: bucket.ratings.length }
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
  })()

  return (
    <>
      <div className="flex items-center justify-end">
        <button
          onClick={() => setShowAddObjectifModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded-lg transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          New Objective Scrim
        </button>
      </div>

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

      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-700/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-amber-500" />
            <span className="text-white text-sm font-medium">All Objectives</span>
          </div>
          <span className="text-slate-500 text-xs">{stats.totalEvaluations} evaluations</span>
        </div>

        {objectifs.length === 0 ? (
          <div className="p-12 text-center">
            <Target className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No objectives yet</p>
            <p className="text-slate-600 text-xs mt-1">Add objectives to track your team&apos;s improvement</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/30">
            {objectifs.map(objectif => (
              <div key={objectif._id} className="px-5 py-4 hover:bg-slate-800/40 transition-colors group">
                <ObjectifOverviewRow objectif={objectif} onDelete={handleDelete} results={filteredResults.filter(r => r.objectif_id === objectif._id)} />
              </div>
            ))}
          </div>
        )}
      </div>

      <AddScrimObjectifModal isOpen={showAddObjectifModal} onClose={() => setShowAddObjectifModal(false)} onSuccess={fetchObjectifs} players={players} />
    </>
  )
}

function ObjectifOverviewRow({ objectif, onDelete, results }) {
  const isToggle = objectif.rating_type === "toggle"
  const ratings = results.filter(r => r.result != null).map(r => r.result)
  const avg = !isToggle && ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null
  const doneCount = isToggle ? ratings.filter(r => r === 1).length : 0
  const toggleRate = isToggle && ratings.length > 0 ? Math.round((doneCount / ratings.length) * 100) : null

  return (
    <div className="flex items-center gap-4">
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
          {isToggle && <ToggleLeft className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
          {ratings.length > 0 && <span className="text-slate-600 text-xs shrink-0">{ratings.length} evals</span>}
        </div>
        {objectif.description && <p className="text-slate-500 text-xs mt-0.5 truncate">{objectif.description}</p>}
      </div>
      <div className="w-32 hidden sm:block">
        {isToggle ? (
          toggleRate != null ? (
            <div className="space-y-1">
              <div className="w-full h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${getSuccessRateBg(toggleRate)}`} style={{ width: `${toggleRate}%` }} />
              </div>
              <div className="text-right">
                <span className={`text-xs font-bold tabular-nums ${getSuccessRateColor(toggleRate)}`}>{toggleRate}%</span>
                <span className="text-slate-600 text-xs ml-1">
                  {doneCount}/{ratings.length}
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
        onClick={() => onDelete(objectif._id)}
        className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

function AddScrimObjectifModal({ isOpen, onClose, onSuccess, players }) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [assignTo, setAssignTo] = useState("team")
  const [playerId, setPlayerId] = useState("")
  const [ratingType, setRatingType] = useState("rating")
  const { user } = useStore()

  useEffect(() => {
    if (isOpen && players?.length > 0 && !playerId) setPlayerId(players[0]._id)
  }, [isOpen, players])

  const selectedPlayer = players?.find(p => p._id === playerId)

  const handleAdd = async () => {
    if (!name.trim()) return
    try {
      const body = {
        name,
        description,
        team_id: user?.team_id,
        team_name: user?.team_name,
        rating_type: ratingType,
        ...(assignTo === "player" && playerId && { player_id: playerId, player_name: selectedPlayer?.player_name || selectedPlayer?.game_name })
      }
      const { ok, code } = await api.post("/scrim-objectif", body)
      if (!ok) return toast.error(code)
      setName("")
      setDescription("")
      setAssignTo("team")
      setRatingType("rating")
      onClose()
      onSuccess()
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="w-full max-w-md bg-slate-800 p-6">
      <div className="space-y-4">
        <h2 className="text-white font-semibold text-lg">New Scrim Objective</h2>
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
          {assignTo === "player" && players?.length > 0 && (
            <div>
              <label className="text-slate-400 text-xs font-medium mb-1.5 block">Player</label>
              <select
                value={playerId}
                onChange={e => setPlayerId(e.target.value)}
                className="w-full bg-slate-700/50 border-0 outline-none ring-0 focus:ring-1 focus:ring-amber-500 rounded-lg px-3 py-2.5 text-white text-sm"
              >
                {players.map(p => (
                  <option key={p._id} value={p._id}>
                    {ROLE_LABELS[p.role] || p.role} - {p.player_name}
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

// ==================== SOLOQ OBJECTIVES ====================

function SoloQObjectives() {
  const { user } = useStore()
  const [players, setPlayers] = useState([])
  const [objectives, setObjectives] = useState([])
  const [results, setResults] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)

  const fetchAll = async () => {
    try {
      const [playersRes, objectivesRes, resultsRes] = await Promise.all([
        api.post("/player/search", { team_id: user?.team_id, active: true }),
        api.post("/solo-objectif/search", { team_id: user?.team_id }),
        api.post("/solo-objectif-result/search", { team_id: user?.team_id })
      ])
      if (playersRes.ok) setPlayers(playersRes.data)
      if (objectivesRes.ok) setObjectives(objectivesRes.data)
      if (resultsRes.ok) setResults(resultsRes.data)
    } catch (error) {
      toast.error(error.message)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [user?.team_id])

  const handleDelete = async id => {
    try {
      const { ok, code } = await api.delete(`/solo-objectif/${id}`)
      if (!ok) return toast.error(code)
      setObjectives(prev => prev.filter(o => o._id !== id))
    } catch (error) {
      toast.error(error.message)
    }
  }

  // Group objectives by player
  const objectivesByPlayer = {}
  for (const obj of objectives) {
    if (!objectivesByPlayer[obj.player_id]) objectivesByPlayer[obj.player_id] = []
    objectivesByPlayer[obj.player_id].push(obj)
  }

  // Results by objective
  const resultsByObjective = {}
  for (const r of results) {
    if (!resultsByObjective[r.solo_objectif_id]) resultsByObjective[r.solo_objectif_id] = []
    resultsByObjective[r.solo_objectif_id].push(r)
  }

  // Stats
  const totalObjectives = objectives.length
  const totalResults = results.length
  const totalSuccess = results.filter(r => r.success).length
  const globalSuccessRate = totalResults > 0 ? Math.round((totalSuccess / totalResults) * 100) : null

  // Best / worst objective
  const objStats = objectives
    .map(obj => {
      const objResults = resultsByObjective[obj._id] || []
      const success = objResults.filter(r => r.success).length
      const rate = objResults.length > 0 ? Math.round((success / objResults.length) * 100) : null
      return { obj, rate, total: objResults.length }
    })
    .filter(o => o.rate != null && o.total >= 1)

  const bestObj = objStats.sort((a, b) => b.rate - a.rate)[0] || null
  const worstObj = objStats.sort((a, b) => a.rate - b.rate)[0] || null

  // Sort players by role
  const sortedPlayers = [...players].sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role))

  return (
    <>
      <div className="flex items-center justify-end">
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-violet-500 hover:bg-violet-400 text-white font-semibold rounded-lg transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          New SoloQ Objective
        </button>
      </div>

      {totalObjectives > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-violet-400" />
              <span className="text-slate-400 text-xs font-medium">Objectives</span>
            </div>
            <span className="text-2xl font-bold text-white tabular-nums">{totalObjectives}</span>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-violet-400" />
              <span className="text-slate-400 text-xs font-medium">Success Rate</span>
            </div>
            {globalSuccessRate != null ? (
              <div className="flex items-baseline gap-1">
                <span className={`text-2xl font-bold tabular-nums ${getSuccessRateColor(globalSuccessRate)}`}>{globalSuccessRate}%</span>
                <span className="text-slate-600 text-sm">
                  {totalSuccess}/{totalResults}
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
            {bestObj ? (
              <>
                <span className="text-2xl font-bold tabular-nums text-emerald-400">{bestObj.rate}%</span>
                <p className="text-slate-500 text-xs truncate mt-0.5">{bestObj.obj.name}</p>
                <p className="text-slate-600 text-xs truncate">{bestObj.obj.player_name}</p>
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
            {worstObj && worstObj.obj._id !== bestObj?.obj._id ? (
              <>
                <span className="text-2xl font-bold tabular-nums text-red-400">{worstObj.rate}%</span>
                <p className="text-slate-500 text-xs truncate mt-0.5">{worstObj.obj.name}</p>
                <p className="text-slate-600 text-xs truncate">{worstObj.obj.player_name}</p>
              </>
            ) : (
              <span className="text-slate-600 text-sm">-</span>
            )}
          </div>
        </div>
      )}

      {sortedPlayers.length === 0 ? (
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-12 text-center">
          <User className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No active players</p>
          <p className="text-slate-600 text-xs mt-1">Add players to your roster to create SoloQ objectives</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedPlayers.map(player => {
            const playerObjectives = objectivesByPlayer[player._id] || []
            return (
              <div key={player._id} className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-700/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded">
                      {ROLE_LABELS[player.role] || player.role}
                    </span>
                    <span className="text-white text-sm font-medium">{player.player_name}</span>
                    {player.game_name && (
                      <span className="text-slate-500 text-xs">
                        {player.game_name}#{player.tag_line}
                      </span>
                    )}
                  </div>
                  <span className="text-slate-500 text-xs">
                    {playerObjectives.length} objective{playerObjectives.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {playerObjectives.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-slate-600 text-xs">No objectives for this player</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-700/30">
                    {playerObjectives.map(obj => (
                      <SoloObjectiveRow key={obj._id} objective={obj} results={resultsByObjective[obj._id] || []} onDelete={handleDelete} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <AddSoloObjectifModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSuccess={fetchAll} players={sortedPlayers} />
    </>
  )
}

function SoloObjectiveRow({ objective, results, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const successCount = results.filter(r => r.success).length
  const rate = results.length > 0 ? Math.round((successCount / results.length) * 100) : null
  const failed = results.filter(r => !r.success)

  return (
    <div className="group">
      <div className="px-5 py-3 hover:bg-slate-800/40 transition-colors flex items-center gap-4 cursor-pointer" onClick={() => setExpanded(e => !e)}>
        <button className="p-0.5">{expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}</button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-white text-sm font-medium truncate">{objective.name}</h3>
            {results.length > 0 && <span className="text-slate-600 text-xs">{results.length} games</span>}
          </div>
          {objective.request && <p className="text-slate-500 text-xs mt-0.5 truncate">{objective.request}</p>}
        </div>
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

      {expanded && (
        <div className="border-t border-slate-700/50 px-5 py-3 space-y-2">
          {objective.rule && (
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded font-mono">
                {objective.rule.metric} {objective.rule.operator} {objective.rule.value}
                {objective.rule.timing != null && ` @ ${objective.rule.timing}min`}
              </span>
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

function AddSoloObjectifModal({ isOpen, onClose, onSuccess, players }) {
  const [name, setName] = useState("")
  const [request, setRequest] = useState("")
  const [playerId, setPlayerId] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && players.length > 0 && !playerId) setPlayerId(players[0]._id)
  }, [isOpen, players])

  const selectedPlayer = players.find(p => p._id === playerId)

  const handleAdd = async () => {
    if (!name.trim() || !playerId) return
    try {
      setLoading(true)
      const { ok, code } = await api.post("/solo-objectif", { name: name.trim(), request: request.trim(), player_id: playerId, player_name: selectedPlayer?.player_name })
      if (!ok) return toast.error(code)
      setName("")
      setRequest("")
      onClose()
      onSuccess()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="w-full max-w-md bg-slate-800 p-6">
      <div className="space-y-4">
        <h2 className="text-white font-semibold text-lg">New SoloQ Objective</h2>
        <div className="space-y-3">
          <div>
            <label className="text-slate-400 text-xs font-medium mb-1.5 block">Player</label>
            <select
              value={playerId}
              onChange={e => setPlayerId(e.target.value)}
              className="w-full bg-slate-700/50 border-0 outline-none ring-0 focus:ring-1 focus:ring-violet-500 rounded-lg px-3 py-2.5 text-white text-sm"
            >
              {players.map(p => (
                <option key={p._id} value={p._id}>
                  {ROLE_LABELS[p.role] || p.role} - {p.player_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-slate-400 text-xs font-medium mb-1.5 block">Objective</label>
            <input
              type="text"
              placeholder="e.g. CS superieur a 100 a 10min"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-slate-700/50 border-0 outline-none ring-0 focus:ring-1 focus:ring-violet-500 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 text-sm"
              onKeyDown={e => e.key === "Enter" && handleAdd()}
              autoFocus
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
              onKeyDown={e => e.key === "Enter" && handleAdd()}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={handleAdd}
            disabled={!name.trim() || !playerId || loading}
            className="px-5 py-2 bg-violet-500 hover:bg-violet-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors text-sm flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}
          </button>
        </div>
      </div>
    </Modal>
  )
}
