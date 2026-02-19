import { useState, useEffect, Fragment } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "react-hot-toast"
import api from "@/services/api"
import { Clock, Swords, Trash2, MoreVertical, DollarSign, Target, Folder, Plus, Check, FolderInput, X, Pencil, ChevronDown, Shield } from "lucide-react"
import Modal from "@/components/modal"
import useStore from "@/services/store"
import { getChampionIcon, getItemIcon, getSummonerSpellIcon, getRuneIcon } from "@/utils"

const ROLE_ORDER = ["top", "jungle", "mid", "bottom", "support"]

const sortPlayersByRole = players => {
  return [...players].sort((a, b) => {
    const aIndex = ROLE_ORDER.indexOf(a.role?.toLowerCase())
    const bIndex = ROLE_ORDER.indexOf(b.role?.toLowerCase())
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex)
  })
}

const roleLabels = {
  top: "Top",
  jungle: "Jungle",
  mid: "Mid",
  bottom: "ADC",
  support: "Support"
}

const roleIconColors = {
  top: "text-orange-400",
  jungle: "text-emerald-400",
  mid: "text-blue-400",
  bottom: "text-red-400",
  support: "text-cyan-400"
}

const TIER_SHORT = {
  IRON: "Iron",
  BRONZE: "Bronze",
  SILVER: "Silver",
  GOLD: "Gold",
  PLATINUM: "Plat",
  EMERALD: "Emerald",
  DIAMOND: "Dia",
  MASTER: "Master",
  GRANDMASTER: "GM",
  CHALLENGER: "Chall"
}
const TIER_COLOR = {
  IRON: "text-slate-400",
  BRONZE: "text-amber-700",
  SILVER: "text-slate-300",
  GOLD: "text-yellow-400",
  PLATINUM: "text-cyan-300",
  EMERALD: "text-emerald-400",
  DIAMOND: "text-blue-400",
  MASTER: "text-purple-400",
  GRANDMASTER: "text-red-400",
  CHALLENGER: "text-amber-300"
}

const formatRank = rank => {
  if (!rank) return null
  const label = TIER_SHORT[rank.tier?.toUpperCase()] || rank.tier
  if (["MASTER", "GRANDMASTER", "CHALLENGER"].includes(rank.tier?.toUpperCase())) return `${label} ${rank.lp} LP`
  return `${label} ${rank.rank}`
}

const RankBadge = ({ rank }) => {
  if (!rank) return <span className="text-slate-600 text-xs">?</span>
  const colorClass = TIER_COLOR[rank.tier?.toUpperCase()] || "text-slate-400"
  return <span className={`text-xs font-semibold ${colorClass}`}>{formatRank(rank)}</span>
}

