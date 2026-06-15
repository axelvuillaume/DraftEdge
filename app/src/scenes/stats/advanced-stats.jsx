import { useState, useEffect, useRef } from "react"
import { toast } from "react-hot-toast"
import api from "@/services/api"
import useStore from "@/services/store"
import { getChampionIcon } from "@/utils"
import { PatternIcon, ObjectivesIcon, ScalingIcon, CombatIcon, PingsIcon } from "@/components/icons/performance-icons"
import { ChevronLeft, ChevronDown, Radar, Table2, Search, Users } from "lucide-react"

const ROLE_TO_POSITION = { top: "top", jungle: "jng", mid: "mid", bottom: "bot", support: "sup" }

const ROLE_META = {
  top: { pos: "TOP", color: "#f59e0b" },
  jungle: { pos: "JNG", color: "#10b981" },
  mid: { pos: "MID", color: "#3b82f6" },
  bottom: { pos: "BOT", color: "#ec4899" },
  support: { pos: "SUP", color: "#a855f7" }
}

const CATEGORIES = [
  { id: "Vision", initial: "V", color: "#0ea5e9", icon: PatternIcon },
  { id: "Income", initial: "I", color: "#a855f7", icon: ScalingIcon },
  { id: "Combat", initial: "C", color: "#3b82f6", icon: CombatIcon },
  { id: "Objectives", initial: "O", color: "#f97316", icon: ObjectivesIcon },
  { id: "Pings", initial: "P", color: "#ec4899", icon: PingsIcon }
]

