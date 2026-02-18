import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import api from "@/services/api"
import useStore from "@/services/store"
import { getChampionIcon } from "@/utils"
import { PatternIcon, ObjectivesIcon, ScalingIcon, CombatIcon } from "@/components/icons/performance-icons"
import { Shield, ChevronLeft } from "lucide-react"

export default function StatsV2() {
  const { searchNavigation, setSearchNavigation, globalFilters } = useStore()
  const [teamData, setTeamData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activePlayer, setActivePlayer] = useState(null)
  const [activeChampion, setActiveChampion] = useState(null)
  const [activeEnemyChampion, setActiveEnemyChampion] = useState(null)
  const [activeCategory, setActiveCategory] = useState("Combat")

  const categories = [
    { id: "Combat", icon: CombatIcon, color: "#3b82f6" },
    { id: "Objectives", icon: ObjectivesIcon, color: "#f97316" },
    { id: "Vision", icon: PatternIcon, color: "#0ea5e9" },
    { id: "Income", icon: ScalingIcon, color: "#a855f7" }
  ]

  const fetchStats = async () => {
    try {
      const { ok, data, code } = await api.post("/playerstats/team_stats_v2", { ...globalFilters })
      if (!ok) return toast.error(code)
      setTeamData(data)
      setActivePlayer(null)
      setActiveChampion(null)
      setActiveEnemyChampion(null)
      return data
    } catch (error) {
      toast.error(error.message)
      return null
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [globalFilters.patch, globalFilters.folder_id, globalFilters.opponent_name])

  // Handle search navigation changes (works even when already on statsV2 page)
  useEffect(() => {
    if (!searchNavigation || !teamData) return

    const applyNavigation = async () => {
      if (searchNavigation.type === "player") {
        const player = teamData.players?.find(p => p.name === searchNavigation.data.name)
        if (player) {
          setActivePlayer(player)
          setActiveChampion(null)
          setActiveEnemyChampion(null)
        }
      } else if (searchNavigation.type === "allyChampion") {
        // Find the player and their champion stats
        const playerName = searchNavigation.data.playerName
        const championName = searchNavigation.data.name
        const player = teamData.players?.find(p => p.name === playerName)
        if (player) {
          setActivePlayer(player)
          setActiveEnemyChampion(null)
          // Find the champion in weakAgainst or strongAgainst (these are the player's own champions)
          const champion = [...(player.weakAgainst || []), ...(player.strongAgainst || [])].find(c => c.name === championName)
          if (champion) {
            setActiveChampion(champion)
          }
        }
      } else if (searchNavigation.type === "enemyChampion") {
        // Fetch enemy champion stats from API
        try {
          const { ok, data } = await api.post("/playerstats/enemy_champion_stats", { ...globalFilters, championName: searchNavigation.data.name })
          if (ok) {
            setActivePlayer(null)
            setActiveChampion(null)
            setActiveEnemyChampion(data)
          }
        } catch (error) {
          toast.error("Error loading enemy champion stats")
        }
      }
      setSearchNavigation(null)
    }

    applyNavigation()
  }, [searchNavigation?.timestamp, teamData])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 font-medium">Loading stats...</p>
        </div>
      </div>
    )
  }

  if (!teamData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <p className="text-slate-400 font-medium">No data available</p>
      </div>
    )
  }

  const isEnemyChampion = activeEnemyChampion !== null
  const isTeam = activePlayer === null && activeChampion === null && !isEnemyChampion
  const isPlayer = activePlayer !== null && activeChampion === null && !isEnemyChampion
  const isChampion = activeChampion !== null && !isEnemyChampion

  const getCurrentData = () => {
    if (isEnemyChampion) return activeEnemyChampion
    if (isChampion) return activeChampion
    if (isPlayer) return activePlayer
    return teamData
  }

  const currentData = getCurrentData()

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 lg:p-6">
      <div className="max-w-[1800px] mx-auto w-full">
        <Breadcrumb
          teamName={teamData.name}
          players={teamData.players || []}
          activePlayer={activePlayer}
          activeChampion={activeChampion}
          activeEnemyChampion={activeEnemyChampion}
          onTeamClick={() => {
            setActivePlayer(null)
            setActiveChampion(null)
            setActiveEnemyChampion(null)
          }}
          onPlayerChange={player => {
            setActivePlayer(player)
            setActiveChampion(null)
            setActiveEnemyChampion(null)
          }}
          onChampionChange={setActiveChampion}
          onBack={() => {
            if (activeEnemyChampion) {
              setActiveEnemyChampion(null)
            } else if (activeChampion) {
              setActiveChampion(null)
            } else if (activePlayer) {
              setActivePlayer(null)
            }
          }}
        />

        <HeaderSection
          data={currentData}
          isTeam={isTeam}
          isChampion={isChampion}
          isEnemyChampion={isEnemyChampion}
          winRateBySide={currentData.winRateBySide}
          winRateByDuration={currentData.winRateByDuration}
        />

        {/* Séparateur principal */}
        <div className="h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent mb-4 flex-shrink-0" />

        <div className="grid lg:grid-cols-2 gap-6 items-start">
          {/* Colonne gauche - Métriques */}
          <SectionCard title="Performance by Category">
            <CategoryTabs categories={categories} activeCategory={activeCategory} onCategoryChange={setActiveCategory} categoryScores={currentData.categoryScores} />
            <SpiderChart metrics={currentData.metrics?.[activeCategory] || []} isEnemyChampion={isEnemyChampion} />
          </SectionCard>

          {/* Colonne droite - Listes */}
          {isTeam && (
            <SectionCard title="Team Players">
              <PlayersList players={teamData.players || []} onPlayerClick={setActivePlayer} />
            </SectionCard>
          )}

          {isPlayer && (
            <SectionCard title="Champions">
              <Matchups weakAgainst={activePlayer.weakAgainst || []} strongAgainst={activePlayer.strongAgainst || []} onChampionClick={setActiveChampion} />
            </SectionCard>
          )}

          {isChampion && (
            <SectionCard title="Matchup Details">
              <Matchups weakAgainst={activeChampion.weakAgainst || []} strongAgainst={activeChampion.strongAgainst || []} readOnly />
            </SectionCard>
          )}

          {isEnemyChampion && (
            <SectionCard title="Our champions vs this champion">
              <Matchups weakAgainst={activeEnemyChampion.weakAgainst || []} strongAgainst={activeEnemyChampion.strongAgainst || []} readOnly isEnemyContext />
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  )
}

