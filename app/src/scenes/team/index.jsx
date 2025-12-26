import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import api from "@/services/api"
import useStore from "@/services/store"

export default function Team() {
  const { user } = useStore()
  const [team, setTeam] = useState([])

  const fetchTeam = async () => {
    try {
      const { ok, data, code } = await api.post("/user/search", { team_id: user?.team_id })
      if (!ok) return toast.error(code)
      setTeam(data)
    } catch (error) {
      toast.error(error.message)
    }
  }

  useEffect(() => {
    fetchTeam()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-6 bg-amber-500 rounded-full" />
          <h2 className="text-xl font-semibold text-white">My Team</h2>
        </div>

        {team.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400">No team members found</p>
          </div>
        ) : (
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
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
