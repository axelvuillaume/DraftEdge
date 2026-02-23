import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { Loader2, TrendingUp, TrendingDown, Trophy, Zap } from "lucide-react"
import api from "@/services/api"
import useStore from "@/services/store"
import { Link, useNavigate } from "react-router-dom"
import { RANKED_TIERS, DIVS, CHART_COLORS, ROLES, TIER_COLORS, RANK_ICON_TIERS } from "@/utils"

function toLP(tier, rank, lp = 0) {
  const i = RANKED_TIERS.indexOf(tier)
  return i === -1 ? 0 : i >= 7 ? 2800 + lp : i * 400 + (DIVS[rank] || 0) * 100 + lp
}

function lpLabel(v) {
  if (v >= 2800) return `${RANKED_TIERS[Math.min(9, 7 + Math.floor((v - 2800) / 500))]} ${v - 2800} LP`
  return `${RANKED_TIERS[Math.floor(v / 400)] || "IRON"} ${["IV", "III", "II", "I"][Math.floor((v % 400) / 100)]} ${v % 100} LP`
}

export default function SoloQ() {
  const { user } = useStore()
  const [players, setPlayers] = useState([])
  const [snapshots, setSnapshots] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const fetchPlayers = async () => {
    try {
      const { ok, data, code } = await api.post("/player/search", { team_id: user?.team_id })
      if (!ok) return toast.error(code || "Failed to fetch players")
      setPlayers(data)
      const conn = data.filter(p => p.puuid)
      if (!conn.length) return toast.error("No connected players")
      setSnapshots((await Promise.all(conn.map(p => api.post("/soloq-snapshot/search", { player_id: p._id, limit: 5000 })))).flatMap(r => (r.ok ? r.data : [])))
    } catch (error) {
      toast.error(error.message || "Failed to fetch players")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPlayers()
  }, [])

  const connected = players.filter(p => p.puuid).sort((a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role))

  const chartData = (() => {
    if (!snapshots.length) return []
    const m = {}
    for (const s of snapshots) {
      const k = Math.round(new Date(s.fetched_at || s.createdAt).getTime() / 60000) * 60000
      if (!m[k]) m[k] = { time: k }
      m[k][s.player_id] = toLP(s.tier, s.rank, s.league_points)
    }
    return Object.values(m).sort((a, b) => a.time - b.time)
  })()

  const getLPChange = player => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const snaps = snapshots.filter(s => s.player_id === player._id).sort((a, b) => new Date(a.fetched_at || a.createdAt) - new Date(b.fetched_at || b.createdAt))
    if (snaps.length < 2) return 0
    const todaySnaps = snaps.filter(s => new Date(s.fetched_at || s.createdAt) >= today)
    const base = todaySnaps.length ? todaySnaps[0] : snaps.at(-1)
    return toLP(snaps.at(-1).tier, snaps.at(-1).rank, snaps.at(-1).league_points) - toLP(base.tier, base.rank, base.league_points)
  }

  if (loading)
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 lg:p-8">
      <div className="max-w-[1800px] mx-auto space-y-6">
        {connected.length > 0 &&
          (() => {
            const w = connected.reduce((s, p) => s + (p.current_wins || 0), 0)
            const l = connected.reduce((s, p) => s + (p.current_losses || 0), 0)
            const wr = w + l > 0 ? Math.round((w / (w + l)) * 100) : 0
            const change = connected.reduce((s, p) => s + getLPChange(p), 0)
            return (
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl px-6 py-3 flex items-center justify-center gap-10">
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-slate-400 text-xs uppercase tracking-wider">Team LP</span>
                  <span className="text-white font-bold text-lg tabular-nums">
                    {connected
                      .filter(p => ["MASTER", "GRANDMASTER", "CHALLENGER"].includes(p.current_tier))
                      .reduce((s, p) => s + (p.current_lp ?? 0), 0)
                      .toLocaleString()}
                  </span>
                </div>
                <div className="w-px h-5 bg-slate-700" />
                <div className="flex items-center gap-2">
                  <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-slate-400 text-xs uppercase tracking-wider">Win Rate</span>
                  <span className={`font-bold text-lg tabular-nums ${wr >= 50 ? "text-emerald-400" : "text-red-400"}`}>{wr}%</span>
                  <span className="text-slate-500 text-xs">
                    {w}W {l}L
                  </span>
                </div>
                <div className="w-px h-5 bg-slate-700" />
                <div className="flex items-center gap-2">
                  {change >= 0 ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> : <TrendingDown className="w-3.5 h-3.5 text-red-400" />}
                  <span className="text-slate-400 text-xs uppercase tracking-wider">LP Change today</span>
                  <span className={`font-bold text-lg tabular-nums ${change > 0 ? "text-emerald-400" : change < 0 ? "text-red-400" : "text-slate-400"}`}>
                    {change > 0 ? "+" : ""}
                    {change}
                  </span>
                </div>
              </div>
            )
          })()}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {connected.length === 0 ? (
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
            connected.map((p, i) => {
              const lp = getLPChange(p)
              const glow = TIER_COLORS[p.current_tier] || "#64748b"
              return (
                <div
                  key={p._id}
                  className="relative bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 flex flex-col items-center gap-3 overflow-hidden group hover:border-slate-600/80 transition-all cursor-pointer"
                  onClick={() => navigate(`/soloq/${p._id}`)}
                >
                  <div className="absolute top-0 left-0 right-0 h-0.5" style={{ backgroundColor: CHART_COLORS[i % 5] }} />
                  <div className="flex items-center gap-2">
                    <img src={`/roles/${p.role}.png`} alt={p.role} className="w-4 h-4 opacity-60" />
                    <span className="text-white font-semibold text-sm">{p.game_name}</span>
                    <span className="text-slate-500 text-xs">#{p.tag_line}</span>
                  </div>
                  <div className="relative w-24 h-24 flex items-center justify-center">
                    {RANK_ICON_TIERS.has(p.current_tier) ? (
                      <img
                        src={`/rank/${p.current_tier.toLowerCase()}.png`}
                        alt={p.current_tier}
                        className="w-full h-full object-contain drop-shadow-lg"
                        style={{ filter: `drop-shadow(0 0 12px ${glow}40)` }}
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full flex items-center justify-center border-2" style={{ borderColor: glow, backgroundColor: `${glow}15` }}>
                        <span className="text-xs font-bold uppercase" style={{ color: glow }}>
                          {p.current_tier || "N/A"}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <p className="text-white font-bold text-sm tracking-wide">{p.current_tier ? `${p.current_tier} ${p.current_rank || ""}` : "Unranked"}</p>
                    <p className="text-slate-400 text-xs">{p.current_lp ?? 0} LP</p>
                  </div>
                  {p.current_wins + p.current_losses > 0 && (
                    <div className="flex items-center gap-3 text-xs">
                      <span className={Math.round((p.current_wins / (p.current_wins + p.current_losses)) * 100) >= 50 ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                        {Math.round((p.current_wins / (p.current_wins + p.current_losses)) * 100)}%
                      </span>
                      <span className="text-slate-500">
                        {p.current_wins}W {p.current_losses}L
                      </span>
                    </div>
                  )}
                  {lp !== 0 && (
                    <div className="flex flex-col items-center">
                      <div className={`flex items-center gap-1 text-xs font-medium ${lp > 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {lp > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        <span>
                          {lp > 0 ? "+" : ""}
                          {lp} LP
                        </span>
                      </div>
                      <span className="text-slate-600 text-[10px]">aujourd'hui</span>
                    </div>
                  )}
                  {p.last_fetched_at && (
                    <p className="text-slate-600 text-[10px]">
                      {new Date(p.last_fetched_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}
                </div>
              )
            })
          )}
        </div>

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
                    formatter={(value, name) => [lpLabel(value), connected.find(p => p._id === name)?.game_name || name]}
                  />
                  <Legend formatter={v => connected.find(p => p._id === v)?.game_name || v} />
                  {connected.map((p, i) => (
                    <Line key={p._id} dataKey={p._id} stroke={CHART_COLORS[i % 5]} strokeWidth={2} dot={false} connectNulls activeDot={{ r: 4, strokeWidth: 2 }} />
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
