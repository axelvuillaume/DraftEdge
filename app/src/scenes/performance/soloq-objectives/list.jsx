import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "react-hot-toast"
import { Plus, Pencil, Trash2, Search, X, CheckCircle2 } from "lucide-react"
import api from "@/services/api"
import useStore from "@/services/store"
import Modal from "@/components/modal"
import { ROLES, ROLE_LABELS, ALL_CHAMPIONS, getChampionIcon } from "@/utils"

const ROLE_TO_RIOT = { top: "TOP", jungle: "JUNGLE", mid: "MIDDLE", bottom: "BOTTOM", support: "UTILITY" }

const APEX_TIERS = new Set(["MASTER", "GRANDMASTER", "CHALLENGER"])

export default function List() {
  const [players, setPlayers] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [editing, setEditing] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const { user } = useStore()

  const fetchPlayers = async () => {
    try {
      const { ok, data, code } = await api.post("/player/search", { team_id: user?.team_id, active: true })
      if (!ok) return toast.error(code || "Failed to fetch players")
      data.sort((a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role))
      setPlayers(data)
      if (data[0]) setSelectedId(prev => prev || data[0]._id)
    } catch (error) {
      toast.error(error.code || "Failed to fetch players")
    }
  }

  useEffect(() => {
    fetchPlayers()
  }, [user?.team_id])

  const selected = players.find(p => p._id === selectedId)

  return (
    <div className="min-h-screen bg-slate-900 p-4 lg:p-6">
      <div className="max-w-[1800px] mx-auto space-y-5">
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={() => setEditing({ player_id: selectedId })}
            className="flex items-center gap-2 px-4 py-2 bg-violet-500 hover:bg-violet-400 text-white font-semibold rounded-lg transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            New Objective
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {players.map(p => (
            <button
              key={p._id}
              onClick={() => setSelectedId(p._id)}
              className={`relative bg-slate-800/60 border rounded-xl p-4 text-left transition-all overflow-hidden ${
                selectedId === p._id ? "border-violet-500 ring-1 ring-violet-500/50" : "border-slate-700/50 hover:border-slate-600"
              }`}
            >
              {p.current_tier && (
                <img
                  src={`/rank/${p.current_tier.toLowerCase()}.png`}
                  alt=""
                  className="absolute -right-4 -top-4 w-24 h-24 opacity-10 pointer-events-none"
                  onError={e => (e.target.style.display = "none")}
                />
              )}
              <div className="relative flex items-center gap-2.5 mb-4">
                <img src={`/roles/${p.role}.png`} alt={p.role} className="w-7 h-7 opacity-80" onError={e => (e.target.style.display = "none")} />
                <div className="min-w-0 flex-1">
                  <p className="text-white text-sm font-semibold truncate leading-tight">{p.player_name || p.game_name}</p>
                  <p className="text-slate-500 text-[10px] uppercase tracking-wider font-medium">{ROLE_LABELS[p.role] || p.role}</p>
                </div>
              </div>

              <div className="relative flex items-end justify-between gap-2">
                <div>
                  <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-0.5">Rank</p>
                  {p.current_tier ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-white text-sm font-bold">
                        {p.current_tier.charAt(0) + p.current_tier.slice(1).toLowerCase()}
                        {!APEX_TIERS.has(p.current_tier) && p.current_rank ? ` ${p.current_rank}` : ""}
                      </span>
                      <span className="text-slate-500 text-xs tabular-nums">{p.current_lp ?? 0}LP</span>
                    </div>
                  ) : (
                    <span className="text-slate-600 text-sm">Unranked</span>
                  )}
                </div>
                <div className="flex gap-3 text-right">
                  <PlayerGoalsCount playerId={p._id} />
                  <PlayerWinrate playerId={p._id} />
                </div>
              </div>
            </button>
          ))}
        </div>

        {selected && <PlayerObjectives key={refreshKey} player={selected} onEdit={obj => setEditing(obj)} />}
      </div>
      <SoloObjectifModal isOpen={!!editing} objective={editing} onClose={() => setEditing(null)} onSuccess={() => setRefreshKey(k => k + 1)} />
    </div>
  )
}

