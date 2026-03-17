import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { Loader2, TrendingUp, TrendingDown, Trophy, Zap, Gamepad2, Archive, Pencil, X, Save, Plus, RefreshCw } from "lucide-react"
import api from "@/services/api"
import useStore from "@/services/store"
import { useNavigate } from "react-router-dom"
import { RANKED_TIERS, DIVS, CHART_COLORS, ROLES, ROLE_LABELS, SERVERS, TIER_COLORS, RANK_ICON_TIERS } from "@/utils"

const PERIODS = [
  { value: "today", label: "Today" },
  { value: "week", label: "Last Week" },
  { value: "month", label: "Last Month" },
  { value: "all", label: "All Time" }
]

function EditRosterModal({ players, onClose }) {
  const { user, team, setTeam } = useStore()
  const [roster, setRoster] = useState({})
  const [saving, setSaving] = useState(null)
  const [editingRole, setEditingRole] = useState(null)

  useEffect(() => {
    const initial = {}
    ROLES.forEach(role => {
      const existing = players.find(p => p.role === role && p.active !== false)
      initial[role] = existing
        ? {
            _id: existing._id,
            player_name: existing.player_name || "",
            game_name: existing.game_name || "",
            tag_line: existing.tag_line || "",
            connected_at: existing.connected_at
          }
        : { player_name: "", game_name: "", tag_line: "" }
    })
    setRoster(initial)
  }, [])

  const handleSaveRole = async role => {
    if (!roster[role]?.game_name?.trim() || !roster[role]?.tag_line?.trim()) return toast.error("Summoner name and tag are required")
    setSaving(role)
    try {
      const { ok, data, code } = roster[role]?._id
        ? await api.put(`/player/${roster[role]._id}/resync`, {
            game_name: roster[role].game_name.trim(),
            tag_line: roster[role].tag_line.trim(),
            player_name: roster[role].player_name?.trim() || "",
            region: team?.region || "euw1",
            role
          })
        : await api.post("/player", {
            game_name: roster[role].game_name.trim(),
            tag_line: roster[role].tag_line.trim(),
            player_name: roster[role].player_name?.trim() || "",
            region: team?.region || "euw1",
            role
          })
      if (!ok) return toast.error(code || "Riot ID not found")
      setRoster(prev => ({ ...prev, [role]: { ...prev[role], _id: data._id, connected_at: data.connected_at } }))
      setEditingRole(null)
      toast.success(`${ROLE_LABELS[role]} saved`)
    } catch (error) {
      toast.error(error.code || "Failed to save player")
    } finally {
      setSaving(null)
    }
  }

  const handleDeleteRole = async role => {
    if (!roster[role]?._id) return setRoster(prev => ({ ...prev, [role]: { player_name: "", game_name: "", tag_line: "" } }))
    setSaving(role)
    try {
      const { ok, code } = await api.put(`/player/${roster[role]._id}`, { active: false })
      if (!ok) return toast.error(code || "Failed to archive player")
      setRoster(prev => ({ ...prev, [role]: { player_name: "", game_name: "", tag_line: "" } }))
      toast.success(`${ROLE_LABELS[role]} archived`)
    } catch (error) {
      toast.error(error.code || "Failed to archive player")
    } finally {
      setSaving(null)
    }
  }

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-2xl mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
          <h2 className="text-white font-semibold">Edit Roster</h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-sm">Region</span>
              <select
                value={team?.region || "euw1"}
                onChange={e => handleRegionChange(e.target.value)}
                className="w-24 px-2 py-1.5 rounded-lg border border-slate-600 bg-slate-700/50 text-white focus:border-amber-500 focus:outline-none text-sm appearance-none cursor-pointer"
              >
                {SERVERS.map(s => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="divide-y divide-slate-700/30">
          {ROLES.map(role => (
            <div key={role} className="flex items-center gap-3 px-6 py-3 min-h-[56px]">
              <div className="flex items-center gap-2 w-20 shrink-0">
                <img src={`/roles/${role}.png`} alt={role} className="w-5 h-5 opacity-70" />
                <span className="text-amber-400 font-semibold text-xs uppercase">{ROLE_LABELS[role]}</span>
              </div>
              {editingRole === role || !roster[role]?._id ? (
                <>
                  <input
                    type="text"
                    value={roster[role]?.player_name || ""}
                    onChange={e => setRoster(prev => ({ ...prev, [role]: { ...prev[role], player_name: e.target.value } }))}
                    placeholder="Name"
                    className="w-28 px-3 py-2 rounded-lg border border-slate-600 bg-slate-700/50 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none text-sm"
                  />
                  <input
                    type="text"
                    value={roster[role]?.game_name || ""}
                    onChange={e => setRoster(prev => ({ ...prev, [role]: { ...prev[role], game_name: e.target.value } }))}
                    placeholder="Summoner Name"
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-600 bg-slate-700/50 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none text-sm"
                  />
                  <span className="text-slate-500 text-sm">#</span>
                  <input
                    type="text"
                    value={roster[role]?.tag_line || ""}
                    onChange={e => setRoster(prev => ({ ...prev, [role]: { ...prev[role], tag_line: e.target.value } }))}
                    placeholder="TAG"
                    className="w-20 px-3 py-2 rounded-lg border border-slate-600 bg-slate-700/50 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none text-sm"
                  />
                  <button
                    onClick={() => handleSaveRole(role)}
                    disabled={saving === role}
                    className="p-2 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-all disabled:opacity-50"
                    title="Save"
                  >
                    {saving === role ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  </button>
                  {roster[role]?._id && (
                    <button onClick={() => setEditingRole(null)} className="p-2 text-slate-400 hover:text-white rounded-lg transition-all" title="Cancel">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </>
              ) : (
                <>
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <span className="text-white text-sm font-medium truncate">{roster[role]?.player_name || roster[role]?.game_name}</span>
                    <span className="text-slate-500 text-xs truncate">
                      {roster[role]?.game_name}#{roster[role]?.tag_line}
                    </span>
                    {roster[role]?.connected_at && <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" title="Connected" />}
                  </div>
                  <button onClick={() => setEditingRole(role)} className="p-2 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-all" title="Edit">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteRole(role)}
                    disabled={saving === role}
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-50"
                    title="Remove"
                  >
                    {saving === role ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function getPeriodStart(period) {
  const d = new Date()
  if (period === "today") {
    d.setHours(0, 0, 0, 0)
    return d
  }
  if (period === "week") {
    d.setDate(d.getDate() - 7)
    d.setHours(0, 0, 0, 0)
    return d
  }
  if (period === "month") {
    d.setMonth(d.getMonth() - 1)
    d.setHours(0, 0, 0, 0)
    return d
  }
  return new Date(0)
}

function toLP(tier, rank, lp = 0) {
  const i = RANKED_TIERS.indexOf(tier)
  return i === -1 ? 0 : i >= 7 ? 2800 + lp : i * 400 + (DIVS[rank] || 0) * 100 + lp
}

function lpLabel(v) {
  if (v >= 2800) return `${RANKED_TIERS[Math.min(9, 7 + Math.floor((v - 2800) / 500))]} ${v - 2800} LP`
  return `${RANKED_TIERS[Math.floor(v / 400)] || "IRON"} ${["IV", "III", "II", "I"][Math.floor((v % 400) / 100)]} ${v % 100} LP`
}

export default function SoloQ() {
  const { user } = useStore()
  const [players, setPlayers] = useState([])
  const [snapshots, setSnapshots] = useState([])
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState("week")
  const [showEditModal, setShowEditModal] = useState(false)
  const navigate = useNavigate()

  const fetchPlayers = async () => {
    try {
      const { ok, data, code } = await api.post("/player/search", { team_id: user?.team_id })
      if (!ok) return toast.error(code || "Failed to fetch players")
      setPlayers(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch players")
    }
  }

  const fetchSnapshots = async fromDate => {
    try {
      const { ok, data, code } = await api.post("/soloq-snapshot/search", { team_id: user?.team_id, limit: 0, from_date: fromDate })
      if (!ok) return toast.error(code || "Failed to fetch snapshots")
      setSnapshots(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch snapshots")
    }
  }

  const fetchMatches = async fromDate => {
    try {
      const { ok, data, code } = await api.post("/soloq-match/search", { team_id: user?.team_id, limit: 0, from_date: fromDate })
      if (!ok) return toast.error(code || "Failed to fetch matches")
      setMatches(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch matches")
    }
  }

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      const fromDate = period === "all" ? undefined : getPeriodStart(period).toISOString()
      await Promise.all([fetchPlayers(), fetchSnapshots(fromDate), fetchMatches(fromDate)])
      setLoading(false)
    }
    fetch()
  }, [period])

  const handleSyncSoloq = async (e, playerId) => {
    e.stopPropagation()
    try {
      const { ok, data, code } = await api.put(`/player/${playerId}/sync-soloq`)
      if (!ok) return toast.error(code || "Failed to start sync")
      setPlayers(prev => prev.map(p => (p._id === playerId ? data : p)))
    } catch (error) {
      toast.error(error.code || "Failed to start sync")
    }
  }

  const handleArchive = async (e, playerId) => {
    e.stopPropagation()
    try {
      const { ok, code } = await api.put(`/player/${playerId}`, { active: false })
      if (!ok) return toast.error(code || "Failed to archive player")
      setPlayers(prev => prev.filter(p => p._id !== playerId))
      toast.success("Player archived")
    } catch (error) {
      toast.error(error.code || "Failed to archive player")
    }
  }

  const openEditModal = e => {
    e?.stopPropagation()
    setShowEditModal(true)
  }

  const connected = players.filter(p => p.puuid && p.active !== false).sort((a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role))

  const periodLabel = { today: "today", week: "this week", month: "this month", all: "all time" }[period]

  const getMatchStats = playerId => {
    const filtered = matches.filter(m => m.player_id === playerId)
    const w = filtered.filter(m => m.win).length
    return { w, l: filtered.length - w, total: filtered.length }
  }

  const chartData = (() => {
    if (!snapshots.length) return []
    const m = {}
    for (const s of snapshots) {
      const k = Math.round(new Date(s.fetched_at || s.createdAt).getTime() / 60000) * 60000
      if (!m[k]) m[k] = { time: k }
      m[k][s.player_id] = toLP(s.tier, s.rank, s.league_points)
    }
    return Object.values(m).sort((a, b) => a.time - b.time)
  })()

  const getLPChange = player => {
    const snaps = snapshots.filter(s => s.player_id === player._id).sort((a, b) => new Date(a.fetched_at || a.createdAt) - new Date(b.fetched_at || b.createdAt))
    if (snaps.length < 2) return 0
    return toLP(snaps.at(-1).tier, snaps.at(-1).rank, snaps.at(-1).league_points) - toLP(snaps[0].tier, snaps[0].rank, snaps[0].league_points)
  }

  if (loading)
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 lg:p-8">
      <div className="max-w-[1800px] mx-auto space-y-6">
        {connected.length > 0 &&
          (() => {
            const teamStats = connected.reduce((acc, p) => ({ w: acc.w + getMatchStats(p._id).w, l: acc.l + getMatchStats(p._id).l }), { w: 0, l: 0 })
            return (
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl px-6 py-3 flex items-center gap-10">
                <div className="flex items-center gap-10 flex-1 justify-center">
                  <div className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-slate-400 text-xs uppercase tracking-wider">Team LP</span>
                    <span className="text-white font-bold text-lg tabular-nums">
                      {connected
                        .filter(p => ["MASTER", "GRANDMASTER", "CHALLENGER"].includes(p.current_tier))
                        .reduce((s, p) => s + (p.current_lp ?? 0), 0)
                        .toLocaleString()}
                    </span>
                  </div>
                  <div className="w-px h-5 bg-slate-700" />
                  <div className="flex items-center gap-2">
                    <Gamepad2 className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-slate-400 text-xs uppercase tracking-wider">Total Games</span>
                    <span className="text-white font-bold text-lg tabular-nums">{teamStats.w + teamStats.l}</span>
                  </div>
                  <div className="w-px h-5 bg-slate-700" />
                  <div className="flex items-center gap-2">
                    <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-slate-400 text-xs uppercase tracking-wider">Win Rate</span>
                    <span
                      className={`font-bold text-lg tabular-nums ${teamStats.w + teamStats.l > 0 ? (Math.round((teamStats.w / (teamStats.w + teamStats.l)) * 100) >= 50 ? "text-emerald-400" : "text-red-400") : "text-slate-400"}`}
                    >
                      {teamStats.w + teamStats.l > 0 ? Math.round((teamStats.w / (teamStats.w + teamStats.l)) * 100) : 0}%
                    </span>
                    <span className="text-slate-500 text-xs">
                      {teamStats.w}W {teamStats.l}L
                    </span>
                  </div>
                  <div className="w-px h-5 bg-slate-700" />
                  <div className="flex items-center gap-2">
                    {connected.reduce((s, p) => s + getLPChange(p), 0) >= 0 ? (
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                    )}
                    <span className="text-slate-400 text-xs uppercase tracking-wider">LP Change {periodLabel}</span>
                    <span
                      className={`font-bold text-lg tabular-nums ${connected.reduce((s, p) => s + getLPChange(p), 0) > 0 ? "text-emerald-400" : connected.reduce((s, p) => s + getLPChange(p), 0) < 0 ? "text-red-400" : "text-slate-400"}`}
                    >
                      {connected.reduce((s, p) => s + getLPChange(p), 0) > 0 ? "+" : ""}
                      {connected.reduce((s, p) => s + getLPChange(p), 0)}
                    </span>
                  </div>
                </div>
                <select
                  value={period}
                  onChange={e => setPeriod(e.target.value)}
                  className="bg-slate-700/50 border border-slate-600 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-400/50 cursor-pointer"
                >
                  {PERIODS.map(p => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            )
          })()}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {ROLES.map((role, i) => {
            const p = connected.find(pl => pl.role === role)
            if (!p) {
              return (
                <div
                  key={role}
                  onClick={openEditModal}
                  className="relative bg-slate-800/30 border border-dashed border-slate-700/50 rounded-xl p-5 flex flex-col items-center justify-center gap-3 min-h-[220px] cursor-pointer hover:border-amber-500/40 hover:bg-slate-800/50 transition-all group"
                >
                  <img src={`/roles/${role}.png`} alt={role} className="w-8 h-8 opacity-30 group-hover:opacity-50 transition-opacity" />
                  <Plus className="w-5 h-5 text-slate-600 group-hover:text-amber-400 transition-colors" />
                  <span className="text-slate-600 text-xs group-hover:text-slate-400 transition-colors">Add {ROLE_LABELS[role]}</span>
                </div>
              )
            }
            const lp = getLPChange(p)
            const ms = getMatchStats(p._id)
            const glow = TIER_COLORS[p.current_tier] || "#64748b"
            return (
              <div
                key={p._id}
                className="relative bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 flex flex-col items-center gap-3 overflow-hidden group hover:border-slate-600/80 transition-all cursor-pointer"
                onClick={() => navigate(`/soloq/${p._id}`)}
              >
                <div className="absolute top-0 left-0 right-0 h-0.5" style={{ backgroundColor: CHART_COLORS[i % 5] }} />
                {/* Connected indicator + actions */}
                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={openEditModal} className="p-1 rounded bg-slate-700/80 text-slate-400 hover:text-amber-400 transition-colors" title="Edit Roster">
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button onClick={e => handleArchive(e, p._id)} className="p-1 rounded bg-slate-700/80 text-slate-400 hover:text-orange-400 transition-colors" title="Archive">
                    <Archive className="w-3 h-3" />
                  </button>
                </div>
                <div className="absolute top-2.5 left-2.5" title={p.connected_at ? "Connected" : "Not connected"}>
                  <div className={`w-2 h-2 rounded-full ${p.connected_at ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" : "bg-slate-600"}`} />
                </div>
                <div className="flex items-center gap-2">
                  <img src={`/roles/${p.role}.png`} alt={p.role} className="w-4 h-4 opacity-60" />
                  <span className="text-white font-semibold text-sm">{p.player_name || p.game_name}</span>
                  {!p.player_name && <span className="text-slate-500 text-xs">#{p.tag_line}</span>}
                </div>
                <div className="relative w-24 h-24 flex items-center justify-center">
                  {RANK_ICON_TIERS.has(p.current_tier) ? (
                    <img
                      src={`/rank/${p.current_tier.toLowerCase()}.png`}
                      alt={p.current_tier}
                      className="w-full h-full object-contain drop-shadow-lg"
                      style={{ filter: `drop-shadow(0 0 12px ${glow}40)` }}
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full flex items-center justify-center border-2" style={{ borderColor: glow, backgroundColor: `${glow}15` }}>
                      <span className="text-xs font-bold uppercase" style={{ color: glow }}>
                        {p.current_tier || "N/A"}
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-white font-bold text-sm tracking-wide">{p.current_tier ? `${p.current_tier} ${p.current_rank || ""}` : "Unranked"}</p>
                  <p className="text-slate-400 text-xs">{p.current_lp ?? 0} LP</p>
                </div>
                {ms.total > 0 && (
                  <div className="flex items-center gap-3 text-xs">
                    <span className={Math.round((ms.w / ms.total) * 100) >= 50 ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                      {Math.round((ms.w / ms.total) * 100)}%
                    </span>
                    <span className="text-slate-500">
                      {ms.w}W {ms.l}L
                    </span>
                  </div>
                )}
                {lp !== 0 && (
                  <div className="flex flex-col items-center">
                    <div className={`flex items-center gap-1 text-xs font-medium ${lp > 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {lp > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      <span>
                        {lp > 0 ? "+" : ""}
                        {lp} LP
                      </span>
                    </div>
                    <span className="text-slate-600 text-[10px]">{periodLabel}</span>
                  </div>
                )}
                {p.sync_soloq === "pending" ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-medium">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Syncing…
                  </div>
                ) : (
                  !p.sync_soloq && (
                    <button
                      onClick={e => handleSyncSoloq(e, p._id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-medium hover:bg-amber-500/20 transition-all"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Sync SoloQ
                    </button>
                  )
                )}
              </div>
            )
          })}
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="p-6">
            {chartData.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-slate-500">No data yet. Snapshots will appear after the first cron run.</div>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData}>
                  <XAxis
                    dataKey="time"
                    type="number"
                    domain={["dataMin", "dataMax"]}
                    tickFormatter={v => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    stroke="#64748b"
                    fontSize={12}
                  />
                  <YAxis tickFormatter={v => (v >= 2800 ? `${v - 2800} LP` : `${v} LP`)} stroke="#64748b" fontSize={12} domain={["dataMin - 100", "dataMax + 100"]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }}
                    labelStyle={{ color: "#94a3b8" }}
                    labelFormatter={v => new Date(v).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    formatter={(value, name) => {
                      const pl = connected.find(p => p._id === name)
                      return [lpLabel(value), pl?.player_name || pl?.game_name || name]
                    }}
                    itemSorter={a => -a.value}
                  />
                  <Legend
                    formatter={v => {
                      const pl = connected.find(p => p._id === v)
                      return pl?.player_name || pl?.game_name || v
                    }}
                  />
                  {connected.map((p, i) => (
                    <Line key={p._id} dataKey={p._id} stroke={CHART_COLORS[i % 5]} strokeWidth={2} dot={false} connectNulls activeDot={{ r: 4, strokeWidth: 2 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {showEditModal && (
        <EditRosterModal
          players={players}
          onClose={() => {
            setShowEditModal(false)
            fetchPlayers()
          }}
        />
      )}
    </div>
  )
}
