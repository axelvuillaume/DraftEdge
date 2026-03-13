import { useEffect, useState, useRef } from "react"
import { Link, useLocation } from "react-router-dom"
import {
  LayoutDashboard,
  Gamepad2,
  Shield,
  ImagePlus,
  Loader2,
  Upload,
  X,
  BarChart3,
  FileText,
  Check,
  ChevronDown,
  Trophy,
  Calendar,
  Target,
  Plus,
  Briefcase,
  Users,
  Settings,
  FolderOpen
} from "lucide-react"
import useStore from "@/services/store"
import api from "@/services/api"
import { toast } from "react-hot-toast"
import Modal from "@/components/modal"

const getMenu = user => [
  { title: "Home", to: "/", icon: LayoutDashboard },
  { title: "Players", to: "/soloq", icon: Users },
  { title: "Stats Team", to: "/performance", icon: BarChart3 },
  { title: "Performance", to: "/scrim-hub", icon: Target },
  { title: "Manager space", to: "/opponents", icon: Briefcase },
  { title: "My League", to: "/league", icon: Trophy }
]

const Navbar = () => {
  const [selected, setSelected] = useState(0)
  const location = useLocation()
  const { user } = useStore()

  const MENU = getMenu(user)

  useEffect(() => {
    const index = MENU.findIndex(e => {
      if (e.to === "/") return location.pathname === "/"
      return location.pathname.includes(e.to)
    })
    setSelected(index >= 0 ? index : 0)
  }, [location, MENU.length])

  return (
    <div className="h-screen w-64 bg-slate-900 border-r border-slate-700/50 flex flex-col relative z-40">
      {/* Logo */}
      <div className="p-6 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-slate-900" />
          </div>
          <div>
            <span className="text-white font-bold text-lg tracking-tight">DraftEdge</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-1">
          {MENU.map((menu, index) => {
            const Icon = menu.icon
            const isActive = selected === index

            return (
              <Link
                to={menu.to}
                key={menu.title}
                className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-3 transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-amber-500/20 to-amber-600/10 text-amber-400 border border-amber-500/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                }`}
                onClick={() => setSelected(index)}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-amber-400" : ""}`} />
                <span className="text-sm font-medium">{menu.title}</span>
                {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-500" />}
              </Link>
            )
          })}
        </div>
      </nav>

      <div className="p-4 border-t border-slate-700/50 space-y-2">
        <Link
          to="/team"
          className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-3 transition-all duration-200 ${
            location.pathname.includes("/team")
              ? "bg-gradient-to-r from-amber-500/20 to-amber-600/10 text-amber-400 border border-amber-500/30"
              : "text-slate-400 hover:text-white hover:bg-slate-800/50"
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-sm font-medium">Settings Members</span>
        </Link>
        <div className="px-3 py-2 rounded-lg bg-slate-800/50">
          <p className="text-slate-500 text-xs">Version 1.0.0</p>
        </div>
      </div>
    </div>
  )
}

