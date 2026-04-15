import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "react-hot-toast"
import api from "@/services/api"
import useStore from "@/services/store"
import { getChampionIcon } from "@/utils"
import { ArrowLeft, Plus, X, Target, TrendingUp, ImagePlus, ChevronDown, Loader2, Check, ToggleLeft, Users, User, ExternalLink, Gamepad2 } from "lucide-react"
import Modal from "@/components/modal"
import UploadModal from "@/components/UploadModal"
import DebounceInput from "@/components/debounceInput"
import OpponentDropdown from "@/components/OpponentDropdown"
import DraftScenarioSelect from "@/components/DraftScenarioSelect"
import StratMapSelect from "@/components/StratMapSelect"
import { ExpandedContent } from "@/scenes/stats/games"

const RATING_MAX = 10

function getRatingColor(value) {
  if (value <= 3) return "bg-red-500"
  if (value <= 5) return "bg-amber-500"
  if (value <= 7) return "bg-amber-400"
  return "bg-emerald-500"
}

function getRatingTextColor(value) {
  if (value <= 3) return "text-red-400"
  if (value <= 5) return "text-amber-400"
  if (value <= 7) return "text-amber-400"
  return "text-emerald-400"
}

function getRatingBg(value) {
  if (value <= 3) return "bg-red-500/15"
  if (value <= 5) return "bg-amber-500/10"
  if (value <= 7) return "bg-amber-400/10"
  return "bg-emerald-500/15"
}

function formatDateInput(value) {
  if (!value) return ""
  if (typeof value === "string" && value.length >= 10) return value.slice(0, 10)
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ""
  return parsed.toISOString().slice(0, 10)
}

function getPatchPrefix(patch) {
  if (!patch) return null
  return patch.split(".").slice(0, 2).join(".")
}

