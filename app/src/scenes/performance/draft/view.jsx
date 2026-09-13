import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { useParams, useNavigate } from "react-router-dom"
import { toast } from "react-hot-toast"
import { X, Search } from "lucide-react"
import api from "@/services/api"
import useStore from "@/services/store"
import DebounceInput from "@/components/debounceInput"
import OpponentDropdown from "@/components/OpponentDropdown"
import { getChampionIcon, DRAFT_ROLES, ROLE_ICONS, POSITION_LABELS, ALL_CHAMPIONS, CHAMPIONS_BY_ROLE } from "@/utils"

// Official draft order, grouped into 4 strips
const DRAFT_GROUPS = [
  {
    label: "BANS · P1",
    slots: [
      { key: "blueBans", index: 0, type: "ban", side: "blue", tag: "BB1" },
      { key: "blueBans", index: 1, type: "ban", side: "blue", tag: "BB2" },
      { key: "blueBans", index: 2, type: "ban", side: "blue", tag: "BB3" },
      { key: "redBans", index: 0, type: "ban", side: "red", tag: "RB1" },
      { key: "redBans", index: 1, type: "ban", side: "red", tag: "RB2" },
      { key: "redBans", index: 2, type: "ban", side: "red", tag: "RB3" }
    ]
  },
  {
    label: "PICKS · P1",
    slots: [
      { key: "bluePicks", index: 0, type: "pick", side: "blue", tag: "B1" },
      { key: "redPicks", index: 0, type: "pick", side: "red", tag: "R1" },
      { key: "redPicks", index: 1, type: "pick", side: "red", tag: "R2" },
      { key: "bluePicks", index: 1, type: "pick", side: "blue", tag: "B2" },
      { key: "bluePicks", index: 2, type: "pick", side: "blue", tag: "B3" },
      { key: "redPicks", index: 2, type: "pick", side: "red", tag: "R3" }
    ]
  },
  {
    label: "BANS · P2",
    slots: [
      { key: "redBans", index: 3, type: "ban", side: "red", tag: "RB4" },
      { key: "blueBans", index: 3, type: "ban", side: "blue", tag: "BB4" },
      { key: "redBans", index: 4, type: "ban", side: "red", tag: "RB5" },
      { key: "blueBans", index: 4, type: "ban", side: "blue", tag: "BB5" }
    ]
  },
  {
    label: "PICKS · P2",
    slots: [
      { key: "redPicks", index: 3, type: "pick", side: "red", tag: "R4" },
      { key: "bluePicks", index: 3, type: "pick", side: "blue", tag: "B4" },
      { key: "bluePicks", index: 4, type: "pick", side: "blue", tag: "B5" },
      { key: "redPicks", index: 4, type: "pick", side: "red", tag: "R5" }
    ]
  }
]

export default function View() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [draft, setDraft] = useState(null)

  const fetchDraft = async () => {
    try {
      const { ok, data, code } = await api.get(`/draft/${id}`)
      if (!ok) {
        toast.error(code || "Failed to fetch draft")
        return navigate("/performance/draft")
      }
      if (data._id !== id) return navigate(`/performance/draft/${data._id}`, { replace: true })
      setDraft(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch draft")
    }
  }

  useEffect(() => {
    fetchDraft()
  }, [id])

  const saveDraft = async updated => {
    setDraft(updated)
    try {
      const { ok, code } = await api.put(`/draft/${updated._id}`, updated)
      if (!ok) return toast.error(code || "Failed to save draft")
    } catch (error) {
      toast.error(error.code || "Failed to save draft")
    }
  }

  if (!draft) return <div className="min-h-[calc(100vh-65px)] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
  return <Planner draft={draft} saveDraft={saveDraft} />
}

