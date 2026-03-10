import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import api from "@/services/api"
import useStore from "@/services/store"
import { Clock, Gamepad2, Trophy, Shield, Swords, TrendingUp } from "lucide-react"

export default function Overview() {
  const [stats, setStats] = useState()
  const [gameStats, setGameStats] = useState()
  const [games, setGames] = useState([])
  const { user, globalFilters } = useStore()

  const fetchAll = async () => {
    await Promise.all([
      api.post("/playerstats/card_average", { ...globalFilters }).then(({ ok, data, code }) => {
        if (!ok) return toast.error(code)
        setStats(data)
      }),
      api.post("/game/header-stats", { ...globalFilters }).then(({ ok, data, code }) => {
        if (!ok) return toast.error(code)
        setGameStats(data)
      }),
      api.post("/game/search", { ...globalFilters, limit: 50, team_id: user?.team_id }).then(({ ok, data, code }) => {
        if (!ok) return toast.error(code)
        setGames(data)
      })
    ]).catch(err => toast.error(err.message))
  }

  useEffect(() => {
    fetchAll()
  }, [globalFilters.patch, globalFilters.folder_id, globalFilters.opponent_name])

  const avgKDA =
    stats?.allies?.total && stats.allies.total.deaths > 0
      ? (stats.allies.total.kills + stats.allies.total.assists) / stats.allies.total.deaths
      : stats?.allies?.total?.kills + stats?.allies?.total?.assists || 0

  const sideStats = (() => {
    const blueGames = games.filter(g => g.team_side === "blue")
    const redGames = games.filter(g => g.team_side === "red")
    const blueWins = blueGames.filter(g => g.win).length
    const redWins = redGames.filter(g => g.win).length
    return {
      blue: { winRate: blueGames.length ? (blueWins / blueGames.length) * 100 : 0, total: blueGames.length, wins: blueWins },
      red: { winRate: redGames.length ? (redWins / redGames.length) * 100 : 0, total: redGames.length, wins: redWins }
    }
  })()

  const avgDuration = games.length ? games.reduce((sum, g) => sum + (g.duration || 0), 0) / games.length : 0
  const durationMin = Math.floor(Math.round(avgDuration) / 60)
  const durationSec = Math.round(avgDuration) % 60

  const winRate = gameStats?.win_rate != null ? (gameStats.win_rate * 100).toFixed(1) : "0.0"
  const totalGames = gameStats?.total_games || 0
  const wins = games.filter(g => g.win).length
  const losses = totalGames - wins

  return (
    <div className="h-[calc(100vh-200px)] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-5 overflow-y-auto">
      <div className="max-w-[1800px] w-full mx-auto flex flex-col gap-5 h-full">
        {/* Main hero row: WR ring + stat pills */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-8">
          {/* Win rate ring */}
          <div className="relative w-32 h-32 flex-shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgb(51 65 85 / 0.4)" strokeWidth="7" />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="rgb(16 185 129)"
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={`${(parseFloat(winRate) / 100) * 264} 264`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-white leading-none">{winRate}%</span>
              <span className="text-[9px] text-slate-500 font-semibold uppercase tracking-widest mt-1">Win Rate</span>
            </div>
          </div>

          {/* Stat pills */}
          <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
            <MiniStat icon={<Gamepad2 className="w-4 h-4" />} iconColor="text-teal-400" bgColor="bg-teal-500/10" label="Games" value={totalGames} />
            <MiniStat icon={<Trophy className="w-4 h-4" />} iconColor="text-emerald-400" bgColor="bg-emerald-500/10" label="Record" value={`${wins}W - ${losses}L`} />
            <MiniStat
              icon={<Clock className="w-4 h-4" />}
              iconColor="text-orange-400"
              bgColor="bg-orange-500/10"
              label="Avg Duration"
              value={`${durationMin}:${String(durationSec).padStart(2, "0")}`}
            />
            <MiniStat icon={<Swords className="w-4 h-4" />} iconColor="text-purple-400" bgColor="bg-purple-500/10" label="Avg KDA" value={avgKDA.toFixed(2)} />
          </div>
        </div>

        {/* Bottom row: 3 panels that fill remaining space */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 flex-1 min-h-0">
          {/* Elo Enemy Average */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 flex flex-col">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-auto">Elo Enemy Average</h3>
            <div className="flex flex-col items-center justify-center flex-1 py-4">
              <img
                src={`/rank/${gameStats?.avg_enemy_rank?.tier?.toLowerCase()}.png`}
                alt={gameStats?.avg_enemy_rank?.tier}
                className="w-28 h-28 object-contain drop-shadow-[0_0_30px_rgba(139,92,246,0.25)] mb-2"
              />
              <span className="text-4xl font-black text-white tracking-tight leading-none">
                {gameStats?.avg_enemy_rank?.rank} {gameStats?.avg_enemy_rank?.lp || 0}
              </span>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">LP</span>
            </div>
          </div>

          {/* Win Rate by Side */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 flex flex-col">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Win Rate / Side</h3>
            <div className="flex-1 flex items-end justify-center gap-12 pb-2">
              <SideColumn label="Blue" color="blue" stats={sideStats.blue} />
              <SideColumn label="Red" color="red" stats={sideStats.red} />
            </div>
          </div>

          {/* Win Rate by Duration */}
          <DurationChart games={games} />
        </div>
      </div>
    </div>
  )
}

function MiniStat({ icon, iconColor, bgColor, label, value }) {
  return (
    <div className="flex items-center gap-3 bg-slate-900/40 border border-slate-700/30 rounded-xl px-4 py-3">
      <div className={`w-9 h-9 rounded-lg ${bgColor} flex items-center justify-center flex-shrink-0 ${iconColor}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">{label}</p>
        <p className="text-lg font-bold text-white leading-tight truncate">{value}</p>
      </div>
    </div>
  )
}

function SideColumn({ label, color, stats }) {
  const isBlue = color === "blue"
  const barBg = isBlue ? "bg-gradient-to-t from-blue-600/60 to-blue-400/80" : "bg-gradient-to-t from-red-600/60 to-red-400/80"
  const shadow = isBlue ? "shadow-[0_0_20px_rgba(59,130,246,0.15)]" : "shadow-[0_0_20px_rgba(239,68,68,0.15)]"
  const textColor = isBlue ? "text-blue-400" : "text-red-400"
  const wr = Math.round(stats.winRate || 0)

  return (
    <div className="flex flex-col items-center gap-2 w-16 h-full">
      <div className="relative w-full flex-1 flex items-end justify-center min-h-[80px]">
        <div className={`w-10 ${barBg} rounded-t-lg ${shadow} relative transition-all duration-700`} style={{ height: `${Math.max(wr, 4)}%` }}>
          <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-sm font-black text-white whitespace-nowrap">{wr}%</span>
        </div>
      </div>
      <div className="flex flex-col items-center">
        <span className={`text-xs font-semibold ${textColor}`}>{label}</span>
        <span className="text-[10px] text-slate-500">
          {stats.wins}W - {stats.total - stats.wins}L
        </span>
      </div>
    </div>
  )
}

function DurationChart({ games }) {
  const buckets = [
    { label: "<20", min: 0, max: 20 },
    { label: "20-25", min: 20, max: 25 },
    { label: "25-30", min: 25, max: 30 },
    { label: "30-35", min: 30, max: 35 },
    { label: "35+", min: 35, max: Infinity }
  ]

  const stats = buckets.map(b => {
    const bucket = { ...b, wins: 0, losses: 0 }
    games.forEach(game => {
      const durationMin = game.duration / 60
      if (durationMin >= b.min && durationMin < b.max) {
        game.win ? bucket.wins++ : bucket.losses++
      }
    })
    const total = bucket.wins + bucket.losses
    return { ...bucket, total, winRate: total > 0 ? Math.round((bucket.wins / total) * 100) : 0 }
  })

  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 flex flex-col">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Win Rate / Duration</h3>
      <div className="relative flex-1 min-h-[10rem] w-full">
        {/* Y-axis */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8">
          {[100, 75, 50, 25, 0].map(val => (
            <div key={val} className="flex items-center gap-2 w-full">
              <span className={`text-[10px] w-7 text-right ${val === 50 ? "text-slate-400 font-semibold" : "text-slate-600"}`}>{val}%</span>
              <div className={`flex-1 border-t border-dashed ${val === 50 ? "border-slate-500/50" : "border-slate-700/30"}`} />
            </div>
          ))}
        </div>
        {/* Bars */}
        <div className="absolute inset-0 ml-9 pb-8 flex items-end justify-between px-1">
          {stats.map((stat, i) => (
            <div key={i} className="relative flex flex-col items-center flex-1 h-full justify-end">
              <div
                className="w-9 bg-gradient-to-t from-blue-600/20 via-blue-500/50 to-indigo-400/70 rounded-t transition-all duration-700 relative group"
                style={{ height: `${Math.max(stat.winRate, 2)}%` }}
              >
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold text-white opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100 whitespace-nowrap z-20 shadow-xl pointer-events-none">
                  <span className="text-emerald-400">{stat.winRate}%</span>
                  <span className="mx-1.5 text-slate-600">|</span>
                  <span className="text-slate-300 text-[10px]">
                    {stat.wins}W - {stat.losses}L
                  </span>
                </div>
              </div>
              <span className="absolute -bottom-6 text-[10px] font-medium text-slate-500">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
