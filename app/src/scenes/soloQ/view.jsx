import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, Link } from "react-router-dom"
import { toast } from "react-hot-toast"
import {
  Loader2,
  ArrowLeft,
  Swords,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Check,
  ChevronDown,
  ChevronUp,
  X,
  Plus,
  Info,
  BarChart3,
  Trophy,
  History,
  Target,
  Trash2,
  CheckCircle2,
  Circle
} from "lucide-react"
import api from "@/services/api"
import { getChampionIcon, TIER_COLORS, RANK_ICON_TIERS, ROLE_LABELS, CHAMPION_TIERS, TIER_STYLES, TIER_ORDER } from "@/utils"

// ==================== CONSTANTS ====================

function getRankIcon(tier) {
  if (!tier) return null
  const key = tier.toLowerCase()
  return RANK_ICON_TIERS.has(tier.toUpperCase()) ? `/rank/${key}.png` : null
}

const METRICS = [
  { key: "games", label: "Games", format: v => v, noCompare: true },
  { key: "winRate", label: "WR%", format: v => `${v}%`, higherBetter: true },
  { key: "kda", label: "KDA", format: v => v.toFixed(1), higherBetter: true },
  { key: "csPerMin", label: "CS/m", format: v => v.toFixed(1), higherBetter: true },
  { key: "dmgPerMin", label: "DMG/m", format: v => v.toLocaleString(), higherBetter: true },
  { key: "goldPerMin", label: "Gold/m", format: v => v.toLocaleString(), higherBetter: true },
  { key: "visionScorePerMin", label: "VS/m", format: v => v.toFixed(2), higherBetter: true }
]

// ==================== SMALL COMPONENTS ====================

function DiffIndicator({ soloq, team, higherBetter }) {
  if (soloq == null || team == null) return <Minus className="w-3 h-3 text-slate-600" />
  const diff = team - soloq
  if (Math.abs(diff) < 0.01) return <Minus className="w-3 h-3 text-slate-600" />
  const isGood = higherBetter ? diff > 0 : diff < 0
  return isGood ? <TrendingUp className="w-3 h-3 text-emerald-400" /> : <TrendingDown className="w-3 h-3 text-red-400" />
}

function TierBadge({ tier, small }) {
  if (!tier) return null
  const style = TIER_STYLES[tier]
  if (!style) return null
  return <span className={`${style.bg} ${style.border} ${style.text} border font-bold rounded ${small ? "text-[10px] px-1 py-0.5" : "text-xs px-1.5 py-0.5"}`}>{tier}</span>
}

function MatchIndicator({ manual, auto }) {
  if (!manual || !auto) return null
  const m = TIER_ORDER[manual] || 0
  const a = TIER_ORDER[auto] || 0
  if (m === a) return <Check className="w-3.5 h-3.5 text-emerald-400" />
  if (m > a) return <ChevronDown className="w-3.5 h-3.5 text-orange-400" />
  return <ChevronUp className="w-3.5 h-3.5 text-sky-400" />
}

function StatCard({ label, value, sub, color }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex flex-col">
      <span className="text-slate-500 text-xs uppercase tracking-wider">{label}</span>
      <span className={`text-2xl font-bold mt-1 ${color || "text-white"}`}>{value}</span>
      {sub && <span className="text-slate-500 text-xs mt-0.5">{sub}</span>}
    </div>
  )
}

// ==================== CHAMPION CHIP ====================

