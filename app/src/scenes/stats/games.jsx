import { useState, useEffect, Fragment } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { toast } from "react-hot-toast"
import api from "@/services/api"
import { Clock, Swords, Trash2, MoreVertical, Folder, Plus, Check, FolderInput, X, Pencil, ImagePlus } from "lucide-react"
import Modal from "@/components/modal"
import OpponentDropdown from "@/components/OpponentDropdown"
import { UploadModal } from "@/components/NavBar"
import useStore from "@/services/store"
import { getChampionIcon, getItemIcon, getSummonerSpellIcon, getRuneIcon, ROLES, ROLE_LABELS, ROLE_ICON_COLORS, TIER_SHORT, TIER_COLOR } from "@/utils"

const sortPlayersByRole = players =>
  [...players].sort(
    (a, b) =>
      (ROLES.indexOf(a.role?.toLowerCase()) === -1 ? 999 : ROLES.indexOf(a.role?.toLowerCase())) -
      (ROLES.indexOf(b.role?.toLowerCase()) === -1 ? 999 : ROLES.indexOf(b.role?.toLowerCase()))
  )

export default function Games() {
  const location = useLocation()
  const [games, setGames] = useState([])
  const { user } = useStore()
  const [folders, setFolders] = useState([])
  const [filters, setFilters] = useState({ folder_id: null, opponent_id: location.state?.opponent_id || null, official: null })
  const [selectedGames, setSelectedGames] = useState([])
  const [selectionMode, setSelectionMode] = useState(false)
  const [showMoveDropdown, setShowMoveDropdown] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)

  const fetchGames = async () => {
    try {
      const { ok, data, code } = await api.post("/game/search", { team_id: user?.team_id, ...filters })
      if (!ok) return toast.error(code || "Failed to fetch games")
      setGames(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch games")
    }
  }

  const moveGamesToFolder = async folderId => {
    try {
      const { ok, code } = await api.put("/game/move", { game_ids: selectedGames, folder_id: folderId })
      if (!ok) return toast.error(code || "Failed to move games")
      toast.success("Games moved to folder")
      setSelectedGames([])
      setSelectionMode(false)
      setShowMoveDropdown(false)
      fetchGames()
    } catch (error) {
      toast.error(error.code || "Failed to move games")
    }
  }

  useEffect(() => {
    fetchGames()
  }, [filters])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 lg:p-8">
      <div className="max-w-[1800px] mx-auto space-y-8">
        <section>
          <div className="space-y-6">
            <FolderBar filters={filters} onFilterChange={setFilters} onFoldersLoaded={setFolders} onImport={() => setShowImportModal(true)} />

            <div className="flex items-center gap-3">
              <OpponentFilter filters={filters} onFilterChange={setFilters} />
              <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                {[
                  { value: null, label: "All" },
                  { value: true, label: "Official" },
                  { value: false, label: "Scrim" }
                ].map(opt => (
                  <button
                    key={String(opt.value)}
                    onClick={() => setFilters({ ...filters, official: opt.value })}
                    className={`px-3.5 py-2 text-sm font-medium transition-colors ${
                      filters.official === opt.value ? "bg-amber-500/20 text-amber-400" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {selectionMode && (
              <div className="flex items-center justify-between bg-slate-800 border border-slate-700 rounded-xl px-4 py-3">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setSelectedGames(selectedGames.length === games.length ? [] : games.map(g => g._id))}
                    className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors"
                  >
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

      <UploadModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        user={user}
        onSuccess={() => {
          setShowImportModal(false)
          fetchGames()
        }}
      />
    </div>
  )
}

function FolderBar({ filters, onFilterChange, onFoldersLoaded, onImport }) {
  const [folders, setFolders] = useState([])
  const [hoveredFolder, setHoveredFolder] = useState(null)
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false)
  const [newFolder, setNewFolder] = useState({ name: "" })
  const { user } = useStore()

  const fetchFolders = async () => {
    try {
      const { ok, data, code } = await api.post("/folder/search", { team_id: user?.team_id })
      if (!ok) return toast.error(code || "Failed to fetch folders")
      setFolders(data)
      onFoldersLoaded(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch folders")
    }
  }

  const deleteFolder = async folderId => {
    if (!confirm("Are you sure you want to delete this folder?")) return
    try {
      const { ok, code } = await api.delete(`/folder/${folderId}`)
      if (!ok) return toast.error(code || "Failed to delete folder")
      setFolders(prev => prev.filter(f => f._id !== folderId))
      onFoldersLoaded(folders.filter(f => f._id !== folderId))
      toast.success("Folder deleted")
      onFilterChange({ ...filters, folder_id: null })
    } catch (error) {
      toast.error(error.code || "Failed to delete folder")
    }
  }

  const createFolder = async () => {
    try {
      const { ok, data, code } = await api.post("/folder", { name: newFolder.name })
      if (!ok) return toast.error(code || "Failed to create folder")
      setFolders(prev => [...prev, data])
      onFoldersLoaded([...folders, data])
      setNewFolder({ name: "" })
      setShowCreateFolderModal(false)
    } catch (error) {
      toast.error(error.code || "Failed to create folder")
    }
  }

  useEffect(() => {
    fetchFolders()
  }, [])

  return (
    <>
      <div className="flex items-center gap-3 flex-wrap">
        <div
          onClick={() => onFilterChange({ ...filters, folder_id: null })}
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
            onClick={() => onFilterChange({ ...filters, folder_id: folder._id })}
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

        <div className="ml-auto">
          <button
            onClick={onImport}
            className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-900 font-semibold text-sm rounded-xl transition-all duration-200"
          >
            <ImagePlus className="w-4 h-4" />
            <span>Import a Game</span>
          </button>
        </div>
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
    </>
  )
}

function OpponentFilter({ filters, onFilterChange }) {
  const [enemyTeams, setEnemyTeams] = useState([])
  const { user } = useStore()

  const fetchEnemyTeams = async () => {
    try {
      const { ok, data, code } = await api.post("/enemy-team/search", { team_id: user?.team_id })
      if (!ok) return toast.error(code || "Failed to fetch enemy teams")
      setEnemyTeams(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch enemy teams")
    }
  }

  useEffect(() => {
    fetchEnemyTeams()
  }, [])

  if (enemyTeams.length === 0) return null

  return (
    <select
      value={filters.opponent_id || ""}
      onChange={e => onFilterChange({ ...filters, opponent_id: e.target.value || null })}
      className="bg-slate-800 border border-slate-700 text-sm text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500 transition-all duration-200 cursor-pointer"
    >
      <option value="">All opponents</option>
      {enemyTeams.map(team => (
        <option key={team._id} value={team._id}>
          {team.name}
        </option>
      ))}
    </select>
  )
}

function GameCard({ game, onDelete, selectionMode, isSelected, onToggleSelect, folders }) {
  const [expanded, setExpanded] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  const handleDelete = async e => {
    e.stopPropagation()
    if (!confirm("Are you sure you want to delete this game?")) return
    try {
      const { ok, code } = await api.delete(`/game/${game._id}`)
      if (!ok) return toast.error(code || "Failed to delete game")
      toast.success("Game deleted successfully")
      onDelete()
    } catch (error) {
      toast.error(error.code || "Failed to delete game")
    }
  }

  return (
    <div
      className={`bg-slate-800/50 border rounded-xl overflow-visible transition-all duration-200 hover:border-slate-600/50 relative ${isSelected ? "border-amber-500" : "border-slate-700/50"}`}
    >
      <button
        onClick={e => (e.preventDefault(), selectionMode ? onToggleSelect(game._id) : setExpanded(!expanded))}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-700/20 transition-colors relative"
      >
        <div className="flex items-center gap-4 min-w-0 flex-1">
          {selectionMode && (
            <div
              className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? "bg-amber-500 border-amber-500" : "border-slate-500 hover:border-slate-400"}`}
            >
              {isSelected && <Check className="w-3 h-3 text-white" />}
            </div>
          )}
          <div className={`w-1.5 h-14 rounded-full flex-shrink-0 ${game.win ? "bg-emerald-500" : "bg-red-500"}`} />

          <div className="text-left min-w-0 flex-1">
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
              {game.team_side && (
                <>
                  <span className="text-slate-700 text-[11px]">·</span>
                  <span className={`text-[11px] font-semibold ${game.team_side === "blue" ? "text-blue-400" : "text-red-400"}`}>
                    {game.team_side === "blue" ? "Blue" : "Red"} side
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <AvgEloBadge game={game} />

        <div className="flex items-center gap-3 flex-shrink-0">
          {game.folder_id && (
            <div className="hidden lg:flex items-center gap-1.5 text-slate-500 text-xs">
              <Folder className="w-3 h-3" />
              <span>{folders?.find(f => f._id === game.folder_id)?.name || "Folder"}</span>
            </div>
          )}

          {game.champions && game.champions[game.team_side] && (
            <div className="hidden sm:flex items-center gap-1">
              {ROLES.map(role =>
                game.champions[game.team_side]?.[role] ? (
                  <div key={role} className="w-8 h-8 rounded-lg overflow-hidden bg-slate-700/50 border border-slate-600/50">
                    <img src={getChampionIcon(game.champions[game.team_side][role])} alt={game.champions[game.team_side][role]} className="w-full h-full object-cover" />
                  </div>
                ) : null
              )}
            </div>
          )}

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
                      setShowEditModal(true)
                      setShowDropdown(false)
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

      {expanded && <ExpandedContent game={game} onDelete={onDelete} />}

      <EditGameModal game={game} isOpen={showEditModal} onClose={() => setShowEditModal(false)} onSaved={onDelete} />
    </div>
  )
}

function AvgEloBadge({ game }) {
  const [avgElo, setAvgElo] = useState(null)

  const fetchAvgElo = async () => {
    try {
      const { ok, data, code } = await api.get(`/game/${game._id}/avg-elo`)
      if (!ok) return toast.error(code || "Failed to fetch average elo")
      setAvgElo(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch average elo")
    }
  }

  useEffect(() => {
    fetchAvgElo()
  }, [game._id])

  if (!avgElo || (!avgElo.team_avg_elo && !avgElo.enemy_avg_elo)) return null

  return (
    <div className="hidden md:flex items-center gap-3 absolute left-1/2 -translate-x-1/2">
      <div className="flex flex-col items-end">
        <span className="text-slate-500 text-[10px] uppercase tracking-wider leading-none mb-0.5">My team</span>
        {avgElo.team_avg_elo ? (
          <span className={`text-xs font-semibold ${TIER_COLOR[avgElo.team_avg_elo.tier?.toUpperCase()] || "text-slate-400"}`}>
            {["MASTER", "GRANDMASTER", "CHALLENGER"].includes(avgElo.team_avg_elo.tier?.toUpperCase())
              ? `${TIER_SHORT[avgElo.team_avg_elo.tier?.toUpperCase()] || avgElo.team_avg_elo.tier} ${avgElo.team_avg_elo.lp} LP`
              : `${TIER_SHORT[avgElo.team_avg_elo.tier?.toUpperCase()] || avgElo.team_avg_elo.tier} ${avgElo.team_avg_elo.rank}`}
          </span>
        ) : (
          <span className="text-slate-600 text-xs">?</span>
        )}
      </div>
      <span className="text-slate-600 text-xs font-medium">vs</span>
      <div className="flex flex-col items-start">
        <span className="text-slate-500 text-[10px] uppercase tracking-wider leading-none mb-0.5">Enemy</span>
        {avgElo.enemy_avg_elo ? (
          <span className={`text-xs font-semibold ${TIER_COLOR[avgElo.enemy_avg_elo.tier?.toUpperCase()] || "text-slate-400"}`}>
            {["MASTER", "GRANDMASTER", "CHALLENGER"].includes(avgElo.enemy_avg_elo.tier?.toUpperCase())
              ? `${TIER_SHORT[avgElo.enemy_avg_elo.tier?.toUpperCase()] || avgElo.enemy_avg_elo.tier} ${avgElo.enemy_avg_elo.lp} LP`
              : `${TIER_SHORT[avgElo.enemy_avg_elo.tier?.toUpperCase()] || avgElo.enemy_avg_elo.tier} ${avgElo.enemy_avg_elo.rank}`}
          </span>
        ) : (
          <span className="text-slate-600 text-xs">?</span>
        )}
      </div>
    </div>
  )
}

function EditGameModal({ game, isOpen, onClose, onSaved }) {
  const [editForm, setEditForm] = useState({
    name: game.name || "",
    opponent_name: game.opponent_name || "",
    date: game.date ? new Date(game.date).toISOString().slice(0, 10) : "",
    draft_url: game.source_url || "",
    official: game.official || false
  })

  const handleEdit = async () => {
    try {
      const { ok, code } = await api.put(`/game/${game._id}`, { name: editForm.name, opponent_name: editForm.opponent_name, date: editForm.date, official: editForm.official })
      if (!ok) return toast.error(code || "Failed to update game")

      if (editForm.draft_url.trim() !== (game.source_url || "") && editForm.draft_url.trim()) {
        const { ok: draftOk, error } = await api.put(`/game/${game._id}/draft`, { url: editForm.draft_url.trim() })
        if (!draftOk) toast.error(error || "Draft error")
      }

      toast.success("Game updated")
      onClose()
      onSaved()
    } catch (error) {
      toast.error(error.code || "Failed to update game")
    }
  }

  useEffect(() => {
    if (isOpen) {
      setEditForm({
        name: game.name || "",
        opponent_name: game.opponent_name || "",
        date: game.date ? new Date(game.date).toISOString().slice(0, 10) : "",
        draft_url: game.source_url || "",
        official: game.official || false
      })
    }
  }, [isOpen])

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="w-full max-w-md !bg-slate-900 border border-slate-700/50 shadow-xl !overflow-visible">
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
          <OpponentDropdown value={editForm.opponent_name} onChange={({ name }) => setEditForm(prev => ({ ...prev, opponent_name: name }))} label="Opponent Team" />
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
          <div>
            <label
              onClick={() => setEditForm(prev => ({ ...prev, official: !prev.official }))}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  editForm.official ? "bg-amber-500 border-amber-500" : "border-slate-500 group-hover:border-slate-400"
                }`}
              >
                {editForm.official && <Check className="w-3 h-3 text-white" />}
              </div>
              <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Official game</span>
            </label>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              onClick={handleEdit}
              className="bg-amber-500 text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-amber-500/20"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export function ExpandedContent({ game, onDelete }) {
  const [playerStats, setPlayerStats] = useState([])
  const [activeTab, setActiveTab] = useState("advanced")

  const fetchPlayerStats = async () => {
    try {
      const { ok, data, code } = await api.post("/playerstats/search", { game_id: game._id })
      if (!ok) return toast.error(code || "Failed to fetch player stats")
      setPlayerStats(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch player stats")
    }
  }

  useEffect(() => {
    fetchPlayerStats()
  }, [game._id])

  return (
    <div className="border-t border-slate-700/50 p-4">
      <div>
        <div className="flex items-center gap-1 mb-6 border-b border-slate-700/50">
          {[
            { key: "advanced", label: "Scoreboard" },
            { key: "draft", label: "Draft" },
            { key: "damage", label: "Damage" },
            { key: "income", label: "Income" },
            { key: "vision", label: "Vision" }
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

        {activeTab === "damage" && <DamageTab playerStats={playerStats} />}
        {activeTab === "income" && <IncomeTab playerStats={playerStats} />}
        {activeTab === "vision" && <VisionTab playerStats={playerStats} />}
        {activeTab === "advanced" && <AdvancedTab playerStats={playerStats} game={game} />}
        {activeTab === "draft" && <DraftTab game={game} onDraftAdded={onDelete} />}
      </div>
    </div>
  )
}

function DamageTab({ playerStats }) {
  const blueTeam = sortPlayersByRole(playerStats.filter(p => p.side === "blue"))
  const redTeam = sortPlayersByRole(playerStats.filter(p => p.side === "red"))
  const maxDamage = Math.max(...playerStats.map(p => p.damage?.total_to_champions || 0))

  const renderCard = player => (
    <div className="flex-1 group relative p-2 rounded-lg bg-slate-800/30">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="text-white text-sm font-medium mb-1">{player?.champion || "Unknown"}</div>
          <div className="relative">
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full flex rounded-full" style={{ width: `${maxDamage > 0 ? ((player?.damage?.total_to_champions || 0) / maxDamage) * 100 : 0}%` }}>
                <div
                  className="bg-orange-500"
                  style={{
                    width: `${(player?.damage?.total_to_champions || 0) > 0 ? ((player?.damage?.physical_to_champions || 0) / (player?.damage?.total_to_champions || 0)) * 100 : 0}%`
                  }}
                />
                <div
                  className="bg-blue-500"
                  style={{
                    width: `${(player?.damage?.total_to_champions || 0) > 0 ? ((player?.damage?.magic_to_champions || 0) / (player?.damage?.total_to_champions || 0)) * 100 : 0}%`
                  }}
                />
                <div
                  className="bg-slate-300"
                  style={{
                    width: `${(player?.damage?.total_to_champions || 0) > 0 ? ((player?.damage?.true_to_champions || 0) / (player?.damage?.total_to_champions || 0)) * 100 : 0}%`
                  }}
                />
              </div>
            </div>

            <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
              <div className="text-xs space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span className="text-orange-400">{((player?.damage?.physical_to_champions || 0) / 1000).toFixed(1)}k Physical</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-blue-400">{((player?.damage?.magic_to_champions || 0) / 1000).toFixed(1)}k Magic</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
                  <span className="text-slate-300">{((player?.damage?.true_to_champions || 0) / 1000).toFixed(1)}k True</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="text-white font-semibold text-sm ml-3">{((player?.damage?.total_to_champions || 0) / 1000).toFixed(1)}k</div>
      </div>
    </div>
  )

  return (
    <div className="space-y-2">
      {blueTeam.map((bluePlayer, idx) => (
        <div key={idx} className="flex items-center gap-2">
          {renderCard(bluePlayer)}
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-700 border border-slate-600">
            <Swords className="w-3 h-3 text-slate-400" />
          </div>
          {renderCard(redTeam[idx])}
        </div>
      ))}
    </div>
  )
}

function IncomeTab({ playerStats }) {
  const blueTeam = sortPlayersByRole(playerStats.filter(p => p.side === "blue"))
  const redTeam = sortPlayersByRole(playerStats.filter(p => p.side === "red"))
  const maxGold = Math.max(...playerStats.map(p => p.gold || 0))

  const renderCard = player => (
    <div className="flex-1 group relative p-2 rounded-lg bg-slate-800/30">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="text-white text-sm font-medium mb-1">{player?.champion || "Unknown"}</div>
          <div className="relative">
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: `${maxGold > 0 ? ((player?.gold || 0) / maxGold) * 100 : 0}%` }} />
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
              <span>{player?.farm?.minions || 0} minions</span>
              <span>{player?.farm?.jungle_monsters || 0} jungle</span>
            </div>
          </div>
        </div>
        <div className="text-amber-400 font-semibold text-sm ml-3">{((player?.gold || 0) / 1000).toFixed(1)}k</div>
      </div>
    </div>
  )

  return (
    <div className="space-y-2">
      {blueTeam.map((bluePlayer, idx) => (
        <div key={idx} className="flex items-center gap-2">
          {renderCard(bluePlayer)}
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-700 border border-slate-600">
            <Swords className="w-3 h-3 text-slate-400" />
          </div>
          {renderCard(redTeam[idx])}
        </div>
      ))}
    </div>
  )
}

function VisionTab({ playerStats }) {
  const blueTeam = sortPlayersByRole(playerStats.filter(p => p.side === "blue"))
  const redTeam = sortPlayersByRole(playerStats.filter(p => p.side === "red"))
  const maxVisionScore = Math.max(...playerStats.map(p => p.vision?.score || 0))

  const renderCard = player => (
    <div className="flex-1 group relative p-2 rounded-lg bg-slate-800/30">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="text-white text-sm font-medium mb-1">{player?.champion || "Unknown"}</div>
          <div className="relative">
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-purple-500 rounded-full" style={{ width: `${maxVisionScore > 0 ? ((player?.vision?.score || 0) / maxVisionScore) * 100 : 0}%` }} />
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
              <span className="text-purple-400">{player?.vision?.control_wards_bought || 0} pink</span>
              <span>{player?.vision?.wards_killed || 0} destroyed</span>
              <span>{player?.vision?.wards_placed || 0} placed</span>
            </div>
          </div>
        </div>
        <div className="text-purple-400 font-semibold text-sm ml-3">{player?.vision?.score || 0}</div>
      </div>
    </div>
  )

  return (
    <div className="space-y-2">
      {blueTeam.map((bluePlayer, idx) => (
        <div key={idx} className="flex items-center gap-2">
          {renderCard(bluePlayer)}
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-700 border border-slate-600">
            <Swords className="w-3 h-3 text-slate-400" />
          </div>
          {renderCard(redTeam[idx])}
        </div>
      ))}
    </div>
  )
}

function AdvancedTab({ playerStats, game }) {
  const navigate = useNavigate()
  const { setSearchNavigation } = useStore()
  const blueTeam = sortPlayersByRole(playerStats.filter(p => p.side === "blue"))
  const redTeam = sortPlayersByRole(playerStats.filter(p => p.side === "red"))

  const objectives = [
    { icon: "tower", blue: game.blue_team?.towers || 0, red: game.red_team?.towers || 0 },
    { icon: "dragon", blue: game.blue_team?.dragons || 0, red: game.red_team?.dragons || 0 },
    { icon: "baron", blue: game.blue_team?.barons || 0, red: game.red_team?.barons || 0 },
    { icon: "herald", blue: game.blue_team?.heralds || 0, red: game.red_team?.heralds || 0 },
    { icon: "grubs", blue: game.blue_team?.grubs || 0, red: game.red_team?.grubs || 0 },
    ...(game.blue_team?.atakhan > 0 || game.red_team?.atakhan > 0 ? [{ icon: "atakhan", blue: game.blue_team?.atakhan || 0, red: game.red_team?.atakhan || 0 }] : []),
    { icon: "inhibitor", blue: game.blue_team?.inhibitors || 0, red: game.red_team?.inhibitors || 0 }
  ]

  const AdvancedCard = ({ player }) => (
    <div className={`flex-1 flex items-center gap-2.5 rounded-lg p-2.5 ${player.side === "red" ? "bg-red-500/5" : "bg-blue-500/5"}`}>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="w-8 h-8 rounded-md overflow-hidden bg-slate-700/50">
            {player.champion && <img src={getChampionIcon(player.champion)} alt={player.champion} className="w-full h-full object-cover" />}
          </div>
          <div className="flex flex-col gap-0.5">
            {player.summoner_spells?.spell1 && (
              <div className="w-4 h-4 rounded-sm overflow-hidden bg-slate-700/50">
                <img src={getSummonerSpellIcon(player.summoner_spells.spell1)} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            {player.summoner_spells?.spell2 && (
              <div className="w-4 h-4 rounded-sm overflow-hidden bg-slate-700/50">
                <img src={getSummonerSpellIcon(player.summoner_spells.spell2)} alt="" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-0.5">
            {player.runes?.keystone && (
              <div className="w-4 h-4 rounded-full overflow-hidden bg-slate-700/50">
                <img src={getRuneIcon(player.runes.keystone)} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            {player.runes?.secondary_tree && (
              <div className="w-4 h-4 rounded-full overflow-hidden bg-slate-700/50">
                <img src={getRuneIcon(player.runes.secondary_tree)} alt="" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {player.side === game.team_side ? (
              <button
                onClick={e => {
                  e.stopPropagation()
                  setSearchNavigation({ type: "player", data: { puuid: player.puuid, name: player.summoner_name } })
                  navigate("/performance/stats")
                }}
                className="text-white text-xs font-medium truncate hover:text-amber-400 transition-colors"
              >
                {player.summoner_name}
              </button>
            ) : (
              <span className="text-white text-xs font-medium truncate">{player.summoner_name}</span>
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
          <div className="flex items-center gap-2 mt-0.5">
            <div className="flex items-center gap-1">
              <span className="text-emerald-400 text-xs font-semibold">{player.kills}</span>
              <span className="text-slate-600 text-[10px]">/</span>
              <span className="text-red-400 text-xs font-semibold">{player.deaths}</span>
              <span className="text-slate-600 text-[10px]">/</span>
              <span className="text-cyan-400 text-xs font-semibold">{player.assists}</span>
              <span className="text-slate-500 text-[10px] ml-0.5">
                {player.deaths > 0 ? ((player.kills + player.assists) / player.deaths).toFixed(1) : (player.kills + player.assists).toFixed(1)}
              </span>
            </div>
            <span className="text-slate-600 text-[10px]">·</span>
            <span className="text-amber-400/80 text-[10px] font-medium">{((player.gold || 0) / 1000).toFixed(1)}k</span>
            <span className="text-slate-600 text-[10px]">·</span>
            <span className="text-slate-400 text-[10px] font-medium">{player.cs || 0} CS</span>
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 flex items-center gap-0.5">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className={`w-6 h-6 rounded-sm overflow-hidden ${(player.items || [])[i] ? "bg-slate-700/50" : "bg-slate-800/30"}`}>
            {(player.items || [])[i] ? <img src={getItemIcon((player.items || [])[i])} alt="" className="w-full h-full object-cover" /> : null}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center justify-between py-2.5 px-4 rounded-lg bg-blue-500/5 border border-blue-500/10">
          <span className="text-amber-400 text-xs font-semibold">{((game.blue_team?.gold || 0) / 1000).toFixed(1)}k gold</span>
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

        <div className="flex-1 flex items-center justify-between py-2.5 px-4 rounded-lg bg-red-500/5 border border-red-500/10">
          <div className="flex items-center gap-3">
            {objectives.map(obj => (
              <div key={obj.icon} className="flex items-center gap-1">
                <img src={`/objectives/${obj.icon}.png`} alt={obj.icon} className="w-4 h-4 object-contain opacity-70" />
                <span className="text-red-400 text-xs font-semibold">{obj.red}</span>
              </div>
            ))}
          </div>
          <span className="text-amber-400 text-xs font-semibold">{((game.red_team?.gold || 0) / 1000).toFixed(1)}k gold</span>
        </div>
      </div>

      <div className="space-y-2">
        {blueTeam.map((bluePlayer, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <AdvancedCard player={bluePlayer} />
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-700 border border-slate-600 flex-shrink-0">
              <Swords className="w-2.5 h-2.5 text-slate-400" />
            </div>
            <AdvancedCard player={redTeam[idx]} />
          </div>
        ))}
      </div>
    </div>
  )
}

function DraftTab({ game, onDraftAdded }) {
  const [draftUrl, setDraftUrl] = useState("")

  const handleAddDraft = async () => {
    if (!draftUrl.trim()) return
    try {
      const { ok, error } = await api.put(`/game/${game._id}/draft`, { url: draftUrl.trim() })
      if (!ok) return toast.error(error || "Erreur lors de l'ajout du draft")
      toast.success("Draft ajouté")
      setDraftUrl("")
      onDraftAdded?.()
    } catch (e) {
      toast.error(e.code || "Failed to add draft")
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
            disabled={!draftUrl.trim()}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black text-sm font-medium transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Ajouter
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-1.5 px-1">
          <div className="h-px flex-1 bg-gradient-to-r from-blue-500/40 to-transparent" />
          <span className="text-blue-400 text-[10px] font-bold uppercase tracking-wider">Blue</span>
          <div className="h-px flex-1 bg-gradient-to-l from-blue-500/15 to-transparent" />
        </div>

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

        <div className="flex-1 flex items-center gap-1.5 px-1">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-red-500/15" />
          <span className="text-red-400 text-[10px] font-bold uppercase tracking-wider">Red</span>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-red-500/40" />
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
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

        <div className="flex flex-col items-center justify-end pb-1">
          <div className="h-[calc(100%-20px)] w-px bg-gradient-to-b from-transparent via-slate-700/40 to-transparent relative flex flex-col justify-around items-center">
            {game.bluePicks.filter(Boolean).map((_, i) => (
              <div key={i} className="w-5 h-5 rounded-full bg-slate-800/90 border border-slate-700/50 flex items-center justify-center -ml-px">
                <Swords className="w-2.5 h-2.5 text-slate-600" />
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1">
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
