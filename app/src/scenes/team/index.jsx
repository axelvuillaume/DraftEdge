import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import { UserPlus, Save, Trash2, Loader2, Check } from "lucide-react"
import api from "@/services/api"
import useStore from "@/services/store"

const ROLES = ["top", "jungle", "mid", "bottom", "support"]
const ROLE_LABELS = { top: "Top", jungle: "Jungle", mid: "Mid", bottom: "ADC", support: "Support" }

export default function Team() {
  const { user } = useStore()
  const [team, setTeam] = useState([])
  const [roster, setRoster] = useState({})
  const [saving, setSaving] = useState(null)

  const fetchTeam = async () => {
    try {
      const { ok, data, code } = await api.post("/user/search", { team_id: user?.team_id })
      if (!ok) return toast.error(code)
      setTeam(data)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const fetchPlayers = async () => {
    try {
      const { ok, data } = await api.post("/player/search", { team_id: user?.team_id })
      if (!ok) return
      const initial = {}
      ROLES.forEach(role => {
        const existing = data.find(p => p.role === role)
        initial[role] = existing
          ? { _id: existing._id, game_name: existing.game_name || "", tag_line: existing.tag_line || "", connected_at: existing.connected_at }
          : { game_name: "", tag_line: "" }
      })
      setRoster(initial)
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    fetchTeam()
    fetchPlayers()
  }, [])

  const handleSaveRole = async role => {
    const { game_name, tag_line, _id } = roster[role] || {}
    if (!game_name?.trim() || !tag_line?.trim()) return toast.error("Summoner name and tag are required")
    setSaving(role)
    try {
      if (_id) {
        const { ok, data, code } = await api.put(`/player/${_id}`, { game_name: game_name.trim(), tag_line: tag_line.trim(), role })
        if (!ok) return toast.error(code)
        setRoster(prev => ({ ...prev, [role]: { ...prev[role], _id: data._id, connected_at: data.connected_at } }))
      } else {
        const { ok, data, code } = await api.post("/player", { game_name: game_name.trim(), tag_line: tag_line.trim(), role })
        if (!ok) return toast.error(code)
        setRoster(prev => ({ ...prev, [role]: { ...prev[role], _id: data._id, connected_at: data.connected_at } }))
      }
      toast.success(`${ROLE_LABELS[role]} saved`)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSaving(null)
    }
  }

  const handleDeleteRole = async role => {
    const { _id } = roster[role] || {}
    if (!_id) {
      setRoster(prev => ({ ...prev, [role]: { game_name: "", tag_line: "" } }))
      return
    }
    try {
      const { ok, code } = await api.delete(`/player/${_id}`)
      if (!ok) return toast.error(code)
      setRoster(prev => ({ ...prev, [role]: { game_name: "", tag_line: "" } }))
      toast.success(`${ROLE_LABELS[role]} removed`)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const copyInvitationLink = () => {
    const link = `${window.location.origin}/auth/signup?team_id=${user?.team_id}&team_name=${user?.team_name}`
    navigator.clipboard.writeText(link)
    toast.success("Invitation link copied to clipboard!")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 lg:p-8">
      <div className="max-w-[1800px] mx-auto space-y-8">
        <div className="flex items-center justify-between"></div>

        {/* Active Roster */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700/50">
            <h2 className="text-white font-semibold">Active Roster</h2>
            <p className="text-slate-400 text-sm mt-0.5">Set up your players Riot IDs to track their SoloQ.</p>
          </div>
          <div className="divide-y divide-slate-700/30">
            {ROLES.map(role => (
              <div key={role} className="flex items-center gap-4 px-6 py-3">
                <span className="text-amber-400 font-semibold text-sm uppercase tracking-wider w-20">{ROLE_LABELS[role]}</span>
                <input
                  type="text"
                  value={roster[role]?.game_name || ""}
                  onChange={e => setRoster(prev => ({ ...prev, [role]: { ...prev[role], game_name: e.target.value } }))}
                  placeholder="Summoner Name"
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-600 bg-slate-700/50 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none transition-all text-sm"
                />
                <div className="flex items-center gap-1">
                  <span className="text-slate-500 text-sm">#</span>
                  <input
                    type="text"
                    value={roster[role]?.tag_line || ""}
                    onChange={e => setRoster(prev => ({ ...prev, [role]: { ...prev[role], tag_line: e.target.value } }))}
                    placeholder="EUW"
                    className="w-24 px-3 py-2 rounded-lg border border-slate-600 bg-slate-700/50 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none transition-all text-sm"
                  />
                </div>
                {roster[role]?.connected_at && (
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center" title="Connected">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                )}
                <button
                  onClick={() => handleSaveRole(role)}
                  disabled={saving === role}
                  className="p-2 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-all disabled:opacity-50"
                >
                  {saving === role ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                </button>
                <button onClick={() => handleDeleteRole(role)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Team Members */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-400">Name</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-400">Email</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-400">Role</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-400">Last Login</th>
              </tr>
            </thead>
            <tbody>
              {team.map(member => (
                <tr key={member._id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-white font-medium">{member.name || "No name"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-400">{member.email}</td>
                  <td className="px-6 py-4 text-slate-400">{member.role}</td>
                  <td className="px-6 py-4 text-slate-400 text-sm">
                    {new Date(member.last_login_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-800/30 hover:bg-slate-700/40 transition-colors cursor-pointer" onClick={copyInvitationLink}>
                <td colSpan="4" className="px-6 py-6">
                  <div className="flex items-center justify-center gap-3 text-amber-500 font-medium">
                    <UserPlus className="w-5 h-5" />
                    <span>Copy invitation link</span>
                    <div className="ml-2 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-[10px] uppercase tracking-wider">Click to copy</div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
