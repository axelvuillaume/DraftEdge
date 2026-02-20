import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import api from "@/services/api"
import useStore from "@/services/store"
import { getChampionIcon } from "@/utils"
import { Trophy, Swords, Target, TrendingUp, Clock, Shield, Crosshair, Zap, Gamepad2, TrendingDown, AlertTriangle, Info } from "lucide-react"
import Sheet from "@/components/sheet"
import { PatternIcon, ObjectivesIcon, ScalingIcon, CombatIcon } from "@/components/icons/performance-icons"

export default function FutureHome() {
  const [stats, setStats] = useState()
  const [gameStats, setGameStats] = useState()
  const [games, setGames] = useState([])
  const [bestChampions, setBestChampions] = useState([])
  const { user, globalFilters } = useStore()
  const [selectedBubble, setSelectedBubble] = useState(null)

  const fetchGameStats = async () => {
    try {
      const { ok, data, code } = await api.post("/game/header-stats", { ...globalFilters })
      if (!ok) return toast.error(code)
      setGameStats(data)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const fetchCardAverage = async () => {
    try {
      const { ok, data, code } = await api.post("/playerstats/card_average", { ...globalFilters })
      if (!ok) return toast.error(code)
      setStats(data)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const fetchBestChampions = async () => {
    try {
      const { ok, data, code } = await api.post("/playerstats/best_wr", { ...globalFilters })
      if (!ok) return toast.error(code)
      setBestChampions(data)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const fetchGames = async () => {
    try {
      const { ok, data, code } = await api.post("/game/search", { ...globalFilters, limit: 50, team_id: user?.team_id })
      if (!ok) return toast.error(code)
      setGames(data)
    } catch (error) {
      toast.error(error.message)
    }
  }
  const fetchAll = async () => {
    await Promise.all([fetchCardAverage(), fetchGameStats(), fetchGames(), fetchBestChampions()])
  }

  useEffect(() => {
    fetchAll()
  }, [globalFilters.patch, globalFilters.folder_id, globalFilters.opponent_name])

  const avgKDA =
    stats?.allies?.total && stats.allies.total.deaths > 0
      ? (stats.allies.total.kills + stats.allies.total.assists) / stats.allies.total.deaths
      : stats?.allies?.total?.kills + stats?.allies?.total?.assists || 0

  const winRateBySide = () => {
    const blueGames = games.filter(game => game.team_side === "blue")
    const redGames = games.filter(game => game.team_side === "red")

    const blueWins = blueGames.filter(game => game.win).length || 0
    const redWins = redGames.filter(game => game.win).length || 0

    return {
      blue: { winRate: (blueWins / blueGames.length) * 100, total: blueGames.length, wins: blueWins },
      red: { winRate: (redWins / redGames.length) * 100, total: redGames.length, wins: redWins }
    }
  }

  const sideStats = winRateBySide()

  return (
    <div className="min-h-[calc(100vh-65px)] flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <Sheet isOpen={!!selectedBubble} onClose={() => setSelectedBubble(null)} title={selectedBubble?.title || "Details"} modal={false}>
        {selectedBubble && <BubbleDetailView bubble={selectedBubble} />}
      </Sheet>

      <div className="max-w-[1800px] w-full mx-auto flex-1 flex flex-col gap-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Games Played Card */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center">
                <Gamepad2 className="w-4 h-4 text-teal-400" />
              </div>
              <p className="text-xs text-slate-400">Games Played:</p>
            </div>
            <p className="text-2xl font-bold text-white">{gameStats?.total_games || 0}</p>
          </div>

          {/* Win Rate Card */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-green-400" />
              </div>
              <p className="text-xs text-slate-400">Win Rate:</p>
            </div>
            <p className="text-2xl font-bold text-white">{(gameStats?.win_rate * 100).toFixed(1)}%</p>
          </div>

          {/* Average Duration Card */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                <Clock className="w-4 h-4 text-orange-400" />
              </div>
              <p className="text-xs text-slate-400">Average Duration:</p>
            </div>
            <p className="text-2xl font-bold text-white whitespace-nowrap">
              {Math.floor(Math.round(games.reduce((sum, game) => sum + (game.duration || 0), 0) / games.length) / 60)}:
              {Math.round(games.reduce((sum, game) => sum + game.duration, 0) % 60)}
            </p>
          </div>

          {/* Average KDA Card */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                <span className="text-[10px] font-bold text-purple-400">KDA</span>
              </div>
              <p className="text-xs text-slate-400">Average KDA:</p>
            </div>
            <p className="text-2xl font-bold text-white">{avgKDA.toFixed(2)}</p>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7">
            <PerformanceMindMap onNodeClick={setSelectedBubble} />
          </div>
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Elo Enemi Moyen Card */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex flex-col items-center">
                <h3 className="text-sm font-semibold text-white mb-2 self-start uppercase tracking-wider opacity-70">Elo Enemy Average</h3>
                <div className="flex-1 flex flex-col items-center justify-center">
                  <img
                    src={`/rank/${gameStats?.avg_enemy_rank?.tier?.toLowerCase()}.png`}
                    alt={gameStats?.avg_enemy_rank?.tier}
                    className="w-24 h-24 object-contain drop-shadow-[0_0_20px_rgba(59,130,246,0.3)] mb-1"
                  />
                  <div className="flex flex-col items-center">
                    <span className="text-3xl font-black text-white tracking-tight">
                      {gameStats?.avg_enemy_rank?.rank} {gameStats?.avg_enemy_rank?.lp || 0}
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">LP</span>
                  </div>
                </div>
              </div>

              {/* Stats: Win Selon le Side */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider opacity-70">Win Rate / Side</h3>

                <div className="flex items-end justify-center gap-4 h-32">
                  {/* Blue Side Bar */}
                  <div className="flex flex-col items-center gap-2 flex-1 max-w-[50px] h-full">
                    <div className="relative w-full h-full flex items-end justify-center">
                      <div
                        className="w-6 bg-blue-500/80 transition-all duration-500 rounded-t-lg shadow-[0_0_15px_rgba(59,130,246,0.2)] relative"
                        style={{ height: `${Math.min(sideStats.blue.winRate || 0, 100)}%` }}
                      >
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white whitespace-nowrap">
                          {Math.round(sideStats.blue.winRate || 0)}%
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-medium text-blue-400">Blue</span>
                    <span className="text-[9px] text-slate-500">{sideStats.blue.total}g</span>
                  </div>

                  {/* Red Side Bar */}
                  <div className="flex flex-col items-center gap-2 flex-1 max-w-[50px] h-full">
                    <div className="relative w-full h-full flex items-end justify-center">
                      <div
                        className="w-6 bg-red-500/80 transition-all duration-500 rounded-t-lg shadow-[0_0_15px_rgba(239,68,68,0.2)] relative"
                        style={{ height: `${Math.min(sideStats.red.winRate || 0, 100)}%` }}
                      >
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white whitespace-nowrap">
                          {Math.round(sideStats.red.winRate || 0)}%
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-medium text-red-400">Red</span>
                    <span className="text-[9px] text-slate-500">{sideStats.red.total}g</span>
                  </div>
                </div>
              </div>
            </div>
            <WinRateByDuration games={games} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <BestChampions data={bestChampions} />
        </div>
      </div>
    </div>
  )
}

function BubbleDetailView({ bubble }) {
  const { user, globalFilters } = useStore()
  const [data, setData] = useState([])
  const [scores, setScores] = useState([])
  const [globalScore, setGlobalScore] = useState(null)
  const [filters, setFilters] = useState({ role: undefined })

  const fetchplayerstats = async () => {
    try {
      const { ok, data, scores, score, code } = await api.post("/playerstats/bubble_stats", { ...globalFilters, ...filters, category: bubble?.title })
      if (!ok) return toast.error(code)
      setData(data)
      setScores(scores || [])
      setGlobalScore(score ?? null)
    } catch (error) {
      toast.error(error.message)
    }
  }
  useEffect(() => {
    fetchplayerstats()
  }, [filters, globalFilters.patch, globalFilters.folder_id, globalFilters.opponent_name])

  const toggleRoleFilter = role => {
    setFilters(prev => {
      if (prev.role === role) {
        const { role: removed, ...rest } = prev
        return rest
      }
      return { ...prev, role }
    })
  }

  const teamScore = globalScore !== null ? globalScore : scores.length > 0 ? (scores.reduce((acc, curr) => acc + curr.score, 0) / scores.length).toFixed(1) : 0

  // Mock analysis data - À remplacer par des données venant de l'API plus tard
  const analysis = {
    weaknesses: [
      { role: "TOP", title: "Lane Pressure", desc: "Top loses too many 1v1 trades, -27% solo kills vs opponents" },
      { role: "SUP", title: "Support Survivability", desc: "Support meurt trop souvent, positioning to improve" },
      { role: "ADC", title: "Safety", desc: "ADC good DPS but +19% deaths, protect better in TF" }
    ],
    strengths: [
      { role: "MID", title: "Mid Dominance", desc: "Mid carries the fights, +17% DMG vs lane opponent" },
      { role: "JGL", title: "Jungle Skirmish", desc: "JGL steals more camps on average than others" }
    ]
  }

  return (
    <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-800 p-6">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Colonne Gauche: Filtres + Tableau */}
        <div className="flex flex-col h-full">
          {/* Header Filters */}
          <div className="flex items-center gap-4 mb-6 flex-wrap">
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all ${
                !filters.role ? "bg-slate-800 border-slate-600 ring-1 ring-slate-500" : "bg-slate-800/50 border-slate-700/50 hover:bg-slate-800"
              }`}
              onClick={() => setFilters(prev => ({ ...prev, role: undefined }))}
            >
              <div className="p-1 rounded bg-slate-700">
                <Gamepad2 className="w-4 h-4 text-slate-400" />
              </div>
              <span className="text-white font-bold">TEAM</span>
            </div>

            {[{ role: "top" }, { role: "jungle" }, { role: "mid" }, { role: "bottom" }, { role: "support" }].map(roleDef => {
              const score = scores?.find(s => s.role === roleDef.role)?.score || 0
              return (
                <div
                  key={roleDef.role}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all ${
                    filters.role === roleDef.role ? "bg-slate-800 border-slate-600 ring-1 ring-slate-500" : "bg-slate-800/50 border-slate-700/50 hover:bg-slate-800"
                  }`}
                  onClick={() => toggleRoleFilter(roleDef.role)}
                >
                  <span className="text-slate-400 text-sm font-medium">{roleDef.role}</span>
                  <span className={`font-bold ${score >= 70 ? "text-emerald-400" : score >= 50 ? "text-orange-400" : "text-red-400"}`}>{score}</span>
                </div>
              )
            })}
          </div>

          {/* Stats Table */}
          <div className="w-full flex-1">
            <div className="grid grid-cols-4 gap-4 px-4 py-2 border-b border-slate-700/50 text-sm font-medium text-slate-400">
              <div>Metric</div>
              <div className="text-center">Team</div>
              <div className="text-center">Enemies</div>
              <div className="text-right">Diff</div>
            </div>

            <div className="divide-y divide-slate-700/50">
              {data.map((row, i) => {
                return (
                  <div key={i} className="grid grid-cols-4 gap-4 px-4 py-3 hover:bg-slate-800/30 transition-colors items-center text-sm">
                    <div className="text-slate-200 font-medium">{row.label}</div>
                    <div className="text-center text-white font-mono">
                      {row.team}
                      {row.label.includes("%") ? "%" : ""}
                    </div>
                    <div className="text-center text-slate-400 font-mono">
                      {row.enemy}
                      {row.label.includes("%") ? "%" : ""}
                    </div>
                    <div className={`text-right font-bold font-mono ${row.team > row.enemy ? "text-emerald-400" : "text-red-400"} flex items-center justify-end gap-2`}>
                      {row.diff}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Colonne Droite: Score + Insights */}
        <div className="space-y-6">
          {/* Global Score Card */}
          <div className="bg-slate-950/40 border border-slate-800 p-6 rounded-xl flex items-center gap-6 shadow-xl">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center border border-slate-700/50" style={{ backgroundColor: bubble.color + "20" }}>
              <bubble.icon className="w-8 h-8" style={{ color: bubble.color }} />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-black text-white uppercase tracking-wider mb-1" style={{ color: bubble.color }}>
                {bubble.title}
              </h3>
              <p className="text-sm text-slate-500 font-medium">{user?.team_name || "Team"} • Moyenne</p>
            </div>
            <div className="text-right">
              <div className="text-5xl font-black text-white tracking-tighter">{teamScore}</div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">/ 100</div>
            </div>
          </div>

          {/* Analysis Section */}
          <div className="space-y-4">
            <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">Improvements section and strengths section are place holders, feature not implemented yet</p>

            {/* Points à Améliorer */}
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <h4 className="text-red-400 font-bold text-base">Areas for Improvement</h4>
              </div>
              <div className="space-y-4">
                {analysis.weaknesses.map((item, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 shrink-0" />
                    <div>
                      <div className="text-white font-semibold text-sm">
                        <span className="text-red-400 mr-2 uppercase text-xs font-bold tracking-wider">{item.role}</span>
                        {item.title}
                      </div>
                      <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Points Forts */}
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <h4 className="text-emerald-400 font-bold text-base">Strengths</h4>
              </div>
              <div className="space-y-4">
                {analysis.strengths.map((item, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                    <div>
                      <div className="text-white font-semibold text-sm">
                        <span className="text-emerald-400 mr-2 uppercase text-xs font-bold tracking-wider">{item.role}</span>
                        {item.title}
                      </div>
                      <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PerformanceMindMap({ onNodeClick }) {
  const { globalFilters } = useStore()
  const [teamPerformance, setTeamPerformance] = useState()

  const nodes = [
    { id: 1, x: 20, y: 20, color: "#3b82f6", icon: CombatIcon, title: "Combat" }, // Top Left
    { id: 2, x: 80, y: 20, color: "#f97316", icon: ObjectivesIcon, title: "Objectives" }, // Top Right
    { id: 3, x: 80, y: 80, color: "#0ea5e9", icon: PatternIcon, title: "Vision" }, // Bottom Right
    { id: 4, x: 20, y: 80, color: "#a855f7", icon: ScalingIcon, title: "Income" } // Bottom Left
  ]

  const fetchTeamPerformance = async () => {
    try {
      const { ok, data, code } = await api.post("/playerstats/team_performance", { ...globalFilters })
      if (!ok) return toast.error(code)
      setTeamPerformance(data)
    } catch (error) {
      toast.error(error.message)
    }
  }
  useEffect(() => {
    fetchTeamPerformance()
  }, [globalFilters.patch, globalFilters.folder_id, globalFilters.opponent_name])

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-4 relative min-h-[400px] h-full flex items-center justify-center overflow-hidden">
      {/* Title */}
      <div className="absolute top-4 left-4">
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider opacity-70">Team performance</h3>
      </div>

      {/* Glow background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="absolute inset-0 pointer-events-none">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            {nodes.map(node => (
              <linearGradient key={`grad-${node.id}`} id={`grad-${node.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.4" />
                <stop offset="100%" stopColor={node.color} stopOpacity="0.6" />
              </linearGradient>
            ))}
          </defs>
          {nodes.map(node => {
            const dx = node.x - 50
            const cp1X = 50 + dx * 0.4
            const cp1Y = 50
            const cp2X = node.x - dx * 0.4
            const cp2Y = node.y

            return (
              <path
                key={node.id}
                d={`M ${50} ${50} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${node.x} ${node.y}`}
                fill="none"
                stroke={`url(#grad-${node.id})`}
                strokeWidth="0.6"
                strokeLinecap="round"
                className="transition-all duration-1000 opacity-40"
              />
            )
          })}
        </svg>
      </div>

      {/* Central Node */}
      <div className="relative z-10 w-24 h-24 bg-slate-800/80 backdrop-blur-xl border border-slate-700/50 rounded-[2rem] flex items-center justify-center shadow-2xl">
        <div className="text-center">
          <span className="text-4xl font-black text-white tracking-tighter">{Math.floor(teamPerformance?.globalScore)}</span>
          <span className="text-xl font-bold text-slate-500">{(teamPerformance?.globalScore % 1).toFixed(1).substring(1)}</span>
        </div>
      </div>

      {/* Surrounding Nodes */}
      {nodes.map(node => {
        const categoryScore = teamPerformance?.categoryScores?.find(c => c.category === node.title)?.score ?? 50
        return (
          <div
            key={node.id}
            className="absolute z-20 w-12 h-12 bg-slate-800/90 backdrop-blur-md border border-slate-700/50 rounded-2xl flex flex-col items-center justify-end overflow-hidden shadow-lg transition-all duration-300 hover:scale-110 group cursor-pointer"
            style={{
              left: `${node.x}%`,
              top: `${node.y}%`,
              transform: "translate(-50%, -50%)"
            }}
            onClick={() => onNodeClick && onNodeClick(node)}
          >
            {/* Liquid/Level fill effect */}
            <div
              className="absolute bottom-0 left-0 w-full transition-all duration-1000 opacity-30"
              style={{
                height: `${categoryScore}%`,
                backgroundColor: node.color,
                boxShadow: `0 0 20px ${node.color}`
              }}
            />

            <div className="relative mb-2 z-10 transition-transform duration-300 group-hover:scale-110">
              <node.icon className="w-5 h-5" style={{ color: node.color, filter: `drop-shadow(0 0 8px ${node.color})` }} />
            </div>

            {/* Decorative radiating lines */}
            <div className="absolute inset-[-15px] pointer-events-none opacity-20">
              {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
                <div key={angle} className="absolute top-1/2 left-1/2 w-5 h-[1px] bg-slate-400 origin-left" style={{ transform: `rotate(${angle}deg) translate(28px)` }} />
              ))}
            </div>

            {/* Glow ring on hover */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="w-full h-full rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 ring-2 ring-inset" style={{ borderColor: node.color }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function WinRateByDuration({ games }) {
  const calculateStats = () => {
    // ... same logic
    const buckets = [
      { label: "-20", min: 0, max: 20 },
      { label: "20-25", min: 20, max: 25 },
      { label: "25-30", min: 25, max: 30 },
      { label: "30-35", min: 30, max: 35 },
      { label: "35+", min: 35, max: Infinity }
    ]

    const stats = buckets.map(b => ({ ...b, wins: 0, losses: 0 }))

    games.forEach(game => {
      const durationMin = game.duration / 60
      const bucket = stats.find(b => durationMin >= b.min && durationMin < b.max)
      if (bucket) game.win ? bucket.wins++ : bucket.losses++
    })

    return stats.map(s => ({ ...s, total: s.wins + s.losses, winRate: s.wins + s.losses > 0 ? Math.round((s.wins / (s.wins + s.losses)) * 100) : 0 }))
  }

  const stats = calculateStats()

  return (
    <div className="flex-1 bg-gradient-to-br from-slate-800/80 to-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-4 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider opacity-70">Win Rate / Duration</h3>
      </div>

      <div className="relative flex-1 min-h-[10rem] w-full mt-2">
        {/* Y-axis labels & Grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6">
          {[100, 75, 50, 25, 0].map(val => (
            <div key={val} className="flex items-center gap-2 w-full">
              <span className={`text-[10px] w-6 text-right ${val === 50 ? "text-slate-400 font-medium" : "text-slate-500"}`}>{val}%</span>
              <div className={`flex-1 border-t border-dashed ${val === 50 ? "border-slate-500/60" : "border-slate-700/30"}`} />
            </div>
          ))}
        </div>

        {/* Chart Area */}
        <div className="absolute inset-0 ml-8 pb-6 flex items-end justify-between px-2">
          {stats.map((stat, i) => {
            const height = stat.winRate
            return (
              <div key={i} className="relative flex flex-col items-center flex-1 h-full justify-end">
                {/* Bar */}
                <div
                  className="w-8 bg-gradient-to-t from-blue-600/20 via-blue-500/40 to-indigo-400/60 rounded-t-sm transition-all duration-700 relative group"
                  style={{ height: `${height}%` }}
                >
                  {/* Tooltip on hover */}
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold text-white opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100 whitespace-nowrap z-20 shadow-xl">
                    <span className="text-emerald-400">{stat.winRate}%</span>
                    <span className="mx-2 text-slate-500">|</span>
                    <span className="text-slate-300 text-[10px]">
                      {stat.wins}W - {stat.losses}L
                    </span>
                  </div>
                </div>
                {/* X-axis Label */}
                <span className="absolute -bottom-5 text-[10px] font-medium text-slate-500">{stat.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function BestChampions({ data }) {
  const renderList = (list, title, colorClass, iconColor) => (
    <div className="flex-1 space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <Trophy className={`w-3 h-3 ${iconColor}`} />
        <h4 className="text-[10px] font-semibold text-white uppercase tracking-wider opacity-70">{title}</h4>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {list?.length > 0 &&
          list.slice(0, 3).map((item, index) => (
            <div key={index} className="flex items-center gap-2 p-1.5 bg-slate-700/30 rounded-lg border border-slate-700/50 hover:bg-slate-700/50 transition-colors">
              <div className="w-8 h-8 rounded-md overflow-hidden bg-slate-800 shrink-0">
                <img src={getChampionIcon(item.champion)} alt={item.champion} className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0">
                <p className={`text-[11px] font-bold ${colorClass}`}>{Math.round(item.win_rate * 100)}%</p>
                <p className="text-[9px] text-slate-500 uppercase leading-tight">{item.games}G</p>
              </div>
            </div>
          ))}
      </div>
    </div>
  )

  return (
    <div className="bg-gradient-to-br from-slate-800/80 to-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
      <div className="flex flex-col md:flex-row gap-8">
        {renderList(data?.allies, "Best Team Champions", "text-emerald-400", "text-emerald-400")}
        {renderList(data?.enemies, "Best Enemy Champions", "text-red-400", "text-red-400")}
      </div>
    </div>
  )
}
