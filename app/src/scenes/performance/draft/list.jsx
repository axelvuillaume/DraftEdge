import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import { Plus, Trash2 } from "lucide-react"
import api from "@/services/api"
import useStore from "@/services/store"
import Modal from "@/components/modal"
import OpponentDropdown from "@/components/OpponentDropdown"
import { useNavigate } from "react-router-dom"

export default function List() {
  const navigate = useNavigate()
  const { user } = useStore()
  const [drafts, setDrafts] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [filters, setFilters] = useState({ opponent_id: "", opponent_name: "" })

  const fetchDrafts = async () => {
    try {
      const { ok, data, code } = await api.post("/draft/search", { team_id: user?.team_id, opponent_id: filters.opponent_id })
      if (!ok) return toast.error(code || "Failed to fetch drafts")
      setDrafts(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch drafts")
    }
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    try {
      const { ok, code } = await api.delete(`/draft/${id}`)
      if (!ok) return toast.error(code || "Failed to delete draft")
      toast.success("Draft deleted")
      fetchDrafts()
    } catch (error) {
      toast.error(error.code || "Failed to delete draft")
    }
  }

  useEffect(() => {
    fetchDrafts()
  }, [filters])

  return (
    <div className="h-full overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 lg:p-8 flex flex-col">
      <div className="max-w-[1800px] mx-auto w-full flex flex-col flex-1 min-h-0 space-y-6">
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-white text-xl font-semibold">Draft Preps</h1>
            <OpponentDropdown
              value={filters.opponent_name}
              onChange={team => setFilters(f => ({ ...f, opponent_id: team._id, opponent_name: team.name }))}
              allowClear
            />
          </div>
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Draft
          </button>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden flex-1 min-h-0 flex flex-col">
          <table className="w-full table-fixed">
            <thead className="flex-shrink-0">
              <tr className="border-b border-slate-700/50">
                <th className="w-[35%] text-left text-slate-400 text-xs font-medium uppercase tracking-wider px-6 py-3">Name</th>
                <th className="w-1/4 text-left text-slate-400 text-xs font-medium uppercase tracking-wider px-4 py-3">Opponent</th>
                <th className="w-[15%] text-center text-slate-400 text-xs font-medium uppercase tracking-wider px-4 py-3">Scenarios</th>
                <th className="w-[15%] text-center text-slate-400 text-xs font-medium uppercase tracking-wider px-4 py-3">Date</th>
                <th className="w-[10%] text-center text-slate-400 text-xs font-medium uppercase tracking-wider px-6 py-3">Actions</th>
              </tr>
            </thead>
          </table>
          <div className="overflow-y-auto flex-1">
            <table className="w-full table-fixed">
              <tbody>
                {drafts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-slate-500 py-12 text-sm">
                      No drafts yet
                    </td>
                  </tr>
                )}
                {drafts.map(draft => (
                  <tr
                    key={draft._id}
                    onClick={() => navigate(`/performance/draft/${draft._id}`)}
                    className="border-b border-slate-700/30 hover:bg-slate-700/20 cursor-pointer transition-colors"
                  >
                    <td className="w-[35%] px-6 py-4">
                      <span className="text-white font-medium text-sm">{draft.name || "Untitled"}</span>
                    </td>
                    <td className="w-1/4 px-4 py-4">
                      {draft.opponent_name ? (
                        <span className="text-slate-300 text-sm">{draft.opponent_name}</span>
                      ) : (
                        <span className="text-slate-600 text-sm">—</span>
                      )}
                    </td>
                    <td className="w-[15%] px-4 py-4 text-center">
                      <span className="text-slate-400 text-sm">{draft.scenarioCount || 0}</span>
                    </td>
                    <td className="w-[15%] px-4 py-4 text-center">
                      <span className="text-slate-400 text-sm">
                        {new Date(draft.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })}
                      </span>
                    </td>
                    <td className="w-[10%] px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={e => handleDelete(e, draft._id)} className="p-1.5 text-slate-400 hover:text-red-400 transition-colors">
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

      <AddDraft isOpen={isOpen} setIsOpen={setIsOpen} onCreated={fetchDrafts} />
    </div>
  )
}

function AddDraft({ isOpen, setIsOpen, onCreated }) {
  const navigate = useNavigate()
  const [draft, setDraft] = useState({ name: "", opponent_id: "", opponent_name: "" })

  const handleAdd = async () => {
    if (!draft.name.trim()) return toast.error("Enter a draft name")
    try {
      const { ok, data, code } = await api.post("/draft", { ...draft, name: draft.name.trim() })
      if (!ok) return toast.error(code || "Failed to create draft")
      setDraft({ name: "", opponent_id: "", opponent_name: "" })
      setIsOpen(false)
      onCreated()
      navigate(`/performance/draft/${data._id}`)
    } catch (error) {
      toast.error(error.code || "Failed to create draft")
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} className="w-full max-w-md bg-slate-800 border border-slate-700">
      <div className="p-6 space-y-5">
        <h3 className="text-white text-lg font-semibold">New Draft</h3>
        <div>
          <label className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1.5 block">Draft Name</label>
          <input
            type="text"
            value={draft.name}
            onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            placeholder="e.g. Draft Yunara vs T1"
            className="w-full px-4 py-2.5 rounded-lg border border-slate-600 bg-slate-700/50 text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none text-sm"
            autoFocus
          />
        </div>
        <div>
          <label className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1.5 block">Opponent (optional)</label>
          <OpponentDropdown value={draft.opponent_name} onChange={team => setDraft(d => ({ ...d, opponent_id: team._id, opponent_name: team.name }))} allowClear />
        </div>
        <div className="flex items-center justify-end gap-3">
          <button onClick={handleAdd} className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded-lg text-sm transition-colors">
            Create
          </button>
        </div>
      </div>
    </Modal>
  )
}
