import { useState, useEffect, useRef } from "react"
import { toast } from "react-hot-toast"
import { useNavigate } from "react-router-dom"
import api from "@/services/api"
import useStore from "@/services/store"
import { RANKED_TIERS, DIVS, TIER_SHORT, RANK_ICON_TIERS } from "@/utils"
import { Trophy, Gamepad2, Calendar, BarChart, Swords, Plus, X, ChevronRight, ChevronDown, StickyNote, Flame, Crown, Target, Zap } from "lucide-react"

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
            onClick={() => document.querySelector("[data-scrim-btn]")?.click()}
            className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 hover:border-blue-400/40 p-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -translate-y-8 translate-x-8 group-hover:bg-blue-500/10 transition-colors" />
            <Target className="w-5 h-5 text-blue-400 mb-2" />
            <p className="text-white font-bold text-sm">Ready Up</p>
            <p className="text-blue-400/60 text-[11px] mt-0.5">Launch a scrim session</p>
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
