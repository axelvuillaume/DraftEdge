import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import { Plus, Trash2 } from "lucide-react"
import api from "@/services/api"
import useStore from "@/services/store"
import Modal from "@/components/modal"
import { useNavigate } from "react-router-dom"

export default function List() {
  const navigate = useNavigate()
  const { user } = useStore()
  const [maps, setMaps] = useState([])
  const [isOpen, setIsOpen] = useState(false)

  const fetchMaps = async () => {
    try {
      const { ok, data, code } = await api.post("/strat-map/search", { team_id: user?.team_id })
      if (!ok) return toast.error(code || "Failed to fetch maps")
      setMaps(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch maps")
    }
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    try {
      const { ok, code } = await api.delete(`/strat-map/${id}`)
      if (!ok) return toast.error(code || "Failed to delete map")
      toast.success("Map deleted")
      fetchMaps()
    } catch (error) {
      toast.error(error.code || "Failed to delete map")
    }
  }

  useEffect(() => {
    fetchMaps()
  }, [])

  return (
    <div className="h-full overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 lg:p-8 flex flex-col">
      <div className="max-w-[1800px] mx-auto w-full flex flex-col flex-1 min-h-0 space-y-6">
        <div className="flex items-center justify-between flex-shrink-0">
          <h1 className="text-white text-xl font-semibold">Strategy Maps</h1>
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Map
          </button>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden flex-1 min-h-0 flex flex-col">
          <table className="w-full table-fixed">
            <thead className="flex-shrink-0">
              <tr className="border-b border-slate-700/50">
                <th className="w-1/2 text-left text-slate-400 text-xs font-medium uppercase tracking-wider px-6 py-3">Name</th>
                <th className="w-1/4 text-center text-slate-400 text-xs font-medium uppercase tracking-wider px-4 py-3">Date</th>
                <th className="w-1/4 text-center text-slate-400 text-xs font-medium uppercase tracking-wider px-6 py-3">Actions</th>
              </tr>
            </thead>
          </table>
          <div className="overflow-y-auto flex-1">
            <table className="w-full table-fixed">
              <tbody>
                {maps.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center text-slate-500 py-12 text-sm">
                      No strategy maps yet
                    </td>
                  </tr>
                )}
                {maps.map(m => (
                  <tr
                    key={m._id}
                    onClick={() => navigate(`/scrim-hub/map/${m._id}`)}
                    className="border-b border-slate-700/30 hover:bg-slate-700/20 cursor-pointer transition-colors"
                  >
                    <td className="w-1/2 px-6 py-4">
                      <span className="text-white font-medium text-sm">{m.name || "Untitled"}</span>
                    </td>
                    <td className="w-1/4 px-4 py-4 text-center">
                      <span className="text-slate-400 text-sm">
                        {new Date(m.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                      </span>
                    </td>
                    <td className="w-1/4 px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={e => handleDelete(e, m._id)} className="p-1.5 text-slate-400 hover:text-red-400 transition-colors">
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

      <AddMap isOpen={isOpen} setIsOpen={setIsOpen} onCreated={fetchMaps} />
    </div>
  )
}

function AddMap({ isOpen, setIsOpen, onCreated }) {
  const navigate = useNavigate()
  const [name, setName] = useState("")

  const handleAdd = async () => {
    if (!name.trim()) return toast.error("Enter a map name")
    try {
      const { ok, data, code } = await api.post("/strat-map", { name: name.trim() })
      if (!ok) return toast.error(code || "Failed to create map")
      setName("")
      setIsOpen(false)
      onCreated()
      navigate(`/scrim-hub/map/${data._id}`)
    } catch (error) {
      toast.error(error.code || "Failed to create map")
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} className="w-full max-w-md bg-slate-800 border border-slate-700">
      <div className="p-6 space-y-5">
        <h3 className="text-white text-lg font-semibold">New Strategy Map</h3>
        <div>
          <label className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1.5 block">Map Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            placeholder="e.g. Early game ward setup vs T1"
            className="w-full px-4 py-2.5 rounded-lg border border-slate-600 bg-slate-700/50 text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none text-sm"
            autoFocus
          />
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
