import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import api from "@/services/api"
import useStore from "@/services/store"
import { Clock, Gamepad2, Trophy, Swords } from "lucide-react"

export default function Overview() {
  return (
    <div className="h-[calc(100vh-200px)] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-5 overflow-y-auto">
      <div className="max-w-[1800px] w-full mx-auto flex flex-col gap-5 h-full">
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-8">
          <WinRateRing />
          <StatsPills />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 flex-1 min-h-0">
          <EloPanel />
          <SideWinRatePanel />
          <DurationChart />
        </div>
      </div>
    </div>
  )
}

function WinRateRing() {
  const [stats, setStats] = useState(null)
  const { globalFilters } = useStore()

  const fetchStats = async () => {
    try {
      const { ok, data, code } = await api.post("/game/header-stats", { ...globalFilters })
      if (!ok) return toast.error(code)
      setStats(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch stats")
    }
  }

  useEffect(() => {
    fetchStats()
  }, [globalFilters.patch, globalFilters.folder_id, globalFilters.opponent_name])

  return (
    <div className="relative w-32 h-32 flex-shrink-0">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="42" fill="none" stroke="rgb(51 65 85 / 0.4)" strokeWidth="7" />
        <circle cx="50" cy="50" r="42" fill="none" stroke="rgb(16 185 129)" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${(stats?.win_rate || 0) * 264} 264`} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black text-white leading-none">{stats?.win_rate != null ? (stats.win_rate * 100).toFixed(1) : "0.0"}%</span>
        <span className="text-[9px] text-slate-500 font-semibold uppercase tracking-widest mt-1">Win Rate</span>
      </div>
    </div>
  )
}

function StatsPills() {
  const [headerStats, setHeaderStats] = useState(null)
  const [games, setGames] = useState([])
  const [kdaStats, setKdaStats] = useState(null)
  const { user, globalFilters } = useStore()

  const fetchHeaderStats = async () => {
    try {
      const { ok, data, code } = await api.post("/game/header-stats", { ...globalFilters })
      if (!ok) return toast.error(code)
      setHeaderStats(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch stats")
    }
  }

  const fetchGames = async () => {
    try {
      const { ok, data, code } = await api.post("/game/search", { ...globalFilters, limit: 50, team_id: user?.team_id })
      if (!ok) return toast.error(code)
      setGames(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch games")
    }
  }

  const fetchKdaStats = async () => {
    try {
      const { ok, data, code } = await api.post("/playerstats/card_average", { ...globalFilters })
      if (!ok) return toast.error(code)
      setKdaStats(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch stats")
    }
  }

  useEffect(() => {
    fetchHeaderStats()
    fetchGames()
    fetchKdaStats()
  }, [globalFilters.patch, globalFilters.folder_id, globalFilters.opponent_name])

  const avgDurationSec = games.length ? Math.round(games.reduce((s, g) => s + (g.duration || 0), 0) / games.length) : 0

  return (
    <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      <div className="flex items-center gap-3 bg-slate-900/40 border border-slate-700/30 rounded-xl px-4 py-3">
        <div className="w-9 h-9 rounded-lg bg-teal-500/10 flex items-center justify-center flex-shrink-0 text-teal-400">
          <Gamepad2 className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Games</p>
          <p className="text-lg font-bold text-white leading-tight truncate">{headerStats?.total_games || 0}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 bg-slate-900/40 border border-slate-700/30 rounded-xl px-4 py-3">
        <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0 text-emerald-400">
          <Trophy className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Record</p>
          <p className="text-lg font-bold text-white leading-tight truncate">
            {games.filter(g => g.win).length}W - {games.filter(g => !g.win).length}L
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 bg-slate-900/40 border border-slate-700/30 rounded-xl px-4 py-3">
        <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0 text-orange-400">
          <Clock className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Avg Duration</p>
          <p className="text-lg font-bold text-white leading-tight truncate">
            {Math.floor(avgDurationSec / 60)}:{String(avgDurationSec % 60).padStart(2, "0")}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 bg-slate-900/40 border border-slate-700/30 rounded-xl px-4 py-3">
        <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0 text-purple-400">
          <Swords className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Avg KDA</p>
          <p className="text-lg font-bold text-white leading-tight truncate">
            {(kdaStats?.allies?.total && kdaStats.allies.total.deaths > 0
              ? (kdaStats.allies.total.kills + kdaStats.allies.total.assists) / kdaStats.allies.total.deaths
              : kdaStats?.allies?.total?.kills + kdaStats?.allies?.total?.assists || 0
            ).toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  )
}

function EloPanel() {
  const [stats, setStats] = useState(null)
  const { globalFilters } = useStore()

  const fetchStats = async () => {
    try {
      const { ok, data, code } = await api.post("/game/header-stats", { ...globalFilters })
      if (!ok) return toast.error(code)
      setStats(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch stats")
    }
  }

  useEffect(() => {
    fetchStats()
  }, [globalFilters.patch, globalFilters.folder_id, globalFilters.opponent_name])

  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 flex flex-col">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-auto">Elo Enemy Average</h3>
      <div className="flex flex-col items-center justify-center flex-1 py-4">
        <img
          src={`/rank/${stats?.avg_enemy_rank?.tier?.toLowerCase()}.png`}
          alt={stats?.avg_enemy_rank?.tier}
          className="w-28 h-28 object-contain drop-shadow-[0_0_30px_rgba(139,92,246,0.25)] mb-2"
        />
        <span className="text-4xl font-black text-white tracking-tight leading-none">
          {stats?.avg_enemy_rank?.rank} {stats?.avg_enemy_rank?.lp || 0}
        </span>
        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">LP</span>
      </div>
    </div>
  )
}

function SideWinRatePanel() {
  const [games, setGames] = useState([])
  const { user, globalFilters } = useStore()

  const fetchGames = async () => {
    try {
      const { ok, data, code } = await api.post("/game/search", { ...globalFilters, limit: 50, team_id: user?.team_id })
      if (!ok) return toast.error(code)
      setGames(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch games")
    }
  }

  useEffect(() => {
    fetchGames()
  }, [globalFilters.patch, globalFilters.folder_id, globalFilters.opponent_name])

  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 flex flex-col">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Win Rate / Side</h3>
      <div className="flex-1 flex items-end justify-center gap-12 pb-2">
        {[
          { label: "Blue", color: "blue", side: "blue" },
          { label: "Red", color: "red", side: "red" }
        ].map((s, i) => (
          <div key={i} className="flex flex-col items-center gap-2 w-16 h-full">
            <div className="relative w-full flex-1 flex items-end justify-center min-h-[80px]">
              <div
                className={`w-10 ${
                  s.color === "blue"
                    ? "bg-gradient-to-t from-blue-600/60 to-blue-400/80 shadow-[0_0_20px_rgba(59,130,246,0.15)]"
                    : "bg-gradient-to-t from-red-600/60 to-red-400/80 shadow-[0_0_20px_rgba(239,68,68,0.15)]"
                } rounded-t-lg relative transition-all duration-700`}
                style={{
                  height: `${Math.max(
                    games.filter(g => g.team_side === s.side).length
                      ? Math.round((games.filter(g => g.team_side === s.side && g.win).length / games.filter(g => g.team_side === s.side).length) * 100)
                      : 0,
                    4
                  )}%`
                }}
              >
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-sm font-black text-white whitespace-nowrap">
                  {games.filter(g => g.team_side === s.side).length
                    ? Math.round((games.filter(g => g.team_side === s.side && g.win).length / games.filter(g => g.team_side === s.side).length) * 100)
                    : 0}
                  %
                </span>
              </div>
            </div>
            <div className="flex flex-col items-center">
              <span className={`text-xs font-semibold ${s.color === "blue" ? "text-blue-400" : "text-red-400"}`}>{s.label}</span>
              <span className="text-[10px] text-slate-500">
                {games.filter(g => g.team_side === s.side && g.win).length}W - {games.filter(g => g.team_side === s.side && !g.win).length}L
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DurationChart() {
  const [games, setGames] = useState([])
  const { user, globalFilters } = useStore()

  const fetchGames = async () => {
    try {
      const { ok, data, code } = await api.post("/game/search", { ...globalFilters, limit: 300, team_id: user?.team_id })
      if (!ok) return toast.error(code)
      setGames(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch games")
    }
  }

  useEffect(() => {
    fetchGames()
  }, [globalFilters.patch, globalFilters.folder_id, globalFilters.opponent_name])

  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 flex flex-col">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Win Rate / Duration</h3>
      <div className="relative flex-1 min-h-[10rem] w-full">
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8">
          {[100, 75, 50, 25, 0].map(val => (
            <div key={val} className="flex items-center gap-2 w-full">
              <span className={`text-[10px] w-7 text-right ${val === 50 ? "text-slate-400 font-semibold" : "text-slate-600"}`}>{val}%</span>
              <div className={`flex-1 border-t border-dashed ${val === 50 ? "border-slate-500/50" : "border-slate-700/30"}`} />
            </div>
          ))}
        </div>
        <div className="absolute inset-0 ml-9 pb-8 flex items-end justify-between px-1">
          {[
            { label: "<20", min: 0, max: 20 },
            { label: "20-25", min: 20, max: 25 },
            { label: "25-30", min: 25, max: 30 },
            { label: "30-35", min: 30, max: 35 },
            { label: "35+", min: 35, max: Infinity }
          ].map((b, i) => {
            let wins = 0,
              losses = 0
            games.forEach(g => {
              if (g.duration / 60 >= b.min && g.duration / 60 < b.max) g.win ? wins++ : losses++
            })
            return (
              <div key={i} className="relative flex flex-col items-center flex-1 h-full justify-end">
                <div
                  className="w-9 bg-gradient-to-t from-blue-600/20 via-blue-500/50 to-indigo-400/70 rounded-t transition-all duration-700 relative group"
                  style={{ height: `${Math.max(wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0, 2)}%` }}
                >
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold text-white opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100 whitespace-nowrap z-20 shadow-xl pointer-events-none">
                    <span className="text-emerald-400">{wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0}%</span>
                    <span className="mx-1.5 text-slate-600">|</span>
                    <span className="text-slate-300 text-[10px]">
                      {wins}W - {losses}L
                    </span>
                  </div>
                </div>
                <span className="absolute -bottom-6 text-[10px] font-medium text-slate-500">{b.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
