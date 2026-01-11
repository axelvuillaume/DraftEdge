import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import api from "@/services/api"
import { Clock, Swords, Trash2, Eye, X, MoreVertical, Pencil, Save, Shield, DollarSign, Target } from "lucide-react"
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
        <section>
          <div className="space-y-3">
            {games.map(game => (
              <GameCard key={game._id} game={game} onDelete={fetchGames} />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function GameCard({ game, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const [playerStats, setPlayerStats] = useState([])
  const [loading, setLoading] = useState(false)
  const [showScreenshot, setShowScreenshot] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")

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

  const handleDelete = async e => {
    e.stopPropagation()
    if (!confirm("Are you sure you want to delete this game?")) return

    try {
      const { ok, code } = await api.delete(`/game/${game._id}`)
      if (!ok) return toast.error(code)
      toast.success("Game deleted successfully")
      onDelete()
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-visible transition-all duration-200 hover:border-slate-600/50 relative">
      {/* Game Header */}
      <button onClick={handleToggle} className="w-full p-4 flex items-center justify-between hover:bg-slate-700/20 transition-colors">
        <div className="flex items-center gap-4">
          {/* Win/Loss Indicator */}
          <div className={`w-1.5 h-12 rounded-full ${game.win ? "bg-emerald-500" : "bg-red-500"}`} />

          <div className="text-left">
            <div className="flex items-center gap-3">
              <span className={`text-base font-bold uppercase tracking-wider ${game.win ? "text-emerald-400" : "text-red-400"}`}>{game.win ? "Victory" : "Defeat"}</span>
              <span className="text-white text-base font-medium">{new Date(game.date).toLocaleDateString(undefined, { day: "2-digit", month: "2-digit", year: "numeric" })} </span>
              <span className="text-slate-500 text-sm">•</span>
              <span className="text-slate-400 text-sm flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {Math.floor(game.duration / 60)}m{game.duration % 60}
              </span>
            </div>
            {game.name && <p className="text-slate-600 text-xs mt-0.5">{game.name}</p>}
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Team Score Preview */}
          <div className="hidden sm:flex items-center gap-4 text-sm">
            <div className="text-center">
              <p className="text-white font-semibold">
                {game.blue_team?.kills || 0}/{game.blue_team?.deaths || 0}/{game.blue_team?.assists || 0}
              </p>
              <p className="text-xs text-slate-500">Blue</p>
            </div>
            <span className="text-slate-600">vs</span>
            <div className="text-center">
              <p className="text-white font-semibold">
                {game.red_team?.kills || 0}/{game.red_team?.deaths || 0}/{game.red_team?.assists || 0}
              </p>
              <p className="text-xs text-slate-500">Red</p>
            </div>
          </div>

          {isEditing && (
            <button
              onClick={e => {
                e.stopPropagation()
                setIsEditing(false)
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black text-sm font-medium transition-colors"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
          )}

          {/* Dropdown Menu */}
          <div className="relative">
            <button
              onClick={e => {
                e.stopPropagation()
                setShowDropdown(!showDropdown)
              }}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            {showDropdown && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={e => {
                    e.stopPropagation()
                    setShowDropdown(false)
                  }}
                />
                <div className="absolute right-0 top-full mt-1 w-40 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 py-1">
                  {game.screenshot && (
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        setShowScreenshot(true)
                        setShowDropdown(false)
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700/50 hover:text-white flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      Screenshot
                    </button>
                  )}
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      setIsEditing(!isEditing)
                      setShowDropdown(false)
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700/50 hover:text-white flex items-center gap-2"
                  >
                    <Pencil className="w-4 h-4" />
                    Éditer
                  </button>
                  <button onClick={handleDelete} className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    Supprimer
                  </button>
                </div>
              </>
            )}
          </div>
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
            <div>
              {/* Tabs */}
              <div className="flex items-center gap-4 mb-6 border-b border-slate-700/50">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                    activeTab === "overview" ? "text-white border-amber-500" : "text-slate-400 border-transparent hover:text-white"
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  Scoreboard
                </button>
                <button
                  onClick={() => setActiveTab("damage")}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                    activeTab === "damage" ? "text-white border-amber-500" : "text-slate-400 border-transparent hover:text-white"
                  }`}
                >
                  <Swords className="w-4 h-4" />
                  Damage
                </button>
                <button
                  onClick={() => setActiveTab("income")}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                    activeTab === "income" ? "text-white border-amber-500" : "text-slate-400 border-transparent hover:text-white"
                  }`}
                >
                  <DollarSign className="w-4 h-4" />
                  Income
                </button>
                <button
                  onClick={() => setActiveTab("vision")}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                    activeTab === "vision" ? "text-white border-amber-500" : "text-slate-400 border-transparent hover:text-white"
                  }`}
                >
                  <Target className="w-4 h-4" />
                  Vision
                </button>
              </div>

              {/* Tab Content */}
              {activeTab === "overview" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Your Team */}
                  <div>
                    <div className="space-y-2">
                      {sortPlayersByRole(playerStats.filter(p => !p.opponent)).map((player, idx) => (
                        <PlayerRow key={player._id || idx} player={player} isEditing={isEditing} />
                      ))}
                    </div>
                  </div>

                  {/* Opponents */}
                  <div>
                    <div className="space-y-2">
                      {sortPlayersByRole(playerStats.filter(p => p.opponent)).map((player, idx) => (
                        <PlayerRow key={player._id || idx} player={player} isOpponent isEditing={isEditing} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "damage" && <DamageTab playerStats={playerStats} />}
              {activeTab === "income" && <IncomeTab playerStats={playerStats} />}
              {activeTab === "vision" && <VisionTab playerStats={playerStats} />}
            </div>
          )}
        </div>
      )}

      {/* Screenshot Modal */}
      {showScreenshot && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowScreenshot(false)}>
          <div className="relative max-w-5xl w-full max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowScreenshot(false)}
              className="absolute -top-3 -right-3 w-10 h-10 flex items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 text-white shadow-lg transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={`data:image/png;base64,${game.screenshot}`} alt="Game Screenshot" className="w-full h-auto rounded-xl shadow-2xl border border-slate-600/50" />
          </div>
        </div>
      )}
    </div>
  )
}

function PlayerRow({ player, isOpponent = false, isEditing }) {
  const [champion, setChampion] = useState(player.champion)

  const handleSave = async () => {
    try {
      const { ok, code } = await api.put(`/playerstats/${player._id}`, { champion })
      if (!ok) return toast.error(code)
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <div className={`flex items-center justify-between p-2.5 rounded-lg ${isOpponent ? "bg-red-500/5" : "bg-blue-500/5"}`}>
      <div className="flex items-center gap-3 min-w-0">
        {champion && (
          <div className="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-slate-700/50 border border-slate-600/50">
            <img src={`/champions/${champion}.png`} alt={champion} className="w-full h-full object-cover" />
          </div>
        )}
        {/* Champion & Player Info */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {isEditing && (
              <input
                type="text"
                value={champion}
                onChange={e => setChampion(e.target.value)}
                onBlur={handleSave}
                onKeyDown={e => e.key === "Enter" && e.target.blur()}
                className="bg-transparent text-white text-sm font-medium w-24 px-1 py-0.5 rounded border border-transparent hover:border-slate-600 focus:border-amber-500 focus:outline-none"
              />
            )}
            <div className="flex items-center gap-2 min-w-0">
              <a
                href={`https://dpm.lol/${player.summoner_name}-${player.riot_tag}`}
                target="_blank"
                rel="noreferrer"
                className="text-white text-sm font-medium truncate hover:text-amber-400 transition-colors"
              >
                {player.summoner_name}
              </a>
              {player.tier && (
                <span className="text-slate-400 text-[10px] font-medium uppercase bg-slate-700/50 px-1.5 py-0.5 rounded">
                  {player.tier} {["MASTER", "GRANDMASTER", "CHALLENGER"].includes(player.tier.toUpperCase()) ? `${player.league_points} LP` : player.rank}
                </span>
              )}
            </div>
            <span className={`text-xs px-1.5 py-0.5 rounded ${roleIconColors[player.role]} bg-slate-700/50 flex-shrink-0`}>{roleLabels[player.role]}</span>
          </div>
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
          <p className="text-slate-500 text-xs">{player.cs} CS</p>
        </div>
      </div>
    </div>
  )
}

function DamageTab({ playerStats }) {
  const yourTeam = sortPlayersByRole(playerStats.filter(p => !p.opponent))
  const opponents = sortPlayersByRole(playerStats.filter(p => p.opponent))

  const allPlayers = [...playerStats]
  const maxDamage = Math.max(...allPlayers.map(p => p.damage?.total_to_champions || 0))

  const DamageCard = ({ player, maxDamage }) => {
    const totalDamage = player?.damage?.total_to_champions || 0
    const physDamage = player?.damage?.physical_to_champions || 0
    const magicDamage = player?.damage?.magic_to_champions || 0
    const trueDamage = player?.damage?.true_to_champions || 0

    const physPercent = totalDamage > 0 ? (physDamage / totalDamage) * 100 : 0
    const magicPercent = totalDamage > 0 ? (magicDamage / totalDamage) * 100 : 0
    const truePercent = totalDamage > 0 ? (trueDamage / totalDamage) * 100 : 0

    return (
      <div className="flex-1 group relative p-2 rounded-lg bg-slate-800/30">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="text-white text-sm font-medium mb-1">{player?.champion || "Unknown"}</div>
            <div className="relative">
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full flex rounded-full" style={{ width: `${maxDamage > 0 ? (totalDamage / maxDamage) * 100 : 0}%` }}>
                  <div className="bg-orange-500" style={{ width: `${physPercent}%` }} />
                  <div className="bg-blue-500" style={{ width: `${magicPercent}%` }} />
                  <div className="bg-slate-300" style={{ width: `${truePercent}%` }} />
                </div>
              </div>

              {/* Tooltip */}
              <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                <div className="text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span className="text-orange-400">{(physDamage / 1000).toFixed(1)}k Physical</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-blue-400">{(magicDamage / 1000).toFixed(1)}k Magic</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
                    <span className="text-slate-300">{(trueDamage / 1000).toFixed(1)}k True</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="text-white font-semibold text-sm ml-3">{(totalDamage / 1000).toFixed(1)}k</div>
        </div>
      </div>
    )
  }

  const DamageRow = ({ leftPlayer, rightPlayer, maxDamage }) => {
    return (
      <div className="flex items-center gap-2">
        <DamageCard player={leftPlayer} maxDamage={maxDamage} />

        {/* VS Icon */}
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-700 border border-slate-600">
          <Swords className="w-3 h-3 text-slate-400" />
        </div>

        <DamageCard player={rightPlayer} maxDamage={maxDamage} />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {yourTeam.map((yourPlayer, idx) => {
        const opponentPlayer = opponents[idx]

        return <DamageRow key={idx} leftPlayer={yourPlayer} rightPlayer={opponentPlayer} maxDamage={maxDamage} />
      })}
    </div>
  )
}

function IncomeTab({ playerStats }) {
  const yourTeam = sortPlayersByRole(playerStats.filter(p => !p.opponent))
  const opponents = sortPlayersByRole(playerStats.filter(p => p.opponent))

  const allPlayers = [...playerStats]
  const maxGold = Math.max(...allPlayers.map(p => p.gold || 0))

  const IncomeCard = ({ player, maxGold }) => {
    const goldEarned = player?.gold || 0
    const totalMinions = player?.farm?.minions || 0
    const neutralMinions = player?.farm?.jungle_monsters || 0

    return (
      <div className="flex-1 group relative p-2 rounded-lg bg-slate-800/30">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="text-white text-sm font-medium mb-1">{player?.champion || "Unknown"}</div>
            <div className="relative">
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${maxGold > 0 ? (goldEarned / maxGold) * 100 : 0}%` }} />
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                <span>{totalMinions} minions</span>
                <span>{neutralMinions} jungle</span>
              </div>
            </div>
          </div>
          <div className="text-amber-400 font-semibold text-sm ml-3">{(goldEarned / 1000).toFixed(1)}k</div>
        </div>
      </div>
    )
  }

  const IncomeRow = ({ leftPlayer, rightPlayer, maxGold }) => {
    return (
      <div className="flex items-center gap-2">
        <IncomeCard player={leftPlayer} maxGold={maxGold} />

        {/* VS Icon */}
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-700 border border-slate-600">
          <Swords className="w-3 h-3 text-slate-400" />
        </div>

        <IncomeCard player={rightPlayer} maxGold={maxGold} />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {yourTeam.map((yourPlayer, idx) => {
        const opponentPlayer = opponents[idx]

        return <IncomeRow key={idx} leftPlayer={yourPlayer} rightPlayer={opponentPlayer} maxGold={maxGold} />
      })}
    </div>
  )
}

function VisionTab({ playerStats }) {
  const yourTeam = sortPlayersByRole(playerStats.filter(p => !p.opponent))
  const opponents = sortPlayersByRole(playerStats.filter(p => p.opponent))

  const allPlayers = [...playerStats]
  const maxVisionScore = Math.max(...allPlayers.map(p => p.vision?.score || 0))

  const VisionCard = ({ player, maxVisionScore }) => {
    const visionScore = player?.vision?.score || 0
    const controlWards = player?.vision?.control_wards_bought || 0
    const wardsDestroyed = player?.vision?.wards_killed || 0
    const wardsPlaced = player?.vision?.wards_placed || 0

    return (
      <div className="flex-1 group relative p-2 rounded-lg bg-slate-800/30">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="text-white text-sm font-medium mb-1">{player?.champion || "Unknown"}</div>
            <div className="relative">
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: `${maxVisionScore > 0 ? (visionScore / maxVisionScore) * 100 : 0}%` }} />
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                <span className="text-purple-400">{controlWards} pink</span>
                <span>{wardsDestroyed} destroyed</span>
                <span>{wardsPlaced} placed</span>
              </div>
            </div>
          </div>
          <div className="text-purple-400 font-semibold text-sm ml-3">{visionScore}</div>
        </div>
      </div>
    )
  }

  const VisionRow = ({ leftPlayer, rightPlayer, maxVisionScore }) => {
    return (
      <div className="flex items-center gap-2">
        <VisionCard player={leftPlayer} maxVisionScore={maxVisionScore} />

        {/* VS Icon */}
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-700 border border-slate-600">
          <Swords className="w-3 h-3 text-slate-400" />
        </div>

        <VisionCard player={rightPlayer} maxVisionScore={maxVisionScore} />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {yourTeam.map((yourPlayer, idx) => {
        const opponentPlayer = opponents[idx]

        return <VisionRow key={idx} leftPlayer={yourPlayer} rightPlayer={opponentPlayer} maxVisionScore={maxVisionScore} />
      })}
    </div>
  )
}
