import { useState, useEffect, useRef } from "react"
import { toast } from "react-hot-toast"
import api from "@/services/api"
import useStore from "@/services/store"
import Modal from "@/components/modal"
import { Trophy, Swords, Target, TrendingUp, Clock, ChevronDown, ChevronUp, Shield, Crosshair, Zap, Upload, ImagePlus, X, Loader2 } from "lucide-react"

export default function FutureHome() {
  const [stats, setStats] = useState()
  const [gameStats, setGameStats] = useState()
  const [games, setGames] = useState([])
  const [showUploadModal, setShowUploadModal] = useState(false)
  const { user } = useStore()

  const fetchGameStats = async () => {
    try {
      const { ok, data, code } = await api.post("/game/stats", {})
      if (!ok) return toast.error(code)
      setGameStats(data)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const fetchPlayerStats = async () => {
    try {
      const { ok, data, code } = await api.post("/playerstats/home_stats", {})
      if (!ok) return toast.error(code)
      setStats(data)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const fetchGames = async () => {
    try {
      const { ok, data, code } = await api.post("/game/search", { limit: 3, team_id: user?.team_id })
      if (!ok) return toast.error(code)
      setGames(data)
    } catch (error) {
      toast.error(error.message)
    }
  }
  const fetchAll = async () => {
    await Promise.all([fetchPlayerStats(), fetchGameStats(), fetchGames()])
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const winRate = gameStats?.win_rate ? Math.round(gameStats.win_rate * 100) : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-white tracking-tight">Team Dashboard</h1>
            <p className="text-slate-400">Weekly performance overview • {user?.team_name || "Your Team"}</p>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-3 px-6 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-900 font-semibold text-base rounded-xl transition-all duration-200 "
          >
            <ImagePlus className="w-6 h-6" />
            <span>Ajouter des screens</span>
          </button>
        </header>

        {/* Upload Modal */}
        <UploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          user={user}
          onSuccess={async () => {
            setShowUploadModal(false)
            fetchAll()
          }}
        />

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Win Rate Card - Hero */}
          <div className="lg:col-span-1 bg-gradient-to-br from-slate-800/80 to-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-2 text-slate-400 mb-4">
                <span className="text-sm font-medium uppercase tracking-wider">Win Rate</span>
              </div>

              {/* Circular Progress */}
              <div className="flex items-center justify-center my-6">
                <div className="relative w-36 h-36">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="72" cy="72" r="64" stroke="currentColor" strokeWidth="12" fill="none" className="text-slate-700" />
                    <circle
                      cx="72"
                      cy="72"
                      r="64"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray={`${winRate * 4.02} 402`}
                      strokeLinecap="round"
                      className="text-amber-500 transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold text-white">{winRate}%</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-700/50">
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-400">{gameStats?.total_wins || 0}</p>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Wins</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-400">{gameStats?.total_losses || 0}</p>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Losses</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-300">{gameStats?.total_games || 0}</p>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Total</p>
                </div>
              </div>
            </div>
          </div>

          {/* Role Performance Cards */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {["top", "jungle", "mid", "bottom", "support"].map(role => (
              <RoleCard key={role} role={role} stats={stats?.[role]} />
            ))}
            {/* Team Average Card */}
            <TeamAverageCard stats={stats} />
          </div>
        </div>

        {/* Recent Games */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-6 bg-amber-500 rounded-full" />
            <h2 className="text-xl font-semibold text-white">Recent Scrims</h2>
          </div>

          <div className="space-y-3">
            {games.length === 0 ? (
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-12 text-center">
                <Swords className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No games recorded yet</p>
                <p className="text-slate-500 text-sm mt-1">Upload a screenshot to get started</p>
              </div>
            ) : (
              games.map(game => <GameCard key={game._id} game={game} />)
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

const ROLE_ORDER = ["top", "jungle", "mid", "bottom", "support"]

const sortPlayersByRole = players => {
  return [...players].sort((a, b) => {
    const aIndex = ROLE_ORDER.indexOf(a.role?.toLowerCase())
    const bIndex = ROLE_ORDER.indexOf(b.role?.toLowerCase())
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex)
  })
}

const roleIcons = {
  top: Shield,
  jungle: Zap,
  mid: Crosshair,
  bottom: Target,
  support: Trophy
}

const roleLabels = {
  top: "Top",
  jungle: "Jungle",
  mid: "Mid",
  bottom: "ADC",
  support: "Support"
}

const roleColors = {
  top: "from-orange-500/20 to-orange-600/5 border-orange-500/30",
  jungle: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/30",
  mid: "from-blue-500/20 to-blue-600/5 border-blue-500/30",
  bottom: "from-red-500/20 to-red-600/5 border-red-500/30",
  support: "from-cyan-500/20 to-cyan-600/5 border-cyan-500/30"
}

const roleIconColors = {
  top: "text-orange-400",
  jungle: "text-emerald-400",
  mid: "text-blue-400",
  bottom: "text-red-400",
  support: "text-cyan-400"
}

function RoleCard({ role, stats }) {
  const Icon = roleIcons[role] || Shield
  const colorClass = roleColors[role] || roleColors.top
  const iconColor = roleIconColors[role] || "text-orange-400"

  if (!stats) {
    return (
      <div className={`bg-gradient-to-br ${colorClass} backdrop-blur-sm border rounded-xl p-4 opacity-50`}>
        <div className="flex items-center gap-2 mb-3">
          <Icon className={`w-4 h-4 ${iconColor}`} />
          <span className="text-sm font-semibold text-white capitalize">{role}</span>
        </div>
        <p className="text-xs text-slate-500">No data</p>
      </div>
    )
  }

  return (
    <div className={`bg-gradient-to-br ${colorClass} backdrop-blur-sm border rounded-xl p-4 hover:scale-[1.02] transition-transform duration-200`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${iconColor}`} />
          <span className="text-sm font-semibold text-white capitalize">{role}</span>
        </div>
        <span className={`text-lg font-bold ${stats.kda >= 3 ? "text-emerald-400" : stats.kda >= 2 ? "text-amber-400" : "text-red-400"}`}>{stats.kda} KDA</span>
      </div>

      <span className="text-slate-500">Total:</span>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-3">
          <span className="text-emerald-400">{stats.kills}</span>
          <span className="text-slate-500">/</span>
          <span className="text-red-400">{stats.deaths}</span>
          <span className="text-slate-500">/</span>
          <span className="text-cyan-400">{stats.assists}</span>
        </div>

        <span className="text-amber-400 text-xs">{(stats.gold / 1000).toFixed(1)}k gold</span>
      </div>

      <span className="text-slate-500">Average:</span>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-3">
          <span className="text-emerald-400">{(stats.kills / stats.nb_games).toFixed(1)}</span>
          <span className="text-slate-500">/</span>
          <span className="text-red-400">{(stats.deaths / stats.nb_games).toFixed(1)}</span>
          <span className="text-slate-500">/</span>
          <span className="text-cyan-400">{(stats.assists / stats.nb_games).toFixed(1)}</span>
        </div>

        <span className="text-amber-400 text-xs">{(stats.gold / stats.nb_games / 1000).toFixed(1)}k gold</span>
      </div>
    </div>
  )
}

function TeamAverageCard({ stats }) {
  if (!stats) return null
  const roles = Object.keys(stats)
  if (roles.length === 0) return null

  const totals = roles.reduce(
    (acc, role) => {
      acc.kills += stats[role].kills || 0
      acc.deaths += stats[role].deaths || 0
      acc.assists += stats[role].assists || 0
      acc.nb_games += stats[role].nb_games || 0
      return acc
    },
    { kills: 0, deaths: 0, assists: 0, nb_games: 0 }
  )

  return (
    <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/5 backdrop-blur-sm border border-amber-500/30 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold text-white">Team Total</span>
        </div>
        <span className="text-lg font-bold text-amber-400">
          {totals.deaths > 0 ? ((totals.kills + totals.assists) / totals.deaths).toFixed(2) : (totals.kills + totals.assists).toFixed(2)} KDA
        </span>
      </div>
      <span className="text-slate-500">Total:</span>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-3">
          <span className="text-emerald-400">{totals.kills}</span>
          <span className="text-slate-500">/</span>
          <span className="text-red-400">{totals.deaths}</span>
          <span className="text-slate-500">/</span>
          <span className="text-cyan-400">{totals.assists}</span>
        </div>
      </div>

      <span className="text-slate-500">Average:</span>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-3">
          <span className="text-emerald-400">{(totals.kills / totals.nb_games).toFixed(1)}</span>
          <span className="text-slate-500">/</span>
          <span className="text-red-400">{(totals.deaths / totals.nb_games).toFixed(1)}</span>
          <span className="text-slate-500">/</span>
          <span className="text-cyan-400">{(totals.assists / totals.nb_games).toFixed(1)}</span>
        </div>
      </div>
    </div>
  )
}

function GameCard({ game }) {
  const [expanded, setExpanded] = useState(false)
  const [playerStats, setPlayerStats] = useState([])

  const fetchPlayerStats = async () => {
    try {
      const { ok, data, code } = await api.post("/playerstats/search", { game_id: game._id })
      if (!ok) return toast.error(code)
      setPlayerStats(data)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleToggle = () => {
    if (!expanded) fetchPlayerStats()
    setExpanded(!expanded)
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden transition-all duration-200 hover:border-slate-600/50">
      {/* Game Header */}
      <button onClick={handleToggle} className="w-full p-4 flex items-center justify-between hover:bg-slate-700/20 transition-colors">
        <div className="flex items-center gap-4">
          {/* Win/Loss Indicator */}
          <div className={`w-1.5 h-12 rounded-full ${game.win ? "bg-emerald-500" : "bg-red-500"}`} />

          <div className="text-left">
            <div className="flex items-center gap-3">
              <span className={`text-sm font-bold uppercase tracking-wider ${game.win ? "text-emerald-400" : "text-red-400"}`}>{game.win ? "Victory" : "Defeat"}</span>
              <span className="text-slate-500 text-sm">•</span>
              <span className="text-slate-400 text-sm flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {Math.floor(game.duration / 60)}m{game.duration % 60}
              </span>
            </div>
            <p className="text-slate-500 text-sm mt-0.5">{game.date}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Team Score Preview */}
          <div className="hidden sm:flex items-center gap-4 text-sm">
            <div className="text-center">
              <p className="text-white font-semibold">
                {game.blue_team?.total_kills || 0}/{game.blue_team?.total_deaths || 0}/{game.blue_team?.total_assists || 0}
              </p>
              <p className="text-xs text-slate-500">Blue</p>
            </div>
            <span className="text-slate-600">vs</span>
            <div className="text-center">
              <p className="text-white font-semibold">
                {game.red_team?.total_kills || 0}/{game.red_team?.total_deaths || 0}/{game.red_team?.total_assists || 0}
              </p>
              <p className="text-xs text-slate-500">Red</p>
            </div>
          </div>

          {expanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-slate-700/50 p-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Your Team */}
            <div>
              <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                Your Team
              </h4>
              <div className="space-y-2">
                {sortPlayersByRole(playerStats.filter(p => !p.opponent)).map((player, idx) => (
                  <PlayerRow key={idx} player={player} />
                ))}
              </div>
            </div>

            {/* Opponents */}
            <div>
              <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                Opponents
              </h4>
              <div className="space-y-2">
                {sortPlayersByRole(playerStats.filter(p => p.opponent)).map((player, idx) => (
                  <PlayerRow key={idx} player={player} isOpponent />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PlayerRow({ player, isOpponent = false }) {
  const role = player.role?.toLowerCase()
  const roleColor = roleIconColors[role] || "text-slate-400"
  const roleLabel = roleLabels[role] || player.role || "?"

  return (
    <div className={`flex items-center justify-between p-2.5 rounded-lg ${isOpponent ? "bg-red-500/5" : "bg-blue-500/5"}`}>
      <div className="flex items-center gap-3 min-w-0">
        {/* Champion & Player Info */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-white text-sm font-medium truncate">{player.champion}</p>
            <span className={`text-xs px-1.5 py-0.5 rounded ${roleColor} bg-slate-700/50`}>{roleLabel}</span>
          </div>
          <p className="text-slate-500 text-xs truncate">{player.summoner_name}</p>
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
          <p className="text-amber-400 text-sm">{(player.gold / 1000).toFixed(1)}k</p>
          <p className="text-slate-500 text-xs">{player.creep} CS</p>
        </div>
      </div>
    </div>
  )
}

function UploadModal({ isOpen, onClose, user, onSuccess }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef(null)

  const handleFile = selectedFile => {
    if (!selectedFile) return

    if (!selectedFile.type.startsWith("image/")) {
      toast.error("Please select an image file")
      return
    }

    setFile(selectedFile)

    // Create preview
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target.result)
    reader.readAsDataURL(selectedFile)
  }

  const handleDrag = e => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = e => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    try {
      const reader = new FileReader()
      reader.onload = async e => {
        const base64 = e.target.result
        const { ok, code, message } = await api.post("/game/upload-screenshot", { screenshot: base64, user })

        if (!ok) {
          toast.error(message || code || "Upload failed")
          setUploading(false)
          return
        }

        toast.success("Screenshot analyzed successfully!")
        setFile(null)
        setPreview(null)
        setUploading(false)
        onSuccess()
      }
      reader.readAsDataURL(file)
    } catch (error) {
      toast.error(error.message)
      setUploading(false)
    }
  }

  const handleClose = () => {
    if (uploading) return
    setFile(null)
    setPreview(null)
    onClose()
  }

  const removeFile = () => {
    setFile(null)
    setPreview(null)
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-lg w-full">
      <div className="p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-2">Upload Screenshot</h2>
        <p className="text-slate-500 text-sm mb-6">Upload your end-game scoreboard screenshot to automatically extract game data.</p>

        {!preview ? (
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
              dragActive ? "border-amber-500 bg-amber-50" : "border-slate-300 hover:border-amber-400 hover:bg-amber-50/50"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input ref={inputRef} type="file" accept="image/*" onChange={e => handleFile(e.target.files?.[0])} className="hidden" />
            <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 font-medium mb-1">Drop your screenshot here</p>
            <p className="text-slate-400 text-sm">or click to browse</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative rounded-xl overflow-hidden border border-slate-200">
              <img src={preview} alt="Preview" className="w-full h-auto max-h-64 object-contain bg-slate-100" />
              {!uploading && (
                <button onClick={removeFile} className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 truncate max-w-[200px]">{file?.name}</span>
              <span className="text-slate-400">{(file?.size / 1024 / 1024).toFixed(2)} MB</span>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={handleClose} disabled={uploading} className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:from-slate-300 disabled:to-slate-400 text-white font-semibold rounded-xl transition-all duration-200 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Upload & Analyze</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}
