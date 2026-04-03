import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { toast } from "react-hot-toast"
import api from "@/services/api"
import useStore from "@/services/store"
import { Clock, Gamepad2, Swords } from "lucide-react"
import { getChampionIcon, ROLE_ICONS, DRAFT_ROLES } from "@/utils"

export default function Overview() {
  return (
    <div className="h-[calc(100vh-200px)] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-5 overflow-y-auto">
      <div className="max-w-[1800px] w-full mx-auto flex flex-col gap-4">
        <div className="flex items-stretch gap-3">
          <StatsBar />
          <EloPanel />
          <SideWinRatePanel />
          <DurationChart />
        </div>
        <div className="flex items-stretch gap-3">
          <FirstPickPanel />
          <BansPanel />
          <BestDuosPanel />
        </div>
        <MostPlayedPanel />
      </div>
    </div>
  )
}

function MostPlayedPanel() {
  const { globalFilters } = useStore()
  const [data, setData] = useState(null)
  const [side, setSide] = useState(null)

  const fetchData = async () => {
    try {
      const { ok, data, code } = await api.post("/playerstats/most-played", { ...globalFilters, limit: 5, side })
      if (!ok) return toast.error(code || "Failed to fetch most played")
      setData(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch most played")
    }
  }

  useEffect(() => {
    fetchData()
  }, [globalFilters.patch, globalFilters.folder_id, globalFilters.opponent_id, side])

  if (!data) return null

  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-5">
        <h3 className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Most Played by Role</h3>
        <div className="flex items-center gap-1 bg-slate-700/30 rounded-lg p-0.5">
          {[
            { value: null, label: "All" },
            { value: "blue", label: "Blue" },
            { value: "red", label: "Red" }
          ].map(opt => (
            <button
              key={opt.label}
              onClick={() => setSide(opt.value)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-colors ${
                side === opt.value ? "bg-slate-600/60 text-white" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-5">
        {DRAFT_ROLES.map((role, idx) => (
          <div key={role} className={`flex flex-col gap-3 px-5 ${idx < DRAFT_ROLES.length - 1 ? "border-r border-dashed border-slate-700/50" : ""}`}>
            <div className="flex items-center gap-2 mb-1">
              <img src={ROLE_ICONS[role]} alt={role} className="w-5 h-5 opacity-60" />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{role}</span>
            </div>
            <div className="flex flex-col gap-2">
              {(data[role] || []).map((champ, i) => (
                <div key={champ.name} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-700/30 transition-colors">
                  <span className="text-xs font-bold text-slate-600 w-3">{i + 1}</span>
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-700 flex-shrink-0 ring-1 ring-slate-600/50">
                    <img
                      src={getChampionIcon(champ.name)}
                      alt={champ.name}
                      className="w-full h-full object-cover"
                      onError={e => {
                        e.target.style.display = "none"
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 font-medium truncate">{champ.name}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-slate-600">{champ.games}G</span>
                      <span className="text-[9px] text-cyan-400/70">PR {champ.pr}%</span>
                      <span className={`text-xs font-bold ${champ.wr >= 60 ? "text-emerald-400" : champ.wr >= 50 ? "text-amber-400" : "text-red-400"}`}>{champ.wr}%</span>
                    </div>
                  </div>
                </div>
              ))}
              {(!data[role] || data[role].length === 0) && <span className="text-slate-600 text-xs px-2">—</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatsBar() {
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
  }, [globalFilters.patch, globalFilters.folder_id, globalFilters.opponent_id])

  return (
    <div className="flex items-stretch gap-2">
      <div className="px-5 py-3 flex flex-col items-center justify-center">
        <span className={`text-2xl font-bold leading-none ${(headerStats?.win_rate || 0) >= 0.5 ? "text-emerald-400" : "text-red-400"}`}>
          {headerStats?.win_rate != null ? (headerStats.win_rate * 100).toFixed(0) : "0"}%
        </span>
        <span className="text-[8px] text-slate-500 uppercase mt-1">
          {games.filter(g => g.win).length}W - {games.filter(g => !g.win).length}L
        </span>
      </div>

      {[
        {
          value: headerStats?.total_games || 0,
          label: "Games",
          icon: <Gamepad2 className="w-3.5 h-3.5 text-slate-500" />
        },
        {
          value: `${Math.floor((games.length ? Math.round(games.reduce((s, g) => s + (g.duration || 0), 0) / games.length) : 0) / 60)}:${String((games.length ? Math.round(games.reduce((s, g) => s + (g.duration || 0), 0) / games.length) : 0) % 60).padStart(2, "0")}`,
          label: "Avg Time",
          icon: <Clock className="w-3.5 h-3.5 text-slate-500" />
        },
        {
          value: (kdaStats?.allies?.total && kdaStats.allies.total.deaths > 0
            ? (kdaStats.allies.total.kills + kdaStats.allies.total.assists) / kdaStats.allies.total.deaths
            : kdaStats?.allies?.total?.kills + kdaStats?.allies?.total?.assists || 0
          ).toFixed(2),
          label: "KDA",
          icon: <Swords className="w-3.5 h-3.5 text-slate-500" />
        }
      ].map((stat, i) => (
        <div key={i} className="px-4 py-3 flex flex-col items-center justify-center">
          {stat.icon}
          <span className="text-lg font-semibold text-white leading-none mt-1">{stat.value}</span>
          <span className="text-[8px] text-slate-500 uppercase mt-1">{stat.label}</span>
        </div>
      ))}
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
  }, [globalFilters.patch, globalFilters.folder_id, globalFilters.opponent_id])

  return (
    <div className="p-3 flex items-center gap-3 flex-shrink-0">
      <img
        src={`/rank/${stats?.avg_enemy_rank?.tier?.toLowerCase()}.png`}
        alt={stats?.avg_enemy_rank?.tier}
        className="w-12 h-12 object-contain drop-shadow-[0_0_15px_rgba(139,92,246,0.2)]"
      />
      <div>
        <p className="text-[8px] text-slate-600 font-semibold uppercase tracking-wider">Elo Enemy Avg</p>
        <p className="text-xl font-black text-white leading-tight">
          {stats?.avg_enemy_rank?.rank} {stats?.avg_enemy_rank?.lp || 0} <span className="text-[9px] text-slate-500 font-bold">LP</span>
        </p>
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
  }, [globalFilters.patch, globalFilters.folder_id, globalFilters.opponent_id])

  return (
    <div className="p-3 flex-shrink-0 min-w-[280px]">
      <p className="text-[8px] text-slate-600 font-semibold uppercase tracking-wider mb-2">Win Rate / Side</p>
      <div className="flex flex-col gap-1.5">
        {[
          { label: "Blue", color: "text-blue-400", bg: "rgba(59,130,246,0.6)", side: "blue" },
          { label: "Red", color: "text-red-400", bg: "rgba(239,68,68,0.6)", side: "red" }
        ].map((s, i) => {
          const total = games.filter(g => g.team_side === s.side).length
          const wins = games.filter(g => g.team_side === s.side && g.win).length
          const pct = total ? Math.round((wins / total) * 100) : 0
          return (
            <div key={i} className="flex items-center gap-2">
              <span className={`text-[10px] font-semibold w-7 ${s.color}`}>{s.label}</span>
              <div className="flex-1 h-3 bg-slate-700/40 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: s.bg }} />
              </div>
              <span className="text-sm font-black text-white w-10 text-right">{pct}%</span>
              <span className="text-[8px] text-slate-600 w-12 text-right">
                {wins}W-{total - wins}L
              </span>
            </div>
          )
        })}
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
  }, [globalFilters.patch, globalFilters.folder_id, globalFilters.opponent_id])

  return (
    <div className="p-3 flex-shrink-0">
      <p className="text-[8px] text-slate-600 font-semibold uppercase tracking-wider mb-2">WR / Duration</p>
      <div className="relative">
        <div className="flex items-end gap-0.5 h-12 relative w-fit mx-auto">
          <div className="absolute left-0 right-0 bottom-[50%] border-t border-dashed border-slate-600/40 z-10 pointer-events-none" />
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
            const pct = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0
            return (
              <div key={i} className="w-8 flex flex-col items-center group relative h-full justify-end">
                <div
                  className="w-7 rounded-t transition-all duration-700"
                  style={{ height: `${Math.max(pct, 5)}%`, background: "linear-gradient(to top, rgba(37,99,235,0.3), rgba(129,140,248,0.7))" }}
                />
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-slate-600 px-2 py-0.5 rounded text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap z-20 pointer-events-none">
                  <span className="text-emerald-400 font-black">{pct}%</span>{" "}
                  <span className="text-slate-500 text-[8px]">
                    {wins}W-{losses}L
                  </span>
                </div>
              </div>
            )
          })}
        </div>
        <div className="flex gap-0.5 mt-1 w-fit mx-auto">
          {["<20", "20-25", "25-30", "30-35", "35+"].map(label => (
            <span key={label} className="w-8 text-center text-[8px] text-slate-600">
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function FirstPickPanel() {
  const [data, setData] = useState(null)
  const { user, globalFilters } = useStore()

  const fetchData = async () => {
    try {
      const { ok, data, code } = await api.post("/game/draft-slot-stats", { team_id: user?.team_id, ...globalFilters })
      if (!ok) return toast.error(code || "Failed to fetch draft stats")
      setData(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch draft stats")
    }
  }

  useEffect(() => {
    fetchData()
  }, [globalFilters.patch, globalFilters.folder_id, globalFilters.opponent_id])

  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-3 flex-shrink-0 min-w-[420px] flex flex-col">
      <p className="text-[8px] text-slate-600 font-semibold uppercase tracking-wider mb-2">Draft Rotations</p>
      {data && !(data.rotations?.blue?.some(r => r?.length) || data.rotations?.red?.some(r => r?.length)) ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-8 px-4">
          <Swords className="w-8 h-8 text-slate-600 mb-3" />
          <p className="text-sm text-slate-400 mb-1">No draft has been added to games</p>
          <p className="text-xs text-slate-500">
            You can edit games{" "}
            <Link to="/performance/games" className="text-amber-400 hover:text-amber-300 underline">
              here
            </Link>{" "}
            or add the draft link during import.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 flex-1">
          {[
            {
              side: "blue",
              label: "Blue Side",
              color: "text-blue-400",
              bg: "bg-blue-500/5 border-blue-500/20",
              rotations: [
                { rota: 0, desc: "First Pick" },
                { rota: 1, desc: "B2 + B3" }
              ]
            },
            {
              side: "red",
              label: "Red Side",
              color: "text-red-400",
              bg: "bg-red-500/5 border-red-500/20",
              rotations: [
                { rota: 0, desc: "R1 + R2" },
                { rota: 1, desc: "R3" }
              ]
            }
          ].map(s => (
            <div key={s.side} className={`rounded-xl border p-2.5 flex flex-col gap-2 ${s.bg}`}>
              <p className={`text-[10px] font-bold uppercase tracking-wide ${s.color}`}>{s.label}</p>
              {s.rotations.map(r => (
                <div key={r.rota}>
                  <p className="text-[8px] text-slate-600 mb-1">
                    Rota {r.rota + 1} — {r.desc}
                  </p>
                  <div className="flex flex-col gap-0.5">
                    {(data?.rotations?.[s.side]?.[r.rota] || []).slice(0, 3).map(champ => (
                      <div key={champ.name} className="flex items-center gap-1.5 px-1 py-1 rounded-lg hover:bg-slate-700/30 transition-colors">
                        <div className="w-6 h-6 rounded overflow-hidden bg-slate-700 flex-shrink-0">
                          <img
                            src={getChampionIcon(champ.name)}
                            alt={champ.name}
                            className="w-full h-full object-cover"
                            onError={e => {
                              e.target.style.display = "none"
                            }}
                          />
                        </div>
                        <span className="text-[11px] text-slate-200 font-medium flex-1 truncate">{champ.name}</span>
                        <span className="text-[8px] text-slate-600">{champ.games}G</span>
                        <span className={`text-[10px] font-bold ${champ.wr >= 50 ? "text-emerald-400" : "text-red-400"}`}>{champ.wr}%</span>
                      </div>
                    ))}
                    {(!data?.rotations?.[s.side]?.[r.rota] || data.rotations[s.side][r.rota].length === 0) && <span className="text-slate-600 text-xs">—</span>}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function BansPanel() {
  const [data, setData] = useState(null)
  const { user, globalFilters } = useStore()

  const fetchData = async () => {
    try {
      const { ok, data, code } = await api.post("/game/draft-slot-stats", { team_id: user?.team_id, ...globalFilters })
      if (!ok) return toast.error(code || "Failed to fetch ban stats")
      setData(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch ban stats")
    }
  }

  useEffect(() => {
    fetchData()
  }, [globalFilters.patch, globalFilters.folder_id, globalFilters.opponent_id])

  const mergeBans = side => {
    const map = {}
    ;(data?.bans?.[side] || []).forEach(phase => {
      ;(phase || []).forEach(champ => {
        if (!map[champ.name]) map[champ.name] = { name: champ.name, games: 0, wins: 0 }
        map[champ.name].games += champ.games
        map[champ.name].wins += Math.round((champ.games * champ.wr) / 100)
      })
    })
    return Object.values(map)
      .sort((a, b) => b.games - a.games)
      .slice(0, 5)
  }

  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-3 flex-1 flex flex-col">
      <p className="text-[8px] text-slate-600 font-semibold uppercase tracking-wider mb-2">Most Banned</p>
      {data && !(data.bans?.blue?.some(p => p?.length) || data.bans?.red?.some(p => p?.length)) ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-8 px-4">
          <Swords className="w-8 h-8 text-slate-600 mb-3" />
          <p className="text-sm text-slate-400 mb-1">No draft has been added to games</p>
          <p className="text-xs text-slate-500">
            You can edit games{" "}
            <Link to="/performance/games" className="text-amber-400 hover:text-amber-300 underline">
              here
            </Link>{" "}
            or add the draft link during import.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 flex-1">
          {[
            { side: "blue", label: "Our Bans", color: "text-blue-400", bg: "bg-blue-500/5 border-blue-500/20" },
            { side: "red", label: "Enemy Bans", color: "text-red-400", bg: "bg-red-500/5 border-red-500/20" }
          ].map(row => (
            <div key={row.side} className={`rounded-xl border p-2.5 flex flex-col ${row.bg}`}>
              <p className={`text-[10px] font-bold uppercase tracking-wide mb-1.5 ${row.color}`}>{row.label}</p>
              <div className="flex flex-col gap-1">
                {mergeBans(row.side).map(champ => (
                  <div key={champ.name} className="flex items-center gap-2 px-1 py-1 rounded-lg hover:bg-slate-700/30 transition-colors">
                    <div className="w-7 h-7 rounded-lg overflow-hidden bg-slate-700 flex-shrink-0 ring-1 ring-slate-600/50">
                      <img
                        src={getChampionIcon(champ.name)}
                        alt={champ.name}
                        className="w-full h-full object-cover grayscale"
                        onError={e => {
                          e.target.style.display = "none"
                        }}
                      />
                    </div>
                    <span className="text-[11px] text-slate-200 font-medium flex-1 truncate">{champ.name}</span>
                    <span className="text-[8px] text-slate-600">{champ.games}G</span>
                    <span className={`text-[10px] font-bold ${champ.games > 0 && Math.round((champ.wins / champ.games) * 100) >= 50 ? "text-emerald-400" : "text-red-400"}`}>
                      {champ.games > 0 ? Math.round((champ.wins / champ.games) * 100) : 0}%
                    </span>
                  </div>
                ))}
                {mergeBans(row.side).length === 0 && <span className="text-slate-600 text-xs">—</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function BestDuosPanel() {
  const [data, setData] = useState(null)
  const { globalFilters } = useStore()

  const fetchData = async () => {
    try {
      const { ok, data, code } = await api.post("/playerstats/best-combos", { ...globalFilters, limit: 4, minGames: 2 })
      if (!ok) return toast.error(code || "Failed to fetch duos")
      setData(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch duos")
    }
  }

  useEffect(() => {
    fetchData()
  }, [globalFilters.patch, globalFilters.folder_id, globalFilters.opponent_id])

  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-3 min-w-[320px]">
      <p className="text-[8px] text-slate-600 font-semibold uppercase tracking-wider mb-2">Best Duos</p>
      <div className="flex flex-col gap-1">
        {(data || []).map((combo, i) => (
          <div key={i} className="flex items-center gap-2 px-1.5 py-1.5 rounded-lg hover:bg-slate-700/30 transition-colors">
            <div className="flex items-center -space-x-1.5">
              <img src={getChampionIcon(combo.champ1)} alt={combo.champ1} className="w-6 h-6 rounded ring-1 ring-slate-700 relative z-10" />
              <img src={getChampionIcon(combo.champ2)} alt={combo.champ2} className="w-6 h-6 rounded ring-1 ring-slate-700" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-slate-200 font-medium truncate">
                {combo.champ1} + {combo.champ2}
              </p>
              <span className="text-[8px] text-slate-600">{combo.games}G</span>
            </div>
            <span className={`text-sm font-black ${combo.wr >= 50 ? "text-emerald-400" : "text-red-400"}`}>{combo.wr}%</span>
          </div>
        ))}
        {(!data || data.length === 0) && <span className="text-slate-600 text-xs">—</span>}
      </div>
    </div>
  )
}
