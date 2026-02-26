import { useState, useRef } from "react"
import { toast } from "react-hot-toast"
import { Swords, TrendingUp, TrendingDown, Minus, Sparkles, Check, ChevronDown, ChevronUp, X, Plus, Info, Loader2 } from "lucide-react"
import api from "@/services/api"
import { getChampionIcon, CHAMPION_TIERS, TIER_STYLES, TIER_ORDER } from "@/utils"

// ==================== CONSTANTS ====================

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

// ==================== COMPARATIVE TAB ====================

export default function ComparativeTab({ data, playerId }) {
  const { champions, pocketPicks, player } = data
  const [pool, setPool] = useState(player.champion_pool || [])
  const [saving, setSaving] = useState(false)
  const [addingTierManual, setAddingTierManual] = useState(null)
  const [showTooltipAuto, setShowTooltipAuto] = useState(false)
  const tooltipBtnRefAuto = useRef(null)

  const savePool = async newPool => {
    setSaving(true)
    try {
      const { ok, code } = await api.put(`/player/${playerId}`, { champion_pool: newPool })
      if (!ok) toast.error(code || "Failed to save pool")
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const setTier = (champion, tier) => {
    const newPool = pool.filter(c => c.champion !== champion)
    newPool.push({ champion, tier })
    setPool(newPool)
    savePool(newPool)
  }

  const removeTier = champion => {
    const newPool = pool.filter(c => c.champion !== champion)
    setPool(newPool)
    savePool(newPool)
  }

  const allChampionNames = [...new Set([...champions.map(c => c.name), ...pocketPicks.map(c => c.name)])]

  const poolMap = {}
  for (const entry of pool) poolMap[entry.champion] = entry.tier

  const autoTierMap = {}
  for (const c of champions) if (c.autoTier) autoTierMap[c.name] = c.autoTier
  for (const c of pocketPicks) if (c.autoTier) autoTierMap[c.name] = c.autoTier

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

  const manualChampions = pool.map(entry => ({
    name: entry.champion,
    tier: entry.tier,
    ...buildMatchInfo(entry.tier, autoTierMap[entry.champion])
  }))

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

  const manualGrouped = { S: [], A: [], B: [] }
  for (const champ of manualChampions) {
    if (manualGrouped[champ.tier]) manualGrouped[champ.tier].push(champ)
  }
  const manualAssignedNames = new Set(manualChampions.map(c => c.name))
  const manualUnassigned = allChampionNames.filter(c => !manualAssignedNames.has(c))

  const autoGrouped = { S: [], A: [], B: [] }
  for (const champ of autoChampions) {
    if (autoGrouped[champ.tier]) autoGrouped[champ.tier].push(champ)
  }

  return (
    <>
      {/* Tier List Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* My Tier List */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl">
          <div className="px-4 py-3 border-b border-slate-700/30 flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 text-amber-400 animate-spin" /> : <Swords className="w-4 h-4 text-amber-400" />}
            <h3 className="text-white font-semibold text-sm">My Tier List</h3>
          </div>
          <div className="p-3 space-y-2">
            {CHAMPION_TIERS.map(tier => {
              const style = TIER_STYLES[tier]
              const champsInTier = manualGrouped[tier] || []
              return (
                <div key={tier} className={`${style.bg} border ${style.border} rounded-lg p-2 min-h-[52px]`}>
                  <div className="flex items-center gap-2">
                    <span className={`${style.text} font-bold text-sm w-5 text-center shrink-0`}>{tier}</span>
                    <div className="flex flex-wrap items-center gap-1.5 flex-1">
                      {champsInTier.map(champ => (
                        <div key={champ.name} className="relative group" title={`${champ.name}${champ.matchLabel ? ` - ${champ.matchLabel}` : ""}`}>
                          <div className={`relative ${champ.matchClass || ""}`}>
                            <img src={getChampionIcon(champ.name)} alt={champ.name} className="w-9 h-9 rounded-lg border border-slate-600/50" />
                            {champ.matchIndicator}
                            <button
                              onClick={() => removeTier(champ.name)}
                              className="absolute -top-1 -right-1 w-4 h-4 bg-red-500/80 rounded-full items-center justify-center hidden group-hover:flex"
                            >
                              <X className="w-2.5 h-2.5 text-white" />
                            </button>
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={() => setAddingTierManual(addingTierManual === tier ? null : tier)}
                        className="w-9 h-9 rounded-lg border border-dashed border-slate-600/50 flex items-center justify-center hover:border-slate-500 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5 text-slate-500" />
                      </button>
                    </div>
                  </div>
                  {addingTierManual === tier && manualUnassigned.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5 pt-2 border-t border-slate-700/30">
                      {manualUnassigned.map(name => (
                        <button
                          key={name}
                          onClick={() => {
                            setTier(name, tier)
                            setAddingTierManual(null)
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

        {/* Tier List Auto */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl">
          <div className="px-4 py-3 border-b border-slate-700/30 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <h3 className="text-white font-semibold text-sm">Tier List Auto</h3>
            <div className="ml-auto">
              <button
                ref={tooltipBtnRefAuto}
                onMouseEnter={() => setShowTooltipAuto(true)}
                onMouseLeave={() => setShowTooltipAuto(false)}
                className="p-1 rounded hover:bg-slate-700/50 transition-colors"
              >
                <Info className="w-3.5 h-3.5 text-slate-500" />
              </button>
              {showTooltipAuto &&
                tooltipBtnRefAuto.current &&
                (() => {
                  const rect = tooltipBtnRefAuto.current.getBoundingClientRect()
                  return (
                    <div
                      className="fixed z-50 w-72 p-3 bg-slate-900 border border-slate-700 rounded-lg shadow-xl text-xs text-slate-300 leading-relaxed"
                      style={{ top: rect.bottom + 6, right: window.innerWidth - rect.right }}
                    >
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
                    </div>
                  )
                })()}
            </div>
          </div>
          <div className="p-3 space-y-2">
            {CHAMPION_TIERS.map(tier => {
              const style = TIER_STYLES[tier]
              const champsInTier = autoGrouped[tier] || []
              return (
                <div key={tier} className={`${style.bg} border ${style.border} rounded-lg p-2 min-h-[52px]`}>
                  <div className="flex items-center gap-2">
                    <span className={`${style.text} font-bold text-sm w-5 text-center shrink-0`}>{tier}</span>
                    <div className="flex flex-wrap items-center gap-1.5 flex-1">
                      {champsInTier.map(champ => (
                        <div key={champ.name} className="relative group">
                          <div className={`relative ${champ.matchClass || ""}`}>
                            <img src={getChampionIcon(champ.name)} alt={champ.name} className="w-9 h-9 rounded-lg border border-slate-600/50" />
                            {champ.matchIndicator}
                          </div>
                          {champ.autoScore != null && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none">
                              <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-2.5 w-40">
                                <p className="text-white text-xs font-semibold mb-1.5">{champ.name}</p>
                                <div className="space-y-1 text-[11px]">
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Games</span>
                                    <span className="text-slate-200 tabular-nums">
                                      {champ.gamesScore}
                                      <span className="text-slate-500">/30</span>
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Win Rate</span>
                                    <span className="text-slate-200 tabular-nums">
                                      {champ.wrScore}
                                      <span className="text-slate-500">/50</span>
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">KDA</span>
                                    <span className="text-slate-200 tabular-nums">
                                      {champ.kdaScore}
                                      <span className="text-slate-500">/20</span>
                                    </span>
                                  </div>
                                  <div className="flex justify-between pt-1 border-t border-slate-700/50">
                                    <span className="text-white font-semibold">Total</span>
                                    <span className="text-white font-semibold tabular-nums">
                                      {champ.autoScore}
                                      <span className="text-slate-500">/100</span>
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
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
  )
}
