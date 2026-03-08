import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import { Plus, Target, Trash2, Loader2, ChevronDown, ChevronUp, XCircle } from "lucide-react"
import api from "@/services/api"

// ==================== OBJECTIVES TAB ====================
export default function ObjectivesTab({ playerId, playerName }) {
  const [objectives, setObjectives] = useState([])
  const [newName, setNewName] = useState("")
  const [newRequest, setNewRequest] = useState("")
  const [loadingObjectives, setLoadingObjectives] = useState(false)
  const [expandedObjective, setExpandedObjective] = useState(null)

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
      if (expandedObjective === id) setExpandedObjective(null)
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
            disabled={!newName.trim() || loadingObjectives}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-white text-sm font-medium transition-colors flex items-center gap-2"
          >
            {loadingObjectives ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}
          </button>
        </div>
      </div>

      {/* Objectives List */}
      {objectives.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-12 text-center">
          <Target className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-500">No objectives yet. Add one above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {objectives.map(obj => {
            return (
              <div key={obj._id} className="bg-slate-800/50 border border-slate-700/50 rounded-xl transition-colors">
                <div className="flex items-center gap-3 px-4 py-3">
                  <button onClick={() => setExpandedObjective(prev => (prev === obj._id ? null : obj._id))} className="p-1 rounded hover:bg-slate-700/50 transition-colors">
                    {expandedObjective === obj._id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </button>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedObjective(prev => (prev === obj._id ? null : obj._id))}>
                    <p className="text-sm font-medium text-white">{obj.name}</p>
                    {obj.request && <p className="text-xs text-slate-500 mt-0.5 truncate">{obj.request}</p>}
                  </div>
                  <button onClick={() => deleteObjective(obj._id)} className="p-1 rounded hover:bg-red-500/20 transition-colors">
                    <Trash2 className="w-4 h-4 text-slate-600 hover:text-red-400 transition-colors" />
                  </button>
                </div>
                {expandedObjective === obj._id && <ObjectifResult objective={obj} />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ObjectifResult({ objective }) {
  const [results, setResults] = useState([])

  const fetchResults = async () => {
    try {
      const { ok, data, code } = await api.post("/solo-objectif-result/search", { solo_objectif_id: objective._id })
      if (!ok) return toast.error(code || "Failed to fetch results")
      setResults(data)
    } catch (error) {
      toast.error(error.message || "Failed to fetch results")
    }
  }

  useEffect(() => {
    fetchResults()
  }, [objective._id])

  if (results.length === 0) {
    return (
      <div className="border-t border-slate-700/50 px-4 py-4">
        <p className="text-sm text-slate-500 text-center">No results yet.</p>
      </div>
    )
  }

  const failed = results.filter(r => !r.success)
  const successCount = results.filter(r => r.success).length

  return (
    <div className="border-t border-slate-700/50 px-4 py-3 space-y-2">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-slate-500 uppercase tracking-wider">
          {successCount}/{results.length} games passed
        </span>
        {failed.length > 0 && <span className="text-xs text-red-400">{failed.length} failed</span>}
      </div>
      {failed.length === 0 ? (
        <p className="text-sm text-emerald-400/70 text-center py-2">All games passed!</p>
      ) : (
        failed.map(result => (
          <div key={result._id} className="flex items-center gap-3 bg-red-500/5 border border-red-500/10 rounded-lg px-3 py-2">
            <XCircle className="w-4 h-4 text-red-400 shrink-0" />
            <div className="flex-1 min-w-0 flex items-center gap-3">
              {result.champion && <span className="text-xs text-slate-300 font-medium">{result.champion}</span>}
              {result.actual_value !== undefined && <span className="text-xs text-red-400/80">Value: {result.actual_value}</span>}
              {result.matchId && <span className="text-xs text-slate-600">#{result.matchId}</span>}
            </div>
            {result.game_date && <span className="text-xs text-slate-600 shrink-0">{new Date(result.game_date).toLocaleDateString()}</span>}
          </div>
        ))
      )}
    </div>
  )
}