export function UploadModal({ isOpen, onClose, user, onSuccess }) {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef(null)

  // ROFL specific state
  const [roflConfig, setRoflConfig] = useState({
    team_side: "",
    opponent_id: "",
    opponent_name: "",
    name: "",
    draft_url: "",
    date: new Date().toISOString().slice(0, 10),
    folder_id: "",
    folder_name: ""
  })
  const [roflPreview, setRoflPreview] = useState(null)
  const [parsing, setParsing] = useState(false)

  // Enemy team dropdown state
  const [enemyTeams, setEnemyTeams] = useState([])
  const [showOpponentDropdown, setShowOpponentDropdown] = useState(false)
  const [newTeamName, setNewTeamName] = useState("")

  const [folders, setFolders] = useState([])
  const [showFolderDropdown, setShowFolderDropdown] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")

  useEffect(() => {
    if (isOpen && user?.team_id) {
      api.post("/enemy-team/search", { team_id: user.team_id }).then(({ ok, data }) => {
        if (ok) setEnemyTeams(data)
      })
      api.post("/folder/search", { team_id: user.team_id }).then(({ ok, data }) => {
        if (ok) setFolders(data)
      })
    }
  }, [isOpen, user?.team_id])

  const createEnemyTeam = async name => {
    try {
      const { ok, data, code } = await api.post("/enemy-team", { name })
      if (!ok) return toast.error(code)
      setEnemyTeams(prev => [data, ...prev])
      setRoflConfig(prev => ({ ...prev, opponent_id: data._id, opponent_name: data.name }))
      setNewTeamName("")
      setShowOpponentDropdown(false)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const createFolder = async name => {
    try {
      const { ok, data, code } = await api.post("/folder", { name })
      if (!ok) return toast.error(code)
      setFolders(prev => [data, ...prev])
      setRoflConfig(prev => ({ ...prev, folder_id: data._id, folder_name: data.name }))
      setNewFolderName("")
      setShowFolderDropdown(false)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const acceptedFiles = ".rofl"

  const handleFiles = async selectedFiles => {
    if (!selectedFiles || selectedFiles.length === 0) return

    const selectedFile = selectedFiles[0]
    if (!selectedFile.name.endsWith(".rofl")) {
      toast.error("File must be a .rofl")
      return
    }

    setFile(selectedFile)

    // Parser le fichier pour preview
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
      toast.error("Error: " + error.message)
      setFile(null)
    } finally {
      setParsing(false)
    }
  }

  const removeFile = () => {
    setFile(null)
    setRoflPreview(null)
    setRoflConfig({ team_side: "", opponent_id: "", opponent_name: "", name: "", draft_url: "", date: new Date().toISOString().slice(0, 10), folder_id: "", folder_name: "" })
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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setUploadProgress("uploading")

    if (!roflConfig.team_side) {
      toast.error("Select your side (Blue/Red)")
      setUploading(false)
      return
    }
    if (!roflConfig.opponent_name) {
      toast.error("Select an opponent team")
      setUploading(false)
      return
    }

    try {
      const formData = new FormData()
      formData.append("replay", file)
      formData.append("team_side", roflConfig.team_side)
      formData.append("team_id", user?.team_id || "")
      formData.append("team_name", user?.team_name || "")
      if (roflConfig.opponent_id) formData.append("opponent_id", roflConfig.opponent_id)
      formData.append("opponent_name", roflConfig.opponent_name)
      formData.append("name", roflConfig.name)
      if (roflConfig.date) formData.append("date", new Date(roflConfig.date).toISOString())
      if (roflConfig.draft_url) formData.append("draft_url", roflConfig.draft_url)
      if (roflConfig.folder_id) formData.append("folder_id", roflConfig.folder_id)
      if (roflConfig.folder_name) formData.append("folder_name", roflConfig.folder_name)

      const response = await api.postFormData("/parser/import", formData)

      if (response.ok) {
        setUploadProgress("success")
        toast.success(roflConfig.draft_url ? "Game & draft imported!" : "Game imported successfully!")
        setTimeout(() => {
          handleClose()
          onSuccess?.()
        }, 1000)
      } else {
        toast.error(response.error || response.details || "Error during import")
        setUploadProgress("error")
      }
    } catch (error) {
      toast.error("Error: " + error.message)
      setUploadProgress("error")
    } finally {
      setUploading(false)
    }
  }

  const handleClose = () => {
    if (uploading || parsing) return
    setFile(null)
    setUploadProgress(null)
    setRoflPreview(null)
    setRoflConfig({ team_side: "", opponent_id: "", opponent_name: "", name: "", draft_url: "", date: new Date().toISOString().slice(0, 10), folder_id: "", folder_name: "" })
    setShowOpponentDropdown(false)
    setNewTeamName("")
    setShowFolderDropdown(false)
    setNewFolderName("")
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-slate-800 border border-slate-700">
      <div className="p-6">
        <h2 className="text-xl font-bold text-white mb-2">Import a Game</h2>
        <p className="text-slate-400 text-sm mb-6">Import a replay file (.rofl) to automatically extract all stats from the game.</p>

        {/* File drop zone */}
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
            <input ref={inputRef} type="file" accept={acceptedFiles} onChange={e => handleFiles(e.target.files)} className="hidden" />
            <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-300 font-medium mb-1">Drop your .rofl file here</p>
            <p className="text-slate-500 text-sm">or click to browse</p>
            <p className="text-slate-500 text-xs mt-2">📁 Documents/League of Legends/Replays/</p>
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

            {/* ROFL parsed preview */}
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

                {/* Teams preview */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Blue Team */}
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

                  {/* Red Team */}
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

            {/* ROFL Config form */}
            {roflPreview && (
              <div className="grid grid-cols-2 gap-4">
                {/* Side selector */}
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
                      🔵 Blue
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoflConfig(prev => ({ ...prev, team_side: "red" }))}
                      className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                        roflConfig.team_side === "red" ? "bg-red-500 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                      }`}
                    >
                      🔴 Red
                    </button>
                  </div>
                </div>

                {/* Opponent dropdown */}
                <div className="relative">
                  <label className="block text-sm font-medium text-slate-400 mb-1">Opponent Team *</label>
                  <button
                    type="button"
                    onClick={() => setShowOpponentDropdown(!showOpponentDropdown)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-slate-600 hover:border-slate-500 bg-slate-700/50 transition-all text-left"
                  >
                    <span className={roflConfig.opponent_name ? "text-white" : "text-slate-400"}>{roflConfig.opponent_name || "Select opponent..."}</span>
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
                          {enemyTeams.map(team => (
                            <button
                              key={team._id}
                              type="button"
                              onClick={() => {
                                setRoflConfig(prev => ({ ...prev, opponent_id: team._id, opponent_name: team.name }))
                                setShowOpponentDropdown(false)
                              }}
                              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${roflConfig.opponent_id === team._id ? "bg-amber-500/20 text-amber-400" : "text-slate-300 hover:bg-slate-700/50"}`}
                            >
                              {team.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Folder */}
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

                {/* Game name */}
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

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Date</label>
                  <input
                    type="date"
                    value={roflConfig.date}
                    onChange={e => setRoflConfig(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-700/50 text-white focus:border-amber-500 focus:outline-none transition-all [color-scheme:dark]"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center mt-6">
          <div className="flex justify-end gap-3 ml-auto">
            <button
              onClick={handleUpload}
              disabled={!file || uploading || parsing || !roflConfig.team_side || !roflConfig.opponent_name}
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
                  <span>Import Game</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

function NewSessionModal({ isOpen, onClose, onSuccess }) {
  const [name, setName] = useState("")

  const handleCreate = async () => {
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

  const handleClose = () => {
    setName("")
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setName("")
        onClose()
      }}
      className="w-full max-w-md bg-slate-800 border border-slate-700"
    >
      <div className="p-6 space-y-4">
        <h2 className="text-white font-semibold text-lg">New Scrim Session</h2>
        <div>
          <label className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1.5 block">Session Name</label>
          <input
            type="text"
            placeholder="e.g. Scrim vs Team B"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full border border-slate-600 bg-slate-700/50 text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none rounded-lg px-3 py-2.5 text-sm"
            onKeyDown={e => e.key === "Enter" && handleCreate()}
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold rounded-xl transition-all duration-200 disabled:cursor-not-allowed text-sm"
          >
            <span>Create Session</span>
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default Navbar