// Composant réutilisable pour les sections avec titre
function SectionCard({ title, children }) {
  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5">
      {title && (
        <>
          <h2 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">{title}</h2>
          <div className="h-px bg-slate-700/50 -mx-5 mb-4" />
        </>
      )}
      {children}
    </div>
  )
}

function CategoryTabs({ categories, activeCategory, onCategoryChange, categoryScores }) {
  const defaultScores = { Combat: 50, Objectives: 50, Vision: 50, Income: 50 }
  const scores = categoryScores || defaultScores

  return (
    <div className="flex items-center gap-2 mb-5">
      {categories.map(cat => {
        const isActive = activeCategory === cat.id
        const score = scores[cat.id] ?? 50
        return (
          <button
            key={cat.id}
            onClick={() => onCategoryChange(cat.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
              isActive ? "bg-slate-700/80 border-slate-500 ring-1 ring-slate-400/50" : "bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/50 hover:border-slate-600"
            }`}
          >
            <div className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: cat.color + "20" }}>
              <cat.icon className="w-4 h-4" style={{ color: cat.color }} />
            </div>
            <span className={`font-bold text-sm ${score >= 70 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-red-400"}`}>{score}</span>
          </button>
        )
      })}
    </div>
  )
}

function Breadcrumb({ teamName, players, activePlayer, activeChampion, activeEnemyChampion, onTeamClick, onPlayerChange, onChampionChange, onBack }) {
  const allChampions = activePlayer
    ? [...(activePlayer.weakAgainst || []), ...(activePlayer.strongAgainst || [])].filter((champ, idx, arr) => arr.findIndex(c => c.name === champ.name) === idx)
    : []

  const showBackButton = activePlayer || activeChampion || activeEnemyChampion

  return (
    <div className="flex items-center gap-2 mb-3 text-sm flex-shrink-0">
      {showBackButton && (
        <button
          onClick={onBack}
          className="w-6 h-6 flex items-center justify-center rounded bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 hover:text-white transition-colors"
          title={activeEnemyChampion ? "Back to team" : activeChampion ? "Back to player" : "Back to team"}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}
      <button
        onClick={onTeamClick}
        className={`font-medium transition-colors ${!activePlayer && !activeChampion && !activeEnemyChampion ? "text-emerald-400" : "text-slate-400 hover:text-white"}`}
      >
        {teamName}
      </button>
      {activeEnemyChampion && (
        <>
          <span className="text-slate-600">/</span>
          <span className="text-red-400 font-medium flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            {activeEnemyChampion.name}
          </span>
        </>
      )}
      {activePlayer && (
        <>
          <span className="text-slate-600">/</span>
          <select
            value={activePlayer.name}
            onChange={e => {
              const player = players.find(p => p.name === e.target.value)
              if (player) onPlayerChange(player)
            }}
            className={`bg-transparent font-medium px-1 py-1 outline-none border-none cursor-pointer transition-colors appearance-none pr-6 ${activeChampion ? "text-slate-400 hover:text-white" : "text-emerald-400"}`}
            style={{
              border: "none",
              WebkitAppearance: "none",
              MozAppearance: "none",
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='${activeChampion ? "%2394a3b8" : "%2310b981"}'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 0px center",
              backgroundSize: "14px"
            }}
          >
            {players.map(player => (
              <option key={player.name} value={player.name} className="bg-slate-800 text-white">
                {player.name}
              </option>
            ))}
          </select>
        </>
      )}
      {activeChampion && (
        <>
          <span className="text-slate-600">/</span>
          <select
            value={activeChampion.name}
            onChange={e => {
              const champion = allChampions.find(c => c.name === e.target.value)
              if (champion) onChampionChange(champion)
            }}
            className="bg-transparent font-medium text-emerald-400 px-1 py-1 outline-none border-none cursor-pointer transition-colors appearance-none pr-6"
            style={{
              border: "none",
              WebkitAppearance: "none",
              MozAppearance: "none",
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2310b981'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 0px center",
              backgroundSize: "14px"
            }}
          >
            {allChampions.map(champion => (
              <option key={champion.name} value={champion.name} className="bg-slate-800 text-white">
                {champion.name}
              </option>
            ))}
          </select>
        </>
      )}
    </div>
  )
}

function HeaderSection({ data, isTeam, isChampion, isEnemyChampion, winRateBySide, winRateByDuration }) {
  const isPlayer = !isTeam && !isChampion && !isEnemyChampion
  const side = winRateBySide || { blue: 0, red: 0 }

  return (
    <div className="grid lg:grid-cols-2 gap-4 mb-4 flex-shrink-0">
      <div className="flex items-center gap-4">
        <div className="relative">
          {isTeam ? (
            <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Shield className="w-10 h-10 text-slate-900" />
            </div>
          ) : isEnemyChampion ? (
            <div className="w-20 h-20 bg-slate-700/50 border-2 border-red-500/50 rounded-lg flex items-center justify-center overflow-hidden">
              <img src={getChampionIcon(data.name)} alt={data.name} className="w-full h-full object-cover" onError={e => (e.target.style.display = "none")} />
            </div>
          ) : (
            <div className="w-20 h-20 bg-slate-700/50 border border-emerald-500/30 rounded-lg flex items-center justify-center overflow-hidden">
              {isChampion && <img src={getChampionIcon(data.name)} alt={data.name} className="w-full h-full object-cover" onError={e => (e.target.style.display = "none")} />}
              {isPlayer && data.role && <img src={`/roles/${data.role}.png`} alt={data.role} className="w-10 h-10" onError={e => (e.target.style.display = "none")} />}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center gap-3">
            <h1 className={`text-4xl font-bold tracking-wide ${isEnemyChampion ? "text-red-400" : "text-white"}`}>{(data.name || "").toUpperCase()}</h1>
            {isPlayer && (
              <a
                href={`https://dpm.lol/${data.name}-${data.riot_tag}`}
                target="_blank"
                rel="noreferrer"
                onClick={e => e.stopPropagation()}
                className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
              >
                <img src="/DPMLOLBG.png" alt="DPM" className="w-7 h-7 rounded-md" />
              </a>
            )}
          </div>
          {isPlayer && data.role && <p className="text-slate-400 capitalize">{data.role}</p>}
          {isChampion && <p className="text-slate-400">Champion Matchup</p>}
          {isEnemyChampion && <p className="text-red-400/70">Enemy Champion • {data.role}</p>}
        </div>
      </div>

      <div className="flex items-center justify-center gap-6">
        {/* Score */}
        <ScoreCircle score={data.score || 0} isEnemy={isEnemyChampion} />

        {/* Stats */}
        <div className="flex flex-col gap-2">
          {/* WR & Games & KDA */}
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xl font-bold text-white">{data.winRate || 0}%</p>
              <p className="text-slate-500 text-[10px] uppercase">WR</p>
            </div>
            <div className="w-px h-8 bg-slate-700" />
            <div>
              <p className="text-xl font-bold text-white">{data.games || 0}</p>
              <p className="text-slate-500 text-[10px] uppercase">Games</p>
            </div>
            <div className="w-px h-8 bg-slate-700" />
            <div>
              <p className="text-xl font-bold text-white">{data.kda || "0.0"}</p>
              <p className="text-slate-500 text-[10px] uppercase">KDA</p>
            </div>
          </div>

          {/* Mini Side bars */}
          {!isEnemyChampion && (
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-1">
                <div className="w-8 h-2 bg-blue-500 rounded" style={{ opacity: side.blue > 0 ? 1 : 0.3 }} />
                <span className="text-blue-400 text-[10px] font-medium">{side.blue}%</span>
                <span className="text-slate-500 text-[10px]">({side.blueGames || 0}g)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-8 h-2 bg-red-400 rounded" style={{ opacity: side.red > 0 ? 1 : 0.3 }} />
                <span className="text-red-400 text-[10px] font-medium">{side.red}%</span>
                <span className="text-slate-500 text-[10px]">({side.redGames || 0}g)</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ScoreCircle({ score, isEnemy }) {
  return (
    <div className="relative w-20 h-20">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="42" fill="none" stroke="rgb(51 65 85 / 0.5)" strokeWidth="6" />
        <circle cx="50" cy="50" r="42" fill="none" stroke={"rgb(16 185 129)"} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(score / 100) * 264} 264`} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-white">{score}</span>
        <span className="text-slate-500 text-[10px] font-medium">/100</span>
      </div>
    </div>
  )
}

function SpiderChart({ metrics, isEnemyChampion }) {
  const [hoveredIndex, setHoveredIndex] = useState(null)

  if (!metrics || metrics.length === 0) {
    return <div className="text-slate-500 text-center py-8">No metrics available</div>
  }

  const size = 280
  const center = size / 2
  const maxRadius = size / 2 - 40
  const levels = 5

  // Calculate angle for each metric
  const angleStep = (2 * Math.PI) / metrics.length
  const startAngle = -Math.PI / 2 // Start from top

  // Get point coordinates for a given value (0-100) and index
  const getPoint = (value, index) => {
    const angle = startAngle + index * angleStep
    const radius = (value / 100) * maxRadius
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle)
    }
  }

  // Generate polygon points string
  const getPolygonPoints = values => {
    return values
      .map((val, i) => {
        const point = getPoint(val, i)
        return `${point.x},${point.y}`
      })
      .join(" ")
  }

  // Generate grid lines for each level
  const gridLevels = Array.from({ length: levels }, (_, i) => ((i + 1) / levels) * 100)

  // Better normalization: use the diff to show actual magnitude of differences
  // Center is at 50%, spread proportionally to the real difference
  // This way: 75% vs 9.3% shows a HUGE visual gap, while 51% vs 49% shows minimal gap
  const basePosition = 50 // Center of the chart
  const maxSpread = 40 // Maximum deviation from center (so range is 10-90)

  // diff from backend is already inverted for metrics like Deaths (lower = better),
  // so diff > 0 always means "team is better" regardless of the metric.
  const teamValues = metrics.map(m => {
    const diff = parseFloat(m.diff) || 0

    const clampedDiff = Math.max(-100, Math.min(100, diff))
    const sign = clampedDiff >= 0 ? 1 : -1
    const scaledDiff = sign * Math.pow(Math.abs(clampedDiff) / 100, 0.7) * 100

    const offset = (scaledDiff / 100) * maxSpread
    return Math.max(15, Math.min(95, basePosition + offset))
  })

  const enemyValues = metrics.map(m => {
    const diff = parseFloat(m.diff) || 0

    const clampedDiff = Math.max(-100, Math.min(100, diff))
    const sign = clampedDiff >= 0 ? 1 : -1
    const scaledDiff = sign * Math.pow(Math.abs(clampedDiff) / 100, 0.7) * 100

    const offset = (scaledDiff / 100) * maxSpread
    return Math.max(15, Math.min(95, basePosition - offset))
  })

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="overflow-visible">
        {/* Background grid circles */}
        {gridLevels.map((level, i) => {
          const points = metrics.map((_, idx) => getPoint(level, idx))
          const pathData = points.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z"
          return <path key={i} d={pathData} fill="none" stroke="rgb(51 65 85 / 0.3)" strokeWidth="1" pointerEvents="none" />
        })}

        {/* Axis lines */}
        {metrics.map((_, i) => {
          const endPoint = getPoint(100, i)
          return <line key={i} x1={center} y1={center} x2={endPoint.x} y2={endPoint.y} stroke="rgb(51 65 85 / 0.4)" strokeWidth="1" pointerEvents="none" />
        })}

        {/* Enemy polygon (baseline) */}
        <polygon points={getPolygonPoints(enemyValues)} fill="rgba(239, 68, 68, 0.1)" stroke="rgba(239, 68, 68, 0.5)" strokeWidth="2" pointerEvents="none" />

        {/* Team polygon */}
        <polygon points={getPolygonPoints(teamValues)} fill="rgba(16, 185, 129, 0.15)" stroke="rgb(16, 185, 129)" strokeWidth="2" pointerEvents="none" />

        {/* Data points for enemies (rendered after polygons so they're visible) */}
        {enemyValues.map((val, i) => {
          const point = getPoint(val, i)
          return <circle key={`enemy-${i}`} cx={point.x} cy={point.y} r="4" fill="rgb(239, 68, 68)" stroke="rgb(30, 41, 59)" strokeWidth="2" pointerEvents="none" />
        })}

        {/* Data points for team */}
        {teamValues.map((val, i) => {
          const point = getPoint(val, i)
          return <circle key={`team-${i}`} cx={point.x} cy={point.y} r="4" fill="rgb(16, 185, 129)" stroke="rgb(30, 41, 59)" strokeWidth="2" pointerEvents="none" />
        })}

        {/* Invisible hover sectors (pie slices) for better hitbox */}
        {metrics.map((_, i) => {
          const angle1 = startAngle + (i - 0.5) * angleStep
          const angle2 = startAngle + (i + 0.5) * angleStep
          const r = maxRadius + 30

          const x1 = center + r * Math.cos(angle1)
          const y1 = center + r * Math.sin(angle1)
          const x2 = center + r * Math.cos(angle2)
          const y2 = center + r * Math.sin(angle2)

          const pathData = `M ${center} ${center} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`

          return (
            <path
              key={`hover-${i}`}
              d={pathData}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          )
        })}

        {/* Metric labels */}
        {metrics.map((metric, i) => {
          const labelPoint = getPoint(115, i)
          const angle = startAngle + i * angleStep
          const isRight = Math.cos(angle) > 0.1
          const isLeft = Math.cos(angle) < -0.1
          const textAnchor = isRight ? "start" : isLeft ? "end" : "middle"

          return (
            <text
              key={i}
              x={labelPoint.x}
              y={labelPoint.y}
              textAnchor={textAnchor}
              dominantBaseline="middle"
              className="fill-slate-300 text-[10px] font-medium"
              pointerEvents="none"
            >
              {metric.name}
            </text>
          )
        })}

        {/* Tooltip on hover */}
        {hoveredIndex !== null && (
          <g pointerEvents="none">
            <rect x={center - 60} y={center - 45} width="120" height="90" rx="8" fill="rgb(30, 41, 59)" stroke="rgb(71, 85, 105)" strokeWidth="1" />
            <text x={center} y={center - 26} textAnchor="middle" className="fill-white text-[12px] font-semibold">
              {metrics[hoveredIndex].name}
            </text>
            <line x1={center - 48} y1={center - 14} x2={center + 48} y2={center - 14} stroke="rgb(71, 85, 105)" strokeWidth="1" />
            <text x={center - 48} y={center + 2} textAnchor="start" className="fill-slate-400 text-[10px]">
              Team
            </text>
            <text x={center + 48} y={center + 2} textAnchor="end" className="fill-emerald-400 text-[11px] font-medium">
              {metrics[hoveredIndex].team}
            </text>
            <text x={center - 48} y={center + 20} textAnchor="start" className="fill-slate-400 text-[10px]">
              Enemies
            </text>
            <text x={center + 48} y={center + 20} textAnchor="end" className="fill-red-400 text-[11px] font-medium">
              {metrics[hoveredIndex].enemies}
            </text>
            <line x1={center - 48} y1={center + 30} x2={center + 48} y2={center + 30} stroke="rgb(71, 85, 105)" strokeWidth="1" />
            <text x={center} y={center + 42} textAnchor="middle" className={`text-[12px] font-bold ${metrics[hoveredIndex].diff >= 0 ? "fill-emerald-400" : "fill-red-400"}`}>
              {metrics[hoveredIndex].diff >= 0 ? "+" : ""}
              {metrics[hoveredIndex].diff}%
            </text>
          </g>
        )}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-slate-400 text-xs">{isEnemyChampion ? "Us" : "Team"}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-slate-400 text-xs">{isEnemyChampion ? "This champ" : "Enemies"}</span>
        </div>
      </div>
    </div>
  )
}

function PlayersList({ players, onPlayerClick }) {
  if (!players || players.length === 0) {
    return <div className="text-slate-500 text-center py-8">No players available</div>
  }

  return (
    <div className="space-y-2">
      {players.map((player, idx) => (
        <div
          key={idx}
          onClick={() => onPlayerClick(player)}
          className="bg-slate-900/40 border border-slate-700/40 rounded-lg p-3 flex items-center gap-3 cursor-pointer hover:bg-slate-700/40 hover:border-emerald-500/40 transition-all group"
        >
          <div className="w-8 h-8 bg-slate-700/50 rounded-lg flex items-center justify-center">
            <img src={`/roles/${player.role}.png`} alt={player.role} className="w-5 h-5" onError={e => (e.target.style.display = "none")} />
          </div>
          <div className="flex-1">
            <span className="text-white font-medium group-hover:text-emerald-400 transition-colors">{player.name}</span>
          </div>
          <span className={`font-bold text-sm ${player.score >= 70 ? "text-emerald-400" : player.score >= 50 ? "text-amber-400" : "text-red-400"}`}>{player.score || 0}</span>
        </div>
      ))}
    </div>
  )
}

function Matchups({ weakAgainst, strongAgainst, onChampionClick, activeChampion, readOnly, isEnemyContext }) {
  const filteredWeak = weakAgainst.filter(m => m.winRate <= 50)
  const filteredStrong = strongAgainst.filter(m => m.winRate > 50)

  // For enemy context: labels are inverted - our weak champions against enemy = we lose more
  const weakLabel = isEnemyContext ? "Our worst picks" : readOnly ? "Worst matchups" : "Worst WR"
  const strongLabel = isEnemyContext ? "Our best picks" : readOnly ? "Best matchups" : "Best WR"

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Worst WR */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-red-500 shadow-lg shadow-red-500/50" />
          <span className="text-slate-400 text-xs font-medium tracking-wider uppercase">{weakLabel}</span>
        </div>
        <div className="space-y-2">
          {filteredWeak.length === 0 ? (
            <div className="text-slate-500 text-sm text-center py-6 bg-slate-900/30 rounded-lg">No data</div>
          ) : (
            filteredWeak.map((matchup, idx) => (
              <div
                key={idx}
                onClick={readOnly ? undefined : () => onChampionClick(matchup)}
                className={`bg-slate-900/40 border rounded-lg p-3 flex items-center gap-3 transition-all ${
                  readOnly
                    ? "border-slate-700/40"
                    : `cursor-pointer hover:bg-slate-700/40 ${activeChampion === matchup.name ? "border-emerald-500" : "border-slate-700/40 hover:border-red-500/50"}`
                }`}
              >
                <div className="w-10 h-10 bg-slate-700/50 rounded-lg flex items-center justify-center overflow-hidden">
                  <img src={getChampionIcon(matchup.name)} alt={matchup.name} className="w-full h-full object-cover" onError={e => (e.target.style.display = "none")} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-white font-medium text-sm truncate block">{matchup.name}</span>
                  <span className="text-slate-500 text-xs">{matchup.games} games</span>
                </div>
                <span className="text-red-400 font-bold text-sm">{matchup.winRate}%</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Best WR */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
          <span className="text-slate-400 text-xs font-medium tracking-wider uppercase">{strongLabel}</span>
        </div>
        <div className="space-y-2">
          {filteredStrong.length === 0 ? (
            <div className="text-slate-500 text-sm text-center py-6 bg-slate-900/30 rounded-lg">No data</div>
          ) : (
            filteredStrong.map((matchup, idx) => (
              <div
                key={idx}
                onClick={readOnly ? undefined : () => onChampionClick(matchup)}
                className={`bg-slate-900/40 border rounded-lg p-3 flex items-center gap-3 transition-all ${
                  readOnly
                    ? "border-slate-700/40"
                    : `cursor-pointer hover:bg-slate-700/40 ${activeChampion === matchup.name ? "border-emerald-500" : "border-slate-700/40 hover:border-emerald-500/50"}`
                }`}
              >
                <div className="w-10 h-10 bg-slate-700/50 rounded-lg flex items-center justify-center overflow-hidden">
                  <img src={getChampionIcon(matchup.name)} alt={matchup.name} className="w-full h-full object-cover" onError={e => (e.target.style.display = "none")} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-white font-medium text-sm truncate block">{matchup.name}</span>
                  <span className="text-slate-500 text-xs">{matchup.games} games</span>
                </div>
                <span className="text-emerald-400 font-bold text-sm">{matchup.winRate}%</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