function Planner({ draft, saveDraft }) {
  const navigate = useNavigate()
  const { user } = useStore()
  const [scenarios, setScenarios] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [modal, setModal] = useState(null)

  const fetchScenarios = async () => {
    try {
      const { ok, data, code } = await api.post("/draft-scenario/search", { team_id: user?.team_id, draft_id: draft._id })
      if (!ok) return toast.error(code || "Failed to fetch scenarios")
      setScenarios(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch scenarios")
    }
  }

  useEffect(() => {
    fetchScenarios()
  }, [draft._id])

  useEffect(() => {
    if (scenarios.some(s => s._id === activeId)) return
    setActiveId(scenarios.find(s => !s.parent_id)?._id || null)
  }, [scenarios])

  const createScenario = async () => {
    try {
      const { ok, data, code } = await api.post("/draft-scenario", {
        name: "New scenario",
        draft_id: draft._id,
        side: "blue",
        blueBans: Array(5).fill(null),
        redBans: Array(5).fill(null),
        bluePicks: Array(5).fill(null),
        redPicks: Array(5).fill(null),
        opponent_id: draft.opponent_id || undefined,
        opponent_name: draft.opponent_name || undefined
      })
      if (!ok) return toast.error(code || "Failed to create scenario")
      setActiveId(data._id)
      fetchScenarios()
    } catch (error) {
      toast.error(error.code || "Failed to create scenario")
    }
  }

  const branchScenario = async scenario => {
    try {
      const { ok, data, code } = await api.post("/draft-scenario", {
        name: scenario.name,
        draft_id: draft._id,
        parent_id: scenario._id,
        condition: "if …",
        side: scenario.side || "blue",
        blueBans: Array.from({ length: 5 }, (_, i) => scenario.blueBans?.[i] || null),
        redBans: Array.from({ length: 5 }, (_, i) => scenario.redBans?.[i] || null),
        bluePicks: Array.from({ length: 5 }, (_, i) => scenario.bluePicks?.[i] || null),
        redPicks: Array.from({ length: 5 }, (_, i) => scenario.redPicks?.[i] || null),
        opponent_id: scenario.opponent_id || undefined,
        opponent_name: scenario.opponent_name || undefined
      })
      if (!ok) return toast.error(code || "Failed to branch scenario")
      setActiveId(data._id)
      fetchScenarios()
    } catch (error) {
      toast.error(error.code || "Failed to branch scenario")
    }
  }

  const saveScenario = async updated => {
    setScenarios(prev => prev.map(s => (s._id === updated._id ? updated : s)))
    try {
      const { ok, code } = await api.put(`/draft-scenario/${updated._id}`, updated)
      if (!ok) return toast.error(code || "Failed to save scenario")
    } catch (error) {
      toast.error(error.code || "Failed to save scenario")
    }
  }

  const deleteScenario = async id => {
    try {
      const { ok, code } = await api.delete(`/draft-scenario/${id}`)
      if (!ok) return toast.error(code || "Failed to delete scenario")
      toast.success("Scenario deleted")
      fetchScenarios()
    } catch (error) {
      toast.error(error.code || "Failed to delete scenario")
    }
  }

  const selectChampionFromModal = champion => {
    const scenario = scenarios.find(s => s._id === modal.scenarioId)
    if (!scenario) return setModal(null)
    saveScenario({ ...scenario, [modal.key]: Array.from({ length: 5 }, (_, i) => (i === modal.index ? champion : scenario[modal.key]?.[i] || null)) })
    setModal(null)
  }

  return (
    <div className="min-h-[calc(100vh-65px)] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-[hsl(220_20%_92%)] font-inter px-6 pt-5 pb-12">
      <div className="flex items-center gap-3.5 flex-wrap mb-5">
        <button onClick={() => navigate("/performance/draft")} className="text-[hsl(220_10%_54%)] hover:text-[hsl(220_20%_92%)] text-base px-1.5 py-1 rounded-md transition-colors">
          ←
        </button>
        <DebounceInput
          type="text"
          placeholder="Draft name…"
          value={draft.name || ""}
          onChange={e => saveDraft({ ...draft, name: e.target.value })}
          className="px-3.5 py-2 rounded-lg bg-[hsl(228_22%_7%)] border border-[hsl(225_15%_15%)] text-[15px] font-bold tracking-[-0.02em] min-w-[220px] focus:outline-none focus:border-[hsl(234_89%_64%/0.5)]"
        />
        <OpponentDropdown value={draft.opponent_name || ""} onChange={team => saveDraft({ ...draft, opponent_id: team._id, opponent_name: team.name })} allowClear />
        <button
          onClick={createScenario}
          className="flex items-center gap-2 px-4 py-[9px] rounded-lg bg-[hsl(234_89%_64%)] text-white text-[13px] font-semibold transition-all duration-150 hover:shadow-[0_0_24px_hsl(234_89%_64%/0.35)]"
        >
          ＋ New scenario
        </button>
      </div>

      <div className="grid gap-5 items-start" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(540px, 1fr))" }}>
        <div className="flex flex-col gap-4 min-w-0">
          {scenarios.length === 0 && (
            <div className="border border-[hsl(225_15%_15%)] rounded-[10px] bg-[hsl(228_22%_7%)] p-6 text-center text-[hsl(220_10%_54%)] text-sm">
              No scenarios yet — create your first draft plan
            </div>
          )}
          {scenarios
            .filter(s => !s.parent_id)
            .map(root => (
              <ScenarioCard
                key={root._id}
                scenario={root}
                scenarios={scenarios}
                depth={0}
                activeId={activeId}
                setActiveId={setActiveId}
                saveScenario={saveScenario}
                branchScenario={branchScenario}
                deleteScenario={deleteScenario}
                openSlot={setModal}
              />
            ))}
        </div>

        <div className="flex flex-col gap-4 min-w-0">
          <div>
            <div className="font-jetbrains text-[10px] tracking-[0.14em] uppercase text-[hsl(220_10%_54%)] mb-2">Pools</div>
            <div className="grid gap-3 items-stretch" style={{ gridTemplateColumns: "1.4fr 1fr 1.4fr" }}>
              <OurPoolPanel activeScenario={scenarios.find(s => s._id === activeId)} />
              <CommonPoolPanel draft={draft} activeScenario={scenarios.find(s => s._id === activeId)} />
              <OpponentPoolPanel draft={draft} activeScenario={scenarios.find(s => s._id === activeId)} />
            </div>
          </div>

          <ModulesSection />
        </div>
      </div>

      {modal && (
        <ChampionModal
          modalType={modal.type}
          scenario={scenarios.find(s => s._id === modal.scenarioId)}
          selectChampionFromModal={selectChampionFromModal}
          closeModal={() => setModal(null)}
        />
      )}
    </div>
  )
}

