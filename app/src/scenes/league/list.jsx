import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import { Search, Users, Trophy, Shield, ChevronDown } from "lucide-react"
import api from "@/services/api"
import useStore from "@/services/store"
import { useNavigate } from "react-router-dom"

export default function List() {
  const navigate = useNavigate()
  const { user } = useStore()
  const [teams, setTeams] = useState([])
  const [league, setLeague] = useState(null)
  const [teamData, setTeamData] = useState(null)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  // For league selector
  const [allLeagues, setAllLeagues] = useState([])
  const [selectedLeagueId, setSelectedLeagueId] = useState("")
  const [saving, setSaving] = useState(false)

  const fetchData = async () => {
    try {
      // Get team info
      const { ok: okTeam, data: team } = await api.get(`/team/${user.team_id}`)
      if (!okTeam) return toast.error("Failed to load team")
      setTeamData(team)

      if (team.league_id) {
        // Fetch league info and teams in parallel
        const [leagueRes, teamsRes] = await Promise.all([api.get(`/league/${team.league_id}`), api.post("/team-league/search", { league_id: team.league_id })])
        if (leagueRes.ok) setLeague(leagueRes.data)
        if (teamsRes.ok) setTeams(teamsRes.data)
      } else {
        // No league set, fetch all leagues for selector
        const { ok, data } = await api.post("/league/search")
        if (ok) setAllLeagues(data)
      }
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectLeague = async () => {
    if (!selectedLeagueId) return toast.error("Select a league")
    setSaving(true)
    try {
      const selected = allLeagues.find(l => l._id === selectedLeagueId)
      const { ok, code } = await api.put(`/team/${teamData._id}`, {
        league_id: selectedLeagueId,
        league_name: selected?.name || ""
      })
      if (!ok) return toast.error(code || "Failed to update team")
      toast.success("League updated")
      setLoading(true)
      await fetchData()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filtered = teams.filter(t => t.name?.toLowerCase().includes(search.toLowerCase()))

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!league) {
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
              disabled={!selectedLeagueId || saving}
              className="w-full px-4 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-semibold rounded-lg transition-colors text-sm"
            >
              {saving ? "Saving..." : "Confirm"}
            </button>
          </div>
          {allLeagues.length === 0 && <p className="text-xs text-slate-500">No leagues available. Contact an admin to create one.</p>}
        </div>
      </div>
    )
  }

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
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-64 bg-slate-800/50 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none text-sm"
            />
          </div>
        </div>

        {/* List */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden flex-1 min-h-0 flex flex-col">
          <table className="w-full table-fixed">
            <thead className="flex-shrink-0">
              <tr className="border-b border-slate-700/50">
                <th className="w-[30%] text-left text-slate-400 text-xs font-medium uppercase tracking-wider px-6 py-3">Team</th>
                <th className="w-[20%] text-center text-slate-400 text-xs font-medium uppercase tracking-wider px-4 py-3">Players</th>
                <th className="w-[20%] text-center text-slate-400 text-xs font-medium uppercase tracking-wider px-4 py-3">Staff</th>
                <th className="w-[15%] text-center text-slate-400 text-xs font-medium uppercase tracking-wider px-4 py-3">Manager</th>
                <th className="w-[15%] text-center text-slate-400 text-xs font-medium uppercase tracking-wider px-4 py-3">Captain</th>
              </tr>
            </thead>
          </table>
          <div className="overflow-y-auto flex-1">
            <table className="w-full table-fixed">
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-slate-500 py-12 text-sm">
                      {teams.length === 0 ? "No teams in this league yet" : "No teams match your search"}
                    </td>
                  </tr>
                ) : (
                  filtered.map(team => (
                    <tr
                      key={team._id}
                      onClick={() => navigate(`/league/${team._id}`)}
                      className="border-b border-slate-700/30 hover:bg-slate-700/20 cursor-pointer transition-colors"
                    >
                      <td className="w-[30%] px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="text-white font-medium text-sm truncate">{team.name}</span>
                        </div>
                      </td>
                      <td className="w-[20%] px-4 py-4 text-center">
                        <span className="text-slate-400 text-sm">{team.players?.length || 0}</span>
                      </td>
                      <td className="w-[20%] px-4 py-4 text-center">
                        <span className="text-slate-400 text-sm">{team.staff?.length || 0}</span>
                      </td>
                      <td className="w-[15%] px-4 py-4 text-center">
                        <span className="text-slate-400 text-sm truncate">{team.discord_manager || "—"}</span>
                      </td>
                      <td className="w-[15%] px-4 py-4 text-center">
                        <span className="text-slate-400 text-sm truncate">{team.discord_captain || "—"}</span>
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