export default function View() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [games, setGames] = useState([])
  const [showImportModal, setShowImportModal] = useState(false)
  const [sessionAvg, setSessionAvg] = useState(null)
  const [selectedGame, setSelectedGame] = useState(null)

  useEffect(() => {
    if (!id) return
    fetchSession()
    fetchGames()
  }, [id])

  useEffect(() => {
    if (!session?._id) return
    if (session.win === games.filter(g => g.win).length && session.loss === games.filter(g => !g.win).length) return
    setSession(prev => ({
      ...prev,
      win: games.filter(g => g.win).length,
      loss: games.filter(g => !g.win).length,
      winrate: games.length > 0 ? Math.round((games.filter(g => g.win).length / games.length) * 100) : 0
    }))
    syncSessionRecord()
  }, [games, session?._id])

  const syncSessionRecord = async () => {
    try {
      const { ok, code } = await api.put(`/scrim-session/${id}`, {
        ...session,
        win: games.filter(g => g.win).length,
        loss: games.filter(g => !g.win).length,
        winrate: games.length > 0 ? Math.round((games.filter(g => g.win).length / games.length) * 100) : 0
      })
      if (!ok) return toast.error(code || "Failed to update session")
    } catch (error) {
      toast.error(error.code || "Failed to update session")
    }
  }

  const fetchSession = async () => {
    try {
      const { ok, data, code } = await api.get(`/scrim-session/${id}`)
      if (!ok) return toast.error(code || "Failed to fetch session")
      setSession(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch session")
    }
  }

  const fetchGames = async () => {
    try {
      const { ok, data, code } = await api.post("/game/search", { session_id: id, sort: { createdAt: 1 } })
      if (!ok) return toast.error(code || "Failed to fetch games")
      setGames(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch games")
    }
  }

  const updateSession = async (field, value) => {
    setSession({ ...session, [field]: value })
    try {
      const { ok, code } = await api.put(`/scrim-session/${id}`, { ...session, [field]: value })
      if (!ok) return toast.error(code || "Failed to update session")
    } catch (error) {
      toast.error(error.code || "Failed to update session")
    }
  }

  const removeGame = async game => {
    setGames(prev => prev.filter(g => g._id !== game._id))
    try {
      const { ok, code } = await api.put(`/game/${game._id}`, { session_id: null, session_name: null })
      if (!ok) return toast.error(code || "Failed to remove game")
      fetchGames()
    } catch (error) {
      toast.error(error.code || "Failed to remove game")
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-slate-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 lg:p-6">
      <div className="max-w-[1600px] mx-auto space-y-5">
        {/* Header Card */}
        <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/30 rounded-2xl px-5 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button onClick={() => navigate("/scrim-hub/scrims")} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <DebounceInput
                type="text"
                placeholder="Session name..."
                value={session.name || ""}
                onChange={e => updateSession("name", e.target.value)}
                className="bg-transparent border-0 outline-none ring-0 focus:ring-0 text-white text-base font-semibold placeholder-slate-500 w-40"
              />
              <input
                type="date"
                value={formatDateInput(session.date)}
                onChange={e => updateSession("date", e.target.value)}
                className="bg-slate-700/40 border-0 outline-none ring-0 focus:ring-1 focus:ring-amber-500/50 rounded-lg px-2.5 py-1.5 text-white text-sm"
              />
              {session.patch && (
                <span className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs font-mono font-medium text-emerald-400">
                  {getPatchPrefix(session.patch)}
                </span>
              )}
              <OpponentDropdown
                value={session.opponent_name}
                onChange={async ({ _id, name }) => {
                  setSession(prev => ({ ...prev, opponent_id: _id, opponent_name: name }))
                  const { ok, code } = await api.put(`/scrim-session/${id}`, { ...session, opponent_id: _id, opponent_name: name })
                  if (!ok) return toast.error(code || "Failed to update session")
                  if (games.length > 0) {
                    const results = await Promise.all(games.map(g => api.put(`/game/${g._id}`, { opponent_id: _id || null, opponent_name: name || null })))
                    if (results.some(r => !r.ok)) toast.error("Failed to update some games")
                    else fetchGames()
                  }
                }}
              />
              <MultiOpggLink session={session} />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-700/30 rounded-lg px-3 py-1.5">
                <span className="text-emerald-400 font-bold text-sm">{session.win || 0}W</span>
                <span className="text-slate-600 text-xs">–</span>
                <span className="text-red-400 font-bold text-sm">{session.loss || 0}L</span>
              </div>
              {games.length > 0 && (
                <span
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold ${(session.winrate || 0) >= 50 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}
                >
                  {session.winrate || 0}%
                </span>
              )}
              {sessionAvg != null && (
                <div className="flex items-center gap-1.5 bg-slate-700/30 rounded-lg px-3 py-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                  <span className={`text-sm font-bold ${getRatingTextColor(Math.round(sessionAvg))}`}>{sessionAvg.toFixed(1)}</span>
                  <span className="text-slate-600 text-xs">/{RATING_MAX}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-12 gap-5">
          {/* Left Column */}
          <div className="col-span-4 space-y-4">
            {/* Games Card */}
            <div className="bg-slate-800/40 border border-slate-700/30 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-white font-semibold text-sm">Games</h2>
                  {games.length > 0 && <span className="text-[10px] text-slate-400 bg-slate-700/50 px-1.5 py-0.5 rounded-full font-medium">{games.length}</span>}
                </div>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg transition-colors text-xs font-medium border border-amber-500/20"
                >
                  <ImagePlus className="w-3.5 h-3.5" />
                  Import
                </button>
              </div>

              {games.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-4">
                  <button onClick={() => setShowImportModal(true)} className="relative mb-4 group cursor-pointer">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/15 to-amber-600/5 border border-amber-500/20 group-hover:border-amber-500/40 group-hover:from-amber-500/20 flex items-center justify-center transition-all">
                      <Gamepad2 className="w-7 h-7 text-amber-500/70 group-hover:text-amber-500 transition-colors" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                      <Plus className="w-3 h-3 text-amber-400" />
                    </div>
                  </button>
                  <p className="text-white text-sm font-semibold mb-1">Import your first game</p>
                  <p className="text-slate-500 text-xs text-center max-w-[180px]">Upload a .rofl replay or pick from your game history</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {games.map((game, idx) => (
                    <div
                      key={game._id}
                      onClick={() => setSelectedGame(game)}
                      className={`group/game flex items-center gap-2.5 rounded-lg px-3 py-2.5 transition-all border-l-[3px] cursor-pointer ${
                        game.win ? "border-l-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10" : "border-l-red-400 bg-red-500/5 hover:bg-red-500/10"
                      }`}
                    >
                      <span className="text-slate-500 text-[10px] font-mono w-4 shrink-0">G{idx + 1}</span>

                      {game.champions && game.champions[game.team_side] && (
                        <div className="flex items-center gap-0.5 shrink-0">
                          {["top", "jungle", "mid", "bottom", "support"].map(role => {
                            const champ = game.champions[game.team_side]?.[role]
                            return champ ? (
                              <div key={role} className="w-5 h-5 rounded overflow-hidden bg-slate-700" title={champ}>
                                <img src={getChampionIcon(champ)} alt={champ} className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div key={role} className="w-5 h-5 rounded bg-slate-700" />
                            )
                          })}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-white text-sm font-medium truncate">{game.name || `Game ${game.game_id}`}</span>
                          {game.team_side && (
                            <span
                              className={`text-[10px] px-1 py-0.5 rounded font-medium shrink-0 ${
                                game.team_side === "blue" ? "bg-blue-500/15 text-blue-400" : "bg-red-500/15 text-red-400"
                              }`}
                            >
                              {game.team_side}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {game.duration && (
                            <span className="text-slate-500 text-[10px]">
                              {Math.floor(game.duration / 60)}:{String(game.duration % 60).padStart(2, "0")}
                            </span>
                          )}
                          {game.opponent_name && <span className="text-slate-500 text-[10px]">vs {game.opponent_name}</span>}
                        </div>
                      </div>

                      <button
                        onClick={e => {
                          e.stopPropagation()
                          removeGame(game)
                        }}
                        className="p-1 text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover/game:opacity-100 shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes Card */}
            <div className="bg-slate-800/40 border border-slate-700/30 rounded-2xl p-4 space-y-2">
              <h2 className="text-white font-semibold text-sm">Notes</h2>
              <DebounceInput
                isTextArea
                placeholder="Add notes for this session..."
                value={session.comment || ""}
                onChange={e => updateSession("comment", e.target.value)}
                className="w-full bg-slate-700/30 border-0 outline-none ring-0 focus:ring-1 focus:ring-amber-500/50 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm resize-none"
                rows={7}
              />
            </div>
          </div>

          {/* Right Column */}
          <div className="col-span-8">
            <ObjectivesSection session={session} games={games} onSessionAvg={setSessionAvg} />
          </div>
        </div>
      </div>

      <UploadModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        session={session}
        selectedGames={games}
        onSuccess={gamePatch => {
          if (!session?.patch && gamePatch) updateSession("patch", gamePatch)
          setShowImportModal(false)
          fetchGames()
        }}
      />

      <Modal isOpen={!!selectedGame} onClose={() => setSelectedGame(null)} className="w-full max-w-7xl !bg-slate-900 border border-slate-700/50 shadow-xl">
        {selectedGame && (
          <div className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-1.5 h-8 rounded-full ${selectedGame.win ? "bg-emerald-500" : "bg-red-500"}`} />
              <span className="text-white font-semibold">{selectedGame.name || `Game ${selectedGame.game_id}`}</span>
              {selectedGame.team_side && (
                <span
                  className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${selectedGame.team_side === "blue" ? "bg-blue-500/15 text-blue-400" : "bg-red-500/15 text-red-400"}`}
                >
                  {selectedGame.team_side} side
                </span>
              )}
              {selectedGame.duration && (
                <span className="text-slate-500 text-sm">
                  {Math.floor(selectedGame.duration / 60)}:{String(selectedGame.duration % 60).padStart(2, "0")}
                </span>
              )}
            </div>
            <ExpandedContent game={selectedGame} onDelete={fetchGames} />
          </div>
        )}
      </Modal>
    </div>
  )
}

function MultiOpggLink({ session }) {
  const [multiOpgg, setMultiOpgg] = useState(null)

  const fetchEnemyTeam = async () => {
    try {
      const { ok, data, code } = await api.get(`/enemy-team/${session.opponent_id}`)
      if (!ok) return
      setMultiOpgg(data.multi_opgg)
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    if (session?.opponent_id) fetchEnemyTeam()
  }, [session?.opponent_id])

  if (!multiOpgg) return null

  return (
    <a
      href={multiOpgg}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 rounded-lg px-3 py-1.5 text-sm transition-colors"
    >
      <ExternalLink className="w-3.5 h-3.5" />
      <span>Multi OP.GG</span>
    </a>
  )
}

function ObjectivesSection({ session, games, onSessionAvg }) {
  const { user } = useStore()
  const [allObjectives, setAllObjectives] = useState([])
  const [activeObjectifIds, setActiveObjectifIds] = useState(session?.objectif_ids || [])
  const [showObjectiveModal, setShowObjectiveModal] = useState(false)

  useEffect(() => {
    if (session?.objectif_ids) setActiveObjectifIds(session.objectif_ids)
  }, [session?._id])

  useEffect(() => {
    if (user?.team_id) fetchObjectives()
  }, [user?.team_id])

  const fetchObjectives = async () => {
    try {
      const { ok, data, code } = await api.post("/scrim-objectif/search", { team_id: user?.team_id })
      if (!ok) return toast.error(code || "Failed to fetch objectives")
      setAllObjectives(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch objectives")
    }
  }

  const saveActiveIds = async ids => {
    try {
      const { ok, code } = await api.put(`/scrim-session/${session._id}`, { ...session, objectif_ids: ids })
      if (!ok) return toast.error(code || "Failed to save objectives")
    } catch (error) {
      toast.error(error.code || "Failed to save objectives")
    }
  }

  return (
    <div className="bg-slate-800/40 border border-slate-700/30 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-amber-500" />
          <h2 className="text-white font-semibold text-sm">Objectives Review</h2>
        </div>
        <button
          onClick={() => setShowObjectiveModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg transition-colors text-xs font-medium border border-amber-500/20"
        >
          <Plus className="w-3.5 h-3.5" />
          Manage Objectives
        </button>
      </div>

      <ObjectivesTable
        session={session}
        games={games}
        objectives={allObjectives.filter(o => activeObjectifIds.includes(o._id))}
        onAddActiveIds={ids => {
          const next = [...new Set([...activeObjectifIds, ...ids])]
          setActiveObjectifIds(next)
          saveActiveIds(next)
        }}
        onToggleObjective={objId => {
          const next = activeObjectifIds.includes(objId) ? activeObjectifIds.filter(oid => oid !== objId) : [...activeObjectifIds, objId]
          setActiveObjectifIds(next)
          saveActiveIds(next)
        }}
        onSessionAvg={onSessionAvg}
        onOpenManage={() => setShowObjectiveModal(true)}
      />

      <ObjectivePickerModal
        isOpen={showObjectiveModal}
        onClose={() => setShowObjectiveModal(false)}
        allObjectives={allObjectives}
        activeObjectifIds={activeObjectifIds}
        onToggle={objId => {
          const next = activeObjectifIds.includes(objId) ? activeObjectifIds.filter(oid => oid !== objId) : [...activeObjectifIds, objId]
          setActiveObjectifIds(next)
          saveActiveIds(next)
        }}
        onCreated={newObj => {
          setAllObjectives(prev => [newObj, ...prev])
          const next = [...activeObjectifIds, newObj._id]
          setActiveObjectifIds(next)
          saveActiveIds(next)
        }}
      />
    </div>
  )
}

function ObjectivePickerModal({ isOpen, onClose, allObjectives, activeObjectifIds, onToggle, onCreated }) {
  const { user } = useStore()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newName, setNewName] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [newRatingType, setNewRatingType] = useState("rating")
  const [newAssignTo, setNewAssignTo] = useState("team")
  const [players, setPlayers] = useState([])
  const [newSelectedPlayerIds, setNewSelectedPlayerIds] = useState([])
  const [newDraftScenarioId, setNewDraftScenarioId] = useState(null)
  const [newDraftScenarioName, setNewDraftScenarioName] = useState(null)
  const [newStratMapId, setNewStratMapId] = useState(null)
  const [newStratMapName, setNewStratMapName] = useState(null)

  const fetchPlayers = async () => {
    try {
      const { ok, data, code } = await api.post("/player/search", { team_id: user?.team_id, active: true })
      if (!ok) return toast.error(code || "Failed to fetch players")
      setPlayers(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch players")
    }
  }

  useEffect(() => {
    if (isOpen && showCreateForm) fetchPlayers()
  }, [isOpen, showCreateForm])

  const handleCreate = async () => {
    if (!newName.trim()) return
    try {
      const { ok, data, code } = await api.post("/scrim-objectif", {
        name: newName,
        description: newDescription,
        rating_type: newRatingType,
        player:
          newAssignTo === "player"
            ? newSelectedPlayerIds.map(id => {
                const p = players.find(x => x._id === id)
                return { id, name: p?.player_name || p?.game_name }
              })
            : [],
        ...(newDraftScenarioId && { draft_scenario_id: newDraftScenarioId, draft_scenario_name: newDraftScenarioName }),
        ...(newStratMapId && { strat_map_id: newStratMapId, strat_map_name: newStratMapName })
      })
      if (!ok) return toast.error(code || "Failed to create objective")
      onCreated(data)
      setNewName("")
      setNewDescription("")
      setNewRatingType("rating")
      setNewAssignTo("team")
      setNewSelectedPlayerIds([])
      setNewDraftScenarioId(null)
      setNewDraftScenarioName(null)
      setNewStratMapId(null)
      setNewStratMapName(null)
      setShowCreateForm(false)
    } catch (error) {
      toast.error(error.code || "Failed to create objective")
    }
  }

  const handleClose = () => {
    setShowCreateForm(false)
    setNewName("")
    setNewDescription("")
    setNewRatingType("rating")
    setNewAssignTo("team")
    setNewSelectedPlayerIds([])
    setNewDraftScenarioId(null)
    setNewDraftScenarioName(null)
    setNewStratMapId(null)
    setNewStratMapName(null)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-lg w-full max-h-[85vh] overflow-y-auto bg-slate-800 border border-slate-700/50">
      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-white font-bold text-lg">Objectives</h2>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              showCreateForm ? "bg-slate-700/50 text-slate-300" : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20"
            }`}
          >
            {showCreateForm ? (
              <>
                <X className="w-3.5 h-3.5" />
                Cancel
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                Create New
              </>
            )}
          </button>
        </div>

        {/* Create form */}
        {showCreateForm && (
          <div className="bg-slate-900/50 border border-slate-700/30 rounded-xl p-4 mb-4 space-y-3">
            <div>
              <label className="text-slate-400 text-xs font-medium mb-1.5 block">Name *</label>
              <input
                type="text"
                placeholder="e.g. Slow push into dive top"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="w-full bg-slate-700/50 border-0 outline-none ring-0 focus:ring-1 focus:ring-amber-500 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm"
                onKeyDown={e => e.key === "Enter" && handleCreate()}
                autoFocus
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs font-medium mb-1.5 block">Description (optional)</label>
              <input
                type="text"
                placeholder="Brief description..."
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                className="w-full bg-slate-700/50 border-0 outline-none ring-0 focus:ring-1 focus:ring-amber-500 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs font-medium mb-1.5 block">Rating type</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setNewRatingType("rating")}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    newRatingType === "rating" ? "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/50" : "bg-slate-700/50 text-slate-400 hover:text-white"
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  Rating /10
                </button>
                <button
                  onClick={() => setNewRatingType("toggle")}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    newRatingType === "toggle" ? "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/50" : "bg-slate-700/50 text-slate-400 hover:text-white"
                  }`}
                >
                  <ToggleLeft className="w-3.5 h-3.5" />
                  Done / Not done
                </button>
              </div>
            </div>
            <div>
              <label className="text-slate-400 text-xs font-medium mb-1.5 block">Assign to</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setNewAssignTo("team")}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    newAssignTo === "team" ? "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/50" : "bg-slate-700/50 text-slate-400 hover:text-white"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  Team
                </button>
                <button
                  onClick={() => setNewAssignTo("player")}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    newAssignTo === "player" ? "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/50" : "bg-slate-700/50 text-slate-400 hover:text-white"
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  Player
                </button>
              </div>
            </div>
            {newAssignTo === "player" && players.length > 0 && (
              <div>
                <label className="text-slate-400 text-xs font-medium mb-1.5 block">Players</label>
                <div className="space-y-1 bg-slate-700/30 rounded-lg p-2">
                  {players.map(p => (
                    <button
                      key={p._id}
                      type="button"
                      onClick={() => setNewSelectedPlayerIds(prev => (prev.includes(p._id) ? prev.filter(x => x !== p._id) : [...prev, p._id]))}
                      className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-sm transition-all ${
                        newSelectedPlayerIds.includes(p._id) ? "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/40" : "text-slate-300 hover:bg-slate-700/50"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                          newSelectedPlayerIds.includes(p._id) ? "border-amber-500 bg-amber-500" : "border-slate-500"
                        }`}
                      >
                        {newSelectedPlayerIds.includes(p._id) && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <span className="text-xs font-bold uppercase text-slate-400">{p.role}</span>
                      <span>{p.player_name || p.game_name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="text-slate-400 text-xs font-medium mb-1.5 block">Draft scenario (optional)</label>
              <DraftScenarioSelect
                value={newDraftScenarioId}
                onChange={(id, name) => {
                  setNewDraftScenarioId(id)
                  setNewDraftScenarioName(name)
                }}
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs font-medium mb-1.5 block">Strat map (optional)</label>
              <StratMapSelect
                value={newStratMapId}
                onChange={(id, name) => {
                  setNewStratMapId(id)
                  setNewStratMapName(name)
                }}
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={!newName.trim()}
              className="w-full py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 font-semibold rounded-lg transition-colors text-sm"
            >
              Create Objective
            </button>
          </div>
        )}

        {/* Objectives list */}
        {!showCreateForm && (
          <div className="space-y-1">
            {allObjectives.length === 0 ? (
              <div className="text-center py-8">
                <Target className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No objectives yet</p>
                <p className="text-slate-600 text-xs mt-1">Create your first objective above</p>
              </div>
            ) : (
              allObjectives.map(obj => (
                <button
                  key={obj._id}
                  onClick={() => onToggle(obj._id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all flex items-center gap-3 ${
                    activeObjectifIds.includes(obj._id) ? "bg-amber-500/10 border border-amber-500/20" : "hover:bg-slate-700/40 border border-transparent"
                  }`}
                >
                  <div
                    className={`w-4.5 h-4.5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                      activeObjectifIds.includes(obj._id) ? "border-amber-500 bg-amber-500" : "border-slate-500"
                    }`}
                  >
                    {activeObjectifIds.includes(obj._id) && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium truncate ${activeObjectifIds.includes(obj._id) ? "text-white" : "text-slate-300"}`}>{obj.name}</span>
                      {obj.player?.map(p => (
                        <span key={p.id} className="text-[10px] text-amber-400/80 bg-amber-500/10 px-1.5 py-0.5 rounded-md shrink-0">
                          {p.name}
                        </span>
                      ))}
                    </div>
                    {obj.description && <div className="text-xs text-slate-500 mt-0.5 truncate">{obj.description}</div>}
                  </div>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium shrink-0 ${
                      obj.rating_type === "toggle" ? "bg-violet-500/15 text-violet-400" : "bg-blue-500/15 text-blue-400"
                    }`}
                  >
                    {obj.rating_type === "toggle" ? "Pass/Fail" : "/10"}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

function ObjectivesTable({ session, games, objectives, onAddActiveIds, onToggleObjective, onSessionAvg, onOpenManage }) {
  const [rowRatings, setRowRatings] = useState({})

  const fetchActiveIds = async () => {
    try {
      const { ok, data, code } = await api.post("/scrim-objectif-result/search", { session_id: session._id })
      if (!ok) return toast.error(code || "Failed to fetch results")
      onAddActiveIds([...new Set(data.map(r => r.objectif_id))])
    } catch (error) {
      toast.error(error.code || "Failed to fetch results")
    }
  }

  useEffect(() => {
    if (session?._id) fetchActiveIds()
  }, [session?._id])

  useEffect(() => {
    const allRatings = Object.values(rowRatings).flat()
    onSessionAvg(allRatings.length > 0 ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length : null)
  }, [rowRatings])

  if (objectives.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 px-6">
        <button onClick={onOpenManage} className="relative mb-5 group cursor-pointer">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/15 to-amber-600/5 border border-amber-500/20 group-hover:border-amber-500/40 group-hover:from-amber-500/20 flex items-center justify-center transition-all">
            <Target className="w-8 h-8 text-amber-500/70 group-hover:text-amber-500 transition-colors" />
          </div>
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
            <Plus className="w-3 h-3 text-amber-400" />
          </div>
        </button>
        <h3 className="text-white font-semibold text-base mb-1.5">Prepare your objectives</h3>
        <p className="text-slate-400 text-sm text-center max-w-xs mb-5">Define what your team should focus on this scrim and rate each objective per game.</p>
        <div className="flex items-center gap-6 text-slate-500 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-slate-700/50 flex items-center justify-center text-[10px] font-bold text-amber-500/70">1</div>
            <span>Add objectives</span>
          </div>
          <ChevronDown className="w-3 h-3 -rotate-90 text-slate-700" />
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-slate-700/50 flex items-center justify-center text-[10px] font-bold text-amber-500/70">2</div>
            <span>Import games</span>
          </div>
          <ChevronDown className="w-3 h-3 -rotate-90 text-slate-700" />
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-slate-700/50 flex items-center justify-center text-[10px] font-bold text-amber-500/70">3</div>
            <span>Rate per game</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="text-left text-slate-500 text-[11px] font-medium uppercase tracking-wider px-3 py-2.5 w-[220px]">Objective</th>
            {games.map((game, idx) => (
              <th key={game._id} className="px-1.5 py-2.5 min-w-[68px]">
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-slate-500 text-[11px] font-medium">G{idx + 1}</span>
                  <div className={`w-1.5 h-1.5 rounded-full ${game.win ? "bg-emerald-400" : "bg-red-400"}`} />
                </div>
              </th>
            ))}
            <th className="text-center text-slate-500 text-[11px] font-medium uppercase tracking-wider px-3 py-2.5 w-[60px] border-l border-slate-700/20">Avg</th>
          </tr>
        </thead>
        <tbody>
          {objectives.map(obj => (
            <ObjectiveRow
              key={obj._id}
              session={session}
              games={games}
              objective={obj}
              onToggleObjective={onToggleObjective}
              onRatingsChange={(objId, ratings) => setRowRatings(prev => ({ ...prev, [objId]: ratings }))}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ObjectiveRow({ session, games, objective, onToggleObjective, onRatingsChange }) {
  const [results, setResults] = useState({})
  const [selectedGameId, setSelectedGameId] = useState(null)

  const fetchResults = async () => {
    try {
      const { ok, data, code } = await api.post("/scrim-objectif-result/search", { session_id: session._id, objectif_id: objective._id })
      if (!ok) return toast.error(code || "Failed to fetch results")
      const map = {}
      for (const r of data) {
        map[r.game_id] = r
      }
      setResults(map)
    } catch (error) {
      toast.error(error.code || "Failed to fetch results")
    }
  }

  useEffect(() => {
    if (session?._id && objective?._id) fetchResults()
  }, [session?._id, objective?._id])

  useEffect(() => {
    onRatingsChange(
      objective._id,
      Object.values(results)
        .filter(r => r.result != null)
        .map(r => r.result)
    )
  }, [results])

  const saveResult = async (gameId, updates) => {
    try {
      if (results[gameId]?._id) {
        const { ok, code } = await api.put(`/scrim-objectif-result/${results[gameId]._id}`, updates)
        if (!ok) return toast.error(code || "Failed to save result")
        fetchResults()
      } else {
        const { ok, code } = await api.post("/scrim-objectif-result", {
          objectif_id: objective._id,
          objectif_name: objective.name,
          game_id: gameId,
          game_name: games.find(g => g._id === gameId)?.name,
          session_id: session._id,
          session_name: session?.name,
          patch: session?.patch,
          ...updates
        })
        if (!ok) return toast.error(code || "Failed to save result")
        fetchResults()
      }
    } catch (error) {
      toast.error(error.code || "Failed to save result")
    }
  }

  const ratedGames = games.filter(g => results[g._id]?.result != null)
  const avg = objective.rating_type !== "toggle" && ratedGames.length > 0 ? ratedGames.reduce((sum, g) => sum + results[g._id]?.result, 0) / ratedGames.length : null
  const toggleRate =
    objective.rating_type === "toggle" && ratedGames.length > 0 ? Math.round((ratedGames.filter(g => results[g._id]?.result === 1).length / ratedGames.length) * 100) : null

  return (
    <>
      <tr className="group border-t border-slate-700/15 hover:bg-slate-700/10 transition-colors">
        <td className="px-3 py-3">
          <div className="flex items-center gap-2">
            <span className="text-white text-sm font-medium truncate max-w-[150px]" title={objective.name}>
              {objective.name}
            </span>
            {objective.player?.map(p => (
              <span key={p.id} className="text-[10px] text-amber-400/80 bg-amber-500/10 px-1.5 py-0.5 rounded-md shrink-0">
                {p.name}
              </span>
            ))}
            <span
              className={`text-[9px] px-1 py-0.5 rounded font-medium shrink-0 ${
                objective.rating_type === "toggle" ? "bg-violet-500/15 text-violet-400" : "bg-blue-500/15 text-blue-400"
              }`}
            >
              {objective.rating_type === "toggle" ? "Pass/Fail" : "/10"}
            </span>
            <button
              onClick={() => onToggleObjective(objective._id)}
              className="p-0.5 text-slate-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </td>
        {games.map(game => {
          if (objective.rating_type === "toggle") {
            return (
              <td key={game._id} className="px-1.5 py-1.5 text-center">
                <button
                  onClick={() => saveResult(game._id, { result: (results[game._id] || {}).result == null ? 1 : (results[game._id] || {}).result === 1 ? 0 : null })}
                  className={`relative w-14 h-11 rounded-lg text-sm font-semibold transition-all ${
                    selectedGameId === game._id ? "ring-2 ring-amber-500/60 ring-offset-1 ring-offset-slate-900" : ""
                  } ${
                    (results[game._id] || {}).result === 1
                      ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
                      : (results[game._id] || {}).result === 0
                        ? "bg-red-500/15 text-red-400 hover:bg-red-500/25"
                        : "bg-slate-700/20 text-slate-600 hover:bg-slate-700/35 hover:text-slate-400"
                  }`}
                >
                  {(results[game._id] || {}).result === 1 ? (
                    <Check className="w-4 h-4 mx-auto" />
                  ) : (results[game._id] || {}).result === 0 ? (
                    <X className="w-4 h-4 mx-auto" />
                  ) : (
                    "–"
                  )}
                  {(results[game._id] || {}).comment && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-[2px] rounded-full bg-amber-500/50" />}
                </button>
              </td>
            )
          }

          return (
            <td key={game._id} className="px-1.5 py-1.5 text-center">
              <button
                onClick={() => setSelectedGameId(selectedGameId === game._id ? null : game._id)}
                className={`relative w-14 h-11 rounded-lg text-sm font-bold tabular-nums transition-all ${
                  selectedGameId === game._id ? "ring-2 ring-amber-500/60 ring-offset-1 ring-offset-slate-900" : ""
                } ${
                  (results[game._id] || {}).result != null
                    ? `${getRatingBg((results[game._id] || {}).result)} ${getRatingTextColor((results[game._id] || {}).result)} hover:brightness-125`
                    : "bg-slate-700/20 text-slate-600 hover:bg-slate-700/35 hover:text-slate-400"
                }`}
              >
                {(results[game._id] || {}).result ?? "–"}
                {(results[game._id] || {}).comment && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-[2px] rounded-full bg-amber-500/50" />}
              </button>
            </td>
          )
        })}
        <td className="px-3 py-2.5 text-center border-l border-slate-700/20">
          {objective.rating_type === "toggle" ? (
            toggleRate != null ? (
              <span className={`text-sm font-bold tabular-nums ${toggleRate >= 70 ? "text-emerald-400" : toggleRate >= 50 ? "text-amber-400" : "text-red-400"}`}>
                {toggleRate}%
              </span>
            ) : (
              <span className="text-slate-700 text-xs">–</span>
            )
          ) : avg != null ? (
            <span className={`text-sm font-bold tabular-nums ${getRatingTextColor(Math.round(avg))}`}>{avg.toFixed(1)}</span>
          ) : (
            <span className="text-slate-700 text-xs">–</span>
          )}
        </td>
      </tr>
      {selectedGameId && (
        <tr>
          <td colSpan={games.length + 2} className="px-2 pb-3">
            <div className="bg-slate-900/60 border border-slate-700/25 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm font-medium">{objective.name}</span>
                  <ChevronDown className="w-3 h-3 text-slate-600 -rotate-90" />
                  <span className="text-slate-400 text-sm">{games.find(g => g._id === selectedGameId)?.name || "Game"}</span>
                </div>
                <button onClick={() => setSelectedGameId(null)} className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 rounded-lg transition-all">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {objective.rating_type === "toggle" ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => saveResult(selectedGameId, { result: (results[selectedGameId] || {}).result === 1 ? null : 1 })}
                    className={`flex-1 h-10 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                      (results[selectedGameId] || {}).result === 1
                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                        : "bg-slate-700/30 text-slate-500 hover:bg-slate-700/50 hover:text-slate-300"
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    Done
                  </button>
                  <button
                    onClick={() => saveResult(selectedGameId, { result: (results[selectedGameId] || {}).result === 0 ? null : 0 })}
                    className={`flex-1 h-10 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                      (results[selectedGameId] || {}).result === 0
                        ? "bg-red-500 text-white shadow-lg shadow-red-500/20"
                        : "bg-slate-700/30 text-slate-500 hover:bg-slate-700/50 hover:text-slate-300"
                    }`}
                  >
                    <X className="w-4 h-4" />
                    Not done
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  {Array.from({ length: RATING_MAX }, (_, i) => i + 1).map(value => (
                    <button
                      key={value}
                      onClick={() => saveResult(selectedGameId, { result: (results[selectedGameId] || {}).result === value ? null : value })}
                      className={`flex-1 h-9 rounded-lg text-xs font-bold transition-all ${
                        (results[selectedGameId] || {}).result === value
                          ? `${getRatingColor(value)} text-white shadow-md`
                          : `bg-slate-700/30 text-slate-500 hover:text-slate-300 hover:${getRatingBg(value)}`
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              )}

              <DebounceInput
                key={`${objective._id}-${selectedGameId}`}
                isTextArea
                placeholder="Add a note..."
                value={(results[selectedGameId] || {}).comment || ""}
                onChange={e => saveResult(selectedGameId, { comment: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 rounded-lg border-0 outline-none ring-0 focus:ring-1 focus:ring-amber-500/50 bg-slate-800/60 text-white placeholder-slate-600 text-sm resize-none"
              />
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
