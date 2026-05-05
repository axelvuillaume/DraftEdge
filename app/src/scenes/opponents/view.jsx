import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { toast } from "react-hot-toast"
import { ArrowLeft, Save, ExternalLink, Trophy, Swords, Users } from "lucide-react"
import api from "@/services/api"
import useStore from "@/services/store"

export default function View({ stats }) {
  const { id } = useParams()
  const navigate = useNavigate()

  const [team, setTeam] = useState(null)

  const fetchTeam = async () => {
    try {
      const { ok, data, code } = await api.get(`/enemy-team/${id}`)
      if (!ok) return toast.error(code || "Failed to load team")
      setTeam(data)
    } catch (error) {
      toast.error(error.code || "Failed to load team")
    }
  }

  useEffect(() => {
    fetchTeam()
  }, [id])

  const teamStats = team && stats ? stats.find(s => s.opponent_name === team.name) : null

  const handleSave = async () => {
    try {
      const { ok, code } = await api.put(`/enemy-team/${id}`, team)
      if (!ok) return toast.error(code || "Failed to save")
      toast.success("Saved")
    } catch (error) {
      toast.error(error.code || "Failed to save")
    }
  }

  if (!team) {
    return (
      <div className="min-h-[calc(100vh-65px)] flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <p className="text-slate-400">Team not found</p>
      </div>
    )
  }

  const wrColor = teamStats && teamStats.win_rate >= 0.5 ? "text-emerald-400" : "text-red-400"

  return (
    <div className="min-h-[calc(100vh-65px)] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 lg:p-8">
      <div className="max-w-[1200px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/manager-space")} className="p-2 text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">{team.name}</h1>
              {team.league && <p className="text-sm text-slate-400 mt-0.5">{team.league}</p>}
            </div>
          </div>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 font-semibold rounded-lg transition-colors"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
        </div>

        {/* Stats Summary (from games) */}
        {teamStats && (
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Swords className="w-4 h-4 text-teal-400" />
                <p className="text-xs text-slate-400">Games</p>
              </div>
              <p className="text-2xl font-bold text-white">{teamStats.total_games}</p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="w-4 h-4 text-emerald-400" />
                <p className="text-xs text-slate-400">Record</p>
              </div>
              <p className="text-2xl font-bold">
                <span className="text-emerald-400">{teamStats.wins}W</span>
                <span className="text-slate-500 mx-1">-</span>
                <span className="text-red-400">{teamStats.losses}L</span>
              </p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="w-4 h-4 text-amber-400" />
                <p className="text-xs text-slate-400">Win Rate</p>
              </div>
              <p className={`text-2xl font-bold ${wrColor}`}>{Math.round(teamStats.win_rate * 100)}%</p>
            </div>
            <button
              onClick={() => navigate("/stats-team/games", { state: { opponent_id: team._id } })}
              className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:border-amber-500/50 transition-all group text-left"
            >
              <div className="flex items-center gap-2 mb-1">
                <Swords className="w-4 h-4 text-amber-400" />
                <p className="text-xs text-slate-400">View Games</p>
              </div>
              <p className="text-sm font-medium text-slate-300 group-hover:text-amber-400 transition-colors">See all games vs {team.name}</p>
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Info */}
          <div className="space-y-6">
            {/* Roster */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-500" />
                <h2 className="text-white font-semibold text-sm uppercase tracking-wider opacity-70">Roster ({team.players_ids?.length || 0})</h2>
              </div>
              {team.players_ids?.length > 0 ? (
                <div className="space-y-2">
                  {team.players_ids.map((riotId, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2.5 bg-slate-700/30 rounded-lg">
                      <span className="text-white text-sm flex-1">{riotId}</span>
                      <a
                        href={`https://dpm.lol/${encodeURIComponent(riotId.replace("#", "-"))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-slate-600/80 transition-all flex-shrink-0"
                      >
                        <img src="/dpm_full_logo.png" alt="DPM.lol" className="h-4 object-contain" />
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm">No players found — import a game against this team to auto-detect the roster</p>
              )}
            </div>

            {/* Team Info */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-4">
              <h2 className="text-white font-semibold text-sm uppercase tracking-wider opacity-70">Team Info</h2>
              <div>
                <label className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1.5 block">League</label>
                <input
                  type="text"
                  value={team.league || ""}
                  onChange={e => setTeam(prev => ({ ...prev, league: e.target.value }))}
                  placeholder="e.g. LCK, LEC, LFL..."
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-600 bg-slate-700/50 text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none text-sm"
                />
              </div>
              <div>
                <label className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1.5 block">Multi OP.GG</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={team.multi_opgg || ""}
                    onChange={e => setTeam(prev => ({ ...prev, multi_opgg: e.target.value }))}
                    placeholder="https://www.op.gg/multisearch/..."
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-600 bg-slate-700/50 text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none text-sm"
                  />
                  {team.multi_opgg && (
                    <a
                      href={team.multi_opgg}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-400 hover:text-amber-400 transition-colors flex-shrink-0"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-4">
              <h2 className="text-white font-semibold text-sm uppercase tracking-wider opacity-70">Contact</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1.5 block">Name</label>
                  <input
                    type="text"
                    value={team.contact_name || ""}
                    onChange={e => setTeam(prev => ({ ...prev, contact_name: e.target.value }))}
                    placeholder="Manager name"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-600 bg-slate-700/50 text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1.5 block">Role</label>
                  <input
                    type="text"
                    value={team.contact_role || ""}
                    onChange={e => setTeam(prev => ({ ...prev, contact_role: e.target.value }))}
                    placeholder="Manager, Coach..."
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-600 bg-slate-700/50 text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1.5 block">Discord</label>
                  <input
                    type="text"
                    value={team.contact_discord || ""}
                    onChange={e => setTeam(prev => ({ ...prev, contact_discord: e.target.value }))}
                    placeholder="username#1234"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-600 bg-slate-700/50 text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1.5 block">Twitter / X</label>
                  <input
                    type="text"
                    value={team.contact_twitter || ""}
                    onChange={e => setTeam(prev => ({ ...prev, contact_twitter: e.target.value }))}
                    placeholder="@username"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-600 bg-slate-700/50 text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Notes + Detailed Stats */}
          <div className="space-y-6">
            {/* Notes */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-4">
              <h2 className="text-white font-semibold text-sm uppercase tracking-wider opacity-70">Notes</h2>
              <textarea
                value={team.notes || ""}
                onChange={e => setTeam(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Quick notes about this team... (scrim quality, playstyle, availability, etc.)"
                rows={6}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-600 bg-slate-700/50 text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none text-sm resize-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
