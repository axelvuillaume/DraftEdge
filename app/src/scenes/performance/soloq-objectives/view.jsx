import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { toast } from "react-hot-toast"
import { ArrowLeft, ChevronDown } from "lucide-react"
import api from "@/services/api"
import { getChampionIcon } from "@/utils"

export default function View() {
  const { id } = useParams()
  const [objective, setObjective] = useState(null)

  const fetchObjective = async () => {
    try {
      const { ok, data, code } = await api.get(`/solo-objectif/${id}`)
      if (!ok) return toast.error(code || "Failed to fetch objective")
      setObjective(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch objective")
    }
  }

  useEffect(() => {
    fetchObjective()
  }, [id])

  if (!objective) return <div className="min-h-screen bg-slate-900 p-4 lg:p-6 text-slate-500 text-sm">Loading...</div>

  return (
    <div className="min-h-screen bg-slate-900 p-4 lg:p-6">
      <div className="max-w-[1400px] mx-auto space-y-5">
        {(objective.type === "aggregate" || objective.type === "rank") && <ObjectiveHeader objective={objective} />}

        {objective.type === "aggregate" && <AggregateDetails objective={objective} />}
        {objective.type === "rank" && <RankDetails objective={objective} />}
        {(!objective.type || objective.type === "per_game" || objective.type === "streak") && <ObjectiveDetails objective={objective} />}
      </div>
    </div>
  )
}

const TYPE_BADGES = {
  per_game: { label: "Per game", className: "text-violet-400/80 bg-violet-500/10" },
  aggregate: { label: "Aggregate", className: "text-amber-400/80 bg-amber-500/10" },
  streak: { label: "Streak", className: "text-cyan-400/80 bg-cyan-500/10" },
  rank: { label: "Rank", className: "text-yellow-400/80 bg-yellow-500/10" }
}

const TIER_ORDER = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"]
const DIVISION_ORDER = ["IV", "III", "II", "I"]

function formatRule(objective) {
  const r = objective.rule || {}
  if (objective.type === "rank") {
    const t = r.target_tier ? r.target_tier.charAt(0) + r.target_tier.slice(1).toLowerCase() : "?"
    return `Reach ${t}${r.target_division ? ` ${r.target_division}` : ""}${r.target_lp ? ` (${r.target_lp} LP)` : ""}`
  }
  if (objective.type === "aggregate") {
    return `${objective.aggregate?.fn || "?"}(${r.metric || "?"}) ${r.operator || ""} ${r.value} · ${objective.aggregate?.period || "total"}`
  }
  if (objective.type === "streak") {
    return `${r.metric} ${r.operator} ${r.value}${r.timing != null ? ` @ ${r.timing}min` : ""} × ${objective.streak_count || 2} in a row`
  }
  return `${r.metric} ${r.operator} ${r.value}${r.timing != null ? ` @ ${r.timing}min` : ""}`
}

function ObjectiveHeader({ objective, children }) {
  const navigate = useNavigate()
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 flex flex-col xl:flex-row xl:items-center gap-5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <button
            onClick={() => navigate("/performance/soloq-objectives")}
            className="p-1.5 -ml-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/40 transition-colors"
            title="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-white text-xl font-bold">{objective.name}</h1>
          {TYPE_BADGES[objective.type] && (
            <span className={`text-[10px] px-2 py-0.5 rounded font-medium uppercase tracking-wide ${TYPE_BADGES[objective.type].className}`}>
              {TYPE_BADGES[objective.type].label}
              {objective.type === "streak" && objective.streak_count ? ` ×${objective.streak_count}` : ""}
            </span>
          )}
          {objective.account?.game_name && (
            <span className="text-[10px] text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded font-medium">
              {objective.account.game_name}#{objective.account.tag_line}
            </span>
          )}
          {objective.side && (
            <span
              className={`text-[10px] px-2 py-0.5 rounded font-medium uppercase tracking-wide ${objective.side === "blue" ? "text-blue-400/80 bg-blue-500/10" : "text-red-400/80 bg-red-500/10"}`}
            >
              {objective.side}
            </span>
          )}
          {objective.champions?.length > 0 && (
            <div className="flex items-center gap-0.5">
              {objective.champions.map(c => (
                <img key={c} src={getChampionIcon(c)} alt={c} title={c} className="w-5 h-5 rounded" />
              ))}
            </div>
          )}
        </div>
        <p className="text-slate-500 text-sm pl-7">{objective.player_name}</p>
        {objective.request && <p className="text-slate-400 text-sm mt-2 pl-7">{objective.request}</p>}
        {objective.rule && <div className="text-xs text-slate-500 bg-slate-700/40 inline-block px-2 py-1 rounded font-mono mt-3 ml-7">{formatRule(objective)}</div>}
      </div>
      {children && <div className="shrink-0 overflow-x-auto">{children}</div>}
    </div>
  )
}

