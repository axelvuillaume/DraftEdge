import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import { Plus, Trash2, Swords, Search } from "lucide-react"
import api from "@/services/api"
import useStore from "@/services/store"
import Modal from "@/components/modal"
import { useNavigate } from "react-router-dom"

export default function List() {
  const navigate = useNavigate()
  const { user } = useStore()
  const [teams, setTeams] = useState([])
  const [stats, setStats] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState("")

  const fetchTeams = async () => {
    try {
      const { ok, data, code } = await api.post("/enemy-team/search", { team_id: user?.team_id })
      if (!ok) return toast.error(code)
      setTeams(data)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const fetchStats = async () => {
    try {
      const { ok, data, code } = await api.post("/enemy-team/stats")
      if (!ok) return toast.error(code)
      setStats(data)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    if (!confirm("Delete this team?")) return
    try {
      const { ok, code } = await api.delete(`/enemy-team/${id}`)
      if (!ok) return toast.error(code)
      toast.success("Team deleted")
      fetchTeams()
    } catch (error) {
      toast.error(error.message)
    }
  }

  useEffect(() => {
    fetchTeams()
    fetchStats()
  }, [])

  const getStatsForTeam = name => stats.find(s => s.opponent_name === name)

  const filtered = teams.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="h-full overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 lg:p-8 flex flex-col">
      <div className="max-w-[1800px] mx-auto w-full flex flex-col flex-1 min-h-0 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search teams..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-64 bg-slate-800/50 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none text-sm"
            />
          </div>
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Team
          </button>
        </div>

        {/* List */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden flex-1 min-h-0 flex flex-col">
          <table className="w-full table-fixed">
            <thead className="flex-shrink-0">
              <tr className="border-b border-slate-700/50">
                <th className="w-[30%] text-left text-slate-400 text-xs font-medium uppercase tracking-wider px-6 py-3">Team</th>
                <th className="w-[15%] text-center text-slate-400 text-xs font-medium uppercase tracking-wider px-4 py-3">League</th>
                <th className="w-[15%] text-center text-slate-400 text-xs font-medium uppercase tracking-wider px-4 py-3">Record</th>
                <th className="w-[15%] text-center text-slate-400 text-xs font-medium uppercase tracking-wider px-4 py-3">Win Rate</th>
                <th className="w-[15%] text-center text-slate-400 text-xs font-medium uppercase tracking-wider px-4 py-3">Contact</th>
                <th className="w-[10%] text-center text-slate-400 text-xs font-medium uppercase tracking-wider px-4 py-3">Actions</th>
              </tr>
            </thead>
          </table>
          <div className="overflow-y-auto flex-1">
            <table className="w-full table-fixed">
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-slate-500 py-12 text-sm">
                      {teams.length === 0 ? "No opponent teams yet" : "No teams match your search"}
                    </td>
                  </tr>
                ) : (
                  filtered.map(team => {
                    const s = getStatsForTeam(team.name)
                    return (
                      <tr
                        key={team._id}
                        onClick={() => navigate(`/opponents/${team._id}`)}
                        className="border-b border-slate-700/30 hover:bg-slate-700/20 cursor-pointer transition-colors"
                      >
                        <td className="w-[30%] px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className="text-white font-medium text-sm truncate">{team.name}</span>
                          </div>
                        </td>
                        <td className="w-[15%] px-4 py-4 text-center">
                          <span className="text-slate-400 text-sm">{team.league || "—"}</span>
                        </td>
                        <td className="w-[15%] px-4 py-4 text-center">
                          {s ? (
                            <span className="text-sm">
                              <span className="text-emerald-400 font-semibold">{s.wins}W</span>
                              <span className="text-slate-500 mx-1">-</span>
                              <span className="text-red-400 font-semibold">{s.losses}L</span>
                            </span>
                          ) : (
                            <span className="text-slate-500 text-sm">—</span>
                          )}
                        </td>
                        <td className="w-[15%] px-4 py-4 text-center">
                          {s ? (
                            <span className={`text-sm font-bold ${s.win_rate >= 0.5 ? "text-emerald-400" : "text-red-400"}`}>{Math.round(s.win_rate * 100)}%</span>
                          ) : (
                            <span className="text-slate-500 text-sm">—</span>
                          )}
                        </td>
                        <td className="w-[15%] px-4 py-4 text-center">
                          <span className="text-slate-400 text-sm truncate">{team.contact_name || "—"}</span>
                        </td>
                        <td className="w-[10%] px-4 py-4 text-center">
                          <button onClick={e => handleDelete(e, team._id)} className="p-1.5 text-slate-400 hover:text-red-400 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AddTeamModal isOpen={isOpen} setIsOpen={setIsOpen} onCreated={fetchTeams} navigate={navigate} />
    </div>
  )
}

function AddTeamModal({ isOpen, setIsOpen, onCreated, navigate }) {
  const [name, setName] = useState("")
  const [league, setLeague] = useState("")

  const handleAdd = async () => {
    if (!name.trim()) return toast.error("Enter a team name")
    try {
      const { ok, data, code } = await api.post("/enemy-team", { name: name.trim(), league: league.trim() })
      if (!ok) return toast.error(code)
      setName("")
      setLeague("")
      setIsOpen(false)
      onCreated()
      navigate(`/opponents/${data._id}`)
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} className="w-full max-w-md bg-slate-800 border border-slate-700">
      <div className="p-6 space-y-5">
        <h3 className="text-white text-lg font-semibold">Add Opponent Team</h3>
        <div>
          <label className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1.5 block">Team Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            placeholder="e.g. T1, GenG, HLE..."
            className="w-full px-4 py-2.5 rounded-lg border border-slate-600 bg-slate-700/50 text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none text-sm"
            autoFocus
          />
        </div>
        <div>
          <label className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1.5 block">League (optional)</label>
          <input
            type="text"
            value={league}
            onChange={e => setLeague(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            placeholder="e.g. LCK, LEC, LFL..."
            className="w-full px-4 py-2.5 rounded-lg border border-slate-600 bg-slate-700/50 text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none text-sm"
          />
        </div>
        <div className="flex items-center justify-end gap-3">
          <button onClick={handleAdd} className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded-lg text-sm transition-colors">
            Add Team
          </button>
        </div>
      </div>
    </Modal>
  )
}
