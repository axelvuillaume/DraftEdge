import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import { useNavigate } from "react-router-dom"
import api from "@/services/api"
import useStore from "@/services/store"
import Modal from "@/components/modal"
import UploadModal from "@/components/UploadModal"
import OpponentDropdown from "@/components/OpponentDropdown"
import { RANK_ICON_TIERS, getChampionIcon, ROLES, ROLE_LABELS, SERVERS } from "@/utils"
import { Calendar, BarChart, Swords, Plus, ChevronLeft, ChevronRight, StickyNote, Flame, Crown, Target, Zap, Upload, Loader2, Trophy, UserPlus, Sparkles } from "lucide-react"

export default function Home() {
  const navigate = useNavigate()
  const { user } = useStore()
  const [readyUpOpen, setReadyUpOpen] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [players, setPlayers] = useState(null)

  const fetchPlayers = async () => {
    try {
      const { ok, data, code } = await api.post("/player/search", { team_id: user?.team_id })
      if (!ok) return toast.error(code || "Failed to fetch players")
      setPlayers(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch players")
    }
  }

  useEffect(() => {
    fetchPlayers()
  }, [user?.team_id])

  if (players === null)
    return (
      <div className="h-[calc(100vh-65px)] bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    )

  if (players.filter(p => p.active !== false).length === 0 && user?.role !== "user") return <RosterOnboarding onComplete={fetchPlayers} />

  return (
    <div className="h-[calc(100vh-65px)] bg-slate-900 p-4 overflow-hidden">
      <div className="space-y-3 h-full flex flex-col">
        {/* ── Header + Mini Stats ── */}
        <div className="flex items-start justify-between gap-4 shrink-0">
          <div>
            <p className="text-slate-500 text-xs mb-1">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 bg-clip-text text-transparent leading-tight tracking-tight">
              {user?.team_name || "DraftEdge"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <PatchCard />
            <MiniStats />
          </div>
        </div>

        {/* ── Quick Actions ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2 shrink-0">
          <button
            onClick={() => setReadyUpOpen(true)}
            className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 hover:border-blue-400/40 p-2.5 text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -translate-y-8 translate-x-8 group-hover:bg-blue-500/10 transition-colors" />
            <Swords className="w-5 h-5 text-blue-400 mb-2" />
            <p className="text-white font-bold text-sm">Start your Scrim</p>
            <p className="text-blue-400/60 text-[11px] mt-0.5">Create a scrim session</p>
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 hover:border-amber-400/40 p-2.5 text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -translate-y-8 translate-x-8 group-hover:bg-amber-500/10 transition-colors" />
            <Upload className="w-5 h-5 text-amber-400 mb-2" />
            <p className="text-white font-bold text-sm">Import your Offi</p>
            <p className="text-amber-400/60 text-[11px] mt-0.5">Upload a .rofl replay</p>
          </button>
          <button
            onClick={() => navigate("/performance/draft")}
            className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-rose-500/10 to-rose-600/5 border border-rose-500/20 hover:border-rose-400/40 p-2.5 text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full -translate-y-8 translate-x-8 group-hover:bg-rose-500/10 transition-colors" />
            <Target className="w-5 h-5 text-rose-400 mb-2" />
            <p className="text-white font-bold text-sm">Train your Draft</p>
            <p className="text-rose-400/60 text-[11px] mt-0.5">Practice picks & bans</p>
          </button>
          <button
            onClick={() => navigate("/stats-team/stats")}
            className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 hover:border-emerald-400/40 p-2.5 text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -translate-y-8 translate-x-8 group-hover:bg-emerald-500/10 transition-colors" />
            <BarChart className="w-5 h-5 text-emerald-400 mb-2" />
            <p className="text-white font-bold text-sm">Compare your stats to Faker</p>
            <p className="text-emerald-400/60 text-[11px] mt-0.5">Team performance</p>
          </button>
          <button
            onClick={() => navigate("/players")}
            className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 hover:border-purple-400/40 p-2.5 text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full -translate-y-8 translate-x-8 group-hover:bg-purple-500/10 transition-colors" />
            <Zap className="w-5 h-5 text-purple-400 mb-2" />
            <p className="text-white font-bold text-sm">Ranked Grind</p>
            <p className="text-purple-400/60 text-[11px] mt-0.5">Track SoloQ progress</p>
          </button>
        </div>

        {/* ── Main Grid: 3 columns ── */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 flex-1 min-h-0">
          {/* Left column: Recent Games + Scrim Calendar */}
          <div className="xl:col-span-5 flex flex-col gap-3 min-h-0">
            <div className="shrink-0">
              <RecentGames />
            </div>
            <div className="flex-1 min-h-0">
              <ScrimCalendar />
            </div>
          </div>

          {/* Center column: SoloQ Today + Objectives */}
          <div className="xl:col-span-4 flex flex-col gap-3 min-h-0">
            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3">
              <SoloQToday />
              <TopScrimChampions />
              <ObjectivesScore />
            </div>
          </div>

          {/* Right column: League + Notes */}
          <div className="xl:col-span-3 flex flex-col gap-3 min-h-0">
            <div className="shrink-0">
              <LeagueRanking />
            </div>
            <div className="flex-1 min-h-0">
              <TeamNotes />
            </div>
          </div>
        </div>
      </div>

      <ReadyUpModal isOpen={readyUpOpen} onClose={() => setReadyUpOpen(false)} />
      <UploadModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} official onSuccess={() => setShowImportModal(false)} />
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
        <button onClick={() => navigate("/players")} className="text-[10px] text-slate-500 hover:text-amber-400 transition-colors flex items-center gap-0.5">
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
            {players.slice(0, 3).map((player, i) => (
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
                      <span className="text-emerald-400">{player.wins || 0}W</span>
                      <span className="mx-0.5">-</span>
                      <span className="text-red-400">{player.losses || 0}L</span>
                      <span className="text-slate-600 ml-0.5">({player.games})</span>
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

// Top Scrim Champions
function TopScrimChampions() {
  const { user } = useStore()
  const [champions, setChampions] = useState([])

  const fetchData = async () => {
    try {
      const { ok, data, code } = await api.post("/playerstats/top-champions", { team_id: user.team_id, limit: 3 })
      if (!ok) return toast.error(code || "Failed to fetch champions")
      setChampions(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch champions")
    }
  }

  useEffect(() => {
    fetchData()
  }, [user?.team_id])

  if (champions.length === 0) return null

  return (
    <div className="rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800/60">
        <div className="flex items-center gap-2">
          <Swords className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Best Scrim Champions</h3>
        </div>
      </div>
      <div className="bg-slate-800/30 px-4 py-3 flex items-center justify-around">
        {champions.map((champ, i) => (
          <div key={champ.name} className="flex flex-col items-center gap-1.5">
            <div className={`rounded-full overflow-hidden border-2 ${i === 0 ? "w-12 h-12 border-amber-500/50" : "w-10 h-10 border-slate-700"}`}>
              <img src={getChampionIcon(champ.name)} alt={champ.name} className="w-full h-full object-cover" />
            </div>
            <span className="text-[11px] text-white font-medium">{champ.name}</span>
            <div className="flex items-center gap-1.5 text-[10px]">
              <span className="text-slate-400">{champ.games}G</span>
              <span className={champ.wr >= 50 ? "text-emerald-400" : "text-red-400"}>{champ.wr}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Objectives Score
function ObjectivesScore() {
  const { user } = useStore()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)

  const fetchData = async () => {
    try {
      const { ok, data, code } = await api.post("/scrim-objectif-result/stats", { team_id: user.team_id })
      if (!ok) return toast.error(code || "Failed to fetch score")
      setStats(data)
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
        <button onClick={() => navigate("/performance/team-objectives")} className="text-[10px] text-slate-500 hover:text-purple-400 transition-colors flex items-center gap-0.5">
          Details <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      <div className="bg-slate-800/30">
        {stats?.best && (
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/20">
            <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="text-[9px] text-emerald-400/60 uppercase tracking-wider shrink-0">Best</span>
            <span className="text-xs text-white font-semibold truncate flex-1">{stats.best.obj?.name}</span>
            <span className="text-sm font-bold text-emerald-400 tabular-nums shrink-0">{Number(stats.best.avg).toFixed(1)}/10</span>
          </div>
        )}
        {stats?.worst && (
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
            <span className="text-[9px] text-red-400/60 uppercase tracking-wider shrink-0">Worst</span>
            <span className="text-xs text-white font-semibold truncate flex-1">{stats.worst.obj?.name}</span>
            <span className="text-sm font-bold text-red-400 tabular-nums shrink-0">{Number(stats.worst.avg).toFixed(1)}/10</span>
          </div>
        )}
        {!stats?.best && !stats?.worst && (
          <div className="px-4 py-6 text-center">
            <p className="text-slate-600 text-sm">No objectives rated yet</p>
          </div>
        )}
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
        {teams.findIndex(t => t.name.replace(/\s/g, "").toLowerCase() === team.name.replace(/\s/g, "").toLowerCase()) >= 0 && (
          <div className="border-t border-slate-700/40 px-4 py-2.5 flex items-center justify-between bg-slate-800/40">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">{team.name}</span>
            <span className="text-xs font-bold text-amber-400">
              #{teams.findIndex(t => t.name.replace(/\s/g, "").toLowerCase() === team.name.replace(/\s/g, "").toLowerCase()) + 1}
              <span className="text-slate-500 font-normal ml-1">/ {teams.length}</span>
            </span>
          </div>
        )}
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
    <div className="rounded-xl overflow-hidden bg-slate-800/30">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Recent Games</h3>
        </div>

        {!games.length ? (
          <p className="text-slate-600 text-xs">No games yet</p>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              {games.map(game => (
                <div
                  key={game._id}
                  className={`w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold ${game.win ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}
                  title={game.opponent_name || ""}
                >
                  {game.win ? "W" : "L"}
                </div>
              ))}
            </div>
            <div className="text-xs">
              <span className="text-emerald-400 font-semibold">{games.filter(g => g.win).length}W</span>
              <span className="text-slate-600 mx-0.5">-</span>
              <span className="text-red-400 font-semibold">{games.filter(g => !g.win).length}L</span>
            </div>
          </>
        )}

        <button
          onClick={() => navigate("/stats-team/games")}
          className="ml-auto text-xs px-2.5 py-1 rounded-lg bg-slate-700/40 text-slate-400 hover:text-blue-400 hover:bg-slate-700/60 transition-all flex items-center gap-1 font-medium"
        >
          View all <ChevronRight className="w-3.5 h-3.5" />
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
        <div>
          <p className="text-[9px] text-slate-500 uppercase tracking-wider">Current Patch</p>
          <p className="text-lg font-extrabold text-amber-400 tabular-nums leading-tight">26.10</p>
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
      navigate(`/performance/scrims/${daySess[0]._id}`)
      return
    }
    if (daySess && daySess.length > 1) {
      setSelectedDay(selectedDay === day ? null : day)
      return
    }
    setCreateDate(`${year}-${String(mo + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`)
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
    <div className="rounded-xl overflow-hidden h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800/60 shrink-0">
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

      <div className="bg-slate-800/30 p-3 flex-1 min-h-0 flex flex-col">
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1 shrink-0">
          {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map(d => (
            <div key={d} className="text-[11px] text-slate-600 text-center font-medium py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 flex-1 min-h-0 auto-rows-fr">
          {Array.from({ length: (firstDay + 6) % 7 }).map((_, i) => (
            <div key={`empty-${i}`} />
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
                className={`flex flex-col items-center justify-center rounded-lg text-sm font-medium transition-all relative group/day
                  ${isSelected ? "bg-blue-500/20 ring-1 ring-blue-500/40" : "hover:bg-slate-700/30"}
                  ${isToday ? "text-amber-400 font-bold" : "text-slate-400"}
                `}
              >
                {!daySess && hoveredDay === day ? (
                  <Plus className="w-8 h-8 text-orange-500/50" />
                ) : (
                  <>
                    {day}
                    {daySess && (
                      <div className="absolute bottom-1 flex items-center gap-0.5">
                        {!isPast ? (
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        ) : (
                          <>
                            <span className="text-[11px] font-bold text-emerald-400">{daySess.reduce((sum, s) => sum + (s.win || 0), 0)}</span>
                            <span className="text-[11px] text-slate-600">-</span>
                            <span className="text-[11px] font-bold text-red-400">{daySess.reduce((sum, s) => sum + (s.loss || 0), 0)}</span>
                          </>
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
            <span className="text-[11px] text-slate-600">Upcoming</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-bold text-emerald-400">2</span>
            <span className="text-[11px] text-slate-600">-</span>
            <span className="text-[11px] font-bold text-red-400">1</span>
            <span className="text-[11px] text-slate-600">W - L</span>
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
                  onClick={() => navigate(`/performance/scrims/${session._id}`)}
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

function ReadyUpModal({ isOpen, onClose }) {
  const navigate = useNavigate()
  const [sessionForm, setSessionForm] = useState({ name: "", opponent: null, date: new Date().toISOString().slice(0, 10) })
  const [creatingSession, setCreatingSession] = useState(false)

  const handleClose = () => {
    if (creatingSession) return
    setSessionForm({ name: "", opponent: null, date: new Date().toISOString().slice(0, 10) })
    onClose()
  }

  const handleCreateSession = async () => {
    if (!sessionForm.name.trim()) return toast.error("Session name is required")
    if (!sessionForm.opponent?._id) return toast.error("Select an opponent")
    setCreatingSession(true)
    try {
      const { ok, data, code } = await api.post("/scrim-session", {
        name: sessionForm.name.trim(),
        opponent_id: sessionForm.opponent._id,
        opponent_name: sessionForm.opponent.name,
        ...(sessionForm.date && { date: new Date(sessionForm.date).toISOString() })
      })
      if (!ok) return toast.error(code || "Failed to create session")
      handleClose()
      navigate(`/performance/scrims/${data._id}`)
    } catch (error) {
      toast.error(error.code || "Failed to create session")
    } finally {
      setCreatingSession(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-md w-full bg-slate-800 border border-slate-700">
      <div className="p-6">
        <h2 className="text-xl font-bold text-white mb-1">Create Scrim Session</h2>
        <p className="text-slate-400 text-sm mb-6">Set up a new scrim session with opponent details.</p>

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
      </div>
    </Modal>
  )
}

// Roster Onboarding
function RosterOnboarding({ onComplete }) {
  const { user, team, setTeam } = useStore()
  const [roster, setRoster] = useState(ROLES.reduce((acc, r) => ({ ...acc, [r]: { player_name: "", game_name: "", tag_line: "" } }), {}))
  const [saving, setSaving] = useState(false)

  const handleRegionChange = async newRegion => {
    try {
      const { ok, code } = await api.put(`/team/${user?.team_id}/region`, { region: newRegion })
      if (!ok) return toast.error(code || "Failed to update region")
      setTeam({ ...team, region: newRegion })
      toast.success("Region updated")
    } catch (error) {
      toast.error(error.code || "Failed to update region")
    }
  }

  const handleCreate = async () => {
    const filled = ROLES.filter(r => roster[r].game_name.trim() && roster[r].tag_line.trim())
    if (filled.length === 0) return toast.error("Add at least one player")
    setSaving(true)
    let created = 0
    for (const role of filled) {
      try {
        const { ok, code } = await api.post("/player", {
          game_name: roster[role].game_name.trim(),
          tag_line: roster[role].tag_line.trim(),
          player_name: roster[role].player_name?.trim() || "",
          region: team?.region || "euw1",
          role
        })
        if (!ok) {
          toast.error(`${ROLE_LABELS[role]}: ${code || "Riot ID not found"}`)
          continue
        }
        created++
      } catch (error) {
        toast.error(`${ROLE_LABELS[role]}: ${error.code || "Failed to create"}`)
      }
    }
    setSaving(false)
    if (created === 0) return
    toast.success(`${created} player${created > 1 ? "s" : ""} added`)
    onComplete()
  }

  const filledCount = ROLES.filter(r => roster[r].game_name.trim() && roster[r].tag_line.trim()).length

  return (
    <div className="h-[calc(100vh-65px)] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6 overflow-auto relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 rounded-full bg-amber-500/5 blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 rounded-full bg-blue-500/5 blur-3xl" />
      </div>
      <div className="max-w-3xl w-full relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/5 border border-amber-500/30 mb-5 shadow-[0_0_30px_rgba(245,158,11,0.15)]">
            <UserPlus className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 bg-clip-text text-transparent mb-2 tracking-tight">
            Welcome to {user?.team_name || "DraftEdge"}
          </h1>
          <p className="text-slate-400 text-sm">
            Build your roster to start tracking scrims, drafts and soloQ
            <Sparkles className="inline w-3.5 h-3.5 ml-1.5 text-amber-400/70 -translate-y-0.5" />
          </p>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl shadow-2xl backdrop-blur-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between bg-slate-900/30">
            <div>
              <p className="text-white text-sm font-medium">Region</p>
              <p className="text-slate-500 text-xs">Where your team plays soloQ</p>
            </div>
            <select
              value={team?.region || "euw1"}
              onChange={e => handleRegionChange(e.target.value)}
              className="w-28 px-3 py-1.5 rounded-lg border border-slate-600 bg-slate-700/50 text-white focus:border-amber-500 focus:outline-none text-sm appearance-none cursor-pointer"
            >
              {SERVERS.map(s => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="divide-y divide-slate-700/30">
            {ROLES.map(role => (
              <div key={role} className="flex items-center gap-3 px-6 py-3 hover:bg-slate-900/20 transition-colors">
                <div className="flex items-center gap-2 w-24 shrink-0">
                  <img src={`/roles/${role}.png`} alt={role} className="w-6 h-6 opacity-70" />
                  <span className="text-amber-400 font-semibold text-xs uppercase tracking-wider">{ROLE_LABELS[role]}</span>
                </div>
                <input
                  type="text"
                  value={roster[role].player_name}
                  onChange={e => setRoster(prev => ({ ...prev, [role]: { ...prev[role], player_name: e.target.value } }))}
                  placeholder="Name"
                  className="w-32 px-3 py-2 rounded-lg border border-slate-600 bg-slate-700/50 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none text-sm"
                />
                <input
                  type="text"
                  value={roster[role].game_name}
                  onChange={e => setRoster(prev => ({ ...prev, [role]: { ...prev[role], game_name: e.target.value } }))}
                  placeholder="Summoner Name"
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-600 bg-slate-700/50 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none text-sm"
                />
                <span className="text-slate-500 text-sm">#</span>
                <input
                  type="text"
                  value={roster[role].tag_line}
                  onChange={e => setRoster(prev => ({ ...prev, [role]: { ...prev[role], tag_line: e.target.value } }))}
                  placeholder="TAG"
                  className="w-20 px-3 py-2 rounded-lg border border-slate-600 bg-slate-700/50 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none text-sm"
                />
              </div>
            ))}
          </div>

          <div className="px-6 py-4 bg-slate-900/40 border-t border-slate-700/50 flex items-center justify-between">
            <p className="text-slate-500 text-xs">
              <span className="text-amber-400 font-semibold">{filledCount}</span>/5 players ready
            </p>
            <button
              onClick={handleCreate}
              disabled={saving || filledCount === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 text-slate-900 font-semibold text-sm shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 hover:from-amber-400 hover:to-amber-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {saving ? "Creating..." : "Create roster"}
            </button>
          </div>
        </div>
      </div>
    </div>
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
    <div className="rounded-xl overflow-hidden h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800/60 shrink-0">
        <div className="flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Notes</h3>
        </div>
        <span className="text-[9px] text-slate-700">Auto-saved</span>
      </div>
      <div className="bg-slate-800/30 p-3 flex-1 min-h-0 flex">
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          onBlur={save}
          placeholder="Strats, reminders..."
          className="w-full h-full bg-slate-900/60 border rounded-lg p-3 text-sm text-slate-300 placeholder-slate-700 resize-none focus:outline-none transition-colors border-slate-700/30"
        />
      </div>
    </div>
  )
}
