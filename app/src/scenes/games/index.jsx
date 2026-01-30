import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import api from "@/services/api"
import { Clock, Swords, Trash2, MoreVertical, DollarSign, Target, Folder, Plus, Check, FolderInput, X } from "lucide-react"
import Modal from "@/components/modal"
import useStore from "@/services/store"

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
      <div className="max-w-7xl mx-auto space-y-8">
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

  return (
    <div
      className={`bg-slate-800/50 border rounded-xl overflow-visible transition-all duration-200 hover:border-slate-600/50 relative ${isSelected ? "border-amber-500" : "border-slate-700/50"}`}
    >
      <button
        onClick={e => (e.preventDefault(), selectionMode ? onToggleSelect(game._id) : handleToggle())}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-700/20 transition-colors"
      >
        <div className="flex items-center gap-4">
          {/* Selection Checkbox */}
          {selectionMode && (
            <div
              className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? "bg-amber-500 border-amber-500" : "border-slate-500 hover:border-slate-400"}`}
            >
              {isSelected && <Check className="w-3 h-3 text-white" />}
            </div>
          )}
          {/* Win/Loss Indicator */}
          <div className={`w-1.5 h-12 rounded-full ${game.win ? "bg-emerald-500" : "bg-red-500"}`} />

          <div className="text-left">
            <div className="flex items-center gap-3">
              <span className={`text-base font-bold uppercase tracking-wider ${game.win ? "text-emerald-400" : "text-red-400"}`}>{game.win ? "Victory" : "Defeat"}</span>
              <span className="text-white text-base font-medium">{new Date(game.date).toLocaleDateString(undefined, { day: "2-digit", month: "2-digit", year: "numeric" })} </span>
              <span className="text-slate-500 text-sm">•</span>
              <span className="text-slate-400 text-sm flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {Math.floor(game.duration / 60)}m{game.duration % 60}
              </span>
            </div>
            {game.name && <p className="text-slate-600 text-xs mt-0.5">{game.name}</p>}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Folder indicator */}
          {game.folder_id && (
            <div className="hidden sm:flex items-center gap-1.5 text-slate-500 text-xs">
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
                    <img src={`/champions/${champion}.png`} alt={champion} className="w-full h-full object-cover" />
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
              <div className="flex items-center gap-4 mb-6 border-b border-slate-700/50">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                    activeTab === "overview" ? "text-white border-amber-500" : "text-slate-400 border-transparent hover:text-white"
                  }`}
                >
                  <Swords className="w-4 h-4" />
                  Scoreboard
                </button>
                <button
                  onClick={() => setActiveTab("damage")}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                    activeTab === "damage" ? "text-white border-amber-500" : "text-slate-400 border-transparent hover:text-white"
                  }`}
                >
                  <Swords className="w-4 h-4" />
                  Damage
                </button>
                <button
                  onClick={() => setActiveTab("income")}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                    activeTab === "income" ? "text-white border-amber-500" : "text-slate-400 border-transparent hover:text-white"
                  }`}
                >
                  <DollarSign className="w-4 h-4" />
                  Income
                </button>
                <button
                  onClick={() => setActiveTab("vision")}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                    activeTab === "vision" ? "text-white border-amber-500" : "text-slate-400 border-transparent hover:text-white"
                  }`}
                >
                  <Target className="w-4 h-4" />
                  Vision
                </button>
              </div>

              {/* Tab Content */}
              {activeTab === "overview" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Blue Team */}
                  <div>
                    <div className="space-y-2">
                      {sortPlayersByRole(playerStats.filter(p => p.side === "blue")).map((player, idx) => (
                        <PlayerRow key={player._id || idx} player={player} />
                      ))}
                    </div>
                  </div>

                  {/* Red Team */}
                  <div>
                    <div className="space-y-2">
                      {sortPlayersByRole(playerStats.filter(p => p.side === "red")).map((player, idx) => (
                        <PlayerRow key={player._id || idx} player={player} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "damage" && <DamageTab playerStats={playerStats} />}
              {activeTab === "income" && <IncomeTab playerStats={playerStats} />}
              {activeTab === "vision" && <VisionTab playerStats={playerStats} />}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PlayerRow({ player }) {
  const isRedSide = player.side === "red"
  return (
    <div className={`flex items-center justify-between p-2.5 rounded-lg ${isRedSide ? "bg-red-500/5" : "bg-blue-500/5"}`}>
      <div className="flex items-center gap-3 min-w-0">
        {player.champion && (
          <div className="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-slate-700/50 border border-slate-600/50">
            <img src={`/champions/${player.champion}.png`} alt={player.champion} className="w-full h-full object-cover" />
          </div>
        )}
        {/* Champion & Player Info */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <a
                href={`https://dpm.lol/${player.summoner_name}-${player.riot_tag}`}
                target="_blank"
                rel="noreferrer"
                className="text-white text-sm font-medium truncate hover:text-amber-400 transition-colors"
              >
                {player.summoner_name}
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
