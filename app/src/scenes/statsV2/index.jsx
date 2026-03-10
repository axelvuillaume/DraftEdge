import { useState, useEffect, useRef } from "react"
import { toast } from "react-hot-toast"
import api from "@/services/api"
import useStore from "@/services/store"
import { getChampionIcon } from "@/utils"
import { PatternIcon, ObjectivesIcon, ScalingIcon, CombatIcon } from "@/components/icons/performance-icons"
import { Shield, ChevronLeft, ChevronDown, Radar, Table2, Search } from "lucide-react"

const ROLE_TO_POSITION = { top: "top", jungle: "jng", mid: "mid", bottom: "bot", support: "sup" }

export default function StatsV2() {
  const { searchNavigation, setSearchNavigation, globalFilters } = useStore()
  const [teamData, setTeamData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activePlayer, setActivePlayer] = useState(null)
  const [activeChampion, setActiveChampion] = useState(null)
  const [activeEnemyChampion, setActiveEnemyChampion] = useState(null)
  const [activeCategory, setActiveCategory] = useState("Combat")
  const [viewMode, setViewMode] = useState("spider")
  const [compareMode, setCompareMode] = useState("scrim") // "scrim" | "pro"
  const [proStats, setProStats] = useState(null)
  const [selectedLeagues, setSelectedLeagues] = useState([])
  const [availableLeagues, setAvailableLeagues] = useState([])
  const [proSubMode, setProSubMode] = useState("avg") // "avg" | "team" | "player"
  const [availableProTeams, setAvailableProTeams] = useState([])
  const [availableProPlayers, setAvailableProPlayers] = useState([])
  const [selectedProTeam, setSelectedProTeam] = useState(null)
  const [selectedProPlayer, setSelectedProPlayer] = useState(null)
  const [proSearchInput, setProSearchInput] = useState("")
  const [proSelectorOpen, setProSelectorOpen] = useState(false)
  const proSelectorRef = useRef(null)

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

  const fetchProStats = async position => {
    try {
      const body = {}
      if (position) body.position = position
      if (globalFilters.patch) body.patch = globalFilters.patch
      if (selectedLeagues.length) body.leagues = selectedLeagues
      if (proSubMode === "team" && selectedProTeam) body.teamname = selectedProTeam
      if (proSubMode === "player" && selectedProPlayer) {
        body.playername = selectedProPlayer.name
        delete body.position
      }
      const { ok, data, code } = await api.post("/pro-game-playerstats/aggregate", body)
      if (!ok) return toast.error(code)
      setProStats(data)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const fetchProTeams = async () => {
    try {
      const { ok, data, code } = await api.get("/pro-game-playerstats/teams/list")
      if (!ok) return toast.error(code)
      setAvailableProTeams(data)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const fetchProPlayers = async position => {
    try {
      const pos = position ? ROLE_TO_POSITION[position] || position : ""
      const params = pos ? `?position=${pos}` : ""
      const { ok, data, code } = await api.get(`/pro-game-playerstats/players/list${params}`)
      if (!ok) return toast.error(code)
      setAvailableProPlayers(data)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const fetchLeagues = async () => {
    try {
      const { ok, data, code } = await api.get("/pro-game/leagues/list")
      if (!ok) return toast.error(code)
      setAvailableLeagues(data)
    } catch (error) {
      toast.error(error.message)
    }
  }
  useEffect(() => {
    fetchLeagues()
    fetchProTeams()
    fetchProPlayers()
  }, [])

  useEffect(() => {
    function handleClickOutside(event) {
      if (proSelectorRef.current && !proSelectorRef.current.contains(event.target)) setProSelectorOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    fetchStats()
    fetchProStats()
  }, [globalFilters.patch, globalFilters.folder_id, globalFilters.opponent_name])

  useEffect(() => {
    fetchProStats(activePlayer?.role || null)
  }, [activePlayer?.role, selectedLeagues, proSubMode, selectedProTeam, selectedProPlayer])

  useEffect(() => {
    fetchProPlayers(activePlayer?.role || null)
  }, [activePlayer?.role])

  // Handle search navigation changes (works even when already on statsV2 page)
  useEffect(() => {
    if (!searchNavigation || !teamData) return

    const applyNavigation = async () => {
      if (searchNavigation.type === "player") {
        const d = searchNavigation.data
        const player = teamData.players?.find(p => p.puuid === d.puuid)
        if (player) {
          setActivePlayer(player)
          setActiveChampion(null)
          setActiveEnemyChampion(null)
        }
      } else if (searchNavigation.type === "allyChampion") {
        const d = searchNavigation.data
        const championName = d.name
        const player = teamData.players?.find(p => p.puuid === d.puuid)
        if (player) {
          setActivePlayer(player)
          setActiveEnemyChampion(null)
          const champion = (player.champions || []).find(c => c.name === championName)
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

  const proCompareLabel = proSubMode === "team" ? selectedProTeam || "Pro Avg" : proSubMode === "player" ? selectedProPlayer?.name || "Pro Avg" : "Pro Avg"

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
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold text-sm uppercase tracking-wider">Performance by Category</h2>
              <div className="flex items-center gap-2">
                {/* Pro compare search bar */}
                <ProSearchBar
                  leagues={availableLeagues}
                  teams={availableProTeams}
                  players={availableProPlayers}
                  selectedLeagues={selectedLeagues}
                  selectedProTeam={selectedProTeam}
                  selectedProPlayer={selectedProPlayer}
                  proSubMode={proSubMode}
                  searchInput={proSearchInput}
                  onSearchChange={setProSearchInput}
                  isOpen={proSelectorOpen}
                  onToggle={() => setProSelectorOpen(o => !o)}
                  dropdownRef={proSelectorRef}
                  onSelectLeague={league => {
                    setSelectedLeagues(prev => (prev.includes(league) ? prev.filter(l => l !== league) : [...prev, league]))
                    setProSubMode("avg")
                    setSelectedProTeam(null)
                    setSelectedProPlayer(null)
                  }}
                  onClearLeagues={() => {
                    setSelectedLeagues([])
                    setProSubMode("avg")
                    setSelectedProTeam(null)
                    setSelectedProPlayer(null)
                  }}
                  onSelectTeam={name => {
                    setProSubMode("team")
                    setSelectedProTeam(name)
                    setSelectedProPlayer(null)
                    setSelectedLeagues([])
                    setProSearchInput("")
                    setProSelectorOpen(false)
                  }}
                  onSelectPlayer={p => {
                    setProSubMode("player")
                    setSelectedProPlayer(p)
                    setSelectedProTeam(null)
                    setSelectedLeagues([])
                    setProSearchInput("")
                    setProSelectorOpen(false)
                  }}
                  onClear={() => {
                    setProSubMode("avg")
                    setSelectedProTeam(null)
                    setSelectedProPlayer(null)
                    setSelectedLeagues([])
                    setProSearchInput("")
                  }}
                />
                <div className="flex items-center bg-slate-900/60 rounded-lg p-0.5 border border-slate-700/50">
                  <button
                    onClick={() => setViewMode("spider")}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                      viewMode === "spider" ? "bg-slate-700 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Radar className="w-3.5 h-3.5" />
                    Spider
                  </button>
                  <button
                    onClick={() => setViewMode("table")}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                      viewMode === "table" ? "bg-slate-700 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Table2 className="w-3.5 h-3.5" />
                    Table
                  </button>
                </div>
              </div>
            </div>
            <div className="h-px bg-slate-700/50 -mx-5 mb-4" />
            <CategoryTabs categories={categories} activeCategory={activeCategory} onCategoryChange={setActiveCategory} categoryScores={currentData.categoryScores} />
            {(() => {
              const scrimMetrics = currentData.metrics?.[activeCategory] || []
              const proCategory = proStats?.[activeCategory]
              const round1 = v => Math.round(v * 10) / 10

              if (viewMode === "spider") {
                const displayMetrics =
                  compareMode === "pro" && proCategory
                    ? scrimMetrics.map(m => {
                        const proVal = proCategory[m.name]
                        if (proVal == null) return m
                        const diff = proVal > 0 ? ((m.team - proVal) / proVal) * 100 : m.team > 0 ? 100 : 0
                        return { ...m, enemies: proVal, diff: round1(diff) }
                      })
                    : scrimMetrics

                return (
                  <>
                    <SpiderChart metrics={displayMetrics} isEnemyChampion={isEnemyChampion} compareMode={compareMode} proLabel={proCompareLabel} />
                    <div className="flex justify-end mt-4">
                      <div className="flex items-center bg-slate-900/60 rounded-lg p-0.5 border border-slate-700/50">
                        <button
                          onClick={() => setCompareMode("scrim")}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                            compareMode === "scrim" ? "bg-slate-700 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          vs Scrim
                        </button>
                        <button
                          onClick={() => setCompareMode("pro")}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                            compareMode === "pro" ? "bg-amber-500/90 text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          vs Pro
                        </button>
                      </div>
                    </div>
                  </>
                )
              }

              return <MetricsTable metrics={scrimMetrics} isEnemyChampion={isEnemyChampion} proStats={proCategory} proLabel={proCompareLabel} />
            })()}
          </div>

          {/* Colonne droite - Listes */}
          {isTeam && (
            <SectionCard title="Team Players">
              <PlayersList players={teamData.players || []} onPlayerClick={setActivePlayer} />
            </SectionCard>
          )}

          {isPlayer && (
            <SectionCard title="Champions">
              <Matchups champions={activePlayer.champions} onChampionClick={setActiveChampion} />
            </SectionCard>
          )}

          {isChampion && (
            <SectionCard title="Matchup Details">
              <Matchups champions={activeChampion.champions} readOnly />
            </SectionCard>
          )}

          {isEnemyChampion && (
            <SectionCard title="Our champions vs this champion">
              <Matchups champions={activeEnemyChampion.champions} readOnly />
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
  const allChampions = activePlayer ? activePlayer.champions || [] : []

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
            value={activePlayer.puuid}
            onChange={e => {
              const player = players.find(p => p.puuid === e.target.value)
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
              <option key={player.puuid} value={player.puuid} className="bg-slate-800 text-white">
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

function MetricsTable({ metrics, isEnemyChampion, proStats, proLabel }) {
  if (!metrics || metrics.length === 0) {
    return <div className="text-slate-500 text-center py-8">No metrics available</div>
  }

  const hasProStats = proStats && Object.keys(proStats).length > 0

  return (
    <div className="w-full">
      <div
        className={`grid ${hasProStats ? "grid-cols-5" : "grid-cols-4"} gap-4 px-4 py-2 border-b border-slate-700/50 text-xs font-medium text-slate-400 uppercase tracking-wider`}
      >
        <div>Metric</div>
        <div className="text-center">{isEnemyChampion ? "Us" : "Team"}</div>
        <div className="text-center">{isEnemyChampion ? "This champ" : "Enemies"}</div>
        {hasProStats && <div className="text-center">{proLabel || "Pro Avg"}</div>}
        <div className="text-right">Diff</div>
      </div>

      <div className="divide-y divide-slate-700/30">
        {metrics.map((row, i) => {
          const diff = parseFloat(row.diff) || 0
          const proVal = hasProStats ? proStats[row.name] : null
          return (
            <div key={i} className={`grid ${hasProStats ? "grid-cols-5" : "grid-cols-4"} gap-4 px-4 py-3 hover:bg-slate-700/20 transition-colors items-center text-sm`}>
              <div className="text-slate-200 font-medium">{row.name}</div>
              <div className="text-center text-emerald-400 font-mono font-medium">{row.team}</div>
              <div className="text-center text-red-400 font-mono">{row.enemies}</div>
              {hasProStats && <div className="text-center text-amber-400 font-mono">{proVal ?? "-"}</div>}
              <div className={`text-right font-bold font-mono ${diff >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {diff >= 0 ? "+" : ""}
                {row.diff}%
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SpiderChart({ metrics, isEnemyChampion, compareMode, proLabel }) {
  const [hoveredIndex, setHoveredIndex] = useState(null)
  const isPro = compareMode === "pro"

  if (!metrics || metrics.length === 0) {
    return <div className="text-slate-500 text-center py-8">No metrics available</div>
  }

  const enemyFill = isPro ? "rgba(245, 158, 11, 0.1)" : "rgba(239, 68, 68, 0.1)"
  const enemyStroke = isPro ? "rgba(245, 158, 11, 0.5)" : "rgba(239, 68, 68, 0.5)"
  const enemyDot = isPro ? "rgb(245, 158, 11)" : "rgb(239, 68, 68)"
  const enemyLabel = isEnemyChampion ? "This champ" : isPro ? proLabel || "Pro Avg" : "Enemies"

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
      <div className="flex items-center gap-4">
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
          <polygon points={getPolygonPoints(enemyValues)} fill={enemyFill} stroke={enemyStroke} strokeWidth="2" pointerEvents="none" />

          {/* Team polygon */}
          <polygon points={getPolygonPoints(teamValues)} fill="rgba(16, 185, 129, 0.15)" stroke="rgb(16, 185, 129)" strokeWidth="2" pointerEvents="none" />

          {/* Data points for enemies (rendered after polygons so they're visible) */}
          {enemyValues.map((val, i) => {
            const point = getPoint(val, i)
            return <circle key={`enemy-${i}`} cx={point.x} cy={point.y} r="4" fill={enemyDot} stroke="rgb(30, 41, 59)" strokeWidth="2" pointerEvents="none" />
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
        </svg>

        {/* Tooltip panel next to spider */}
        <div className="w-[140px] flex-shrink-0">
          {hoveredIndex !== null ? (
            <div className="bg-slate-900/80 border border-slate-600/50 rounded-lg p-3">
              <p className="text-white text-xs font-semibold mb-2 truncate">{metrics[hoveredIndex].name}</p>
              <div className="h-px bg-slate-700/50 mb-2" />
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-slate-400 text-[10px]">Team</span>
                <span className="text-emerald-400 text-xs font-medium">{metrics[hoveredIndex].team}</span>
              </div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-slate-400 text-[10px]">{enemyLabel}</span>
                <span className={`text-xs font-medium ${isPro ? "text-amber-400" : "text-red-400"}`}>{metrics[hoveredIndex].enemies}</span>
              </div>
              <div className="h-px bg-slate-700/50 mb-2" />
              <p className={`text-center text-sm font-bold ${metrics[hoveredIndex].diff >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {metrics[hoveredIndex].diff >= 0 ? "+" : ""}
                {metrics[hoveredIndex].diff}%
              </p>
            </div>
          ) : (
            <div className="text-slate-600 text-[10px] text-center">Hover a metric</div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-slate-400 text-xs">{isEnemyChampion ? "Us" : "Team"}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isPro ? "bg-amber-500" : "bg-red-500"}`} />
          <span className="text-slate-400 text-xs">{enemyLabel}</span>
        </div>
      </div>
    </div>
  )
}

function ProSearchBar({
  leagues,
  teams,
  players,
  selectedLeagues,
  selectedProTeam,
  selectedProPlayer,
  proSubMode,
  searchInput,
  onSearchChange,
  isOpen,
  onToggle,
  dropdownRef,
  onSelectLeague,
  onClearLeagues,
  onSelectTeam,
  onSelectPlayer,
  onClear
}) {
  const q = searchInput.toLowerCase()
  const filteredLeagues = q ? leagues.filter(l => l.toLowerCase().includes(q)) : []
  const filteredTeams = q ? teams.filter(t => t.toLowerCase().includes(q)).slice(0, 8) : []
  const filteredPlayers = q ? players.filter(p => p.name.toLowerCase().includes(q) || (p.team || "").toLowerCase().includes(q)).slice(0, 8) : []
  const hasResults = filteredLeagues.length > 0 || filteredTeams.length > 0 || filteredPlayers.length > 0

  const label =
    proSubMode === "team" && selectedProTeam
      ? selectedProTeam
      : proSubMode === "player" && selectedProPlayer
        ? `${selectedProPlayer.name}`
        : selectedLeagues.length === 1
          ? selectedLeagues[0]
          : selectedLeagues.length > 1
            ? `${selectedLeagues.length} leagues`
            : "Pro Avg"

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex items-center gap-1">
        <button
          onClick={onToggle}
          className="flex items-center gap-1.5 bg-slate-900/60 border border-slate-700/50 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors"
        >
          <Search className="w-3 h-3 flex-shrink-0 text-slate-500" />
          <span className="text-amber-400">vs</span>
          <span className="truncate max-w-[120px]">{label}</span>
          <ChevronDown className={`w-3 h-3 flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
        {(selectedProTeam || selectedProPlayer || selectedLeagues.length > 0) && (
          <button onClick={onClear} className="text-slate-500 hover:text-slate-300 transition-colors p-1" title="Reset to Pro Avg">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50 w-[260px]">
          <div className="p-2 border-b border-slate-700">
            <input
              autoFocus
              value={searchInput}
              onChange={e => onSearchChange(e.target.value)}
              placeholder="Search league, team or player..."
              className="w-full bg-slate-900/60 border border-slate-600 rounded-md px-2.5 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500/60 transition-colors"
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {!q ? (
              <div className="p-3">
                <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-2">Active Leagues</p>
                <button
                  onClick={onClearLeagues}
                  className={`w-full text-left px-2 py-1.5 text-xs rounded hover:bg-slate-700 transition-colors ${selectedLeagues.length === 0 && proSubMode === "avg" ? "text-amber-400" : "text-white"}`}
                >
                  All Leagues (Pro Avg)
                </button>
                {leagues.map(l => (
                  <button
                    key={l}
                    onClick={() => onSelectLeague(l)}
                    className="w-full text-left px-2 py-1.5 text-xs hover:bg-slate-700 transition-colors flex items-center gap-2 rounded"
                  >
                    <div
                      className={`w-3 h-3 rounded border flex items-center justify-center flex-shrink-0 ${selectedLeagues.includes(l) ? "bg-amber-500 border-amber-500" : "border-slate-500"}`}
                    >
                      {selectedLeagues.includes(l) && (
                        <svg className="w-2 h-2 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="text-white">{l}</span>
                  </button>
                ))}
              </div>
            ) : !hasResults ? (
              <div className="text-slate-500 text-xs text-center py-4">No results</div>
            ) : (
              <div className="p-1">
                {filteredLeagues.length > 0 && (
                  <>
                    <p className="text-slate-500 text-[10px] uppercase tracking-wider px-2 pt-2 pb-1">Leagues</p>
                    {filteredLeagues.map(l => (
                      <button
                        key={l}
                        onClick={() => onSelectLeague(l)}
                        className={`w-full text-left px-2 py-1.5 text-xs rounded hover:bg-slate-700 transition-colors ${selectedLeagues.includes(l) ? "text-amber-400" : "text-white"}`}
                      >
                        {l}
                      </button>
                    ))}
                  </>
                )}
                {filteredTeams.length > 0 && (
                  <>
                    <p className="text-slate-500 text-[10px] uppercase tracking-wider px-2 pt-2 pb-1">Teams</p>
                    {filteredTeams.map(t => (
                      <button
                        key={t}
                        onClick={() => onSelectTeam(t)}
                        className={`w-full text-left px-2 py-1.5 text-xs rounded hover:bg-slate-700 transition-colors ${selectedProTeam === t ? "text-amber-400 font-medium" : "text-white"}`}
                      >
                        {t}
                      </button>
                    ))}
                  </>
                )}
                {filteredPlayers.length > 0 && (
                  <>
                    <p className="text-slate-500 text-[10px] uppercase tracking-wider px-2 pt-2 pb-1">Players</p>
                    {filteredPlayers.map(p => (
                      <button
                        key={p.name}
                        onClick={() => onSelectPlayer(p)}
                        className={`w-full text-left px-2 py-1.5 text-xs rounded hover:bg-slate-700 transition-colors ${selectedProPlayer?.name === p.name ? "text-amber-400 font-medium" : "text-white"}`}
                      >
                        <span>{p.name}</span>
                        {p.team && <span className="text-slate-500 ml-1.5">{p.team}</span>}
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
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

function Matchups({ champions, onChampionClick, activeChampion, readOnly }) {
  const allChampions = (champions || []).filter((champ, idx, arr) => arr.findIndex(c => c.name === champ.name) === idx).sort((a, b) => (b.games || 0) - (a.games || 0))

  if (allChampions.length === 0) {
    return <div className="text-slate-500 text-center py-8">No data</div>
  }

  return (
    <div className="max-h-[400px] overflow-y-auto pr-1 space-y-2 custom-scrollbar">
      {allChampions.map((matchup, idx) => {
        const isWinning = matchup.winRate > 50
        return (
          <div
            key={idx}
            onClick={readOnly ? undefined : () => onChampionClick(matchup)}
            className={`bg-slate-900/40 border rounded-lg p-3 flex items-center gap-3 transition-all ${
              readOnly
                ? "border-slate-700/40"
                : `cursor-pointer hover:bg-slate-700/40 ${activeChampion === matchup.name ? "border-emerald-500" : "border-slate-700/40 hover:border-slate-500/50"}`
            }`}
          >
            <div className="w-10 h-10 bg-slate-700/50 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
              <img src={getChampionIcon(matchup.name)} alt={matchup.name} className="w-full h-full object-cover" onError={e => (e.target.style.display = "none")} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-white font-medium text-sm truncate block">{matchup.name}</span>
              <span className="text-slate-500 text-xs">{matchup.games} games</span>
            </div>
            <span className={`font-bold text-sm ${isWinning ? "text-emerald-400" : "text-red-400"}`}>{matchup.winRate}%</span>
          </div>
        )
      })}
    </div>
  )
}
