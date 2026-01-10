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
  const [bestChampions, setBestChampions] = useState([])
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

  const fetchCardAverage = async () => {
    try {
      const { ok, data, code } = await api.post("/playerstats/card_average", {})
      if (!ok) return toast.error(code)
      setStats(data)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const fetchBestChampions = async () => {
    try {
      const { ok, data, code } = await api.post("/playerstats/best_wr", {})
      if (!ok) return toast.error(code)
      setBestChampions(data)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const fetchGames = async () => {
    try {
      const { ok, data, code } = await api.post("/game/search", { limit: 50, team_id: user?.team_id })
      if (!ok) return toast.error(code)
      setGames(data)
    } catch (error) {
      toast.error(error.message)
    }
  }
  const fetchAll = async () => {
    await Promise.all([fetchCardAverage(), fetchGameStats(), fetchGames(), fetchBestChampions()])
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
              <RoleCard key={role} role={role} stats={stats} />
            ))}
            <AverageCard stats={stats} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WinRateByDuration games={games} />
          <BestChampions data={bestChampions} />
        </div>
      </div>
    </div>
  )
}

const roleIcons = {
  top: Shield,
  jungle: Zap,
  mid: Crosshair,
  bottom: Target,
  support: Trophy
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
      </div>

      <span className="text-slate-500">Average Enemy:</span>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-3">
          <span className="text-emerald-400">{(stats.enemies?.total?.kills ?? 0).toFixed(1)}</span>
          <span className="text-slate-500">/</span>
          <span className="text-red-400">{(stats.enemies?.total?.deaths ?? 0).toFixed(1)}</span>
          <span className="text-slate-500">/</span>
          <span className="text-cyan-400">{(stats.enemies?.total?.assists ?? 0).toFixed(1)}</span>
        </div>
        <span className="text-amber-400 text-xs">{(stats.enemies?.total?.gold / stats.enemies?.total?.nb_games / 1000).toFixed(1)}k gold</span>
      </div>

      <span className="text-slate-500">Average:</span>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-3">
          <span className="text-emerald-400">{(stats.allies?.total?.kills / stats.allies?.total?.nb_games).toFixed(1)}</span>
          <span className="text-slate-500">/</span>
          <span className="text-red-400">{(stats.allies?.total?.deaths / stats.allies?.total?.nb_games).toFixed(1)}</span>
          <span className="text-slate-500">/</span>
          <span className="text-cyan-400">{(stats.allies?.total?.assists / stats.allies?.total?.nb_games).toFixed(1)}</span>
        </div>

        <span className="text-amber-400 text-xs">{(stats.allies?.total?.gold / stats.allies?.total?.nb_games / 1000).toFixed(1)}k gold</span>
      </div>
    </div>
  )
}

