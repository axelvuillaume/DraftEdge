import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import api from "@/services/api"
import useStore from "@/services/store"
import { ChevronDown, ChevronUp } from "lucide-react"
import { getChampionIcon } from "@/utils"

export default function Stats() {
  const [stats, setStats] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useStore()

  const fetchStats = async () => {
    try {
      const { ok, data, code } = await api.post("/playerstats/player_stats", {})
      if (!ok) return toast.error(code)
      setStats(data)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 font-medium">Loading stats...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Players Grid */}
        <section>
          <div className="space-y-4">
            {stats.map((player, idx) => (
              <PlayerCard key={idx} player={player} />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function PlayerCard({ player }) {
  const [expanded, setExpanded] = useState(false)

  const winRateColor = player.win_rate >= 0.6 ? "text-emerald-400" : player.win_rate >= 0.5 ? "text-amber-400" : "text-red-400"
  const kdaColor = player.kda >= 3 ? "text-emerald-400" : player.kda >= 2 ? "text-amber-400" : "text-red-400"

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden transition-all duration-200 hover:border-slate-600/50">
      {/* Player Header */}
      <button onClick={() => setExpanded(!expanded)} className="w-full p-5 flex items-center justify-between hover:bg-slate-700/20 transition-colors">
        <div className="flex items-center gap-4">
          <div className="text-left">
            <h3 className="text-lg font-bold text-white">{player.summoner_name}</h3>
            <p className="text-slate-400 text-sm">{player.games} games</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Quick Stats */}
          <div className="hidden sm:flex items-center gap-6">
            <div className="bg-slate-700/30 rounded-lg p-3 text-center">
              <p className={`text-xl font-bold ${winRateColor}`}>{`${Math.round(player.win_rate * 100)}%`}</p>
              <p className="text-slate-500 text-xs">Win Rate</p>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-3 text-center">
              <p className={`text-xl font-bold ${kdaColor}`}>{player.kda.toFixed(2)}</p>
              <p className="text-slate-500 text-xs">KDA</p>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-3 text-center">
              <p className={`text-xl font-bold text-cyan-400`}>{player.cs_per_min.toFixed(1)}</p>
              <p className="text-slate-500 text-xs">CS/min</p>
            </div>
          </div>

          {expanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-700/50 p-5">
          {/* Champions Section */}
          <div>
            <div className="space-y-3">
              {player.champions.map(champion => (
                <ChampionCard key={champion.champion} champion={champion} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ChampionCard({ champion }) {
  const [expanded, setExpanded] = useState(false)

  const champWinRateColor = champion.win_rate >= 0.6 ? "text-emerald-400" : champion.win_rate >= 0.5 ? "text-amber-400" : "text-red-400"
  const champKdaColor = champion.kda >= 3 ? "text-emerald-400" : champion.kda >= 2 ? "text-amber-400" : "text-red-400"

  return (
    <div className={`rounded-2xl border border-slate-700/50`}>
      {/* Champion Header - Clickable */}
      <button onClick={() => setExpanded(!expanded)} className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-700/25 transition-colors">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 bg-slate-700/50 rounded-lg flex items-center justify-center text-xs font-bold text-slate-400 flex-shrink-0 overflow-hidden">
            <img src={getChampionIcon(champion.champion)} alt={champion.champion} className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm truncate">{champion.champion}</p>
            <p className="text-slate-500 text-xs">{champion.games} games</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-6 text-sm">
            <div className="text-center min-w-[70px]">
              <p className={`text-base font-bold ${champWinRateColor}`}>{Math.round(champion.win_rate * 100)}%</p>
              <p className="text-slate-500 text-xs">Win Rate</p>
            </div>
            <div className="text-center min-w-[60px]">
              <p className={`text-base font-bold ${champKdaColor}`}>{champion.kda.toFixed(2)}</p>
              <p className="text-slate-500 text-xs">KDA</p>
            </div>
            <div className="text-center min-w-[70px]">
              <p className="text-cyan-400 font-semibold">{champion.cs_per_min.toFixed(1)}</p>
              <p className="text-slate-500 text-xs">CS/min</p>
            </div>
          </div>
          {champion.matchups && champion.matchups.length > 0 && (expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />)}
        </div>
      </button>

      {/* Matchups Section */}
      {expanded && champion.matchups && champion.matchups.length > 0 && (
        <div className="border-t border-slate-700/30 bg-slate-900/30 px-6 py-4">
          <p className="text-slate-400 text-xs font-medium mb-3 uppercase tracking-wide">Matchups</p>
          <div className="space-y-2">
            {champion.matchups.map(matchup => {
              const matchupWinRateColor = matchup.win_rate >= 0.6 ? "text-emerald-400" : matchup.win_rate >= 0.5 ? "text-amber-400" : "text-red-400"
              const matchupKdaColor = matchup.kda >= 3 ? "text-emerald-400" : matchup.kda >= 2 ? "text-amber-400" : "text-red-400"
              const matchupBg =
                matchup.win_rate >= 0.6
                  ? "bg-emerald-500/10 border-emerald-500/20"
                  : matchup.win_rate >= 0.5
                    ? "bg-amber-500/10 border-amber-500/20"
                    : "bg-red-500/10 border-red-500/20"

              return (
                <div key={matchup.opponent} className={`rounded-xl px-4 py-3 border ${matchupBg} flex items-center justify-between`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-md overflow-hidden flex-shrink-0">
                      <img src={getChampionIcon(matchup.opponent)} alt={matchup.opponent} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">{matchup.opponent}</p>
                      <p className="text-slate-500 text-xs">{matchup.games} games</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 sm:gap-6 text-sm">
                    <div className="text-center min-w-[60px]">
                      <p className={`text-sm font-bold ${matchupWinRateColor}`}>{Math.round(matchup.win_rate * 100)}%</p>
                      <p className="text-slate-500 text-xs">Win Rate</p>
                    </div>
                    <div className="hidden sm:block text-center min-w-[50px]">
                      <p className={`text-sm font-bold ${matchupKdaColor}`}>{matchup.kda.toFixed(2)}</p>
                      <p className="text-slate-500 text-xs">KDA</p>
                    </div>
                    <div className="hidden sm:block text-center min-w-[50px]">
                      <p className="text-cyan-400 font-semibold text-sm">{matchup.cs_per_min.toFixed(1)}</p>
                      <p className="text-slate-500 text-xs">CS/min</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