function AggregateDetails({ objective }) {
  const [history, setHistory] = useState([])

  const fetchHistory = async () => {
    try {
      const { ok, data, code } = await api.post("/solo-objectif-result/aggregate-history", { solo_objectif_id: objective._id })
      if (!ok) return toast.error(code || "Failed to fetch history")
      setHistory(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch history")
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [objective._id])

  if (history.length === 0) return <p className="text-slate-500 text-sm text-center py-8">No data yet</p>

  const periodLabel = objective.aggregate?.period === "weekly" ? "Week" : objective.aggregate?.period === "total" ? "All time" : "Day"
  const unit = objective.rule?.metric === "win" ? "wins" : "games"
  const reversed = [...history].reverse()
  const current = reversed[0]

  return (
    <div className="space-y-4">
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6">
        <div className="flex items-baseline justify-between mb-2">
          <p className="text-slate-400 text-sm font-medium">{objective.aggregate?.period === "total" ? "Progress" : `Current ${periodLabel.toLowerCase()}`}</p>
          <p className={`text-sm font-bold tabular-nums ${current.success ? "text-emerald-400" : "text-amber-400"}`}>
            {current.success ? "Target hit" : `${Math.min(100, Math.round((current.current / current.target) * 100))}%`}
          </p>
        </div>
        <div className="flex items-baseline gap-2 mb-3">
          <span className={`text-4xl font-bold tabular-nums ${current.success ? "text-emerald-400" : "text-amber-400"}`}>{current.current}</span>
          <span className="text-slate-500 text-xl tabular-nums">/ {current.target}</span>
          <span className="text-slate-500 text-sm uppercase tracking-wide">{unit}</span>
          {unit === "wins" && (
            <span className="text-slate-600 text-xs ml-auto tabular-nums">
              {current.total_games} games · {current.wins}W {current.total_games - current.wins}L
            </span>
          )}
        </div>
        <div className="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${current.success ? "bg-emerald-500" : "bg-amber-500"}`}
            style={{ width: `${Math.min(100, Math.round((current.current / current.target) * 100))}%` }}
          />
        </div>
      </div>

      {objective.aggregate?.period !== "total" && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
            <p className="text-slate-500 text-[10px] uppercase tracking-wide mb-1">{periodLabel}s tracked</p>
            <p className="text-white text-2xl font-bold tabular-nums">{history.length}</p>
          </div>
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
            <p className="text-slate-500 text-[10px] uppercase tracking-wide mb-1">Hit target</p>
            <p className="text-emerald-400 text-2xl font-bold tabular-nums">{history.filter(h => h.success).length}</p>
          </div>
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
            <p className="text-slate-500 text-[10px] uppercase tracking-wide mb-1">Missed</p>
            <p className="text-red-400 text-2xl font-bold tabular-nums">{history.filter(h => !h.success).length}</p>
          </div>
        </div>
      )}

      {objective.aggregate?.period !== "total" && (
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
          <p className="text-slate-400 text-sm font-medium mb-3">History per {periodLabel.toLowerCase()}</p>
          <div className="space-y-1">
            {reversed.map(h => (
              <div key={h.period_start} className="px-3 py-2 rounded-lg hover:bg-slate-700/20 flex items-center gap-3">
                <span className="text-slate-400 text-xs w-40 shrink-0">
                  {objective.aggregate?.period === "daily"
                    ? new Date(h.period_start).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
                    : `${new Date(h.period_start).toLocaleDateString("en-US", { month: "short", day: "numeric" })} → ${new Date(new Date(h.period_end).getTime() - 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                </span>
                <span className={`text-sm font-bold tabular-nums w-24 shrink-0 ${h.success ? "text-emerald-400" : "text-amber-400"}`}>
                  {h.current} <span className="text-slate-500 font-normal">/ {h.target}</span>
                </span>
                {unit === "wins" && <span className="text-slate-600 text-xs w-20 shrink-0 tabular-nums">{h.total_games} games</span>}
                <div className="flex-1 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${h.success ? "bg-emerald-500" : "bg-amber-500"}`}
                    style={{ width: `${Math.min(100, Math.round((h.current / h.target) * 100))}%` }}
                  />
                </div>
                <span className={`text-xs font-bold tabular-nums w-12 text-right shrink-0 ${h.success ? "text-emerald-400" : "text-amber-400"}`}>
                  {h.success ? "Hit" : `${Math.min(100, Math.round((h.current / h.target) * 100))}%`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function RankDetails({ objective }) {
  const [snapshot, setSnapshot] = useState(null)
  const [player, setPlayer] = useState(null)
  const isSmurf = !!objective.account?.puuid

  const fetchPlayer = async () => {
    try {
      const { ok, data, code } = await api.get(`/player/${objective.player_id}`)
      if (!ok) return toast.error(code || "Failed to fetch player")
      setPlayer(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch player")
    }
  }

  const fetchSnapshot = async () => {
    try {
      const { ok, data, code } = await api.post("/solo-objectif-result/search", { solo_objectif_id: objective._id })
      if (!ok) return toast.error(code || "Failed to fetch snapshot")
      setSnapshot(data[0] || null)
    } catch (error) {
      toast.error(error.code || "Failed to fetch snapshot")
    }
  }

  useEffect(() => {
    if (isSmurf) fetchSnapshot()
    if (!isSmurf) fetchPlayer()
  }, [objective._id, isSmurf])

  const tier = isSmurf ? snapshot?.tier : player?.current_tier
  const rank = isSmurf ? snapshot?.rank : player?.current_rank
  const lp = isSmurf ? snapshot?.lp : player?.current_lp

  const targetTier = objective.rule?.target_tier
  const targetDivision = objective.rule?.target_division
  const targetLp = objective.rule?.target_lp || 0

  const APEX = new Set(["MASTER", "GRANDMASTER", "CHALLENGER"])
  const tierIdx = TIER_ORDER.indexOf(tier)
  const divIdx = APEX.has(tier) ? 0 : DIVISION_ORDER.indexOf(rank)
  const targetTierIdx = TIER_ORDER.indexOf(targetTier)
  const targetDivIdx = APEX.has(targetTier) ? 0 : DIVISION_ORDER.indexOf(targetDivision)

  const currentScore = tierIdx >= 0 ? tierIdx * 400 + (divIdx >= 0 ? divIdx * 100 : 0) + (lp || 0) : 0
  const targetScore = targetTierIdx >= 0 ? targetTierIdx * 400 + (targetDivIdx >= 0 ? targetDivIdx * 100 : 0) + targetLp : 0
  const progress = targetScore > 0 ? Math.min(100, Math.round((currentScore / targetScore) * 100)) : 0

  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-700/30 rounded-lg p-4 flex items-center gap-3">
          {tier && <img src={`/rank/${tier.toLowerCase()}.png`} alt="" className="w-12 h-12" onError={e => (e.target.style.display = "none")} />}
          <div>
            <p className="text-slate-500 text-[10px] uppercase tracking-wide">Current</p>
            <p className="text-white text-lg font-bold">{tier ? `${tier.charAt(0) + tier.slice(1).toLowerCase()}${rank ? ` ${rank}` : ""}` : "Unranked"}</p>
            {tier && <p className="text-slate-500 text-xs tabular-nums">{lp ?? 0} LP</p>}
          </div>
        </div>
        <div
          className={`rounded-lg p-4 flex items-center gap-3 ${objective.completed ? "bg-emerald-500/10 ring-1 ring-emerald-500/30" : "bg-yellow-500/5 ring-1 ring-yellow-500/20"}`}
        >
          {targetTier && <img src={`/rank/${targetTier.toLowerCase()}.png`} alt="" className="w-12 h-12" onError={e => (e.target.style.display = "none")} />}
          <div>
            <p className="text-slate-500 text-[10px] uppercase tracking-wide">Target</p>
            <p className={`text-lg font-bold ${objective.completed ? "text-emerald-400" : "text-yellow-400"}`}>
              {targetTier ? `${targetTier.charAt(0) + targetTier.slice(1).toLowerCase()}${targetDivision ? ` ${targetDivision}` : ""}` : "—"}
            </p>
            {targetLp > 0 && <p className="text-slate-500 text-xs tabular-nums">{targetLp} LP</p>}
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-2">
          <p className="text-slate-400 text-sm">Progress</p>
          <p className={`text-sm font-bold tabular-nums ${objective.completed ? "text-emerald-400" : "text-yellow-400"}`}>
            {objective.completed ? `Reached on ${objective.completed_at ? new Date(objective.completed_at).toLocaleDateString() : "?"}` : `${progress}%`}
          </p>
        </div>
        <div className="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${objective.completed ? "bg-emerald-500" : "bg-yellow-500"}`} style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  )
}

function ObjectiveDetails({ objective }) {
  const [data, setData] = useState(null)

  const fetchStats = async () => {
    try {
      const { ok, data, code } = await api.post("/solo-objectif-result/per-game-stats", { solo_objectif_id: objective._id })
      if (!ok) return toast.error(code || "Failed to fetch stats")
      setData(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch stats")
    }
  }

  useEffect(() => {
    fetchStats()
  }, [objective._id])

  if (!data) return <ObjectiveHeader objective={objective} />
  if (data.kpis.total === 0) {
    return (
      <>
        <ObjectiveHeader objective={objective} />
        <p className="text-slate-500 text-sm text-center py-8">No games yet</p>
      </>
    )
  }

  return (
    <div className="space-y-4">
      <ObjectiveHeader objective={objective}>
        <Kpis data={data} />
      </ObjectiveHeader>
      <ValuesChart data={data} />
      <Breakdowns data={data} />
      <WinImpact data={data} />
    </div>
  )
}

function Kpis({ data }) {
  return (
    <div className="flex items-stretch divide-x divide-slate-700/50 bg-slate-900/40 rounded-lg border border-slate-700/40">
      <div className="px-4 py-2 min-w-[90px]">
        <p className="text-slate-500 text-[10px] uppercase tracking-wide">Games</p>
        <p className="text-white text-lg font-bold tabular-nums leading-tight">{data.kpis.total}</p>
        {data.first_game_date && (
          <p className="text-slate-600 text-[10px]">since {new Date(data.first_game_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
        )}
      </div>
      <div className="px-4 py-2 min-w-[90px]">
        <p className="text-slate-500 text-[10px] uppercase tracking-wide">Success</p>
        <p className={`text-lg font-bold tabular-nums leading-tight ${data.kpis.rate >= 70 ? "text-emerald-400" : data.kpis.rate >= 50 ? "text-amber-400" : "text-red-400"}`}>
          {data.kpis.rate}%
        </p>
        <p className="text-slate-600 text-[10px] tabular-nums">
          <span className="text-emerald-400/70">{data.kpis.success}</span> / <span className="text-red-400/70">{data.kpis.fail}</span>
        </p>
      </div>
      <div className="px-4 py-2 min-w-[90px]">
        <p className="text-slate-500 text-[10px] uppercase tracking-wide">Average</p>
        <p className="text-white text-lg font-bold tabular-nums leading-tight">
          {data.kpis.avg ?? "-"}
          {data.target != null && <span className="text-slate-500 text-xs font-normal ml-1">/ {data.target}</span>}
        </p>
        <p className="text-slate-600 text-[10px]">{data.metric}</p>
      </div>
      <div className="px-4 py-2 min-w-[90px]">
        <p className="text-slate-500 text-[10px] uppercase tracking-wide">Last 10</p>
        <p
          className={`text-lg font-bold tabular-nums leading-tight ${data.kpis.last10_rate >= 70 ? "text-emerald-400" : data.kpis.last10_rate >= 50 ? "text-amber-400" : "text-red-400"}`}
        >
          {data.kpis.last10_rate ?? "-"}%
        </p>
        {data.kpis.last10_delta != null ? (
          <p className={`text-[10px] tabular-nums ${data.kpis.last10_delta > 0 ? "text-emerald-400/80" : data.kpis.last10_delta < 0 ? "text-red-400/80" : "text-slate-600"}`}>
            {data.kpis.last10_delta > 0 ? "▲ +" : data.kpis.last10_delta < 0 ? "▼ " : ""}
            {data.kpis.last10_delta} pts
          </p>
        ) : (
          <p className="text-slate-600 text-[10px]">—</p>
        )}
      </div>
      <div className="px-4 py-2 min-w-[90px]">
        <p className="text-slate-500 text-[10px] uppercase tracking-wide">Win impact</p>
        {data.kpis.impact_lift != null ? (
          <p
            className={`text-lg font-bold tabular-nums leading-tight ${data.kpis.impact_lift > 0 ? "text-emerald-400" : data.kpis.impact_lift < 0 ? "text-red-400" : "text-slate-400"}`}
          >
            {data.kpis.impact_lift > 0 ? "+" : ""}
            {data.kpis.impact_lift} pts
          </p>
        ) : (
          <p className="text-slate-500 text-lg font-bold leading-tight">-</p>
        )}
        <p className="text-slate-600 text-[10px]">WR when hit</p>
      </div>
    </div>
  )
}

function ValuesChart({ data }) {
  const dense = data.series.filter(p => p.value != null).length > 60
  const points = dense
    ? data.daily.map(d => ({ key: d.date, time: new Date(d.date).getTime(), value: d.avg, rate: d.rate, total: d.total, success: d.rate >= 50 }))
    : data.series
        .filter(p => p.value != null)
        .map(p => ({ key: p.matchId, time: new Date(p.game_date).getTime(), value: p.value, success: p.success, champion: p.champion, opponent: p.opponent }))
  if (points.length === 0) return null

  const line = data.daily.map(d => ({ time: new Date(d.date).getTime(), value: d.trend }))

  const w = 800
  const h = 240
  const pad = { l: 44, r: 28, t: 16, b: 34 }
  const innerW = w - pad.l - pad.r
  const innerH = h - pad.t - pad.b

  const values = points.map(p => p.value)
  if (data.target != null) values.push(data.target)
  const yMin = Math.min(0, Math.min(...values))
  const yMax = Math.max(...values) * 1.1 || 1
  const tMin = Math.min(...points.map(p => p.time))
  const tMax = Math.max(...points.map(p => p.time))
  const x = t => pad.l + (tMax === tMin ? innerW / 2 : ((t - tMin) / (tMax - tMin)) * innerW)
  const y = v => pad.t + innerH - ((v - yMin) / (yMax - yMin)) * innerH

  const yTicks = [0, 1, 2, 3, 4].map(i => yMin + ((yMax - yMin) * i) / 4)
  const xTicks = [0, 1, 2, 3, 4, 5].map(i => tMin + ((tMax - tMin) * i) / 5)

  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-slate-400 text-sm font-medium">{dense ? "Daily average" : "Values per game"}</p>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/40 text-slate-400 tabular-nums">
          {data.kpis.total} games{dense ? ` · ${points.length} days` : ""}
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
        {yTicks.map(t => (
          <g key={t}>
            <line x1={pad.l} y1={y(t)} x2={pad.l + innerW} y2={y(t)} stroke="rgb(51 65 85)" strokeWidth="1" opacity="0.5" />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" className="fill-slate-500" fontSize="11">
              {Number.isInteger(t) ? t : t.toFixed(yMax - yMin < 2 ? 2 : 1)}
            </text>
          </g>
        ))}
        {xTicks.map(t => (
          <text key={t} x={x(t)} y={h - 10} textAnchor="middle" className="fill-slate-500" fontSize="11">
            {new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </text>
        ))}
        {data.target != null && (
          <>
            <line x1={pad.l} y1={y(data.target)} x2={pad.l + innerW} y2={y(data.target)} stroke="rgb(168 85 247)" strokeWidth="1.5" strokeDasharray="5 4" opacity="0.8" />
            <text x={pad.l + innerW + 6} y={y(data.target) + 4} className="fill-violet-400" fontSize="11" fontWeight="600">
              {data.target}
            </text>
          </>
        )}
        {line.length > 1 && (
          <path
            d={line
              .map((p, i) => {
                if (i === 0) return `M ${x(p.time).toFixed(1)} ${y(p.value).toFixed(1)}`
                const p0 = line[i - 2] || line[i - 1]
                const p1 = line[i - 1]
                const p3 = line[i + 1] || p
                return `C ${(x(p1.time) + (x(p.time) - x(p0.time)) / 6).toFixed(1)} ${(y(p1.value) + (y(p.value) - y(p0.value)) / 6).toFixed(1)}, ${(x(p.time) - (x(p3.time) - x(p1.time)) / 6).toFixed(1)} ${(y(p.value) - (y(p3.value) - y(p1.value)) / 6).toFixed(1)}, ${x(p.time).toFixed(1)} ${y(p.value).toFixed(1)}`
              })
              .join(" ")}
            fill="none"
            stroke="rgb(245 158 11)"
            strokeWidth="2"
            strokeLinejoin="round"
            opacity="0.9"
          />
        )}
        {points.map(p => (
          <circle
            key={p.key}
            cx={x(p.time)}
            cy={y(p.value)}
            r={dense ? Math.min(4, 1.5 + Math.sqrt(p.total) / 2) : 2.5}
            className={p.success ? "fill-emerald-400" : "fill-red-400"}
            opacity={dense ? 0.7 : 0.85}
          >
            <title>
              {dense
                ? `${new Date(p.time).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · ${p.total} game${p.total !== 1 ? "s" : ""} · avg ${p.value} · ${p.rate}% hit`
                : `${new Date(p.time).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · ${p.champion || ""}${p.opponent ? ` vs ${p.opponent}` : ""} · ${p.value} ${data.metric}`}
            </title>
          </circle>
        ))}
      </svg>
      <div className="flex items-center gap-4 text-[11px] text-slate-500 mt-1 flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          {dense ? "day ≥ 50% hit" : "hit"}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
          {dense ? "day < 50% hit" : "missed"}
        </span>
        {dense && <span className="text-slate-600">dot size = games that day</span>}
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 border-t-2 border-dashed border-violet-400" />
          target
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-0.5 bg-amber-500" />
          trend (avg over {data.trend_days} played days)
        </span>
      </div>
    </div>
  )
}

function Breakdowns({ data }) {
  const [tab, setTab] = useState("week")
  if (data.weeks.length === 0 && data.champions.length === 0) return null

  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3 border-b border-slate-700/50">
        <div className="flex items-center">
          <button
            onClick={() => setTab("week")}
            className={`px-3 pb-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === "week" ? "text-amber-400 border-amber-400" : "text-slate-500 border-transparent hover:text-slate-300"}`}
          >
            Per week
          </button>
          <button
            onClick={() => setTab("champion")}
            className={`px-3 pb-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === "champion" ? "text-amber-400 border-amber-400" : "text-slate-500 border-transparent hover:text-slate-300"}`}
          >
            Per champion
          </button>
        </div>
        <p className="text-slate-600 text-[10px] uppercase tracking-wide pb-2">{tab === "week" ? "Click a week to see games" : "Click a champion to see matchups"}</p>
      </div>
      {tab === "week" && <WeeklyBreakdown data={data} />}
      {tab === "champion" && <ChampionBreakdown data={data} />}
    </div>
  )
}

function WeeklyBreakdown({ data }) {
  const [openWeek, setOpenWeek] = useState(null)
  const [showAll, setShowAll] = useState(false)
  if (data.weeks.length === 0) return <p className="text-slate-600 text-xs text-center py-4">No data</p>

  return (
    <div className="space-y-1">
      {(showAll ? data.weeks : data.weeks.slice(0, 5)).map(w => (
        <div key={w.start} className={`rounded-lg ${openWeek === w.start ? "bg-slate-700/30" : "hover:bg-slate-700/20"}`}>
          <button onClick={() => setOpenWeek(openWeek === w.start ? null : w.start)} className="w-full px-3 py-2 flex items-center gap-3 text-left">
            <ChevronDown className={`w-3.5 h-3.5 text-slate-500 shrink-0 transition-transform ${openWeek === w.start ? "" : "-rotate-90"}`} />
            <span className="text-slate-400 text-xs w-32 shrink-0">
              {new Date(w.start).toLocaleDateString("en-US", { month: "short", day: "numeric" })} →{" "}
              {new Date(new Date(w.end).getTime() - 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
            <span className="text-slate-600 text-xs w-16 shrink-0 tabular-nums">
              {w.total} game{w.total !== 1 ? "s" : ""}
            </span>
            <span className={`text-sm font-bold tabular-nums w-20 shrink-0 ${w.rate >= 70 ? "text-emerald-400" : w.rate >= 50 ? "text-amber-400" : "text-red-400"}`}>
              {w.rate}%{" "}
              <span className="text-slate-500 text-[11px] font-normal">
                {w.success}/{w.total}
              </span>
            </span>
            <div className="flex-1 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${w.rate >= 70 ? "bg-emerald-500" : w.rate >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${w.rate}%` }} />
            </div>
            <span className="text-xs text-slate-300 w-28 shrink-0 tabular-nums">
              avg <span className="text-white font-bold">{w.avg ?? "-"}</span> <span className="text-slate-500 text-[10px] uppercase">{data.metric}</span>
            </span>
            <span className={`text-xs font-bold tabular-nums w-12 text-right shrink-0 ${w.delta > 0 ? "text-emerald-400" : w.delta < 0 ? "text-red-400" : "text-slate-600"}`}>
              {w.delta == null ? "—" : w.delta > 0 ? `▲ ${w.delta}` : w.delta < 0 ? `▼ ${Math.abs(w.delta)}` : "= 0"}
            </span>
          </button>
          {openWeek === w.start && (
            <div className="px-3 pb-3 pl-10 space-y-0.5">
              {w.games.map(g => (
                <div key={g.matchId} className="flex items-center gap-3 px-2 py-1 rounded hover:bg-slate-800/60 text-xs">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${g.success ? "bg-emerald-400" : "bg-red-400"}`} />
                  <span className="text-slate-500 text-[11px] w-28 shrink-0 tabular-nums">
                    {new Date(g.game_date).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {g.champion && <img src={getChampionIcon(g.champion)} alt={g.champion} className="w-5 h-5 rounded shrink-0" />}
                  <span className="text-slate-300 w-24 truncate">{g.champion || "-"}</span>
                  {g.opponent && (
                    <>
                      <span className="text-slate-600 text-[10px]">vs</span>
                      <img src={getChampionIcon(g.opponent)} alt={g.opponent} className="w-5 h-5 rounded shrink-0" />
                      <span className="text-slate-500 w-24 truncate">{g.opponent}</span>
                    </>
                  )}
                  {g.win != null && <span className={`w-10 shrink-0 ${g.win ? "text-emerald-400/80" : "text-red-400/80"}`}>{g.win ? "Win" : "Loss"}</span>}
                  <span className={`ml-auto font-bold tabular-nums ${g.success ? "text-emerald-400" : "text-red-400"}`}>
                    {g.value ?? "-"} <span className="text-slate-500 font-normal text-[10px] uppercase">{data.metric}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      {data.weeks.length > 5 && (
        <button onClick={() => setShowAll(v => !v)} className="w-full py-2 text-xs text-slate-500 hover:text-amber-400 transition-colors">
          {showAll ? "Show less" : `Show ${data.weeks.length - 5} more`}
        </button>
      )}
    </div>
  )
}

function ChampionBreakdown({ data }) {
  const [openChamp, setOpenChamp] = useState(null)
  const [showAll, setShowAll] = useState(false)
  if (data.champions.length === 0) return <p className="text-slate-600 text-xs text-center py-4">No data</p>

  return (
    <div className="space-y-1">
      {(showAll ? data.champions : data.champions.slice(0, 5)).map(c => (
        <div key={c.name} className={`rounded-lg ${openChamp === c.name ? "bg-slate-700/30" : "hover:bg-slate-700/20"}`}>
          <button onClick={() => setOpenChamp(openChamp === c.name ? null : c.name)} className="w-full px-3 py-2 flex items-center gap-3 text-left">
            <ChevronDown className={`w-3.5 h-3.5 text-slate-500 shrink-0 transition-transform ${openChamp === c.name ? "" : "-rotate-90"}`} />
            <img src={getChampionIcon(c.name)} alt={c.name} className="w-6 h-6 rounded shrink-0" />
            <span className="text-white text-sm font-semibold w-28 truncate">{c.name}</span>
            <span className="text-slate-600 text-xs w-16 shrink-0 tabular-nums">
              {c.total} game{c.total !== 1 ? "s" : ""}
            </span>
            <span className={`text-sm font-bold tabular-nums w-14 shrink-0 ${c.rate >= 70 ? "text-emerald-400" : c.rate >= 50 ? "text-amber-400" : "text-red-400"}`}>
              {c.rate}%
            </span>
            <div className="flex-1 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${c.rate >= 70 ? "bg-emerald-500" : c.rate >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${c.rate}%` }} />
            </div>
            <span className="text-xs text-slate-300 w-28 shrink-0 tabular-nums">
              avg <span className="text-white font-bold">{c.avg ?? "-"}</span> <span className="text-slate-500 text-[10px] uppercase">{data.metric}</span>
            </span>
            <span className="text-slate-500 text-[11px] w-16 text-right shrink-0 tabular-nums">{c.winrate != null ? `${c.winrate}% WR` : ""}</span>
          </button>
          {openChamp === c.name && (
            <div className="px-3 pb-3 pl-14 space-y-0.5">
              {c.matchups.length === 0 && <p className="text-slate-600 text-xs">No opponent data</p>}
              {c.matchups.map(m => (
                <div key={m.opponent} className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-slate-800/60 text-xs">
                  <span className="text-slate-500 shrink-0">vs</span>
                  <img src={getChampionIcon(m.opponent)} alt={m.opponent} className="w-5 h-5 rounded shrink-0" />
                  <span className="text-white w-28 truncate">{m.opponent}</span>
                  <span className="text-slate-500 w-14 shrink-0 tabular-nums">
                    {m.success}/{m.total}
                  </span>
                  <span className="text-slate-400 w-20 shrink-0 tabular-nums">avg {m.avg ?? "-"}</span>
                  <div className="flex-1 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${m.rate >= 70 ? "bg-emerald-400" : m.rate >= 50 ? "bg-amber-400" : "bg-red-400"}`} style={{ width: `${m.rate}%` }} />
                  </div>
                  <span className={`font-bold tabular-nums w-10 text-right ${m.rate >= 70 ? "text-emerald-400" : m.rate >= 50 ? "text-amber-300" : "text-red-400"}`}>
                    {m.rate}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      {data.champions.length > 5 && (
        <button onClick={() => setShowAll(v => !v)} className="w-full py-2 text-xs text-slate-500 hover:text-amber-400 transition-colors">
          {showAll ? "Show less" : `Show ${data.champions.length - 5} more`}
        </button>
      )}
    </div>
  )
}

function WinImpact({ data }) {
  if (data.impact.success_total === 0 && data.impact.fail_total === 0) return null

  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-slate-400 text-sm font-medium">Win impact</p>
        {data.impact.lift != null && (
          <span className={`text-xs font-bold tabular-nums ${data.impact.lift > 0 ? "text-emerald-400" : data.impact.lift < 0 ? "text-red-400" : "text-slate-400"}`}>
            {data.impact.lift > 0 ? "+" : ""}
            {data.impact.lift} pts WR
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-4">
          <p className="text-emerald-400 text-[10px] uppercase tracking-wide mb-1">Objective hit</p>
          {data.impact.success_rate != null ? (
            <>
              <p className="text-emerald-400 text-2xl font-bold tabular-nums">{data.impact.success_rate}% WR</p>
              <p className="text-slate-500 text-xs mt-1 tabular-nums">
                {data.impact.success_wins}W / {data.impact.success_total - data.impact.success_wins}L
              </p>
            </>
          ) : (
            <p className="text-slate-600 text-xs">-</p>
          )}
        </div>
        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-400 text-[10px] uppercase tracking-wide mb-1">Objective missed</p>
          {data.impact.fail_rate != null ? (
            <>
              <p className="text-red-400 text-2xl font-bold tabular-nums">{data.impact.fail_rate}% WR</p>
              <p className="text-slate-500 text-xs mt-1 tabular-nums">
                {data.impact.fail_wins}W / {data.impact.fail_total - data.impact.fail_wins}L
              </p>
            </>
          ) : (
            <p className="text-slate-600 text-xs">-</p>
          )}
        </div>
      </div>
    </div>
  )
}
