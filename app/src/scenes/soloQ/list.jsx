import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from "recharts"
import { Loader2, TrendingUp, TrendingDown, Minus, Trophy, Zap } from "lucide-react"
import api from "@/services/api"
import useStore from "@/services/store"
import { Link, useNavigate } from "react-router-dom"

const TIER_ORDER = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"]
const DIVISION_ORDER = { IV: 0, III: 1, II: 2, I: 3 }
const PLAYER_COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#ef4444", "#a855f7"]
const ROLE_LABELS = { top: "Top", jungle: "Jungle", mid: "Mid", bottom: "ADC", support: "Support" }
const ROLE_ORDER = ["top", "jungle", "mid", "bottom", "support"]

const RANK_ICONS = new Set(["challenger", "grandmaster", "master", "diamond", "platinum"])

function getRankIcon(tier) {
  if (!tier) return null
  const key = tier.toLowerCase()
  return RANK_ICONS.has(key) ? `/rank/${key}.png` : null
}

function rankToLP(tier, rank, lp = 0) {
  const tierIndex = TIER_ORDER.indexOf(tier)
  if (tierIndex === -1) return 0
  if (tierIndex >= 7) return 2800 + lp
  return tierIndex * 400 + (DIVISION_ORDER[rank] || 0) * 100 + lp
}

function lpToLabel(value) {
  if (value >= 2800) {
    const tierIndex = Math.min(9, 7 + Math.floor((value - 2800) / 500))
    return `${TIER_ORDER[tierIndex]} ${value - 2800} LP`
  }
  const tierIndex = Math.floor(value / 400)
  const remainder = value % 400
  const divIndex = Math.floor(remainder / 100)
  const lp = remainder % 100
  const divisions = ["IV", "III", "II", "I"]
  return `${TIER_ORDER[tierIndex] || "IRON"} ${divisions[divIndex]} ${lp} LP`
}

function formatTick(value) {
  if (value >= 2800) return "Master+"
  const tierIndex = Math.floor(value / 400)
  return TIER_ORDER[tierIndex] || ""
}

const TIER_COLORS = {
  IRON: "#6b7280",
  BRONZE: "#b45309",
  SILVER: "#9ca3af",
  GOLD: "#eab308",
  PLATINUM: "#06b6d4",
  EMERALD: "#10b981",
  DIAMOND: "#6366f1",
  MASTER: "#a855f7",
  GRANDMASTER: "#ef4444",
  CHALLENGER: "#f59e0b"
}

function getTierGlow(tier) {
  return TIER_COLORS[tier] || "#64748b"
}