export default function StatsV2() {
  const { searchNavigation, setSearchNavigation, globalFilters } = useStore()
  const [teamData, setTeamData] = useState(null)
  const [activePlayer, setActivePlayer] = useState(null)
  const [activeChampion, setActiveChampion] = useState(null)
  const [activeEnemyChampion, setActiveEnemyChampion] = useState(null)
  const [activeCategory, setActiveCategory] = useState("Vision")
  const [viewMode, setViewMode] = useState("spider")
  const [compareMode, setCompareMode] = useState("scrim")
  const [proStats, setProStats] = useState(null)
  const [soloqStats, setSoloqStats] = useState(null)
  const [selectedLeagues, setSelectedLeagues] = useState([])
  const [proSubMode, setProSubMode] = useState("avg")
  const [selectedProTeam, setSelectedProTeam] = useState(null)
  const [selectedProPlayer, setSelectedProPlayer] = useState(null)
  const [officialSplitStats, setOfficialSplitStats] = useState(null)
  const [proGames, setProGames] = useState(null)
  const [soloqGames, setSoloqGames] = useState(null)
  const [weeklyData, setWeeklyData] = useState(null)
  const [rightTab, setRightTab] = useState("prog")

  const fetchStats = async () => {
    try {
      const { ok, data, code } = await api.post("/playerstats/team_stats_v2", { ...globalFilters })
      if (!ok) return toast.error(code || "Failed to fetch stats")
      setTeamData(data)
      setActivePlayer(null)
      setActiveChampion(null)
      setActiveEnemyChampion(null)
    } catch (error) {
      toast.error(error.code || "Failed to fetch stats")
    }
  }

  const fetchProStats = async (position, champion) => {
    try {
      const body = {}
      if (position) body.position = position
      if (champion) body.champion = champion
      if (globalFilters.patch) body.patch = globalFilters.patch
      if (selectedLeagues.length) body.leagues = selectedLeagues
      if (proSubMode === "team" && selectedProTeam) body.teamname = selectedProTeam
      if (proSubMode === "player" && selectedProPlayer) {
        body.playername = selectedProPlayer.name
        delete body.position
      }
      const { ok, data, code, total } = await api.post("/pro-game-playerstats/aggregate", body)
      if (!ok) return toast.error(code || "Failed to fetch pro stats")
      setProStats(data)
      setProGames(total ?? null)
    } catch (error) {
      toast.error(error.code || "Failed to fetch pro stats")
    }
  }

  const fetchSoloqStats = async (position, puuid, championName) => {
    try {
      const body = {}
      if (position) body.position = position
      if (puuid) body.puuid = puuid
      if (championName) body.championName = championName
      const { ok, data, code, total } = await api.post("/soloq-match/aggregate", body)
      if (!ok) return toast.error(code || "Failed to fetch soloq stats")
      setSoloqStats(data)
      setSoloqGames(total ?? null)
    } catch (error) {
      toast.error(error.code || "Failed to fetch soloq stats")
    }
  }

  const fetchOfficialSplit = async (position, champion, puuid) => {
    try {
      const body = { ...globalFilters }
      if (position) body.position = position
      if (champion) body.champion = champion
      if (puuid) body.puuid = puuid
      const { ok, data, code } = await api.post("/playerstats/official_split", body)
      if (!ok) return toast.error(code || "Failed to fetch official split stats")
      setOfficialSplitStats(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch official split stats")
    }
  }

  const fetchWeeklyProgression = async (position, puuid) => {
    try {
      const body = { ...globalFilters }
      if (position) body.position = position
      if (puuid) body.puuid = puuid
      const { ok, data, code } = await api.post("/playerstats/weekly_progression", body)
      if (!ok) return toast.error(code || "Failed to fetch progression")
      setWeeklyData(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch progression")
    }
  }

  useEffect(() => {
    fetchStats()
    fetchProStats()
    fetchSoloqStats(null, null)
    fetchOfficialSplit()
    fetchWeeklyProgression(null, null)
  }, [globalFilters.patch, globalFilters.folder_id, globalFilters.opponent_id])

  useEffect(() => {
    const champion = activeChampion?.name || null
    fetchProStats(activePlayer?.role || null, champion)
    fetchSoloqStats(activePlayer?.role || null, activePlayer?.puuid || null, champion)
    fetchOfficialSplit(activePlayer?.role || null, champion, activePlayer?.puuid || null)
    fetchWeeklyProgression(activePlayer?.role || null, activePlayer?.puuid || null)
  }, [activePlayer?.role, activePlayer?.puuid, activeChampion?.name, selectedLeagues, proSubMode, selectedProTeam, selectedProPlayer])

  useEffect(() => {
    if (!searchNavigation || !teamData) return

    const applyNavigation = async () => {
      if (searchNavigation.type === "player") {
        const player = teamData.players?.find(p => p.puuid === searchNavigation.data.puuid)
        if (player) {
          setActivePlayer(player)
          setActiveChampion(null)
          setActiveEnemyChampion(null)
        }
      } else if (searchNavigation.type === "allyChampion") {
        const player = teamData.players?.find(p => p.puuid === searchNavigation.data.puuid)
        if (player) {
          setActivePlayer(player)
          setActiveEnemyChampion(null)
          const champion = (player.champions || []).find(c => c.name === searchNavigation.data.name)
          if (champion) setActiveChampion(champion)
        }
      } else if (searchNavigation.type === "enemyChampion") {
        try {
          const { ok, data } = await api.post("/playerstats/enemy_champion_stats", { ...globalFilters, championName: searchNavigation.data.name })
          if (ok) {
            setActivePlayer(null)
            setActiveChampion(null)
            setActiveEnemyChampion(data)
          }
        } catch (error) {
          toast.error(error.code || "Failed to load enemy champion stats")
        }
      }
      setSearchNavigation(null)
    }

    applyNavigation()
  }, [searchNavigation?.timestamp, teamData])

  if (!teamData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 font-medium">Loading stats...</p>
        </div>
      </div>
    )
  }

  const currentData = activeEnemyChampion || activeChampion || activePlayer || teamData
  const scope = activePlayer ? activePlayer.role : "team"
  const scopeName = activePlayer ? activePlayer.name : teamData.name
  const proCompareLabel = proSubMode === "team" ? selectedProTeam || "Pro Avg" : proSubMode === "player" ? selectedProPlayer?.name || "Pro Avg" : "Pro Avg"
  const activeCat = CATEGORIES.find(c => c.id === activeCategory)
  const compareLabel = compareMode === "scrim" ? "Scrim" : compareMode === "pro" ? proCompareLabel : compareMode === "soloq" ? "SoloQ" : "Non-Offi"

  const round1 = v => Math.round(v * 10) / 10
  const baseMetrics = currentData.metrics?.[activeCategory] || []

  const getCompareMetrics = (source, metrics) =>
    metrics.map(m => {
      const val = source?.[m.name]
      if (val === "-") return { ...m, unavailable: true }
      if (val == null) return m
      return { ...m, enemies: val, diff: round1(val > 0 ? ((m.team - val) / val) * 100 : m.team > 0 ? 100 : 0) }
    })

  const buildOfficialMetrics = (official, nonOfficial, metrics) =>
    metrics.map(m => {
      const offiVal = official?.[m.name]
      const nonOffiVal = nonOfficial?.[m.name]
      if (offiVal == null && nonOffiVal == null) return m
      const team = offiVal ?? 0
      const enemies = nonOffiVal ?? 0
      return { ...m, team, enemies, diff: round1(enemies > 0 ? ((team - enemies) / enemies) * 100 : team > 0 ? 100 : 0) }
    })

  const noCompareData =
    (compareMode === "pro" && !proGames) ||
    (compareMode === "soloq" && !soloqGames) ||
    (compareMode === "offi" && (!officialSplitStats || !officialSplitStats.officialGames)) ||
    (compareMode === "pro" && proStats?.[activeCategory] === "No data")

  const activeCompareMetrics =
    compareMode === "offi" && officialSplitStats?.official?.[activeCategory] && officialSplitStats?.nonOfficial?.[activeCategory]
      ? buildOfficialMetrics(officialSplitStats.official[activeCategory], officialSplitStats.nonOfficial[activeCategory], baseMetrics)
      : compareMode === "pro" && proStats?.[activeCategory]
        ? getCompareMetrics(proStats[activeCategory], baseMetrics)
        : compareMode === "soloq" && soloqStats?.[activeCategory]
          ? getCompareMetrics(soloqStats[activeCategory], baseMetrics)
          : baseMetrics

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 lg:p-6 min-h-full">
      <div className="max-w-[1500px] mx-auto w-full">
        <ScopeRail
          teamData={teamData}
          scope={scope}
          onSelectTeam={() => {
            setActivePlayer(null)
            setActiveChampion(null)
            setActiveEnemyChampion(null)
          }}
          onSelectPlayer={player => {
            setActivePlayer(player)
            setActiveChampion(null)
            setActiveEnemyChampion(null)
          }}
        />

        <Breadcrumb
          scopeName={scopeName}
          scopeGames={currentData.games}
          activeChampion={activeChampion}
          activeEnemyChampion={activeEnemyChampion}
          onBack={() => {
            if (activeEnemyChampion) return setActiveEnemyChampion(null)
            if (activeChampion) return setActiveChampion(null)
          }}
        />

        <div className="grid lg:grid-cols-2 gap-5 items-start">
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-[14px] p-[18px]">
            <div className="flex items-center justify-between mb-[14px]">
              <h2 className="text-white font-semibold text-xs uppercase tracking-[0.08em]">Performance by Category</h2>
              <div className="flex items-center bg-slate-900/60 rounded-[9px] p-0.5 border border-slate-700/50">
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
            <div className="h-px bg-slate-700/50 -mx-[18px] mb-[14px]" />

            <div className="flex items-center justify-between mb-[14px]">
              <div className="flex items-center bg-slate-900/60 rounded-[9px] p-0.5 border border-slate-700/50 w-fit">
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
                <button
                  onClick={() => setCompareMode("soloq")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    compareMode === "soloq" ? "bg-cyan-500/90 text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  vs SoloQ
                </button>
                <button
                  onClick={() => setCompareMode("offi")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    compareMode === "offi" ? "bg-violet-500/90 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Offi vs Non-Offi
                </button>
              </div>
            </div>

            {compareMode === "pro" && (
              <div className="mb-3">
                <ProSearchBar
                  selectedLeagues={selectedLeagues}
                  selectedProTeam={selectedProTeam}
                  selectedProPlayer={selectedProPlayer}
                  proSubMode={proSubMode}
                  activePlayerRole={activePlayer?.role || null}
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
                  }}
                  onSelectPlayer={p => {
                    setProSubMode("player")
                    setSelectedProPlayer(p)
                    setSelectedProTeam(null)
                    setSelectedLeagues([])
                  }}
                  onClear={() => {
                    setProSubMode("avg")
                    setSelectedProTeam(null)
                    setSelectedProPlayer(null)
                    setSelectedLeagues([])
                  }}
                />
              </div>
            )}

            <CategoryTabs categories={CATEGORIES} activeCategory={activeCategory} onCategoryChange={setActiveCategory} data={currentData} />

            {viewMode === "spider" ? (
              noCompareData ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                  <p className="text-sm font-medium">No data for this comparison mode</p>
                </div>
              ) : (
                <SpiderChart
                  metrics={activeCompareMetrics}
                  isEnemyChampion={!!activeEnemyChampion}
                  compareMode={compareMode}
                  proLabel={compareMode === "soloq" ? "SoloQ" : compareMode === "offi" ? "Non-Offi" : proCompareLabel}
                  teamLabel={compareMode === "offi" ? "Official" : undefined}
                  teamGames={compareMode === "offi" ? officialSplitStats?.officialGames : currentData.games}
                  compareGames={compareMode === "pro" ? proGames : compareMode === "soloq" ? soloqGames : compareMode === "offi" ? officialSplitStats?.nonOfficialGames : null}
                />
              )
            ) : (
              <MetricsTable
                metrics={currentData.metrics?.[activeCategory] || []}
                isEnemyChampion={!!activeEnemyChampion}
                proStats={proStats?.[activeCategory]}
                proLabel={proCompareLabel}
                soloqStats={soloqStats?.[activeCategory]}
                officialStats={officialSplitStats?.official?.[activeCategory]}
                nonOfficialStats={officialSplitStats?.nonOfficial?.[activeCategory]}
              />
            )}
          </div>

          {activeEnemyChampion && (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-[14px] p-[18px]">
              <h2 className="text-white font-semibold text-xs uppercase tracking-[0.08em] mb-4">Our champions vs this champion</h2>
              <div className="h-px bg-slate-700/50 -mx-[18px] mb-4" />
              <Matchups data={activeEnemyChampion} readOnly />
            </div>
          )}

          {activeChampion && !activeEnemyChampion && (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-[14px] p-[18px]">
              <h2 className="text-white font-semibold text-xs uppercase tracking-[0.08em] mb-4 flex items-center gap-2">
                <img src={getChampionIcon(activeChampion.name)} alt={activeChampion.name} className="w-6 h-6 rounded-full" onError={e => (e.target.style.display = "none")} />
                {activeChampion.name} <span className="text-slate-500">vs</span>
              </h2>
              <div className="h-px bg-slate-700/50 -mx-[18px] mb-4" />
              <Matchups data={activeChampion} readOnly />
            </div>
          )}

          {!activeChampion && !activeEnemyChampion && (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-[14px] p-[18px]">
              <div className="flex items-center justify-between mb-[14px]">
                <div className="flex items-center bg-slate-900/60 rounded-[9px] p-0.5 border border-slate-700/50">
                  <button
                    onClick={() => setRightTab("prog")}
                    className={`px-[13px] py-1.5 rounded-md text-xs font-semibold transition-all ${rightTab === "prog" ? "bg-slate-700 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
                  >
                    Progression
                  </button>
                  <button
                    onClick={() => setRightTab("champ")}
                    className={`px-[13px] py-1.5 rounded-md text-xs font-semibold transition-all ${rightTab === "champ" ? "bg-slate-700 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
                  >
                    Champions
                  </button>
                </div>
              </div>
              <div className="h-px bg-slate-700/50 -mx-[18px] mb-[14px]" />

              {rightTab === "prog" && (
                <ProgressionPanel
                  metrics={activeCompareMetrics}
                  weeklyData={weeklyData}
                  category={activeCat}
                  weeks={weeklyData?.weeks || []}
                  weekDates={weeklyData?.weekDates || []}
                  compareLabel={compareLabel}
                  noCompareData={noCompareData}
                />
              )}
              {rightTab === "champ" && (
                <Matchups
                  data={activePlayer || { champions: mergeTeamChampions(teamData) }}
                  onChampionClick={activePlayer ? setActiveChampion : undefined}
                  readOnly={!activePlayer}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function mergeTeamChampions(teamData) {
  const map = {}
  ;(teamData.players || []).forEach(p => {
    ;(p.champions || []).forEach(c => {
      if (!map[c.name]) map[c.name] = { name: c.name, games: 0, wins: 0 }
      map[c.name].games += c.games || 0
      map[c.name].wins += Math.round(((c.winRate || 0) / 100) * (c.games || 0))
    })
  })
  return Object.values(map).map(c => ({ name: c.name, games: c.games, winRate: c.games > 0 ? Math.round((c.wins / c.games) * 100) : 0 }))
}

function ScopeRail({ teamData, scope, onSelectTeam, onSelectPlayer }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <span className="text-[10px] font-semibold tracking-[0.08em] uppercase text-slate-500 flex-shrink-0">Scope</span>
      <div className="flex items-center gap-1.5 flex-wrap">
        <ScopeButton active={scope === "team"} role="team" name={teamData.name} onClick={onSelectTeam} />
        {["top", "jungle", "mid", "bottom", "support"].map(role => {
          const player = (teamData.players || []).find(p => p.role === role)
          return <ScopeButton key={role} active={scope === role} role={role} name={player ? player.name : "—"} disabled={!player} onClick={() => player && onSelectPlayer(player)} />
        })}
      </div>
    </div>
  )
}

function ScopeButton({ active, role, name, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={role === "team" ? "Team" : ROLE_META[role].pos}
      className={`flex items-center gap-[7px] px-3 py-[7px] rounded-[9px] border transition-all ${
        active ? "bg-slate-700/80 border-slate-500/70" : "bg-slate-900/50 border-slate-700/50"
      } ${disabled ? "opacity-50 cursor-default" : "cursor-pointer hover:border-slate-600"}`}
    >
      {role === "team" ? (
        <Users className="w-[15px] h-[15px] text-emerald-400 flex-shrink-0" />
      ) : (
        <img src={`/roles/${role}.png`} alt={ROLE_META[role].pos} className={`w-[15px] h-[15px] flex-shrink-0 ${active ? "" : "opacity-60"}`} onError={e => (e.target.style.display = "none")} />
      )}
      <span className={`text-[13px] font-medium ${active ? "text-white" : "text-slate-400"}`}>{name}</span>
    </button>
  )
}

function Breadcrumb({ scopeName, scopeGames, activeChampion, activeEnemyChampion, onBack }) {
  return (
    <div className="flex items-center gap-2 mb-3 text-[13px] flex-shrink-0">
      {(activeChampion || activeEnemyChampion) && (
        <button
          onClick={onBack}
          className="w-6 h-6 flex items-center justify-center rounded bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 hover:text-white transition-colors"
          title="Back"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}
      <span className="text-slate-500">Path</span>
      <span className="text-slate-600">/</span>
      <span className="font-semibold text-emerald-400">{scopeName}</span>
      {scopeGames != null && <span className="font-mono text-[11px] text-slate-500 ml-0.5">{scopeGames}G</span>}
      {activeEnemyChampion && (
        <>
          <span className="text-slate-600">/</span>
          <span className="text-red-400 font-medium flex items-center gap-1.5">
            <img src={getChampionIcon(activeEnemyChampion.name)} alt={activeEnemyChampion.name} className="w-5 h-5 rounded-full" onError={e => (e.target.style.display = "none")} />
            {activeEnemyChampion.name}
          </span>
        </>
      )}
      {activeChampion && !activeEnemyChampion && (
        <>
          <span className="text-slate-600">/</span>
          <span className="text-emerald-400 font-medium flex items-center gap-1.5">
            <img src={getChampionIcon(activeChampion.name)} alt={activeChampion.name} className="w-5 h-5 rounded-full" onError={e => (e.target.style.display = "none")} />
            {activeChampion.name}
          </span>
        </>
      )}
    </div>
  )
}

function CategoryTabs({ categories, activeCategory, onCategoryChange, data }) {
  return (
    <div className="flex items-center gap-2 mb-[18px]">
      {categories.map(cat => {
        const score = data.categoryScores?.[cat.id] ?? 50
        return (
          <button
            key={cat.id}
            onClick={() => onCategoryChange(cat.id)}
            className={`flex items-center gap-2 px-[11px] py-2 rounded-[10px] border transition-all ${
              activeCategory === cat.id ? "bg-slate-700/80 border-slate-500/80" : "bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/50 hover:border-slate-600"
            }`}
          >
            <span className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: cat.color + "22" }}>
              <cat.icon className="w-4 h-4" style={{ color: cat.color }} />
            </span>
            <span className={`font-bold text-sm font-mono ${score >= 70 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-red-400"}`}>{score}</span>
          </button>
        )
      })}
    </div>
  )
}

const PROG_DIMS = {
  A: { w: 132, h: 36, pl: 6, pr: 8, pt: 7, pb: 7 }
}

function ProgressionPanel({ metrics, weeklyData, category, weeks, weekDates, compareLabel, noCompareData }) {
  if (noCompareData) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-500">
        <p className="text-sm font-medium">No data for this comparison mode</p>
      </div>
    )
  }
  if (!metrics || metrics.length === 0) {
    return <div className="text-slate-500 text-center py-8">No metrics available</div>
  }

  const rows = metrics.map(m => {
    const series = weeklyData?.metrics?.[category.id]?.[m.name] || []
    const baseline = typeof m.enemies === "number" ? m.enemies : 0
    const gaps = series.map(v => {
      const g = baseline > 0 ? ((v - baseline) / baseline) * 100 : 0
      return m.invert ? -g : g
    })
    const latest = gaps.length ? gaps[gaps.length - 1] : 0
    return {
      name: m.name,
      team: m.team,
      cmp: m.enemies,
      hasData: series.length > 0,
      series,
      gaps,
      latest,
      lineColor: latest >= 0 ? "#34d399" : "#f87171",
      diffLabel: `${latest >= 0 ? "+" : ""}${latest.toFixed(1)}%`,
      diffColor: latest >= 0 ? "#34d399" : "#f87171"
    }
  })

  const rangeLabel = weekDates.length > 0 ? `last ${Math.max(1, Math.round((Date.now() - new Date(weekDates[0]).getTime()) / 86400000))} days` : weeks.length > 0 ? `last ${weeks.length} weeks` : ""

  return (
    <>
      <div className="flex items-center justify-between mb-[14px]">
        <div className="flex items-center gap-[7px]">
          <span className="w-[22px] h-[22px] rounded-md flex items-center justify-center" style={{ backgroundColor: category.color + "22" }}>
            <category.icon className="w-[13px] h-[13px]" style={{ color: category.color }} />
          </span>
          <span className="text-[13px] font-semibold text-white">{category.id} progression</span>
          {rangeLabel && <span className="text-[10px] text-slate-500">· {rangeLabel}</span>}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <span className="w-4 border-t border-dashed border-slate-400 inline-block" />
          <span>
            parity <span className="text-slate-400">vs {compareLabel}</span>
          </span>
        </div>
      </div>

      {!rows.some(r => r.hasData) ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
          <p className="text-sm font-medium">No progression data yet</p>
        </div>
      ) : (
        <div className="pr-1">
          {rows.map(m => (
            <div key={m.name} className="flex items-center gap-3 py-[11px] px-1 border-b border-slate-700/30">
              <div className="w-32 flex-shrink-0">
                <div className="text-slate-200 text-xs font-medium truncate">{m.name}</div>
                <div className="flex items-center gap-1.5 mt-[3px]">
                  <span className="font-mono text-sm font-semibold" style={{ color: m.diffColor }}>
                    {m.diffLabel}
                  </span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <Sparkline row={m} weeks={weeks} weekDates={weekDates} compareLabel={compareLabel} dims={PROG_DIMS.A} />
              </div>
              <div className="w-10 flex-shrink-0 text-right">
                <span className="font-mono text-[11px] text-slate-500">{m.team}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function Sparkline({ row, weeks, weekDates, compareLabel, dims }) {
  const [hover, setHover] = useState(null)
  const range = 45
  const plotW = dims.w - dims.pl - dims.pr
  const plotH = dims.h - dims.pt - dims.pb
  const X = i => (row.gaps.length > 1 ? dims.pl + (i / (row.gaps.length - 1)) * plotW : dims.pl + plotW / 2)
  const Y = v => +(dims.pt + (1 - (Math.max(-range, Math.min(range, v)) + range) / (2 * range)) * plotH).toFixed(1)
  const dots = row.gaps.map((v, i) => ({ cx: +X(i).toFixed(1), cy: Y(v) }))
  const baselineY = Y(0)
  const last = dots[dots.length - 1]

  // Dots are rendered as HTML overlays (not SVG circles) so the `preserveAspectRatio:none`
  // horizontal stretch of the chart doesn't flatten them into ellipses.
  return (
    <div className="relative" style={{ height: dims.h }}>
      <svg viewBox={`0 0 ${dims.w} ${dims.h}`} width="100%" height={dims.h} preserveAspectRatio="none" className="block">
        <line x1={dims.pl} y1={baselineY} x2={dims.w - dims.pr} y2={baselineY} stroke="rgba(148,163,184,.45)" strokeWidth="1" strokeDasharray="3 3" />
        {row.hasData && <polyline points={dots.map(p => `${p.cx},${p.cy}`).join(" ")} fill="none" stroke={row.lineColor} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
        {hover != null && <line x1={dots[hover].cx} y1={dims.pt} x2={dots[hover].cx} y2={dims.h - dims.pb} stroke="rgba(148,163,184,.35)" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
        {row.hasData &&
          dots.map((d, i) => {
            const lo = i === 0 ? 0 : (dots[i - 1].cx + d.cx) / 2
            const hi = i === dots.length - 1 ? dims.w : (d.cx + dots[i + 1].cx) / 2
            return <rect key={i} x={lo} y="0" width={Math.max(0, hi - lo)} height={dims.h} fill="transparent" className="cursor-pointer" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
          })}
      </svg>

      {row.hasData && (
        <span
          className="absolute rounded-full pointer-events-none"
          style={{ left: `${(last.cx / dims.w) * 100}%`, top: last.cy, width: 6, height: 6, background: row.lineColor, transform: "translate(-50%,-50%)" }}
        />
      )}
      {row.hasData && hover != null && (
        <span
          className="absolute rounded-full pointer-events-none ring-2 ring-slate-900"
          style={{ left: `${(dots[hover].cx / dims.w) * 100}%`, top: dots[hover].cy, width: 9, height: 9, background: row.lineColor, transform: "translate(-50%,-50%)" }}
        />
      )}

      {hover != null && (
        <div
          className="absolute z-20 -translate-x-1/2 bottom-full mb-1.5 pointer-events-none bg-slate-900/95 border border-slate-600/60 rounded-lg px-2.5 py-1.5 shadow-xl whitespace-nowrap"
          style={{ left: `${(dots[hover].cx / dims.w) * 100}%` }}
        >
          <p className="text-[10px] text-slate-400 mb-0.5">{weekDates[hover] ? new Date(weekDates[hover]).toLocaleDateString("en-US", { day: "2-digit", month: "short" }) : weeks[hover]}</p>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold" style={{ color: row.gaps[hover] >= 0 ? "#34d399" : "#f87171" }}>
              {row.gaps[hover] >= 0 ? "+" : ""}
              {row.gaps[hover].toFixed(1)}%
            </span>
            <span className="font-mono text-[11px] text-slate-300">{row.series[hover]}</span>
          </div>
          <p className="text-[9px] text-slate-500 mt-0.5">vs {compareLabel}</p>
        </div>
      )}
    </div>
  )
}

function MetricsTable({ metrics, isEnemyChampion, proStats, proLabel, soloqStats, officialStats, nonOfficialStats }) {
  if (!metrics || metrics.length === 0) {
    return <div className="text-slate-500 text-center py-8">No metrics available</div>
  }

  const gridCols =
    { 0: "grid-cols-4", 1: "grid-cols-5", 2: "grid-cols-6", 3: "grid-cols-7", 4: "grid-cols-8" }[
      [
        proStats && Object.keys(proStats).length > 0,
        soloqStats && Object.keys(soloqStats).length > 0,
        officialStats && Object.keys(officialStats).length > 0,
        nonOfficialStats && Object.keys(nonOfficialStats).length > 0
      ].filter(Boolean).length
    ] || "grid-cols-4"

  return (
    <div className="w-full">
      <div className={`grid ${gridCols} gap-4 px-4 py-2 border-b border-slate-700/50 text-xs font-medium text-slate-400 uppercase tracking-wider`}>
        <div>Metric</div>
        <div className="text-center">{isEnemyChampion ? "Us" : "Team"}</div>
        <div className="text-center">{isEnemyChampion ? "This champ" : "Enemies"}</div>
        {proStats && Object.keys(proStats).length > 0 && <div className="text-center">{proLabel || "Pro Avg"}</div>}
        {soloqStats && Object.keys(soloqStats).length > 0 && <div className="text-center">SoloQ</div>}
        {officialStats && Object.keys(officialStats).length > 0 && <div className="text-center">Official</div>}
        {nonOfficialStats && Object.keys(nonOfficialStats).length > 0 && <div className="text-center">Non-Offi</div>}
        <div className="text-right">Diff</div>
      </div>

      <div className="divide-y divide-slate-700/30">
        {metrics.map((row, i) => (
          <div key={i} className={`grid ${gridCols} gap-4 px-4 py-3 hover:bg-slate-700/20 transition-colors items-center text-sm`}>
            <div className="text-slate-200 font-medium">{row.name}</div>
            <div className="text-center text-emerald-400 font-mono font-medium">{row.team}</div>
            <div className="text-center text-red-400 font-mono">{row.enemies}</div>
            {proStats && Object.keys(proStats).length > 0 && <div className="text-center text-amber-400 font-mono">{proStats[row.name] ?? "-"}</div>}
            {soloqStats && Object.keys(soloqStats).length > 0 && <div className="text-center text-cyan-400 font-mono">{soloqStats[row.name] ?? "-"}</div>}
            {officialStats && Object.keys(officialStats).length > 0 && <div className="text-center text-violet-400 font-mono">{officialStats[row.name] ?? "-"}</div>}
            {nonOfficialStats && Object.keys(nonOfficialStats).length > 0 && <div className="text-center text-fuchsia-400 font-mono">{nonOfficialStats[row.name] ?? "-"}</div>}
            <div className={`text-right font-bold font-mono ${(parseFloat(row.diff) || 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {(parseFloat(row.diff) || 0) >= 0 ? "+" : ""}
              {row.diff}%
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SpiderChart({ metrics, isEnemyChampion, compareMode, proLabel, teamLabel, teamGames, compareGames }) {
  const [hoveredIndex, setHoveredIndex] = useState(null)

  if (!metrics || metrics.length === 0) {
    return <div className="text-slate-500 text-center py-8">No metrics available</div>
  }

  const enemyLabel = isEnemyChampion
    ? "This champ"
    : compareMode === "offi"
      ? proLabel || "Non-Offi"
      : compareMode === "soloq"
        ? proLabel || "SoloQ"
        : compareMode === "pro"
          ? proLabel || "Pro Avg"
          : "Enemies"
  const displayTeamLabel = teamLabel || (isEnemyChampion ? "Us" : "Team")

  const getPoint = (value, index) => {
    const angle = -Math.PI / 2 + (index * (2 * Math.PI)) / metrics.length
    const radius = value
    return { x: 140 + radius * Math.cos(angle), y: 140 + radius * Math.sin(angle) }
  }

  const getPolygonPoints = values =>
    values
      .map((val, i) => {
        const point = getPoint(val, i)
        return `${point.x},${point.y}`
      })
      .join(" ")

  const teamValues = metrics.map(m => {
    if (m.unavailable) return 50
    const diff = parseFloat(m.diff) || 0
    const clampedDiff = Math.max(-100, Math.min(100, diff))
    const sign = clampedDiff >= 0 ? 1 : -1
    const scaledDiff = sign * Math.pow(Math.abs(clampedDiff) / 100, 0.7) * 100
    return Math.max(15, Math.min(95, 50 + (scaledDiff / 100) * 40))
  })

  const enemyValues = metrics.map(m => {
    if (m.unavailable) return 50
    const diff = parseFloat(m.diff) || 0
    const clampedDiff = Math.max(-100, Math.min(100, diff))
    const sign = clampedDiff >= 0 ? 1 : -1
    const scaledDiff = sign * Math.pow(Math.abs(clampedDiff) / 100, 0.7) * 100
    return Math.max(15, Math.min(95, 50 - (scaledDiff / 100) * 40))
  })

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-4">
        <svg width={280} height={280} className="overflow-visible">
          {[20, 40, 60, 80, 100].map((level, i) => {
            const points = metrics.map((_, idx) => getPoint(level, idx))
            const pathData = points.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z"
            return <path key={i} d={pathData} fill="none" stroke="rgb(51 65 85 / 0.3)" strokeWidth="1" pointerEvents="none" />
          })}

          {metrics.map((_, i) => {
            const endPoint = getPoint(100, i)
            return <line key={i} x1={140} y1={140} x2={endPoint.x} y2={endPoint.y} stroke="rgb(51 65 85 / 0.4)" strokeWidth="1" pointerEvents="none" />
          })}

          <polygon
            points={getPolygonPoints(enemyValues)}
            fill={
              compareMode === "offi"
                ? "rgba(139, 92, 246, 0.1)"
                : compareMode === "soloq"
                  ? "rgba(6, 182, 212, 0.1)"
                  : compareMode === "pro"
                    ? "rgba(245, 158, 11, 0.1)"
                    : "rgba(239, 68, 68, 0.1)"
            }
            stroke={
              compareMode === "offi"
                ? "rgba(139, 92, 246, 0.5)"
                : compareMode === "soloq"
                  ? "rgba(6, 182, 212, 0.5)"
                  : compareMode === "pro"
                    ? "rgba(245, 158, 11, 0.5)"
                    : "rgba(239, 68, 68, 0.5)"
            }
            strokeWidth="2"
            pointerEvents="none"
          />

          <polygon points={getPolygonPoints(teamValues)} fill="rgba(16, 185, 129, 0.15)" stroke="rgb(16, 185, 129)" strokeWidth="2" pointerEvents="none" />

          {enemyValues.map((val, i) => {
            const point = getPoint(val, i)
            return (
              <circle
                key={`enemy-${i}`}
                cx={point.x}
                cy={point.y}
                r="4"
                fill={
                  compareMode === "offi" ? "rgb(139, 92, 246)" : compareMode === "soloq" ? "rgb(6, 182, 212)" : compareMode === "pro" ? "rgb(245, 158, 11)" : "rgb(239, 68, 68)"
                }
                stroke="rgb(30, 41, 59)"
                strokeWidth="2"
                pointerEvents="none"
              />
            )
          })}

          {teamValues.map((val, i) => {
            const point = getPoint(val, i)
            return <circle key={`team-${i}`} cx={point.x} cy={point.y} r="4" fill="rgb(16, 185, 129)" stroke="rgb(30, 41, 59)" strokeWidth="2" pointerEvents="none" />
          })}

          {metrics.map((_, i) => (
            <path
              key={`hover-${i}`}
              d={`M 140 140 L ${140 + 130 * Math.cos(-Math.PI / 2 + ((i - 0.5) * (2 * Math.PI)) / metrics.length)} ${140 + 130 * Math.sin(-Math.PI / 2 + ((i - 0.5) * (2 * Math.PI)) / metrics.length)} A 130 130 0 0 1 ${140 + 130 * Math.cos(-Math.PI / 2 + ((i + 0.5) * (2 * Math.PI)) / metrics.length)} ${140 + 130 * Math.sin(-Math.PI / 2 + ((i + 0.5) * (2 * Math.PI)) / metrics.length)} Z`}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          ))}

          {metrics.map((metric, i) => (
            <text
              key={i}
              x={getPoint(115, i).x}
              y={getPoint(115, i).y}
              textAnchor={
                Math.cos(-Math.PI / 2 + (i * (2 * Math.PI)) / metrics.length) > 0.1
                  ? "start"
                  : Math.cos(-Math.PI / 2 + (i * (2 * Math.PI)) / metrics.length) < -0.1
                    ? "end"
                    : "middle"
              }
              dominantBaseline="middle"
              className="fill-slate-300 text-[10px] font-medium"
              pointerEvents="none"
            >
              {metric.name}
            </text>
          ))}
        </svg>

        <div className="w-[140px] flex-shrink-0">
          {hoveredIndex !== null ? (
            <div className="bg-slate-900/80 border border-slate-600/50 rounded-lg p-3">
              <p className="text-white text-xs font-semibold mb-2 truncate">{metrics[hoveredIndex].name}</p>
              <div className="h-px bg-slate-700/50 mb-2" />
              {metrics[hoveredIndex].unavailable ? (
                <p className="text-slate-500 text-[10px] text-center">Not available</p>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-slate-400 text-[10px]">{displayTeamLabel}</span>
                    <span className="text-emerald-400 text-xs font-medium">{metrics[hoveredIndex].team}</span>
                  </div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-slate-400 text-[10px]">{enemyLabel}</span>
                    <span
                      className={`text-xs font-medium ${compareMode === "offi" ? "text-violet-400" : compareMode === "soloq" ? "text-cyan-400" : compareMode === "pro" ? "text-amber-400" : "text-red-400"}`}
                    >
                      {metrics[hoveredIndex].enemies}
                    </span>
                  </div>
                  <div className="h-px bg-slate-700/50 mb-2" />
                  <p className={`text-center text-sm font-bold ${metrics[hoveredIndex].diff >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {metrics[hoveredIndex].diff >= 0 ? "+" : ""}
                    {metrics[hoveredIndex].diff}%
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="text-slate-600 text-[10px] text-center">Hover a metric</div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-slate-400 text-xs">{displayTeamLabel}</span>
          {teamGames != null && <span className="text-slate-600 text-[10px]">{teamGames}G</span>}
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${compareMode === "offi" ? "bg-violet-500" : compareMode === "soloq" ? "bg-cyan-500" : compareMode === "pro" ? "bg-amber-500" : "bg-red-500"}`}
          />
          <span className="text-slate-400 text-xs">{enemyLabel}</span>
          {compareGames != null && <span className="text-slate-600 text-[10px]">{compareGames}G</span>}
        </div>
      </div>
    </div>
  )
}

function ProSearchBar({
  selectedLeagues,
  selectedProTeam,
  selectedProPlayer,
  proSubMode,
  activePlayerRole,
  onSelectLeague,
  onClearLeagues,
  onSelectTeam,
  onSelectPlayer,
  onClear
}) {
  const [leagues, setLeagues] = useState([])
  const [teams, setTeams] = useState([])
  const [players, setPlayers] = useState([])
  const [searchInput, setSearchInput] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  const fetchLeagues = async () => {
    try {
      const { ok, data, code } = await api.get("/pro-game/leagues/list")
      if (!ok) return toast.error(code || "Failed to fetch leagues")
      setLeagues(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch leagues")
    }
  }

  const fetchTeams = async () => {
    try {
      const { ok, data, code } = await api.get("/pro-game-playerstats/teams/list")
      if (!ok) return toast.error(code || "Failed to fetch teams")
      setTeams(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch teams")
    }
  }

  const fetchPlayers = async () => {
    try {
      const pos = activePlayerRole ? ROLE_TO_POSITION[activePlayerRole] || activePlayerRole : ""
      const { ok, data, code } = await api.get(`/pro-game-playerstats/players/list${pos ? `?position=${pos}` : ""}`)
      if (!ok) return toast.error(code || "Failed to fetch players")
      setPlayers(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch players")
    }
  }

  useEffect(() => {
    fetchLeagues()
    fetchTeams()
  }, [])

  useEffect(() => {
    fetchPlayers()
  }, [activePlayerRole])

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const q = searchInput.toLowerCase()
  const filteredLeagues = q ? leagues.filter(l => l.toLowerCase().includes(q)) : []
  const filteredTeams = q ? teams.filter(t => t.toLowerCase().includes(q)).slice(0, 8) : []
  const filteredPlayers = q ? players.filter(p => p.name.toLowerCase().includes(q) || (p.team || "").toLowerCase().includes(q)).slice(0, 8) : []

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setIsOpen(o => !o)}
          className="flex items-center gap-1.5 bg-slate-900/60 border border-slate-700/50 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors"
        >
          <Search className="w-3 h-3 flex-shrink-0 text-slate-500" />
          <span className="text-amber-400">vs</span>
          <span className="truncate max-w-[120px]">
            {proSubMode === "team" && selectedProTeam
              ? selectedProTeam
              : proSubMode === "player" && selectedProPlayer
                ? selectedProPlayer.name
                : selectedLeagues.length === 1
                  ? selectedLeagues[0]
                  : selectedLeagues.length > 1
                    ? `${selectedLeagues.length} leagues`
                    : "Pro Avg"}
          </span>
          <ChevronDown className={`w-3 h-3 flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
        {(selectedProTeam || selectedProPlayer || selectedLeagues.length > 0) && (
          <button
            onClick={() => {
              onClear()
              setSearchInput("")
            }}
            className="text-slate-500 hover:text-slate-300 transition-colors p-1"
            title="Reset to Pro Avg"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50 w-[300px]">
          <div className="p-2 border-b border-slate-700">
            <input
              autoFocus
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search league, team or player..."
              className="w-full bg-slate-900/60 border border-slate-600 rounded-md px-2.5 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500/60 transition-colors"
            />
          </div>
          <div className="max-h-72 overflow-y-auto">
            {!q ? (
              <div className="p-2 space-y-3">
                <div>
                  <p className="text-slate-500 text-[10px] uppercase tracking-wider px-1 mb-1">Leagues</p>
                  <button
                    onClick={onClearLeagues}
                    className={`w-full text-left px-2 py-1.5 text-xs rounded hover:bg-slate-700 transition-colors ${selectedLeagues.length === 0 && proSubMode === "avg" ? "text-amber-400 font-medium" : "text-white"}`}
                  >
                    All Leagues (Pro Avg)
                  </button>
                  {["LEC", "LCK", "LPL"]
                    .filter(l => leagues.includes(l))
                    .map(l => (
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
                <div className="border-t border-slate-700/50 pt-2">
                  <p className="text-slate-500 text-[10px] uppercase tracking-wider px-1 mb-1">Teams</p>
                  {["T1", "G2 Esports", "Gen.G"]
                    .filter(t => teams.includes(t))
                    .map(t => (
                      <button
                        key={t}
                        onClick={() => {
                          onSelectTeam(t)
                          setSearchInput("")
                          setIsOpen(false)
                        }}
                        className={`w-full text-left px-2 py-1.5 text-xs rounded hover:bg-slate-700 transition-colors ${selectedProTeam === t ? "text-amber-400 font-medium" : "text-white"}`}
                      >
                        {t}
                      </button>
                    ))}
                </div>
                <div className="border-t border-slate-700/50 pt-2">
                  <p className="text-slate-500 text-[10px] uppercase tracking-wider px-1 mb-1">Players</p>
                  {["Faker", "Caps", "Chovy"]
                    .map(n => players.find(p => p.name === n))
                    .filter(Boolean)
                    .map(p => (
                      <button
                        key={p.name}
                        onClick={() => {
                          onSelectPlayer(p)
                          setSearchInput("")
                          setIsOpen(false)
                        }}
                        className={`w-full text-left px-2 py-1.5 text-xs rounded hover:bg-slate-700 transition-colors ${selectedProPlayer?.name === p.name ? "text-amber-400 font-medium" : "text-white"}`}
                      >
                        <span>{p.name}</span>
                        {p.team && <span className="text-slate-500 ml-1.5">{p.team}</span>}
                      </button>
                    ))}
                </div>
                <p className="text-slate-600 text-[10px] text-center pt-1">Type to search more...</p>
              </div>
            ) : filteredLeagues.length === 0 && filteredTeams.length === 0 && filteredPlayers.length === 0 ? (
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
                        onClick={() => {
                          onSelectTeam(t)
                          setSearchInput("")
                          setIsOpen(false)
                        }}
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
                        onClick={() => {
                          onSelectPlayer(p)
                          setSearchInput("")
                          setIsOpen(false)
                        }}
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

function Matchups({ data, onChampionClick, readOnly }) {
  const [sortBy, setSortBy] = useState("games")
  const allChampions = (data.champions || [])
    .filter((champ, idx, arr) => arr.findIndex(c => c.name === champ.name) === idx)
    .sort((a, b) => (sortBy === "winRate" ? (b.winRate || 0) - (a.winRate || 0) : (b.games || 0) - (a.games || 0)))

  if (allChampions.length === 0) {
    return <div className="text-slate-500 text-center py-8">No data</div>
  }

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-3">
        <span className="text-slate-500 text-[10px] uppercase tracking-wider mr-1">Sort by</span>
        <button
          onClick={() => setSortBy("games")}
          className={`px-2 py-1 rounded text-xs font-medium transition-all ${sortBy === "games" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200 bg-slate-800/50"}`}
        >
          Games
        </button>
        <button
          onClick={() => setSortBy("winRate")}
          className={`px-2 py-1 rounded text-xs font-medium transition-all ${sortBy === "winRate" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200 bg-slate-800/50"}`}
        >
          Win Rate
        </button>
      </div>
      <div className="max-h-[520px] overflow-y-auto pr-1 space-y-2 custom-scrollbar">
        {allChampions.map((matchup, idx) => (
          <div
            key={idx}
            onClick={readOnly ? undefined : () => onChampionClick(matchup)}
            className={`bg-slate-900/40 border rounded-[11px] p-[11px] flex items-center gap-3 transition-all ${
              readOnly ? "border-slate-700/40" : "cursor-pointer hover:bg-slate-700/40 border-slate-700/40 hover:border-slate-500/50"
            }`}
          >
            <div className="w-10 h-10 bg-slate-700/50 rounded-[9px] flex items-center justify-center overflow-hidden flex-shrink-0">
              <img src={getChampionIcon(matchup.name)} alt={matchup.name} className="w-full h-full object-cover" onError={e => (e.target.style.display = "none")} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-white font-medium text-sm truncate block">{matchup.name}</span>
              <span className="text-slate-500 text-xs">{matchup.games} games</span>
            </div>
            <span className={`font-bold text-sm font-mono ${matchup.winRate > 50 ? "text-emerald-400" : "text-red-400"}`}>{matchup.winRate}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
