import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import api from "@/services/api"
import { Clock, ChevronDown, ChevronUp, Swords } from "lucide-react"
import useStore from "@/services/store"

const ROLE_ORDER = ["top", "jungle", "mid", "bottom", "support"]

const sortPlayersByRole = players => {
  return [...players].sort((a, b) => {
    const aIndex = ROLE_ORDER.indexOf(a.role?.toLowerCase())
    const bIndex = ROLE_ORDER.indexOf(b.role?.toLowerCase())
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex)
  })
}

const roleLabels = {
  top: "Top",
  jungle: "Jungle",
  mid: "Mid",
  bottom: "ADC",
  support: "Support"
}

const roleIconColors = {
  top: "text-orange-400",
  jungle: "text-emerald-400",
  mid: "text-blue-400",
  bottom: "text-red-400",
  support: "text-cyan-400"
}

export default function Games() {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useStore()

  const fetchGames = async () => {
    try {
      const { ok, data, code } = await api.post("/game/search", { team_id: user?.team_id })
      if (!ok) return toast.error(code)
      setGames(data)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGames()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 font-medium">Loading games...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Games List */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-6 bg-amber-500 rounded-full" />
            <h2 className="text-xl font-semibold text-white">Games History</h2>
          </div>

          <div className="space-y-3">
            {games.length === 0 ? (
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-12 text-center">
                <Swords className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No games recorded yet</p>
                <p className="text-slate-500 text-sm mt-1">Upload a screenshot to get started</p>
              </div>
            ) : (
              games.map(game => <GameCard key={game._id} game={game} />)
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

function GameCard({ game }) {
  const [expanded, setExpanded] = useState(false)
  const [playerStats, setPlayerStats] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchPlayerStats = async () => {
    if (playerStats.length > 0) return
    setLoading(true)
    try {
      const { ok, data, code } = await api.post("/playerstats/search", { game_id: game._id })
      if (!ok) return toast.error(code)
      setPlayerStats(data)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = () => {
    if (!expanded) fetchPlayerStats()
    setExpanded(!expanded)
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden transition-all duration-200 hover:border-slate-600/50">
      {/* Game Header */}
      <button onClick={handleToggle} className="w-full p-4 flex items-center justify-between hover:bg-slate-700/20 transition-colors">
        <div className="flex items-center gap-4">
          {/* Win/Loss Indicator */}
          <div className={`w-1.5 h-12 rounded-full ${game.win ? "bg-emerald-500" : "bg-red-500"}`} />

          <div className="text-left">
            <div className="flex items-center gap-3">
              <span className={`text-sm font-bold uppercase tracking-wider ${game.win ? "text-emerald-400" : "text-red-400"}`}>{game.win ? "Victory" : "Defeat"}</span>
              <span className="text-slate-500 text-sm">•</span>
              <span className="text-slate-400 text-sm flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {Math.floor(game.duration / 60)}m{game.duration % 60}
              </span>
            </div>
            <p className="text-slate-500 text-sm mt-0.5">{game.date}</p>
            {game.name && <p className="text-slate-600 text-xs mt-0.5">{game.name}</p>}
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Team Score Preview */}
          <div className="hidden sm:flex items-center gap-4 text-sm">
            <div className="text-center">
              <p className="text-white font-semibold">
                {game.blue_team?.total_kills || 0}/{game.blue_team?.total_deaths || 0}/{game.blue_team?.total_assists || 0}
              </p>
              <p className="text-xs text-slate-500">Blue</p>
            </div>
            <span className="text-slate-600">vs</span>
            <div className="text-center">
              <p className="text-white font-semibold">
                {game.red_team?.total_kills || 0}/{game.red_team?.total_deaths || 0}/{game.red_team?.total_assists || 0}
              </p>
              <p className="text-xs text-slate-500">Red</p>
            </div>
          </div>

          {expanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-slate-700/50 p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Your Team */}
              <div>
                <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  Your Team
                </h4>
                <div className="space-y-2">
                  {sortPlayersByRole(playerStats.filter(p => !p.opponent)).map((player, idx) => (
                    <PlayerRow key={idx} player={player} />
                  ))}
                </div>
              </div>

              {/* Opponents */}
              <div>
                <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  Opponents
                </h4>
                <div className="space-y-2">
                  {sortPlayersByRole(playerStats.filter(p => p.opponent)).map((player, idx) => (
                    <PlayerRow key={idx} player={player} isOpponent />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PlayerRow({ player, isOpponent = false }) {
  const role = player.role?.toLowerCase()
  const roleColor = roleIconColors[role] || "text-slate-400"
  const roleLabel = roleLabels[role] || player.role || "?"

  return (
    <div className={`flex items-center justify-between p-2.5 rounded-lg ${isOpponent ? "bg-red-500/5" : "bg-blue-500/5"}`}>
      <div className="flex items-center gap-3 min-w-0">
        {/* Champion & Player Info */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-white text-sm font-medium truncate">{player.champion}</p>
            <span className={`text-xs px-1.5 py-0.5 rounded ${roleColor} bg-slate-700/50`}>{roleLabel}</span>
          </div>
          <p className="text-slate-500 text-xs truncate">{player.summoner_name}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm">
        <div className="text-right">
          <div className="flex items-center gap-1.5">
            <span className="text-emerald-400">{player.kills}</span>
            <span className="text-slate-600">/</span>
            <span className="text-red-400">{player.deaths}</span>
            <span className="text-slate-600">/</span>
            <span className="text-cyan-400">{player.assists}</span>
          </div>
          <p className="text-slate-500 text-xs">
            {player.deaths > 0 ? ((player.kills + player.assists) / player.deaths).toFixed(1) : (player.kills + player.assists).toFixed(1)} KDA
          </p>
        </div>

        <div className="text-right w-16">
          <p className="text-amber-400 text-sm">{(player.gold / 1000).toFixed(1)}k</p>
          <p className="text-slate-500 text-xs">{player.creep} CS</p>
        </div>
      </div>
    </div>
  )
}
