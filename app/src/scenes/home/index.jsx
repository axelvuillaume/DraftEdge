import { useState, useEffect, useRef } from "react"
import { toast } from "react-hot-toast"
import { useNavigate } from "react-router-dom"
import api from "@/services/api"
import useStore from "@/services/store"
import Modal from "@/components/modal"
import { RANKED_TIERS, DIVS, TIER_SHORT, RANK_ICON_TIERS } from "@/utils"
import {
  Trophy,
  Gamepad2,
  Calendar,
  BarChart,
  Swords,
  Plus,
  X,
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
  FolderOpen
} from "lucide-react"

function toLP(tier, rank, lp = 0) {
  const i = RANKED_TIERS.indexOf(tier)
  return i === -1 ? 0 : i >= 7 ? 2800 + lp : i * 400 + (DIVS[rank] || 0) * 100 + lp
}

export default function Home() {
  const navigate = useNavigate()
  const { user } = useStore()
  const [recentGames, setRecentGames] = useState([])
  const [gameStats, setGameStats] = useState(null)
  const [soloqData, setSoloqData] = useState([])
  const [objectivesAvg, setObjectivesAvg] = useState(null)
  const [loading, setLoading] = useState(true)
  const [readyUpOpen, setReadyUpOpen] = useState(false)

  useEffect(() => {
    if (!user?.team_id) return
    setLoading(true)
    Promise.all([
      api.post("/player/search", { team_id: user.team_id }).then(r => (r.ok ? r.data : [])),
      api.post("/game/search", { limit: 5, team_id: user.team_id }).then(r => (r.ok ? r.data : [])),
      api.post("/game/header-stats", {}).then(r => (r.ok ? r.data : null)),
      api.post("/scrim-objectif/search", { team_id: user.team_id }).then(r => (r.ok ? r.data : [])),
      api.post("/scrim-objectif-result/search", { team_id: user.team_id }).then(r => (r.ok ? r.data : []))
    ])
      .then(async ([playersData, games, stats, objectives, objResults]) => {
        setRecentGames(games)
        setGameStats(stats)

        // Calculate objectives average /10
        if (objectives.length > 0 && objResults.length > 0) {
          const objMap = Object.fromEntries(objectives.map(o => [o._id, o]))
          let totalScore = 0
          let count = 0
          for (const r of objResults) {
            const obj = objMap[r.objectif_id]
            if (!obj) continue
            if (obj.rating_type === "toggle") {
              totalScore += r.result ? 10 : 0
            } else {
              totalScore += r.result || 0
            }
            count++
          }
          setObjectivesAvg(count > 0 ? totalScore / count : null)
        }

        const connected = playersData.filter(p => p.puuid && p.active !== false)
        if (connected.length > 0) {
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const fromDate = today.toISOString()
          try {
            const [snapshotResults, matchResults] = await Promise.all([
              Promise.all(connected.map(p => api.post("/soloq-snapshot/search", { player_id: p._id, limit: 0, from_date: fromDate }))),
              Promise.all(connected.map(p => api.post("/soloq-match/search", { player_id: p._id, limit: 0, from_date: fromDate })))
            ])
            const snapshots = snapshotResults.flatMap(r => (r.ok ? r.data : []))
            const matches = matchResults.flatMap(r => (r.ok ? r.data : []))

            const soloq = connected.map(p => {
              const playerSnaps = snapshots.filter(s => s.player_id === p._id).sort((a, b) => new Date(a.fetched_at || a.createdAt) - new Date(b.fetched_at || b.createdAt))
              const lpChange =
                playerSnaps.length >= 2
                  ? toLP(playerSnaps.at(-1).tier, playerSnaps.at(-1).rank, playerSnaps.at(-1).league_points) -
                    toLP(playerSnaps[0].tier, playerSnaps[0].rank, playerSnaps[0].league_points)
                  : 0
              const playerMatches = matches.filter(m => m.player_id === p._id)
              const wins = playerMatches.filter(m => m.win).length
              return { ...p, lpChange, gamesPlayed: playerMatches.length, wins, losses: playerMatches.length - wins }
            })
            setSoloqData(soloq)
          } catch {
            setSoloqData(connected.map(p => ({ ...p, lpChange: 0, gamesPlayed: 0, wins: 0, losses: 0 })))
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user?.team_id])

  const bestLPPlayer = soloqData.length > 0 ? [...soloqData].sort((a, b) => b.lpChange - a.lpChange)[0] : null

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-65px)] bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-65px)] bg-slate-900 p-5 lg:p-6 overflow-y-auto">
      <div className="max-w-[1400px] mx-auto space-y-5">
        {/* ── Header + Mini Stats ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-slate-500 text-xs mb-1">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 bg-clip-text text-transparent leading-tight tracking-tight">
              {user?.team_name || "DraftEdge"}
            </h1>
          </div>
          {gameStats && <MiniStats stats={gameStats} lastGame={recentGames[0]} />}
        </div>

        {/* ── Quick Actions ── */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setReadyUpOpen(true)}
            className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 hover:border-blue-400/40 p-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -translate-y-8 translate-x-8 group-hover:bg-blue-500/10 transition-colors" />
            <Target className="w-5 h-5 text-blue-400 mb-2" />
            <p className="text-white font-bold text-sm">Ready up</p>
            <p className="text-blue-400/60 text-[11px] mt-0.5">Start a scrim / Import an official game</p>
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
        <div className="grid grid-cols-12 gap-4">
          {/* Left column: SoloQ Today + Objectives */}
          <div className="col-span-4 space-y-4">
            <SoloQToday bestPlayer={bestLPPlayer} onNavigate={navigate} />
            <ObjectivesScore avg={objectivesAvg} onNavigate={navigate} />
          </div>

          {/* Center column: Recent Games */}
          <div className="col-span-5">
            <RecentGames games={recentGames} onNavigate={navigate} />
          </div>

          {/* Right column: Upcoming Scrims + Notes */}
          <div className="col-span-3 space-y-4">
            <ScrimPlanner />
            <TeamNotes teamId={user?.team_id} />
          </div>
        </div>
      </div>

      <ReadyUpModal isOpen={readyUpOpen} onClose={() => setReadyUpOpen(false)} />
    </div>
  )
}