export default function Games() {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useStore()
  const [folders, setFolders] = useState([])
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false)
  const [newFolder, setNewFolder] = useState({ name: "" })
  const [hoveredFolder, setHoveredFolder] = useState(null)
  const [filters, setFilters] = useState({ folder_id: null })
  const [selectedGames, setSelectedGames] = useState([])
  const [selectionMode, setSelectionMode] = useState(false)
  const [showMoveDropdown, setShowMoveDropdown] = useState(false)

  const deleteFolder = async folderId => {
    if (!confirm("Are you sure you want to delete this folder?")) return
    try {
      const { ok, code } = await api.delete(`/folder/${folderId}`)
      if (!ok) return toast.error(code)
      setFolders(folders.filter(f => f._id !== folderId))
      toast.success("Folder deleted")
      setFilters({ ...filters, folder_id: null })
    } catch (error) {
      toast.error(error.message)
    }
  }
  const fetchGames = async () => {
    try {
      const { ok, data, code } = await api.post("/game/search", { team_id: user?.team_id, ...filters })
      if (!ok) return toast.error(code)
      setGames(data)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchFolders = async () => {
    try {
      const { ok, data, code } = await api.post("/folder/search", { team_id: user?.team_id })
      if (!ok) return toast.error(code)
      setFolders(data)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const createFolder = async () => {
    try {
      const { ok, data, code } = await api.post("/folder", { name: newFolder.name })
      if (!ok) return toast.error(code)
      setFolders([...folders, data])
      setNewFolder({ name: "" })
      setShowCreateFolderModal(false)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const moveGamesToFolder = async folderId => {
    try {
      const { ok, code } = await api.put("/game/move", { game_ids: selectedGames, folder_id: folderId })
      if (!ok) return toast.error(code)
      toast.success("Games moved to folder")
      setSelectedGames([])
      setSelectionMode(false)
      setShowMoveDropdown(false)
      fetchGames()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const selectAllGames = () => {
    setSelectedGames(games.map(g => g._id))
    if (selectedGames.length === games.length) setSelectedGames([])
  }

  useEffect(() => {
    fetchGames()
    fetchFolders()
  }, [filters])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 font-medium">Loading games...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 lg:p-8">
      <div className="max-w-[1800px] mx-auto space-y-8">
        <section>
          <div className="space-y-6">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Default "All" folder */}
              <div
                onClick={() => setFilters({ ...filters, folder_id: null })}
                className={`bg-slate-800/50 border rounded-xl overflow-visible transition-all duration-200 hover:border-amber-500/50 hover:bg-slate-800 group cursor-pointer relative ${filters.folder_id === null ? "border-amber-500" : "border-slate-700/50"}`}
              >
                <div className="px-4 py-3 flex items-center justify-between min-w-[100px]">
                  <div className="flex items-center gap-3">
                    <Folder className={`w-5 h-5 transition-colors ${filters.folder_id === null ? "text-amber-500" : "text-amber-500/80 group-hover:text-amber-500"}`} />
                    <span className={`text-sm font-medium transition-colors ${filters.folder_id === null ? "text-white" : "text-slate-300 group-hover:text-white"}`}>All</span>
                  </div>
                </div>
              </div>

              {folders.map(folder => (
                <div
                  key={folder._id}
                  className={`bg-slate-800/50 border rounded-xl overflow-visible transition-all duration-200 hover:border-amber-500/50 hover:bg-slate-800 group cursor-pointer relative ${filters.folder_id === folder._id ? "border-amber-500" : "border-slate-700/50"}`}
                  onMouseEnter={() => setHoveredFolder(folder._id)}
                  onMouseLeave={() => setHoveredFolder(null)}
                  onClick={() => setFilters({ ...filters, folder_id: folder._id })}
                >
                  <div className="px-4 py-3 flex items-center justify-between min-w-[160px]">
                    <div className="flex items-center gap-3">
                      <Folder className={`w-5 h-5 transition-colors ${filters.folder_id === folder._id ? "text-amber-500" : "text-amber-500/80 group-hover:text-amber-500"}`} />
                      <span className={`text-sm font-medium transition-colors ${filters.folder_id === folder._id ? "text-white" : "text-slate-300 group-hover:text-white"}`}>
                        {folder.name}
                      </span>
                    </div>
                    <button
                      onClick={e => (e.stopPropagation(), deleteFolder(folder._id))}
                      className={`ml-2 p-1 rounded-lg hover:bg-red-500/20 transition-all duration-200 ${hoveredFolder === folder._id ? "opacity-100" : "opacity-0"}`}
                    >
                      <Trash2 className="w-4 h-4 text-red-400 hover:text-red-300" />
                    </button>
                  </div>
                </div>
              ))}

              <button
                onClick={() => setShowCreateFolderModal(true)}
                className="bg-slate-800/30 border border-slate-700/50 border-dashed rounded-xl px-4 py-3 flex items-center justify-center hover:border-amber-500/50 hover:bg-slate-800/50 transition-all duration-200 group h-[50px] w-[50px]"
              >
                <Plus className="w-5 h-5 text-slate-500 group-hover:text-amber-500 transition-colors" />
              </button>
            </div>

            <Modal isOpen={showCreateFolderModal} onClose={() => setShowCreateFolderModal(false)} className="w-full max-w-md !bg-slate-900 border border-slate-700/50 shadow-xl">
              <div className="p-6 space-y-4">
                <h3 className="text-lg font-medium text-white">Create New Folder</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Folder Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Scrims vs KC"
                      value={newFolder.name}
                      onChange={e => setNewFolder({ ...newFolder, name: e.target.value })}
                      className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all duration-200"
                      autoFocus
                    />
                  </div>
                  <div className="flex items-center justify-end gap-3 pt-4">
                    <button
                      onClick={createFolder}
                      disabled={!newFolder.name.trim()}
                      className="bg-amber-500 text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-amber-500/20"
                    >
                      Create Folder
                    </button>
                  </div>
                </div>
              </div>
            </Modal>

            {/* Selection Toolbar */}
            {selectionMode && (
              <div className="flex items-center justify-between bg-slate-800 border border-slate-700 rounded-xl px-4 py-3">
                <div className="flex items-center gap-4">
                  <button onClick={selectAllGames} className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors">
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        selectedGames.length === games.length && games.length > 0 ? "bg-amber-500 border-amber-500" : "border-slate-500 hover:border-slate-400"
                      }`}
                    >
                      {selectedGames.length === games.length && games.length > 0 && <Check className="w-3 h-3 text-white" />}
                    </div>
                    Select all
                  </button>
                  <span className="text-slate-500 text-sm">{selectedGames.length} selected</span>
                </div>

                <div className="flex items-center gap-2">
                  {selectedGames.length > 0 && (
                    <div className="relative">
                      <button
                        onClick={() => setShowMoveDropdown(!showMoveDropdown)}
                        className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
                      >
                        <FolderInput className="w-4 h-4" />
                        Move to folder
                      </button>
                      {showMoveDropdown && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowMoveDropdown(false)} />
                          <div className="absolute right-0 top-full mt-1 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 py-1">
                            <button
                              onClick={() => moveGamesToFolder(null)}
                              className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2"
                            >
                              <Folder className="w-4 h-4 text-slate-500" />
                              No folder
                            </button>
                            {folders.map(folder => (
                              <button
                                key={folder._id}
                                onClick={() => moveGamesToFolder(folder._id)}
                                className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2"
                              >
                                <Folder className="w-4 h-4 text-amber-500" />
                                {folder.name}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  <button
                    onClick={() => (setSelectedGames([]), setSelectionMode(false), setShowMoveDropdown(false))}
                    className="flex items-center gap-2 text-slate-400 hover:text-white px-3 py-2 rounded-lg hover:bg-slate-700/50 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Toggle Selection Mode Button */}
            {!selectionMode && games.length > 0 && (
              <div className="flex justify-end">
                <button
                  onClick={() => setSelectionMode(true)}
                  className="flex items-center gap-2 text-slate-400 hover:text-white text-sm px-3 py-2 rounded-lg hover:bg-slate-700/50 transition-colors"
                >
                  <Check className="w-4 h-4" />
                  Select games
                </button>
              </div>
            )}

            {games.map(game => (
              <GameCard
                key={game._id}
                game={game}
                onDelete={fetchGames}
                selectionMode={selectionMode}
                isSelected={selectedGames.includes(game._id)}
                onToggleSelect={gameId => setSelectedGames(prev => (prev.includes(gameId) ? prev.filter(id => id !== gameId) : [...prev, gameId]))}
                folders={folders}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function GameCard({ game, onDelete, selectionMode, isSelected, onToggleSelect, folders }) {
  const [expanded, setExpanded] = useState(false)
  const [playerStats, setPlayerStats] = useState([])
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({ name: game.name || "", opponent_name: game.opponent_name || "", date: game.date ? new Date(game.date).toISOString().slice(0, 10) : "", draft_url: game.source_url || "" })
  const [saving, setSaving] = useState(false)
  const [enemyTeams, setEnemyTeams] = useState([])
  const [showOpponentDropdown, setShowOpponentDropdown] = useState(false)
  const [newTeamName, setNewTeamName] = useState("")
  const [avgElo, setAvgElo] = useState(null)

  useEffect(() => {
    const fetchAvgElo = async () => {
      try {
        const { ok, data, code } = await api.get(`/game/${game._id}/avg-elo`)
        if (!ok) return toast.error(code)
        setAvgElo(data)
      } catch (error) {
        toast.error(error.code || "An error occurred while fetching average elo")
      }
    }
    fetchAvgElo()
  }, [game._id])

  const fetchEnemyTeams = async () => {
    try {
      const { ok, data, code } = await api.post("/enemy-team/search", { team_id: game.team_id })
      if (!ok) return toast.error(code)
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
      setEditForm(prev => ({ ...prev, opponent_name: data.name }))
      setNewTeamName("")
      setShowOpponentDropdown(false)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const fetchPlayerStats = async () => {
    if (playerStats.length > 0) return
    setLoading(true)
    try {
      const { ok, data, code } = await api.post("/playerstats/search", { game_id: game._id })
      if (!ok) return toast.error(code)
      setPlayerStats(data)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = () => {
    if (!expanded) fetchPlayerStats()
    setExpanded(!expanded)
  }

  const handleDelete = async e => {
    e.stopPropagation()
    if (!confirm("Are you sure you want to delete this game?")) return

    try {
      const { ok, code } = await api.delete(`/game/${game._id}`)
      if (!ok) return toast.error(code)
      toast.success("Game deleted successfully")
      onDelete()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleEdit = async () => {
    setSaving(true)
    try {
      const body = { name: editForm.name, opponent_name: editForm.opponent_name }
      if (editForm.date) body.date = new Date(editForm.date).toISOString()
      const { ok, code } = await api.put(`/game/${game._id}`, body)
      if (!ok) return toast.error(code)

      const draftUrlChanged = editForm.draft_url.trim() !== (game.source_url || "")
      if (draftUrlChanged && editForm.draft_url.trim()) {
        const { ok: draftOk, error } = await api.put(`/game/${game._id}/draft`, { url: editForm.draft_url.trim() })
        if (!draftOk) toast.error(error || "Erreur draft")
      }

      toast.success("Game updated")
      setShowEditModal(false)
      onDelete() // refresh list
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className={`bg-slate-800/50 border rounded-xl overflow-visible transition-all duration-200 hover:border-slate-600/50 relative ${isSelected ? "border-amber-500" : "border-slate-700/50"}`}
    >
      <button
        onClick={e => (e.preventDefault(), selectionMode ? onToggleSelect(game._id) : handleToggle())}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-700/20 transition-colors relative"
      >
        <div className="flex items-center gap-4 min-w-0 flex-1">
          {/* Selection Checkbox */}
          {selectionMode && (
            <div
              className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? "bg-amber-500 border-amber-500" : "border-slate-500 hover:border-slate-400"}`}
            >
              {isSelected && <Check className="w-3 h-3 text-white" />}
            </div>
          )}
          {/* Win/Loss Indicator */}
          <div className={`w-1.5 h-14 rounded-full flex-shrink-0 ${game.win ? "bg-emerald-500" : "bg-red-500"}`} />

          <div className="text-left min-w-0 flex-1">
            {/* Row 1: Name + Opponent */}
            <div className="flex items-center gap-2">
              {game.name ? (
                <span className="text-white text-sm font-semibold truncate">{game.name}</span>
              ) : (
                <span className={`text-sm font-bold uppercase tracking-wider ${game.win ? "text-emerald-400" : "text-red-400"}`}>{game.win ? "Victory" : "Defeat"}</span>
              )}
              {game.opponent_name && (
                <span className="text-slate-500 text-sm">
                  vs <span className="text-slate-300 font-medium">{game.opponent_name}</span>
                </span>
              )}
            </div>

            {/* Row 2: Metadata */}
            <div className="flex items-center gap-1.5 mt-1">
              {game.name && (
                <>
                  <span className={`text-[11px] font-bold uppercase tracking-wide ${game.win ? "text-emerald-400" : "text-red-400"}`}>{game.win ? "Victory" : "Defeat"}</span>
                  <span className="text-slate-700 text-[11px]">·</span>
                </>
              )}
              <span className="text-slate-500 text-[11px]">{new Date(game.date).toLocaleDateString(undefined, { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
              <span className="text-slate-700 text-[11px]">·</span>
              <span className="text-slate-500 text-[11px] flex items-center gap-0.5">
                <Clock className="w-3 h-3" />
                {Math.floor(game.duration / 60)}m{String(game.duration % 60).padStart(2, "0")}
              </span>
              {game.patch && (
                <>
                  <span className="text-slate-700 text-[11px]">·</span>
                  <span className="text-slate-500 text-[11px]">patch :{game.patch.split(".").slice(0, 2).join(".")}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Center: Avg Elo (absolute centered) */}
        {avgElo && (avgElo.team_avg_elo || avgElo.enemy_avg_elo) && (
          <div className="hidden md:flex items-center gap-3 absolute left-1/2 -translate-x-1/2">
            <div className="flex flex-col items-end">
              <span className="text-slate-500 text-[10px] uppercase tracking-wider leading-none mb-0.5">My team</span>
              <RankBadge rank={avgElo.team_avg_elo} />
            </div>
            <span className="text-slate-600 text-xs font-medium">vs</span>
            <div className="flex flex-col items-start">
              <span className="text-slate-500 text-[10px] uppercase tracking-wider leading-none mb-0.5">Enemy</span>
              <RankBadge rank={avgElo.enemy_avg_elo} />
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Folder indicator */}
          {game.folder_id && (
            <div className="hidden lg:flex items-center gap-1.5 text-slate-500 text-xs">
              <Folder className="w-3 h-3" />
              <span>{folders?.find(f => f._id === game.folder_id)?.name || "Folder"}</span>
            </div>
          )}

          {/* Team Champions */}
          {game.champions && game.champions[game.team_side] && (
            <div className="hidden sm:flex items-center gap-1">
              {ROLE_ORDER.map(role => {
                const champion = game.champions[game.team_side]?.[role]
                return champion ? (
                  <div key={role} className="w-8 h-8 rounded-lg overflow-hidden bg-slate-700/50 border border-slate-600/50">
                    <img src={getChampionIcon(champion)} alt={champion} className="w-full h-full object-cover" />
                  </div>
                ) : null
              })}
            </div>
          )}

          {/* Dropdown Menu */}
          <div className="relative">
            <button
              onClick={e => (e.stopPropagation(), setShowDropdown(!showDropdown))}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            {showDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={e => (e.stopPropagation(), setShowDropdown(false))} />
                <div className="absolute right-0 top-full mt-1 w-40 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 py-1">
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      setEditForm({ name: game.name || "", opponent_name: game.opponent_name || "", date: game.date ? new Date(game.date).toISOString().slice(0, 10) : "", draft_url: game.source_url || "" })
                      setShowEditModal(true)
                      setShowDropdown(false)
                      fetchEnemyTeams()
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit
                  </button>
                  <button onClick={handleDelete} className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-slate-700/50 p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div>
              {/* Tabs */}
              <div className="flex items-center gap-1 mb-6 border-b border-slate-700/50">
                {[
                  { key: "overview", label: "Scoreboard" },
                  { key: "advanced", label: "Advanced" },
                  { key: "damage", label: "Damage" },
                  { key: "income", label: "Income" },
                  { key: "vision", label: "Vision" },
                  { key: "draft", label: "Draft" }
                ].map((tab, i, arr) => (
                  <Fragment key={tab.key}>
                    <button
                      onClick={() => setActiveTab(tab.key)}
                      className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 ${
                        activeTab === tab.key ? "text-white border-amber-500" : "text-slate-400 border-transparent hover:text-white"
                      }`}
                    >
                      {tab.label}
                    </button>
                    {i < arr.length - 1 && <div className="h-4 w-px bg-slate-700/50" />}
                  </Fragment>
                ))}
              </div>

              {/* Tab Content */}
              {activeTab === "overview" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Blue Team */}
                  <div>
                    <div className="space-y-2">
                      {sortPlayersByRole(playerStats.filter(p => p.side === "blue")).map((player, idx) => (
                        <PlayerRow key={player._id || idx} player={player} teamSide={game.team_side} />
                      ))}
                    </div>
                  </div>

                  {/* Red Team */}
                  <div>
                    <div className="space-y-2">
                      {sortPlayersByRole(playerStats.filter(p => p.side === "red")).map((player, idx) => (
                        <PlayerRow key={player._id || idx} player={player} teamSide={game.team_side} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "damage" && <DamageTab playerStats={playerStats} />}
              {activeTab === "income" && <IncomeTab playerStats={playerStats} />}
              {activeTab === "vision" && <VisionTab playerStats={playerStats} />}
              {activeTab === "advanced" && <AdvancedTab playerStats={playerStats} game={game} />}
              {activeTab === "draft" && <DraftTab game={game} onDraftAdded={onDelete} />}
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} className="w-full max-w-md !bg-slate-900 border border-slate-700/50 shadow-xl !overflow-visible">
        <div className="p-6 space-y-4">
          <h3 className="text-lg font-medium text-white">Edit Game</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Game Name</label>
              <input
                type="text"
                placeholder="e.g. Scrim vs KC - Game 1"
                value={editForm.name}
                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all duration-200"
                autoFocus
              />
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-slate-400 mb-2">Opponent Team</label>
              <button
                type="button"
                onClick={() => setShowOpponentDropdown(!showOpponentDropdown)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800 border border-slate-700 hover:border-slate-600 transition-all duration-200 text-left"
              >
                <span className={editForm.opponent_name ? "text-white" : "text-slate-500"}>{editForm.opponent_name || "Select opponent..."}</span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {showOpponentDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowOpponentDropdown(false)} />
                  <div className="absolute top-full left-0 mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-20 overflow-hidden">
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
                    <div className="max-h-48 overflow-y-auto p-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditForm(prev => ({ ...prev, opponent_name: "" }))
                          setShowOpponentDropdown(false)
                        }}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${!editForm.opponent_name ? "bg-amber-500/20 text-amber-400" : "text-slate-400 hover:bg-slate-700/50"}`}
                      >
                        No opponent
                      </button>
                      {enemyTeams.map(team => (
                        <button
                          key={team._id}
                          type="button"
                          onClick={() => {
                            setEditForm(prev => ({ ...prev, opponent_name: team.name }))
                            setShowOpponentDropdown(false)
                          }}
                          className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${editForm.opponent_name === team.name ? "bg-amber-500/20 text-amber-400" : "text-slate-300 hover:bg-slate-700/50"}`}
                        >
                          {team.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Date</label>
              <input
                type="date"
                value={editForm.date}
                onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-amber-500 transition-all duration-200 [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Draft URL</label>
              <input
                type="text"
                placeholder="https://drafter.lol/... or https://draftlol.dawe.gg/..."
                value={editForm.draft_url}
                onChange={e => setEditForm({ ...editForm, draft_url: e.target.value })}
                className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all duration-200"
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                onClick={handleEdit}
                disabled={saving}
                className="bg-amber-500 text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-amber-500/20"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function PlayerRow({ player, teamSide }) {
  const navigate = useNavigate()
  const { setSearchNavigation } = useStore()
  const isRedSide = player.side === "red"
  const isTeamPlayer = player.side === teamSide

  const handlePlayerClick = e => {
    e.stopPropagation()
    setSearchNavigation({ type: "player", data: { name: player.summoner_name } })
    navigate("/statsV2")
  }

  return (
    <div className={`flex items-center justify-between p-2.5 rounded-lg ${isRedSide ? "bg-red-500/5" : "bg-blue-500/5"}`}>
      <div className="flex items-center gap-3 min-w-0">
        {player.champion && (
          <div className="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-slate-700/50 border border-slate-600/50">
            <img src={getChampionIcon(player.champion)} alt={player.champion} className="w-full h-full object-cover" />
          </div>
        )}
        {/* Champion & Player Info */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {isTeamPlayer ? (
                <button onClick={handlePlayerClick} className="text-white text-sm font-medium truncate hover:text-amber-400 transition-colors">
                  {player.summoner_name}
                </button>
              ) : (
                <span className="text-white text-sm font-medium truncate">{player.summoner_name}</span>
              )}
              <a
                href={`https://dpm.lol/${player.summoner_name}-${player.riot_tag}`}
                target="_blank"
                rel="noreferrer"
                onClick={e => e.stopPropagation()}
                className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
              >
                <img src="/DPMLOLBG.png" alt="DPM" className="w-4 h-4 rounded-sm" />
              </a>
              {player.tier && (
                <span className="text-slate-400 text-[10px] font-medium uppercase bg-slate-700/50 px-1.5 py-0.5 rounded">
                  {player.tier} {["MASTER", "GRANDMASTER", "CHALLENGER"].includes(player.tier.toUpperCase()) ? `${player.league_points} LP` : player.rank}
                </span>
              )}
            </div>
            <span className={`text-xs px-1.5 py-0.5 rounded ${roleIconColors[player.role]} bg-slate-700/50 flex-shrink-0`}>{roleLabels[player.role]}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm">
        <div className="text-right">
          <div className="flex items-center gap-1.5">
            <span className="text-emerald-400">{player.kills}</span>
            <span className="text-slate-600">/</span>
            <span className="text-red-400">{player.deaths}</span>
            <span className="text-slate-600">/</span>
            <span className="text-cyan-400">{player.assists}</span>
          </div>
          <p className="text-slate-500 text-xs">
            {player.deaths > 0 ? ((player.kills + player.assists) / player.deaths).toFixed(1) : (player.kills + player.assists).toFixed(1)} KDA
          </p>
        </div>

        <div className="text-right w-16">
          <p className="text-slate-500 text-xs">{player.cs} CS</p>
        </div>
      </div>
    </div>
  )
}

function DamageTab({ playerStats }) {
  const blueTeam = sortPlayersByRole(playerStats.filter(p => p.side === "blue"))
  const redTeam = sortPlayersByRole(playerStats.filter(p => p.side === "red"))

  const allPlayers = [...playerStats]
  const maxDamage = Math.max(...allPlayers.map(p => p.damage?.total_to_champions || 0))

  const DamageCard = ({ player, maxDamage }) => {
    const totalDamage = player?.damage?.total_to_champions || 0
    const physDamage = player?.damage?.physical_to_champions || 0
    const magicDamage = player?.damage?.magic_to_champions || 0
    const trueDamage = player?.damage?.true_to_champions || 0

    const physPercent = totalDamage > 0 ? (physDamage / totalDamage) * 100 : 0
    const magicPercent = totalDamage > 0 ? (magicDamage / totalDamage) * 100 : 0
    const truePercent = totalDamage > 0 ? (trueDamage / totalDamage) * 100 : 0

    return (
      <div className="flex-1 group relative p-2 rounded-lg bg-slate-800/30">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="text-white text-sm font-medium mb-1">{player?.champion || "Unknown"}</div>
            <div className="relative">
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full flex rounded-full" style={{ width: `${maxDamage > 0 ? (totalDamage / maxDamage) * 100 : 0}%` }}>
                  <div className="bg-orange-500" style={{ width: `${physPercent}%` }} />
                  <div className="bg-blue-500" style={{ width: `${magicPercent}%` }} />
                  <div className="bg-slate-300" style={{ width: `${truePercent}%` }} />
                </div>
              </div>

              {/* Tooltip */}
              <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                <div className="text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span className="text-orange-400">{(physDamage / 1000).toFixed(1)}k Physical</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-blue-400">{(magicDamage / 1000).toFixed(1)}k Magic</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
                    <span className="text-slate-300">{(trueDamage / 1000).toFixed(1)}k True</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="text-white font-semibold text-sm ml-3">{(totalDamage / 1000).toFixed(1)}k</div>
        </div>
      </div>
    )
  }

  const DamageRow = ({ leftPlayer, rightPlayer, maxDamage }) => {
    return (
      <div className="flex items-center gap-2">
        <DamageCard player={leftPlayer} maxDamage={maxDamage} />

        {/* VS Icon */}
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-700 border border-slate-600">
          <Swords className="w-3 h-3 text-slate-400" />
        </div>

        <DamageCard player={rightPlayer} maxDamage={maxDamage} />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {blueTeam.map((bluePlayer, idx) => {
        const redPlayer = redTeam[idx]

        return <DamageRow key={idx} leftPlayer={bluePlayer} rightPlayer={redPlayer} maxDamage={maxDamage} />
      })}
    </div>
  )
}

function IncomeTab({ playerStats }) {
  const blueTeam = sortPlayersByRole(playerStats.filter(p => p.side === "blue"))
  const redTeam = sortPlayersByRole(playerStats.filter(p => p.side === "red"))

  const allPlayers = [...playerStats]
  const maxGold = Math.max(...allPlayers.map(p => p.gold || 0))

  const IncomeCard = ({ player, maxGold }) => {
    const goldEarned = player?.gold || 0
    const totalMinions = player?.farm?.minions || 0
    const neutralMinions = player?.farm?.jungle_monsters || 0

    return (
      <div className="flex-1 group relative p-2 rounded-lg bg-slate-800/30">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="text-white text-sm font-medium mb-1">{player?.champion || "Unknown"}</div>
            <div className="relative">
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${maxGold > 0 ? (goldEarned / maxGold) * 100 : 0}%` }} />
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                <span>{totalMinions} minions</span>
                <span>{neutralMinions} jungle</span>
              </div>
            </div>
          </div>
          <div className="text-amber-400 font-semibold text-sm ml-3">{(goldEarned / 1000).toFixed(1)}k</div>
        </div>
      </div>
    )
  }

  const IncomeRow = ({ leftPlayer, rightPlayer, maxGold }) => {
    return (
      <div className="flex items-center gap-2">
        <IncomeCard player={leftPlayer} maxGold={maxGold} />

        {/* VS Icon */}
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-700 border border-slate-600">
          <Swords className="w-3 h-3 text-slate-400" />
        </div>

        <IncomeCard player={rightPlayer} maxGold={maxGold} />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {blueTeam.map((bluePlayer, idx) => {
        const redPlayer = redTeam[idx]

        return <IncomeRow key={idx} leftPlayer={bluePlayer} rightPlayer={redPlayer} maxGold={maxGold} />
      })}
    </div>
  )
}

function VisionTab({ playerStats }) {
  const blueTeam = sortPlayersByRole(playerStats.filter(p => p.side === "blue"))
  const redTeam = sortPlayersByRole(playerStats.filter(p => p.side === "red"))

  const allPlayers = [...playerStats]
  const maxVisionScore = Math.max(...allPlayers.map(p => p.vision?.score || 0))

  const VisionCard = ({ player, maxVisionScore }) => {
    const visionScore = player?.vision?.score || 0
    const controlWards = player?.vision?.control_wards_bought || 0
    const wardsDestroyed = player?.vision?.wards_killed || 0
    const wardsPlaced = player?.vision?.wards_placed || 0

    return (
      <div className="flex-1 group relative p-2 rounded-lg bg-slate-800/30">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="text-white text-sm font-medium mb-1">{player?.champion || "Unknown"}</div>
            <div className="relative">
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: `${maxVisionScore > 0 ? (visionScore / maxVisionScore) * 100 : 0}%` }} />
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                <span className="text-purple-400">{controlWards} pink</span>
                <span>{wardsDestroyed} destroyed</span>
                <span>{wardsPlaced} placed</span>
              </div>
            </div>
          </div>
          <div className="text-purple-400 font-semibold text-sm ml-3">{visionScore}</div>
        </div>
      </div>
    )
  }

  const VisionRow = ({ leftPlayer, rightPlayer, maxVisionScore }) => {
    return (
      <div className="flex items-center gap-2">
        <VisionCard player={leftPlayer} maxVisionScore={maxVisionScore} />

        {/* VS Icon */}
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-700 border border-slate-600">
          <Swords className="w-3 h-3 text-slate-400" />
        </div>

        <VisionCard player={rightPlayer} maxVisionScore={maxVisionScore} />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {blueTeam.map((bluePlayer, idx) => {
        const redPlayer = redTeam[idx]

        return <VisionRow key={idx} leftPlayer={bluePlayer} rightPlayer={redPlayer} maxVisionScore={maxVisionScore} />
      })}
    </div>
  )
}

function AdvancedTab({ playerStats, game }) {
  const navigate = useNavigate()
  const { setSearchNavigation } = useStore()
  const blueTeam = sortPlayersByRole(playerStats.filter(p => p.side === "blue"))
  const redTeam = sortPlayersByRole(playerStats.filter(p => p.side === "red"))
  const blue = game.blue_team || {}
  const red = game.red_team || {}
  const teamSide = game.team_side

  const objectives = [
    { icon: "tower", blue: blue.towers || 0, red: red.towers || 0 },
    { icon: "dragon", blue: blue.dragons || 0, red: red.dragons || 0 },
    { icon: "baron", blue: blue.barons || 0, red: red.barons || 0 },
    { icon: "herald", blue: blue.heralds || 0, red: red.heralds || 0 },
    { icon: "grubs", blue: blue.grubs || 0, red: red.grubs || 0 },
    ...(blue.atakhan > 0 || red.atakhan > 0 ? [{ icon: "atakhan", blue: blue.atakhan || 0, red: red.atakhan || 0 }] : []),
    { icon: "inhibitor", blue: blue.inhibitors || 0, red: red.inhibitors || 0 }
  ]

  const handlePlayerClick = (e, player) => {
    e.stopPropagation()
    setSearchNavigation({ type: "player", data: { name: player.summoner_name } })
    navigate("/statsV2")
  }

  const AdvancedCard = ({ player }) => {
    const kda = player.deaths > 0 ? ((player.kills + player.assists) / player.deaths).toFixed(1) : (player.kills + player.assists).toFixed(1)
    const items = player.items || []
    const spells = player.summoner_spells || {}
    const runes = player.runes || {}
    const isRedSide = player.side === "red"
    const isTeamPlayer = player.side === teamSide

    return (
      <div className={`flex-1 flex items-center gap-2.5 rounded-lg p-2.5 ${isRedSide ? "bg-red-500/5" : "bg-blue-500/5"}`}>
        {/* Left: Champion + Spells + Runes + Name + KDA */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="w-8 h-8 rounded-md overflow-hidden bg-slate-700/50">
              {player.champion && <img src={getChampionIcon(player.champion)} alt={player.champion} className="w-full h-full object-cover" />}
            </div>
            <div className="flex flex-col gap-0.5">
              {spells.spell1 && (
                <div className="w-4 h-4 rounded-sm overflow-hidden bg-slate-700/50">
                  <img src={getSummonerSpellIcon(spells.spell1)} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              {spells.spell2 && (
                <div className="w-4 h-4 rounded-sm overflow-hidden bg-slate-700/50">
                  <img src={getSummonerSpellIcon(spells.spell2)} alt="" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-0.5">
              {runes.keystone && (
                <div className="w-4 h-4 rounded-full overflow-hidden bg-slate-700/50">
                  <img src={getRuneIcon(runes.keystone)} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              {runes.secondary_tree && (
                <div className="w-4 h-4 rounded-full overflow-hidden bg-slate-700/50">
                  <img src={getRuneIcon(runes.secondary_tree)} alt="" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              {isTeamPlayer ? (
                <button onClick={e => handlePlayerClick(e, player)} className="text-white text-xs font-medium truncate hover:text-amber-400 transition-colors">
                  {player.summoner_name}
                </button>
              ) : (
                <span className="text-white text-xs font-medium truncate">{player.summoner_name}</span>
              )}
              <span className={`text-[9px] px-1 py-px rounded ${roleIconColors[player.role]} bg-slate-700/50`}>{roleLabels[player.role]}</span>
              <a
                href={`https://dpm.lol/${player.summoner_name}-${player.riot_tag}`}
                target="_blank"
                rel="noreferrer"
                onClick={e => e.stopPropagation()}
                className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
              >
                <img src="/DPMLOLBG.png" alt="DPM" className="w-4 h-4 rounded-sm" />
              </a>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="flex items-center gap-1">
                <span className="text-emerald-400 text-xs font-semibold">{player.kills}</span>
                <span className="text-slate-600 text-[10px]">/</span>
                <span className="text-red-400 text-xs font-semibold">{player.deaths}</span>
                <span className="text-slate-600 text-[10px]">/</span>
                <span className="text-cyan-400 text-xs font-semibold">{player.assists}</span>
                <span className="text-slate-500 text-[10px] ml-0.5">{kda}</span>
              </div>
              <span className="text-slate-600 text-[10px]">·</span>
              <span className="text-amber-400/80 text-[10px] font-medium">{((player.gold || 0) / 1000).toFixed(1)}k</span>
              <span className="text-slate-600 text-[10px]">·</span>
              <span className="text-slate-400 text-[10px] font-medium">{player.cs || 0} CS</span>
            </div>
          </div>
        </div>

        {/* Right: Items in single row */}
        <div className="flex-shrink-0 flex items-center gap-0.5">
          {Array.from({ length: 7 }).map((_, i) => {
            const itemId = items[i]
            return (
              <div key={i} className={`w-6 h-6 rounded-sm overflow-hidden ${itemId ? "bg-slate-700/50" : "bg-slate-800/30"}`}>
                {itemId ? <img src={getItemIcon(itemId)} alt="" className="w-full h-full object-cover" /> : null}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Objectives Header */}
      <div className="flex items-center gap-2">
        {/* Blue side */}
        <div className="flex-1 flex items-center justify-between py-2.5 px-4 rounded-lg bg-blue-500/5 border border-blue-500/10">
          <span className="text-amber-400 text-xs font-semibold">{((blue.gold || 0) / 1000).toFixed(1)}k gold</span>
          <div className="flex items-center gap-3">
            {objectives.map(obj => (
              <div key={obj.icon} className="flex items-center gap-1">
                <img src={`/objectives/${obj.icon}.png`} alt={obj.icon} className="w-4 h-4 object-contain opacity-70" />
                <span className="text-blue-400 text-xs font-semibold">{obj.blue}</span>
              </div>
            ))}
          </div>
        </div>

        <span className="text-slate-600 text-xs font-medium">vs</span>

        {/* Red side */}
        <div className="flex-1 flex items-center justify-between py-2.5 px-4 rounded-lg bg-red-500/5 border border-red-500/10">
          <div className="flex items-center gap-3">
            {objectives.map(obj => (
              <div key={obj.icon} className="flex items-center gap-1">
                <img src={`/objectives/${obj.icon}.png`} alt={obj.icon} className="w-4 h-4 object-contain opacity-70" />
                <span className="text-red-400 text-xs font-semibold">{obj.red}</span>
              </div>
            ))}
          </div>
          <span className="text-amber-400 text-xs font-semibold">{((red.gold || 0) / 1000).toFixed(1)}k gold</span>
        </div>
      </div>

      {/* Player Rows */}
      <div className="space-y-2">
        {blueTeam.map((bluePlayer, idx) => {
          const redPlayer = redTeam[idx]
          return (
            <div key={idx} className="flex items-center gap-2">
              <AdvancedCard player={bluePlayer} />
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-700 border border-slate-600 flex-shrink-0">
                <Swords className="w-2.5 h-2.5 text-slate-400" />
              </div>
              <AdvancedCard player={redPlayer} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DraftTab({ game, onDraftAdded }) {
  const [draftUrl, setDraftUrl] = useState("")
  const [loading, setLoading] = useState(false)

  const handleAddDraft = async () => {
    if (!draftUrl.trim()) return
    setLoading(true)
    try {
      const { ok, error } = await api.put(`/game/${game._id}/draft`, { url: draftUrl.trim() })
      if (!ok) return toast.error(error || "Erreur lors de l'ajout du draft")
      toast.success("Draft ajouté")
      setDraftUrl("")
      onDraftAdded?.()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (!(game.bluePicks?.filter(Boolean).length > 0 || game.redPicks?.filter(Boolean).length > 0)) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <div className="text-slate-500 text-sm">Aucun draft disponible pour cette game</div>
        <div className="flex items-center gap-2 w-full max-w-md">
          <input
            type="text"
            value={draftUrl}
            onChange={e => setDraftUrl(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAddDraft()}
            placeholder="Coller un lien drafter.lol ou dawe.gg"
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-colors"
          />
          <button
            onClick={handleAddDraft}
            disabled={loading || !draftUrl.trim()}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black text-sm font-medium transition-colors flex items-center gap-1.5"
          >
            {loading ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
            Ajouter
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {/* Bans */}
      <div className="flex items-center justify-center gap-3">
        <div className="flex items-center gap-1.5">
          {game.blueBans.filter(Boolean).map((champ, i) => (
            <Fragment key={i}>
              {i === 3 && <div className="w-px h-5 bg-slate-700/60 mx-0.5" />}
              <div className="relative group cursor-default">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-800/80 ring-1 ring-slate-700/50 grayscale opacity-40 group-hover:opacity-60 transition-opacity">
                  <img src={getChampionIcon(champ)} alt={champ} className="w-full h-full object-cover scale-110" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <X className="w-3.5 h-3.5 text-red-500/80" />
                </div>
                <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] text-slate-500 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  {champ}
                </div>
              </div>
            </Fragment>
          ))}
        </div>

        <span className="text-slate-600 text-[9px] font-semibold uppercase tracking-[0.2em] px-1.5">bans</span>

        <div className="flex items-center gap-1.5">
          {game.redBans.filter(Boolean).map((champ, i) => (
            <Fragment key={i}>
              {i === 3 && <div className="w-px h-5 bg-slate-700/60 mx-0.5" />}
              <div className="relative group cursor-default">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-800/80 ring-1 ring-slate-700/50 grayscale opacity-40 group-hover:opacity-60 transition-opacity">
                  <img src={getChampionIcon(champ)} alt={champ} className="w-full h-full object-cover scale-110" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <X className="w-3.5 h-3.5 text-red-500/80" />
                </div>
                <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] text-slate-500 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  {champ}
                </div>
              </div>
            </Fragment>
          ))}
        </div>
      </div>

      {/* Picks */}
      <div className="flex gap-2">
        {/* Blue Side */}
        <div className="flex-1">
          <div className="flex items-center gap-1.5 mb-1.5 px-1">
            <div className="h-px flex-1 bg-gradient-to-r from-blue-500/40 to-transparent" />
            <span className="text-blue-400 text-[10px] font-bold uppercase tracking-wider">Blue</span>
            <div className="h-px flex-1 bg-gradient-to-l from-blue-500/15 to-transparent" />
          </div>
          <div className="space-y-1">
            {game.bluePicks.filter(Boolean).map((champ, i) => (
              <div
                key={i}
                className="group relative flex items-center gap-2 py-1.5 px-2 rounded-lg overflow-hidden
                  bg-gradient-to-r from-blue-500/8 to-transparent
                  border border-blue-500/10 hover:border-blue-400/30
                  transition-all duration-200"
              >
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full" />
                <span className="text-blue-500/30 text-[10px] font-bold w-4 text-center tabular-nums">{i + 1}</span>
                <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-700/50 ring-1 ring-blue-500/20 group-hover:ring-blue-400/40 flex-shrink-0 transition-all">
                  <img src={getChampionIcon(champ)} alt={champ} className="w-full h-full object-cover" />
                </div>
                <span className="text-white/90 text-sm font-medium">{champ}</span>
              </div>
            ))}
          </div>
        </div>

        {/* VS divider */}
        <div className="flex flex-col items-center justify-end pb-1">
          <div className="h-[calc(100%-20px)] w-px bg-gradient-to-b from-transparent via-slate-700/40 to-transparent relative flex flex-col justify-around items-center">
            {game.bluePicks.filter(Boolean).map((_, i) => (
              <div key={i} className="w-5 h-5 rounded-full bg-slate-800/90 border border-slate-700/50 flex items-center justify-center -ml-px">
                <Swords className="w-2.5 h-2.5 text-slate-600" />
              </div>
            ))}
          </div>
        </div>

        {/* Red Side */}
        <div className="flex-1">
          <div className="flex items-center gap-1.5 mb-1.5 px-1">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-red-500/15" />
            <span className="text-red-400 text-[10px] font-bold uppercase tracking-wider">Red</span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-red-500/40" />
          </div>
          <div className="space-y-1">
            {game.redPicks.filter(Boolean).map((champ, i) => (
              <div
                key={i}
                className="group relative flex items-center gap-2 py-1.5 px-2 rounded-lg overflow-hidden flex-row-reverse
                  bg-gradient-to-l from-red-500/8 to-transparent
                  border border-red-500/10 hover:border-red-400/30
                  transition-all duration-200"
              >
                <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-red-400 to-red-600 rounded-full" />
                <span className="text-red-500/30 text-[10px] font-bold w-4 text-center tabular-nums">{i + 1}</span>
                <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-700/50 ring-1 ring-red-500/20 group-hover:ring-red-400/40 flex-shrink-0 transition-all">
                  <img src={getChampionIcon(champ)} alt={champ} className="w-full h-full object-cover" />
                </div>
                <span className="text-white/90 text-sm font-medium">{champ}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fearless */}
      {game.fearless && game.fearlessRestricted && Object.values(game.fearlessRestricted).some(arr => arr?.length > 0) && (
        <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/5 to-transparent border border-amber-500/10">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-amber-400/80 text-[11px] font-semibold uppercase tracking-[0.15em]">Fearless — Restricted</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(game.fearlessRestricted).map(([team, champs]) => {
              if (!champs?.length) return null
              return (
                <div key={team}>
                  <span className="text-slate-500 text-[10px] font-medium uppercase tracking-wider">{team}</span>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {champs.filter(Boolean).map((champ, i) => (
                      <div key={i} className="w-7 h-7 rounded-full overflow-hidden bg-slate-800 ring-1 ring-slate-700/50 opacity-35 grayscale" title={champ}>
                        <img src={getChampionIcon(champ)} alt={champ} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Source link */}
      {game.source_url && (
        <div className="flex items-center justify-end pt-1">
          <a href={game.source_url} target="_blank" rel="noreferrer" className="text-slate-600 hover:text-amber-400 text-[10px] transition-colors">
            {game.source === "drafter" ? "drafter.lol" : "dawe.gg"}
          </a>
        </div>
      )}
    </div>
  )
}
