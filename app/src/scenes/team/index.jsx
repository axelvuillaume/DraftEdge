import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import { UserPlus } from "lucide-react"
import api from "@/services/api"
import useStore from "@/services/store"

export default function Team() {
  const { user } = useStore()
  const [team, setTeam] = useState([])

  const fetchTeam = async () => {
    try {
      const { ok, data, code } = await api.post("/user/search", { team_id: user?.team_id })
      if (!ok) return toast.error(code || "Failed to fetch team members")
      setTeam(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch team members")
    }
  }

  useEffect(() => {
    fetchTeam()
  }, [])

  const copyInvitationLink = () => {
    const link = `${window.location.origin}/auth/signup?team_id=${user?.team_id}`
    navigator.clipboard.writeText(link)
    toast.success("Invitation link copied to clipboard!")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 lg:p-8">
      <div className="max-w-[1800px] mx-auto">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-400">Name</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-400">Email</th>
              </tr>
            </thead>
            <tbody>
              {team.map(member => (
                <tr key={member._id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-white font-medium">{member.name || "No name"}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-400">{member.email}</td>
                </tr>
              ))}
              <tr className="bg-slate-800/30 hover:bg-slate-700/40 transition-colors cursor-pointer" onClick={copyInvitationLink}>
                <td colSpan="2" className="px-6 py-6">
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