function PlayerGoalsCount({ playerId }) {
  const [count, setCount] = useState(null)

  const fetchCount = async () => {
    try {
      const { ok, data, code } = await api.post("/solo-objectif/search", { player_id: playerId })
      if (!ok) return toast.error(code || "Failed to fetch objectives")
      setCount(data.length)
    } catch (error) {
      toast.error(error.code || "Failed to fetch objectives")
    }
  }

  useEffect(() => {
    fetchCount()
  }, [playerId])

  return (
    <div>
      <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-0.5">Goals</p>
      <p className="text-emerald-400 text-sm font-bold tabular-nums">{count ?? "-"}</p>
    </div>
  )
}

function PlayerWinrate({ playerId }) {
  const [stats, setStats] = useState(null)

  const fetchResults = async () => {
    try {
      const { ok, data, code } = await api.post("/solo-objectif-result/search", { player_id: playerId })
      if (!ok) return toast.error(code || "Failed to fetch results")
      const success = data.filter(r => r.success).length
      setStats({ success, total: data.length })
    } catch (error) {
      toast.error(error.code || "Failed to fetch results")
    }
  }

  useEffect(() => {
    fetchResults()
  }, [playerId])

  return (
    <div>
      <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-0.5">WR</p>
      <p className="text-white text-sm font-bold tabular-nums">{stats && stats.total > 0 ? `${Math.round((stats.success / stats.total) * 100)}%` : "-"}</p>
    </div>
  )
}

const TIER_ORDER = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"]
const DIVISION_ORDER = ["IV", "III", "II", "I"]

const TYPE_BADGES = {
  per_game: { label: "Per game", className: "text-violet-400/80 bg-violet-500/10" },
  aggregate: { label: "Aggregate", className: "text-amber-400/80 bg-amber-500/10" },
  streak: { label: "Streak", className: "text-cyan-400/80 bg-cyan-500/10" },
  rank: { label: "Rank", className: "text-yellow-400/80 bg-yellow-500/10" }
}

