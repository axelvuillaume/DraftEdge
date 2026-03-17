import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import { Search, Trophy, ChevronDown } from "lucide-react"
import { useNavigate } from "react-router-dom"
import api from "@/services/api"
import useStore from "@/services/store"
export default function List() {
  const navigate = useNavigate()
  const { team } = useStore()
  const [teams, setTeams] = useState([])
  const [league, setLeague] = useState(null)
  const [filters, setFilters] = useState({ search: "", sort: "lp" })

  const fetchLeague = async () => {
    try {
      const { ok, data, code } = await api.get(`/league/${team.league_id}`)
      if (!ok) return toast.error(code || "Failed to fetch league")
      setLeague(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch league")
    }
  }

  const fetchTeams = async () => {
    try {
      const { ok, data, code } = await api.post("/team-league/search", { league_id: team.league_id, ...filters })
      if (!ok) return toast.error(code || "Failed to fetch teams")
      setTeams(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch teams")
    }
  }

  useEffect(() => {
    if (team?.league_id) fetchLeague()
  }, [team])

  useEffect(() => {
    if (team?.league_id) fetchTeams()
  }, [team, filters])

  if (!team?.league_id) return <LeagueSelector />
  if (!league) return null

  return (
    <div className="h-full overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 lg:p-8 flex flex-col">
      <div className="max-w-[1800px] mx-auto w-full flex flex-col flex-1 min-h-0 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                {league.name}
              </h1>
              {league.description && <p className="text-sm text-slate-400 mt-0.5">{league.description}</p>}
              <div className="flex items-center gap-3 mt-1">
                {league.region && <span className="text-xs text-slate-500">{league.region}</span>}
                {league.tier && <span className="text-xs text-slate-500">Tier: {league.tier}</span>}
                <span className="text-xs text-slate-500">{teams.length} teams</span>
              </div>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search teams..."
              value={filters.search}
              onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-64 bg-slate-800/50 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none text-sm"
            />
          </div>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs text-slate-500">Sort by:</span>
          <div className="relative">
            <select
              value={filters.sort}
              onChange={e => setFilters(prev => ({ ...prev, sort: e.target.value }))}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700/50 text-slate-300 border border-slate-600/50 focus:border-amber-500 focus:outline-none appearance-none pr-8 cursor-pointer"
            >
              <option value="">Alphabet</option>
              <option value="lp">Total LP</option>
              <option value="points">Points</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden flex-1 min-h-0 flex flex-col">
          <table className="w-full table-fixed">
            <thead className="flex-shrink-0">
              <tr className="border-b border-slate-700/50">
                <th className="w-[4%] text-center text-slate-400 text-xs font-medium uppercase tracking-wider px-2 py-3">#</th>
                <th className="w-[18%] text-left text-slate-400 text-xs font-medium uppercase tracking-wider px-6 py-3">Team</th>
                <th className="w-[12%] text-center text-slate-400 text-xs font-medium uppercase tracking-wider px-4 py-3">Total LP</th>
                <th className="w-[10%] text-center text-slate-400 text-xs font-medium uppercase tracking-wider px-4 py-3">Points</th>
                <th className="w-[10%] text-center text-slate-400 text-xs font-medium uppercase tracking-wider px-4 py-3">Players</th>
                <th className="w-[10%] text-center text-slate-400 text-xs font-medium uppercase tracking-wider px-4 py-3">Staff</th>
                <th className="w-[18%] text-center text-slate-400 text-xs font-medium uppercase tracking-wider px-4 py-3">Manager</th>
                <th className="w-[18%] text-center text-slate-400 text-xs font-medium uppercase tracking-wider px-4 py-3">Captain</th>
              </tr>
            </thead>
          </table>
          <div className="overflow-y-auto flex-1">
            <table className="w-full table-fixed">
              <tbody>
                {teams.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center text-slate-500 py-12 text-sm">
                      {filters.search ? "No teams match your search" : "No teams in this league yet"}
                    </td>
                  </tr>
                ) : (
                  teams.map((t, i) => (
                    <tr key={t._id} onClick={() => navigate(`/league/${t._id}`)} className="border-b border-slate-700/30 hover:bg-slate-700/20 cursor-pointer transition-colors">
                      <td className="w-[4%] px-2 py-4 text-center">
                        <span className="text-slate-500 text-sm font-medium">{i + 1}</span>
                      </td>
                      <td className="w-[18%] px-6 py-4">
                        <span className="text-white font-medium text-sm truncate">{t.name}</span>
                      </td>
                      <td className="w-[12%] px-4 py-4 text-center">
                        <span className="text-amber-400 text-sm font-medium">{t.total_lp || 0}</span>
                      </td>
                      <td className="w-[10%] px-4 py-4 text-center">
                        <span className="text-amber-400 text-sm font-medium">{t.points || 0}</span>
                      </td>
                      <td className="w-[10%] px-4 py-4 text-center">
                        <span className="text-slate-400 text-sm">{t.players_ids?.length || 0}</span>
                      </td>
                      <td className="w-[10%] px-4 py-4 text-center">
                        <span className="text-slate-400 text-sm">{t.staff?.length || 0}</span>
                      </td>
                      <td className="w-[18%] px-4 py-4 text-center">
                        <span className="text-slate-400 text-sm truncate">{t.discord_manager || "—"}</span>
                      </td>
                      <td className="w-[18%] px-4 py-4 text-center">
                        <span className="text-slate-400 text-sm truncate">{t.discord_captain || "—"}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function LeagueSelector() {
  const { team, setTeam } = useStore()
  const [allLeagues, setAllLeagues] = useState([])
  const [selectedLeagueId, setSelectedLeagueId] = useState("")

  const fetchAllLeagues = async () => {
    try {
      const { ok, data, code } = await api.post("/league/search")
      if (!ok) return toast.error(code || "Failed to fetch leagues")
      setAllLeagues(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch leagues")
    }
  }

  useEffect(() => {
    fetchAllLeagues()
  }, [])

  const handleSelectLeague = async () => {
    if (!selectedLeagueId) return toast.error("Select a league")
    try {
      const selected = allLeagues.find(l => l._id === selectedLeagueId)
      const { ok, code } = await api.put(`/team/${team._id}`, { ...team, league_id: selectedLeagueId, league_name: selected?.name || "" })
      if (!ok) return toast.error(code || "Failed to update team")
      setTeam({ ...team, league_id: selectedLeagueId, league_name: selected?.name || "" })
      toast.success("League updated")
    } catch (error) {
      toast.error(error.code || "Failed to update team")
    }
  }

  return (
    <div className="h-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="w-full max-w-md mx-auto text-center space-y-6">
        <Trophy className="w-16 h-16 text-amber-500/40 mx-auto" />
        <div>
          <h2 className="text-xl font-bold text-white mb-2">Select your League</h2>
          <p className="text-sm text-slate-400">Choose the league your team is competing in</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 space-y-4">
          <div className="relative">
            <select
              value={selectedLeagueId}
              onChange={e => setSelectedLeagueId(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-600 bg-slate-700/50 text-white focus:border-amber-500 focus:outline-none text-sm appearance-none cursor-pointer"
            >
              <option value="">Select a league...</option>
              {allLeagues.map(l => (
                <option key={l._id} value={l._id}>
                  {l.name}
                  {l.region ? ` (${l.region})` : ""}
                  {l.tier ? ` — ${l.tier}` : ""}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
          <button
            onClick={handleSelectLeague}
            disabled={!selectedLeagueId}
            className="w-full px-4 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-semibold rounded-lg transition-colors text-sm"
          >
            Confirm
          </button>
        </div>
        {allLeagues.length === 0 && <p className="text-xs text-slate-500">No leagues available. Contact an admin to create one.</p>}
      </div>
    </div>
  )
}
