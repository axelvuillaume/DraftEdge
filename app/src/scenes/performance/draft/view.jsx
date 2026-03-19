import { useState, useEffect, useRef } from "react"
import { useParams } from "react-router-dom"
import { toast } from "react-hot-toast"
import { RotateCcw, Zap, X, Search, Star, Shuffle } from "lucide-react"
import api from "@/services/api"
import useStore from "@/services/store"
import DebounceInput from "@/components/debounceInput"
import { getChampionIcon, DRAFT_ROLES, ROLE_ICONS, POSITION_LABELS, ALL_CHAMPIONS, CHAMPIONS_BY_ROLE } from "@/utils"

export default function View() {
  const { id } = useParams()
  const [scenario, setScenario] = useState({ name: "", blueBans: Array(5).fill(null), redBans: Array(5).fill(null), bluePicks: Array(5).fill(null), redPicks: Array(5).fill(null) })
  const [selectedLeagues, setSelectedLeagues] = useState([])
  const [modal, setModal] = useState(null)
  const [hoveredSlot, setHoveredSlot] = useState(null)

  const fetchScenario = async () => {
    try {
      const { ok, data, code } = await api.get(`/draft-scenario/${id}`)
      if (!ok) return toast.error(code || "Failed to load scenario")
      setScenario(data)
    } catch (error) {
      toast.error(error.code || "Failed to load scenario")
    }
  }

  useEffect(() => {
    if (id) fetchScenario()
  }, [id])

  const save = async updated => {
    setScenario(updated)
    try {
      const { ok, code } = await api.put(`/draft-scenario/${id}`, updated)
      if (!ok) return toast.error(code || "Failed to save scenario")
    } catch (error) {
      toast.error(error.code || "Failed to save scenario")
    }
  }

  const renderSlot = (champion, type, side, index, onRemove) => (
    <div
      className={`relative ${hoveredSlot === `${type}-${side}-${index}` ? "z-[100]" : ""}`}
      onMouseEnter={() => setHoveredSlot(`${type}-${side}-${index}`)}
      onMouseLeave={() => setHoveredSlot(null)}
    >
      <button
        onClick={() => {
          setHoveredSlot(null)
          setModal({ type, side, index })
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
              src={getChampionIcon(champion)}
              alt={champion}
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
      {champion && (
        <button
          onClick={e => {
            e.stopPropagation()
            onRemove()
          }}
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500/80 hover:bg-red-500 flex items-center justify-center text-white text-[8px] font-bold leading-none z-10 transition-colors"
        >
          ✕
        </button>
      )}
      {hoveredSlot === `${type}-${side}-${index}` && <DraftTooltip champion={champion} type={type} side={side} index={index} selectedLeagues={selectedLeagues} />}
    </div>
  )

  const selectChampionFromModal = champion => {
    const key = modal.type === "ban" ? (modal.side === "blue" ? "blueBans" : "redBans") : modal.side === "blue" ? "bluePicks" : "redPicks"
    save({ ...scenario, [key]: Array.from({ length: 5 }, (_, i) => (i === modal.index ? champion : scenario[key]?.[i] || null)) })
    setModal(null)
  }

  return (
    <div className="min-h-[calc(100vh-65px)] flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 lg:p-6">
      <div className="max-w-[1600px] w-full mx-auto flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <DebounceInput
            type="text"
            placeholder="Scenario name..."
            value={scenario.name}
            onChange={e => save({ ...scenario, name: e.target.value })}
            className="bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none text-sm w-64"
          />
          <div className="flex items-center gap-3">
            <LeagueDropdown selectedLeagues={selectedLeagues} setSelectedLeagues={setSelectedLeagues} />
            <button
              onClick={() => save({ ...scenario, blueBans: Array(5).fill(null), redBans: Array(5).fill(null), bluePicks: Array(5).fill(null), redPicks: Array(5).fill(null) })}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-12 gap-4">
          <div className="col-span-3 flex flex-col gap-4">
            <MyTeamMostPlayedPanel />
            <MyTeamCombosPanel />
          </div>

          <div className="col-span-6 flex flex-col gap-4">
            <div className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">BANS</p>
                  <div className="flex gap-2">
                    {[0, 1, 2, 3, 4].map(idx => (
                      <div key={`blue-ban-${idx}`}>
                        {renderSlot(scenario.blueBans?.[idx] || null, "ban", "blue", idx, () =>
                          save({ ...scenario, blueBans: Array.from({ length: 5 }, (_, i) => (i === idx ? null : scenario.blueBans?.[i] || null)) })
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-slate-400 text-xs uppercase tracking-wider mb-2 text-right">BANS</p>
                  <div className="flex gap-2">
                    {[0, 1, 2, 3, 4].map(idx => (
                      <div key={`red-ban-${idx}`}>
                        {renderSlot(scenario.redBans?.[idx] || null, "ban", "red", idx, () =>
                          save({ ...scenario, redBans: Array.from({ length: 5 }, (_, i) => (i === idx ? null : scenario.redBans?.[i] || null)) })
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">PICKS</p>
                  <div className="space-y-2">
                    {["TOP", "JGL", "MID", "ADC", "SUP"].map((role, idx) => (
                      <div key={role} className="flex items-center gap-3">
                        {renderSlot(scenario.bluePicks?.[idx] || null, "pick", "blue", idx, () =>
                          save({ ...scenario, bluePicks: Array.from({ length: 5 }, (_, i) => (i === idx ? null : scenario.bluePicks?.[i] || null)) })
                        )}
                        <span className="text-slate-500 text-xs uppercase">{role}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-center self-center flex-shrink-0">
                  <DraftSuggestionsTree scenario={scenario} selectedLeagues={selectedLeagues} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-slate-400 text-xs uppercase tracking-wider mb-2 text-right">PICKS</p>
                  <div className="space-y-2">
                    {["TOP", "JGL", "MID", "ADC", "SUP"].map((role, idx) => (
                      <div key={role} className="flex items-center gap-3 justify-end">
                        <span className="text-slate-500 text-xs uppercase">{role}</span>
                        {renderSlot(scenario.redPicks?.[idx] || null, "pick", "red", idx, () =>
                          save({ ...scenario, redPicks: Array.from({ length: 5 }, (_, i) => (i === idx ? null : scenario.redPicks?.[i] || null)) })
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <MyTeamFlexedPanel />
              <ProFlexedPanel selectedLeagues={selectedLeagues} />
            </div>
          </div>

          <div className="col-span-3 flex flex-col gap-4">
            <ProMostPlayedPanel selectedLeagues={selectedLeagues} />
            <ProCombosPanel selectedLeagues={selectedLeagues} />
          </div>
        </div>
      </div>

      {modal && <ChampionModal modalType={modal.type} scenario={scenario} selectChampionFromModal={selectChampionFromModal} closeModal={() => setModal(null)} />}
    </div>
  )
}

function LeagueDropdown({ selectedLeagues, setSelectedLeagues }) {
  const [leagues, setLeagues] = useState([])
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const fetchLeagues = async () => {
    try {
      const { ok, data, code } = await api.get("/pro-game/leagues/list")
      if (!ok) return toast.error(code || "Failed to fetch leagues")
      setLeagues(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch leagues")
    }
  }

  useEffect(() => {
    fetchLeagues()
  }, [])

  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm hover:border-slate-500 transition-colors min-w-[140px]"
      >
        <span className="truncate">{selectedLeagues.length === 0 ? "All Leagues" : selectedLeagues.length === 1 ? selectedLeagues[0] : `${selectedLeagues.length} leagues`}</span>
        <svg className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50 min-w-[180px] max-h-64 overflow-y-auto">
          <button
            onClick={() => setSelectedLeagues([])}
            className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-700 transition-colors ${selectedLeagues.length === 0 ? "text-amber-400" : "text-white"}`}
          >
            All Leagues
          </button>
          <div className="border-t border-slate-700" />
          {leagues.map(league => (
            <button
              key={league}
              onClick={() => setSelectedLeagues(prev => (prev.includes(league) ? prev.filter(l => l !== league) : [...prev, league]))}
              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-700 transition-colors flex items-center gap-2"
            >
              <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedLeagues.includes(league) ? "bg-amber-500 border-amber-500" : "border-slate-500"}`}>
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
  )
}

function DraftTooltip({ champion, type, side, index, selectedLeagues }) {
  const { globalFilters } = useStore()
  const [draftAverages, setDraftAverages] = useState(null)
  const [myDraftAverages, setMyDraftAverages] = useState(null)
  const [mySynergies, setMySynergies] = useState(null)
  const [proSynergies, setProSynergies] = useState(null)

  const fetchDraftAverages = async () => {
    try {
      const { ok, data, code } = await api.post("/pro-game/draft-averages", selectedLeagues.length ? { leagues: selectedLeagues } : {})
      if (!ok) return toast.error(code || "Failed to fetch draft averages")
      setDraftAverages(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch draft averages")
    }
  }

  const fetchMyDraftAverages = async () => {
    try {
      const { ok, data, code } = await api.post("/game/draft-averages", { ...globalFilters })
      if (!ok) return toast.error(code || "Failed to fetch my team draft averages")
      setMyDraftAverages(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch my team draft averages")
    }
  }

  const fetchMySynergies = async () => {
    try {
      const { ok, data, code } = await api.post("/playerstats/synergies", { champion })
      if (!ok) return toast.error(code || "Failed to fetch synergies")
      setMySynergies(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch synergies")
    }
  }

  const fetchProSynergies = async () => {
    try {
      const { ok, data, code } = await api.post("/pro-game/synergies", { champion, ...(selectedLeagues?.length ? { leagues: selectedLeagues } : {}) })
      if (!ok) return toast.error(code || "Failed to fetch synergies")
      setProSynergies(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch synergies")
    }
  }

  useEffect(() => {
    fetchMyDraftAverages()
    fetchDraftAverages()
  }, [])

  useEffect(() => {
    if (champion) {
      fetchProSynergies()
      fetchMySynergies()
    }
  }, [champion])

  const renderColumn = (averages, synergies, title, titleColor, borderColor, avgBorderColor) => (
    <div className="space-y-3">
      <p className={`${titleColor} text-[10px] font-bold uppercase tracking-wider border-b ${borderColor} pb-1`}>{title}</p>
      {(type === "ban" ? averages?.bans?.[side]?.[index] : averages?.picks?.[side]?.[index])?.length > 0 ? (
        <div>
          <p className="text-slate-400 text-[10px] font-semibold uppercase mb-1.5">
            {POSITION_LABELS[index]} {type === "ban" ? "ban" : "pick"} avg
          </p>
          <div className="flex items-center gap-2">
            {(type === "ban" ? averages.bans[side][index] : averages.picks[side][index]).map((champ, idx) => (
              <div key={idx} className={`w-8 h-8 rounded-md overflow-hidden bg-slate-700 border ${avgBorderColor}`}>
                <img
                  src={getChampionIcon(champ)}
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
      ) : (
        <p className="text-slate-500 text-[10px]">No data</p>
      )}
      {champion && synergies?.mostPlayedWith?.length > 0 && (
        <div>
          <p className="text-emerald-400 text-[10px] font-semibold uppercase mb-1.5">Most Played With</p>
          <div className="flex items-center gap-2">
            {synergies.mostPlayedWith.slice(0, 3).map((s, idx) => (
              <div key={idx} className="w-8 h-8 rounded-md overflow-hidden bg-slate-700 border border-emerald-500/30">
                <img
                  src={getChampionIcon(s.name)}
                  alt={s.name}
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
      {champion && synergies?.mostPlayedAgainst?.length > 0 && (
        <div>
          <p className="text-red-400 text-[10px] font-semibold uppercase mb-1.5">Most Played Against</p>
          <div className="flex items-center gap-2">
            {synergies.mostPlayedAgainst.slice(0, 3).map((s, idx) => (
              <div key={idx} className="w-8 h-8 rounded-md overflow-hidden bg-slate-700 border border-red-500/30">
                <img
                  src={getChampionIcon(s.name)}
                  alt={s.name}
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
  )

  return (
    <div
      className={`absolute z-[100] left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl whitespace-nowrap ${type === "ban" ? "top-full mt-2" : "bottom-full mb-2"}`}
    >
      <div className="flex gap-4">
        {renderColumn(myDraftAverages, mySynergies, "My Team", "text-amber-400", "border-amber-400/20", "border-amber-500/30")}
        <div className="w-px bg-slate-700" />
        {renderColumn(draftAverages, proSynergies, "Pro", "text-white", "border-slate-600", "border-slate-600")}
      </div>
      {type === "ban" ? (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-slate-700" />
      ) : (
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-700" />
      )}
    </div>
  )
}

function DraftSuggestionsTree({ scenario, selectedLeagues }) {
  const [data, setData] = useState(null)

  const fetchSuggestions = async () => {
    try {
      const body = { bluePicks: scenario.bluePicks, redPicks: scenario.redPicks, blueBans: scenario.blueBans, redBans: scenario.redBans }
      if (selectedLeagues.length) body.leagues = selectedLeagues
      const { ok, data, code } = await api.post("/pro-game/draft-suggestions", body)
      if (!ok) return toast.error(code || "Failed to fetch draft suggestions")
      setData(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch draft suggestions")
    }
  }

  useEffect(() => {
    fetchSuggestions()
  }, [scenario.bluePicks, scenario.redPicks, scenario.blueBans, scenario.redBans, selectedLeagues])

  if (!data?.tree?.length) {
    return (
      <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
        <span className="text-amber-400 font-bold text-xs">VS</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-amber-400 text-[8px] font-bold uppercase tracking-wider">Picks</span>
      <div className="flex flex-col gap-2">
        {data.tree.map((branch, i) => (
          <div key={i} className="flex items-center gap-0">
            <div className="flex flex-col items-center" title={`${branch.name} (${branch.games}g, ${branch.wr}% WR)`}>
              <div className={`w-8 h-8 rounded border ${data.suggestSide === "blue" ? "border-blue-400/60" : "border-red-400/60"} bg-slate-700/40 overflow-hidden group`}>
                <img
                  src={getChampionIcon(branch.name)}
                  alt={branch.name}
                  className="w-full h-full object-cover opacity-60 group-hover:opacity-90 transition-opacity"
                  onError={e => {
                    e.target.style.display = "none"
                  }}
                />
              </div>
              <span className={`text-[6px] font-bold leading-tight ${branch.wr >= 55 ? "text-emerald-400" : branch.wr >= 50 ? "text-amber-400" : "text-red-400"}`}>
                {branch.wr}%
              </span>
            </div>
            <div className="w-2 h-px bg-slate-500/50" />
            <div className="border-l border-slate-500/50 flex flex-col">
              {data.depth === 3 ? (
                branch.synergies?.length > 0 ? (
                  branch.synergies.map((syn, j) => (
                    <div key={j} className="flex items-center">
                      <div className="w-1.5 h-px bg-slate-500/50" />
                      <div className="flex flex-col items-center" title={`${syn.name} (${syn.games}g, ${syn.wr}% WR)`}>
                        <div className="w-7 h-7 rounded border border-emerald-400/50 bg-slate-700/40 overflow-hidden group">
                          <img
                            src={getChampionIcon(syn.name)}
                            alt={syn.name}
                            className="w-full h-full object-cover opacity-60 group-hover:opacity-90 transition-opacity"
                            onError={e => {
                              e.target.style.display = "none"
                            }}
                          />
                        </div>
                        <span className={`text-[5px] font-bold leading-tight ${syn.wr >= 55 ? "text-emerald-400" : syn.wr >= 50 ? "text-amber-400" : "text-red-400"}`}>
                          {syn.wr}%
                        </span>
                      </div>
                      <div className="w-1.5 h-px bg-slate-500/50" />
                      <div className="border-l border-slate-500/50 flex flex-col">
                        {syn.counters?.length > 0 ? (
                          syn.counters.map((ctr, k) => (
                            <div key={k} className="flex items-center">
                              <div className="w-1 h-px bg-slate-500/50" />
                              <div className="flex flex-col items-center" title={`${ctr.name} (${ctr.games}g, ${ctr.wr}% WR)`}>
                                <div
                                  className={`w-5 h-5 rounded border ${data.suggestSide === "blue" ? "border-red-400/40" : "border-blue-400/40"} bg-slate-700/40 overflow-hidden group`}
                                >
                                  <img
                                    src={getChampionIcon(ctr.name)}
                                    alt={ctr.name}
                                    className="w-full h-full object-cover opacity-60 group-hover:opacity-90 transition-opacity"
                                    onError={e => {
                                      e.target.style.display = "none"
                                    }}
                                  />
                                </div>
                                <span className={`text-[5px] font-bold leading-tight ${ctr.wr >= 55 ? "text-emerald-400" : ctr.wr >= 50 ? "text-amber-400" : "text-red-400"}`}>
                                  {ctr.wr}%
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="flex items-center">
                            <div className="w-1 h-px bg-slate-500/50" />
                            <div className="w-5 h-5 rounded border border-dashed border-slate-600 bg-slate-700/30" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center">
                    <div className="w-1.5 h-px bg-slate-500/50" />
                    <div className="w-6 h-6 rounded border border-dashed border-slate-600 bg-slate-700/30" />
                  </div>
                )
              ) : branch.responses?.length > 0 ? (
                branch.responses.map((resp, j) => (
                  <div key={j} className="flex items-center">
                    <div className="w-2 h-px bg-slate-500/50" />
                    <div className="flex flex-col items-center" title={`${resp.name} (${resp.games}g, ${resp.wr}% WR)`}>
                      <div className={`w-7 h-7 rounded border ${data.suggestSide === "blue" ? "border-red-400/40" : "border-blue-400/40"} bg-slate-700/40 overflow-hidden group`}>
                        <img
                          src={getChampionIcon(resp.name)}
                          alt={resp.name}
                          className="w-full h-full object-cover opacity-60 group-hover:opacity-90 transition-opacity"
                          onError={e => {
                            e.target.style.display = "none"
                          }}
                        />
                      </div>
                      <span className={`text-[5px] font-bold leading-tight ${resp.wr >= 55 ? "text-emerald-400" : resp.wr >= 50 ? "text-amber-400" : "text-red-400"}`}>
                        {resp.wr}%
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center">
                  <div className="w-2 h-px bg-slate-500/50" />
                  <div className="w-6 h-6 rounded border border-dashed border-slate-600 bg-slate-700/30" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      {data.totalGames > 0 && <span className="text-slate-500 text-[7px]">{data.totalGames}g</span>}
    </div>
  )
}

function MyTeamMostPlayedPanel() {
  const { user, globalFilters } = useStore()
  const [data, setData] = useState([])

  const fetchData = async () => {
    try {
      const { ok, data, code } = await api.post("/playerstats/most-played", { ...globalFilters })
      if (!ok) return toast.error(code || "Failed to fetch my team most-played")
      setData(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch my team most-played")
    }
  }

  useEffect(() => {
    fetchData()
  }, [globalFilters.patch, globalFilters.folder_id, globalFilters.opponent_id])

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-white font-semibold text-sm">Most played - {user?.team_name || "My Team"}</h3>
      </div>
      <div className="space-y-2">
        {Object.entries(data || {}).map(([role, champions]) => (
          <div key={role}>
            <div className="flex items-center gap-1.5 mb-1">
              <img src={ROLE_ICONS[role]} alt={role} className="w-4 h-4 opacity-70" />
              <span className="text-slate-400 text-[10px] font-medium uppercase">{role}</span>
            </div>
            <div className="flex items-center gap-2">
              {champions.map(champ => (
                <div key={champ.name} className="flex items-center gap-1 p-1 rounded-lg">
                  <div className="w-7 h-7 rounded-md overflow-hidden bg-slate-700 flex-shrink-0">
                    <img
                      src={getChampionIcon(champ.name)}
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

function ProMostPlayedPanel({ selectedLeagues }) {
  const [data, setData] = useState([])

  const fetchData = async () => {
    try {
      const { ok, data, code } = await api.post("/pro-game/most-played", selectedLeagues.length ? { leagues: selectedLeagues } : {})
      if (!ok) return toast.error(code || "Failed to fetch enemy most-played")
      setData(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch enemy most-played")
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedLeagues])

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-white font-semibold text-sm">Most played - Pro League</h3>
      </div>
      <div className="space-y-2">
        {Object.entries(data || {}).map(([role, champions]) => (
          <div key={role}>
            <div className="flex items-center gap-1.5 mb-1">
              <img src={ROLE_ICONS[role]} alt={role} className="w-4 h-4 opacity-70" />
              <span className="text-slate-400 text-[10px] font-medium uppercase">{role}</span>
            </div>
            <div className="flex items-center gap-2">
              {champions.map(champ => (
                <div key={champ.name} className="flex items-center gap-1 p-1 rounded-lg">
                  <div className="w-7 h-7 rounded-md overflow-hidden bg-slate-700 flex-shrink-0">
                    <img
                      src={getChampionIcon(champ.name)}
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

function MyTeamCombosPanel() {
  const { globalFilters } = useStore()
  const [data, setData] = useState([])

  const fetchData = async () => {
    try {
      const { ok, data, code } = await api.post("/playerstats/best-combos", { ...globalFilters })
      if (!ok) return toast.error(code || "Failed to fetch my team combos")
      setData(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch my team combos")
    }
  }

  useEffect(() => {
    fetchData()
  }, [globalFilters.patch, globalFilters.folder_id, globalFilters.opponent_id])

  return (
    <div className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-4 h-4 text-emerald-500" />
        <h3 className="text-emerald-500 font-semibold text-sm">Most Played Combos</h3>
      </div>
      <div className="space-y-2">
        {(data || []).map((combo, idx) => (
          <div key={idx} className="flex items-center justify-between bg-slate-700/30 rounded-full px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                <div className="w-7 h-7 rounded-full bg-slate-600 overflow-hidden border-2 border-slate-500">
                  <img
                    src={getChampionIcon(combo.champ1)}
                    alt={combo.champ1}
                    className="w-full h-full object-cover"
                    onError={e => {
                      e.target.style.display = "none"
                    }}
                  />
                </div>
                <div className="w-7 h-7 rounded-full bg-slate-600 overflow-hidden border-2 border-slate-500 -ml-2">
                  <img
                    src={getChampionIcon(combo.champ2)}
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

function ProCombosPanel({ selectedLeagues }) {
  const [data, setData] = useState([])

  const fetchData = async () => {
    try {
      const { ok, data, code } = await api.post("/pro-game/best-combos", selectedLeagues.length ? { leagues: selectedLeagues } : {})
      if (!ok) return toast.error(code || "Failed to fetch enemy team combos")
      setData(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch enemy team combos")
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedLeagues])

  return (
    <div className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-4 h-4 text-emerald-500" />
        <h3 className="text-emerald-500 font-semibold text-sm">Most Played Combos</h3>
      </div>
      <div className="space-y-2">
        {(data || []).map((combo, idx) => (
          <div key={idx} className="flex items-center justify-between bg-slate-700/30 rounded-full px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                <div className="w-7 h-7 rounded-full bg-slate-600 overflow-hidden border-2 border-slate-500">
                  <img
                    src={getChampionIcon(combo.champ1)}
                    alt={combo.champ1}
                    className="w-full h-full object-cover"
                    onError={e => {
                      e.target.style.display = "none"
                    }}
                  />
                </div>
                <div className="w-7 h-7 rounded-full bg-slate-600 overflow-hidden border-2 border-slate-500 -ml-2">
                  <img
                    src={getChampionIcon(combo.champ2)}
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

function MyTeamFlexedPanel() {
  const { globalFilters } = useStore()
  const [data, setData] = useState([])

  const fetchData = async () => {
    try {
      const { ok, data, code } = await api.post("/playerstats/most-flexed", { ...globalFilters, limit: 3 })
      if (!ok) return toast.error(code || "Failed to fetch my team flexed champions")
      setData(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch my team flexed champions")
    }
  }

  useEffect(() => {
    fetchData()
  }, [globalFilters.patch, globalFilters.folder_id, globalFilters.opponent_id])

  if (!data || data.length === 0) {
    return (
      <div className="flex-1 min-w-0 bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">
        <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-2">🔄 Most Flexed - My Team</p>
        <p className="text-slate-500 text-xs">No flex picks data</p>
      </div>
    )
  }

  return (
    <div className="flex-1 min-w-0 bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">
      <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-2">🔄 Most Flexed - My Team</p>
      <div className="flex items-center gap-3">
        {data.map((champ, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-md overflow-hidden bg-slate-700 flex-shrink-0">
              <img
                src={getChampionIcon(champ.name)}
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

function ProFlexedPanel({ selectedLeagues }) {
  const [data, setData] = useState([])

  const fetchData = async () => {
    try {
      const body = { limit: 3 }
      if (selectedLeagues.length) body.leagues = selectedLeagues
      const { ok, data, code } = await api.post("/pro-game/most-flexed", body)
      if (!ok) return toast.error(code || "Failed to fetch pro flexed champions")
      setData(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch pro flexed champions")
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedLeagues])

  if (!data || data.length === 0) {
    return (
      <div className="flex-1 min-w-0 bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">
        <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-2">🔄 Most Flexed - Pro</p>
        <p className="text-slate-500 text-xs">No flex picks data</p>
      </div>
    )
  }

  return (
    <div className="flex-1 min-w-0 bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">
      <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-2">🔄 Most Flexed - Pro</p>
      <div className="flex items-center gap-3">
        {data.map((champ, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-md overflow-hidden bg-slate-700 flex-shrink-0">
              <img
                src={getChampionIcon(champ.name)}
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

function ChampionModal({ modalType, scenario, selectChampionFromModal, closeModal }) {
  const { team } = useStore()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRole, setSelectedRole] = useState(null)

  const usedChampions = [...scenario.blueBans, ...scenario.redBans, ...scenario.bluePicks, ...scenario.redPicks].filter(Boolean)

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={closeModal}>
      <div className="bg-slate-800 border border-slate-700 rounded-xl w-[900px] max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-white font-semibold text-lg">Select Champion - {modalType === "ban" ? "Ban" : "Pick"}</h2>
          <button onClick={closeModal} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

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
              {DRAFT_ROLES.map(role => (
                <button
                  key={role}
                  onClick={() => {
                    setSelectedRole(selectedRole === role ? null : role)
                    setSearchQuery("")
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${selectedRole === role ? "bg-amber-500 text-slate-900" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
        </div>

        {!searchQuery && !selectedRole && modalType === "pick" && (team?.prio_pick?.length > 0 || team?.prio_flex?.length > 0) && (
          <div className="p-4 border-b border-slate-700 bg-slate-800/50">
            <div className="flex gap-6">
              {team?.prio_pick?.length > 0 && (
                <div className="flex-[2]">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="w-4 h-4 text-amber-500" />
                    <p className="text-amber-500 text-xs font-semibold uppercase">Priority Picks</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {team.prio_pick.map(champ => (
                      <button
                        key={champ}
                        onClick={() => !usedChampions.includes(champ) && selectChampionFromModal(champ)}
                        disabled={usedChampions.includes(champ)}
                        className={`flex flex-col items-center p-2 rounded-lg border transition-colors ${usedChampions.includes(champ) ? "bg-slate-700/30 border-slate-600 opacity-40 cursor-not-allowed" : "bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20 cursor-pointer"}`}
                      >
                        <div className={`w-10 h-10 rounded-lg overflow-hidden bg-slate-700 ${usedChampions.includes(champ) ? "grayscale" : ""}`}>
                          <img
                            src={getChampionIcon(champ)}
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

              {team?.prio_flex?.length > 0 && (
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Shuffle className="w-4 h-4 text-cyan-500" />
                    <p className="text-cyan-500 text-xs font-semibold uppercase">Flex Picks</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {team.prio_flex
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
                              src={getChampionIcon(champ)}
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

        <div className="p-4 overflow-y-auto max-h-[50vh]">
          <div className="grid grid-cols-10 gap-2">
            {(searchQuery
              ? ALL_CHAMPIONS.filter(c => c.toLowerCase().includes(searchQuery.toLowerCase()))
              : selectedRole && CHAMPIONS_BY_ROLE[selectedRole]
                ? CHAMPIONS_BY_ROLE[selectedRole].filter(c => ALL_CHAMPIONS.includes(c))
                : ALL_CHAMPIONS
            ).map(champion => (
              <button
                key={champion}
                onClick={() => !usedChampions.includes(champion) && selectChampionFromModal(champion)}
                disabled={usedChampions.includes(champion)}
                className={`flex flex-col items-center p-1.5 rounded-lg transition-colors ${usedChampions.includes(champion) ? "opacity-30 cursor-not-allowed" : "hover:bg-slate-700 cursor-pointer"}`}
              >
                <div className={`w-10 h-10 rounded-lg overflow-hidden bg-slate-700 ${usedChampions.includes(champion) ? "grayscale" : ""}`}>
                  <img
                    src={getChampionIcon(champion)}
                    alt={champion}
                    className="w-full h-full object-cover"
                    onError={e => {
                      e.target.style.display = "none"
                    }}
                  />
                </div>
                <span className="text-slate-300 text-[9px] mt-1 text-center truncate w-full">{champion}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
