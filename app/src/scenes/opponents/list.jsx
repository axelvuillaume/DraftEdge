import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import { Plus, Trash2, Swords, Search, ChevronDown, X, Trophy } from "lucide-react"
import api from "@/services/api"
import useStore from "@/services/store"
import Modal from "@/components/modal"
import { useNavigate } from "react-router-dom"

export default function List({ stats }) {
  const navigate = useNavigate()
  const { user } = useStore()
  const [teams, setTeams] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [filters, setFilters] = useState({ search: "", league: "" })

  const fetchTeams = async () => {
    try {
      const { ok, data, code } = await api.post("/enemy-team/search", { team_id: user?.team_id, ...filters })
      if (!ok) return toast.error(code || "Failed to fetch teams")
      setTeams(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch teams")
    }
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    if (!window.confirm("Delete this team?")) return
    try {
      const { ok, code } = await api.delete(`/enemy-team/${id}`)
      if (!ok) return toast.error(code || "Failed to delete team")
      toast.success("Team deleted")
      fetchTeams()
    } catch (error) {
      toast.error(error.code || "Failed to delete team")
    }
  }

  useEffect(() => {
    fetchTeams()
  }, [filters])

  const getStatsForTeam = name => stats.find(s => s.opponent_name === name)

  return (
    <div className="h-full overflow-hidden bg-slate-900 p-4 lg:p-6 flex flex-col">
      <div className="w-full mx-auto flex flex-col gap-4 min-h-0 flex-1">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Swords className="w-5 h-5 text-amber-500" />
            <h1 className="text-white text-lg font-semibold">Opponent Teams</h1>
            <span className="text-slate-500 text-sm">{teams.length} total</span>
          </div>
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded-lg transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Team
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search teams..."
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              className="w-full pl-9 pr-3 py-2 bg-slate-800/60 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 text-sm outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
            />
          </div>

          <LeagueFilterDropdown value={filters.league} onChange={v => setFilters(f => ({ ...f, league: v }))} />

          {(filters.league || filters.search.trim()) && (
            <button
              onClick={() => setFilters({ search: "", league: "" })}
              className="flex items-center gap-1.5 px-3 py-2 text-slate-400 hover:text-white text-sm transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-y-auto min-h-0 flex-1">
          {teams.length === 0 ? (
            <div className="p-16 text-center">
              <Swords className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">{filters.league || filters.search.trim() ? "No teams match your filters" : "No opponent teams yet"}</p>
              {!(filters.league || filters.search.trim()) && <p className="text-slate-600 text-xs mt-1">Add an opponent team to start tracking</p>}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left text-slate-500 text-[11px] font-medium uppercase tracking-wider px-5 py-3">Team</th>
                  <th className="text-left text-slate-500 text-[11px] font-medium uppercase tracking-wider px-4 py-3">League</th>
                  <th className="text-center text-slate-500 text-[11px] font-medium uppercase tracking-wider px-4 py-3">Record</th>
                  <th className="text-center text-slate-500 text-[11px] font-medium uppercase tracking-wider px-4 py-3">WR</th>
                  <th className="text-left text-slate-500 text-[11px] font-medium uppercase tracking-wider px-4 py-3">Contact</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {teams.map(team => {
                  const s = getStatsForTeam(team.name)
                  return (
                    <tr key={team._id} onClick={() => navigate(`/manager-space/${team._id}`)} className="hover:bg-slate-700/20 transition-colors cursor-pointer group">
                      <td className="px-5 py-3.5">
                        <span className="text-white text-sm font-medium">{team.name}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        {team.league ? (
                          <span className="font-mono text-xs text-slate-300 px-2 py-0.5 rounded">{team.league}</span>
                        ) : (
                          <span className="text-slate-600 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {s ? (
                          <span className="text-sm tabular-nums">
                            <span className="text-emerald-400 font-medium">{s.wins}</span>
                            <span className="text-slate-600 mx-0.5">-</span>
                            <span className="text-red-400 font-medium">{s.losses}</span>
                          </span>
                        ) : (
                          <span className="text-slate-600 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {s ? (
                          <span className={`text-sm font-semibold tabular-nums ${s.win_rate >= 0.5 ? "text-emerald-400" : "text-red-400"}`}>{Math.round(s.win_rate * 100)}%</span>
                        ) : (
                          <span className="text-slate-600 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-slate-400 text-sm">{team.contact_name || "—"}</span>
                      </td>
                      <td className="px-3 py-3.5">
                        <button
                          onClick={e => handleDelete(e, team._id)}
                          className="p-1.5 rounded-md text-slate-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                          title="Delete team"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <AddTeamModal isOpen={isOpen} setIsOpen={setIsOpen} onCreated={fetchTeams} navigate={navigate} />
    </div>
  )
}

function LeagueFilterDropdown({ value, onChange }) {
  const { user } = useStore()
  const [open, setOpen] = useState(false)
  const [leagues, setLeagues] = useState([])

  const fetchLeagues = async () => {
    try {
      const { ok, data, code } = await api.post("/enemy-team/filters", { team_id: user?.team_id })
      if (!ok) return toast.error(code || "Failed to fetch leagues")
      setLeagues(data.leagues)
    } catch (error) {
      toast.error(error.code || "Failed to fetch leagues")
    }
  }

  useEffect(() => {
    fetchLeagues()
  }, [user?.team_id])

  if (leagues.length === 0) return null

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
          value ? "bg-amber-500/10 border-amber-500/30 text-amber-400" : "bg-slate-800/60 border-slate-700/50 text-slate-400 hover:border-slate-600"
        }`}
      >
        <span>{value || "League"}</span>
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 overflow-hidden">
            <div className="max-h-56 overflow-y-auto p-1">
              <button
                onClick={() => {
                  onChange("")
                  setOpen(false)
                }}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${!value ? "bg-amber-500/20 text-amber-400" : "text-slate-400 hover:bg-slate-700/50"}`}
              >
                All Leagues
              </button>
              {leagues.map(l => (
                <button
                  key={l}
                  onClick={() => {
                    onChange(l)
                    setOpen(false)
                  }}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${value === l ? "bg-amber-500/20 text-amber-400" : "text-slate-300 hover:bg-slate-700/50"}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function AddTeamModal({ isOpen, setIsOpen, onCreated, navigate }) {
  const [team, setTeam] = useState({ name: "", league: "" })

  const handleAdd = async () => {
    if (!team.name.trim()) return toast.error("Enter a team name")
    try {
      const { ok, data, code } = await api.post("/enemy-team", team)
      if (!ok) return toast.error(code || "Failed to add team")
      setTeam({ name: "", league: "" })
      setIsOpen(false)
      onCreated()
      navigate(`/manager-space/${data._id}`)
    } catch (error) {
      toast.error(error.code || "Failed to add team")
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} className="w-full max-w-md bg-slate-800 p-6">
      <div className="space-y-4">
        <h2 className="text-white font-semibold text-lg">Add Opponent Team</h2>
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Team Name *</label>
          <input
            type="text"
            value={team.name}
            onChange={e => setTeam(prev => ({ ...prev, name: e.target.value }))}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            placeholder="e.g. T1, GenG, HLE..."
            className="w-full px-3 py-2.5 rounded-lg border border-slate-600 bg-slate-700/50 text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none transition-all text-sm"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">League (optional)</label>
          <input
            type="text"
            value={team.league}
            onChange={e => setTeam(prev => ({ ...prev, league: e.target.value }))}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            placeholder="e.g. LCK, LEC, LFL..."
            className="w-full px-3 py-2.5 rounded-lg border border-slate-600 bg-slate-700/50 text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none transition-all text-sm"
          />
        </div>
        <div className="flex justify-end pt-2">
          <button onClick={handleAdd} className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded-lg text-sm transition-colors">
            Add Team
          </button>
        </div>
      </div>
    </Modal>
  )
}