function ScenarioCard({ scenario, scenarios, depth, activeId, setActiveId, saveScenario, branchScenario, deleteScenario, openSlot }) {
  const { team } = useStore()
  const [hoveredSlot, setHoveredSlot] = useState(null)

  const parent = scenarios.find(s => s._id === scenario.parent_id)
  const children = scenarios.filter(s => s.parent_id === scenario._id)
  const active = scenario._id === activeId

  const renderSlot = slot => {
    const champion = scenario[slot.key]?.[slot.index] || null
    const modified = parent && (parent[slot.key]?.[slot.index] || null) !== champion
    const slotId = `${slot.key}-${slot.index}`
    return (
      <div
        key={slot.tag}
        className="relative group"
        onMouseEnter={e => setHoveredSlot({ id: slotId, rect: e.currentTarget.getBoundingClientRect() })}
        onMouseLeave={() => setHoveredSlot(null)}
      >
        <button
          onClick={e => {
            e.stopPropagation()
            setHoveredSlot(null)
            openSlot({ scenarioId: scenario._id, key: slot.key, index: slot.index, type: slot.type, side: slot.side })
          }}
          className={`
            block w-[38px] h-11 rounded-md overflow-hidden relative text-left transition-all duration-150
            ${
              champion
                ? modified
                  ? "border-2 border-[hsl(38_92%_50%/0.7)]"
                  : slot.type === "pick" && team?.prio_pick?.includes(champion)
                    ? "border-2 border-[hsl(234_89%_64%)] shadow-[0_0_20px_hsl(234_89%_64%/0.25)]"
                    : `border ${slot.side === "blue" ? "border-[hsl(234_89%_64%/0.45)]" : "border-[hsl(0_62%_45%/0.5)]"}`
                : `border border-dashed ${
                    modified
                      ? "border-[hsl(38_92%_50%/0.7)] bg-[hsl(38_92%_50%/0.08)]"
                      : slot.side === "blue"
                        ? "border-[hsl(234_89%_64%/0.45)] bg-[hsl(234_89%_64%/0.08)] hover:bg-[hsl(234_89%_64%/0.16)]"
                        : "border-[hsl(0_62%_45%/0.5)] bg-[hsl(0_62%_45%/0.1)] hover:bg-[hsl(0_62%_45%/0.2)]"
                  }`
            }
          `}
        >
          {champion ? (
            <>
              <img
                src={getChampionIcon(champion)}
                alt={champion}
                className={`w-full h-full object-cover ${slot.type === "ban" ? "grayscale opacity-55" : ""}`}
                onError={e => (e.target.style.display = "none")}
              />
              {slot.type === "ban" && (
                <div className="absolute inset-0 flex items-center">
                  <div className={`w-full h-0.5 rotate-45 ${modified ? "bg-[hsl(38_92%_50%/0.9)]" : slot.side === "blue" ? "bg-[hsl(234_89%_64%/0.8)]" : "bg-[hsl(0_62%_55%/0.8)]"}`} />
                </div>
              )}
              {slot.type === "pick" && (
                <span className="absolute top-px left-0.5 font-jetbrains text-[7px] font-bold text-white [text-shadow:0_1px_2px_#000]">{slot.tag}</span>
              )}
            </>
          ) : (
            <span className={`absolute top-[3px] left-1 font-jetbrains text-[8px] ${slot.side === "blue" ? "text-[hsl(234_89%_74%)]" : "text-[hsl(0_62%_62%)]"}`}>{slot.tag}</span>
          )}
        </button>
        {champion && (
          <button
            onClick={e => {
              e.stopPropagation()
              saveScenario({ ...scenario, [slot.key]: Array.from({ length: 5 }, (_, i) => (i === slot.index ? null : scenario[slot.key]?.[i] || null)) })
            }}
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500/80 hover:bg-red-500 items-center justify-center text-white text-[8px] font-bold leading-none z-10 transition-colors hidden group-hover:flex"
          >
            ✕
          </button>
        )}
        {hoveredSlot?.id === slotId && <DraftTooltip champion={champion} type={slot.type} side={slot.side} index={slot.index} rect={hoveredSlot.rect} />}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {scenario.collapsed ? (
        <div
          onClick={() => setActiveId(scenario._id)}
          className={`relative border rounded-[10px] bg-[hsl(228_22%_7%)] px-3.5 py-[11px] flex items-center gap-2.5 flex-wrap cursor-pointer ${active ? "border-[hsl(234_89%_64%/0.55)] shadow-[0_0_20px_hsl(234_89%_64%/0.25)]" : "border-[hsl(225_15%_15%)]"}`}
        >
          {parent && <div className="absolute -left-5 -top-4 bottom-1/2 w-3.5 border-l border-b border-[hsl(38_92%_50%/0.5)] rounded-bl-lg" />}
          <button
            onClick={e => {
              e.stopPropagation()
              saveScenario({ ...scenario, collapsed: false })
            }}
            className="text-[hsl(220_10%_54%)] text-[11px]"
          >
            ▸
          </button>
          <div className={`text-[13px] font-semibold ${parent ? "italic text-[hsl(38_92%_62%)]" : ""}`}>{parent ? scenario.condition || "if …" : scenario.name || "Untitled"}</div>
          <button
            onClick={e => {
              e.stopPropagation()
              saveScenario({ ...scenario, side: scenario.side === "red" ? "blue" : "red" })
            }}
            className={`font-jetbrains text-[9px] px-2 py-[3px] rounded-full border ${scenario.side === "red" ? "bg-[hsl(0_62%_45%/0.12)] border-[hsl(0_62%_45%/0.4)] text-[hsl(0_70%_70%)]" : "bg-[hsl(234_89%_64%/0.12)] border-[hsl(234_89%_64%/0.4)] text-[hsl(234_89%_74%)]"}`}
          >
            {scenario.side === "red" ? "RED SIDE" : "BLUE SIDE"}
          </button>
          <span className="text-[11px] text-[hsl(220_10%_54%)]">
            {[...(scenario.bluePicks || []), ...(scenario.redPicks || [])].filter(Boolean).length} picks · {children.length} branch{children.length > 1 ? "es" : ""}
          </span>
          <button
            onClick={e => {
              e.stopPropagation()
              branchScenario(scenario)
            }}
            className="ml-auto font-jetbrains text-[11px] text-[hsl(220_10%_54%)] px-2.5 py-1.5 rounded-md transition-all duration-150 hover:text-[hsl(234_89%_74%)] hover:bg-[hsl(225_18%_13%)]"
          >
            ⑂ Branch
          </button>
          <button
            onClick={e => {
              e.stopPropagation()
              deleteScenario(scenario._id)
            }}
            className="text-xs text-[hsl(220_10%_54%)] px-2 py-1.5 rounded-md hover:text-[hsl(0_70%_70%)]"
          >
            ✕
          </button>
        </div>
      ) : (
        <div
          onClick={() => setActiveId(scenario._id)}
          className={`relative border rounded-[10px] bg-[hsl(228_22%_7%)] px-3.5 pt-3 pb-3.5 cursor-pointer ${active ? "border-[hsl(234_89%_64%/0.55)] shadow-[0_0_20px_hsl(234_89%_64%/0.25),0_0_40px_hsl(234_89%_64%/0.1)]" : "border-[hsl(225_15%_15%)]"}`}
        >
          {parent && <div className="absolute -left-5 -top-4 bottom-1/2 w-3.5 border-l border-b border-[hsl(38_92%_50%/0.5)] rounded-bl-lg" />}
          <div className="flex items-center gap-2 mb-2.5 flex-wrap">
            <button
              onClick={e => {
                e.stopPropagation()
                saveScenario({ ...scenario, collapsed: true })
              }}
              className="text-[hsl(220_10%_54%)] text-[11px]"
            >
              ▾
            </button>
            {parent ? (
              <DebounceInput
                type="text"
                placeholder="if …"
                value={scenario.condition || ""}
                onChange={e => saveScenario({ ...scenario, condition: e.target.value })}
                onClick={e => e.stopPropagation()}
                className="px-3 py-1.5 rounded-md bg-[hsl(228_25%_4%)] border border-[hsl(38_92%_50%/0.4)] text-[13px] italic text-[hsl(38_92%_62%)] min-w-[200px] focus:outline-none focus:border-[hsl(38_92%_50%/0.7)]"
              />
            ) : (
              <DebounceInput
                type="text"
                placeholder="Scenario name…"
                value={scenario.name || ""}
                onChange={e => saveScenario({ ...scenario, name: e.target.value })}
                onClick={e => e.stopPropagation()}
                className={`px-3 py-1.5 rounded-md bg-[hsl(228_25%_4%)] border text-[13px] font-semibold min-w-[200px] focus:outline-none ${active ? "border-[hsl(234_89%_64%/0.5)]" : "border-[hsl(225_15%_15%)] focus:border-[hsl(234_89%_64%/0.5)]"}`}
              />
            )}
            <button
              onClick={e => {
                e.stopPropagation()
                saveScenario({ ...scenario, side: scenario.side === "red" ? "blue" : "red" })
              }}
              className={`font-jetbrains text-[9px] px-2 py-[3px] rounded-full border ${scenario.side === "red" ? "bg-[hsl(0_62%_45%/0.12)] border-[hsl(0_62%_45%/0.4)] text-[hsl(0_70%_70%)]" : "bg-[hsl(234_89%_64%/0.12)] border-[hsl(234_89%_64%/0.4)] text-[hsl(234_89%_74%)]"}`}
            >
              {scenario.side === "red" ? "RED SIDE" : "BLUE SIDE"}
            </button>
            <button
              onClick={e => {
                e.stopPropagation()
                branchScenario(scenario)
              }}
              className="font-jetbrains text-[11px] text-[hsl(220_10%_54%)] px-2.5 py-1.5 rounded-md transition-all duration-150 hover:text-[hsl(234_89%_74%)] hover:bg-[hsl(225_18%_13%)]"
            >
              ⑂ Branch
            </button>
            <button
              onClick={e => {
                e.stopPropagation()
                deleteScenario(scenario._id)
              }}
              className="text-xs text-[hsl(220_10%_54%)] px-2 py-1.5 rounded-md hover:text-[hsl(0_70%_70%)]"
            >
              ✕
            </button>
            <div className="ml-auto flex items-center gap-2">
              {parent && (
                <span className="font-jetbrains text-[9px] px-2 py-[3px] rounded-full bg-[hsl(38_92%_50%/0.12)] border border-[hsl(38_92%_50%/0.35)] text-[hsl(38_92%_62%)] uppercase">
                  Branch of {parent.name || "?"}
                </span>
              )}
              {active && <span className="font-jetbrains text-[9px] px-2 py-[3px] rounded-full bg-[hsl(225_18%_13%)] text-[hsl(220_20%_92%)]">ACTIF</span>}
            </div>
          </div>
          <div className="overflow-x-auto pb-1">
            <div className="flex gap-3 items-start w-max">
              {DRAFT_GROUPS.map(group => (
                <div key={group.label} className="flex flex-col gap-1">
                  <div className="flex gap-1">{group.slots.map(slot => renderSlot(slot))}</div>
                  <div className="text-center font-jetbrains text-[8px] tracking-[0.14em] text-[hsl(220_10%_54%)]">
                    {group.label}
                    {parent && group.slots.filter(slot => (parent[slot.key]?.[slot.index] || null) !== (scenario[slot.key]?.[slot.index] || null)).length > 0 && (
                      <span className="text-[hsl(38_92%_62%)]">
                        {" "}
                        · {group.slots.filter(slot => (parent[slot.key]?.[slot.index] || null) !== (scenario[slot.key]?.[slot.index] || null)).length} MODIFIED
                        {group.slots.filter(slot => (parent[slot.key]?.[slot.index] || null) !== (scenario[slot.key]?.[slot.index] || null)).length > 1 ? "S" : ""}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {children.length > 0 && (
        <div className="ml-8 flex flex-col gap-4">
          {children.map(child => (
            <ScenarioCard
              key={child._id}
              scenario={child}
              scenarios={scenarios}
              depth={depth + 1}
              activeId={activeId}
              setActiveId={setActiveId}
              saveScenario={saveScenario}
              branchScenario={branchScenario}
              deleteScenario={deleteScenario}
              openSlot={openSlot}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function OurPoolPanel({ activeScenario }) {
  const { user, team, globalFilters } = useStore()
  const [data, setData] = useState({})

  const fetchData = async () => {
    try {
      const { ok, data, code } = await api.post("/playerstats/most-played", { ...globalFilters, limit: 4 })
      if (!ok) return toast.error(code || "Failed to fetch team pool")
      setData(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch team pool")
    }
  }

  useEffect(() => {
    fetchData()
  }, [globalFilters.patch, globalFilters.folder_id, globalFilters.opponent_id])

  const usedChampions = [
    ...(activeScenario?.blueBans || []),
    ...(activeScenario?.redBans || []),
    ...(activeScenario?.bluePicks || []),
    ...(activeScenario?.redPicks || [])
  ].filter(Boolean)

  return (
    <div className="bg-[hsl(228_22%_7%)] border border-[hsl(225_15%_15%)] rounded-[10px] p-3">
      <div className="text-xs font-semibold mb-2">Our pool{user?.team_name ? ` — ${user.team_name}` : ""}</div>
      <div className="flex flex-col gap-1.5">
        {DRAFT_ROLES.map(role => {
          if (!Array.isArray(data[role]) || data[role].length === 0) return null
          return (
            <div key={role} className="flex gap-2 items-start">
              <img src={ROLE_ICONS[role]} alt={role} className="w-3.5 h-3.5 opacity-60 mt-0.5 flex-shrink-0" />
              <div className="flex flex-wrap gap-x-2 gap-y-1.5">
                {data[role].map(champ => (
                  <div key={champ.name} className="flex items-center gap-1" title={champ.name}>
                    <img
                      src={getChampionIcon(champ.name)}
                      alt={champ.name}
                      className={`w-6 h-6 rounded object-cover ${usedChampions.includes(champ.name) ? "grayscale opacity-40" : ""} ${team?.prio_pick?.includes(champ.name) ? "outline outline-1 outline-[hsl(234_89%_64%)]" : ""}`}
                      onError={e => (e.target.style.display = "none")}
                    />
                    <div className="flex flex-col leading-[1.25]">
                      <span className="font-jetbrains text-[8px] text-[hsl(220_10%_54%)]">PR {champ.pr}%</span>
                      <span className={`font-jetbrains text-[8px] ${champ.wr >= 60 ? "text-[hsl(152_60%_44%)]" : champ.wr >= 50 ? "text-[hsl(38_92%_60%)]" : "text-[hsl(0_62%_62%)]"}`}>
                        WR {champ.wr}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
        {DRAFT_ROLES.every(role => !Array.isArray(data[role]) || data[role].length === 0) && <div className="text-xs text-[hsl(220_10%_54%)]">No scrim data</div>}
      </div>
    </div>
  )
}

function CommonPoolPanel({ draft, activeScenario }) {
  const { globalFilters } = useStore()
  const [data, setData] = useState([])

  const fetchData = async () => {
    if (!draft.opponent_id) return setData([])
    try {
      const { ok, data, code } = await api.post("/playerstats/common-pool", { ...globalFilters, opponent_id: draft.opponent_id })
      if (!ok) return toast.error(code || "Failed to fetch common pool")
      setData(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch common pool")
    }
  }

  useEffect(() => {
    fetchData()
  }, [draft.opponent_id, globalFilters.patch, globalFilters.folder_id])

  const usedChampions = [
    ...(activeScenario?.blueBans || []),
    ...(activeScenario?.redBans || []),
    ...(activeScenario?.bluePicks || []),
    ...(activeScenario?.redPicks || [])
  ].filter(Boolean)

  return (
    <div className="bg-[hsl(228_22%_7%)] border border-[hsl(225_15%_15%)] rounded-[10px] p-3">
      <div className="text-xs font-semibold mb-2">Common</div>
      {!draft.opponent_id ? (
        <div className="text-xs text-[hsl(220_10%_54%)]">Select an opponent</div>
      ) : data.length === 0 ? (
        <div className="text-xs text-[hsl(220_10%_54%)]">No common champions</div>
      ) : (
        <div className="flex flex-wrap gap-x-2 gap-y-1.5">
          {data.map(champ => (
            <div key={champ.name} className="flex items-center gap-1" title={`${champ.name} — us ${champ.ourWr}% (${champ.ourGames}g) · them ${champ.oppWr}% (${champ.oppGames}g)`}>
              <img
                src={getChampionIcon(champ.name)}
                alt={champ.name}
                className={`w-6 h-6 rounded object-cover ${usedChampions.includes(champ.name) ? "grayscale opacity-40" : ""}`}
                onError={e => (e.target.style.display = "none")}
              />
              <div className="flex flex-col leading-[1.25]">
                <span className={`font-jetbrains text-[8px] ${champ.ourWr >= 60 ? "text-[hsl(152_60%_44%)]" : champ.ourWr >= 50 ? "text-[hsl(38_92%_60%)]" : "text-[hsl(0_62%_62%)]"}`}>
                  US {champ.ourWr}%
                </span>
                <span className={`font-jetbrains text-[8px] ${champ.oppWr >= 60 ? "text-[hsl(152_60%_44%)]" : champ.oppWr >= 50 ? "text-[hsl(38_92%_60%)]" : "text-[hsl(0_62%_62%)]"}`}>
                  OP {champ.oppWr}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function OpponentPoolPanel({ draft, activeScenario }) {
  const { globalFilters } = useStore()
  const [data, setData] = useState({})

  const fetchData = async () => {
    if (!draft.opponent_id) return setData({})
    try {
      const { ok, data, code } = await api.post("/playerstats/opponent-pool", { ...globalFilters, opponent_id: draft.opponent_id, limit: 4 })
      if (!ok) return toast.error(code || "Failed to fetch opponent pool")
      setData(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch opponent pool")
    }
  }

  useEffect(() => {
    fetchData()
  }, [draft.opponent_id, globalFilters.patch, globalFilters.folder_id])

  const usedChampions = [
    ...(activeScenario?.blueBans || []),
    ...(activeScenario?.redBans || []),
    ...(activeScenario?.bluePicks || []),
    ...(activeScenario?.redPicks || [])
  ].filter(Boolean)

  return (
    <div className="bg-[hsl(228_22%_7%)] border border-[hsl(225_15%_15%)] rounded-[10px] p-3">
      <div className="text-xs font-semibold mb-2">Opponent{draft.opponent_name ? ` — ${draft.opponent_name}` : ""}</div>
      {!draft.opponent_id ? (
        <div className="text-xs text-[hsl(220_10%_54%)]">Select an opponent</div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {DRAFT_ROLES.map(role => {
            if (!Array.isArray(data[role]) || data[role].length === 0) return null
            return (
              <div key={role} className="flex gap-2 items-start">
                <img src={ROLE_ICONS[role]} alt={role} className="w-3.5 h-3.5 opacity-60 mt-0.5 flex-shrink-0" />
                <div className="flex flex-wrap gap-x-2 gap-y-1.5">
                  {data[role].map(champ => (
                    <div key={champ.name} className="flex items-center gap-1" title={champ.name}>
                      <img
                        src={getChampionIcon(champ.name)}
                        alt={champ.name}
                        className={`w-6 h-6 rounded object-cover ${usedChampions.includes(champ.name) ? "grayscale opacity-40" : ""}`}
                        onError={e => (e.target.style.display = "none")}
                      />
                      <div className="flex flex-col leading-[1.25]">
                        <span className="font-jetbrains text-[8px] text-[hsl(220_10%_54%)]">PR {champ.pr}%</span>
                        <span className={`font-jetbrains text-[8px] ${champ.wr >= 60 ? "text-[hsl(152_60%_44%)]" : champ.wr >= 50 ? "text-[hsl(38_92%_60%)]" : "text-[hsl(0_62%_62%)]"}`}>
                          WR {champ.wr}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
          {DRAFT_ROLES.every(role => !Array.isArray(data[role]) || data[role].length === 0) && (
            <div className="text-xs text-[hsl(220_10%_54%)]">No games vs this team</div>
          )}
        </div>
      )}
    </div>
  )
}

function ModulesSection() {
  const [filters, setFilters] = useState({ search: "" })

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="font-jetbrains text-[10px] tracking-[0.14em] uppercase text-[hsl(220_10%_54%)]">▾ Modules</span>
        <DebounceInput
          type="text"
          placeholder="Search a champion…"
          value={filters.search}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          className="ml-auto px-2.5 py-[5px] rounded-md bg-[hsl(225_18%_13%)] border border-[hsl(225_15%_15%)] text-[11px] text-[hsl(220_20%_92%)] placeholder-[hsl(220_10%_54%)] min-w-[140px] focus:outline-none focus:border-[hsl(234_89%_64%/0.5)]"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <ComboPanel title="J+M" roles={["jungle", "mid"]} filters={filters} />
        <ComboPanel title="A+S" roles={["bottom", "support"]} filters={filters} />
      </div>
    </div>
  )
}

function ComboPanel({ title, roles, filters }) {
  const { globalFilters } = useStore()
  const [data, setData] = useState([])

  const fetchData = async () => {
    try {
      const { ok, data, code } = await api.post("/playerstats/best-combos", { ...globalFilters, ...filters, roles, limit: 3 })
      if (!ok) return toast.error(code || "Failed to fetch combos")
      setData(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch combos")
    }
  }

  useEffect(() => {
    fetchData()
  }, [filters, globalFilters.patch, globalFilters.folder_id, globalFilters.opponent_id])

  return (
    <div className="bg-[hsl(228_22%_7%)] border border-[hsl(225_15%_15%)] rounded-[10px] p-3">
      <div className="text-xs font-semibold mb-2">{title}</div>
      <div className="flex flex-col gap-1.5">
        {(data || []).length === 0 && <div className="text-xs text-[hsl(220_10%_54%)]">No data</div>}
        {(data || []).map((combo, idx) => (
          <div key={idx} className="flex items-center gap-2 bg-[hsl(225_18%_13%/0.6)] rounded-full py-1 pr-2 pl-1">
            <div className="flex">
              <img
                src={getChampionIcon(combo.champ1)}
                alt={combo.champ1}
                className="w-[22px] h-[22px] rounded-full object-cover border-2 border-[hsl(225_15%_15%)]"
                onError={e => (e.target.style.display = "none")}
              />
              <img
                src={getChampionIcon(combo.champ2)}
                alt={combo.champ2}
                className="w-[22px] h-[22px] rounded-full object-cover border-2 border-[hsl(225_15%_15%)] -ml-2"
                onError={e => (e.target.style.display = "none")}
              />
            </div>
            <span className="text-[11px] flex-1 min-w-0 truncate">
              {combo.champ1} + {combo.champ2}
            </span>
            <span className="font-jetbrains text-[9px] text-[hsl(220_10%_54%)]">{combo.games}g</span>
            <span className={`font-jetbrains text-[10px] ${combo.wr >= 60 ? "text-[hsl(152_60%_44%)]" : combo.wr >= 50 ? "text-[hsl(38_92%_60%)]" : "text-[hsl(0_62%_62%)]"}`}>
              {combo.wr}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function DraftTooltip({ champion, type, side, index, rect }) {
  const { globalFilters } = useStore()
  const [draftAverages, setDraftAverages] = useState(null)
  const [myDraftAverages, setMyDraftAverages] = useState(null)
  const [mySynergies, setMySynergies] = useState(null)
  const [proSynergies, setProSynergies] = useState(null)

  const fetchDraftAverages = async () => {
    try {
      const { ok, data, code } = await api.post("/pro-game/draft-averages", {})
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
      const { ok, data, code } = await api.post("/pro-game/synergies", { champion })
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
                <img src={getChampionIcon(champ)} alt={champ} className="w-full h-full object-cover" onError={e => (e.target.style.display = "none")} />
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
                <img src={getChampionIcon(s.name)} alt={s.name} className="w-full h-full object-cover" onError={e => (e.target.style.display = "none")} />
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
                <img src={getChampionIcon(s.name)} alt={s.name} className="w-full h-full object-cover" onError={e => (e.target.style.display = "none")} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  return createPortal(
    <div
      className="fixed z-[200] -translate-x-1/2 bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl whitespace-nowrap pointer-events-none"
      style={{ left: rect.left + rect.width / 2, top: rect.bottom + 8 }}
    >
      <div className="flex gap-4">
        {renderColumn(myDraftAverages, mySynergies, "My Team", "text-amber-400", "border-amber-400/20", "border-amber-500/30")}
        <div className="w-px bg-slate-700" />
        {renderColumn(draftAverages, proSynergies, "Pro", "text-white", "border-slate-600", "border-slate-600")}
      </div>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-slate-700" />
    </div>,
    document.body
  )
}

function ChampionModal({ modalType, scenario, selectChampionFromModal, closeModal }) {
  const { team } = useStore()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRole, setSelectedRole] = useState(null)

  const usedChampions = [...(scenario?.blueBans || []), ...(scenario?.redBans || []), ...(scenario?.bluePicks || []), ...(scenario?.redPicks || [])].filter(Boolean)

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

        {!searchQuery && !selectedRole && modalType === "pick" && team?.prio_pick?.length > 0 && (
          <div className="p-4 border-b border-slate-700 bg-slate-800/50">
            <p className="text-amber-500 text-xs font-semibold uppercase mb-2">Priority Picks</p>
            <div className="flex gap-2 flex-wrap">
              {team.prio_pick.map(champ => (
                <button
                  key={champ}
                  onClick={() => !usedChampions.includes(champ) && selectChampionFromModal(champ)}
                  disabled={usedChampions.includes(champ)}
                  className={`flex flex-col items-center p-2 rounded-lg border transition-colors ${usedChampions.includes(champ) ? "bg-slate-700/30 border-slate-600 opacity-40 cursor-not-allowed" : "bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20 cursor-pointer"}`}
                >
                  <div className={`w-10 h-10 rounded-lg overflow-hidden bg-slate-700 ${usedChampions.includes(champ) ? "grayscale" : ""}`}>
                    <img src={getChampionIcon(champ)} alt={champ} className="w-full h-full object-cover" onError={e => (e.target.style.display = "none")} />
                  </div>
                  <span className="text-slate-300 text-[9px] mt-1">{champ}</span>
                </button>
              ))}
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
                  <img src={getChampionIcon(champion)} alt={champion} className="w-full h-full object-cover" onError={e => (e.target.style.display = "none")} />
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
