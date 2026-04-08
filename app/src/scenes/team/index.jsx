import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import { UserPlus, Trash2 } from "lucide-react"
import api from "@/services/api"
import useStore from "@/services/store"

const ROLE_COLORS = {
  admin: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  staff: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  user: "text-slate-400 bg-slate-500/10 border-slate-500/30"
}

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

  const handleRoleChange = async (memberId, newRole) => {
    try {
      const { ok, data, code } = await api.put(`/user/${memberId}`, { role: newRole })
      if (!ok) return toast.error(code || "Failed to update role")
      setTeam(prev => prev.map(m => (m._id === memberId ? { ...m, role: data.role } : m)))
      toast.success("Role updated")
    } catch (error) {
      toast.error(error.code || "Failed to update role")
    }
  }

  const handleDelete = async memberId => {
    if (!window.confirm("Are you sure you want to remove this member?")) return
    try {
      const { ok, code } = await api.delete(`/user/${memberId}`)
      if (!ok) return toast.error(code || "Failed to delete member")
      setTeam(prev => prev.filter(m => m._id !== memberId))
      toast.success("Member removed")
    } catch (error) {
      toast.error(error.code || "Failed to delete member")
    }
  }

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
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-400">Role</th>
                {user?.role === "admin" && <th className="w-12" />}
              </tr>
            </thead>
            <tbody>
              {team.map(member => (
                <tr key={member._id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-white font-medium">{member.name || "No name"}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-400">{member.email}</td>
                  <td className="px-6 py-4">
                    {user?.role === "admin" && member._id !== user?._id ? (
                      <select
                        value={member.role || "user"}
                        onChange={e => handleRoleChange(member._id, e.target.value)}
                        className={`px-3 py-1.5 rounded-lg border text-sm font-medium cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-400/50 ${ROLE_COLORS[member.role || "user"]}`}
                      >
                        <option value="admin">Admin</option>
                        <option value="staff">Staff</option>
                        <option value="user">User</option>
                      </select>
                    ) : (
                      <span className={`px-3 py-1.5 rounded-lg border text-sm font-medium ${ROLE_COLORS[member.role || "user"]}`}>
                        {(member.role || "user").charAt(0).toUpperCase() + (member.role || "user").slice(1)}
                      </span>
                    )}
                  </td>
                  {user?.role === "admin" && (
                    <td className="px-3 py-4">
                      {member._id !== user?._id && (
                        <button onClick={() => handleDelete(member._id)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Remove member">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              <tr className="bg-slate-800/30 hover:bg-slate-700/40 transition-colors cursor-pointer" onClick={copyInvitationLink}>
                <td colSpan={user?.role === "admin" ? 4 : 3} className="px-6 py-6">
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
