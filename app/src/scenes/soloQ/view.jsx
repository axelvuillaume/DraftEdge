import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, Link } from "react-router-dom"
import { toast } from "react-hot-toast"
import { Loader2, ArrowLeft, Swords, TrendingUp, TrendingDown, Minus, Sparkles, Check, ChevronDown, ChevronUp, X, Plus, Info, BarChart3, Trophy } from "lucide-react"
import api from "@/services/api"
import { getChampionIcon } from "@/utils"

// ==================== CONSTANTS ====================

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
  CHALLENGER: "#f59e0b",
}

const RANK_ICONS = new Set(["challenger", "grandmaster", "master", "diamond", "platinum"])
function getRankIcon(tier) {
  if (!tier) return null
  const key = tier.toLowerCase()
  return RANK_ICONS.has(key) ? `/rank/${key}.png` : null
}

const ROLE_LABELS = { top: "Top", jungle: "Jungle", mid: "Mid", bottom: "ADC", support: "Support" }

const TIERS = ["S", "A", "B"]
const TIER_STYLES = {
  S: { bg: "bg-amber-500/15", border: "border-amber-500/40", text: "text-amber-400" },
  A: { bg: "bg-violet-500/15", border: "border-violet-500/40", text: "text-violet-400" },
  B: { bg: "bg-slate-500/15", border: "border-slate-500/40", text: "text-slate-400" },
}

const METRICS = [
  { key: "games", label: "Games", format: (v) => v, noCompare: true },
  { key: "winRate", label: "WR%", format: (v) => `${v}%`, higherBetter: true },
  { key: "kda", label: "KDA", format: (v) => v.toFixed(1), higherBetter: true },
  { key: "csPerMin", label: "CS/m", format: (v) => v.toFixed(1), higherBetter: true },
  { key: "dmgPerMin", label: "DMG/m", format: (v) => v.toLocaleString(), higherBetter: true },
  { key: "goldPerMin", label: "Gold/m", format: (v) => v.toLocaleString(), higherBetter: true },
  { key: "visionScorePerMin", label: "VS/m", format: (v) => v.toFixed(2), higherBetter: true },
]

const TIER_ORDER = { S: 3, A: 2, B: 1 }

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
  return (
    <span className={`${style.bg} ${style.border} ${style.text} border font-bold rounded ${small ? "text-[10px] px-1 py-0.5" : "text-xs px-1.5 py-0.5"}`}>
      {tier}
    </span>
  )
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

