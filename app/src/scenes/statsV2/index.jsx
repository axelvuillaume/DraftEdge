import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import api from "@/services/api"
import { PatternIcon, ObjectivesIcon, ScalingIcon, CombatIcon } from "@/components/icons/performance-icons"
import { Shield } from "lucide-react"

export default function StatsV2() {
  const [teamData, setTeamData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activePlayer, setActivePlayer] = useState(null)
  const [activeChampion, setActiveChampion] = useState(null)
  const [activeCategory, setActiveCategory] = useState("Combat")

  const categories = [
    { id: "Combat", icon: CombatIcon, color: "#3b82f6" },
    { id: "Objectives", icon: ObjectivesIcon, color: "#f97316" },
    { id: "Vision", icon: PatternIcon, color: "#0ea5e9" },
    { id: "Income", icon: ScalingIcon, color: "#a855f7" }
  ]

  const fetchStats = async () => {
    try {
      const { ok, data, code } = await api.post("/playerstats/team_stats_v2", {})
      if (!ok) return toast.error(code)
      setTeamData(data)
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

  const isTeam = activePlayer === null && activeChampion === null
  const isPlayer = activePlayer !== null && activeChampion === null
  const isChampion = activeChampion !== null

  const getCurrentData = () => {
    if (isChampion) return activeChampion
    if (isPlayer) return activePlayer
    return teamData
  }

  const currentData = getCurrentData()

  return (
    <div className="h-[calc(100vh-64px)] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 lg:p-6 overflow-hidden flex flex-col">
      <div className="max-w-5xl mx-auto w-full flex flex-col flex-1 min-h-0">
        <Breadcrumb
          teamName={teamData.name}
          players={teamData.players || []}
          activePlayer={activePlayer}
          activeChampion={activeChampion}
          onTeamClick={() => {
            setActivePlayer(null)
            setActiveChampion(null)
          }}
          onPlayerChange={player => {
            setActivePlayer(player)
            setActiveChampion(null)
          }}
          onChampionChange={setActiveChampion}
        />

        <HeaderSection data={currentData} isTeam={isTeam} isChampion={isChampion} winRateBySide={currentData.winRateBySide} winRateByDuration={currentData.winRateByDuration} />

        {/* Séparateur principal */}
        <div className="h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent mb-4 flex-shrink-0" />

        <div className="grid lg:grid-cols-2 gap-6 flex-1 min-h-0">
          {/* Colonne gauche - Métriques */}
          <div className="h-full min-h-0">
            <SectionCard title="Performance par catégorie" scrollable>
              <CategoryTabs categories={categories} activeCategory={activeCategory} onCategoryChange={setActiveCategory} categoryScores={currentData.categoryScores} />
              <MetricsTable metrics={currentData.metrics?.[activeCategory] || []} />
            </SectionCard>
          </div>

          {/* Colonne droite - Listes */}
          <div className="h-full min-h-0">
            {isTeam && (
              <SectionCard title="Joueurs de l'équipe" scrollable>
                <PlayersList players={teamData.players || []} onPlayerClick={setActivePlayer} />
              </SectionCard>
            )}

            {isPlayer && (
              <SectionCard title="Matchups" scrollable>
                <Matchups weakAgainst={activePlayer.weakAgainst || []} strongAgainst={activePlayer.strongAgainst || []} onChampionClick={setActiveChampion} />
              </SectionCard>
            )}

            {isChampion && (
              <SectionCard title="Détails du matchup" scrollable>
                <Matchups weakAgainst={activeChampion.weakAgainst || []} strongAgainst={activeChampion.strongAgainst || []} readOnly />
              </SectionCard>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Composant réutilisable pour les sections avec titre
function SectionCard({ title, children, scrollable }) {
  return (
    <div className={`bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 ${scrollable ? "h-full flex flex-col" : ""}`}>
      {title && (
        <>
          <h2 className="text-white font-semibold text-sm uppercase tracking-wider mb-4 flex-shrink-0">{title}</h2>
          <div className="h-px bg-slate-700/50 -mx-5 mb-4 flex-shrink-0" />
        </>
      )}
      <div className={scrollable ? "flex-1 overflow-y-auto min-h-0" : ""}>{children}</div>
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

function Breadcrumb({ teamName, players, activePlayer, activeChampion, onTeamClick, onPlayerChange, onChampionChange }) {
  const allChampions = activePlayer ? [...(activePlayer.weakAgainst || []), ...(activePlayer.strongAgainst || [])] : []

  return (
    <div className="flex items-center gap-2 mb-3 text-sm flex-shrink-0">
      <button onClick={onTeamClick} className={`font-medium transition-colors ${!activePlayer && !activeChampion ? "text-emerald-400" : "text-slate-400 hover:text-white"}`}>
        {teamName}
      </button>
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

function HeaderSection({ data, isTeam, isChampion, winRateBySide, winRateByDuration }) {
  const isPlayer = !isTeam && !isChampion
  const side = winRateBySide || { blue: 0, red: 0 }

  return (
    <div className="grid lg:grid-cols-2 gap-4 mb-4 flex-shrink-0">
      <div className="flex items-center gap-4">
        <div className="relative">
          {isTeam ? (
            <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Shield className="w-10 h-10 text-slate-900" />
            </div>
          ) : (
            <div className="w-20 h-20 bg-slate-700/50 border border-emerald-500/30 rounded-lg flex items-center justify-center overflow-hidden">
              {isChampion && <img src={`/champions/${data.name}.png`} alt={data.name} className="w-full h-full object-cover" onError={e => (e.target.style.display = "none")} />}
              {isPlayer && data.role && <img src={`/roles/${data.role}.png`} alt={data.role} className="w-10 h-10" onError={e => (e.target.style.display = "none")} />}
            </div>
          )}
        </div>

        <div>
          <h1 className="text-4xl font-bold text-white tracking-wide">{(data.name || "").toUpperCase()}</h1>
          {isPlayer && data.role && <p className="text-slate-400 capitalize">{data.role}</p>}
          {isChampion && <p className="text-slate-400">Champion Matchup</p>}
        </div>
      </div>

      <div className="flex items-center justify-center gap-6">
        {/* Score */}
        <ScoreCircle score={data.score || 0} />

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
          <div className="flex items-center gap-3 mt-1">
            <div className="flex items-center gap-1">
              <div className="w-8 h-2 bg-blue-500 rounded" style={{ opacity: side.blue > 0 ? 1 : 0.3 }} />
              <span className="text-blue-400 text-[10px] font-medium">{side.blue}%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-8 h-2 bg-red-400 rounded" style={{ opacity: side.red > 0 ? 1 : 0.3 }} />
              <span className="text-red-400 text-[10px] font-medium">{side.red}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ScoreCircle({ score }) {
  return (
    <div className="relative w-20 h-20">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="42" fill="none" stroke="rgb(51 65 85 / 0.5)" strokeWidth="6" />
        <circle cx="50" cy="50" r="42" fill="none" stroke="rgb(16 185 129)" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(score / 100) * 264} 264`} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-white">{score}</span>
        <span className="text-slate-500 text-[10px] font-medium">/100</span>
      </div>
    </div>
  )
}

function MetricsTable({ metrics }) {
  if (!metrics || metrics.length === 0) {
    return <div className="text-slate-500 text-center py-8">No metrics available</div>
  }

  return (
    <div className="overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-4 gap-4 pb-3 border-b border-slate-600/50">
        <div className="text-slate-400 text-xs font-medium uppercase tracking-wider">Métrique</div>
        <div className="text-slate-400 text-xs font-medium uppercase tracking-wider text-center">Équipe</div>
        <div className="text-slate-400 text-xs font-medium uppercase tracking-wider text-center">Ennemis</div>
        <div className="text-slate-400 text-xs font-medium uppercase tracking-wider text-center">Diff</div>
      </div>

      {/* Rows */}
      {metrics.map((metric, idx) => (
        <div key={idx} className={`grid grid-cols-4 gap-4 py-4 items-center ${idx !== metrics.length - 1 ? "border-b border-slate-700/30" : ""}`}>
          <div className="text-white font-medium text-sm">{metric.name}</div>
          <div className="text-center text-slate-300 text-sm">{metric.team}</div>
          <div className="text-center text-slate-400 text-sm">{metric.enemies}</div>
          <div className={`text-center font-semibold text-sm ${metric.diff >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {metric.diff >= 0 ? "+" : ""}
            {metric.diff}%
          </div>
        </div>
      ))}
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

function Matchups({ weakAgainst, strongAgainst, onChampionClick, activeChampion, readOnly }) {
  const filteredWeak = weakAgainst.filter(m => m.winRate <= 50)
  const filteredStrong = strongAgainst.filter(m => m.winRate >= 50)

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Worst WR */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-red-500 shadow-lg shadow-red-500/50" />
          <span className="text-slate-400 text-xs font-medium tracking-wider uppercase">{readOnly ? "Pires matchups" : "Pire WR"}</span>
        </div>
        <div className="space-y-2">
          {filteredWeak.length === 0 ? (
            <div className="text-slate-500 text-sm text-center py-6 bg-slate-900/30 rounded-lg">Aucune donnée</div>
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
                  <img src={`/champions/${matchup.name}.png`} alt={matchup.name} className="w-full h-full object-cover" onError={e => (e.target.style.display = "none")} />
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
          <span className="text-slate-400 text-xs font-medium tracking-wider uppercase">{readOnly ? "Meilleurs matchups" : "Meilleur WR"}</span>
        </div>
        <div className="space-y-2">
          {filteredStrong.length === 0 ? (
            <div className="text-slate-500 text-sm text-center py-6 bg-slate-900/30 rounded-lg">Aucune donnée</div>
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
                  <img src={`/champions/${matchup.name}.png`} alt={matchup.name} className="w-full h-full object-cover" onError={e => (e.target.style.display = "none")} />
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
