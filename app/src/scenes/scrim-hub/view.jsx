import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "react-hot-toast"
import api from "@/services/api"
import useStore from "@/services/store"
import { ArrowLeft, Plus, X, Target, TrendingUp, ImagePlus, ChevronDown } from "lucide-react"
import { UploadModal } from "@/components/NavBar"
import DebounceInput from "@/components/debounceInput"

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

export default function View() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useStore()
  const [session, setSession] = useState(null)
  const [selectedGames, setSelectedGames] = useState([])
  const [allObjectives, setAllObjectives] = useState([])
  const [results, setResults] = useState({})
  const [activeObjectifIds, setActiveObjectifIds] = useState([])

  const [enemyTeams, setEnemyTeams] = useState([])
  const [showOpponentDropdown, setShowOpponentDropdown] = useState(false)
  const [newTeamName, setNewTeamName] = useState("")

  const [newObjectifName, setNewObjectifName] = useState("")

  const [showImportModal, setShowImportModal] = useState(false)
  const [showObjectivePicker, setShowObjectivePicker] = useState(false)
  const [selectedCell, setSelectedCell] = useState(null)

  const selectedObjectives = allObjectives.filter(o => activeObjectifIds.includes(o._id))

  useEffect(() => {
    if (!id) return
    fetchSession()
    fetchGames()
    fetchObjectives()
    fetchResults()
    fetchEnemyTeams()
  }, [id])

  const fetchSession = async () => {
    try {
      const { ok, data, code } = await api.get(`/scrim-session/${id}`)
      if (!ok) return toast.error(code)
      setSession(data)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const fetchGames = async () => {
    try {
      const { ok, data, code } = await api.post("/game/search", { session_id: id })
      if (!ok) return toast.error(code)
      setSelectedGames(data)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const fetchEnemyTeams = async () => {
    try {
      const { ok, data } = await api.post("/enemy-team/search", { team_id: user?.team_id })
      if (!ok) return
      setEnemyTeams(data)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const createEnemyTeam = async name => {
    try {
      const { ok, data, code } = await api.post("/enemy-team", { name })
      if (!ok) return toast.error(code)
      setEnemyTeams(prev => [data, ...prev])
      updateSession("opponent", data.name)
      setNewTeamName("")
      setShowOpponentDropdown(false)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const createObjective = async name => {
    try {
      const { ok, data, code } = await api.post("/scrim-objectif", { name })
      if (!ok) return toast.error(code)
      setAllObjectives(prev => [data, ...prev])
      setActiveObjectifIds(prev => [...prev, data._id])
      setNewObjectifName("")
    } catch (error) {
      toast.error(error.message)
    }
  }

  const fetchObjectives = async () => {
    try {
      const { ok, data, code } = await api.post("/scrim-objectif/search", { team_id: user?.team_id })
      if (!ok) return toast.error(code)
      setAllObjectives(data)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const fetchResults = async () => {
    try {
      const { ok, data, code } = await api.post("/scrim-objectif-result/search", { session_id: id })
      if (!ok) return toast.error(code)
      const map = {}
      const objIds = new Set()
      for (const r of data) {
        if (!map[r.objectif_id]) map[r.objectif_id] = {}
        map[r.objectif_id][r.game_id] = r
        objIds.add(r.objectif_id)
      }
      setResults(map)
      setActiveObjectifIds(prev => [...new Set([...prev, ...objIds])])
    } catch (error) {
      toast.error(error.message)
    }
  }

  const updateSession = async (field, value) => {
    setSession(prev => ({ ...prev, [field]: value }))
    try {
      const { ok, code } = await api.put(`/scrim-session/${id}`, { [field]: value })
      if (!ok) return toast.error(code)
      fetchSession()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const removeGame = async game => {
    setSelectedGames(prev => prev.filter(g => g._id !== game._id))
    try {
      const { ok, code } = await api.put(`/game/${game._id}`, { session_id: null, session_name: null })
      if (!ok) return toast.error(code)
      fetchGames()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const saveResult = async (objectifId, gameId, updates) => {
    try {
      const existing = results[objectifId]?.[gameId]
      if (existing?._id) {
        const { ok, code } = await api.put(`/scrim-objectif-result/${existing._id}`, updates)
        if (!ok) return toast.error(code)
        fetchResults()
      } else {
        const obj = allObjectives.find(o => o._id === objectifId)
        const game = selectedGames.find(g => g._id === gameId)
        const { ok, code } = await api.post("/scrim-objectif-result", {
          objectif_id: objectifId,
          objectif_name: obj?.name,
          game_id: gameId,
          game_name: game?.name,
          session_id: id,
          session_name: session?.name,
          ...updates
        })
        if (!ok) return toast.error(code)
        fetchResults()
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  const getResult = (objectifId, gameId) => results[objectifId]?.[gameId] || {}

  const allRatings = []
  for (const objId of Object.keys(results)) {
    for (const gameId of Object.keys(results[objId])) {
      if (results[objId][gameId].result != null) allRatings.push(results[objId][gameId].result)
    }
  }
  const sessionAvg = allRatings.length > 0 ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length : null

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
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/scrim-hub")} className="p-2 text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <DebounceInput
              type="text"
              placeholder="Session name..."
              value={session.name || ""}
              onChange={e => updateSession("name", e.target.value)}
              className="bg-slate-700/50 border-0 outline-none ring-0 focus:ring-1 focus:ring-amber-500 rounded-lg px-4 py-2 text-white placeholder-slate-400 text-sm w-72"
            />
            <input
              type="date"
              value={formatDateInput(session.date)}
              onChange={e => updateSession("date", e.target.value)}
              className="bg-slate-700/50 border-0 outline-none ring-0 focus:ring-1 focus:ring-amber-500 rounded-lg px-4 py-2 text-white text-sm"
            />
            <div className="relative">
              <button
                onClick={() => setShowOpponentDropdown(!showOpponentDropdown)}
                className="flex items-center gap-2 bg-slate-700/50 rounded-lg px-4 py-2 text-sm w-48 hover:bg-slate-700/70 transition-colors"
              >
                <span className={session.opponent ? "text-white" : "text-slate-400"}>{session.opponent || "Opponent..."}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-auto" />
              </button>

              {showOpponentDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowOpponentDropdown(false)} />
                  <div className="absolute top-full left-0 mt-1 w-56 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-20 overflow-hidden">
                    {/* Create new team */}
                    <div className="p-2 border-b border-slate-700/50">
                      <form
                        onSubmit={e => {
                          e.preventDefault()
                          if (newTeamName.trim()) createEnemyTeam(newTeamName.trim())
                        }}
                        className="flex items-center gap-1.5"
                      >
                        <input
                          type="text"
                          placeholder="New team..."
                          value={newTeamName}
                          onChange={e => setNewTeamName(e.target.value)}
                          className="flex-1 bg-slate-700/50 border-0 outline-none ring-0 focus:ring-1 focus:ring-amber-500 rounded-md px-2.5 py-1.5 text-white placeholder-slate-500 text-xs"
                          autoFocus
                        />
                        <button
                          type="submit"
                          disabled={!newTeamName.trim()}
                          className="p-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-30 disabled:cursor-not-allowed text-slate-900 rounded-md transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </form>
                    </div>

                    {/* Team list */}
                    <div className="max-h-48 overflow-y-auto p-1">
                      {/* No opponent option */}
                      <button
                        onClick={() => {
                          updateSession("opponent", null)
                          setShowOpponentDropdown(false)
                        }}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${!session.opponent ? "bg-amber-500/20 text-amber-400" : "text-slate-400 hover:bg-slate-700/50"}`}
                      >
                        No opponent
                      </button>

                      {enemyTeams.map(team => (
                        <button
                          key={team._id}
                          onClick={() => {
                            updateSession("opponent", team.name)
                            setShowOpponentDropdown(false)
                          }}
                          className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${session.opponent === team.name ? "bg-amber-500/20 text-amber-400" : "text-slate-300 hover:bg-slate-700/50"}`}
                        >
                          {team.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {sessionAvg != null && (
              <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2">
                <TrendingUp className="w-4 h-4 text-amber-500" />
                <span className="text-slate-400 text-xs">Session avg</span>
                <span className={`text-lg font-bold ${getRatingTextColor(Math.round(sessionAvg))}`}>{sessionAvg.toFixed(1)}</span>
                <span className="text-slate-600 text-xs">/ {RATING_MAX}</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Left Column - Games */}
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

              {/* Selected Games List */}
              {selectedGames.length === 0 ? (
                <p className="text-slate-500 text-xs text-center py-4">No games imported yet</p>
              ) : (
                <div className="space-y-2">
                  {selectedGames.map(game => (
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

            {/* Comment */}
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

          {/* Right Column - Objectives Review */}
          <div className="col-span-8">
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
                        {/* Create new objective */}
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

                        {/* Existing objectives list */}
                        <div className="max-h-48 overflow-y-auto p-1">
                          {allObjectives.length === 0 ? (
                            <p className="text-slate-500 text-xs text-center py-3">No objectives yet. Create one above.</p>
                          ) : (
                            allObjectives.map(obj => {
                              const isSelected = activeObjectifIds.includes(obj._id)
                              return (
                                <button
                                  key={obj._id}
                                  onClick={() => setActiveObjectifIds(prev => (prev.includes(obj._id) ? prev.filter(oid => oid !== obj._id) : [...prev, obj._id]))}
                                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${isSelected ? "bg-amber-500/20 text-amber-400" : "text-slate-300 hover:bg-slate-700/50"}`}
                                >
                                  <div className="font-medium">{obj.name}</div>
                                  {obj.description && <div className="text-xs text-slate-500 mt-0.5">{obj.description}</div>}
                                </button>
                              )
                            })
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Assessment Matrix */}
              {selectedObjectives.length === 0 || selectedGames.length === 0 ? (
                <div className="text-center py-12">
                  <Target className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">
                    {selectedGames.length === 0 && selectedObjectives.length === 0
                      ? "Add games and objectives to start reviewing"
                      : selectedGames.length === 0
                        ? "Add games to start reviewing"
                        : "Add objectives to start reviewing"}
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <th className="text-left text-slate-600 text-[11px] font-normal uppercase tracking-wider px-3 py-2 w-[220px]">Objective</th>
                          {selectedGames.map((game, idx) => (
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
                        {selectedObjectives.map(obj => {
                          const ratedGames = selectedGames.filter(g => getResult(obj._id, g._id).result != null)
                          const avg = ratedGames.length > 0 ? ratedGames.reduce((sum, g) => sum + getResult(obj._id, g._id).result, 0) / ratedGames.length : null

                          return (
                            <tr key={obj._id} className="group border-t border-slate-700/15">
                              <td className="px-3 py-2.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-white text-sm font-medium truncate max-w-[180px]" title={obj.name}>
                                    {obj.name}
                                  </span>
                                  <button
                                    onClick={() => setActiveObjectifIds(prev => (prev.includes(obj._id) ? prev.filter(oid => oid !== obj._id) : [...prev, obj._id]))}
                                    className="p-0.5 text-slate-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              </td>
                              {selectedGames.map(game => {
                                const r = getResult(obj._id, game._id)
                                const isActive = selectedCell?.objectiveId === obj._id && selectedCell?.gameId === game._id
                                const hasComment = !!r.comment

                                return (
                                  <td key={game._id} className="px-1.5 py-1.5 text-center">
                                    <button
                                      onClick={() => setSelectedCell(isActive ? null : { objectiveId: obj._id, gameId: game._id })}
                                      className={`relative w-12 h-10 rounded-md text-sm font-semibold tabular-nums transition-all ${
                                        isActive ? "bg-slate-600/50 ring-1 ring-amber-500" : "bg-slate-700/25 hover:bg-slate-700/40"
                                      } ${r.result != null ? getRatingTextColor(r.result) : "text-slate-600"}`}
                                    >
                                      {r.result ?? "--"}
                                      {hasComment && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-3 h-[2px] rounded-full bg-slate-500" />}
                                    </button>
                                  </td>
                                )
                              })}
                              <td className="px-3 py-2 text-center border-l border-slate-700/30">
                                {avg != null ? (
                                  <span className={`text-sm font-bold tabular-nums ${getRatingTextColor(Math.round(avg))}`}>{avg.toFixed(1)}</span>
                                ) : (
                                  <span className="text-slate-700 text-xs">--</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Detail Panel */}
                  {selectedCell &&
                    (() => {
                      const obj = selectedObjectives.find(o => o._id === selectedCell.objectiveId)
                      const game = selectedGames.find(g => g._id === selectedCell.gameId)
                      const r = getResult(selectedCell.objectiveId, selectedCell.gameId)
                      if (!obj || !game) return null

                      return (
                        <div className="mt-4 border-t border-slate-700/30 pt-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-white text-sm font-medium">{obj.name}</span>
                              <span className="text-slate-600 mx-2">/</span>
                              <span className="text-slate-400 text-sm">{game.name || `Game ${game.game_id}`}</span>
                            </div>
                            <button onClick={() => setSelectedCell(null)} className="p-1 text-slate-600 hover:text-slate-300 transition-colors">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center gap-1">
                            {Array.from({ length: RATING_MAX }, (_, i) => i + 1).map(value => {
                              const isSelected = r.result === value
                              return (
                                <button
                                  key={value}
                                  onClick={() => saveResult(selectedCell.objectiveId, selectedCell.gameId, { result: isSelected ? null : value })}
                                  className={`flex-1 h-8 rounded-md text-xs font-bold transition-all ${
                                    isSelected ? `${getRatingColor(value)} text-white` : "bg-slate-700/40 text-slate-500 hover:bg-slate-700/60 hover:text-slate-300"
                                  }`}
                                >
                                  {value}
                                </button>
                              )
                            })}
                          </div>

                          <textarea
                            placeholder="Add a note..."
                            value={r.comment || ""}
                            onChange={e => saveResult(selectedCell.objectiveId, selectedCell.gameId, { comment: e.target.value })}
                            rows={2}
                            className="w-full px-3 py-2 rounded-lg border-0 outline-none ring-0 focus:ring-1 focus:ring-amber-500 bg-slate-700/30 text-white placeholder-slate-600 text-sm resize-none"
                            autoFocus
                          />
                        </div>
                      )
                    })()}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <UploadModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        user={user}
        sessionId={id}
        sessionName={session?.name}
        opponentName={session?.opponent}
        onSuccess={() => {
          setShowImportModal(false)
          fetchGames()
        }}
      />
    </div>
  )
}
