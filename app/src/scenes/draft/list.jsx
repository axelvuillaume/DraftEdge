import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import { Plus, Trash2, X, Search, Star, Shuffle } from "lucide-react"
import api from "@/services/api"
import useStore from "@/services/store"
import Modal from "@/components/modal"
import { useNavigate } from "react-router-dom"

const ALL_CHAMPIONS = [
  "Aatrox",
  "Ahri",
  "Akali",
  "Akshan",
  "Alistar",
  "Ambessa",
  "Amumu",
  "Anivia",
  "Annie",
  "Aphelios",
  "Ashe",
  "AurelionSol",
  "Aurora",
  "Azir",
  "Bard",
  "BelVeth",
  "Blitzcrank",
  "Brand",
  "Braum",
  "Briar",
  "Caitlyn",
  "Camille",
  "Cassiopeia",
  "ChoGath",
  "Corki",
  "Darius",
  "Diana",
  "DrMundo",
  "Draven",
  "Ekko",
  "Elise",
  "Evelynn",
  "Ezreal",
  "FiddleSticks",
  "Fiora",
  "Fizz",
  "Galio",
  "Gangplank",
  "Garen",
  "Gnar",
  "Gragas",
  "Graves",
  "Gwen",
  "Hecarim",
  "Heimerdinger",
  "Hwei",
  "Illaoi",
  "Irelia",
  "Ivern",
  "Janna",
  "JarvanIV",
  "Jax",
  "Jayce",
  "Jhin",
  "Jinx",
  "KSante",
  "KaiSa",
  "Kalista",
  "Karma",
  "Karthus",
  "Kassadin",
  "Katarina",
  "Kayle",
  "Kayn",
  "Kennen",
  "KhaZix",
  "Kindred",
  "Kled",
  "KogMaw",
  "LeBlanc",
  "LeeSin",
  "Leona",
  "Lillia",
  "Lissandra",
  "Lucian",
  "Lulu",
  "Lux",
  "Malphite",
  "Malzahar",
  "Maokai",
  "MasterYi",
  "Milio",
  "MissFortune",
  "Mordekaiser",
  "Morgana",
  "Naafiri",
  "Nami",
  "Nasus",
  "Nautilus",
  "Neeko",
  "Nidalee",
  "Nilah",
  "Nocturne",
  "Nunu",
  "Olaf",
  "Orianna",
  "Ornn",
  "Pantheon",
  "Poppy",
  "Pyke",
  "Qiyana",
  "Quinn",
  "Rakan",
  "Rammus",
  "RekSai",
  "Rell",
  "RenataGlasc",
  "Renekton",
  "Rengar",
  "Riven",
  "Rumble",
  "Ryze",
  "Samira",
  "Sejuani",
  "Senna",
  "Seraphine",
  "Sett",
  "Shaco",
  "Shen",
  "Shyvana",
  "Singed",
  "Sion",
  "Sivir",
  "Skarner",
  "Smolder",
  "Sona",
  "Soraka",
  "Swain",
  "Sylas",
  "Syndra",
  "TahmKench",
  "Taliyah",
  "Talon",
  "Taric",
  "Teemo",
  "Thresh",
  "Tristana",
  "Trundle",
  "Tryndamere",
  "TwistedFate",
  "Twitch",
  "Udyr",
  "Urgot",
  "Varus",
  "Vayne",
  "Veigar",
  "VelKoz",
  "Vex",
  "Vi",
  "Viego",
  "Viktor",
  "Vladimir",
  "Volibear",
  "Warwick",
  "Wukong",
  "Xayah",
  "Xerath",
  "XinZhao",
  "Yasuo",
  "Yone",
  "Yorick",
  "Yuumi",
  "Zac",
  "Zed",
  "Zeri",
  "Ziggs",
  "Zilean",
  "Zoe",
  "Zyra"
]