function ChampionChip({ name, matchClass, matchLabel, matchIndicator, isManual, onRemove }) {
  return (
    <div className="relative group" title={`${name}${matchLabel ? ` - ${matchLabel}` : ""}`}>
      <div className={`relative ${matchClass || ""}`}>
        <img src={getChampionIcon(name)} alt={name} className="w-9 h-9 rounded-lg border border-slate-600/50" />
        {matchIndicator}
        {isManual && (
          <button
            onClick={() => onRemove(name)}
            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500/80 rounded-full items-center justify-center hidden group-hover:flex"
          >
            <X className="w-2.5 h-2.5 text-white" />
          </button>
        )}
      </div>
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

  const assignedNames = new Set(champions.map((c) => c.name))
  const unassigned = allChampions.filter((c) => !assignedNames.has(c))

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
            {showTooltip && tooltipBtnRef.current && (() => {
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
        {TIERS.map((tier) => {
          const style = TIER_STYLES[tier]
          const champsInTier = grouped[tier] || []

          return (
            <div key={tier} className={`${style.bg} border ${style.border} rounded-lg p-2 min-h-[52px]`}>
              <div className="flex items-center gap-2">
                <span className={`${style.text} font-bold text-sm w-5 text-center shrink-0`}>{tier}</span>
                <div className="flex flex-wrap items-center gap-1.5 flex-1">
                  {champsInTier.map((champ) => (
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
                  {unassigned.map((name) => (
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
  const rankedWR = totalRanked > 0 ? ((player.current_wins || 0) / totalRanked * 100).toFixed(1) : null

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
            <StatCard
              label="Games analysees"
              value={soloqOverall.games}
              sub={`${soloqOverall.winRate}% WR`}
              color="text-violet-400"
            />
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
            <div className="grid grid-cols-[1fr_70px_70px_70px_80px_80px] items-center px-4 py-2 border-b border-slate-700/30 text-xs text-slate-500 uppercase tracking-wider">
              <span>Champion</span>
              <span className="text-center">Games</span>
              <span className="text-center">WR%</span>
              <span className="text-center">KDA</span>
              <span className="text-center">CS/m</span>
              <span className="text-center">DMG/m</span>
            </div>

            {mostPlayed.map((champ) => {
              const wrColor = champ.winRate >= 60 ? "text-emerald-400" : champ.winRate >= 50 ? "text-amber-300" : "text-red-400"
              return (
                <div key={champ.name} className="grid grid-cols-[1fr_70px_70px_70px_80px_80px] items-center px-4 py-2.5 border-b border-slate-700/20 last:border-b-0 hover:bg-slate-700/10 transition-colors">
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
      )}

      {!soloqOverall && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-12 text-center">
          <p className="text-slate-500">Aucune game SoloQ trouvee pour ce joueur.</p>
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
    async (newPool) => {
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
    [id],
  )

  const setTier = useCallback(
    (champion, tier) => {
      const newPool = pool.filter((c) => c.champion !== champion)
      newPool.push({ champion, tier })
      setPool(newPool)
      savePool(newPool)
    },
    [pool, savePool],
  )

  const removeTier = useCallback(
    (champion) => {
      const newPool = pool.filter((c) => c.champion !== champion)
      setPool(newPool)
      savePool(newPool)
    },
    [pool, savePool],
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
  const allChampionNames = [...new Set([...champions.map((c) => c.name), ...pocketPicks.map((c) => c.name)])]

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
        ),
      }
    if (m > a)
      return {
        matchClass: "ring-1 ring-orange-500/50 rounded-lg",
        matchLabel: `Auto: ${auto}`,
        matchIndicator: (
          <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-slate-900 rounded-full flex items-center justify-center">
            <ChevronDown className="w-2.5 h-2.5 text-orange-400" />
          </span>
        ),
      }
    return {
      matchClass: "ring-1 ring-sky-500/50 rounded-lg",
      matchLabel: `Auto: ${auto}`,
      matchIndicator: (
        <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-slate-900 rounded-full flex items-center justify-center">
          <ChevronUp className="w-2.5 h-2.5 text-sky-400" />
        </span>
      ),
    }
  }

  // Build manual tier list entries
  const manualChampions = pool.map((entry) => ({
    name: entry.champion,
    tier: entry.tier,
    ...buildMatchInfo(entry.tier, autoTierMap[entry.champion]),
  }))

  // Build auto tier list entries
  const autoChampions = [...champions, ...pocketPicks]
    .filter((c) => c.autoTier)
    .map((c) => {
      const manual = poolMap[c.name]
      return {
        name: c.name,
        tier: c.autoTier,
        ...(manual && manual === c.autoTier
          ? {
              matchClass: "ring-1 ring-emerald-500/50 rounded-lg",
              matchLabel: "Match",
              matchIndicator: (
                <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-slate-900 rounded-full flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-emerald-400" />
                </span>
              ),
            }
          : {}),
      }
    })

  const TABS = [
    { key: "comparative", label: "Comparative", icon: <Swords className="w-3.5 h-3.5" /> },
    { key: "overview", label: "SoloQ", icon: <BarChart3 className="w-3.5 h-3.5" /> },
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
          </div>
          {saving && <Loader2 className="w-4 h-4 text-amber-400 animate-spin ml-auto" />}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-800/50 border border-slate-700/50 rounded-lg p-1 w-fit">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                tab === t.key
                  ? "bg-slate-700 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-300 hover:bg-slate-700/30"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === "overview" && (
          <SoloQOverviewTab player={player} soloqOverall={soloqOverall} mostPlayed={mostPlayed} />
        )}

        {tab === "comparative" && (
          <>
            {/* Tier List Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <TierListSection
                title="Ma Tier List"
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
                    <p className="font-semibold text-white mb-1.5">Calcul du score (0-100)</p>
                    <p className="text-slate-400 mb-1.5">Minimum 15 games (team x2) pour etre classe. Les games team comptent double.</p>
                    <ul className="space-y-1 list-disc list-inside">
                      <li><span className="text-slate-400">Games</span> : nombre de parties (max 30 pts, plafond a 30 games).</li>
                      <li><span className="text-slate-400">Win Rate</span> : taux de victoire combine (max 50 pts).</li>
                      <li><span className="text-slate-400">KDA</span> : ratio kills+assists/deaths (max 20 pts, plafond a 5.0).</li>
                    </ul>
                    <div className="mt-2 pt-2 border-t border-slate-700/50 space-y-0.5">
                      <p><span className="text-amber-400 font-bold">S</span> : score &ge; 70</p>
                      <p><span className="text-violet-400 font-bold">A</span> : score &ge; 60</p>
                      <p><span className="text-slate-400 font-bold">B</span> : score &ge; 45</p>
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
                <span className="text-slate-400">Manuel = Auto</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded border border-orange-500/50 flex items-center justify-center">
                  <ChevronDown className="w-2.5 h-2.5 text-orange-400" />
                </span>
                <span className="text-slate-400">Sureval (Manuel &gt; Auto)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded border border-sky-500/50 flex items-center justify-center">
                  <ChevronUp className="w-2.5 h-2.5 text-sky-400" />
                </span>
                <span className="text-slate-400">Sous-eval (Manuel &lt; Auto)</span>
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
                <h2 className="text-white font-semibold text-sm flex items-center gap-2">
                  <Swords className="w-4 h-4 text-slate-400" />
                  Champion Details
                  <span className="text-slate-500 font-normal">({champions.length})</span>
                </h2>

                <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl overflow-hidden">
                  <div className="grid grid-cols-[180px_50px_60px_repeat(6,1fr)_30px] items-center px-4 py-2 border-b border-slate-700/30 text-xs text-slate-500 uppercase tracking-wider">
                    <span>Champion</span>
                    <span className="text-center">Tier</span>
                    {METRICS.map((m) => (
                      <span key={m.key} className="text-center">
                        {m.label}
                      </span>
                    ))}
                    <span />
                  </div>

                  {champions.map((champ) => {
                    const manualTier = poolMap[champ.name]
                    return (
                      <div key={champ.name} className="border-b border-slate-700/20 last:border-b-0 hover:bg-slate-700/10 transition-colors">
                        <div className="grid grid-cols-[180px_50px_60px_repeat(6,1fr)_30px] items-center px-4 py-2">
                          <div className="flex items-center gap-2">
                            <img src={getChampionIcon(champ.name)} alt={champ.name} className="w-8 h-8 rounded-lg border border-slate-700/50" />
                            <span className="text-white text-sm font-medium">{champ.name}</span>
                          </div>

                          <div className="flex items-center justify-center gap-1">
                            <TierBadge tier={champ.autoTier} small />
                            {manualTier && <MatchIndicator manual={manualTier} auto={champ.autoTier} />}
                          </div>

                          {METRICS.map((m) => (
                            <div key={m.key} className="text-center">
                              {champ.soloq ? (
                                <span className="text-violet-300 text-xs tabular-nums">{m.format(champ.soloq[m.key])}</span>
                              ) : (
                                <span className="text-slate-600 text-xs">-</span>
                              )}
                            </div>
                          ))}
                          <div className="flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                          </div>
                        </div>

                        <div className="grid grid-cols-[180px_50px_60px_repeat(6,1fr)_30px] items-center px-4 pb-2">
                          <div />
                          <div className="flex items-center justify-center">
                            {manualTier && <TierBadge tier={manualTier} small />}
                          </div>

                          {METRICS.map((m) => (
                            <div key={m.key} className="text-center flex items-center justify-center gap-1">
                              {champ.team ? (
                                <>
                                  <span className="text-amber-300 text-xs tabular-nums">{m.format(champ.team[m.key])}</span>
                                  {!m.noCompare && champ.soloq && (
                                    <DiffIndicator soloq={champ.soloq[m.key]} team={champ.team[m.key]} higherBetter={m.higherBetter} />
                                  )}
                                </>
                              ) : (
                                <span className="text-slate-600 text-xs">-</span>
                              )}
                            </div>
                          ))}
                          <div className="flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          </div>
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
                <p className="text-slate-500">No champion data found for this player.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
