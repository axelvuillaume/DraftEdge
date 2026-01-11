import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import api from "@/services/api"
import useStore from "@/services/store"
import { Trophy, Swords, Target, TrendingUp, Clock, Shield, Crosshair, Zap, Gamepad2 } from "lucide-react"

export default function FutureHome() {
  const [stats, setStats] = useState()
  const [gameStats, setGameStats] = useState()
  const [games, setGames] = useState([])
  const [bestChampions, setBestChampions] = useState([])
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

  const avgKDA =
    stats?.allies?.total && stats.allies.total.deaths > 0
      ? (stats.allies.total.kills + stats.allies.total.assists) / stats.allies.total.deaths
      : stats?.allies?.total?.kills + stats?.allies?.total?.assists || 0

  const winRateBySide = () => {
    const blueGames = games.filter(game => game.team_side === "blue")
    const redGames = games.filter(game => game.team_side === "red")

    const blueWins = blueGames.filter(game => game.win).length || 0
    const redWins = redGames.filter(game => game.win).length || 0

    return {
      blue: { winRate: (blueWins / blueGames.length) * 100, total: blueGames.length, wins: blueWins },
      red: { winRate: (redWins / redGames.length) * 100, total: redGames.length, wins: redWins }
    }
  }

  const sideStats = winRateBySide()

  return (
    <div className="min-h-[calc(100vh-65px)] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Games Played Card */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center">
                <Gamepad2 className="w-4 h-4 text-teal-400" />
              </div>
              <p className="text-xs text-slate-400">Games Jouées:</p>
            </div>
            <p className="text-2xl font-bold text-white">{gameStats?.total_games || 0}</p>
          </div>

          {/* Win Rate Card */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-green-400" />
              </div>
              <p className="text-xs text-slate-400">Win Rate:</p>
            </div>
            <p className="text-2xl font-bold text-white">{(gameStats?.win_rate * 100).toFixed(1)}%</p>
          </div>

          {/* Average Duration Card */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                <Clock className="w-4 h-4 text-orange-400" />
              </div>
              <p className="text-xs text-slate-400">Durée Moyenne:</p>
            </div>
            <p className="text-2xl font-bold text-white whitespace-nowrap">
              {Math.floor(Math.round(games.reduce((sum, game) => sum + (game.duration || 0), 0) / games.length) / 60)}:
              {Math.round(games.reduce((sum, game) => sum + game.duration, 0) % 60)}
            </p>
          </div>

          {/* Average KDA Card */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                <span className="text-[10px] font-bold text-purple-400">KDA</span>
              </div>
              <p className="text-xs text-slate-400">KDA Moyen:</p>
            </div>
            <p className="text-2xl font-bold text-white">{avgKDA.toFixed(2)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7">
            <PerformanceMindMap />
          </div>
          <div className="lg:col-span-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Elo Enemi Moyen Card */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex flex-col items-center">
                <h3 className="text-sm font-semibold text-white mb-2 self-start uppercase tracking-wider opacity-70">Elo Enemy Average</h3>
                <div className="flex-1 flex flex-col items-center justify-center">
                  <img
                    src={`/rank/${gameStats?.avg_enemy_rank?.tier?.toLowerCase()}.png`}
                    alt={gameStats?.avg_enemy_rank?.tier}
                    className="w-24 h-24 object-contain drop-shadow-[0_0_20px_rgba(59,130,246,0.3)] mb-1"
                  />
                  <div className="flex flex-col items-center">
                    <span className="text-3xl font-black text-white tracking-tight">
                      {gameStats?.avg_enemy_rank?.rank} {gameStats?.avg_enemy_rank?.lp || 0}
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">LP</span>
                  </div>
                </div>
              </div>

              {/* Stats: Win Selon le Side */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider opacity-70">Win Rate / Side</h3>

                <div className="flex items-end justify-center gap-4 h-32">
                  {/* Blue Side Bar */}
                  <div className="flex flex-col items-center gap-2 flex-1 max-w-[50px] h-full">
                    <div className="relative w-full h-full flex items-end justify-center">
                      <div
                        className="w-6 bg-blue-500/80 transition-all duration-500 rounded-t-lg shadow-[0_0_15px_rgba(59,130,246,0.2)] relative"
                        style={{ height: `${Math.min(sideStats.blue.winRate || 0, 100)}%` }}
                      >
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white whitespace-nowrap">
                          {Math.round(sideStats.blue.winRate || 0)}%
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-medium text-blue-400">Blue</span>
                  </div>

                  {/* Red Side Bar */}
                  <div className="flex flex-col items-center gap-2 flex-1 max-w-[50px] h-full">
                    <div className="relative w-full h-full flex items-end justify-center">
                      <div
                        className="w-6 bg-red-500/80 transition-all duration-500 rounded-t-lg shadow-[0_0_15px_rgba(239,68,68,0.2)] relative"
                        style={{ height: `${Math.min(sideStats.red.winRate || 0, 100)}%` }}
                      >
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white whitespace-nowrap">
                          {Math.round(sideStats.red.winRate || 0)}%
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-medium text-red-400">Red</span>
                  </div>
                </div>
              </div>
            </div>
            <WinRateByDuration games={games} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <BestChampions data={bestChampions} />
        </div>
      </div>
    </div>
  )
}

function PerformanceMindMap() {
  const nodes = [
    { id: 1, x: 20, y: 25, color: "#3b82f6", icon: Swords }, // Top Left
    { id: 2, x: 48, y: 18, color: "#f97316", icon: Target }, // Top Middle
    { id: 3, x: 78, y: 22, color: "#0ea5e9", icon: Gamepad2 }, // Top Right
    { id: 4, x: 82, y: 52, color: "#a855f7", icon: Zap }, // Right
    { id: 5, x: 72, y: 82, color: "#22c55e", icon: Shield }, // Bottom Right
    { id: 6, x: 38, y: 88, color: "#eab308", icon: TrendingUp }, // Bottom Middle
    { id: 7, x: 22, y: 72, color: "#ef4444", icon: Trophy } // Bottom Left
  ]

  const centerX = 50
  const centerY = 50

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-4 relative min-h-[400px] h-full flex items-center justify-center overflow-hidden">
      {/* Title */}
      <div className="absolute top-4 left-4 z-30">
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider opacity-70">Team performance</h3>
      </div>

      {/* Glow background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="absolute inset-0 pointer-events-none">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            {nodes.map(node => (
              <linearGradient key={`grad-${node.id}`} id={`grad-${node.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.4" />
                <stop offset="100%" stopColor={node.color} stopOpacity="0.6" />
              </linearGradient>
            ))}
          </defs>
          {nodes.map(node => {
            const dx = node.x - centerX
            const cp1X = centerX + dx * 0.4
            const cp1Y = centerY
            const cp2X = node.x - dx * 0.4
            const cp2Y = node.y

            return (
              <path
                key={node.id}
                d={`M ${centerX} ${centerY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${node.x} ${node.y}`}
                fill="none"
                stroke={`url(#grad-${node.id})`}
                strokeWidth="0.6"
                strokeLinecap="round"
                className="transition-all duration-1000 opacity-40"
              />
            )
          })}
        </svg>
      </div>

      {/* Central Node */}
      <div className="relative z-10 w-24 h-24 bg-slate-800/80 backdrop-blur-xl border border-slate-700/50 rounded-[2rem] flex items-center justify-center shadow-2xl">
        <div className="text-center">
          <span className="text-4xl font-black text-white tracking-tighter">65</span>
          <span className="text-xl font-bold text-slate-500">.6</span>
        </div>
      </div>

      {/* Surrounding Nodes */}
      {nodes.map(node => (
        <div
          key={node.id}
          className="absolute z-20 w-12 h-12 bg-slate-800/90 backdrop-blur-md border border-slate-700/50 rounded-2xl flex flex-col items-center justify-end overflow-hidden shadow-lg transition-all duration-300 hover:scale-110 group"
          style={{
            left: `${node.x}%`,
            top: `${node.y}%`,
            transform: "translate(-50%, -50%)"
          }}
        >
          {/* Liquid/Level fill effect */}
          <div
            className="absolute bottom-0 left-0 w-full transition-all duration-1000 opacity-20"
            style={{
              height: "60%",
              backgroundColor: node.color,
              boxShadow: `0 0 20px ${node.color}`
            }}
          />

          <div className="relative mb-2.5 z-10 transition-transform duration-300 group-hover:scale-110">
            <node.icon className="w-5 h-5" style={{ color: node.color, filter: `drop-shadow(0 0 8px ${node.color})` }} />
          </div>

          {/* Decorative radiating lines */}
          <div className="absolute inset-[-15px] pointer-events-none opacity-20">
            {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
              <div key={angle} className="absolute top-1/2 left-1/2 w-5 h-[1px] bg-slate-400 origin-left" style={{ transform: `rotate(${angle}deg) translate(28px)` }} />
            ))}
          </div>

          {/* Glow ring on hover */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="w-full h-full rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 ring-2 ring-inset" style={{ borderColor: node.color }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function WinRateByDuration({ games }) {
  const calculateStats = () => {
    // ... same logic
    const buckets = [
      { label: "-20", min: 0, max: 20 },
      { label: "20-25", min: 20, max: 25 },
      { label: "25-30", min: 25, max: 30 },
      { label: "30-35", min: 30, max: 35 },
      { label: "35+", min: 35, max: Infinity }
    ]

    const stats = buckets.map(b => ({ ...b, wins: 0, losses: 0 }))

    games.forEach(game => {
      const durationMin = game.duration / 60
      const bucket = stats.find(b => durationMin >= b.min && durationMin < b.max)
      if (bucket) {
        game.win ? bucket.wins++ : bucket.losses++
      }
    })

    return stats.map(s => ({
      ...s,
      total: s.wins + s.losses,
      winRate: s.wins + s.losses > 0 ? Math.round((s.wins / (s.wins + s.losses)) * 100) : 0
    }))
  }

  const stats = calculateStats()

  return (
    <div className="bg-gradient-to-br from-slate-800/80 to-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider opacity-70">Win Rate / Duration</h3>
      </div>

      <div className="relative h-40 w-full mt-2">
        {/* Y-axis labels & Grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6">
          {[60, 40, 20, 0].map(val => (
            <div key={val} className="flex items-center gap-2 w-full">
              <span className="text-[10px] text-slate-500 w-6 text-right">{val}%</span>
              <div className="flex-1 border-t border-slate-700/30 border-dashed" />
            </div>
          ))}
        </div>

        {/* Chart Area */}
        <div className="absolute inset-0 ml-8 pb-6 flex items-end justify-between px-2">
          {stats.map((stat, i) => {
            const height = Math.min((stat.winRate / 60) * 100, 100)
            return (
              <div key={i} className="relative flex flex-col items-center flex-1 h-full justify-end">
                {/* Bar */}
                <div
                  className="w-8 bg-gradient-to-t from-blue-600/20 via-blue-500/40 to-indigo-400/60 rounded-t-sm transition-all duration-700 relative group"
                  style={{ height: `${height}%` }}
                >
                  {/* Tooltip on hover */}
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold text-white opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100 whitespace-nowrap z-20 shadow-xl">
                    <span className="text-emerald-400">{stat.winRate}%</span>
                    <span className="mx-2 text-slate-500">|</span>
                    <span className="text-slate-300 text-[10px]">
                      {stat.wins}W - {stat.losses}L
                    </span>
                  </div>
                </div>
                {/* X-axis Label */}
                <span className="absolute -bottom-5 text-[10px] font-medium text-slate-500">{stat.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function BestChampions({ data }) {
  const renderList = (list, title, colorClass, iconColor) => (
    <div className="flex-1 space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <Trophy className={`w-3 h-3 ${iconColor}`} />
        <h4 className="text-[10px] font-semibold text-white uppercase tracking-wider opacity-70">{title}</h4>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {list?.length > 0 &&
          list.slice(0, 3).map((item, index) => (
            <div key={index} className="flex items-center gap-2 p-1.5 bg-slate-700/30 rounded-lg border border-slate-700/50 hover:bg-slate-700/50 transition-colors">
              <div className="w-8 h-8 rounded-md overflow-hidden bg-slate-800 shrink-0">
                <img src={`/champions/${item.champion}.png`} alt={item.champion} className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0">
                <p className={`text-[11px] font-bold ${colorClass}`}>{Math.round(item.win_rate * 100)}%</p>
                <p className="text-[9px] text-slate-500 uppercase leading-tight">{item.games}G</p>
              </div>
            </div>
          ))}
      </div>
    </div>
  )

  return (
    <div className="bg-gradient-to-br from-slate-800/80 to-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
      <div className="flex flex-col md:flex-row gap-8">
        {renderList(data?.allies, "Best Team Champions", "text-emerald-400", "text-emerald-400")}
        {renderList(data?.enemies, "Best Enemy Champions", "text-red-400", "text-red-400")}
      </div>
    </div>
  )
}
