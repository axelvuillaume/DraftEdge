import { useState, useEffect, useRef } from "react"
import { toast } from "react-hot-toast"
import { useNavigate } from "react-router-dom"
import api from "@/services/api"
import useStore from "@/services/store"
import Modal from "@/components/modal"
import OpponentDropdown from "@/components/OpponentDropdown"
import { RANK_ICON_TIERS } from "@/utils"
import {
  Calendar,
  BarChart,
  Swords,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  StickyNote,
  Flame,
  Crown,
  Target,
  Zap,
  Upload,
  FileText,
  Loader2,
  FolderOpen,
  Trophy
} from "lucide-react"

export default function Home() {
  const navigate = useNavigate()
  const { user } = useStore()
  const [readyUpOpen, setReadyUpOpen] = useState(false)
  const [readyUpMode, setReadyUpMode] = useState(null)

  return (
    <div className="min-h-[calc(100vh-65px)] bg-slate-900 p-5 lg:p-6 overflow-y-auto">
      <div className="space-y-5">
        {/* ── Header + Mini Stats ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-slate-500 text-xs mb-1">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 bg-clip-text text-transparent leading-tight tracking-tight">
              {user?.team_name || "DraftEdge"}
            </h1>
          </div>
          <MiniStats />
        </div>

        {/* ── Quick Actions ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
          <button
            onClick={() => {
              setReadyUpMode("session")
              setReadyUpOpen(true)
            }}
            className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 hover:border-blue-400/40 p-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -translate-y-8 translate-x-8 group-hover:bg-blue-500/10 transition-colors" />
            <Swords className="w-5 h-5 text-blue-400 mb-2" />
            <p className="text-white font-bold text-sm">Start your Scrim</p>
            <p className="text-blue-400/60 text-[11px] mt-0.5">Create a scrim session</p>
          </button>
          <button
            onClick={() => {
              setReadyUpMode("import")
              setReadyUpOpen(true)
            }}
            className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 hover:border-amber-400/40 p-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -translate-y-8 translate-x-8 group-hover:bg-amber-500/10 transition-colors" />
            <Upload className="w-5 h-5 text-amber-400 mb-2" />
            <p className="text-white font-bold text-sm">Import your Offi</p>
            <p className="text-amber-400/60 text-[11px] mt-0.5">Upload a .rofl replay</p>
          </button>
          <button
            onClick={() => navigate("/scrim-hub/draft")}
            className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-rose-500/10 to-rose-600/5 border border-rose-500/20 hover:border-rose-400/40 p-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full -translate-y-8 translate-x-8 group-hover:bg-rose-500/10 transition-colors" />
            <Target className="w-5 h-5 text-rose-400 mb-2" />
            <p className="text-white font-bold text-sm">Train your Draft</p>
            <p className="text-rose-400/60 text-[11px] mt-0.5">Practice picks & bans</p>
          </button>
          <button
            onClick={() => navigate("/performance/stats")}
            className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 hover:border-emerald-400/40 p-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -translate-y-8 translate-x-8 group-hover:bg-emerald-500/10 transition-colors" />
            <BarChart className="w-5 h-5 text-emerald-400 mb-2" />
            <p className="text-white font-bold text-sm">Compare your stats to Faker</p>
            <p className="text-emerald-400/60 text-[11px] mt-0.5">Team performance</p>
          </button>
          <button
            onClick={() => navigate("/soloq")}
            className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 hover:border-purple-400/40 p-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full -translate-y-8 translate-x-8 group-hover:bg-purple-500/10 transition-colors" />
            <Zap className="w-5 h-5 text-purple-400 mb-2" />
            <p className="text-white font-bold text-sm">Ranked Grind</p>
            <p className="text-purple-400/60 text-[11px] mt-0.5">Track SoloQ progress</p>
          </button>
        </div>

        {/* ── Main Grid: 3 columns ── */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          {/* Left column: SoloQ Today + Objectives + League */}
          <div className="xl:col-span-4 space-y-4">
            <SoloQToday />
            <ObjectivesScore />
            <LeagueRanking />
          </div>

          {/* Center column: Recent Games */}
          <div className="xl:col-span-4">
            <RecentGames />
          </div>

          {/* Right column: Patch + Scrim Calendar + Notes */}
          <div className="xl:col-span-4 space-y-4">
            <PatchCard />
            <ScrimCalendar />
            <TeamNotes />
          </div>
        </div>
      </div>

      <ReadyUpModal
        isOpen={readyUpOpen}
        initialMode={readyUpMode}
        onClose={() => {
          setReadyUpOpen(false)
          setReadyUpMode(null)
        }}
      />
    </div>
  )
}

//Mini Stats (top right)
function MiniStats() {
  const { user } = useStore()
  const [stats, setStats] = useState(null)

  const fetchData = async () => {
    try {
      const { ok, data, code } = await api.get("/game/home-stats")
      if (!ok) return toast.error(code || "Failed to fetch stats")
      setStats(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch stats")
    }
  }

  useEffect(() => {
    fetchData()
  }, [user?.team_id])

  if (!stats) return null

  const wr = ((stats.win_rate || 0) * 100).toFixed(0)
  return (
    <div className="flex items-center gap-4 bg-slate-800/50 rounded-xl px-4 py-2.5 border border-slate-700/30">
      <div className="text-center">
        <p className="text-[9px] text-slate-500 uppercase tracking-wider">Games</p>
        <p className="text-sm font-bold text-white tabular-nums">{stats.total_games || 0}</p>
      </div>
      <div className="w-px h-6 bg-slate-700/40" />
      <div className="text-center">
        <p className="text-[9px] text-slate-500 uppercase tracking-wider">Win Rate</p>
        <p className={`text-sm font-bold tabular-nums ${stats.win_rate >= 0.5 ? "text-emerald-400" : "text-red-400"}`}>{wr}%</p>
      </div>
      <div className="w-px h-6 bg-slate-700/40" />
      <div className="text-center">
        <p className="text-[9px] text-slate-500 uppercase tracking-wider">Avg Enemy</p>
        <p className="text-sm font-bold text-white">{stats?.avg_enemy_rank?.tier ? stats.avg_enemy_rank.tier : "N/A"}</p>
      </div>
    </div>
  )
}

//SoloQ Today
function SoloQToday() {
  const { user } = useStore()
  const navigate = useNavigate()
  const [players, setPlayers] = useState([])

  const fetchData = async () => {
    try {
      const { ok, data, code } = await api.post("/soloq-snapshot/today-leaderboard", { team_id: user.team_id })
      if (!ok) return toast.error(code || "Failed to fetch leaderboard")
      setPlayers(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch leaderboard")
    }
  }

  useEffect(() => {
    fetchData()
  }, [user?.team_id])

  return (
    <div className="rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800/60">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider">SoloQ Today</h3>
        </div>
        <button onClick={() => navigate("/soloq")} className="text-[10px] text-slate-500 hover:text-amber-400 transition-colors flex items-center gap-0.5">
          View all <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      <div className="bg-slate-800/30">
        {players.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <Flame className="w-8 h-8 text-slate-700 mx-auto mb-2" />
            <p className="text-slate-600 text-sm">No SoloQ grind today yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/20">
            {players.map((player, i) => (
              <div
                key={player.game_name}
                className={`flex items-center gap-3 px-4 hover:bg-slate-700/20 transition-colors ${i === 0 ? "py-5 bg-gradient-to-r from-amber-500/5 to-transparent" : "py-3"}`}
              >
                <div
                  className={`rounded-full flex items-center justify-center font-bold shrink-0 ${i === 0 ? "w-10 h-10 text-sm bg-amber-500/15 text-amber-400" : "w-7 h-7 text-xs bg-slate-800 text-slate-500"}`}
                >
                  {i === 0 && player.lpChange > 0 ? <Crown className={i === 0 ? "w-5 h-5" : "w-3.5 h-3.5"} /> : i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`text-white font-semibold truncate block ${i === 0 ? "text-base" : "text-sm"}`}>{player.game_name}</span>
                  {player.games > 0 && (
                    <span className={`text-slate-600 ${i === 0 ? "text-xs" : "text-[10px]"}`}>
                      {player.games} game{player.games > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                {RANK_ICON_TIERS.has(player.current_tier) && (
                  <img
                    src={`/rank/${player.current_tier.toLowerCase()}.png`}
                    alt=""
                    className={`object-contain shrink-0 ${i === 0 ? "w-9 h-9 opacity-90" : "w-7 h-7 opacity-70"}`}
                  />
                )}
                <span
                  className={`font-bold tabular-nums shrink-0 ${i === 0 ? "text-sm" : "text-xs"} ${player.lpChange > 0 ? "text-emerald-400" : player.lpChange < 0 ? "text-red-400" : "text-slate-600"}`}
                >
                  {player.lpChange > 0 ? "+" : ""}
                  {player.lpChange} LP
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Objectives Score
function ObjectivesScore() {
  const { user } = useStore()
  const navigate = useNavigate()
  const [avg, setAvg] = useState(null)

  const fetchData = async () => {
    try {
      const { ok, data, code } = await api.post("/scrim-objectif-result/average-score", { team_id: user.team_id })
      if (!ok) return toast.error(code || "Failed to fetch score")
      setAvg(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch score")
    }
  }

  useEffect(() => {
    fetchData()
  }, [user?.team_id])

  return (
    <div className="rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800/60">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-purple-400" />
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Objectives Scrims</h3>
        </div>
        <button onClick={() => navigate("/scrim-hub/objectives")} className="text-[10px] text-slate-500 hover:text-purple-400 transition-colors flex items-center gap-0.5">
          Details <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      <div className="bg-slate-800/30 px-4 py-5">
        <div className="flex items-center justify-center gap-4">
          <div className="text-center">
            <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Avg Score</p>
            <div className="flex items-baseline justify-center gap-0.5">
              <span className={`text-3xl font-extrabold tabular-nums ${avg >= 7 ? "text-emerald-400" : avg >= 5 ? "text-amber-400" : "text-red-400"}`}>
                {avg != null ? Number(avg).toFixed(1) : "–"}
              </span>
              <span className="text-slate-600 text-sm font-medium">/10</span>
            </div>
          </div>
        </div>
        <div className="mt-3 h-2 bg-slate-700/50 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${avg >= 7 ? "bg-emerald-500" : avg >= 5 ? "bg-amber-500" : "bg-red-500"}`}
            style={{ width: `${(avg / 10) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}

// League Ranking
function LeagueRanking() {
  const { team } = useStore()
  const navigate = useNavigate()
  const [teams, setTeams] = useState([])

  const fetchData = async () => {
    if (!team?.league_id) return
    try {
      const { ok, data, code } = await api.post("/team-league/search", { league_id: team.league_id, sort: "lp" })
      if (!ok) return toast.error(code || "Failed to fetch league")
      setTeams(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch league")
    }
  }

  useEffect(() => {
    fetchData()
  }, [team?.league_id])

  if (!team?.league_id || teams.length === 0) return null

  return (
    <div className="rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800/60">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider">{team.league_name || "League"}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-slate-600">Sorted by LP</span>
          <button onClick={() => navigate("/league")} className="text-[10px] text-slate-500 hover:text-amber-400 transition-colors flex items-center gap-0.5">
            Full ranking <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="bg-slate-800/30">
        <div className="divide-y divide-slate-700/20">
          {teams.slice(0, 3).map((t, i) => (
            <div
              key={t._id}
              onClick={() => navigate(`/league/${t._id}`)}
              className={`flex items-center gap-3 px-4 hover:bg-slate-700/20 transition-colors cursor-pointer ${i === 0 ? "py-4 bg-gradient-to-r from-amber-500/5 to-transparent" : "py-3"}`}
            >
              <div
                className={`rounded-full flex items-center justify-center font-bold shrink-0 ${i === 0 ? "w-8 h-8 text-sm bg-amber-500/15 text-amber-400" : "w-6 h-6 text-xs bg-slate-800 text-slate-500"}`}
              >
                {i === 0 ? <Crown className="w-4 h-4" /> : i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <span className={`text-white font-semibold truncate block ${i === 0 ? "text-sm" : "text-xs"}`}>{t.name}</span>
              </div>
              <span className={`font-bold tabular-nums shrink-0 text-amber-400 ${i === 0 ? "text-sm" : "text-xs"}`}>{t.total_lp || 0} LP</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Recent Games
function RecentGames() {
  const { user } = useStore()
  const navigate = useNavigate()
  const [games, setGames] = useState([])

  const fetchGames = async () => {
    try {
      const { ok, data, code } = await api.post("/game/search", { limit: 5, team_id: user.team_id })
      if (!ok) return toast.error(code || "Failed to fetch games")
      setGames(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch games")
    }
  }

  useEffect(() => {
    fetchGames()
  }, [user?.team_id])

  return (
    <div className="rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800/60">
        <div className="flex items-center gap-2">
          <Swords className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Recent Form</h3>
        </div>
        <span className="text-[9px] text-slate-600">Last {games.length} games</span>
      </div>

      <div className="bg-slate-800/30 px-4 py-5">
        {!games.length ? (
          <p className="text-slate-600 text-sm text-center py-4">No games imported yet</p>
        ) : (
          <>
            <div className="flex items-center justify-center gap-2">
              {games.map(game => (
                <div key={game._id} className="flex flex-col items-center gap-1.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${game.win ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}
                  >
                    {game.win ? "W" : "L"}
                  </div>
                  <span className="text-[8px] text-slate-600 truncate max-w-[40px]">{game.opponent_name || "—"}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-3 mt-3 text-xs">
              <span className="text-emerald-400 font-semibold">{games.filter(g => g.win).length}W</span>
              <span className="text-slate-600">-</span>
              <span className="text-red-400 font-semibold">{games.filter(g => !g.win).length}L</span>
            </div>
          </>
        )}

        <button
          onClick={() => navigate("/performance/games")}
          className="w-full mt-4 py-2.5 rounded-lg bg-slate-700/40 hover:bg-blue-500/15 border border-slate-700/30 hover:border-blue-500/30 text-slate-300 hover:text-blue-400 text-sm font-medium transition-all flex items-center justify-center gap-1.5"
        >
          View all games <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// Patch Card
function PatchCard() {
  return (
    <div className="rounded-xl overflow-hidden cursor-pointer hover:scale-[1.01] transition-all">
      <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 hover:border-amber-400/40 px-4 py-4 flex items-center gap-3 transition-colors">
        <div className="w-10 h-10 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
          <Zap className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <p className="text-[9px] text-slate-500 uppercase tracking-wider">Current Patch</p>
          <p className="text-lg font-extrabold text-amber-400 tabular-nums leading-tight">25.6</p>
        </div>
      </div>
    </div>
  )
}

// Scrim Calendar
function ScrimCalendar() {
  const { user } = useStore()
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [month, setMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(null)
  const [hoveredDay, setHoveredDay] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createDate, setCreateDate] = useState("")
  const [createForm, setCreateForm] = useState({ name: "", opponent: null })

  const fetchData = async () => {
    try {
      const { ok, data, code } = await api.post("/scrim-session/search", { team_id: user.team_id })
      if (!ok) return toast.error(code || "Failed to fetch sessions")
      setSessions(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch sessions")
    }
  }

  useEffect(() => {
    fetchData()
  }, [user?.team_id])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const year = month.getFullYear()
  const mo = month.getMonth()
  const firstDay = new Date(year, mo, 1).getDay()
  const daysInMonth = new Date(year, mo + 1, 0).getDate()

  const sessionsByDay = {}
  sessions.forEach(s => {
    const d = new Date(s.date)
    if (d.getMonth() === mo && d.getFullYear() === year) {
      const day = d.getDate()
      if (!sessionsByDay[day]) sessionsByDay[day] = []
      sessionsByDay[day].push(s)
    }
  })

  const prevMonth = () => setMonth(new Date(year, mo - 1, 1))
  const nextMonth = () => setMonth(new Date(year, mo + 1, 1))

  const daySessions = selectedDay ? sessionsByDay[selectedDay] || [] : []

  const handleDayClick = (day, daySess) => {
    if (daySess && daySess.length === 1) {
      navigate(`/scrim-hub/scrims/${daySess[0]._id}`)
      return
    }
    if (daySess && daySess.length > 1) {
      setSelectedDay(selectedDay === day ? null : day)
      return
    }
    setCreateDate(new Date(year, mo, day).toISOString().slice(0, 10))
    setShowCreateModal(true)
  }

  const handleCreateSession = async () => {
    if (!createForm.name.trim()) return toast.error("Session name is required")
    if (!createForm.opponent?._id) return toast.error("Select an opponent")
    try {
      const { ok, data, code } = await api.post("/scrim-session", {
        name: createForm.name.trim(),
        opponent_id: createForm.opponent._id,
        opponent_name: createForm.opponent.name,
        date: new Date(createDate).toISOString()
      })
      if (!ok) return toast.error(code || "Failed to create session")
      setSessions(prev => [...prev, data])
      setCreateForm({ name: "", opponent: null })
      setShowCreateModal(false)
      toast.success("Scrim session created")
    } catch (error) {
      toast.error(error.code || "Failed to create session")
    }
  }

  return (
    <div className="rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800/60">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Scrim Calendar</h3>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="p-1 rounded-md hover:bg-slate-700/50 text-slate-400 hover:text-white transition-all">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs text-slate-300 font-medium w-24 text-center">{month.toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
          <button onClick={nextMonth} className="p-1 rounded-md hover:bg-slate-700/50 text-slate-400 hover:text-white transition-all">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="bg-slate-800/30 p-3">
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map(d => (
            <div key={d} className="text-[9px] text-slate-600 text-center font-medium py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {Array.from({ length: (firstDay + 6) % 7 }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const isToday = day === today.getDate() && mo === today.getMonth() && year === today.getFullYear()
            const daySess = sessionsByDay[day]
            const isSelected = selectedDay === day
            const isPast = new Date(year, mo, day) < today

            return (
              <button
                key={day}
                onClick={() => handleDayClick(day, daySess)}
                onMouseEnter={() => setHoveredDay(day)}
                onMouseLeave={() => setHoveredDay(null)}
                className={`aspect-square flex flex-col items-center justify-center rounded-lg text-xs transition-all relative group/day
                  ${isSelected ? "bg-blue-500/20 ring-1 ring-blue-500/40" : "hover:bg-slate-700/30"}
                  ${isToday ? "text-amber-400 font-bold" : "text-slate-400"}
                `}
              >
                {!daySess && hoveredDay === day ? (
                  <Plus className="w-3 h-3 text-blue-400" />
                ) : (
                  <>
                    {day}
                    {daySess && (
                      <div className="flex gap-0.5 mt-0.5">
                        {daySess.length <= 3 ? (
                          daySess.map((s, j) => (
                            <div
                              key={j}
                              className={`w-1 h-1 rounded-full ${!isPast ? "bg-blue-400" : s.win > (s.loss || 0) ? "bg-emerald-400" : s.loss > 0 ? "bg-red-400" : "bg-slate-500"}`}
                            />
                          ))
                        ) : (
                          <div className="text-[8px] text-blue-400 font-bold">{daySess.length}</div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-700/30">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span className="text-[9px] text-slate-600">Upcoming</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[9px] text-slate-600">Win</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
            <span className="text-[9px] text-slate-600">Loss</span>
          </div>
        </div>

        {/* Selected day details */}
        {selectedDay && (
          <div className="mt-2 pt-2 border-t border-slate-700/30 space-y-1">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
              {new Date(year, mo, selectedDay).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
            {daySessions.length === 0 ? (
              <p className="text-slate-700 text-xs py-2 text-center">No scrims this day</p>
            ) : (
              daySessions.map(session => (
                <div
                  key={session._id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-700/30 cursor-pointer transition-colors"
                  onClick={() => navigate(`/scrim-hub/scrims/${session._id}`)}
                >
                  <div
                    className={`w-1 h-6 rounded-full shrink-0 ${
                      new Date(session.date) >= today ? "bg-blue-400" : session.win > (session.loss || 0) ? "bg-emerald-400" : session.loss > 0 ? "bg-red-400" : "bg-slate-600"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium truncate">{session.name}</p>
                    {session.opponent_name && <p className="text-slate-500 text-[10px]">vs {session.opponent_name}</p>}
                  </div>
                  {session.win != null && (
                    <span className="text-[10px] font-semibold tabular-nums text-slate-400">
                      {session.win}W-{session.loss || 0}L
                    </span>
                  )}
                  <ChevronRight className="w-3 h-3 text-slate-700 shrink-0" />
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          setCreateForm({ name: "", opponent: null })
        }}
        className="max-w-md w-full bg-slate-900"
      >
        <div className="p-5 space-y-4">
          <h2 className="text-white text-lg font-semibold">New Scrim Session</h2>
          <p className="text-slate-400 text-sm">
            {createDate && new Date(createDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
          <input
            type="text"
            placeholder="Session name"
            value={createForm.name}
            onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
            autoFocus
            className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-white placeholder-slate-500 text-sm focus:border-blue-500 focus:outline-none"
          />
          <OpponentDropdown value={createForm.opponent?.name || ""} onChange={v => setCreateForm(f => ({ ...f, opponent: v }))} label="Opponent Team *" />
          <button
            onClick={handleCreateSession}
            disabled={!createForm.name.trim() || !createForm.opponent?._id}
            className="w-full py-2 bg-blue-500 hover:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-40"
          >
            Create Session
          </button>
        </div>
      </Modal>
    </div>
  )
}

// Ready Up Modal
function ReadyUpModal({ isOpen, onClose, initialMode }) {
  const { user } = useStore()
  const navigate = useNavigate()
  const [mode, setMode] = useState(null)

  useEffect(() => {
    if (isOpen && initialMode) setMode(initialMode)
  }, [isOpen, initialMode])

  // === Import tab state ===
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef(null)
  const [roflConfig, setRoflConfig] = useState({
    team_side: "",
    opponent: null,
    name: "",
    draft_url: "",
    date: new Date().toISOString().slice(0, 10),
    folder_id: "",
    folder_name: "",
    official: true
  })
  const [roflPreview, setRoflPreview] = useState(null)
  const [parsing, setParsing] = useState(false)

  // === Session tab state ===
  const [sessionForm, setSessionForm] = useState({ name: "", opponent: null, date: new Date().toISOString().slice(0, 10) })
  const [creatingSession, setCreatingSession] = useState(false)

  // === Shared state ===
  const [folders, setFolders] = useState([])
  const [showFolderDropdown, setShowFolderDropdown] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")

  useEffect(() => {
    if (!isOpen || !user?.team_id) return
    const fetchFolders = async () => {
      try {
        const { ok, data, code } = await api.post("/folder/search", { team_id: user.team_id })
        if (!ok) return toast.error(code || "Failed to fetch folders")
        setFolders(data)
      } catch (error) {
        toast.error(error.code || "Failed to fetch folders")
      }
    }
    fetchFolders()
  }, [isOpen, user?.team_id])

  const handleClose = () => {
    if (uploading || parsing) return
    setMode(null)
    setFile(null)
    setUploadProgress(null)
    setRoflPreview(null)
    setRoflConfig({ team_side: "", opponent: null, name: "", draft_url: "", date: new Date().toISOString().slice(0, 10), folder_id: "", folder_name: "", official: true })
    setShowFolderDropdown(false)
    setNewFolderName("")
    setSessionForm({ name: "", opponent: null, date: new Date().toISOString().slice(0, 10) })
    onClose()
  }

  const createFolder = async name => {
    try {
      const { ok, data, code } = await api.post("/folder", { name })
      if (!ok) return toast.error(code || "Failed to create folder")
      setFolders(prev => [data, ...prev])
      setRoflConfig(prev => ({ ...prev, folder_id: data._id, folder_name: data.name }))
      setNewFolderName("")
      setShowFolderDropdown(false)
    } catch (error) {
      toast.error(error.code || "Failed to create folder")
    }
  }

  // === ROFL import handlers ===
  const handleFiles = async selectedFiles => {
    if (!selectedFiles || selectedFiles.length === 0) return
    const selectedFile = selectedFiles[0]
    if (!selectedFile.name.endsWith(".rofl")) return toast.error("File must be a .rofl")
    setFile(selectedFile)
    setParsing(true)
    try {
      const formData = new FormData()
      formData.append("replay", selectedFile)
      const { ok, data, code } = await api.postFormData("/parser/parse", formData)
      if (ok && data) {
        setRoflPreview(data)
        toast.success("ROFL file parsed successfully")
      } else {
        toast.error(code || "Error during parsing")
        setFile(null)
      }
    } catch (error) {
      toast.error(error.code || "Error during parsing")
      setFile(null)
    } finally {
      setParsing(false)
    }
  }

  const removeFile = () => {
    setFile(null)
    setRoflPreview(null)
    setRoflConfig(prev => ({ ...prev, team_side: "", opponent: null, name: "", draft_url: "", folder_id: "", folder_name: "", official: true }))
  }

  const handleDrag = e => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true)
    if (e.type === "dragleave") setDragActive(false)
  }

  const handleDrop = e => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files)
  }

  const handleUpload = async () => {
    if (!file) return
    if (!roflConfig.team_side) return toast.error("Select your side (Blue/Red)")
    if (!roflConfig.opponent?.name) return toast.error("Select an opponent team")
    setUploading(true)
    setUploadProgress("uploading")
    try {
      const formData = new FormData()
      formData.append("replay", file)
      formData.append("team_side", roflConfig.team_side)
      formData.append("team_id", user?.team_id || "")
      formData.append("team_name", user?.team_name || "")
      if (roflConfig.opponent?._id) formData.append("opponent_id", roflConfig.opponent._id)
      formData.append("opponent_name", roflConfig.opponent?.name || "")
      formData.append("name", roflConfig.name)
      if (roflConfig.date) formData.append("date", new Date(roflConfig.date).toISOString())
      if (roflConfig.draft_url) formData.append("draft_url", roflConfig.draft_url)
      if (roflConfig.folder_id) formData.append("folder_id", roflConfig.folder_id)
      if (roflConfig.folder_name) formData.append("folder_name", roflConfig.folder_name)
      formData.append("official", roflConfig.official ? "true" : "false")
      const { ok, code } = await api.postFormData("/parser/import", formData)
      if (ok) {
        setUploadProgress("success")
        toast.success(roflConfig.draft_url ? "Game & draft imported!" : "Game imported successfully!")
        setTimeout(() => handleClose(), 1000)
      } else {
        toast.error(code || "Error during import")
        setUploadProgress("error")
      }
    } catch (error) {
      toast.error(error.code || "Error during import")
      setUploadProgress("error")
    } finally {
      setUploading(false)
    }
  }

  // === Session creation handler ===
  const handleCreateSession = async () => {
    if (!sessionForm.name.trim()) return toast.error("Session name is required")
    if (!sessionForm.opponent?._id) return toast.error("Select an opponent")
    setCreatingSession(true)
    try {
      const body = { name: sessionForm.name.trim(), opponent_id: sessionForm.opponent._id, opponent_name: sessionForm.opponent.name }
      if (sessionForm.date) body.date = new Date(sessionForm.date).toISOString()
      const { ok, data, code } = await api.post("/scrim-session", body)
      if (!ok) return toast.error(code || "Failed to create session")
      handleClose()
      navigate(`/scrim-hub/scrims/${data._id}`)
    } catch (error) {
      toast.error(error.code || "Failed to create session")
    } finally {
      setCreatingSession(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-slate-800 border border-slate-700">
      <div className="p-6">
        {/* Back button when in a sub-mode */}
        {mode && (
          <button
            onClick={() => {
              setMode(null)
              removeFile?.()
            }}
            className="flex items-center gap-1 text-slate-400 hover:text-white text-sm mb-4 transition-colors"
          >
            <ChevronRight className="w-4 h-4 rotate-180" /> Back
          </button>
        )}

        <h2 className="text-xl font-bold text-white mb-1">Ready Up</h2>
        <p className="text-slate-400 text-sm mb-6">Import an official game replay or create a new scrim session.</p>

        {/* === MODE PICKER === */}
        {!mode && (
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setMode("session")}
              className="group relative overflow-hidden rounded-xl border border-slate-600 hover:border-blue-500/50 bg-slate-700/30 hover:bg-blue-500/5 p-6 text-left transition-all"
            >
              <div className="absolute top-0 right-0 w-28 h-28 bg-blue-500/5 rounded-full -translate-y-10 translate-x-10 group-hover:bg-blue-500/10 transition-colors" />
              <Calendar className="w-8 h-8 text-blue-400 mb-3" />
              <p className="text-white font-bold text-sm mb-1">Create Scrim Session</p>
              <p className="text-slate-500 text-xs leading-relaxed">Set up a new scrim session with opponent details.</p>
            </button>

            <button
              onClick={() => setMode("import")}
              className="group relative overflow-hidden rounded-xl border border-slate-600 hover:border-amber-500/50 bg-slate-700/30 hover:bg-amber-500/5 p-6 text-left transition-all"
            >
              <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/5 rounded-full -translate-y-10 translate-x-10 group-hover:bg-amber-500/10 transition-colors" />
              <Upload className="w-8 h-8 text-amber-400 mb-3" />
              <p className="text-white font-bold text-sm mb-1">Import Official Game</p>
              <p className="text-slate-500 text-xs leading-relaxed">Upload a .rofl replay file to automatically extract all stats.</p>
            </button>
          </div>
        )}

        {/* === IMPORT MODE === */}
        {mode === "import" && (
          <>
            {!file ? (
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                  dragActive ? "border-amber-500 bg-amber-500/10" : "border-slate-600 hover:border-amber-400 hover:bg-amber-500/5"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
              >
                <input ref={inputRef} type="file" accept=".rofl" onChange={e => handleFiles(e.target.files)} className="hidden" />
                <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-300 font-medium mb-1">Drop your .rofl file here</p>
                <p className="text-slate-500 text-sm">or click to browse</p>
                <p className="text-slate-500 text-xs mt-2">Documents/League of Legends/Replays/</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Draft URL */}
                <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
                  <label className="block text-sm font-semibold text-amber-400 mb-2">Draft URL</label>
                  <input
                    type="text"
                    value={roflConfig.draft_url}
                    onChange={e => setRoflConfig(prev => ({ ...prev, draft_url: e.target.value }))}
                    placeholder="https://drafter.lol/draft/... or https://draftlol.dawe.gg/..."
                    className="w-full px-3 py-2.5 rounded-lg border border-amber-500/30 bg-slate-800 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-all"
                  />
                  <p className="text-slate-400 text-xs mt-1.5">Paste a drafter.lol or dawe.gg link to import picks order & bans</p>
                </div>

                {/* ROFL parsed preview */}
                {roflPreview && (
                  <div className="p-4 bg-slate-900 rounded-xl text-white">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-slate-400 text-xs">PATCH</p>
                        <p className="font-mono">{roflPreview.game?.patch}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs">DURATION</p>
                        <p className="font-mono">
                          {Math.floor(roflPreview.game?.duration / 60)}:{String(roflPreview.game?.duration % 60).padStart(2, "0")}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs">GAME ID</p>
                        <p className="font-mono text-sm">{roflPreview.game?.game_id}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className={`p-3 rounded-lg ${roflPreview.game?.blue_team?.win ? "bg-blue-500/20 border border-blue-500/30" : "bg-slate-800"}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-blue-400 font-semibold text-sm">BLUE TEAM</span>
                          {roflPreview.game?.blue_team?.win && <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded">WIN</span>}
                        </div>
                        <div className="space-y-1">
                          {roflPreview.players
                            ?.filter(p => p.side === "blue")
                            .map((p, i) => (
                              <div key={i} className="flex items-center justify-between text-xs">
                                <span className="text-slate-300">{p.champion}</span>
                                <span className="text-slate-500">
                                  {p.kills}/{p.deaths}/{p.assists}
                                </span>
                              </div>
                            ))}
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-700 text-xs text-slate-400">
                          {roflPreview.game?.blue_team?.kills} kills · {Math.round(roflPreview.game?.blue_team?.gold / 1000)}k gold
                        </div>
                      </div>
                      <div className={`p-3 rounded-lg ${roflPreview.game?.red_team?.win ? "bg-red-500/20 border border-red-500/30" : "bg-slate-800"}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-red-400 font-semibold text-sm">RED TEAM</span>
                          {roflPreview.game?.red_team?.win && <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded">WIN</span>}
                        </div>
                        <div className="space-y-1">
                          {roflPreview.players
                            ?.filter(p => p.side === "red")
                            .map((p, i) => (
                              <div key={i} className="flex items-center justify-between text-xs">
                                <span className="text-slate-300">{p.champion}</span>
                                <span className="text-slate-500">
                                  {p.kills}/{p.deaths}/{p.assists}
                                </span>
                              </div>
                            ))}
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-700 text-xs text-slate-400">
                          {roflPreview.game?.red_team?.kills} kills · {Math.round(roflPreview.game?.red_team?.gold / 1000)}k gold
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Config form */}
                {roflPreview && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">Your team was *</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setRoflConfig(prev => ({ ...prev, team_side: "blue" }))}
                          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${roflConfig.team_side === "blue" ? "bg-blue-500 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}
                        >
                          Blue
                        </button>
                        <button
                          type="button"
                          onClick={() => setRoflConfig(prev => ({ ...prev, team_side: "red" }))}
                          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${roflConfig.team_side === "red" ? "bg-red-500 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}
                        >
                          Red
                        </button>
                      </div>
                    </div>

                    <OpponentDropdown value={roflConfig.opponent?.name || ""} onChange={v => setRoflConfig(prev => ({ ...prev, opponent: v }))} label="Opponent Team *" />

                    {/* Folder */}
                    <div className="relative">
                      <label className="block text-sm font-medium text-slate-400 mb-1">Folder</label>
                      <button
                        type="button"
                        onClick={() => setShowFolderDropdown(!showFolderDropdown)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-slate-600 hover:border-slate-500 bg-slate-700/50 transition-all text-left"
                      >
                        <div className="flex items-center gap-2">
                          <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
                          <span className={roflConfig.folder_name ? "text-white" : "text-slate-400"}>{roflConfig.folder_name || "Select folder..."}</span>
                        </div>
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      </button>
                      {showFolderDropdown && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setShowFolderDropdown(false)} />
                          <div className="absolute top-full left-0 mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-20 overflow-hidden">
                            <div className="p-2 border-b border-slate-700/50">
                              <form
                                onSubmit={e => {
                                  e.preventDefault()
                                  if (newFolderName.trim()) createFolder(newFolderName.trim())
                                }}
                                className="flex items-center gap-1.5"
                              >
                                <input
                                  type="text"
                                  placeholder="New folder..."
                                  value={newFolderName}
                                  onChange={e => setNewFolderName(e.target.value)}
                                  className="flex-1 bg-slate-700/50 border-0 outline-none ring-0 focus:ring-1 focus:ring-amber-500 rounded-md px-2.5 py-1.5 text-white placeholder-slate-500 text-xs"
                                  autoFocus
                                />
                                <button
                                  type="submit"
                                  disabled={!newFolderName.trim()}
                                  className="p-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-30 text-slate-900 rounded-md transition-colors"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </form>
                            </div>
                            <div className="max-h-48 overflow-y-auto p-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setRoflConfig(prev => ({ ...prev, folder_id: "", folder_name: "" }))
                                  setShowFolderDropdown(false)
                                }}
                                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${!roflConfig.folder_id ? "bg-amber-500/20 text-amber-400" : "text-slate-400 hover:bg-slate-700/50"}`}
                              >
                                No folder
                              </button>
                              {folders.map(folder => (
                                <button
                                  key={folder._id}
                                  type="button"
                                  onClick={() => {
                                    setRoflConfig(prev => ({ ...prev, folder_id: folder._id, folder_name: folder.name }))
                                    setShowFolderDropdown(false)
                                  }}
                                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${roflConfig.folder_id === folder._id ? "bg-amber-500/20 text-amber-400" : "text-slate-300 hover:bg-slate-700/50"}`}
                                >
                                  {folder.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">Game Name (optional)</label>
                      <input
                        type="text"
                        value={roflConfig.name}
                        onChange={e => setRoflConfig(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Ex: Scrim Week 5 - Game 1"
                        className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-700/50 text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">Date</label>
                      <input
                        type="date"
                        value={roflConfig.date}
                        onChange={e => setRoflConfig(prev => ({ ...prev, date: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-700/50 text-white focus:border-amber-500 focus:outline-none transition-all [color-scheme:dark]"
                      />
                    </div>

                    <div className="flex items-end pb-0.5">
                      <div className="flex items-center gap-2 opacity-60">
                        <div className="w-5 h-5 rounded border flex items-center justify-center shrink-0 bg-amber-500 border-amber-500">
                          <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                            <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                        <span className="text-sm text-slate-300 select-none">Official game</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Import footer */}
            <div className="flex justify-end mt-6">
              <button
                onClick={handleUpload}
                disabled={!file || uploading || parsing || !roflConfig.team_side || !roflConfig.opponent?.name}
                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold rounded-xl transition-all duration-200 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Importing...
                  </>
                ) : parsing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Analyzing...
                  </>
                ) : (
                  "Import Game"
                )}
              </button>
            </div>
          </>
        )}

        {/* === SESSION MODE === */}
        {mode === "session" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Session Name *</label>
              <input
                type="text"
                placeholder="e.g. Scrim vs Team B - Week 5"
                value={sessionForm.name}
                onChange={e => setSessionForm(f => ({ ...f, name: e.target.value }))}
                autoFocus
                className="w-full px-3 py-2.5 rounded-lg border border-slate-600 bg-slate-700/50 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none transition-all"
              />
            </div>

            <OpponentDropdown value={sessionForm.opponent?.name || ""} onChange={v => setSessionForm(f => ({ ...f, opponent: v }))} label="Opponent Team *" />

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Date</label>
              <input
                type="date"
                value={sessionForm.date}
                onChange={e => setSessionForm(f => ({ ...f, date: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-600 bg-slate-700/50 text-white focus:border-blue-500 focus:outline-none transition-all [color-scheme:dark]"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleCreateSession}
                disabled={creatingSession || !sessionForm.name.trim() || !sessionForm.opponent?._id}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold rounded-xl transition-all duration-200 disabled:cursor-not-allowed"
              >
                {creatingSession ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Creating...
                  </>
                ) : (
                  "Create Session"
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

// Team Notes
function TeamNotes() {
  const { team, setTeam } = useStore()
  const [notes, setNotes] = useState(team?.notes || "")

  useEffect(() => {
    setNotes(team?.notes || "")
  }, [team?.notes])

  const save = async () => {
    try {
      const { ok, data, code } = await api.put(`/team/${team._id}`, { ...team, notes })
      if (!ok) return toast.error(code || "Failed to save notes")
      setTeam(data)
    } catch (error) {
      toast.error(error.code || "Failed to save notes")
    }
  }

  return (
    <div className="rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800/60">
        <div className="flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Notes</h3>
        </div>
        <span className="text-[9px] text-slate-700">Auto-saved</span>
      </div>
      <div className="bg-slate-800/30 p-3">
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          onBlur={save}
          placeholder="Strats, reminders..."
          rows={10}
          className="w-full bg-slate-900/60 border rounded-lg p-3 text-sm text-slate-300 placeholder-slate-700 resize-none focus:outline-none transition-colors border-slate-700/30"
        />
      </div>
    </div>
  )
}