// ─── Mini Stats (top right) ─────────────────────────────────
function MiniStats({ stats, lastGame }) {
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
        <p className="text-sm font-bold text-white">{stats?.avg_enemy_rank?.tier ? TIER_SHORT[stats.avg_enemy_rank.tier] || stats.avg_enemy_rank.tier : "N/A"}</p>
      </div>
      <div className="w-px h-6 bg-slate-700/40" />
      <div className="text-center">
        <p className="text-[9px] text-slate-500 uppercase tracking-wider">Last Game</p>
        <p className="text-sm font-bold text-white">
          {lastGame ? new Date(lastGame.date || lastGame.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "N/A"}
        </p>
      </div>
    </div>
  )
}

// ─── SoloQ Today (MVP only) ─────────────────────────────────
function SoloQToday({ bestPlayer, onNavigate }) {
  return (
    <div className="rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800/60">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider">SoloQ Today</h3>
        </div>
      </div>

      <div className="bg-slate-800/30">
        {bestPlayer && bestPlayer.lpChange > 0 ? (
          <div className="px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
                <Crown className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] text-amber-400/60 font-semibold uppercase tracking-widest">Best Grinder</p>
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold text-sm">{bestPlayer.game_name}</span>
                  <span className="text-emerald-400 text-xs font-bold">+{bestPlayer.lpChange} LP</span>
                </div>
                <span className="text-slate-600 text-[10px]">
                  {bestPlayer.wins}W {bestPlayer.losses}L
                </span>
              </div>
              {RANK_ICON_TIERS.has(bestPlayer.current_tier) && (
                <img src={`/rank/${bestPlayer.current_tier.toLowerCase()}.png`} alt="" className="w-10 h-10 object-contain shrink-0 opacity-80" />
              )}
            </div>
            <button
              onClick={() => onNavigate("/soloq")}
              className="mt-3 w-full py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 hover:border-amber-400/40 text-amber-400 text-xs font-semibold transition-all hover:bg-amber-500/15 flex items-center justify-center gap-1"
            >
              View all players <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="px-4 py-6 text-center">
            <p className="text-slate-600 text-sm">No SoloQ grind today yet</p>
            <button
              onClick={() => onNavigate("/soloq")}
              className="mt-3 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 hover:border-amber-400/40 text-amber-400 text-xs font-semibold transition-all hover:bg-amber-500/15 inline-flex items-center gap-1"
            >
              View SoloQ <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Objectives Score ────────────────────────────────────────
function ObjectivesScore({ avg, onNavigate }) {
  const score = avg !== null ? avg.toFixed(1) : null
  const pct = avg !== null ? (avg / 10) * 100 : 0
  const color = avg === null ? "text-slate-600" : avg >= 7 ? "text-emerald-400" : avg >= 5 ? "text-amber-400" : "text-red-400"
  const barColor = avg === null ? "bg-slate-700" : avg >= 7 ? "bg-emerald-500" : avg >= 5 ? "bg-amber-500" : "bg-red-500"

  return (
    <div className="rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800/60">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-purple-400" />
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Objectives Scrims</h3>
        </div>
        <button onClick={() => onNavigate("/scrim-hub/objectives")} className="text-[10px] text-slate-500 hover:text-purple-400 transition-colors flex items-center gap-0.5">
          Details <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      <div className="bg-slate-800/30 px-4 py-5">
        <div className="flex items-center justify-center gap-4">
          <div className="text-center">
            <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Avg Score</p>
            <div className="flex items-baseline justify-center gap-0.5">
              <span className={`text-3xl font-extrabold tabular-nums ${color}`}>{score ?? "—"}</span>
              <span className="text-slate-600 text-sm font-medium">/10</span>
            </div>
          </div>
        </div>
        <div className="mt-3 h-2 bg-slate-700/50 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
        {avg === null && <p className="text-slate-700 text-[10px] text-center mt-2">No objectives rated yet</p>}
      </div>
    </div>
  )
}

// ─── Recent Games ───────────────────────────────────────────
function RecentGames({ games, onNavigate }) {
  return (
    <div className="rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800/60">
        <div className="flex items-center gap-2">
          <Swords className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Recent Games</h3>
        </div>
        <button onClick={() => onNavigate("/performance/games")} className="text-[10px] text-slate-500 hover:text-blue-400 transition-colors flex items-center gap-0.5">
          View all <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      <div className="bg-slate-800/30">
        {!games.length ? (
          <p className="text-slate-600 text-sm text-center py-10">No games imported yet</p>
        ) : (
          <div className="divide-y divide-slate-700/20">
            {games.map(game => (
              <div key={game._id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-700/20 transition-colors cursor-pointer group">
                <div className={`w-1.5 h-10 rounded-full shrink-0 ${game.win ? "bg-emerald-500" : "bg-red-500"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase ${game.win ? "text-emerald-400" : "text-red-400"}`}>{game.win ? "Victory" : "Defeat"}</span>
                    <span className="text-white text-sm font-medium truncate">{game.name || (game.opponent_name ? `vs ${game.opponent_name}` : "Scrim")}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {game.team_side && (
                      <span className={`text-[9px] font-semibold uppercase ${game.team_side === "blue" ? "text-blue-400/70" : "text-red-400/70"}`}>{game.team_side}</span>
                    )}
                    {game.duration && (
                      <span className="text-slate-600 text-[10px] tabular-nums">
                        {Math.floor(game.duration / 60)}:{String(game.duration % 60).padStart(2, "0")}
                      </span>
                    )}
                    {game.patch && <span className="text-slate-700 text-[10px]">{game.patch}</span>}
                  </div>
                </div>
                <span className="text-slate-600 text-[10px] shrink-0">{new Date(game.date || game.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Scrim Planner ──────────────────────────────────────────
function ScrimPlanner() {
  const { user } = useStore()
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [enemyTeams, setEnemyTeams] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: "", opponent: "", date: "" })
  const [showOpponentDropdown, setShowOpponentDropdown] = useState(false)
  const [newTeamName, setNewTeamName] = useState("")
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!user?.team_id) return
    api.post("/scrim-session/search", { team_id: user.team_id }).then(r => {
      if (r.ok) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const upcoming = r.data.filter(s => new Date(s.date) >= today).sort((a, b) => new Date(a.date) - new Date(b.date))
        setSessions(upcoming)
      }
    })
    api.post("/enemy-team/search", { team_id: user.team_id }).then(r => {
      if (r.ok) setEnemyTeams(r.data)
    })
  }, [user?.team_id])

  const createSession = async () => {
    if (!form.name.trim()) return toast.error("Session name is required")
    if (!form.opponent) return toast.error("Opponent is required")
    setCreating(true)
    try {
      const body = { name: form.name.trim(), opponent: form.opponent }
      if (form.date) body.date = new Date(form.date).toISOString()
      const { ok, data, code } = await api.post("/scrim-session", body)
      if (!ok) return toast.error(code)
      setSessions(prev => [...prev, data].sort((a, b) => new Date(a.date) - new Date(b.date)))
      setForm({ name: "", opponent: "", date: "" })
      setShowForm(false)
      toast.success("Scrim session created")
    } catch (error) {
      toast.error(error.message)
    } finally {
      setCreating(false)
    }
  }

  const createEnemyTeam = async name => {
    try {
      const { ok, data, code } = await api.post("/enemy-team", { name })
      if (!ok) return toast.error(code)
      setEnemyTeams(prev => [data, ...prev])
      setForm(f => ({ ...f, opponent: data.name }))
      setNewTeamName("")
      setShowOpponentDropdown(false)
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <div className="rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800/60">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Upcoming Scrims</h3>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="p-1 rounded-md bg-slate-700/50 hover:bg-blue-500/20 text-slate-400 hover:text-blue-400 transition-all">
          {showForm ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
        </button>
      </div>

      <div className="bg-slate-800/30">
        {showForm && (
          <div className="p-3 border-b border-slate-700/30 space-y-2">
            <input
              type="text"
              placeholder="Session name"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-white placeholder-slate-500 text-sm focus:border-blue-500 focus:outline-none"
            />
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowOpponentDropdown(!showOpponentDropdown)}
                className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 transition-all text-left"
              >
                <span className={`text-sm ${form.opponent ? "text-white" : "text-slate-500"}`}>{form.opponent || "Opponent..."}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>
              {showOpponentDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowOpponentDropdown(false)} />
                  <div className="absolute top-full left-0 mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-20 overflow-hidden">
                    <div className="p-2 border-b border-slate-700/50">
                      <form
                        onSubmit={e => {
                          e.preventDefault()
                          if (newTeamName.trim()) createEnemyTeam(newTeamName.trim())
                        }}
                        className="flex items-center gap-1.5"
                      >
                        <input
                          type="text"
                          placeholder="New team..."
                          value={newTeamName}
                          onChange={e => setNewTeamName(e.target.value)}
                          className="flex-1 bg-slate-700/50 border-0 outline-none ring-0 focus:ring-1 focus:ring-blue-500 rounded-md px-2.5 py-1.5 text-white placeholder-slate-500 text-xs"
                          autoFocus
                        />
                        <button
                          type="submit"
                          disabled={!newTeamName.trim()}
                          className="p-1.5 bg-blue-500 hover:bg-blue-400 disabled:opacity-30 text-white rounded-md transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </form>
                    </div>
                    <div className="max-h-32 overflow-y-auto p-1">
                      <button
                        type="button"
                        onClick={() => {
                          setForm(f => ({ ...f, opponent: "" }))
                          setShowOpponentDropdown(false)
                        }}
                        className={`w-full text-left px-3 py-1.5 rounded-md text-xs ${!form.opponent ? "bg-blue-500/20 text-blue-400" : "text-slate-400 hover:bg-slate-700/50"}`}
                      >
                        No opponent
                      </button>
                      {enemyTeams.map(team => (
                        <button
                          key={team._id}
                          type="button"
                          onClick={() => {
                            setForm(f => ({ ...f, opponent: team.name }))
                            setShowOpponentDropdown(false)
                          }}
                          className={`w-full text-left px-3 py-1.5 rounded-md text-xs ${form.opponent === team.name ? "bg-blue-500/20 text-blue-400" : "text-slate-300 hover:bg-slate-700/50"}`}
                        >
                          {team.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-white text-sm focus:border-blue-500 focus:outline-none [color-scheme:dark]"
            />
            <button
              onClick={createSession}
              disabled={creating || !form.name.trim() || !form.opponent}
              className="w-full py-1.5 bg-blue-500 hover:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-40"
            >
              {creating ? "Creating..." : "Create Session"}
            </button>
          </div>
        )}

        {sessions.length === 0 ? (
          <p className="text-slate-700 text-sm text-center py-8">No upcoming scrims</p>
        ) : (
          <div className="divide-y divide-slate-700/20">
            {sessions.map(session => {
              const sessionDate = new Date(session.date)
              const today = new Date()
              today.setHours(0, 0, 0, 0)
              const diffDays = Math.round((sessionDate - today) / (1000 * 60 * 60 * 24))
              const dayLabel = diffDays === 0 ? "Today" : diffDays === 1 ? "Tmrw" : `${diffDays}d`

              return (
                <div
                  key={session._id}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-700/20 transition-colors cursor-pointer"
                  onClick={() => navigate(`/scrim-hub/scrims/${session._id}`)}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${diffDays === 0 ? "bg-amber-500/15 text-amber-400" : "bg-slate-800 text-slate-500"}`}
                  >
                    {dayLabel}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{session.name}</p>
                    <p className="text-slate-600 text-[10px]">
                      {session.opponent && <span className="text-slate-400">vs {session.opponent} · </span>}
                      {sessionDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Ready Up Modal ─────────────────────────────────────────
function ReadyUpModal({ isOpen, onClose }) {
  const { user } = useStore()
  const navigate = useNavigate()
  const [mode, setMode] = useState(null) // null = picker, "import" = rofl import, "session" = create session

  // === Import tab state ===
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef(null)
  const [roflConfig, setRoflConfig] = useState({
    team_side: "",
    opponent_name: "",
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
  const [sessionForm, setSessionForm] = useState({ name: "", opponent: "", date: new Date().toISOString().slice(0, 10) })
  const [creatingSession, setCreatingSession] = useState(false)

  // === Shared state ===
  const [enemyTeams, setEnemyTeams] = useState([])
  const [showOpponentDropdown, setShowOpponentDropdown] = useState(false)
  const [newTeamName, setNewTeamName] = useState("")
  const [folders, setFolders] = useState([])
  const [showFolderDropdown, setShowFolderDropdown] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")

  useEffect(() => {
    if (isOpen && user?.team_id) {
      api.post("/enemy-team/search", { team_id: user.team_id }).then(r => {
        if (r.ok) setEnemyTeams(r.data)
      })
      api.post("/folder/search", { team_id: user.team_id }).then(r => {
        if (r.ok) setFolders(r.data)
      })
    }
  }, [isOpen, user?.team_id])

  const handleClose = () => {
    if (uploading || parsing) return
    setMode(null)
    setFile(null)
    setUploadProgress(null)
    setRoflPreview(null)
    setRoflConfig({ team_side: "", opponent_name: "", name: "", draft_url: "", date: new Date().toISOString().slice(0, 10), folder_id: "", folder_name: "", official: true })
    setShowOpponentDropdown(false)
    setNewTeamName("")
    setShowFolderDropdown(false)
    setNewFolderName("")
    setSessionForm({ name: "", opponent: "", date: new Date().toISOString().slice(0, 10) })
    onClose()
  }

  const createEnemyTeam = async name => {
    try {
      const { ok, data, code } = await api.post("/enemy-team", { name })
      if (!ok) return toast.error(code)
      setEnemyTeams(prev => [data, ...prev])
      if (mode === "import") setRoflConfig(prev => ({ ...prev, opponent_name: data.name }))
      else setSessionForm(f => ({ ...f, opponent: data.name }))
      setNewTeamName("")
      setShowOpponentDropdown(false)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const createFolder = async name => {
    try {
      const { ok, data, code } = await api.post("/folder", { name })
      if (!ok) return toast.error(code)
      setFolders(prev => [data, ...prev])
      setRoflConfig(prev => ({ ...prev, folder_id: data._id, folder_name: data.name }))
      setNewFolderName("")
      setShowFolderDropdown(false)
    } catch (error) {
      toast.error(error.message)
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
      const response = await api.postFormData("/parser/parse", formData)
      if (response.ok && response.data) {
        setRoflPreview(response.data)
        toast.success("ROFL file parsed successfully")
      } else {
        toast.error(response.error || response.details || "Error during parsing")
        setFile(null)
      }
    } catch (error) {
      toast.error("Error: " + error.message)
      setFile(null)
    } finally {
      setParsing(false)
    }
  }

  const removeFile = () => {
    setFile(null)
    setRoflPreview(null)
    setRoflConfig(prev => ({ ...prev, team_side: "", opponent_name: "", name: "", draft_url: "", folder_id: "", folder_name: "", official: true }))
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
    if (!roflConfig.opponent_name) return toast.error("Select an opponent team")
    setUploading(true)
    setUploadProgress("uploading")
    try {
      const formData = new FormData()
      formData.append("replay", file)
      formData.append("team_side", roflConfig.team_side)
      formData.append("team_id", user?.team_id || "")
      formData.append("team_name", user?.team_name || "")
      formData.append("opponent_name", roflConfig.opponent_name)
      formData.append("name", roflConfig.name)
      if (roflConfig.date) formData.append("date", new Date(roflConfig.date).toISOString())
      if (roflConfig.draft_url) formData.append("draft_url", roflConfig.draft_url)
      if (roflConfig.folder_id) formData.append("folder_id", roflConfig.folder_id)
      if (roflConfig.folder_name) formData.append("folder_name", roflConfig.folder_name)
      formData.append("official", roflConfig.official ? "true" : "false")
      const response = await api.postFormData("/parser/import", formData)
      if (response.ok) {
        setUploadProgress("success")
        toast.success(roflConfig.draft_url ? "Game & draft imported!" : "Game imported successfully!")
        setTimeout(() => handleClose(), 1000)
      } else {
        toast.error(response.error || response.details || "Error during import")
        setUploadProgress("error")
      }
    } catch (error) {
      toast.error("Error: " + error.message)
      setUploadProgress("error")
    } finally {
      setUploading(false)
    }
  }

  // === Session creation handler ===
  const handleCreateSession = async () => {
    if (!sessionForm.name.trim()) return toast.error("Session name is required")
    if (!sessionForm.opponent) return toast.error("Select an opponent")
    setCreatingSession(true)
    try {
      const body = { name: sessionForm.name.trim(), opponent: sessionForm.opponent }
      if (sessionForm.date) body.date = new Date(sessionForm.date).toISOString()
      const { ok, data, code } = await api.post("/scrim-session", body)
      if (!ok) return toast.error(code)
      handleClose()
      navigate(`/scrim-hub/scrims/${data._id}`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setCreatingSession(false)
    }
  }

  const OpponentDropdown = ({ value, onChange }) => (
    <div className="relative">
      <label className="block text-sm font-medium text-slate-400 mb-1">Opponent Team *</label>
      <button
        type="button"
        onClick={() => setShowOpponentDropdown(!showOpponentDropdown)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-slate-600 hover:border-slate-500 bg-slate-700/50 transition-all text-left"
      >
        <span className={value ? "text-white" : "text-slate-400"}>{value || "Select opponent..."}</span>
        <ChevronDown className="w-4 h-4 text-slate-400" />
      </button>
      {showOpponentDropdown && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowOpponentDropdown(false)} />
          <div className="absolute top-full left-0 mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-20 overflow-hidden">
            <div className="p-2 border-b border-slate-700/50">
              <form
                onSubmit={e => {
                  e.preventDefault()
                  if (newTeamName.trim()) createEnemyTeam(newTeamName.trim())
                }}
                className="flex items-center gap-1.5"
              >
                <input
                  type="text"
                  placeholder="New team..."
                  value={newTeamName}
                  onChange={e => setNewTeamName(e.target.value)}
                  className="flex-1 bg-slate-700/50 border-0 outline-none ring-0 focus:ring-1 focus:ring-amber-500 rounded-md px-2.5 py-1.5 text-white placeholder-slate-500 text-xs"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!newTeamName.trim()}
                  className="p-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-30 text-slate-900 rounded-md transition-colors"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </form>
            </div>
            <div className="max-h-48 overflow-y-auto p-1">
              {enemyTeams.map(team => (
                <button
                  key={team._id}
                  type="button"
                  onClick={() => {
                    onChange(team.name)
                    setShowOpponentDropdown(false)
                  }}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${value === team.name ? "bg-amber-500/20 text-amber-400" : "text-slate-300 hover:bg-slate-700/50"}`}
                >
                  {team.name}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )

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
              onClick={() => setMode("import")}
              className="group relative overflow-hidden rounded-xl border border-slate-600 hover:border-amber-500/50 bg-slate-700/30 hover:bg-amber-500/5 p-6 text-left transition-all"
            >
              <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/5 rounded-full -translate-y-10 translate-x-10 group-hover:bg-amber-500/10 transition-colors" />
              <Upload className="w-8 h-8 text-amber-400 mb-3" />
              <p className="text-white font-bold text-sm mb-1">Import Official Game</p>
              <p className="text-slate-500 text-xs leading-relaxed">Upload a .rofl replay file to automatically extract all stats.</p>
            </button>

            <button
              onClick={() => setMode("session")}
              className="group relative overflow-hidden rounded-xl border border-slate-600 hover:border-blue-500/50 bg-slate-700/30 hover:bg-blue-500/5 p-6 text-left transition-all"
            >
              <div className="absolute top-0 right-0 w-28 h-28 bg-blue-500/5 rounded-full -translate-y-10 translate-x-10 group-hover:bg-blue-500/10 transition-colors" />
              <Calendar className="w-8 h-8 text-blue-400 mb-3" />
              <p className="text-white font-bold text-sm mb-1">Create Scrim Session</p>
              <p className="text-slate-500 text-xs leading-relaxed">Set up a new scrim session with opponent details.</p>
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

                    <OpponentDropdown value={roflConfig.opponent_name} onChange={v => setRoflConfig(prev => ({ ...prev, opponent_name: v }))} />

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
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setRoflConfig(prev => ({ ...prev, official: !prev.official }))}
                          className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-all ${roflConfig.official ? "bg-amber-500 border-amber-500" : "border-slate-600 bg-slate-700/50 hover:border-slate-500"}`}
                        >
                          {roflConfig.official && (
                            <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                              <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </button>
                        <label className="text-sm text-slate-300 cursor-pointer select-none" onClick={() => setRoflConfig(prev => ({ ...prev, official: !prev.official }))}>
                          Official game
                        </label>
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
                disabled={!file || uploading || parsing || !roflConfig.team_side || !roflConfig.opponent_name}
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

            <OpponentDropdown value={sessionForm.opponent} onChange={v => setSessionForm(f => ({ ...f, opponent: v }))} />

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
                disabled={creatingSession || !sessionForm.name.trim() || !sessionForm.opponent}
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

// ─── Team Notes ─────────────────────────────────────────────
function TeamNotes({ teamId }) {
  const STORAGE_KEY = `draftedge_notes_${teamId || "default"}`
  const [notes, setNotes] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || ""
    } catch {
      return ""
    }
  })
  const [isEditing, setIsEditing] = useState(false)
  const textareaRef = useRef(null)
  const saveTimeout = useRef(null)

  const handleChange = value => {
    setNotes(value)
    clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => localStorage.setItem(STORAGE_KEY, value), 500)
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
          ref={textareaRef}
          value={notes}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => setIsEditing(true)}
          onBlur={() => setIsEditing(false)}
          placeholder="Strats, reminders..."
          rows={4}
          className={`w-full bg-slate-900/60 border rounded-lg p-3 text-sm text-slate-300 placeholder-slate-700 resize-none focus:outline-none transition-colors ${isEditing ? "border-amber-500/30" : "border-slate-700/30"}`}
        />
      </div>
    </div>
  )
}