function ChampionChip({ name, matchClass, matchLabel, matchIndicator, isManual, onRemove, autoScore, gamesScore, wrScore, kdaScore }) {
  return (
    <div className="relative group" title={!autoScore ? `${name}${matchLabel ? ` - ${matchLabel}` : ""}` : undefined}>
      <div className={`relative ${matchClass || ""}`}>
        <img src={getChampionIcon(name)} alt={name} className="w-9 h-9 rounded-lg border border-slate-600/50" />
        {matchIndicator}
        {isManual && (
          <button onClick={() => onRemove(name)} className="absolute -top-1 -right-1 w-4 h-4 bg-red-500/80 rounded-full items-center justify-center hidden group-hover:flex">
            <X className="w-2.5 h-2.5 text-white" />
          </button>
        )}
      </div>
      {autoScore != null && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none">
          <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-2.5 w-40">
            <p className="text-white text-xs font-semibold mb-1.5">{name}</p>
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Games</span>
                <span className="text-slate-200 tabular-nums">
                  {gamesScore}
                  <span className="text-slate-500">/30</span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Win Rate</span>
                <span className="text-slate-200 tabular-nums">
                  {wrScore}
                  <span className="text-slate-500">/50</span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">KDA</span>
                <span className="text-slate-200 tabular-nums">
                  {kdaScore}
                  <span className="text-slate-500">/20</span>
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-700/50">
                <span className="text-white font-semibold">Total</span>
                <span className="text-white font-semibold tabular-nums">
                  {autoScore}
                  <span className="text-slate-500">/100</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ==================== TIER LIST SECTION ====================

function TierListSection({ title, icon, tooltip, champions, allChampions, isManual, onSetTier, onRemove }) {
  const [addingTier, setAddingTier] = useState(null)
  const [showTooltip, setShowTooltip] = useState(false)
  const tooltipBtnRef = useRef(null)

  const grouped = { S: [], A: [], B: [] }
  for (const champ of champions) {
    if (grouped[champ.tier]) grouped[champ.tier].push(champ)
  }

  const assignedNames = new Set(champions.map(c => c.name))
  const unassigned = allChampions.filter(c => !assignedNames.has(c))

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl">
      <div className="px-4 py-3 border-b border-slate-700/30 flex items-center gap-2">
        {icon}
        <h3 className="text-white font-semibold text-sm">{title}</h3>
        {tooltip && (
          <div className="ml-auto">
            <button
              ref={tooltipBtnRef}
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              className="p-1 rounded hover:bg-slate-700/50 transition-colors"
            >
              <Info className="w-3.5 h-3.5 text-slate-500" />
            </button>
            {showTooltip &&
              tooltipBtnRef.current &&
              (() => {
                const rect = tooltipBtnRef.current.getBoundingClientRect()
                return (
                  <div
                    className="fixed z-50 w-72 p-3 bg-slate-900 border border-slate-700 rounded-lg shadow-xl text-xs text-slate-300 leading-relaxed"
                    style={{ top: rect.bottom + 6, right: window.innerWidth - rect.right }}
                  >
                    {tooltip}
                  </div>
                )
              })()}
          </div>
        )}
      </div>

      <div className="p-3 space-y-2">
        {CHAMPION_TIERS.map(tier => {
          const style = TIER_STYLES[tier]
          const champsInTier = grouped[tier] || []

          return (
            <div key={tier} className={`${style.bg} border ${style.border} rounded-lg p-2 min-h-[52px]`}>
              <div className="flex items-center gap-2">
                <span className={`${style.text} font-bold text-sm w-5 text-center shrink-0`}>{tier}</span>
                <div className="flex flex-wrap items-center gap-1.5 flex-1">
                  {champsInTier.map(champ => (
                    <ChampionChip key={champ.name} {...champ} isManual={isManual} onRemove={onRemove} />
                  ))}
                  {isManual && (
                    <button
                      onClick={() => setAddingTier(addingTier === tier ? null : tier)}
                      className="w-9 h-9 rounded-lg border border-dashed border-slate-600/50 flex items-center justify-center hover:border-slate-500 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 text-slate-500" />
                    </button>
                  )}
                </div>
              </div>

              {isManual && addingTier === tier && unassigned.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5 pt-2 border-t border-slate-700/30">
                  {unassigned.map(name => (
                    <button
                      key={name}
                      onClick={() => {
                        onSetTier(name, tier)
                        setAddingTier(null)
                      }}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors"
                    >
                      <img src={getChampionIcon(name)} alt={name} className="w-5 h-5 rounded" />
                      <span className="text-slate-300 text-xs">{name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ==================== SOLOQ OVERVIEW TAB ====================

function SoloQOverviewTab({ player, soloqOverall, mostPlayed }) {
  const totalRanked = (player.current_wins || 0) + (player.current_losses || 0)
  const rankedWR = totalRanked > 0 ? (((player.current_wins || 0) / totalRanked) * 100).toFixed(1) : null

  return (
    <div className="space-y-6">
      {/* Rank + Overall Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex items-center gap-3 col-span-2 sm:col-span-1">
          {getRankIcon(player.current_tier) && (
            <img
              src={getRankIcon(player.current_tier)}
              alt={player.current_tier}
              className="w-14 h-14 object-contain"
              style={{ filter: `drop-shadow(0 0 8px ${TIER_COLORS[player.current_tier] || "#64748b"}40)` }}
            />
          )}
          <div>
            <span className="text-xs text-slate-500 uppercase tracking-wider">Ranked</span>
            <p className="text-lg font-bold" style={{ color: TIER_COLORS[player.current_tier] || "#94a3b8" }}>
              {player.current_tier || "Unranked"} {player.current_rank || ""}
            </p>
            <p className="text-slate-400 text-sm">{player.current_lp ?? 0} LP</p>
          </div>
        </div>

        <StatCard
          label="W / L"
          value={totalRanked > 0 ? `${player.current_wins || 0} / ${player.current_losses || 0}` : "-"}
          sub={rankedWR ? `${rankedWR}% WR` : null}
          color={rankedWR && parseFloat(rankedWR) >= 50 ? "text-emerald-400" : "text-red-400"}
        />

        {soloqOverall && (
          <>
            <StatCard
              label="KDA (SoloQ)"
              value={soloqOverall.kda.toFixed(1)}
              sub={`${soloqOverall.avgKills} / ${soloqOverall.avgDeaths} / ${soloqOverall.avgAssists}`}
              color={soloqOverall.kda >= 3 ? "text-emerald-400" : soloqOverall.kda >= 2 ? "text-amber-400" : "text-red-400"}
            />
            <StatCard label="Games analyzed" value={soloqOverall.games} sub={`${soloqOverall.winRate}% WR`} color="text-violet-400" />
          </>
        )}
      </div>

      {/* Per-min stats */}
      {soloqOverall && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="CS / min" value={soloqOverall.csPerMin.toFixed(1)} color="text-sky-400" />
          <StatCard label="DMG / min" value={soloqOverall.dmgPerMin.toLocaleString()} color="text-red-400" />
          <StatCard label="Gold / min" value={soloqOverall.goldPerMin.toLocaleString()} color="text-amber-400" />
          <StatCard label="Vision / min" value={soloqOverall.visionScorePerMin.toFixed(2)} color="text-blue-400" />
        </div>
      )}

      {/* Most Played */}
      {mostPlayed && mostPlayed.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-white font-semibold text-sm flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            Most Played
          </h2>

          <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl overflow-hidden">
            <div className="grid grid-cols-[1fr_70px_70px_70px_80px_80px] items-center px-4 py-2 border-b border-slate-700/30 text-xs text-slate-500 uppercase tracking-wider sticky top-0 bg-slate-800/95 backdrop-blur-sm z-10">
              <span>Champion</span>
              <span className="text-center">Games</span>
              <span className="text-center">WR%</span>
              <span className="text-center">KDA</span>
              <span className="text-center">CS/m</span>
              <span className="text-center">DMG/m</span>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {mostPlayed.map(champ => {
                const wrColor = champ.winRate >= 60 ? "text-emerald-400" : champ.winRate >= 50 ? "text-amber-300" : "text-red-400"
                return (
                  <div
                    key={champ.name}
                    className="grid grid-cols-[1fr_70px_70px_70px_80px_80px] items-center px-4 py-2.5 border-b border-slate-700/20 last:border-b-0 hover:bg-slate-700/10 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <img src={getChampionIcon(champ.name)} alt={champ.name} className="w-8 h-8 rounded-lg border border-slate-700/50" />
                      <span className="text-white text-sm font-medium">{champ.name}</span>
                    </div>
                    <span className="text-center text-slate-300 text-sm tabular-nums">{champ.games}</span>
                    <span className={`text-center text-sm font-medium tabular-nums ${wrColor}`}>{champ.winRate}%</span>
                    <span className="text-center text-slate-300 text-sm tabular-nums">{champ.kda.toFixed(1)}</span>
                    <span className="text-center text-slate-400 text-sm tabular-nums">{champ.csPerMin.toFixed(1)}</span>
                    <span className="text-center text-slate-400 text-sm tabular-nums">{champ.dmgPerMin.toLocaleString()}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {!soloqOverall && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-12 text-center">
          <p className="text-slate-500">No SoloQ games found for this player.</p>
        </div>
      )}
    </div>
  )
}

// ==================== OBJECTIVES TAB ====================
function ObjectivesTab({ playerId, playerName }) {
  const [objectives, setObjectives] = useState([])
  const [newName, setNewName] = useState("")
  const [newRequest, setNewRequest] = useState("")

  const fetchObjectives = async () => {
    try {
      const { ok, data, code } = await api.post("/solo-objectif/search", { player_id: playerId })
      if (!ok) return toast.error(code || "Failed to fetch objectives")
      setObjectives(data)
    } catch (error) {
      toast.error(error.message || "Failed to fetch objectives")
    }
  }

  useEffect(() => {
    fetchObjectives()
  }, [playerId])

  const addObjective = async () => {
    if (!newName.trim()) return
    try {
      const { ok, data, code } = await api.post("/solo-objectif", { name: newName.trim(), request: newRequest.trim(), player_id: playerId, player_name: playerName })
      if (!ok) return toast.error(code || "Failed to add objective")
      setObjectives(prev => [data, ...prev])
      setNewName("")
      setNewRequest("")
    } catch (error) {
      toast.error(error.message || "Failed to add objective")
    }
  }

  const deleteObjective = async id => {
    try {
      const { ok, code } = await api.delete(`/solo-objectif/${id}`)
      if (!ok) return toast.error(code || "Failed to delete objective")
      setObjectives(prev => prev.filter(o => o._id !== id))
    } catch (error) {
      toast.error(error.message || "Failed to delete objective")
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 gap-3">
        <StatCard label="Objectives" value={objectives.length} color="text-violet-400" />
      </div>

      {/* Add Objective */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 space-y-3">
        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
          <Plus className="w-4 h-4 text-emerald-400" />
          New Objective
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addObjective()}
            placeholder="Objective name..."
            className="flex-1 bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-slate-600"
          />
          <input
            type="text"
            value={newRequest}
            onChange={e => setNewRequest(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addObjective()}
            placeholder="Description (optional)..."
            className="flex-1 bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-slate-600"
          />
          <button
            onClick={addObjective}
            disabled={!newName.trim()}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-white text-sm font-medium transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {/* Objectives List */}
      {objectives.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-12 text-center">
          <Target className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-500">No objectives yet. Add one above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {objectives.map(obj => (
            <div key={obj._id} className="bg-slate-800/50 border border-slate-700/50 rounded-xl transition-colors">
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{obj.name}</p>
                  {obj.request && <p className="text-xs text-slate-500 mt-0.5 truncate">{obj.request}</p>}
                </div>
                <button onClick={() => deleteObjective(obj._id)} className="p-1 rounded hover:bg-red-500/20 transition-colors">
                  <Trash2 className="w-4 h-4 text-slate-600 hover:text-red-400 transition-colors" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ==================== MAIN VIEW ====================
export default function View() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pool, setPool] = useState([])
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState("comparative")

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { ok, data: result, code } = await api.post("/soloq-match/compare", { player_id: id })
        if (!ok) return toast.error(code)
        setData(result)
        setPool(result.player.champion_pool || [])
      } catch (error) {
        toast.error(error.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  const savePool = useCallback(
    async newPool => {
      setSaving(true)
      try {
        const { ok, code } = await api.put(`/player/${id}`, { champion_pool: newPool })
        if (!ok) toast.error(code)
      } catch (error) {
        toast.error(error.message)
      } finally {
        setSaving(false)
      }
    },
    [id]
  )

  const setTier = useCallback(
    (champion, tier) => {
      const newPool = pool.filter(c => c.champion !== champion)
      newPool.push({ champion, tier })
      setPool(newPool)
      savePool(newPool)
    },
    [pool, savePool]
  )

  const removeTier = useCallback(
    champion => {
      const newPool = pool.filter(c => c.champion !== champion)
      setPool(newPool)
      savePool(newPool)
    },
    [pool, savePool]
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <p className="text-slate-500">No data available.</p>
      </div>
    )
  }

  const { player, champions, pocketPicks, soloqOverall, mostPlayed } = data

  // All champion names from data
  const allChampionNames = [...new Set([...champions.map(c => c.name), ...pocketPicks.map(c => c.name)])]

  // Maps for cross-referencing
  const poolMap = {}
  for (const entry of pool) poolMap[entry.champion] = entry.tier

  const autoTierMap = {}
  for (const c of champions) if (c.autoTier) autoTierMap[c.name] = c.autoTier
  for (const c of pocketPicks) if (c.autoTier) autoTierMap[c.name] = c.autoTier

  // Build match indicators helper
  const buildMatchInfo = (manual, auto) => {
    if (!manual || !auto) return {}
    const m = TIER_ORDER[manual] || 0
    const a = TIER_ORDER[auto] || 0

    if (m === a)
      return {
        matchClass: "ring-1 ring-emerald-500/50 rounded-lg",
        matchLabel: "Match",
        matchIndicator: (
          <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-slate-900 rounded-full flex items-center justify-center">
            <Check className="w-2.5 h-2.5 text-emerald-400" />
          </span>
        )
      }
    if (m > a)
      return {
        matchClass: "ring-1 ring-orange-500/50 rounded-lg",
        matchLabel: `Auto: ${auto}`,
        matchIndicator: (
          <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-slate-900 rounded-full flex items-center justify-center">
            <ChevronDown className="w-2.5 h-2.5 text-orange-400" />
          </span>
        )
      }
    return {
      matchClass: "ring-1 ring-sky-500/50 rounded-lg",
      matchLabel: `Auto: ${auto}`,
      matchIndicator: (
        <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-slate-900 rounded-full flex items-center justify-center">
          <ChevronUp className="w-2.5 h-2.5 text-sky-400" />
        </span>
      )
    }
  }

  // Build manual tier list entries
  const manualChampions = pool.map(entry => ({
    name: entry.champion,
    tier: entry.tier,
    ...buildMatchInfo(entry.tier, autoTierMap[entry.champion])
  }))

  // Build auto tier list entries
  const autoChampions = [...champions, ...pocketPicks]
    .filter(c => c.autoTier)
    .map(c => {
      const manual = poolMap[c.name]
      return {
        name: c.name,
        tier: c.autoTier,
        autoScore: c.autoScore,
        gamesScore: c.gamesScore,
        wrScore: c.wrScore,
        kdaScore: c.kdaScore,
        ...(manual && manual === c.autoTier
          ? {
              matchClass: "ring-1 ring-emerald-500/50 rounded-lg",
              matchLabel: "Match",
              matchIndicator: (
                <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-slate-900 rounded-full flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-emerald-400" />
                </span>
              )
            }
          : {})
      }
    })

  const TABS = [
    { key: "comparative", label: "Comparative" },
    { key: "overview", label: "SoloQ" },
    { key: "Objectives", label: "Objectives" }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 lg:p-8">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Back + Player Header */}
        <div className="flex items-center gap-4">
          <Link to="/soloq" className="p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-slate-600/80 transition-all">
            <ArrowLeft className="w-4 h-4 text-slate-400" />
          </Link>
          <div className="flex items-center gap-3">
            {player.role && <img src={`/roles/${player.role}.png`} alt={player.role} className="w-5 h-5 opacity-70" />}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-white font-bold text-xl">{player.game_name}</h1>
                <span className="text-slate-500 text-sm">#{player.tag_line}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {player.role && <span className="text-slate-400">{ROLE_LABELS[player.role] || player.role}</span>}
                {player.current_tier && (
                  <>
                    <span className="text-slate-600">-</span>
                    <span style={{ color: TIER_COLORS[player.current_tier] || "#94a3b8" }}>
                      {player.current_tier} {player.current_rank || ""}
                    </span>
                    <span className="text-slate-500">{player.current_lp ?? 0} LP</span>
                  </>
                )}
              </div>
            </div>
            {getRankIcon(player.current_tier) && (
              <img
                src={getRankIcon(player.current_tier)}
                alt={player.current_tier}
                className="w-12 h-12 object-contain"
                style={{ filter: `drop-shadow(0 0 8px ${TIER_COLORS[player.current_tier] || "#64748b"}40)` }}
              />
            )}
            <a
              href={`https://dpm.lol/${encodeURIComponent(player.game_name)}-${encodeURIComponent(player.tag_line)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-slate-600/80 transition-all"
            >
              <img src="/dpm_full_logo.png" alt="DPM.lol" className="h-6 object-contain" />
            </a>
          </div>
          {saving && <Loader2 className="w-4 h-4 text-amber-400 animate-spin ml-auto" />}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-800/50 border border-slate-700/50 rounded-lg p-1 w-fit">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                tab === t.key ? "bg-slate-700 text-white shadow-sm" : "text-slate-400 hover:text-slate-300 hover:bg-slate-700/30"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === "overview" && <SoloQOverviewTab player={player} soloqOverall={soloqOverall} mostPlayed={mostPlayed} />}

        {tab === "Objectives" && <ObjectivesTab playerId={id} playerName={player.game_name} />}

        {tab === "comparative" && (
          <>
            {/* Tier List Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <TierListSection
                title="My Tier List"
                icon={<Swords className="w-4 h-4 text-amber-400" />}
                champions={manualChampions}
                allChampions={allChampionNames}
                isManual={true}
                onSetTier={setTier}
                onRemove={removeTier}
              />
              <TierListSection
                title="Tier List Auto"
                icon={<Sparkles className="w-4 h-4 text-violet-400" />}
                tooltip={
                  <>
                    <p className="font-semibold text-white mb-1.5">Score calculation (0-100)</p>
                    <p className="text-slate-400 mb-1.5">Minimum 15 games (official x3) to be ranked. Official games count triple.</p>
                    <ul className="space-y-1 list-disc list-inside">
                      <li>
                        <span className="text-slate-400">Games</span>: number of games (max 30 pts, capped at 30 games).
                      </li>
                      <li>
                        <span className="text-slate-400">Win Rate</span>: combined win rate (max 50 pts).
                      </li>
                      <li>
                        <span className="text-slate-400">KDA</span>: kills+assists/deaths ratio (max 20 pts, capped at 5.0).
                      </li>
                    </ul>
                    <div className="mt-2 pt-2 border-t border-slate-700/50 space-y-0.5">
                      <p>
                        <span className="text-amber-400 font-bold">S</span> : score &ge; 70
                      </p>
                      <p>
                        <span className="text-violet-400 font-bold">A</span> : score &ge; 60
                      </p>
                      <p>
                        <span className="text-slate-400 font-bold">B</span> : score &ge; 45
                      </p>
                    </div>
                  </>
                }
                champions={autoChampions}
                allChampions={allChampionNames}
                isManual={false}
                onSetTier={() => {}}
                onRemove={() => {}}
              />
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 text-xs flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded border border-emerald-500/50 flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-emerald-400" />
                </span>
                <span className="text-slate-400">Manual = Auto</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded border border-orange-500/50 flex items-center justify-center">
                  <ChevronDown className="w-2.5 h-2.5 text-orange-400" />
                </span>
                <span className="text-slate-400">Overrated (Manual &gt; Auto)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded border border-sky-500/50 flex items-center justify-center">
                  <ChevronUp className="w-2.5 h-2.5 text-sky-400" />
                </span>
                <span className="text-slate-400">Underrated (Manual &lt; Auto)</span>
              </div>
              <div className="w-px h-4 bg-slate-700" />
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                <span className="text-slate-400">SoloQ</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-slate-400">Team</span>
              </div>
            </div>

            {/* Champion Stats Table */}
            {champions.length > 0 && (
              <div className="space-y-3">
                <div>
                  <h2 className="text-white font-semibold text-sm flex items-center gap-2">
                    <Swords className="w-4 h-4 text-slate-400" />
                    Champion Details
                    <span className="text-slate-500 font-normal">({champions.length})</span>
                  </h2>
                  <p className="text-slate-500 text-xs mt-1 ml-6">
                    Comparing <span className="text-violet-400">SoloQ</span> vs <span className="text-amber-400">Team</span> stats per champion — arrows indicate whether the player
                    performs better or worse in team games.
                  </p>
                </div>

                <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl overflow-hidden">
                  <div className="grid grid-cols-[180px_60px_50px_60px_repeat(6,1fr)] items-center px-4 py-2 border-b border-slate-700/30 text-xs text-slate-500 uppercase tracking-wider">
                    <span>Champion</span>
                    <span className="text-center">Source</span>
                    <span className="text-center">Tier</span>
                    {METRICS.map(m => (
                      <span key={m.key} className="text-center">
                        {m.label}
                      </span>
                    ))}
                  </div>

                  {champions.map((champ, index) => {
                    const manualTier = poolMap[champ.name]
                    return (
                      <div key={champ.name} className={`border-b border-slate-700/30 last:border-b-0 transition-colors ${index % 2 === 1 ? "bg-slate-700/30" : ""}`}>
                        <div className="grid grid-cols-[180px_60px_50px_60px_repeat(6,1fr)] items-center px-4 py-2">
                          <div className="flex items-center gap-2">
                            <img src={getChampionIcon(champ.name)} alt={champ.name} className="w-8 h-8 rounded-lg border border-slate-700/50" />
                            <span className="text-white text-sm font-medium">{champ.name}</span>
                          </div>
                          <div className="flex items-center justify-center">
                            <span className="text-violet-400 text-[10px] font-semibold uppercase tracking-wide">SoloQ</span>
                          </div>

                          <div className="flex items-center justify-center gap-1">
                            <TierBadge tier={champ.autoTier} small />
                            {manualTier && <MatchIndicator manual={manualTier} auto={champ.autoTier} />}
                          </div>

                          {METRICS.map(m => (
                            <div key={m.key} className="text-center">
                              {champ.soloq ? (
                                <span className="text-violet-300 text-xs tabular-nums">{m.format(champ.soloq[m.key])}</span>
                              ) : (
                                <span className="text-slate-600 text-xs">-</span>
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="grid grid-cols-[180px_60px_50px_60px_repeat(6,1fr)] items-center px-4 pb-2">
                          <div />
                          <div className="flex items-center justify-center">
                            <span className="text-amber-400 text-[10px] font-semibold uppercase tracking-wide">Team</span>
                          </div>
                          <div className="flex items-center justify-center">{manualTier && <TierBadge tier={manualTier} small />}</div>

                          {METRICS.map(m => (
                            <div key={m.key} className="text-center flex items-center justify-center gap-1">
                              {champ.team ? (
                                <>
                                  <span className="text-amber-300 text-xs tabular-nums">{m.format(champ.team[m.key])}</span>
                                  {!m.noCompare && champ.soloq && <DiffIndicator soloq={champ.soloq[m.key]} team={champ.team[m.key]} higherBetter={m.higherBetter} />}
                                </>
                              ) : (
                                <span className="text-slate-600 text-xs">-</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Empty state */}
            {champions.length === 0 && (
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-12 text-center">
                <p className="text-slate-500">No team data found for this player.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