export default function SoloQ() {
  const { user } = useStore()
  const [players, setPlayers] = useState([])
  const [snapshots, setSnapshots] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { ok, data, code } = await api.post("/player/search", { team_id: user?.team_id })
        if (!ok) return toast.error(code)
        setPlayers(data)

        const connected = data.filter(p => p.puuid)
        if (!connected.length) return toast.error("No connected players")

        const snapshotResults = await Promise.all(connected.map(p => api.post("/soloq-snapshot/search", { player_id: p._id, limit: 5000 })))
        setSnapshots(snapshotResults.flatMap(r => (r.ok ? r.data : [])))
      } catch (error) {
        toast.error(error.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const connectedPlayers = players.filter(p => p.puuid).sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role))

  const chartData = (() => {
    if (!snapshots.length) return []
    const timeMap = {}
    for (const snap of snapshots) {
      const time = new Date(snap.fetched_at || snap.createdAt).getTime()
      const key = Math.round(time / 60000) * 60000
      if (!timeMap[key]) timeMap[key] = { time: key }
      timeMap[key][snap.player_id] = rankToLP(snap.tier, snap.rank, snap.league_points)
    }
    return Object.values(timeMap).sort((a, b) => a.time - b.time)
  })()

  const getPlayerLPChange = player => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const playerSnaps = snapshots.filter(s => s.player_id === player._id).sort((a, b) => new Date(a.fetched_at || a.createdAt) - new Date(b.fetched_at || b.createdAt))
    if (playerSnaps.length < 2) return 0
    // Find the last snapshot before today (or the first of today) as baseline
    const todaySnaps = playerSnaps.filter(s => new Date(s.fetched_at || s.createdAt) >= today)
    const baseline = todaySnaps.length > 0 ? todaySnaps[0] : playerSnaps[playerSnaps.length - 1]
    const last = playerSnaps[playerSnaps.length - 1]
    const baselineLP = rankToLP(baseline.tier, baseline.rank, baseline.league_points)
    const lastLP = rankToLP(last.tier, last.rank, last.league_points)
    return lastLP - baselineLP
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 lg:p-8">
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Team Stats */}
        {connectedPlayers.length > 0 &&
          (() => {
            const masterPlayers = connectedPlayers.filter(p => ["MASTER", "GRANDMASTER", "CHALLENGER"].includes(p.current_tier))
            const totalLP = masterPlayers.reduce((sum, p) => sum + (p.current_lp ?? 0), 0)
            const totalLPChange = connectedPlayers.reduce((sum, p) => sum + getPlayerLPChange(p), 0)
            const totalWins = connectedPlayers.reduce((sum, p) => sum + (p.current_wins || 0), 0)
            const totalLosses = connectedPlayers.reduce((sum, p) => sum + (p.current_losses || 0), 0)
            const totalGames = totalWins + totalLosses
            const avgWR = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0
            return (
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl px-6 py-3 flex items-center justify-center gap-10">
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-slate-400 text-xs uppercase tracking-wider">Team LP</span>
                  <span className="text-white font-bold text-lg tabular-nums">{totalLP.toLocaleString()}</span>
                </div>
                <div className="w-px h-5 bg-slate-700" />
                <div className="flex items-center gap-2">
                  <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-slate-400 text-xs uppercase tracking-wider">Win Rate</span>
                  <span className={`font-bold text-lg tabular-nums ${avgWR >= 50 ? "text-emerald-400" : "text-red-400"}`}>{avgWR}%</span>
                  <span className="text-slate-500 text-xs">{totalWins}W {totalLosses}L</span>
                </div>
                <div className="w-px h-5 bg-slate-700" />
                <div className="flex items-center gap-2">
                  {totalLPChange >= 0 ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> : <TrendingDown className="w-3.5 h-3.5 text-red-400" />}
                  <span className="text-slate-400 text-xs uppercase tracking-wider">LP Change</span>
                  <span className={`font-bold text-lg tabular-nums ${totalLPChange > 0 ? "text-emerald-400" : totalLPChange < 0 ? "text-red-400" : "text-slate-400"}`}>
                    {totalLPChange > 0 ? "+" : ""}{totalLPChange}
                  </span>
                </div>
              </div>
            )
          })()}

        {/* Player Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {connectedPlayers.length === 0 ? (
            <div className="col-span-full bg-slate-800/50 border border-slate-700/50 rounded-xl p-12 text-center">
              <p className="text-slate-500">
                No connected players. Add Riot IDs in the{" "}
                <Link to="/team" className="text-amber-400 hover:underline">
                  Team
                </Link>{" "}
                page first.
              </p>
            </div>
          ) : (
            connectedPlayers.map((player, i) => {
              const lpChange = getPlayerLPChange(player)
              const icon = getRankIcon(player.current_tier)
              const glowColor = getTierGlow(player.current_tier)

              return (
                <div
                  key={player._id}
                  className="relative bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 flex flex-col items-center gap-3 overflow-hidden group hover:border-slate-600/80 transition-all"
                  onClick={() => navigate(`/soloq/${player._id}`)}
                >
                  {/* Color accent line */}
                  <div className="absolute top-0 left-0 right-0 h-0.5" style={{ backgroundColor: PLAYER_COLORS[i % PLAYER_COLORS.length] }} />
                  {/* Role icon + Name */}
                  <div className="flex items-center gap-2">
                    <img src={`/roles/${player.role}.png`} alt={player.role} className="w-4 h-4 opacity-60" />
                    <span className="text-white font-semibold text-sm">{player.game_name}</span>
                    <span className="text-slate-500 text-xs">#{player.tag_line}</span>
                  </div>
                  {/* Rank Emblem */}
                  <div className="relative w-24 h-24 flex items-center justify-center">
                    {icon ? (
                      <img
                        src={icon}
                        alt={player.current_tier}
                        className="w-full h-full object-contain drop-shadow-lg"
                        style={{ filter: `drop-shadow(0 0 12px ${glowColor}40)` }}
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full flex items-center justify-center border-2" style={{ borderColor: glowColor, backgroundColor: `${glowColor}15` }}>
                        <span className="text-xs font-bold uppercase" style={{ color: glowColor }}>
                          {player.current_tier || "N/A"}
                        </span>
                      </div>
                    )}
                  </div>
                  {/* Rank Text */}
                  <div className="text-center">
                    <p className="text-white font-bold text-sm tracking-wide">{player.current_tier ? `${player.current_tier} ${player.current_rank || ""}` : "Unranked"}</p>
                    <p className="text-slate-400 text-xs">{player.current_lp ?? 0} LP</p>
                  </div>
                  {/* Win/Loss */}
                  {player.current_wins + player.current_losses > 0 && (
                    <div className="flex items-center gap-3 text-xs">
                      <span
                        className={
                          Math.round((player.current_wins / (player.current_wins + player.current_losses)) * 100) >= 50 ? "text-emerald-400 font-bold" : "text-red-400 font-bold"
                        }
                      >
                        {Math.round((player.current_wins / (player.current_wins + player.current_losses)) * 100)}%
                      </span>
                      <span className="text-slate-500">
                        {player.current_wins}W {player.current_losses}L
                      </span>
                    </div>
                  )}
                  {/* LP Change */}
                  {lpChange !== 0 && (
                    <div className="flex flex-col items-center">
                      <div className={`flex items-center gap-1 text-xs font-medium ${lpChange > 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {lpChange > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        <span>
                          {lpChange > 0 ? "+" : ""}
                          {lpChange} LP
                        </span>
                      </div>
                      <span className="text-slate-600 text-[10px]">aujourd'hui</span>
                    </div>
                  )}
                  {/* Last Updated */}
                  {player.last_fetched_at && (
                    <p className="text-slate-600 text-[10px]">
                      {new Date(player.last_fetched_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* LP Chart */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="p-6">
            {chartData.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-slate-500">No data yet. Snapshots will appear after the first cron run.</div>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData}>
                  <XAxis
                    dataKey="time"
                    type="number"
                    domain={["dataMin", "dataMax"]}
                    tickFormatter={v => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    stroke="#64748b"
                    fontSize={12}
                  />
                  <YAxis tickFormatter={v => (v >= 2800 ? `${v - 2800} LP` : `${v} LP`)} stroke="#64748b" fontSize={12} domain={["dataMin - 100", "dataMax + 100"]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }}
                    labelStyle={{ color: "#94a3b8" }}
                    labelFormatter={v => new Date(v).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    formatter={(value, name) => {
                      const player = connectedPlayers.find(p => p._id === name)
                      return [lpToLabel(value), player ? `${player.game_name}#${player.tag_line}` : name]
                    }}
                  />
                  <Legend
                    formatter={value => {
                      const player = connectedPlayers.find(p => p._id === value)
                      return player ? player.game_name : value
                    }}
                  />
                  {connectedPlayers.map((player, i) => (
                    <Line
                      key={player._id}
                      dataKey={player._id}
                      stroke={PLAYER_COLORS[i % PLAYER_COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                      activeDot={{ r: 4, strokeWidth: 2 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