export default function List() {
  const navigate = useNavigate()
  const { user } = useStore()
  const [scenarios, setScenarios] = useState([])
  const [isOpen, setIsOpen] = useState(false)

  const [prioPicks, setPrioPicks] = useState([])
  const [prioFlex, setPrioFlex] = useState([])
  const [championModalOpen, setChampionModalOpen] = useState(false)
  const [championModalType, setChampionModalType] = useState(null)

  const fetchTeamSettings = async () => {
    if (!user?.team_id) return
    try {
      const { ok, data, code } = await api.get(`/team/${user.team_id}`)
      if (!ok) return toast.error(code)
      setPrioPicks(data.prio_pick || [])
      setPrioFlex(data.prio_flex || [])
    } catch (error) {
      toast.error(error.message)
    }
  }

  const removeChampion = async (type, champion) => {
    if (!user?.team_id) return
    const updates = type === "pick" ? { prio_pick: prioPicks.filter(c => c !== champion) } : { prio_flex: prioFlex.filter(c => c !== champion) }
    try {
      const { ok, code } = await api.put(`/team/${user.team_id}`, updates)
      if (!ok) return toast.error(code)
      fetchTeamSettings()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const fetchScenarios = async () => {
    try {
      const { ok, data, code } = await api.post("/draft-scenario/search", { team_id: user?.team_id })
      if (!ok) return toast.error(code)
      setScenarios(data)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    try {
      const { ok, code } = await api.delete(`/draft-scenario/${id}`)
      if (!ok) return toast.error(code)
      toast.success("Scenario deleted")
      fetchScenarios()
    } catch (error) {
      toast.error(error.message)
    }
  }

  useEffect(() => {
    fetchScenarios()
    fetchTeamSettings()
  }, [])

  return (
    <div className="h-full overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 lg:p-8 flex flex-col">
      <div className="max-w-5xl mx-auto w-full flex flex-col flex-1 min-h-0 space-y-6">
        {/* Priority Picks & Flex Picks Section */}
        <div className="grid grid-cols-2 gap-4 flex-shrink-0">
          {/* Priority Picks */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500" />
                <h3 className="text-amber-500 font-semibold text-sm">Priority Picks</h3>
              </div>
              <button
                onClick={() => {
                  setChampionModalType("pick")
                  setChampionModalOpen(true)
                }}
                className="p-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-500 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {prioPicks.length === 0 && <span className="text-slate-500 text-xs">No priority picks set</span>}
              {prioPicks.map(champ => (
                <div key={champ} className="flex items-center gap-1.5 bg-slate-700/50 rounded-lg px-2 py-1.5 group">
                  <div className="w-6 h-6 rounded overflow-hidden bg-slate-600">
                    <img src={`/champions/${champ}.png`} alt={champ} className="w-full h-full object-cover" onError={e => (e.target.style.display = "none")} />
                  </div>
                  <span className="text-white text-xs">{champ}</span>
                  <button onClick={() => removeChampion("pick", champ)} className="text-slate-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Flex Picks */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Shuffle className="w-4 h-4 text-cyan-500" />
                <h3 className="text-cyan-500 font-semibold text-sm">Flex Picks</h3>
              </div>
              <button
                onClick={() => {
                  setChampionModalType("flex")
                  setChampionModalOpen(true)
                }}
                className="p-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-500 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {prioFlex.length === 0 && <span className="text-slate-500 text-xs">No flex picks set</span>}
              {prioFlex.map(champ => (
                <div key={champ} className="flex items-center gap-1.5 bg-slate-700/50 rounded-lg px-2 py-1.5 group">
                  <div className="w-6 h-6 rounded overflow-hidden bg-slate-600">
                    <img src={`/champions/${champ}.png`} alt={champ} className="w-full h-full object-cover" onError={e => (e.target.style.display = "none")} />
                  </div>
                  <span className="text-white text-xs">{champ}</span>
                  <button onClick={() => removeChampion("flex", champ)} className="text-slate-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between flex-shrink-0">
          <h1 className="text-white text-xl font-semibold">Draft Scenarios</h1>
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Scenario
          </button>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden flex-1 min-h-0 flex flex-col">
          <table className="w-full">
            <thead className="flex-shrink-0">
              <tr className="border-b border-slate-700/50">
                <th className="text-left text-slate-400 text-xs font-medium uppercase tracking-wider px-6 py-3">Name</th>
                <th className="text-center text-slate-400 text-xs font-medium uppercase tracking-wider px-4 py-3">Date</th>
                <th className="text-right text-slate-400 text-xs font-medium uppercase tracking-wider px-6 py-3">Actions</th>
              </tr>
            </thead>
          </table>
          <div className="overflow-y-auto flex-1">
            <table className="w-full">
              <tbody>
                {scenarios.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-slate-500 py-12 text-sm">
                      No scenarios yet
                    </td>
                  </tr>
                )}
                {scenarios.map(scenario => (
                  <tr
                    key={scenario._id}
                    onClick={() => navigate(`/draft/${scenario._id}`)}
                    className="border-b border-slate-700/30 hover:bg-slate-700/20 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className="text-white font-medium text-sm">{scenario.name || "Untitled"}</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-slate-400 text-sm">
                        {new Date(scenario.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={e => handleDelete(e, scenario._id)} className="p-1.5 text-slate-400 hover:text-red-400 transition-colors">
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

      <AddScenario isOpen={isOpen} setIsOpen={setIsOpen} onCreated={fetchScenarios} navigate={navigate} />

      <ChampionModal
        isOpen={championModalOpen}
        onClose={() => setChampionModalOpen(false)}
        type={championModalType}
        currentPicks={championModalType === "pick" ? prioPicks : prioFlex}
        onUpdate={fetchTeamSettings}
      />
    </div>
  )
}

function AddScenario({ isOpen, setIsOpen, onCreated, navigate }) {
  const [name, setName] = useState("")

  const handleAddScenario = async () => {
    if (!name.trim()) return toast.error("Enter a scenario name")
    try {
      const { ok, data, code } = await api.post("/draft-scenario", { name: name.trim() })
      if (!ok) return toast.error(code)
      setName("")
      setIsOpen(false)
      onCreated()
      navigate(`/draft/${data._id}`)
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} className="w-full max-w-md bg-slate-800 border border-slate-700">
      <div className="p-6 space-y-5">
        <h3 className="text-white text-lg font-semibold">New Draft Scenario</h3>
        <div>
          <label className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1.5 block">Scenario Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAddScenario()}
            placeholder="e.g. T1 vs GenG - Game 1"
            className="w-full px-4 py-2.5 rounded-lg border border-slate-600 bg-slate-700/50 text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none text-sm"
            autoFocus
          />
        </div>
        <div className="flex items-center justify-end gap-3">
          <button onClick={() => setIsOpen(false)} className="px-4 py-2 text-slate-400 hover:text-white text-sm transition-colors">
            Cancel
          </button>
          <button onClick={handleAddScenario} className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded-lg text-sm transition-colors">
            Create
          </button>
        </div>
      </div>
    </Modal>
  )
}

function ChampionModal({ isOpen, onClose, type, currentPicks, onUpdate }) {
  const { user } = useStore()
  const [searchQuery, setSearchQuery] = useState("")

  if (!isOpen) return null

  const addChampion = async champion => {
    if (!user?.team_id || currentPicks.includes(champion)) return
    const updates = type === "pick" ? { prio_pick: [...currentPicks, champion] } : { prio_flex: [...currentPicks, champion] }
    try {
      const { ok, code } = await api.put(`/team/${user.team_id}`, updates)
      if (!ok) return toast.error(code)
      onUpdate()
      onClose()
      setSearchQuery("")
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-slate-800 border border-slate-700 rounded-xl w-[600px] max-h-[70vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-white font-semibold">Add {type === "pick" ? "Priority Pick" : "Flex Pick"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 border-b border-slate-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search champion..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none"
              autoFocus
            />
          </div>
        </div>
        <div className="p-4 overflow-y-auto max-h-[50vh]">
          <div className="grid grid-cols-8 gap-2">
            {ALL_CHAMPIONS.filter(c => c.toLowerCase().includes(searchQuery.toLowerCase())).map(champion => {
              const isUsed = currentPicks.includes(champion)
              return (
                <button
                  key={champion}
                  onClick={() => !isUsed && addChampion(champion)}
                  disabled={isUsed}
                  className={`flex flex-col items-center p-1.5 rounded-lg transition-colors ${isUsed ? "opacity-30 cursor-not-allowed" : "hover:bg-slate-700 cursor-pointer"}`}
                >
                  <div className={`w-10 h-10 rounded-lg overflow-hidden bg-slate-700 ${isUsed ? "grayscale" : ""}`}>
                    <img src={`/champions/${champion}.png`} alt={champion} className="w-full h-full object-cover" onError={e => (e.target.style.display = "none")} />
                  </div>
                  <span className="text-slate-300 text-[9px] mt-1 text-center truncate w-full">{champion}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
