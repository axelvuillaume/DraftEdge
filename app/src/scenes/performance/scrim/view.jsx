import { useState, useEffect, useRef } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "react-hot-toast"
import api from "@/services/api"
import useStore from "@/services/store"
import { getChampionIcon } from "@/utils"
import { ArrowLeft, Plus, X, Target, TrendingUp, ImagePlus, ChevronDown, Loader2, Upload, FileText, Check, Gamepad2, Search, Clock, AlertTriangle, FolderOpen } from "lucide-react"
import Modal from "@/components/modal"
import DebounceInput from "@/components/debounceInput"
import OpponentDropdown from "@/components/OpponentDropdown"

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

function patchesMatch(patch1, patch2) {
  if (!patch1 || !patch2) return true
  return getPatchPrefix(patch1) === getPatchPrefix(patch2)
}

export default function View() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [games, setGames] = useState([])
  const [showImportModal, setShowImportModal] = useState(false)
  const [sessionAvg, setSessionAvg] = useState(null)

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
      const { ok, data, code } = await api.post("/game/search", { session_id: id })
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-slate-500 text-sm">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 lg:p-6">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/scrim-hub/scrims")} className="p-1.5 text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <DebounceInput
              type="text"
              placeholder="Session name..."
              value={session.name || ""}
              onChange={e => updateSession("name", e.target.value)}
              className="bg-slate-700/50 border-0 outline-none ring-0 focus:ring-1 focus:ring-amber-500 rounded-lg px-3 py-1.5 text-white placeholder-slate-400 text-sm w-44"
            />
            <input
              type="date"
              value={formatDateInput(session.date)}
              onChange={e => updateSession("date", e.target.value)}
              className="bg-slate-700/50 border-0 outline-none ring-0 focus:ring-1 focus:ring-amber-500 rounded-lg px-3 py-1.5 text-white text-sm"
            />
            {session.patch && (
              <span className="px-2 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs">
                <span className="text-slate-400">Patch : </span>
                <span className="text-emerald-400 font-mono">{getPatchPrefix(session.patch)}</span>
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
            <FolderDropdown session={session} games={games} onUpdate={fetchSession} />
          </div>
          <div className="flex items-center gap-2">
            {sessionAvg != null && (
              <div className="flex items-center gap-1.5 bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-slate-400 text-xs">Avg</span>
                <span className={`text-base font-bold ${getRatingTextColor(Math.round(sessionAvg))}`}>{sessionAvg.toFixed(1)}</span>
                <span className="text-slate-600 text-xs">/{RATING_MAX}</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Left Column */}
          <div className="col-span-4 space-y-4">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-white font-semibold text-sm">Games</h2>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-amber-500/20 to-amber-600/10 hover:from-amber-500/30 hover:to-amber-600/20 text-amber-500 rounded-lg transition-colors text-xs font-medium"
                >
                  <ImagePlus className="w-3.5 h-3.5" />
                  Import a Game
                </button>
              </div>

              {games.length === 0 ? (
                <p className="text-slate-500 text-xs text-center py-4">No games imported yet</p>
              ) : (
                <div className="space-y-2">
                  {games.map(game => (
                    <div key={game._id} className="flex items-center justify-between bg-slate-700/30 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${game.win ? "bg-emerald-400" : "bg-red-400"}`} />
                        <span className="text-white text-sm truncate">{game.name || `Game ${game.game_id}`}</span>
                        {game.team_side && (
                          <span className={`text-xs px-1.5 py-0.5 rounded ${game.team_side === "blue" ? "bg-blue-500/20 text-blue-400" : "bg-red-500/20 text-red-400"}`}>
                            {game.team_side}
                          </span>
                        )}
                        <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700/30 text-slate-400">{game.win ? "Victory" : "Defeat"}</span>
                      </div>
                      <button onClick={() => removeGame(game)} className="p-1 text-slate-400 hover:text-red-400 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 space-y-2">
              <h2 className="text-white font-semibold text-sm">Comment</h2>
              <DebounceInput
                isTextArea
                placeholder="Add a comment for this session..."
                value={session.comment || ""}
                onChange={e => updateSession("comment", e.target.value)}
                className="w-full bg-slate-700/50 border-0 outline-none ring-0 focus:ring-1 focus:ring-amber-500 rounded-lg px-3 py-2 text-white placeholder-slate-400 text-sm"
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
    </div>
  )
}

function FolderDropdown({ session, games, onUpdate }) {
  const { user } = useStore()
  const [folders, setFolders] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")

  useEffect(() => {
    if (user?.team_id) fetchFolders()
  }, [user?.team_id])

  const fetchFolders = async () => {
    try {
      const { ok, data, code } = await api.post("/folder/search", { team_id: user?.team_id })
      if (!ok) return toast.error(code || "Failed to fetch folders")
      setFolders(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch folders")
    }
  }

  const selectFolder = async (folderId, folderName) => {
    setShowDropdown(false)
    try {
      const { ok, code } = await api.put(`/scrim-session/${session._id}`, { ...session, folder_id: folderId, folder_name: folderName })
      if (!ok) return toast.error(code || "Failed to update session")
    } catch (error) {
      toast.error(error.code || "Failed to update session")
    }
    if (games.length > 0) {
      try {
        const { ok, code } = await api.put("/game/move", { game_ids: games.map(g => g._id), folder_id: folderId || null })
        if (!ok) return toast.error(code || "Failed to move games")
      } catch (error) {
        toast.error(error.code || "Failed to move games")
      }
    }
    onUpdate()
  }

  const createFolder = async name => {
    try {
      const { ok, data, code } = await api.post("/folder", { name })
      if (!ok) return toast.error(code || "Failed to create folder")
      setFolders(prev => [data, ...prev])
      selectFolder(data._id, data.name)
      setNewFolderName("")
    } catch (error) {
      toast.error(error.code || "Failed to create folder")
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 bg-slate-700/50 rounded-lg px-3 py-1.5 text-sm w-36 hover:bg-slate-700/70 transition-colors"
      >
        <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
        <span className={session.folder_name ? "text-white" : "text-slate-400"}>{session.folder_name || "Folder..."}</span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-auto" />
      </button>

      {showDropdown && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
          <div className="absolute top-full left-0 mt-1 w-56 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-20 overflow-hidden">
            <div className="p-2 border-b border-slate-700/50">
              <form
                onSubmit={e => {
                  e.preventDefault()
                  if (newFolderName.trim()) createFolder(newFolderName.trim())
                }}
                className="flex items-center gap-1.5"
              >
                <input
                  type="text"
                  placeholder="New folder..."
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  className="flex-1 bg-slate-700/50 border-0 outline-none ring-0 focus:ring-1 focus:ring-amber-500 rounded-md px-2.5 py-1.5 text-white placeholder-slate-500 text-xs"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!newFolderName.trim()}
                  className="p-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-30 disabled:cursor-not-allowed text-slate-900 rounded-md transition-colors"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </form>
            </div>
            <div className="max-h-48 overflow-y-auto p-1">
              <button
                onClick={() => selectFolder(null, null)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${!session.folder_id ? "bg-amber-500/20 text-amber-400" : "text-slate-400 hover:bg-slate-700/50"}`}
              >
                No folder
              </button>
              {folders.map(folder => (
                <button
                  key={folder._id}
                  onClick={() => selectFolder(folder._id, folder.name)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${session.folder_id === folder._id ? "bg-amber-500/20 text-amber-400" : "text-slate-300 hover:bg-slate-700/50"}`}
                >
                  {folder.name}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function ObjectivesSection({ session, games, onSessionAvg }) {
  const { user } = useStore()
  const [allObjectives, setAllObjectives] = useState([])
  const [activeObjectifIds, setActiveObjectifIds] = useState([])
  const [showObjectivePicker, setShowObjectivePicker] = useState(false)
  const [newObjectifName, setNewObjectifName] = useState("")

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

  const createObjective = async name => {
    try {
      const { ok, data, code } = await api.post("/scrim-objectif", { name })
      if (!ok) return toast.error(code || "Failed to create objective")
      setAllObjectives(prev => [data, ...prev])
      setActiveObjectifIds(prev => [...prev, data._id])
      setNewObjectifName("")
    } catch (error) {
      toast.error(error.code || "Failed to create objective")
    }
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-semibold text-sm">Objectives Review</h2>
        <div className="relative">
          <button
            onClick={() => setShowObjectivePicker(!showObjectivePicker)}
            className="flex items-center gap-1 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-500 rounded-lg transition-colors text-xs font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Objective
          </button>

          {showObjectivePicker && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowObjectivePicker(false)} />
              <div className="absolute top-full right-0 mt-1 w-64 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-20 overflow-hidden">
                <div className="p-2 border-b border-slate-700/50">
                  <form
                    onSubmit={e => {
                      e.preventDefault()
                      if (newObjectifName.trim()) createObjective(newObjectifName.trim())
                    }}
                    className="flex items-center gap-1.5"
                  >
                    <input
                      type="text"
                      placeholder="New objective..."
                      value={newObjectifName}
                      onChange={e => setNewObjectifName(e.target.value)}
                      className="flex-1 bg-slate-700/50 border-0 outline-none ring-0 focus:ring-1 focus:ring-amber-500 rounded-md px-2.5 py-1.5 text-white placeholder-slate-500 text-xs"
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={!newObjectifName.trim()}
                      className="p-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-30 disabled:cursor-not-allowed text-slate-900 rounded-md transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </form>
                </div>
                <div className="max-h-48 overflow-y-auto p-1">
                  {allObjectives.length === 0 ? (
                    <p className="text-slate-500 text-xs text-center py-3">No objectives yet. Create one above.</p>
                  ) : (
                    allObjectives.map(obj => (
                      <button
                        key={obj._id}
                        onClick={() => setActiveObjectifIds(prev => (prev.includes(obj._id) ? prev.filter(oid => oid !== obj._id) : [...prev, obj._id]))}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${activeObjectifIds.includes(obj._id) ? "bg-amber-500/20 text-amber-400" : "text-slate-300 hover:bg-slate-700/50"}`}
                      >
                        <div className="font-medium">{obj.name}</div>
                        {obj.description && <div className="text-xs text-slate-500 mt-0.5">{obj.description}</div>}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <ObjectivesTable
        session={session}
        games={games}
        objectives={allObjectives.filter(o => activeObjectifIds.includes(o._id))}
        onAddActiveIds={ids => setActiveObjectifIds(prev => [...new Set([...prev, ...ids])])}
        onToggleObjective={objId => setActiveObjectifIds(prev => (prev.includes(objId) ? prev.filter(oid => oid !== objId) : [...prev, objId]))}
        onSessionAvg={onSessionAvg}
      />
    </div>
  )
}

function ObjectivesTable({ session, games, objectives, onAddActiveIds, onToggleObjective, onSessionAvg }) {
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

  if (objectives.length === 0 || games.length === 0) {
    return (
      <div className="text-center py-12">
        <Target className="w-10 h-10 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-500 text-sm">
          {games.length === 0 && objectives.length === 0
            ? "Add games and objectives to start reviewing"
            : games.length === 0
              ? "Add games to start reviewing"
              : "Add objectives to start reviewing"}
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="text-left text-slate-600 text-[11px] font-normal uppercase tracking-wider px-3 py-2 w-[220px]">Objective</th>
            {games.map((game, idx) => (
              <th key={game._id} className="px-1.5 py-2 min-w-[64px]">
                <div className="flex items-center justify-center gap-1.5">
                  <span className="text-slate-500 text-[11px] font-normal">G{idx + 1}</span>
                </div>
              </th>
            ))}
            <th className="text-center text-slate-600 text-[11px] font-normal uppercase tracking-wider px-3 py-2 w-[56px] border-l border-slate-700/30">Avg</th>
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
      <tr className="group border-t border-slate-700/15">
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-white text-sm font-medium truncate max-w-[180px]" title={objective.name}>
              {objective.name}
            </span>
            {objective.player_name && <span className="text-[10px] text-amber-400/80 bg-amber-500/10 px-1 py-0.5 rounded shrink-0">{objective.player_name}</span>}
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
                  className={`relative w-12 h-10 rounded-md text-sm font-semibold transition-all ${
                    selectedGameId === game._id ? "ring-1 ring-amber-500 " : ""
                  }${(results[game._id] || {}).result === 1 ? "bg-emerald-500/20 text-emerald-400" : (results[game._id] || {}).result === 0 ? "bg-red-500/20 text-red-400" : "bg-slate-700/25 text-slate-600 hover:bg-slate-700/40"}`}
                >
                  {(results[game._id] || {}).result === 1 ? (
                    <Check className="w-4 h-4 mx-auto" />
                  ) : (results[game._id] || {}).result === 0 ? (
                    <X className="w-4 h-4 mx-auto" />
                  ) : (
                    "--"
                  )}
                  {(results[game._id] || {}).comment && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-3 h-[2px] rounded-full bg-slate-500" />}
                </button>
              </td>
            )
          }

          return (
            <td key={game._id} className="px-1.5 py-1.5 text-center">
              <button
                onClick={() => setSelectedGameId(selectedGameId === game._id ? null : game._id)}
                className={`relative w-12 h-10 rounded-md text-sm font-semibold tabular-nums transition-all ${
                  selectedGameId === game._id ? "bg-slate-600/50 ring-1 ring-amber-500" : "bg-slate-700/25 hover:bg-slate-700/40"
                } ${(results[game._id] || {}).result != null ? getRatingTextColor((results[game._id] || {}).result) : "text-slate-600"}`}
              >
                {(results[game._id] || {}).result ?? "--"}
                {(results[game._id] || {}).comment && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-3 h-[2px] rounded-full bg-slate-500" />}
              </button>
            </td>
          )
        })}
        <td className="px-3 py-2 text-center border-l border-slate-700/30">
          {objective.rating_type === "toggle" ? (
            toggleRate != null ? (
              <span className={`text-sm font-bold tabular-nums ${toggleRate >= 70 ? "text-emerald-400" : toggleRate >= 50 ? "text-amber-400" : "text-red-400"}`}>
                {toggleRate}%
              </span>
            ) : (
              <span className="text-slate-700 text-xs">--</span>
            )
          ) : avg != null ? (
            <span className={`text-sm font-bold tabular-nums ${getRatingTextColor(Math.round(avg))}`}>{avg.toFixed(1)}</span>
          ) : (
            <span className="text-slate-700 text-xs">--</span>
          )}
        </td>
      </tr>
      {selectedGameId && (
        <tr>
          <td colSpan={games.length + 2} className="px-3 pb-3">
            <div className="border-t border-slate-700/30 pt-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-white text-sm font-medium">{objective.name}</span>
                  <span className="text-slate-600 mx-2">/</span>
                  <span className="text-slate-400 text-sm">{games.find(g => g._id === selectedGameId)?.name || "Game"}</span>
                </div>
                <button onClick={() => setSelectedGameId(null)} className="p-1 text-slate-600 hover:text-slate-300 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {objective.rating_type === "toggle" ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => saveResult(selectedGameId, { result: (results[selectedGameId] || {}).result === 1 ? null : 1 })}
                    className={`flex-1 h-10 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                      (results[selectedGameId] || {}).result === 1 ? "bg-emerald-500 text-white" : "bg-slate-700/40 text-slate-500 hover:bg-slate-700/60 hover:text-slate-300"
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    Done
                  </button>
                  <button
                    onClick={() => saveResult(selectedGameId, { result: (results[selectedGameId] || {}).result === 0 ? null : 0 })}
                    className={`flex-1 h-10 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                      (results[selectedGameId] || {}).result === 0 ? "bg-red-500 text-white" : "bg-slate-700/40 text-slate-500 hover:bg-slate-700/60 hover:text-slate-300"
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
                      className={`flex-1 h-8 rounded-md text-xs font-bold transition-all ${
                        (results[selectedGameId] || {}).result === value
                          ? `${getRatingColor(value)} text-white`
                          : "bg-slate-700/40 text-slate-500 hover:bg-slate-700/60 hover:text-slate-300"
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
                className="w-full px-3 py-2 rounded-lg border-0 outline-none ring-0 focus:ring-1 focus:ring-amber-500 bg-slate-700/30 text-white placeholder-slate-600 text-sm resize-none"
              />
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function UploadModal({ isOpen, onClose, onSuccess, session, selectedGames = [] }) {
  const { user } = useStore()
  const [activeTab, setActiveTab] = useState("import")

  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef(null)

  const [roflConfig, setRoflConfig] = useState({ team_side: "", opponent_id: "", opponent_name: "", name: "", folder_id: "", folder_name: "", draft_url: "" })
  const [roflPreview, setRoflPreview] = useState(null)
  const [parsing, setParsing] = useState(false)

  const [historyGames, setHistoryGames] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedHistoryIds, setSelectedHistoryIds] = useState([])
  const [addingGames, setAddingGames] = useState(false)

  const [folders, setFolders] = useState([])
  const [showFolderDropdown, setShowFolderDropdown] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")

  const fetchFolders = async () => {
    try {
      const { ok, data, code } = await api.post("/folder/search", { team_id: user?.team_id })
      if (!ok) return toast.error(code || "Failed to fetch folders")
      setFolders(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch folders")
    }
  }

  useEffect(() => {
    if (isOpen && user?.team_id) fetchFolders()
  }, [isOpen, user?.team_id])

  useEffect(() => {
    if (isOpen && session?.opponent_name) setRoflConfig(prev => ({ ...prev, opponent_id: session.opponent_id || "", opponent_name: session.opponent_name }))
  }, [isOpen, session?.opponent])

  useEffect(() => {
    if (isOpen && session?.folder_id) setRoflConfig(prev => ({ ...prev, folder_id: session.folder_id, folder_name: session.folder_name }))
  }, [isOpen, session?.folder_id])

  useEffect(() => {
    if (isOpen && activeTab === "history" && user?.team_id) fetchHistoryGames()
  }, [isOpen, activeTab, user?.team_id])

  const fetchHistoryGames = async () => {
    try {
      const { ok, data, code } = await api.post("/game/search", { team_id: user?.team_id, limit: 100 })
      if (!ok) return toast.error(code || "Failed to fetch games")
      setHistoryGames(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch games")
    }
  }

  const toggleHistoryGame = gameId => {
    setSelectedHistoryIds(prev => (prev.includes(gameId) ? prev.filter(id => id !== gameId) : [...prev, gameId]))
  }

  const addSelectedGames = async () => {
    if (selectedHistoryIds.length === 0) return
    setAddingGames(true)
    try {
      for (const gameId of selectedHistoryIds) {
        const { ok, code } = await api.put(`/game/${gameId}`, {
          session_id: session?._id,
          session_name: session?.name,
          ...(session?.opponent_id && { opponent_id: session.opponent_id, opponent_name: session.opponent_name }),
          ...(roflConfig.folder_id && { folder_id: roflConfig.folder_id, folder_name: roflConfig.folder_name })
        })
        if (!ok) return toast.error(code || "Failed to add game")
      }
      toast.success(`${selectedHistoryIds.length} game${selectedHistoryIds.length > 1 ? "s" : ""} added to session`)
      const firstAddedGame = historyGames.find(g => selectedHistoryIds.includes(g._id))
      setSelectedHistoryIds([])
      handleClose()
      onSuccess?.(firstAddedGame?.patch)
    } catch (error) {
      toast.error(error.code || "Failed to add games")
    } finally {
      setAddingGames(false)
    }
  }

  const createFolder = async name => {
    try {
      const { ok, data, code } = await api.post("/folder", { name })
      if (!ok) return toast.error(code || "Failed to create folder")
      setFolders(prev => [data, ...prev])
      setRoflConfig(prev => ({ ...prev, folder_id: data._id, folder_name: data.name }))
      setNewFolderName("")
      setShowFolderDropdown(false)
    } catch (error) {
      toast.error(error.code || "Failed to create folder")
    }
  }

  const handleFiles = async selectedFiles => {
    if (!selectedFiles || selectedFiles.length === 0) return
    const selectedFile = selectedFiles[0]
    if (!selectedFile.name.endsWith(".rofl")) return toast.error("File must be a .rofl")
    setFile(selectedFile)
    setParsing(true)
    try {
      const formData = new FormData()
      formData.append("replay", selectedFile)
      const response = await api.postFormData("/parser/parse", formData)
      if (response.ok && response.data) {
        setRoflPreview(response.data)
        toast.success("ROFL file parsed successfully")
      } else {
        toast.error(response.error || response.details || "Error during parsing")
        setFile(null)
      }
    } catch (error) {
      toast.error(error.code || "Failed to parse file")
      setFile(null)
    } finally {
      setParsing(false)
    }
  }

  const removeFile = () => {
    setFile(null)
    setRoflPreview(null)
    setRoflConfig({ team_side: "", opponent_id: "", opponent_name: "", name: "", folder_id: "", folder_name: "", draft_url: "" })
  }

  const handleDrag = e => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true)
    if (e.type === "dragleave") setDragActive(false)
  }

  const handleDrop = e => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files)
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setUploadProgress("uploading")
    if (!roflConfig.team_side) return toast.error("Select your side (Blue/Red)")
    try {
      const formData = new FormData()
      formData.append("replay", file)
      formData.append("team_side", roflConfig.team_side)
      formData.append("team_id", user?.team_id || "")
      formData.append("team_name", user?.team_name || "")
      if (roflConfig.opponent_id) formData.append("opponent_id", roflConfig.opponent_id)
      formData.append("opponent_name", roflConfig.opponent_name)
      formData.append("name", roflConfig.name)
      if (session?._id) formData.append("session_id", session._id)
      if (session?.name) formData.append("session_name", session.name)
      if (roflConfig.folder_id) formData.append("folder_id", roflConfig.folder_id)
      if (roflConfig.folder_name) formData.append("folder_name", roflConfig.folder_name)
      if (roflConfig.draft_url) formData.append("draft_url", roflConfig.draft_url)
      const response = await api.postFormData("/parser/import", formData)
      if (response.ok) {
        setUploadProgress("success")
        toast.success(roflConfig.draft_url ? "Game & draft imported!" : "Game imported successfully!")
        setTimeout(() => {
          handleClose()
          onSuccess?.(roflPreview?.game?.patch)
        }, 1000)
      } else {
        toast.error(response.error || response.details || "Error during import")
        setUploadProgress("error")
      }
    } catch (error) {
      toast.error(error.code || "Failed to import game")
      setUploadProgress("error")
    } finally {
      setUploading(false)
    }
  }

  const handleClose = () => {
    if (uploading || parsing || addingGames) return
    setFile(null)
    setUploadProgress(null)
    setRoflPreview(null)
    setRoflConfig({ team_side: "", opponent_id: "", opponent_name: "", name: "", folder_id: "", folder_name: "", draft_url: "" })
    setShowFolderDropdown(false)
    setNewFolderName("")
    setActiveTab("import")
    setSelectedHistoryIds([])
    setSearchQuery("")
    onClose()
  }

  const filteredHistoryGames = historyGames.filter(g => {
    if (session?.patch && !patchesMatch(session.patch, g.patch)) return false
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      (g.name && g.name.toLowerCase().includes(q)) ||
      (g.opponent_name && g.opponent_name.toLowerCase().includes(q)) ||
      (g.patch && g.patch.toLowerCase().includes(q)) ||
      (g.game_id && g.game_id.toLowerCase().includes(q))
    )
  })

  const formatDuration = seconds => {
    if (!seconds) return "--"
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
  }

  const formatDate = date => {
    if (!date) return ""
    return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-slate-800 border border-slate-700">
      <div className="p-6">
        <h2 className="text-xl font-bold text-white mb-2">Add a Game</h2>
        <p className="text-slate-400 text-sm mb-4">Import a new replay or pick from your team's game history.</p>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-700/50 rounded-lg p-1 mb-5">
          <button
            onClick={() => setActiveTab("import")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              activeTab === "import" ? "bg-slate-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
            }`}
          >
            <Upload className="w-4 h-4" />
            Import .rofl
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              activeTab === "history" ? "bg-slate-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
            Game History
          </button>
        </div>

        {/* === IMPORT TAB === */}
        {activeTab === "import" && (
          <>
            {!file ? (
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                  dragActive ? "border-amber-500 bg-amber-500/10" : "border-slate-600 hover:border-amber-400 hover:bg-amber-500/5"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
              >
                <input ref={inputRef} type="file" accept=".rofl" onChange={e => handleFiles(e.target.files)} className="hidden" />
                <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-300 font-medium mb-1">Drop your .rofl file here</p>
                <p className="text-slate-500 text-sm">or click to browse</p>
                <p className="text-slate-500 text-xs mt-2">Documents/League of Legends/Replays/</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Draft URL */}
                <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
                  <label className="block text-sm font-semibold text-amber-400 mb-2">Draft URL</label>
                  <input
                    type="text"
                    value={roflConfig.draft_url}
                    onChange={e => setRoflConfig(prev => ({ ...prev, draft_url: e.target.value }))}
                    placeholder="https://drafter.lol/draft/... or https://draftlol.dawe.gg/..."
                    className="w-full px-3 py-2.5 rounded-lg border border-amber-500/30 bg-slate-800 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-all"
                  />
                  <p className="text-slate-400 text-xs mt-1.5">Paste a drafter.lol or dawe.gg link to import picks order & bans</p>
                </div>

                {roflPreview && (
                  <div className="p-4 bg-slate-900 rounded-xl text-white">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-slate-400 text-xs">PATCH</p>
                        <p className="font-mono">{roflPreview.game?.patch}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs">DURATION</p>
                        <p className="font-mono">
                          {Math.floor(roflPreview.game?.duration / 60)}:{String(roflPreview.game?.duration % 60).padStart(2, "0")}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs">GAME ID</p>
                        <p className="font-mono text-sm">{roflPreview.game?.game_id}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className={`p-3 rounded-lg ${roflPreview.game?.blue_team?.win ? "bg-blue-500/20 border border-blue-500/30" : "bg-slate-800"}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-blue-400 font-semibold text-sm">BLUE TEAM</span>
                          {roflPreview.game?.blue_team?.win && <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded">WIN</span>}
                        </div>
                        <div className="space-y-1">
                          {roflPreview.players
                            ?.filter(p => p.side === "blue")
                            .map((p, i) => (
                              <div key={i} className="flex items-center justify-between text-xs">
                                <span className="text-slate-300">{p.champion}</span>
                                <span className="text-slate-500">
                                  {p.kills}/{p.deaths}/{p.assists}
                                </span>
                              </div>
                            ))}
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-700 text-xs text-slate-400">
                          {roflPreview.game?.blue_team?.kills} kills · {Math.round(roflPreview.game?.blue_team?.gold / 1000)}k gold
                        </div>
                      </div>
                      <div className={`p-3 rounded-lg ${roflPreview.game?.red_team?.win ? "bg-red-500/20 border border-red-500/30" : "bg-slate-800"}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-red-400 font-semibold text-sm">RED TEAM</span>
                          {roflPreview.game?.red_team?.win && <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded">WIN</span>}
                        </div>
                        <div className="space-y-1">
                          {roflPreview.players
                            ?.filter(p => p.side === "red")
                            .map((p, i) => (
                              <div key={i} className="flex items-center justify-between text-xs">
                                <span className="text-slate-300">{p.champion}</span>
                                <span className="text-slate-500">
                                  {p.kills}/{p.deaths}/{p.assists}
                                </span>
                              </div>
                            ))}
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-700 text-xs text-slate-400">
                          {roflPreview.game?.red_team?.kills} kills · {Math.round(roflPreview.game?.red_team?.gold / 1000)}k gold
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {roflPreview && session?.patch && !patchesMatch(session.patch, roflPreview.game?.patch) && (
                  <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <p className="text-red-400 text-sm">
                      Patch mismatch: this game is on <span className="font-mono font-medium">{getPatchPrefix(roflPreview.game?.patch)}</span> but the session is on{" "}
                      <span className="font-mono font-medium">{getPatchPrefix(session?.patch)}</span>
                    </p>
                  </div>
                )}

                {roflPreview && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">Your team was *</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setRoflConfig(prev => ({ ...prev, team_side: "blue" }))}
                          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                            roflConfig.team_side === "blue" ? "bg-blue-500 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                          }`}
                        >
                          Blue
                        </button>
                        <button
                          type="button"
                          onClick={() => setRoflConfig(prev => ({ ...prev, team_side: "red" }))}
                          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                            roflConfig.team_side === "red" ? "bg-red-500 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                          }`}
                        >
                          Red
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">Opponent</label>
                      <div className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-700/50 text-white text-sm">
                        {session?.opponent_name || <span className="text-slate-400">No opponent set</span>}
                      </div>
                    </div>

                    <div className="relative">
                      <label className="block text-sm font-medium text-slate-400 mb-1">Folder</label>
                      <button
                        type="button"
                        onClick={() => setShowFolderDropdown(!showFolderDropdown)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-slate-600 hover:border-slate-500 bg-slate-700/50 transition-all text-left"
                      >
                        <div className="flex items-center gap-2">
                          <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
                          <span className={roflConfig.folder_name ? "text-white" : "text-slate-400"}>{roflConfig.folder_name || "Select folder..."}</span>
                        </div>
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      </button>

                      {showFolderDropdown && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setShowFolderDropdown(false)} />
                          <div className="absolute top-full left-0 mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-20 overflow-hidden">
                            <div className="p-2 border-b border-slate-700/50">
                              <form
                                onSubmit={e => {
                                  e.preventDefault()
                                  if (newFolderName.trim()) createFolder(newFolderName.trim())
                                }}
                                className="flex items-center gap-1.5"
                              >
                                <input
                                  type="text"
                                  placeholder="New folder..."
                                  value={newFolderName}
                                  onChange={e => setNewFolderName(e.target.value)}
                                  className="flex-1 bg-slate-700/50 border-0 outline-none ring-0 focus:ring-1 focus:ring-amber-500 rounded-md px-2.5 py-1.5 text-white placeholder-slate-500 text-xs"
                                  autoFocus
                                />
                                <button
                                  type="submit"
                                  disabled={!newFolderName.trim()}
                                  className="p-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-30 disabled:cursor-not-allowed text-slate-900 rounded-md transition-colors"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </form>
                            </div>
                            <div className="max-h-48 overflow-y-auto p-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setRoflConfig(prev => ({ ...prev, folder_id: "", folder_name: "" }))
                                  setShowFolderDropdown(false)
                                }}
                                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${!roflConfig.folder_id ? "bg-amber-500/20 text-amber-400" : "text-slate-400 hover:bg-slate-700/50"}`}
                              >
                                No folder
                              </button>
                              {folders.map(folder => (
                                <button
                                  key={folder._id}
                                  type="button"
                                  onClick={() => {
                                    setRoflConfig(prev => ({ ...prev, folder_id: folder._id, folder_name: folder.name }))
                                    setShowFolderDropdown(false)
                                  }}
                                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${roflConfig.folder_id === folder._id ? "bg-amber-500/20 text-amber-400" : "text-slate-300 hover:bg-slate-700/50"}`}
                                >
                                  {folder.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">Game Name (optional)</label>
                      <input
                        type="text"
                        value={roflConfig.name}
                        onChange={e => setRoflConfig(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Ex: Scrim Week 5 - Game 1"
                        className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-700/50 text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none transition-all"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button
                onClick={handleUpload}
                disabled={!file || uploading || parsing || !roflConfig.team_side || (session?.patch && roflPreview && !patchesMatch(session.patch, roflPreview.game?.patch))}
                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold rounded-xl transition-all duration-200 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Importing...</span>
                  </>
                ) : parsing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Import Game</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}

        {/* === HISTORY TAB === */}
        {activeTab === "history" && (
          <>
            {/* Search bar */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, opponent, patch..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-600 bg-slate-700/50 text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none transition-all text-sm"
              />
            </div>

            {/* Games list */}
            {filteredHistoryGames.length === 0 ? (
              <div className="text-center py-12">
                <Gamepad2 className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">{searchQuery ? "No games match your search" : "No games found for your team"}</p>
              </div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto space-y-1.5 pr-1">
                {filteredHistoryGames.map(game => {
                  const isAlreadyInSession = selectedGames.some(g => g._id === game._id)
                  const isInOtherSession = !isAlreadyInSession && game.session_id && game.session_id !== session?._id
                  const isSelected = selectedHistoryIds.includes(game._id)

                  return (
                    <button
                      key={game._id}
                      onClick={() => {
                        if (isAlreadyInSession) return
                        toggleHistoryGame(game._id)
                      }}
                      disabled={isAlreadyInSession}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                        isAlreadyInSession
                          ? "bg-slate-700/30 border-slate-600 opacity-50 cursor-not-allowed"
                          : isSelected
                            ? "bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/40"
                            : "bg-slate-700/50 border-slate-600 hover:border-slate-500 hover:bg-slate-700"
                      }`}
                    >
                      {/* Checkbox */}
                      <div
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          isAlreadyInSession ? "border-slate-500 bg-slate-600" : isSelected ? "border-amber-500 bg-amber-500" : "border-slate-500"
                        }`}
                      >
                        {(isSelected || isAlreadyInSession) && <Check className="w-3 h-3 text-white" />}
                      </div>

                      {/* Win/Loss indicator */}
                      <div className={`w-1.5 h-8 rounded-full flex-shrink-0 ${game.win ? "bg-emerald-400" : "bg-red-400"}`} />

                      {/* Team champion icons */}
                      {game.champions && game.champions[game.team_side] && (
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          {["top", "jungle", "mid", "bottom", "support"].map(role => {
                            const champ = game.champions[game.team_side]?.[role]
                            return champ ? (
                              <div key={role} className="w-6 h-6 rounded overflow-hidden bg-slate-600 border border-slate-500/50" title={champ}>
                                <img src={getChampionIcon(champ)} alt={champ} className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div key={role} className="w-6 h-6 rounded bg-slate-600 border border-slate-500/50" />
                            )
                          })}
                        </div>
                      )}

                      {/* Game info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-white text-sm font-medium truncate">{game.name || `Game ${game.game_id}`}</span>
                          {game.team_side && (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${game.team_side === "blue" ? "bg-blue-500/20 text-blue-400" : "bg-red-500/20 text-red-400"}`}
                            >
                              {game.team_side}
                            </span>
                          )}
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${game.win ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                            {game.win ? "W" : "L"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          {game.opponent_name && <span className="text-slate-500 text-xs">vs {game.opponent_name}</span>}
                          {game.patch && <span className="text-slate-400 text-xs">{game.patch}</span>}
                          <span className="text-slate-400 text-xs flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDuration(game.duration)}
                          </span>
                          {game.date && <span className="text-slate-400 text-xs">{formatDate(game.date)}</span>}
                        </div>
                      </div>

                      {/* Status badge */}
                      {isAlreadyInSession && <span className="text-[10px] text-slate-400 bg-slate-600 px-2 py-1 rounded-md flex-shrink-0">Already added</span>}
                      {isInOtherSession && (
                        <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-1 rounded-md flex-shrink-0 truncate max-w-[100px]" title={game.session_name}>
                          {game.session_name || "Other session"}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-700">
              <span className="text-slate-400 text-sm">
                {selectedHistoryIds.length > 0 ? `${selectedHistoryIds.length} game${selectedHistoryIds.length > 1 ? "s" : ""} selected` : "Select games to add"}
              </span>
              <button
                onClick={addSelectedGames}
                disabled={selectedHistoryIds.length === 0 || addingGames}
                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold rounded-xl transition-all duration-200 disabled:cursor-not-allowed"
              >
                {addingGames ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Add to Session</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
