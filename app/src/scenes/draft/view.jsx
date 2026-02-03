import { useState, useEffect, useRef, useCallback } from "react"
import { useParams } from "react-router-dom"
import { toast } from "react-hot-toast"
import { RotateCcw, Zap, X, Search, Star, Shuffle } from "lucide-react"
import api from "@/services/api"
import useStore from "@/services/store"

// Champions par rôle (pour la modal)
const CHAMPIONS_BY_ROLE = {
  TOP: [
    "Aatrox",
    "Ambessa",
    "Camille",
    "ChoGath",
    "Darius",
    "DrMundo",
    "Fiora",
    "Gangplank",
    "Garen",
    "Gnar",
    "Gragas",
    "Gwen",
    "Illaoi",
    "Irelia",
    "Jax",
    "Jayce",
    "Kennen",
    "Kled",
    "KSante",
    "Malphite",
    "Mordekaiser",
    "Nasus",
    "Olaf",
    "Ornn",
    "Pantheon",
    "Poppy",
    "Quinn",
    "Renekton",
    "Riven",
    "Rumble",
    "Sett",
    "Shen",
    "Singed",
    "Sion",
    "Teemo",
    "Tryndamere",
    "Urgot",
    "Volibear",
    "Wukong",
    "Yorick"
  ],
  JGL: [
    "Amumu",
    "BelVeth",
    "Briar",
    "Diana",
    "Ekko",
    "Elise",
    "Evelynn",
    "Fiddlesticks",
    "Graves",
    "Hecarim",
    "Ivern",
    "JarvanIV",
    "Kayn",
    "KhaZix",
    "Kindred",
    "LeeSin",
    "Lillia",
    "MasterYi",
    "Nidalee",
    "Nocturne",
    "Nunu",
    "Olaf",
    "RekSai",
    "Rengar",
    "Sejuani",
    "Shaco",
    "Shyvana",
    "Skarner",
    "Taliyah",
    "Udyr",
    "Vi",
    "Viego",
    "Volibear",
    "Warwick",
    "Wukong",
    "XinZhao",
    "Zac"
  ],
  MID: [
    "Ahri",
    "Akali",
    "Anivia",
    "Annie",
    "AurelionSol",
    "Aurora",
    "Azir",
    "Cassiopeia",
    "Corki",
    "Diana",
    "Ekko",
    "Fizz",
    "Galio",
    "Hwei",
    "Irelia",
    "Kassadin",
    "Katarina",
    "LeBlanc",
    "Lissandra",
    "Lux",
    "Malzahar",
    "Naafiri",
    "Neeko",
    "Orianna",
    "Qiyana",
    "Ryze",
    "Syndra",
    "Sylas",
    "Talon",
    "TwistedFate",
    "Veigar",
    "Vex",
    "Viktor",
    "Vladimir",
    "Xerath",
    "Yasuo",
    "Yone",
    "Zed",
    "Ziggs",
    "Zoe"
  ],
  ADC: [
    "Aphelios",
    "Ashe",
    "Caitlyn",
    "Draven",
    "Ezreal",
    "Jhin",
    "Jinx",
    "Kaisa",
    "Kalista",
    "KogMaw",
    "Lucian",
    "MissFortune",
    "Nilah",
    "Samira",
    "Sivir",
    "Smolder",
    "Tristana",
    "Twitch",
    "Varus",
    "Vayne",
    "Xayah",
    "Zeri"
  ],
  SUP: [
    "Alistar",
    "Bard",
    "Blitzcrank",
    "Braum",
    "Janna",
    "Karma",
    "Leona",
    "Lulu",
    "Maokai",
    "Milio",
    "Morgana",
    "Nami",
    "Nautilus",
    "Poppy",
    "Pyke",
    "Rakan",
    "Rell",
    "RenataGlasc",
    "Senna",
    "Seraphine",
    "Sona",
    "Soraka",
    "TahmKench",
    "Taric",
    "Thresh",
    "Yuumi",
    "Zyra"
  ]
}

// Liste des champions LoL
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
  "Zyra",
  "Zaahen"
]

