import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { toast } from "react-hot-toast"
import { ArrowLeft, Save, ExternalLink, Trophy, Swords } from "lucide-react"
import api from "@/services/api"
import useStore from "@/services/store"

export default function View() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [team, setTeam] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Editable fields
  const [league, setLeague] = useState("")
  const [multiOpgg, setMultiOpgg] = useState("")
  const [contactName, setContactName] = useState("")
  const [contactRole, setContactRole] = useState("")
  const [contactDiscord, setContactDiscord] = useState("")
  const [contactTwitter, setContactTwitter] = useState("")
  const [notes, setNotes] = useState("")

  const fetchTeam = async () => {
    try {
      const { ok, data, code } = await api.get(`/enemy-team/${id}`)
      if (!ok) return toast.error(code || "Failed to load team")
      setTeam(data)
      setLeague(data.league || "")
      setMultiOpgg(data.multi_opgg || "")
      setContactName(data.contact_name || "")
      setContactRole(data.contact_role || "")
      setContactDiscord(data.contact_discord || "")
      setContactTwitter(data.contact_twitter || "")
      setNotes(data.notes || "")
    } catch (error) {
      toast.error(error.message)
    }
  }

  const fetchStats = async () => {
    try {
      const { ok, data } = await api.post("/enemy-team/stats")
      if (!ok) return toast.error(code)
      setStats(data)
    } catch (error) {
      toast.error(error.message)
    }
  }

  useEffect(() => {
    Promise.all([fetchTeam(), fetchStats()]).finally(() => setLoading(false))
  }, [id])

  const teamStats = team && stats ? stats.find(s => s.opponent_name === team.name) : null

  const handleSave = async () => {
    setSaving(true)
    try {
      const { ok, code } = await api.put(`/enemy-team/${id}`, {
        league,
        multi_opgg: multiOpgg,
        contact_name: contactName,
        contact_role: contactRole,
        contact_discord: contactDiscord,
        contact_twitter: contactTwitter,
        notes
      })
      if (!ok) return toast.error(code)
      toast.success("Saved")
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-65px)] flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
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
            <button onClick={() => navigate("/opponents")} className="p-2 text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">{team.name}</h1>
              {league && <p className="text-sm text-slate-400 mt-0.5">{league}</p>}
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 font-semibold rounded-lg transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save"}
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
              onClick={() => navigate("/games", { state: { opponent_name: team.name } })}
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
            {/* Team Info */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-4">
              <h2 className="text-white font-semibold text-sm uppercase tracking-wider opacity-70">Team Info</h2>
              <div>
                <label className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1.5 block">League</label>
                <input
                  type="text"
                  value={league}
                  onChange={e => setLeague(e.target.value)}
                  placeholder="e.g. LCK, LEC, LFL..."
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-600 bg-slate-700/50 text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none text-sm"
                />
              </div>
              <div>
                <label className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1.5 block">Multi OP.GG</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={multiOpgg}
                    onChange={e => setMultiOpgg(e.target.value)}
                    placeholder="https://www.op.gg/multisearch/..."
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-600 bg-slate-700/50 text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none text-sm"
                  />
                  {multiOpgg && (
                    <a
                      href={multiOpgg}
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
                    value={contactName}
                    onChange={e => setContactName(e.target.value)}
                    placeholder="Manager name"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-600 bg-slate-700/50 text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1.5 block">Role</label>
                  <input
                    type="text"
                    value={contactRole}
                    onChange={e => setContactRole(e.target.value)}
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
                    value={contactDiscord}
                    onChange={e => setContactDiscord(e.target.value)}
                    placeholder="username#1234"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-600 bg-slate-700/50 text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1.5 block">Twitter / X</label>
                  <input
                    type="text"
                    value={contactTwitter}
                    onChange={e => setContactTwitter(e.target.value)}
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
                value={notes}
                onChange={e => setNotes(e.target.value)}
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