function PlayerObjectives({ player, onEdit }) {
  const [objectives, setObjectives] = useState([])
  const navigate = useNavigate()

  const fetchObjectives = async () => {
    try {
      const { ok, data, code } = await api.post("/solo-objectif/search", { player_id: player._id })
      if (!ok) return toast.error(code || "Failed to fetch objectives")
      setObjectives(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch objectives")
    }
  }

  useEffect(() => {
    fetchObjectives()
  }, [player._id])

  const handleDelete = async id => {
    if (!window.confirm("Delete this objective?")) return
    try {
      const { ok, code } = await api.delete(`/solo-objectif/${id}`)
      if (!ok) return toast.error(code || "Failed to delete objective")
      toast.success("Objective deleted")
      fetchObjectives()
    } catch (error) {
      toast.error(error.code || "Failed to delete objective")
    }
  }

  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
      {objectives.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-12">No objectives for this player</p>
      ) : (
        <div className="divide-y divide-slate-700/30">
          {objectives.map(obj => (
            <ObjectiveRow
              key={obj._id}
              objective={obj}
              player={player}
              onClick={() => navigate(`/performance/soloq-objectives/${obj._id}`)}
              onEdit={() => onEdit(obj)}
              onDelete={() => handleDelete(obj._id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SoloObjectifModal({ isOpen, objective, onClose, onSuccess }) {
  const [name, setName] = useState("")
  const [request, setRequest] = useState("")
  const [playerId, setPlayerId] = useState("")
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState("")
  const [side, setSide] = useState("")
  const [champions, setChampions] = useState([])
  const [champSearch, setChampSearch] = useState("")
  const [showChampPicker, setShowChampPicker] = useState(false)
  const [smurfAccount, setSmurfAccount] = useState(null)
  const [checkingAccount, setCheckingAccount] = useState(false)
  const { user } = useStore()

  const fetchPlayers = async () => {
    try {
      const { ok, data, code } = await api.post("/player/search", { team_id: user?.team_id, active: true })
      if (!ok) return toast.error(code || "Failed to fetch players")
      setPlayers(data.sort((a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role)))
    } catch (error) {
      toast.error(error.code || "Failed to fetch players")
    }
  }

  useEffect(() => {
    if (isOpen) fetchPlayers()
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || players.length === 0) return
    if (objective?._id) {
      setName(objective.name || "")
      setRequest(objective.request || "")
      setPlayerId(objective.player_id || "")
      setRole(objective.role || "")
      setSide(objective.side || "")
      setChampions(objective.champions || [])
      setSmurfAccount(objective.account?.puuid ? objective.account : null)
    } else {
      const initialId = objective?.player_id || players[0]._id
      setName("")
      setRequest("")
      setPlayerId(initialId)
      setRole(ROLE_TO_RIOT[players.find(p => p._id === initialId)?.role] || "")
      setSide("")
      setChampions([])
      setSmurfAccount(null)
    }
    setChampSearch("")
    setShowChampPicker(false)
  }, [isOpen, players, objective])

  const handlePlayerChange = id => {
    setPlayerId(id)
    setRole(ROLE_TO_RIOT[players.find(p => p._id === id)?.role] || "")
  }

  const handleCheckAccount = async () => {
    if (!smurfAccount?.game_name?.trim() || !smurfAccount?.tag_line?.trim()) return
    setCheckingAccount(true)
    try {
      const { ok, data, code } = await api.post("/solo-objectif/check-account", {
        game_name: smurfAccount.game_name.trim(),
        tag_line: smurfAccount.tag_line.trim(),
        region: smurfAccount.region
      })
      if (!ok) return toast.error(code || "Account not found")
      setSmurfAccount(data)
      toast.success(`Account found: ${data.game_name}#${data.tag_line}`)
    } catch (error) {
      toast.error(error.code || "Account not found")
    } finally {
      setCheckingAccount(false)
    }
  }

  const handleSubmit = async () => {
    if (!name.trim() || !playerId) return
    if (smurfAccount && !smurfAccount.puuid) return toast.error("Check the smurf account first")
    setLoading(true)
    try {
      if (objective?._id) {
        const { ok, code } = await api.put(`/solo-objectif/${objective._id}`, {
          name: name.trim(),
          request: request.trim(),
          player_id: playerId,
          player_name: players.find(p => p._id === playerId)?.player_name,
          champions,
          role: role || null,
          side: side || null,
          account: smurfAccount?.puuid ? smurfAccount : null
        })
        if (!ok) return toast.error(code || "Failed to update objective")
        toast.success("Objective updated")
      } else {
        const { ok, code } = await api.post("/solo-objectif", {
          name: name.trim(),
          request: request.trim(),
          player_id: playerId,
          player_name: players.find(p => p._id === playerId)?.player_name,
          champions,
          role: role || null,
          side: side || null,
          ...(smurfAccount?.puuid && { account: smurfAccount })
        })
        if (!ok) return toast.error(code || "Failed to add objective")
        toast.success("Objective added")
      }
      onClose()
      onSuccess()
    } catch (error) {
      toast.error(error.code || "Failed to save objective")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="w-full max-w-lg bg-slate-800 p-6">
      <div className="space-y-4">
        <h2 className="text-white font-semibold text-lg">{objective?._id ? "Edit SoloQ Objective" : "New SoloQ Objective"}</h2>
        <div className="space-y-3">
          <div>
            <label className="text-slate-400 text-xs font-medium mb-1.5 block">Player</label>
            <select
              value={playerId}
              onChange={e => handlePlayerChange(e.target.value)}
              className="w-full bg-slate-700/50 border-0 outline-none ring-0 focus:ring-1 focus:ring-violet-500 rounded-lg px-3 py-2.5 text-white text-sm"
            >
              {players.map(p => (
                <option key={p._id} value={p._id}>
                  {ROLE_LABELS[p.role] || p.role} - {p.player_name || p.game_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!smurfAccount}
                onChange={e => setSmurfAccount(e.target.checked ? { game_name: "", tag_line: "", region: "euw1" } : null)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-0"
              />
              <span className="text-slate-400 text-xs font-medium">Use smurf account</span>
            </label>
          </div>
          {smurfAccount && (
            <div className="space-y-2 bg-slate-700/30 rounded-lg p-3">
              <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                <input
                  type="text"
                  placeholder="Game Name"
                  value={smurfAccount.game_name}
                  onChange={e => setSmurfAccount(prev => ({ ...prev, game_name: e.target.value, puuid: undefined }))}
                  className="bg-slate-700/50 border-0 outline-none ring-0 focus:ring-1 focus:ring-violet-500 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm"
                />
                <input
                  type="text"
                  placeholder="Tag"
                  value={smurfAccount.tag_line}
                  onChange={e => setSmurfAccount(prev => ({ ...prev, tag_line: e.target.value, puuid: undefined }))}
                  className="w-20 bg-slate-700/50 border-0 outline-none ring-0 focus:ring-1 focus:ring-violet-500 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm"
                />
                <select
                  value={smurfAccount.region}
                  onChange={e => setSmurfAccount(prev => ({ ...prev, region: e.target.value, puuid: undefined }))}
                  className="bg-slate-700/50 border-0 outline-none ring-0 focus:ring-1 focus:ring-violet-500 rounded-lg px-2 py-2 text-white text-sm"
                >
                  <option value="euw1">EUW</option>
                  <option value="eun1">EUNE</option>
                  <option value="na1">NA</option>
                  <option value="kr">KR</option>
                </select>
              </div>
              <button
                onClick={handleCheckAccount}
                disabled={!smurfAccount.game_name?.trim() || !smurfAccount.tag_line?.trim() || checkingAccount}
                className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  smurfAccount.puuid
                    ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/50"
                    : "bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
                }`}
              >
                {checkingAccount ? (
                  <div className="w-4 h-4 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
                ) : smurfAccount.puuid ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                {checkingAccount ? "Checking..." : smurfAccount.puuid ? `Verified: ${smurfAccount.game_name}#${smurfAccount.tag_line}` : "Check Account"}
              </button>
            </div>
          )}
          <div>
            <label className="text-slate-400 text-xs font-medium mb-1.5 block">Side filter (optional)</label>
            <div className="flex gap-1.5">
              {[
                { value: "", label: "Both sides" },
                { value: "blue", label: "Blue" },
                { value: "red", label: "Red" }
              ].map(s => (
                <button
                  key={s.value}
                  onClick={() => setSide(s.value)}
                  className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    side === s.value ? "bg-violet-500/20 text-violet-400 ring-1 ring-violet-500/50" : "bg-slate-700/50 text-slate-400 hover:text-white"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-slate-400 text-xs font-medium mb-1.5 block">Champions filter (optional)</label>
            {champions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {champions.map(c => (
                  <span key={c} className="flex items-center gap-1.5 bg-violet-500/10 text-violet-400 px-2 py-1 rounded-lg text-xs font-medium">
                    <img src={getChampionIcon(c)} alt={c} className="w-4 h-4 rounded" />
                    {c}
                    <button onClick={() => setChampions(prev => prev.filter(x => x !== c))} className="hover:text-red-400 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {showChampPicker ? (
              <div className="bg-slate-700/50 rounded-lg overflow-hidden">
                <div className="relative p-2">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search champion..."
                    value={champSearch}
                    onChange={e => setChampSearch(e.target.value)}
                    className="w-full bg-slate-600/50 border-0 outline-none rounded-md pl-9 pr-3 py-1.5 text-white placeholder-slate-400 text-sm"
                    autoFocus
                  />
                </div>
                <div className="p-2 max-h-48 overflow-y-auto grid grid-cols-6 gap-1">
                  {ALL_CHAMPIONS.filter(c => c.toLowerCase().includes(champSearch.toLowerCase())).map(c => (
                    <button
                      key={c}
                      onClick={() => {
                        if (!champions.includes(c)) setChampions(prev => [...prev, c])
                      }}
                      disabled={champions.includes(c)}
                      className={`flex flex-col items-center p-1 rounded-lg transition-colors ${champions.includes(c) ? "opacity-30" : "hover:bg-slate-600/50"}`}
                    >
                      <img src={getChampionIcon(c)} alt={c} className="w-8 h-8 rounded-lg" />
                      <span className="text-[10px] text-slate-400 truncate w-full text-center mt-0.5">{c}</span>
                    </button>
                  ))}
                </div>
                <div className="p-2 border-t border-slate-600/50">
                  <button onClick={() => setShowChampPicker(false)} className="text-xs text-slate-400 hover:text-white transition-colors">
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowChampPicker(true)}
                className="w-full bg-slate-700/50 rounded-lg px-3 py-2 text-slate-500 text-sm text-left hover:text-slate-300 transition-colors"
              >
                {champions.length === 0 ? "All champions (click to filter)" : "Add more champions..."}
              </button>
            )}
          </div>
          <div>
            <label className="text-slate-400 text-xs font-medium mb-1.5 block">Objective</label>
            <input
              type="text"
              placeholder="e.g. CS superieur a 100 a 10min"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-slate-700/50 border-0 outline-none ring-0 focus:ring-1 focus:ring-violet-500 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 text-sm"
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
            />
          </div>
          <div>
            <label className="text-slate-400 text-xs font-medium mb-1.5 block">Description (optional)</label>
            <input
              type="text"
              placeholder="Additional details..."
              value={request}
              onChange={e => setRequest(e.target.value)}
              className="w-full bg-slate-700/50 border-0 outline-none ring-0 focus:ring-1 focus:ring-violet-500 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 text-sm"
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white text-sm transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || !playerId || loading}
            className="px-5 py-2 bg-violet-500 hover:bg-violet-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors text-sm flex items-center gap-2"
          >
            {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {loading ? "Saving..." : objective?._id ? "Save" : "Add"}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function RowActions({ onEdit, onDelete }) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <button
        onClick={e => {
          e.stopPropagation()
          onEdit()
        }}
        className="p-1.5 rounded-lg text-slate-600 hover:text-violet-400 hover:bg-violet-500/10 transition-colors"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={e => {
          e.stopPropagation()
          onDelete()
        }}
        className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

function ObjectiveRow({ objective, player, onClick, onEdit, onDelete }) {
  if (objective.type === "aggregate") return <AggregateRow objective={objective} onClick={onClick} onEdit={onEdit} onDelete={onDelete} />
  if (objective.type === "rank") return <RankRow objective={objective} player={player} onClick={onClick} onEdit={onEdit} onDelete={onDelete} />
  return <PerGameRow objective={objective} onClick={onClick} onEdit={onEdit} onDelete={onDelete} />
}

function ObjectiveHeader({ objective }) {
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-white text-sm font-medium truncate">{objective.name}</p>
        {TYPE_BADGES[objective.type] && (
          <span className={`text-[10px] px-2 py-0.5 rounded font-medium uppercase tracking-wide shrink-0 ${TYPE_BADGES[objective.type].className}`}>
            {TYPE_BADGES[objective.type].label}
            {objective.type === "streak" && objective.streak_count ? ` ×${objective.streak_count}` : ""}
          </span>
        )}
        {objective.account?.game_name && (
          <span className="text-[10px] text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded font-medium shrink-0">
            {objective.account.game_name}#{objective.account.tag_line}
          </span>
        )}
        {objective.side && (
          <span
            className={`text-[10px] px-2 py-0.5 rounded font-medium shrink-0 uppercase tracking-wide ${objective.side === "blue" ? "text-blue-400/80 bg-blue-500/10" : "text-red-400/80 bg-red-500/10"}`}
          >
            {objective.side}
          </span>
        )}
        {objective.champions?.length > 0 && (
          <div className="flex items-center gap-0.5 shrink-0">
            {objective.champions.map(c => (
              <img key={c} src={getChampionIcon(c)} alt={c} title={c} className="w-5 h-5 rounded" />
            ))}
          </div>
        )}
      </div>
      {objective.request && <p className="text-slate-500 text-xs mt-0.5 truncate">{objective.request}</p>}
    </div>
  )
}

function PerGameRow({ objective, onClick, onEdit, onDelete }) {
  const [results, setResults] = useState([])

  const fetchResults = async () => {
    try {
      const { ok, data, code } = await api.post("/solo-objectif-result/search", { solo_objectif_id: objective._id })
      if (!ok) return toast.error(code || "Failed to fetch results")
      setResults(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch results")
    }
  }

  useEffect(() => {
    fetchResults()
  }, [objective._id])

  const successCount = results.filter(r => r.success).length
  const rate = results.length > 0 ? Math.round((successCount / results.length) * 100) : null

  return (
    <div className="px-5 py-3 hover:bg-slate-800/40 transition-colors cursor-pointer flex items-center gap-4" onClick={onClick}>
      <ObjectiveHeader objective={objective} />
      <div className="flex items-center gap-1 shrink-0">
        {results.slice(-30).map((r, i) => (
          <span key={r._id || i} className={`w-1.5 h-1.5 rounded-full ${r.success ? "bg-emerald-400" : "bg-red-400"}`} />
        ))}
        {results.length === 0 && <span className="text-slate-600 text-xs">No data</span>}
      </div>
      <div className="text-right shrink-0 w-16">
        {rate != null ? (
          <>
            <p className={`text-sm font-bold tabular-nums ${rate >= 70 ? "text-emerald-400" : rate >= 50 ? "text-amber-300" : "text-red-400"}`}>{rate}%</p>
            <p className="text-slate-600 text-[10px] uppercase tracking-wide">success</p>
          </>
        ) : (
          <p className="text-slate-600 text-xs">-</p>
        )}
      </div>
      <RowActions onEdit={onEdit} onDelete={onDelete} />
    </div>
  )
}

function AggregateRow({ objective, onClick, onEdit, onDelete }) {
  const [agg, setAgg] = useState(null)

  const fetchAggregate = async () => {
    try {
      const { ok, data, code } = await api.post("/solo-objectif-result/aggregate", { solo_objectif_id: objective._id })
      if (!ok) return toast.error(code || "Failed to fetch aggregate")
      setAgg(data[0] || null)
    } catch (error) {
      toast.error(error.code || "Failed to fetch aggregate")
    }
  }

  useEffect(() => {
    fetchAggregate()
  }, [objective._id])

  const periodLabel = objective.aggregate?.period === "weekly" ? "Week" : objective.aggregate?.period === "total" ? "Total" : "Today"
  const progress = agg && agg.target > 0 ? Math.min(100, Math.round((agg.current / agg.target) * 100)) : 0

  return (
    <div className="px-5 py-3 hover:bg-slate-800/40 transition-colors cursor-pointer flex items-center gap-4" onClick={onClick}>
      <ObjectiveHeader objective={objective} />
      <div className="w-44 shrink-0 hidden sm:block">
        {agg ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-500 uppercase tracking-wide">{periodLabel}</span>
              <span className={`font-bold tabular-nums ${agg.success ? "text-emerald-400" : "text-amber-400"}`}>
                {agg.current} / {agg.target} <span className="text-slate-500 font-normal">{objective.rule?.metric === "win" ? "wins" : "games"}</span>
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${agg.success ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : (
          <span className="text-slate-600 text-xs">No data</span>
        )}
      </div>
      <div className="text-right shrink-0 w-16">
        <p className={`text-sm font-bold tabular-nums ${agg?.success ? "text-emerald-400" : "text-amber-300"}`}>{progress}%</p>
        <p className="text-slate-600 text-[10px] uppercase tracking-wide">progress</p>
      </div>
      <RowActions onEdit={onEdit} onDelete={onDelete} />
    </div>
  )
}

function RankRow({ objective, player, onClick, onEdit, onDelete }) {
  const isSmurf = !!objective.account?.puuid
  const [snapshot, setSnapshot] = useState(null)

  const fetchSnapshot = async () => {
    try {
      const { ok, data, code } = await api.post("/solo-objectif-result/search", { solo_objectif_id: objective._id })
      if (!ok) return toast.error(code || "Failed to fetch snapshot")
      setSnapshot(data[0] || null)
    } catch (error) {
      toast.error(error.code || "Failed to fetch snapshot")
    }
  }

  useEffect(() => {
    if (isSmurf) fetchSnapshot()
  }, [objective._id, isSmurf])

  const tier = isSmurf ? snapshot?.tier : player?.current_tier
  const rank = isSmurf ? snapshot?.rank : player?.current_rank
  const lp = isSmurf ? snapshot?.lp : player?.current_lp

  const targetTier = objective.rule?.target_tier
  const targetDivision = objective.rule?.target_division
  const targetLp = objective.rule?.target_lp || 0

  const tierIdx = TIER_ORDER.indexOf(tier)
  const divIdx = APEX_TIERS.has(tier) ? 0 : DIVISION_ORDER.indexOf(rank)
  const targetTierIdx = TIER_ORDER.indexOf(targetTier)
  const targetDivIdx = APEX_TIERS.has(targetTier) ? 0 : DIVISION_ORDER.indexOf(targetDivision)

  const currentScore = tierIdx >= 0 ? tierIdx * 400 + (divIdx >= 0 ? divIdx * 100 : 0) + (lp || 0) : 0
  const targetScore = targetTierIdx >= 0 ? targetTierIdx * 400 + (targetDivIdx >= 0 ? targetDivIdx * 100 : 0) + targetLp : 0
  const progress = targetScore > 0 ? Math.min(100, Math.round((currentScore / targetScore) * 100)) : 0

  const targetLabel = targetTier
    ? `${targetTier.charAt(0) + targetTier.slice(1).toLowerCase()}${targetDivision ? ` ${targetDivision}` : ""}${targetLp ? ` ${targetLp}LP` : ""}`
    : "—"

  return (
    <div className="px-5 py-3 hover:bg-slate-800/40 transition-colors cursor-pointer flex items-center gap-4" onClick={onClick}>
      <ObjectiveHeader objective={objective} />
      <div className="w-44 shrink-0 hidden sm:block">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-500 uppercase tracking-wide">→ {targetLabel}</span>
            {objective.completed && <span className="text-emerald-400 font-bold uppercase tracking-wide">Completed</span>}
          </div>
          <div className="w-full h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${objective.completed ? "bg-emerald-500" : "bg-yellow-500"}`} style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
      <div className="text-right shrink-0 w-16">
        <p className={`text-sm font-bold tabular-nums ${objective.completed ? "text-emerald-400" : "text-yellow-400"}`}>{progress}%</p>
        <p className="text-slate-600 text-[10px] uppercase tracking-wide">progress</p>
      </div>
      <RowActions onEdit={onEdit} onDelete={onDelete} />
    </div>
  )
}