function AverageCard({ stats }) {
  if (!stats) {
    return (
      <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/5 backdrop-blur-sm border border-amber-500/30 rounded-xl p-4 opacity-50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-semibold text-white">Team Total</span>
          </div>
        </div>
        <p className="text-xs text-slate-500">No data</p>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/5 backdrop-blur-sm border border-amber-500/30 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold text-white">Team Total</span>
        </div>
      </div>

      <span className="text-slate-500">Average Enemy:</span>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-3">
          <span className="text-emerald-400">{(stats.enemies?.total?.kills ?? 0).toFixed(1)}</span>
          <span className="text-slate-500">/</span>
          <span className="text-red-400">{(stats.enemies?.total?.deaths ?? 0).toFixed(1)}</span>
          <span className="text-slate-500">/</span>
          <span className="text-cyan-400">{(stats.enemies?.total?.assists ?? 0).toFixed(1)}</span>
        </div>
      </div>

      <span className="text-slate-500">Average:</span>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-3">
          <span className="text-emerald-400">{((stats.allies?.total?.kills ?? 0) / stats.allies?.total?.nb_games || 1).toFixed(1)}</span>
          <span className="text-slate-500">/</span>
          <span className="text-red-400">{((stats.allies?.total?.deaths ?? 0) / stats.allies?.total?.nb_games || 1).toFixed(1)}</span>
          <span className="text-slate-500">/</span>
          <span className="text-cyan-400">{((stats.allies?.total?.assists ?? 0) / stats.allies?.total?.nb_games || 1).toFixed(1)}</span>
        </div>
      </div>
    </div>
  )
}

function WinRateByDuration({ games }) {
  const calculateStats = () => {
    const stats = { "0-15": { wins: 0, losses: 0 }, "15-30": { wins: 0, losses: 0 }, "30+": { wins: 0, losses: 0 } }
    games.forEach(game => {
      let key = "30+"
      if (game.duration / 60 < 15) key = "0-15"
      if (game.duration / 60 < 30) key = "15-30"
      game.win ? stats[key].wins++ : stats[key].losses++
    })

    return [
      {
        label: "0-15 min",
        wins: stats["0-15"].wins,
        losses: stats["0-15"].losses,
        total: stats["0-15"].wins + stats["0-15"].losses,
        winRate: stats["0-15"].wins + stats["0-15"].losses > 0 ? Math.round((stats["0-15"].wins / (stats["0-15"].wins + stats["0-15"].losses)) * 100) : 0
      },
      {
        label: "15-30 min",
        wins: stats["15-30"].wins,
        losses: stats["15-30"].losses,
        total: stats["15-30"].wins + stats["15-30"].losses,
        winRate: stats["15-30"].wins + stats["15-30"].losses > 0 ? Math.round((stats["15-30"].wins / (stats["15-30"].wins + stats["15-30"].losses)) * 100) : 0
      },
      {
        label: "30+ min",
        wins: stats["30+"].wins,
        losses: stats["30+"].losses,
        total: stats["30+"].wins + stats["30+"].losses,
        winRate: stats["30+"].wins + stats["30+"].losses > 0 ? Math.round((stats["30+"].wins / (stats["30+"].wins + stats["30+"].losses)) * 100) : 0
      }
    ]
  }

  const stats = calculateStats()

  const getBarColor = winRate => {
    if (winRate >= 60) return "bg-emerald-500"
    if (winRate >= 50) return "bg-sky-500"
    if (winRate >= 40) return "bg-amber-500"
    return "bg-red-500"
  }

  return (
    <div className="bg-gradient-to-br from-slate-800/80 to-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
        <Clock className="w-5 h-5 text-slate-400" />
        Win Rate par Durée
      </h3>

      <div className="relative">
        {/* Ligne pointillée verticale à 50% */}
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center" style={{ pointerEvents: "none" }}>
          <div className="h-full border-l-2 border-dashed border-slate-400/70" />
        </div>

        <div className="space-y-4">
          {stats.map((stat, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300 font-medium">{stat.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-xs">
                    ({stat.wins}W - {stat.losses}L)
                  </span>
                  <span className={`font-bold ${stat.winRate >= 50 ? "text-emerald-400" : "text-red-400"}`}>{stat.winRate}%</span>
                </div>
              </div>
              <div className="relative h-3 bg-slate-700/50 rounded-full overflow-hidden">
                <div className={`h-full ${getBarColor(stat.winRate)} transition-all duration-500 rounded-full`} style={{ width: `${stat.winRate}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Label 50% en bas */}
        <div className="flex justify-center mt-2">
          <span className="text-xs text-slate-500 bg-slate-800/80 px-1.5 rounded">50%</span>
        </div>
      </div>
    </div>
  )
}

function BestChampions({ data }) {
  const renderList = (list, title, colorClass, iconColor) => (
    <div className="flex-1 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className={`w-4 h-4 ${iconColor}`} />
        <h4 className="text-sm font-semibold text-white uppercase tracking-wider">{title}</h4>
      </div>
      <div className="space-y-2">
        {list?.length > 0 &&
          list.map((item, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-xl border border-slate-700/50 hover:bg-slate-700/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-800">
                  <img src={`/champions/${item.champion}.png`} alt={item.champion} className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{item.champion}</p>
                  <p className="text-xs text-slate-500">{item.games} games</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${colorClass}`}>{Math.round(item.win_rate * 100)}%</p>
                <p className="text-[10px] text-slate-500 uppercase">Win Rate</p>
              </div>
            </div>
          ))}
      </div>
    </div>
  )

  return (
    <div className="bg-gradient-to-br from-slate-800/80 to-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
        <Swords className="w-5 h-5 text-slate-400" />
        Top Win Rate Champions
      </h3>

      <div className="flex flex-col md:flex-row gap-8">
        {renderList(data?.allies, "Allies", "text-emerald-400", "text-emerald-400")}
        {renderList(data?.enemies, "Enemies", "text-red-400", "text-red-400")}
      </div>
    </div>
  )
}

function UploadModal({ isOpen, onClose, user, onSuccess }) {
  const [files, setFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({})
  const [dragActive, setDragActive] = useState(false)
  const [uploadType, setUploadType] = useState("scoreboard")
  const inputRef = useRef(null)

  const handleFiles = selectedFiles => {
    if (!selectedFiles || selectedFiles.length === 0) return

    const imageFiles = Array.from(selectedFiles).filter(file => {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image file`)
        return false
      }
      return true
    })

    if (imageFiles.length === 0) return

    const newFiles = [...files, ...imageFiles]
    setFiles(newFiles)

    imageFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = e => {
        setPreviews(prev => [...prev, { file, preview: e.target.result }])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeFile = index => {
    setFiles(prev => prev.filter((_, i) => i !== index))
    setPreviews(prev => prev.filter((_, i) => i !== index))
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
    if (files.length === 0) return

    setUploading(true)
    setUploadProgress({})

    const initialProgress = {}
    files.forEach((_, i) => (initialProgress[i] = "uploading"))
    setUploadProgress(initialProgress)

    try {
      const uploadPromises = files.map(async (file, index) => {
        try {
          const reader = new FileReader()
          const base64 = await new Promise((resolve, reject) => {
            reader.onload = e => resolve(e.target.result)
            reader.onerror = reject
            reader.readAsDataURL(file)
          })

          const { ok, code } = await api.post(uploadType === "scoreboard" ? "/game/upload-scoreboard" : "/game/upload-advanced-stats", { screenshot: base64, user })

          if (!ok) return toast.error(`Failed to upload ${file.name}: ${code}`)
          setUploadProgress(prev => ({ ...prev, [index]: "success" }))
        } catch (error) {
          return toast.error(`Error uploading ${file.name}: ${error.message}`)
        }
      })

      await Promise.all(uploadPromises)

      setUploading(false)
    } catch (error) {
      toast.error(error.message)
      setUploading(false)
    }
  }

  const handleClose = () => {
    if (uploading) return
    setFiles([])
    setPreviews([])
    setUploadProgress({})
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <div className="p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-2">Upload Screenshots</h2>
        <p className="text-slate-500 text-sm mb-6">Upload your end-game scoreboard screenshots to automatically extract game data. You can upload multiple screenshots at once.</p>

        <div className="flex gap-2 mb-6 bg-slate-100 p-1 rounded-xl">
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              uploadType === "scoreboard" ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"
            }`}
            onClick={() => setUploadType("scoreboard")}
          >
            Scoreboard
          </button>
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              uploadType === "advanced" ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"
            }`}
            onClick={() => setUploadType("advanced")}
          >
            Advanced Stats
          </button>
        </div>

        {previews.length === 0 ? (
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
            <input ref={inputRef} type="file" accept="image/*" multiple onChange={e => handleFiles(e.target.files)} className="hidden" />
            <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 font-medium mb-1">Drop your screenshots here</p>
            <p className="text-slate-400 text-sm">or click to browse (multiple files supported)</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {previews.map((item, index) => {
                const progress = uploadProgress[index]
                const isUploading = progress === "uploading"

                return (
                  <div key={index} className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                    <img src={item.preview} alt={`Preview ${index + 1}`} className="w-full h-auto max-h-48 object-contain bg-slate-100" />
                    {!uploading && (
                      <button onClick={() => removeFile(index)} className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors z-10">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    {isUploading && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      </div>
                    )}
                    <div className="p-3 bg-white border-t border-slate-200">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600 truncate max-w-[150px]" title={item.file.name}>
                          {item.file.name}
                        </span>
                        <span className="text-slate-400">{(item.file.size / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {!uploading && (
              <div
                className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors cursor-pointer ${
                  dragActive ? "border-amber-500 bg-amber-50" : "border-slate-300 hover:border-amber-400 hover:bg-amber-50/50"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
              >
                <input ref={inputRef} type="file" accept="image/*" multiple onChange={e => handleFiles(e.target.files)} className="hidden" />
                <p className="text-slate-500 text-sm">Click or drag to add more screenshots</p>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between items-center mt-6">
          {previews.length > 0 && (
            <span className="text-slate-500 text-sm">
              {previews.length} screenshot{previews.length > 1 ? "s" : ""} selected
            </span>
          )}
          <div className="flex justify-end gap-3 ml-auto">
            <button
              onClick={handleUpload}
              disabled={files.length === 0 || uploading}
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
                  <span>Upload & Analyze {files.length > 0 && `(${files.length})`}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