const ROLE_ICONS = {
  TOP: "/roles/top.png",
  JGL: "/roles/jungle.png",
  MID: "/roles/mid.png",
  ADC: "/roles/bottom.png",
  SUP: "/roles/support.png"
}

const POSITION_LABELS = ["First", "Second", "Third", "Fourth", "Fifth"]

export default function View() {
  const { id } = useParams()
  const { user } = useStore()
  const [scenarioName, setScenarioName] = useState("")
  const [blueBans, setBlueBans] = useState(Array(5).fill(null))
  const [redBans, setRedBans] = useState(Array(5).fill(null))
  const [bluePicks, setBluePicks] = useState(Array(5).fill(null))
  const [redPicks, setRedPicks] = useState(Array(5).fill(null))
  const [teamPrioPicks, setTeamPrioPicks] = useState([])
  const [teamFlexPicks, setTeamFlexPicks] = useState([])
  const [selectedLeagues, setSelectedLeagues] = useState([])
  const [availableLeagues, setAvailableLeagues] = useState([])
  const [leagueDropdownOpen, setLeagueDropdownOpen] = useState(false)
  const [myTeamMostPlayed, setMyTeamMostPlayed] = useState(null)
  const [enemyTeamMostPlayed, setEnemyTeamMostPlayed] = useState(null)
  const [myTeamCombos, setMyTeamCombos] = useState(null)
  const [enemyTeamCombos, setEnemyTeamCombos] = useState(null)

  // Load scenario from DB
  async function fetchScenario() {
    try {
      const { ok, data, code } = await api.get(`/draft-scenario/${id}`)
      if (!ok) return toast.error(code || "Failed to load scenario")
      setScenarioName(data.name || "")
      const toSlots = arr => Array.from({ length: 5 }, (_, i) => (arr?.[i] ? { champion: arr[i] } : null))
      setBlueBans(toSlots(data.blueBans))
      setRedBans(toSlots(data.redBans))
      setBluePicks(toSlots(data.bluePicks))
      setRedPicks(toSlots(data.redPicks))
    } catch (error) {
      toast.error(error.message)
    }
  }

  useEffect(() => {
    if (id) fetchScenario()
  }, [id])

  async function fetchTeamSettings() {
    if (!user?.team_id) return
    try {
      const { ok, data, code } = await api.get(`/team/${user.team_id}`)
      if (!ok) return toast.error(code || "Failed to fetch team settings")
      setTeamPrioPicks(data.prio_pick || [])
      setTeamFlexPicks(data.prio_flex || [])
    } catch (error) {
      toast.error(error.message)
    }
  }

  useEffect(() => {
    fetchTeamSettings()
  }, [])

  // League filter for pro data
  async function fetchLeagues() {
    try {
      const { ok, data, code } = await api.get("/pro-game/leagues/list")
      if (!ok) return toast.error(code || "Failed to fetch leagues")
      setAvailableLeagues(data || [])
    } catch (error) {
      console.error("Failed to fetch leagues:", error)
    }
  }

  useEffect(() => {
    fetchLeagues()
  }, [])

  // Close dropdown when clicking outside
  const leagueDropdownRef = useRef(null)
  useEffect(() => {
    function handleClickOutside(event) {
      if (leagueDropdownRef.current && !leagueDropdownRef.current.contains(event.target)) {
        setLeagueDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  async function fetchMyTeam() {
    try {
      const { ok, data, code } = await api.post("/playerstats/most-played", {})
      if (!ok) return toast.error(code || "Failed to fetch my team most-played")
      setMyTeamMostPlayed(data)
    } catch (error) {
      toast.error(error.message)
    }
  }

  async function fetchEnemyTeam(leagues) {
    try {
      const body = leagues?.length ? { leagues } : {}
      const { ok, data, code } = await api.post("/pro-game/most-played", body)
      if (!ok) return toast.error(code || "Failed to fetch enemy most-played")
      setEnemyTeamMostPlayed(data)
    } catch (error) {
      toast.error(error.message)
    }
  }

  async function fetchMyTeamCombos() {
    try {
      const { ok, data, code } = await api.post("/playerstats/best-combos")
      if (!ok) return toast.error(code || "Failed to fetch my team combos")
      setMyTeamCombos(data)
    } catch (error) {
      toast.error(error.message)
    }
  }

  async function fetchEnemyTeamCombos(leagues) {
    try {
      const body = leagues?.length ? { leagues } : {}
      const { ok, data, code } = await api.post("/pro-game/best-combos", body)
      if (!ok) return toast.error(code || "Failed to fetch enemy team combos")
      setEnemyTeamCombos(data)
    } catch (error) {
      toast.error(error.message)
    }
  }

  // Pro draft averages from API
  const [draftAverages, setDraftAverages] = useState(null)

  async function fetchDraftAverages(leagues) {
    try {
      const body = leagues?.length ? { leagues } : {}
      const { ok, data, code } = await api.post("/pro-game/draft-averages", body)
      if (!ok) return toast.error(code || "Failed to fetch draft averages")
      setDraftAverages(data)
    } catch (error) {
      toast.error(error.message)
    }
  }

  // Most flexed champions from API
  const [myTeamFlexed, setMyTeamFlexed] = useState([])
  const [proFlexed, setProFlexed] = useState([])

  async function fetchMyTeamFlexed() {
    try {
      const { ok, data, code } = await api.post("/playerstats/most-flexed", { limit: 3 })
      if (!ok) return toast.error(code || "Failed to fetch my team flexed champions")
      setMyTeamFlexed(data || [])
    } catch (error) {
      toast.error(error.message)
    }
  }

  async function fetchProFlexed(leagues) {
    try {
      const body = { limit: 3 }
      if (leagues?.length) body.leagues = leagues
      const { ok, data, code } = await api.post("/pro-game/most-flexed", body)
      if (!ok) return toast.error(code || "Failed to fetch pro flexed champions")
      setProFlexed(data || [])
    } catch (error) {
      toast.error(error.message)
    }
  }

  // Fetch my team data (doesn't depend on league)
  useEffect(() => {
    fetchMyTeam()
    fetchMyTeamCombos()
    fetchMyTeamFlexed()
  }, [])

  // Fetch pro data (depends on selected leagues)
  useEffect(() => {
    fetchEnemyTeam(selectedLeagues)
    fetchEnemyTeamCombos(selectedLeagues)
    fetchDraftAverages(selectedLeagues)
    fetchProFlexed(selectedLeagues)
  }, [selectedLeagues])

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [modalType, setModalType] = useState(null) // "ban" or "pick"
  const [modalSide, setModalSide] = useState(null) // "blue" or "red"
  const [modalIndex, setModalIndex] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")

  // Get all picked/banned champions to disable them
  const usedChampions = [
    ...blueBans.filter(Boolean).map(b => b.champion),
    ...redBans.filter(Boolean).map(b => b.champion),
    ...bluePicks.filter(Boolean).map(p => p.champion),
    ...redPicks.filter(Boolean).map(p => p.champion)
  ]

  const openModal = (type, side, index) => {
    setModalType(type)
    setModalSide(side)
    setModalIndex(index)
    setSearchQuery("")
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setModalType(null)
    setModalSide(null)
    setModalIndex(null)
    setSearchQuery("")
  }

  const selectChampionFromModal = champion => {
    if (modalType === "ban") {
      if (modalSide === "blue") {
        const newBans = [...blueBans]
        newBans[modalIndex] = { champion }
        setBlueBans(newBans)
      } else {
        const newBans = [...redBans]
        newBans[modalIndex] = { champion }
        setRedBans(newBans)
      }
    } else {
      if (modalSide === "blue") {
        const newPicks = [...bluePicks]
        newPicks[modalIndex] = { champion }
        setBluePicks(newPicks)
      } else {
        const newPicks = [...redPicks]
        newPicks[modalIndex] = { champion }
        setRedPicks(newPicks)
      }
    }
    closeModal()
  }

  const filteredChampions = ALL_CHAMPIONS.filter(champ => champ.toLowerCase().includes(searchQuery.toLowerCase()))

  const handleReset = () => {
    setBlueBans(Array(5).fill(null))
    setRedBans(Array(5).fill(null))
    setBluePicks(Array(5).fill(null))
    setRedPicks(Array(5).fill(null))
  }

  // Auto-save with debounce
  const saveTimeoutRef = useRef(null)
  const isFirstRender = useRef(true)

  const autoSave = useCallback(async () => {
    if (!id) return // Only auto-save if we have an existing scenario
    try {
      const body = {
        name: scenarioName.trim() || "Untitled",
        blueBans: blueBans.map(b => b?.champion || null),
        redBans: redBans.map(b => b?.champion || null),
        bluePicks: bluePicks.map(p => p?.champion || null),
        redPicks: redPicks.map(p => p?.champion || null)
      }
      await api.put(`/draft-scenario/${id}`, body)
    } catch (error) {
      console.error("Auto-save failed:", error)
    }
  }, [id, scenarioName, blueBans, redBans, bluePicks, redPicks])

  useEffect(() => {
    // Skip first render (initial load)
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    // Clear previous timeout
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    // Debounce auto-save by 500ms
    saveTimeoutRef.current = setTimeout(() => {
      autoSave()
    }, 500)

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [blueBans, redBans, bluePicks, redPicks, scenarioName, autoSave])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 lg:p-6">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <input
            type="text"
            placeholder="Scenario name..."
            value={scenarioName}
            onChange={e => setScenarioName(e.target.value)}
            className="bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none text-sm w-64"
          />
          <div className="flex items-center gap-3">
            <div className="relative" ref={leagueDropdownRef}>
              <button
                onClick={() => setLeagueDropdownOpen(!leagueDropdownOpen)}
                className="flex items-center gap-2 bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm hover:border-slate-500 transition-colors min-w-[140px]"
              >
                <span className="truncate">
                  {selectedLeagues.length === 0 ? "All Leagues" : selectedLeagues.length === 1 ? selectedLeagues[0] : `${selectedLeagues.length} leagues`}
                </span>
                <svg className={`w-4 h-4 transition-transform ${leagueDropdownOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {leagueDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50 min-w-[180px] max-h-64 overflow-y-auto">
                  <button
                    onClick={() => setSelectedLeagues([])}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-700 transition-colors ${selectedLeagues.length === 0 ? "text-amber-400" : "text-white"}`}
                  >
                    All Leagues
                  </button>
                  <div className="border-t border-slate-700" />
                  {availableLeagues.map(league => (
                    <button
                      key={league}
                      onClick={() => setSelectedLeagues(prev => (prev.includes(league) ? prev.filter(l => l !== league) : [...prev, league]))}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-700 transition-colors flex items-center gap-2"
                    >
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center ${selectedLeagues.includes(league) ? "bg-amber-500 border-amber-500" : "border-slate-500"}`}
                      >
                        {selectedLeagues.includes(league) && (
                          <svg className="w-3 h-3 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="text-white">{league}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          {/* Left Panel - My Team Priority Picks */}
          <div className="col-span-3 space-y-4">
            <PriorityPicksPanel title={`Most played - ${user?.team_name || "My Team"}`} data={myTeamMostPlayed} />
            <BestCombosPanel combos={myTeamCombos || []} />
          </div>

          {/* Center - Draft Board */}
          <div className="col-span-6">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
              {/* Bans Row */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">BANS</p>
                  <div className="flex gap-2">
                    {blueBans.map((ban, idx) => (
                      <ChampionSlot
                        key={`blue-ban-${idx}`}
                        champion={ban}
                        type="ban"
                        side="blue"
                        index={idx}
                        onClick={() => openModal("ban", "blue", idx)}
                        draftAverages={draftAverages}
                        selectedLeagues={selectedLeagues}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-slate-400 text-xs uppercase tracking-wider mb-2 text-right">BANS</p>
                  <div className="flex gap-2">
                    {redBans.map((ban, idx) => (
                      <ChampionSlot
                        key={`red-ban-${idx}`}
                        champion={ban}
                        type="ban"
                        side="red"
                        index={idx}
                        onClick={() => openModal("ban", "red", idx)}
                        draftAverages={draftAverages}
                        selectedLeagues={selectedLeagues}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Picks Row */}
              <div className="flex items-start justify-between gap-4">
                {/* Blue Side Picks */}
                <div className="flex-1 min-w-0">
                  <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">PICKS</p>
                  <div className="space-y-2">
                    {["TOP", "JGL", "MID", "ADC", "SUP"].map((role, idx) => (
                      <div key={role} className="flex items-center gap-3">
                        <ChampionSlot
                          champion={bluePicks[idx]}
                          type="pick"
                          side="blue"
                          index={idx}
                          onClick={() => openModal("pick", "blue", idx)}
                          draftAverages={draftAverages}
                          selectedLeagues={selectedLeagues}
                        />
                        <span className="text-slate-500 text-xs uppercase">{role}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* VS Badge */}
                <div className="flex items-center justify-center self-center flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center">
                    <span className="text-slate-900 font-bold text-base">VS</span>
                  </div>
                </div>

                {/* Red Side Picks */}
                <div className="flex-1 min-w-0">
                  <p className="text-slate-400 text-xs uppercase tracking-wider mb-2 text-right">PICKS</p>
                  <div className="space-y-2">
                    {["TOP", "JGL", "MID", "ADC", "SUP"].map((role, idx) => (
                      <div key={role} className="flex items-center gap-3 justify-end">
                        <span className="text-slate-500 text-xs uppercase">{role}</span>
                        <ChampionSlot
                          champion={redPicks[idx]}
                          type="pick"
                          side="red"
                          index={idx}
                          onClick={() => openModal("pick", "red", idx)}
                          draftAverages={draftAverages}
                          selectedLeagues={selectedLeagues}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Most Flexed Section - Outside the draft board */}
            <div className="flex items-start gap-4 mt-4">
              <MostFlexedPanel title={`My Team`} champions={myTeamFlexed} />
              <MostFlexedPanel title={`Pro`} champions={proFlexed} />
            </div>
          </div>

          {/* Right Panel - Enemy Team Priority Picks */}
          <div className="col-span-3 space-y-4">
            <PriorityPicksPanel title={`Most played - Pro League`} data={enemyTeamMostPlayed} />
            <BestCombosPanel combos={enemyTeamCombos || []} />
          </div>
        </div>
      </div>

      {/* Champion Selection Modal */}
      {modalOpen && (
        <ChampionModal
          modalType={modalType}
          modalSide={modalSide}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filteredChampions={filteredChampions}
          usedChampions={usedChampions}
          selectChampionFromModal={selectChampionFromModal}
          closeModal={closeModal}
          bluePicks={bluePicks}
          redPicks={redPicks}
          teamPrioPicks={teamPrioPicks}
          teamFlexPicks={teamFlexPicks}
        />
      )}
    </div>
  )
}

function PriorityPicksPanel({ title, data }) {
  const entries = Object.entries(data || {})
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-white font-semibold text-sm">{title}</h3>
      </div>

      <div className="space-y-2">
        {entries.map(([role, champions]) => (
          <div key={role}>
            <div className="flex items-center gap-1.5 mb-1">
              <img src={ROLE_ICONS[role]} alt={role} className="w-4 h-4 opacity-70" />
              <span className="text-slate-400 text-[10px] font-medium uppercase">{role}</span>
            </div>
            <div className="flex items-center gap-2">
              {champions.map((champ, idx) => (
                <div key={champ.name} className="flex items-center gap-1 p-1 rounded-lg">
                  <div className="w-7 h-7 rounded-md overflow-hidden bg-slate-700 flex-shrink-0">
                    <img
                      src={`/champions/${champ.name}.png`}
                      alt={champ.name}
                      className="w-full h-full object-cover"
                      onError={e => {
                        e.target.style.display = "none"
                      }}
                    />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-slate-400 text-[9px] font-semibold leading-tight">PR {champ.pr}%</span>
                    <span className={`text-[9px] font-semibold leading-tight ${champ.wr >= 60 ? "text-emerald-400" : champ.wr >= 50 ? "text-amber-400" : "text-red-400"}`}>
                      WR {champ.wr}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ChampionSlot({ champion, type, side, onClick, index, draftAverages, selectedLeagues }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [synergies, setSynergies] = useState(null)

  // Use API draft averages or fallback to hardcoded
  const proChampions = draftAverages ? (type === "ban" ? draftAverages.bans?.[side]?.[index] : draftAverages.picks?.[side]?.[index]) : []

  async function fetchSynergies() {
    try {
      const body = { champion: champion.champion }
      if (selectedLeagues?.length) body.leagues = selectedLeagues
      const { ok, data, code } = await api.post("/pro-game/synergies", body)
      if (!ok) return toast.error(code || "Failed to fetch synergies")
      setSynergies(data)
    } catch (e) {
      toast.error(error.message)
    }
  }

  useEffect(() => {
    if (!showTooltip || !champion?.champion) return
    fetchSynergies()
  }, [showTooltip, champion?.champion, selectedLeagues])

  const bestWith = synergies?.bestWith?.map(s => s.name) || []
  const bestAgainst = synergies?.bestAgainst?.map(s => s.name) || []

  return (
    <div className={`relative ${showTooltip ? "z-[100]" : ""}`} onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}>
      <button
        onClick={() => {
          setShowTooltip(false)
          onClick()
        }}
        className={`
          ${type === "ban" ? "w-12 h-12" : "w-14 h-14"}
          rounded-lg border-2 border-dashed transition-all cursor-pointer
          ${champion ? (type === "ban" ? `${side === "blue" ? "border-blue-500/50 hover:border-blue-400 hover:bg-blue-500/20" : "border-red-500/50 hover:border-red-400 hover:bg-red-500/20"} ${side === "blue" ? "bg-blue-500/10" : "bg-red-500/10"} grayscale hover:grayscale-0` : `${side === "blue" ? "border-blue-500/50 hover:border-blue-400 hover:bg-blue-500/20" : "border-red-500/50 hover:border-red-400 hover:bg-red-500/20"} ${side === "blue" ? "bg-blue-500/10" : "bg-red-500/10"}`) : "border-slate-600 bg-slate-700/30 hover:border-slate-500 hover:bg-slate-600/50"}
          hover:scale-105 hover:shadow-lg
          flex items-center justify-center overflow-hidden
        `}
      >
        {champion ? (
          <div className="w-full h-full relative">
            <img
              src={`/champions/${champion.champion}.png`}
              alt={champion.champion}
              className={`w-full h-full object-cover ${type === "ban" ? "grayscale opacity-50" : ""}`}
              onError={e => {
                e.target.style.display = "none"
              }}
            />
            {type === "ban" && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={`w-full h-0.5 ${side === "blue" ? "bg-blue-500" : "bg-red-500"} rotate-45`} />
              </div>
            )}
          </div>
        ) : (
          <span className={`text-xs ${side === "blue" ? "text-blue-400" : "text-red-400"}`}>{type === "ban" ? "BAN" : side === "blue" ? "B" : "R"}</span>
        )}
      </button>

      {/* Tooltip - Show pro average + Best With/Against when champion selected */}
      {showTooltip && (champion || proChampions) && (
        <div
          className={`absolute z-[100] left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl whitespace-nowrap ${type === "ban" ? "top-full mt-2" : "bottom-full mb-2"}`}
        >
          <div className="space-y-3">
            {/* Always show pro average */}
            {proChampions && (
              <div>
                <p className="text-white text-[10px] font-semibold uppercase mb-1.5">
                  {POSITION_LABELS[index]} {type === "ban" ? "ban" : "pick"} average Pro:
                </p>
                <div className="flex items-center gap-2">
                  {proChampions.map((champ, idx) => (
                    <div key={idx} className="w-8 h-8 rounded-md overflow-hidden bg-slate-700 border border-slate-600">
                      <img
                        src={`/champions/${champ}.png`}
                        alt={champ}
                        className="w-full h-full object-cover"
                        onError={e => {
                          e.target.style.display = "none"
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Show Best With when champion selected and data available */}
            {champion && bestWith.length > 0 && (
              <div>
                <p className="text-emerald-400 text-[10px] font-semibold uppercase mb-1.5">Best With (Pro)</p>
                <div className="flex items-center gap-2">
                  {bestWith.slice(0, 3).map((champ, idx) => (
                    <div key={idx} className="w-8 h-8 rounded-md overflow-hidden bg-slate-700 border border-emerald-500/30">
                      <img
                        src={`/champions/${champ}.png`}
                        alt={champ}
                        className="w-full h-full object-cover"
                        onError={e => {
                          e.target.style.display = "none"
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Show Best Against when champion selected and data available */}
            {champion && bestAgainst.length > 0 && (
              <div>
                <p className="text-red-400 text-[10px] font-semibold uppercase mb-1.5">Best Against (Pro)</p>
                <div className="flex items-center gap-2">
                  {bestAgainst.slice(0, 3).map((champ, idx) => (
                    <div key={idx} className="w-8 h-8 rounded-md overflow-hidden bg-slate-700 border border-red-500/30">
                      <img
                        src={`/champions/${champ}.png`}
                        alt={champ}
                        className="w-full h-full object-cover"
                        onError={e => {
                          e.target.style.display = "none"
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          {/* Arrow */}
          {type === "ban" ? (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-slate-700" />
          ) : (
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-700" />
          )}
        </div>
      )}
    </div>
  )
}

function BestCombosPanel({ combos }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-4 h-4 text-emerald-500" />
        <h3 className="text-emerald-500 font-semibold text-sm">Most Played Combos</h3>
      </div>

      <div className="space-y-2">
        {combos.map((combo, idx) => (
          <div key={idx} className="flex items-center justify-between bg-slate-700/30 rounded-full px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                <div className="w-7 h-7 rounded-full bg-slate-600 overflow-hidden border-2 border-slate-500">
                  <img
                    src={`/champions/${combo.champ1}.png`}
                    alt={combo.champ1}
                    className="w-full h-full object-cover"
                    onError={e => {
                      e.target.style.display = "none"
                    }}
                  />
                </div>
                <div className="w-7 h-7 rounded-full bg-slate-600 overflow-hidden border-2 border-slate-500 -ml-2">
                  <img
                    src={`/champions/${combo.champ2}.png`}
                    alt={combo.champ2}
                    className="w-full h-full object-cover"
                    onError={e => {
                      e.target.style.display = "none"
                    }}
                  />
                </div>
              </div>
              <span className="text-white text-sm">
                {combo.champ1} + {combo.champ2}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {combo.games && <span className="text-slate-400 text-xs">{combo.games}g</span>}
              <span className="text-emerald-400 font-semibold text-sm">{combo.wr}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MostFlexedPanel({ title, champions }) {
  if (!champions || champions.length === 0) {
    return (
      <div className="flex-1 min-w-0 bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">
        <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-2">🔄 Most Flexed - {title}</p>
        <p className="text-slate-500 text-xs">No flex picks data</p>
      </div>
    )
  }

  return (
    <div className="flex-1 min-w-0 bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">
      <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-2">🔄 Most Flexed - {title}</p>
      <div className="flex items-center gap-3">
        {champions.map((champ, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-md overflow-hidden bg-slate-700 flex-shrink-0">
              <img
                src={`/champions/${champ.name}.png`}
                alt={champ.name}
                className="w-full h-full object-cover"
                onError={e => {
                  e.target.style.display = "none"
                }}
              />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-cyan-400 text-[8px] font-semibold whitespace-nowrap">{champ.roles?.map(r => r.role).join("/")}</span>
              <span className="text-slate-400 text-[8px] whitespace-nowrap">PR {champ.roles?.reduce((sum, r) => sum + r.pr, 0) || 0}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ChampionModal({ modalType, searchQuery, setSearchQuery, filteredChampions, usedChampions, selectChampionFromModal, closeModal, teamPrioPicks, teamFlexPicks }) {
  const [selectedRole, setSelectedRole] = useState(null)

  // Filter champions based on role selection
  const getFilteredChampions = () => {
    if (searchQuery) return filteredChampions
    if (selectedRole && CHAMPIONS_BY_ROLE[selectedRole]) return CHAMPIONS_BY_ROLE[selectedRole].filter(c => ALL_CHAMPIONS.includes(c))
    return filteredChampions
  }

  const displayedChampions = getFilteredChampions()

  const roles = ["TOP", "JGL", "MID", "ADC", "SUP"]

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={closeModal}>
      <div className="bg-slate-800 border border-slate-700 rounded-xl w-[900px] max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-white font-semibold text-lg">Select Champion - {modalType === "ban" ? "Ban" : "Pick"}</h2>
          <button onClick={closeModal} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar + Role Filters */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search champion..."
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value)
                  if (e.target.value) setSelectedRole(null)
                }}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none"
                autoFocus
              />
            </div>
            <div className="flex items-center gap-1">
              {roles.map(role => (
                <button
                  key={role}
                  onClick={() => {
                    setSelectedRole(selectedRole === role ? null : role)
                    setSearchQuery("")
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    selectedRole === role ? "bg-amber-500 text-slate-900" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Priority Picks & Flex Picks Section */}
        {!searchQuery && !selectedRole && modalType === "pick" && (teamPrioPicks.length > 0 || teamFlexPicks.length > 0) && (
          <div className="p-4 border-b border-slate-700 bg-slate-800/50">
            <div className="flex gap-6">
              {/* Priority Picks */}
              {teamPrioPicks.length > 0 && (
                <div className="flex-[2]">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="w-4 h-4 text-amber-500" />
                    <p className="text-amber-500 text-xs font-semibold uppercase">Priority Picks</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {teamPrioPicks.map(champ => {
                      const isUsed = usedChampions.includes(champ)
                      return (
                        <button
                          key={champ}
                          onClick={() => !isUsed && selectChampionFromModal(champ)}
                          disabled={isUsed}
                          className={`flex flex-col items-center p-2 rounded-lg border transition-colors ${
                            isUsed ? "bg-slate-700/30 border-slate-600 opacity-40 cursor-not-allowed" : "bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20 cursor-pointer"
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-lg overflow-hidden bg-slate-700 ${isUsed ? "grayscale" : ""}`}>
                            <img
                              src={`/champions/${champ}.png`}
                              alt={champ}
                              className="w-full h-full object-cover"
                              onError={e => {
                                e.target.style.display = "none"
                              }}
                            />
                          </div>
                          <span className="text-slate-300 text-[9px] mt-1">{champ}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Flex Picks */}
              {teamFlexPicks.length > 0 && (
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Shuffle className="w-4 h-4 text-cyan-500" />
                    <p className="text-cyan-500 text-xs font-semibold uppercase">Flex Picks</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {teamFlexPicks
                      .filter(champ => !usedChampions.includes(champ))
                      .slice(0, 5)
                      .map(champ => (
                        <button
                          key={champ}
                          onClick={() => selectChampionFromModal(champ)}
                          className="flex flex-col items-center p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 transition-colors"
                        >
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-700">
                            <img
                              src={`/champions/${champ}.png`}
                              alt={champ}
                              className="w-full h-full object-cover"
                              onError={e => {
                                e.target.style.display = "none"
                              }}
                            />
                          </div>
                          <span className="text-slate-300 text-[9px] mt-1">{champ}</span>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Champions Grid */}
        <div className="p-4 overflow-y-auto max-h-[50vh]">
          <div className="grid grid-cols-10 gap-2">
            {displayedChampions.map(champion => {
              const isUsed = usedChampions.includes(champion)
              return (
                <button
                  key={champion}
                  onClick={() => !isUsed && selectChampionFromModal(champion)}
                  disabled={isUsed}
                  className={`flex flex-col items-center p-1.5 rounded-lg transition-colors ${isUsed ? "opacity-30 cursor-not-allowed" : "hover:bg-slate-700 cursor-pointer"}`}
                >
                  <div className={`w-10 h-10 rounded-lg overflow-hidden bg-slate-700 ${isUsed ? "grayscale" : ""}`}>
                    <img
                      src={`/champions/${champion}.png`}
                      alt={champion}
                      className="w-full h-full object-cover"
                      onError={e => {
                        e.target.style.display = "none"
                      }}
                    />
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
