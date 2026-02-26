import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import { Plus, Target, Trash2, Loader2 } from "lucide-react"
import api from "@/services/api"

// ==================== OBJECTIVES TAB ====================
export default function ObjectivesTab({ playerId, playerName }) {
  const [objectives, setObjectives] = useState([])
  const [newName, setNewName] = useState("")
  const [newRequest, setNewRequest] = useState("")
  const [loadingObjectives, setLoadingObjectives] = useState(false)

  const fetchObjectives = async () => {
    try {
      const { ok, data, code } = await api.post("/solo-objectif/search", { player_id: playerId })
      if (!ok) return toast.error(code || "Failed to fetch objectives")
      setObjectives(data)
    } catch (error) {
      toast.error(error.message || "Failed to fetch objectives")
    }
  }

  useEffect(() => {
    fetchObjectives()
  }, [playerId])

  const addObjective = async () => {
    if (!newName.trim()) return
    try {
      setLoadingObjectives(true)
      const { ok, data, code } = await api.post("/solo-objectif", { name: newName.trim(), request: newRequest.trim(), player_id: playerId, player_name: playerName })
      if (!ok) return toast.error(code || "Failed to add objective")
      setObjectives(prev => [data, ...prev])
      setNewName("")
      setNewRequest("")
    } catch (error) {
      toast.error(error.message || "Failed to add objective")
    } finally {
      setLoadingObjectives(false)
    }
  }

  const deleteObjective = async id => {
    try {
      const { ok, code } = await api.delete(`/solo-objectif/${id}`)
      if (!ok) return toast.error(code || "Failed to delete objective")
      setObjectives(prev => prev.filter(o => o._id !== id))
    } catch (error) {
      toast.error(error.message || "Failed to delete objective")
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 gap-3">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex flex-col">
          <span className="text-slate-500 text-xs uppercase tracking-wider">Objectives</span>
          <span className="text-2xl font-bold mt-1 text-violet-400">{objectives.length}</span>
        </div>
      </div>

      {/* Add Objective */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 space-y-3">
        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
          <Plus className="w-4 h-4 text-emerald-400" />
          New Objective
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addObjective()}
            placeholder="Objective name..."
            className="flex-1 bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-slate-600"
          />
          <input
            type="text"
            value={newRequest}
            onChange={e => setNewRequest(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addObjective()}
            placeholder="Description (optional)..."
            className="flex-1 bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-slate-600"
          />
          <button
            onClick={addObjective}
            disabled={!newName.trim()}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-white text-sm font-medium transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {/* Objectives List */}
      {objectives.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-12 text-center">
          <Target className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-500">No objectives yet. Add one above.</p>
        </div>
      ) : loadingObjectives ? (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-12 text-center">
          <Loader2 className="w-8 h-8 text-slate-600 mx-auto mb-2 animate-spin" />
          <p className="text-slate-500">Loading objectives...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {objectives.map(obj => (
            <div key={obj._id} className="bg-slate-800/50 border border-slate-700/50 rounded-xl transition-colors">
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{obj.name}</p>
                  {obj.request && <p className="text-xs text-slate-500 mt-0.5 truncate">{obj.request}</p>}
                </div>
                <button onClick={() => deleteObjective(obj._id)} className="p-1 rounded hover:bg-red-500/20 transition-colors">
                  <Trash2 className="w-4 h-4 text-slate-600 hover:text-red-400 transition-colors" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
