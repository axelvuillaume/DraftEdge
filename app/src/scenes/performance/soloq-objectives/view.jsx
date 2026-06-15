import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { toast } from "react-hot-toast"
import { ArrowLeft, ChevronDown } from "lucide-react"
import api from "@/services/api"
import { getChampionIcon } from "@/utils"

export default function View() {
  const { id } = useParams()
  const navigate = useNavigate()
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
        <button onClick={() => navigate("/performance/soloq-objectives")} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <ObjectiveHeader objective={objective} />

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

function ObjectiveHeader({ objective }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-1 flex-wrap">
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
          <span className={`text-[10px] px-2 py-0.5 rounded font-medium uppercase tracking-wide ${objective.side === "blue" ? "text-blue-400/80 bg-blue-500/10" : "text-red-400/80 bg-red-500/10"}`}>
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
      <p className="text-slate-500 text-sm">{objective.player_name}</p>
      {objective.request && <p className="text-slate-400 text-sm mt-2">{objective.request}</p>}
      {objective.rule && <div className="text-xs text-slate-500 bg-slate-700/40 inline-block px-2 py-1 rounded font-mono mt-3">{formatRule(objective)}</div>}
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
  const minGames = objective.aggregate?.minGames || 0
  const successCount = history.filter(h => h.success).length
  const reversed = [...history].reverse()
  const current = reversed[0]
  const currentNotEnough = current && current.current == null && minGames > 0 && current.total_games < minGames
  const currentProgress = current && current.current != null && current.target > 0 ? Math.min(100, Math.round((current.current / current.target) * 100)) : 0
  const fmtRange = (start, end) => {
    const s = new Date(start)
    const e = new Date(end)
    e.setDate(e.getDate() - 1)
    if (objective.aggregate?.period === "daily") return s.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    return `${s.toLocaleDateString("en-US", { month: "short", day: "numeric" })} → ${e.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
          <p className="text-slate-500 text-[10px] uppercase tracking-wide mb-1">{periodLabel}s tracked</p>
          <p className="text-white text-2xl font-bold tabular-nums">{history.length}</p>
        </div>
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
          <p className="text-slate-500 text-[10px] uppercase tracking-wide mb-1">Hit target</p>
          <p className="text-emerald-400 text-2xl font-bold tabular-nums">{successCount}</p>
        </div>
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
          <p className="text-slate-500 text-[10px] uppercase tracking-wide mb-1">Missed</p>
          <p className="text-red-400 text-2xl font-bold tabular-nums">{history.length - successCount}</p>
        </div>
      </div>

      {current && objective.aggregate?.period !== "total" && (
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-slate-400 text-sm font-medium">Current {periodLabel.toLowerCase()}</p>
            {currentNotEnough ? (
              <p className="text-slate-500 text-sm font-bold">N/A · {current.total_games}/{minGames} games</p>
            ) : (
              <p className={`text-sm font-bold tabular-nums ${current.success ? "text-emerald-400" : "text-amber-400"}`}>{current.success ? "Hit" : `${currentProgress}%`}</p>
            )}
          </div>
          {currentNotEnough ? (
            <p className="text-slate-500 text-sm mb-3">Not enough games yet to evaluate.</p>
          ) : (
            <div className="flex items-baseline gap-2 mb-3">
              <span className={`text-4xl font-bold tabular-nums ${current.success ? "text-emerald-400" : "text-amber-400"}`}>{current.current ?? 0}</span>
              <span className="text-slate-500 text-xl tabular-nums">/ {current.target}</span>
            </div>
          )}
          <div className="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${currentNotEnough ? "bg-slate-600" : current.success ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${currentNotEnough ? Math.round((current.total_games / minGames) * 100) : currentProgress}%` }} />
          </div>
        </div>
      )}

      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
        <p className="text-slate-400 text-sm font-medium mb-3">History per {periodLabel.toLowerCase()}</p>
        <div className="space-y-2">
          {reversed.map(h => {
            const notEnough = h.current == null && minGames > 0 && h.total_games < minGames
            const prog = !notEnough && h.current != null && h.target > 0 ? Math.min(100, Math.round((h.current / h.target) * 100)) : 0
            const wr = h.total_games > 0 ? Math.round((h.wins / h.total_games) * 100) : null
            return (
              <div key={h.period_start} className="px-3 py-2 rounded-lg hover:bg-slate-700/30 space-y-1.5">
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 text-xs w-44 shrink-0">{fmtRange(h.period_start, h.period_end)}</span>
                  {notEnough ? (
                    <span className="text-slate-500 text-sm font-bold tabular-nums w-20">N/A</span>
                  ) : (
                    <span className={`text-sm font-bold tabular-nums w-20 ${h.success ? "text-emerald-400" : "text-amber-400"}`}>
                      {h.current ?? 0} / {h.target}
                    </span>
                  )}
                  <span className="text-slate-600 text-xs w-20 tabular-nums">{h.total_games} games</span>
                  {wr != null && (
                    <span className={`text-xs font-bold tabular-nums w-14 ${wr >= 60 ? "text-emerald-400" : wr >= 50 ? "text-amber-300" : "text-red-400"}`}>{wr}% WR</span>
                  )}
                  <div className="flex-1 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${notEnough ? "bg-slate-600" : h.success ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${notEnough ? Math.round((h.total_games / minGames) * 100) : prog}%` }} />
                  </div>
                  {notEnough ? (
                    <span className="text-slate-500 text-xs tabular-nums w-10 text-right">{h.total_games}/{minGames}</span>
                  ) : (
                    <span className={`text-xs font-bold tabular-nums w-10 text-right ${h.success ? "text-emerald-400" : "text-amber-400"}`}>{prog}%</span>
                  )}
                </div>
                {h.champions?.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap pl-44">
                    {h.champions.map(c => (
                      <div key={c.name} className="flex items-center gap-1.5 bg-slate-700/40 rounded px-1.5 py-0.5" title={c.name}>
                        <img src={getChampionIcon(c.name)} alt={c.name} className="w-4 h-4 rounded" />
                        <span className="text-[10px] text-slate-400 tabular-nums">{c.games}g</span>
                        <span className="text-[10px] tabular-nums">
                          <span className="text-emerald-400/80">{c.wins}W</span>
                          <span className="text-slate-600">/</span>
                          <span className="text-red-400/80">{c.losses}L</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
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
            <p className="text-white text-lg font-bold">
              {tier ? `${tier.charAt(0) + tier.slice(1).toLowerCase()}${rank ? ` ${rank}` : ""}` : "Unranked"}
            </p>
            {tier && <p className="text-slate-500 text-xs tabular-nums">{lp ?? 0} LP</p>}
          </div>
        </div>
        <div className={`rounded-lg p-4 flex items-center gap-3 ${objective.completed ? "bg-emerald-500/10 ring-1 ring-emerald-500/30" : "bg-yellow-500/5 ring-1 ring-yellow-500/20"}`}>
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
  const [results, setResults] = useState([])

  const fetchResults = async () => {
    try {
      const { ok, data, code } = await api.post("/solo-objectif-result/search", { solo_objectif_id: objective._id })
      if (!ok) return toast.error(code || "Failed to fetch results")
      setResults(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch results")
    }
  }

  useEffect(() => {
    fetchResults()
  }, [objective._id])

  const successCount = results.filter(r => r.success).length

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
          <p className="text-slate-500 text-[10px] uppercase tracking-wide mb-1">Games</p>
          <p className="text-white text-2xl font-bold tabular-nums">{results.length}</p>
        </div>
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
          <p className="text-slate-500 text-[10px] uppercase tracking-wide mb-1">Success</p>
          <p className="text-emerald-400 text-2xl font-bold tabular-nums">{successCount}</p>
        </div>
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
          <p className="text-slate-500 text-[10px] uppercase tracking-wide mb-1">Failed</p>
          <p className="text-red-400 text-2xl font-bold tabular-nums">{results.length - successCount}</p>
        </div>
      </div>

      <ResultsChart results={results} target={objective.rule?.value} />
      <WinrateCorrelation results={results} playerId={objective.player_id} />
      <MatchupBreakdown results={results} playerId={objective.player_id} />
    </div>
  )
}

function ResultsChart({ results, target }) {
  const points = results.filter(r => r.actual_value != null).map(r => ({ value: r.actual_value, success: r.success }))
  if (points.length === 0) return null

  const w = 800
  const h = 220
  const pad = { l: 40, r: 16, t: 16, b: 24 }
  const innerW = w - pad.l - pad.r
  const innerH = h - pad.t - pad.b

  const values = points.map(p => p.value)
  if (target != null) values.push(target)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const yMin = min - range * 0.1
  const yMax = max + range * 0.1
  const yRange = yMax - yMin

  const x = i => pad.l + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW)
  const y = v => pad.t + innerH - ((v - yMin) / yRange) * innerH

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.value)}`).join(" ")
  const targetY = target != null ? y(target) : null

  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
      <p className="text-slate-400 text-sm font-medium mb-3">Values over time</p>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
        <line x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t + innerH} stroke="rgb(51 65 85)" strokeWidth="1" />
        <line x1={pad.l} y1={pad.t + innerH} x2={pad.l + innerW} y2={pad.t + innerH} stroke="rgb(51 65 85)" strokeWidth="1" />
        <text x={pad.l - 6} y={pad.t + 4} textAnchor="end" className="fill-slate-500" fontSize="11">{yMax.toFixed(1)}</text>
        <text x={pad.l - 6} y={pad.t + innerH} textAnchor="end" className="fill-slate-500" fontSize="11">{yMin.toFixed(1)}</text>
        {targetY != null && (
          <>
            <line x1={pad.l} y1={targetY} x2={pad.l + innerW} y2={targetY} stroke="rgb(168 85 247)" strokeWidth="1" strokeDasharray="4 3" opacity="0.6" />
            <text x={pad.l + innerW + 4} y={targetY + 4} className="fill-violet-400" fontSize="11">{target}</text>
          </>
        )}
        <path d={path} fill="none" stroke="rgb(100 116 139)" strokeWidth="1.5" opacity="0.5" />
        {points.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.value)} r="3.5" className={p.success ? "fill-emerald-400" : "fill-red-400"} />
        ))}
      </svg>
    </div>
  )
}

function WinrateCorrelation({ results, playerId }) {
  const [matches, setMatches] = useState([])

  const fetchMatches = async () => {
    try {
      const { ok, data, code } = await api.post("/soloq-match/search", { player_id: playerId, queueId: 420 })
      if (!ok) return toast.error(code || "Failed to fetch matches")
      setMatches(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch matches")
    }
  }

  useEffect(() => {
    fetchMatches()
  }, [playerId])

  const winByMatch = {}
  for (const m of matches) winByMatch[m.matchId] = m.win

  let succWin = 0
  let succTotal = 0
  let failWin = 0
  let failTotal = 0
  for (const r of results) {
    if (!r.matchId || winByMatch[r.matchId] == null) continue
    if (r.success) {
      succTotal++
      if (winByMatch[r.matchId]) succWin++
      continue
    }
    failTotal++
    if (winByMatch[r.matchId]) failWin++
  }

  if (succTotal === 0 && failTotal === 0) return null

  const succRate = succTotal > 0 ? Math.round((succWin / succTotal) * 100) : null
  const failRate = failTotal > 0 ? Math.round((failWin / failTotal) * 100) : null
  const lift = succRate != null && failRate != null ? succRate - failRate : null

  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-slate-400 text-sm font-medium">Win impact</p>
        {lift != null && (
          <span className={`text-xs font-bold tabular-nums ${lift > 0 ? "text-emerald-400" : lift < 0 ? "text-red-400" : "text-slate-400"}`}>
            {lift > 0 ? "+" : ""}
            {lift} pts WR
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-4">
          <p className="text-emerald-400 text-[10px] uppercase tracking-wide mb-1">Objective hit</p>
          {succRate != null ? (
            <>
              <p className="text-emerald-400 text-2xl font-bold tabular-nums">{succRate}% WR</p>
              <p className="text-slate-500 text-xs mt-1 tabular-nums">
                {succWin}W / {succTotal - succWin}L
              </p>
            </>
          ) : (
            <p className="text-slate-600 text-xs">-</p>
          )}
        </div>
        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-400 text-[10px] uppercase tracking-wide mb-1">Objective missed</p>
          {failRate != null ? (
            <>
              <p className="text-red-400 text-2xl font-bold tabular-nums">{failRate}% WR</p>
              <p className="text-slate-500 text-xs mt-1 tabular-nums">
                {failWin}W / {failTotal - failWin}L
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

function MatchupBreakdown({ results, playerId }) {
  const [matches, setMatches] = useState([])

  const fetchMatches = async () => {
    try {
      const { ok, data, code } = await api.post("/soloq-match/search", { player_id: playerId, queueId: 420 })
      if (!ok) return toast.error(code || "Failed to fetch matches")
      setMatches(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch matches")
    }
  }

  useEffect(() => {
    fetchMatches()
  }, [playerId])

  const oppByMatch = {}
  for (const m of matches) {
    if (m.opponentChampion) oppByMatch[m.matchId] = m.opponentChampion
  }

  const byChampOpp = {}
  for (const r of results) {
    if (!r.champion) continue
    const opp = oppByMatch[r.matchId]
    if (!opp) continue
    const key = `${r.champion}|||${opp}`
    if (!byChampOpp[key]) byChampOpp[key] = { champion: r.champion, opponent: opp, games: 0, success: 0, sum: 0, count: 0 }
    byChampOpp[key].games++
    if (r.success) byChampOpp[key].success++
    if (r.actual_value != null) {
      byChampOpp[key].sum += r.actual_value
      byChampOpp[key].count++
    }
  }
  const rows = Object.values(byChampOpp)
    .map(s => ({ ...s, rate: Math.round((s.success / s.games) * 100), avg: s.count > 0 ? s.sum / s.count : null }))
    .sort((a, b) => b.games - a.games)

  if (rows.length === 0) return null

  const byChampion = {}
  for (const row of rows) {
    if (!byChampion[row.champion]) byChampion[row.champion] = []
    byChampion[row.champion].push(row)
  }

  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
      <p className="text-slate-400 text-sm font-medium mb-3">Matchups (champion played vs opponent)</p>
      <div className="space-y-4">
        {Object.entries(byChampion).map(([champion, oppRows]) => (
          <ChampionMatchups key={champion} champion={champion} oppRows={oppRows} />
        ))}
      </div>
    </div>
  )
}

function ChampionMatchups({ champion, oppRows }) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 mb-2 w-full group">
        <img src={getChampionIcon(champion)} alt={champion} className="w-6 h-6 rounded" />
        <span className="text-white text-sm font-semibold group-hover:text-emerald-400 transition-colors">{champion}</span>
        <span className="text-slate-600 text-xs">{oppRows.reduce((a, r) => a + r.games, 0)} games</span>
        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${open ? "" : "-rotate-90"}`} />
      </button>
      {open && (
        <div className="space-y-1 pl-2">
          {oppRows.map(row => (
            <div key={row.opponent} className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-slate-700/30">
              <span className="text-slate-500 text-xs shrink-0">vs</span>
              <img src={getChampionIcon(row.opponent)} alt={row.opponent} className="w-6 h-6 rounded shrink-0" />
              <span className="text-white text-xs font-medium w-28 truncate">{row.opponent}</span>
              <span className="text-slate-500 text-xs w-16 tabular-nums">
                {row.success}/{row.games}
              </span>
              {row.avg != null && <span className="text-slate-400 text-xs w-20 tabular-nums">avg {row.avg.toFixed(1)}</span>}
              <div className="flex-1 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${row.rate >= 70 ? "bg-emerald-400" : row.rate >= 50 ? "bg-amber-400" : "bg-red-400"}`} style={{ width: `${row.rate}%` }} />
              </div>
              <span className={`text-xs font-bold tabular-nums w-10 text-right ${row.rate >= 70 ? "text-emerald-400" : row.rate >= 50 ? "text-amber-300" : "text-red-400"}`}>{row.rate}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

