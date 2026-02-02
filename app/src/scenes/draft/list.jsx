import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import api from "@/services/api"
import useStore from "@/services/store"
import Modal from "@/components/modal"
import { useNavigate } from "react-router-dom"

export default function List() {
  const navigate = useNavigate()
  const { user } = useStore()
  const [scenarios, setScenarios] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const fetchScenarios = async () => {
    try {
      const { ok, data, code } = await api.post("/draft-scenario/search", { team_id: user?.team_id })
      if (!ok) return toast.error(code)
      setScenarios(data)
    } catch (error) {
      toast.error(error.message)
    }
  }

  useEffect(() => {
    fetchScenarios()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <section>
          <button onClick={() => setIsOpen(true)} className="bg-blue-500 text-white px-4 py-2 rounded-md">
            Add Scenario
          </button>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {scenarios.map((scenario, idx) => (
              <div key={idx} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4" onClick={() => navigate(`/draft/${scenario._id}`)}>
                <h3 className="text-lg font-medium text-white">{scenario.name}</h3>
                <p className="text-sm text-slate-400">{scenario.description}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
      <AddScenario isOpen={isOpen} setIsOpen={setIsOpen} />
    </div>
  )
}

function AddScenario({ isOpen, setIsOpen }) {
  const [name, setName] = useState("")
  const handleAddScenario = async () => {
    try {
      const { ok, data, code } = await api.post("/draft-scenario", { name })
      if (!ok) return toast.error(code)
      setName("")
      setIsOpen(false)
    } catch (error) {
      toast.error(error.message)
    }
  }
  return (
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-white">Add Scenario</h3>
        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 rounded-md border border-slate-700 bg-slate-800/50 text-white" />
        <button onClick={handleAddScenario} className="bg-blue-500 text-white px-4 py-2 rounded-md">
          Add
        </button>
      </div>
    </Modal>
  )
}
