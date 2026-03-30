import { Trophy } from "lucide-react"
import { getChampionIcon, TIER_COLORS, RANK_ICON_TIERS } from "@/utils"

function getRankIcon(tier) {
  if (!tier) return null
  return RANK_ICON_TIERS.has(tier.toUpperCase()) ? `/rank/${tier.toLowerCase()}.png` : null
}

export default function SoloQOverviewTab({ player, soloqOverview }) {
  const totalRanked = (player.current_wins || 0) + (player.current_losses || 0)
  const rankedWR = totalRanked > 0 ? (((player.current_wins || 0) / totalRanked) * 100).toFixed(1) : null

  return (
    <div className="space-y-6">
      {/* Overall Stats */}
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

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex flex-col">
          <span className="text-slate-500 text-xs uppercase tracking-wider">W / L</span>
          <span className={`text-2xl font-bold mt-1 ${rankedWR && parseFloat(rankedWR) >= 50 ? "text-emerald-400" : "text-red-400"}`}>
            {totalRanked > 0 ? `${player.current_wins || 0} / ${player.current_losses || 0}` : "-"}
          </span>
          {rankedWR && <span className="text-slate-500 text-xs mt-0.5">{rankedWR}% WR</span>}
        </div>

        {soloqOverview?.overall && (
          <>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex flex-col">
              <span className="text-slate-500 text-xs uppercase tracking-wider">KDA (SoloQ)</span>
              <span
                className={`text-2xl font-bold mt-1 ${soloqOverview.overall.kda >= 3 ? "text-emerald-400" : soloqOverview.overall.kda >= 2 ? "text-amber-400" : "text-red-400"}`}
              >
                {soloqOverview.overall.kda.toFixed(1)}
              </span>
              <span className="text-slate-500 text-xs mt-0.5">
                {soloqOverview.overall.avgKills} / {soloqOverview.overall.avgDeaths} / {soloqOverview.overall.avgAssists}
              </span>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex flex-col">
              <span className="text-slate-500 text-xs uppercase tracking-wider">Games analyzed</span>
              <span className="text-2xl font-bold mt-1 text-violet-400">{soloqOverview.overall.games}</span>
              <span className="text-slate-500 text-xs mt-0.5">{soloqOverview.overall.winRate}% WR</span>
            </div>
          </>
        )}
      </div>

      {soloqOverview?.overall && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex flex-col">
            <span className="text-slate-500 text-xs uppercase tracking-wider">CS / min</span>
            <span className="text-2xl font-bold mt-1 text-sky-400">{soloqOverview.overall.csPerMin.toFixed(1)}</span>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex flex-col">
            <span className="text-slate-500 text-xs uppercase tracking-wider">DMG / min</span>
            <span className="text-2xl font-bold mt-1 text-red-400">{soloqOverview.overall.dmgPerMin.toLocaleString()}</span>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex flex-col">
            <span className="text-slate-500 text-xs uppercase tracking-wider">Gold / min</span>
            <span className="text-2xl font-bold mt-1 text-amber-400">{soloqOverview.overall.goldPerMin.toLocaleString()}</span>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex flex-col">
            <span className="text-slate-500 text-xs uppercase tracking-wider">Vision / min</span>
            <span className="text-2xl font-bold mt-1 text-blue-400">{soloqOverview.overall.visionScorePerMin.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Most Played */}
      {soloqOverview?.topChampions?.length > 0 && (
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
              {soloqOverview.topChampions.map(champ => (
                <div
                  key={champ.name}
                  className="grid grid-cols-[1fr_70px_70px_70px_80px_80px] items-center px-4 py-2.5 border-b border-slate-700/20 last:border-b-0 hover:bg-slate-700/10 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <img src={getChampionIcon(champ.name)} alt={champ.name} className="w-8 h-8 rounded-lg border border-slate-700/50" />
                    <span className="text-white text-sm font-medium">{champ.name}</span>
                  </div>
                  <span className="text-center text-slate-300 text-sm tabular-nums">{champ.games}</span>
                  <span
                    className={`text-center text-sm font-medium tabular-nums ${champ.winRate >= 60 ? "text-emerald-400" : champ.winRate >= 50 ? "text-amber-300" : "text-red-400"}`}
                  >
                    {champ.winRate}%
                  </span>
                  <span className="text-center text-slate-300 text-sm tabular-nums">{champ.kda.toFixed(1)}</span>
                  <span className="text-center text-slate-400 text-sm tabular-nums">{champ.csPerMin.toFixed(1)}</span>
                  <span className="text-center text-slate-400 text-sm tabular-nums">{champ.dmgPerMin.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
