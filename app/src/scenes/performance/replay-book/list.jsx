import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import { Plus, Trash2, Search, Video } from "lucide-react"
import api from "@/services/api"
import useStore from "@/services/store"
import Modal from "@/components/modal"
import { useNavigate } from "react-router-dom"

export default function List() {
  const navigate = useNavigate()
  const { user } = useStore()
  const [replays, setReplays] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [filters, setFilters] = useState({ search: "" })

  const fetchReplays = async () => {
    try {
      const { ok, data, code } = await api.post("/replay-book/search", { team_id: user?.team_id, ...filters })
      if (!ok) return toast.error(code || "Failed to fetch replays")
      setReplays(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch replays")
    }
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    try {
      const { ok, code } = await api.delete(`/replay-book/${id}`)
      if (!ok) return toast.error(code || "Failed to delete replay")
      toast.success("Replay deleted")
      fetchReplays()
    } catch (error) {
      toast.error(error.code || "Failed to delete replay")
    }
  }

  useEffect(() => {
    fetchReplays()
  }, [filters])

  return (
    <div className="h-full overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 lg:p-8 flex flex-col">
      <div className="max-w-[1800px] mx-auto w-full flex flex-col flex-1 min-h-0 space-y-6">
        <div className="flex items-center justify-between flex-shrink-0">
          <h1 className="text-white text-xl font-semibold">Replay Book</h1>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={filters.search}
                onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10 pr-4 py-2 rounded-lg border border-slate-600 bg-slate-700/50 text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none text-sm w-64"
              />
            </div>
            <button
              onClick={() => setIsOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Replay
            </button>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden flex-1 min-h-0 flex flex-col">
          <table className="w-full table-fixed">
            <thead className="flex-shrink-0">
              <tr className="border-b border-slate-700/50">
                <th className="w-2/5 text-left text-slate-400 text-xs font-medium uppercase tracking-wider px-6 py-3">Name</th>
                <th className="w-1/5 text-center text-slate-400 text-xs font-medium uppercase tracking-wider px-4 py-3">Notes</th>
                <th className="w-1/5 text-center text-slate-400 text-xs font-medium uppercase tracking-wider px-4 py-3">Date</th>
                <th className="w-1/5 text-center text-slate-400 text-xs font-medium uppercase tracking-wider px-6 py-3">Actions</th>
              </tr>
            </thead>
          </table>
          <div className="overflow-y-auto flex-1">
            <table className="w-full table-fixed">
              <tbody>
                {replays.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-slate-500 py-12 text-sm">
                      No replays yet
                    </td>
                  </tr>
                )}
                {replays.map(replay => (
                  <tr
                    key={replay._id}
                    onClick={() => navigate(`/scrim-hub/replay-book/${replay._id}`)}
                    className="border-b border-slate-700/30 hover:bg-slate-700/20 cursor-pointer transition-colors"
                  >
                    <td className="w-2/5 px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Video className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        <span className="text-white font-medium text-sm truncate">{replay.name || "Untitled"}</span>
                      </div>
                    </td>
                    <td className="w-1/5 px-4 py-4 text-center">
                      <span className="text-slate-400 text-sm">{(replay.notes || []).length}</span>
                    </td>
                    <td className="w-1/5 px-4 py-4 text-center">
                      <span className="text-slate-400 text-sm">
                        {new Date(replay.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                      </span>
                    </td>
                    <td className="w-1/5 px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={e => handleDelete(e, replay._id)} className="p-1.5 text-slate-400 hover:text-red-400 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AddReplay isOpen={isOpen} setIsOpen={setIsOpen} onCreated={fetchReplays} />
    </div>
  )
}

function AddReplay({ isOpen, setIsOpen, onCreated }) {
  const navigate = useNavigate()
  const { user } = useStore()
  const [replay, setReplay] = useState({ name: "", link: "" })

  const handleCreate = async () => {
    if (!replay.name.trim()) return toast.error("Enter a name")
    if (!replay.link.trim()) return toast.error("Enter a YouTube link")
    try {
      const { ok, data, code } = await api.post("/replay-book", { ...replay, team_id: user?.team_id, team_name: user?.team_name })
      if (!ok) return toast.error(code || "Failed to create replay")
      setReplay({ name: "", link: "" })
      setIsOpen(false)
      onCreated()
      navigate(`/scrim-hub/replay-book/${data._id}`)
    } catch (error) {
      toast.error(error.code || "Failed to create replay")
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} className="w-full max-w-md bg-slate-800 border border-slate-700">
      <div className="p-6 space-y-5">
        <h3 className="text-white text-lg font-semibold">New Replay</h3>
        <div className="space-y-4">
          <div>
            <label className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1.5 block">Name</label>
            <input
              type="text"
              value={replay.name}
              onChange={e => setReplay(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. T1 vs GenG - Game 3"
              className="w-full px-4 py-2.5 rounded-lg border border-slate-600 bg-slate-700/50 text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none text-sm"
              autoFocus
            />
          </div>
          <div>
            <label className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1.5 block">YouTube Link</label>
            <input
              type="text"
              value={replay.link}
              onChange={e => setReplay(prev => ({ ...prev, link: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && handleCreate()}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full px-4 py-2.5 rounded-lg border border-slate-600 bg-slate-700/50 text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none text-sm"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3">
          <button onClick={handleCreate} className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded-lg text-sm transition-colors">
            Create
          </button>
        </div>
      </div>
    </Modal>
  )
}
