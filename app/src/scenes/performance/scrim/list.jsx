import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import api from "@/services/api"
import useStore from "@/services/store"
import Modal from "@/components/modal"
import { useNavigate } from "react-router-dom"
import { Plus, Target, Trash2, ChevronRight } from "lucide-react"

export default function List() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const { user, globalFilters } = useStore()
  const [showAddSessionModal, setShowAddSessionModal] = useState(false)

  const fetchSessions = async () => {
    try {
      const { ok, data, code } = await api.post("/scrim-session/search", {
        team_id: user?.team_id,
        ...(globalFilters.patch && { patch: globalFilters.patch }),
        ...(globalFilters.opponent_name && { opponent: globalFilters.opponent_name }),
        ...(globalFilters.folder_id && { folder_id: globalFilters.folder_id })
      })
      if (!ok) return toast.error(code)
      setSessions(data)
    } catch (error) {
      toast.error(error.message)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [user?.team_id, globalFilters.patch, globalFilters.opponent_name, globalFilters.folder_id])

  const handleDeleteSession = async id => {
    if (!window.confirm("Are you sure you want to delete this session?")) return
    try {
      const { ok, code } = await api.delete(`/scrim-session/${id}`)
      if (!ok) return toast.error(code)
      fetchSessions()
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4 lg:p-6">
      <div className="max-w-[1800px] mx-auto space-y-5">
        <div className="flex items-center justify-end">
          <button
            onClick={() => setShowAddSessionModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded-lg transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            New Session
          </button>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-700/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-amber-500" />
              <span className="text-white text-sm font-medium">Scrim Sessions</span>
            </div>
            <span className="text-slate-500 text-xs">{sessions.length} sessions</span>
          </div>

          {sessions.length === 0 ? (
            <div className="p-12 text-center">
              <Target className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No scrim sessions yet</p>
              <p className="text-slate-600 text-xs mt-1">Create a new session to start reviewing</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/30">
              {sessions.map(session => (
                <button
                  key={session._id}
                  onClick={() => navigate(`/scrim-hub/scrims/${session._id}`)}
                  className="w-full text-left px-5 py-4 hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">{session.name || "Untitled session"}</p>
                      <p className="text-slate-500 text-xs mt-0.5 truncate">
                        {session.date || "No date"} {session.opponent ? `• vs ${session.opponent}` : ""}
                      </p>
                    </div>
                    <Trash2
                      className="w-4 h-4 text-slate-500 hover:text-red-500 transition-colors cursor-pointer"
                      onClick={e => (e.stopPropagation(), handleDeleteSession(session._id))}
                      title="Delete session"
                    />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => setShowAddSessionModal(true)}
          className="w-full flex items-center justify-between px-5 py-4 bg-slate-800/40 border border-slate-700/30 border-dashed rounded-xl hover:border-amber-500/30 hover:bg-amber-500/5 transition-all group"
        >
          <div className="flex items-center gap-3">
            <Plus className="w-5 h-5 text-slate-500 group-hover:text-amber-500 transition-colors" />
            <span className="text-slate-400 group-hover:text-slate-200 text-sm transition-colors">Start a new scrim session review</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-amber-500 transition-colors" />
        </button>

        <AddSessionModal isOpen={showAddSessionModal} onClose={() => setShowAddSessionModal(false)} onSuccess={sessionId => navigate(`/scrim-hub/scrims/${sessionId}`)} />
      </div>
    </div>
  )
}

function AddSessionModal({ isOpen, onClose, onSuccess }) {
  const [name, setName] = useState("")

  const handleAdd = async () => {
    if (!name.trim()) return
    try {
      const { ok, data, code } = await api.post("/scrim-session", { name })
      if (!ok) return toast.error(code)
      setName("")
      onClose()
      onSuccess(data._id)
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="w-full max-w-md bg-slate-800 p-6">
      <div className="space-y-4">
        <h2 className="text-white font-semibold text-lg">New Session</h2>
        <div>
          <label className="text-slate-400 text-xs font-medium mb-1.5 block">Name</label>
          <input
            type="text"
            placeholder="e.g. Scrim vs Team B"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-slate-700/50 border-0 outline-none ring-0 focus:ring-1 focus:ring-amber-500 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 text-sm"
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={handleAdd}
            disabled={!name.trim()}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 font-semibold rounded-lg transition-colors text-sm"
          >
            Create
          </button>
        </div>
      </div>
    </Modal>
  )
}
