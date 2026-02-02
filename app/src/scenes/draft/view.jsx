import { useState } from "react"
import { RotateCcw, Save, Zap } from "lucide-react"

// Hardcoded champion data for priority picks
const PRIORITY_PICKS = {
  myTeam: {
    TOP: [
      { name: "Rumble", pr: 82, wr: 67 },
      { name: "Gnar", pr: 71, wr: 61 },
      { name: "KSante", pr: 65, wr: 58 }
    ],
    JGL: [
      { name: "Viego", pr: 85, wr: 64 },
      { name: "LeeSin", pr: 78, wr: 59 },
      { name: "JarvanIV", pr: 69, wr: 62 }
    ],
    MID: [
      { name: "Syndra", pr: 88, wr: 66 },
      { name: "Orianna", pr: 74, wr: 58 },
      { name: "Ahri", pr: 67, wr: 55 }
    ],
    ADC: [
      { name: "Jinx", pr: 83, wr: 68 },
      { name: "Kaisa", pr: 76, wr: 61 },
      { name: "Ezreal", pr: 70, wr: 57 }
    ],
    SUP: [
      { name: "Nautilus", pr: 81, wr: 63 },
      { name: "Thresh", pr: 73, wr: 59 },
      { name: "Rell", pr: 68, wr: 56 }
    ]
  },
  enemyTeam: {
    TOP: [
      { name: "Jax", pr: 87, wr: 62 },
      { name: "KSante", pr: 73, wr: 58 },
      { name: "Renekton", pr: 65, wr: 54 }
    ],
    JGL: [
      { name: "LeeSin", pr: 82, wr: 61 },
      { name: "Viego", pr: 75, wr: 57 },
      { name: "Nidalee", pr: 68, wr: 52 }
    ],
    MID: [
      { name: "Ahri", pr: 79, wr: 59 },
      { name: "Orianna", pr: 71, wr: 54 },
      { name: "Corki", pr: 64, wr: 51 }
    ],
    ADC: [
      { name: "Kaisa", pr: 85, wr: 63 },
      { name: "Varus", pr: 76, wr: 58 },
      { name: "Ezreal", pr: 69, wr: 54 }
    ],
    SUP: [
      { name: "Thresh", pr: 81, wr: 60 },
      { name: "Rell", pr: 74, wr: 57 },
      { name: "RenataGlasc", pr: 67, wr: 53 }
    ]
  }
}

const ROLE_ICONS = {
  TOP: "⚔️",
  JGL: "🌲",
  MID: "🎯",
  ADC: "🏹",
  SUP: "🛡️"
}

// Hardcoded average pro ban/pick data per slot
const PRO_AVERAGE_BANS = {
  blue: [
    ["Aurora", "Ksante", "Ambessa"],
    ["Viego", "LeeSin", "Elise"],
    ["Syndra", "Ahri", "Orianna"]
  ],
  red: [
    ["Rumble", "Jax", "Gnar"],
    ["Nidalee", "JarvanIV", "Viego"],
    ["Corki", "Azir", "Syndra"]
  ]
}

const PRO_AVERAGE_PICKS = {
  blue: [
    ["Ksante", "Rumble", "Jax"],
    ["Jinx", "Kaisa", "Varus"],
    ["Viego", "LeeSin", "Elise"],
    ["Nautilus", "Thresh", "Rell"],
    ["Syndra", "Orianna", "Ahri"]
  ],
  red: [
    ["Gnar", "Renekton", "Ksante"],
    ["Kaisa", "Ezreal", "Jinx"],
    ["JarvanIV", "Viego", "Nidalee"],
    ["Thresh", "Nautilus", "Leona"],
    ["Ahri", "Corki", "Orianna"]
  ]
}

const POSITION_LABELS = ["First", "Second", "Third", "Fourth", "Fifth"]

// Hardcoded best combos data
const BEST_COMBOS = {
  myTeam: [
    { champ1: "JarvanIV", champ1Short: "J4", champ2: "Syndra", champ2Short: "Sy", wr: 72 },
    { champ1: "Nautilus", champ1Short: "Nau", champ2: "Jinx", champ2Short: "Ji", wr: 68 },
    { champ1: "Rumble", champ1Short: "Ru", champ2: "Viego", champ2Short: "Vi", wr: 65 }
  ],
  enemyTeam: [
    { champ1: "LeeSin", champ1Short: "Lee", champ2: "Ahri", champ2Short: "Ah", wr: 70 },
    { champ1: "Thresh", champ1Short: "Th", champ2: "Kaisa", champ2Short: "Ka", wr: 67 },
    { champ1: "Jax", champ1Short: "Jax", champ2: "Viego", champ2Short: "Vi", wr: 64 }
  ]
}

const DRAFT_PHASES = [
  { phase: "BAN", side: "blue", count: 1 },
  { phase: "BAN", side: "red", count: 1 },
  { phase: "BAN", side: "blue", count: 1 },
  { phase: "BAN", side: "red", count: 1 },
  { phase: "BAN", side: "blue", count: 1 },
  { phase: "BAN", side: "red", count: 1 },
  { phase: "PICK", side: "blue", count: 1 },
  { phase: "PICK", side: "red", count: 2 },
  { phase: "PICK", side: "blue", count: 2 },
  { phase: "PICK", side: "red", count: 1 },
  { phase: "BAN", side: "red", count: 1 },
  { phase: "BAN", side: "blue", count: 1 },
  { phase: "BAN", side: "red", count: 1 },
  { phase: "BAN", side: "blue", count: 1 },
  { phase: "PICK", side: "red", count: 1 },
  { phase: "PICK", side: "blue", count: 2 },
  { phase: "PICK", side: "red", count: 1 }
]

export default function View() {
  const [myTeamSide, setMyTeamSide] = useState("blue")
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0)

  const [blueBans, setBlueBans] = useState(Array(5).fill(null))
  const [redBans, setRedBans] = useState(Array(5).fill(null))
  const [bluePicks, setBluePicks] = useState(Array(5).fill(null))
  const [redPicks, setRedPicks] = useState(Array(5).fill(null))

  const currentPhase = DRAFT_PHASES[currentPhaseIndex]
  const isMyTeamTurn = currentPhase?.side === myTeamSide

  const getPhaseLabel = () => {
    if (!currentPhase) return "DRAFT COMPLETE"
    return `${currentPhase.phase} PHASE ${currentPhaseIndex < 6 ? "1" : "2"}`
  }

  const handleChampionSelect = (champion, role) => {
    if (!currentPhase) return

    const side = currentPhase.side
    const isBan = currentPhase.phase === "BAN"

    if (isBan) {
      if (side === "blue") {
        const idx = blueBans.findIndex(b => b === null)
        if (idx !== -1) {
          const newBans = [...blueBans]
          newBans[idx] = { champion, role }
          setBlueBans(newBans)
        }
      } else {
        const idx = redBans.findIndex(b => b === null)
        if (idx !== -1) {
          const newBans = [...redBans]
          newBans[idx] = { champion, role }
          setRedBans(newBans)
        }
      }
    } else {
      if (side === "blue") {
        const idx = bluePicks.findIndex(p => p === null)
        if (idx !== -1) {
          const newPicks = [...bluePicks]
          newPicks[idx] = { champion, role }
          setBluePicks(newPicks)
        }
      } else {
        const idx = redPicks.findIndex(p => p === null)
        if (idx !== -1) {
          const newPicks = [...redPicks]
          newPicks[idx] = { champion, role }
          setRedPicks(newPicks)
        }
      }
    }

    if (currentPhaseIndex < DRAFT_PHASES.length - 1) {
      setCurrentPhaseIndex(currentPhaseIndex + 1)
    }
  }

  const handleReset = () => {
    setBlueBans(Array(5).fill(null))
    setRedBans(Array(5).fill(null))
    setBluePicks(Array(5).fill(null))
    setRedPicks(Array(5).fill(null))
    setCurrentPhaseIndex(0)
  }

  const handleSlotClick = (type, side, index) => {
    // Clear a slot when clicked
    if (type === "ban") {
      if (side === "blue") {
        const newBans = [...blueBans]
        newBans[index] = null
        setBlueBans(newBans)
      } else {
        const newBans = [...redBans]
        newBans[index] = null
        setRedBans(newBans)
      }
    } else {
      if (side === "blue") {
        const newPicks = [...bluePicks]
        newPicks[index] = null
        setBluePicks(newPicks)
      } else {
        const newPicks = [...redPicks]
        newPicks[index] = null
        setRedPicks(newPicks)
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 lg:p-6">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-slate-400 text-sm">Simulez et préparez vos scénarios de draft</p>
          <div className="flex items-center gap-3">
            <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded-lg transition-colors">
              <Save className="w-4 h-4" />
              Save Scenario
            </button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          {/* Left Panel - My Team Priority Picks */}
          <div className="col-span-3 space-y-4">
            <PriorityPicksPanel title="Priority Picks - My Team" data={PRIORITY_PICKS.myTeam} onSelect={handleChampionSelect} isActive={isMyTeamTurn} />
            <BestCombosPanel combos={BEST_COMBOS.myTeam} />
          </div>

          {/* Center - Draft Board */}
          <div className="col-span-6">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
              {/* Team Selection */}
              <div className="flex items-center justify-center gap-8 mb-6">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${myTeamSide === "blue" ? "bg-amber-500" : "bg-slate-600"}`} />
                  <span className="text-white font-semibold">My Team</span>
                </div>

                <div className="flex items-center gap-2"></div>

                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${myTeamSide === "red" ? "bg-amber-500" : "bg-slate-600"}`} />
                  <span className="text-white font-semibold">T1</span>
                </div>
              </div>

              {/* Draft Board */}
              <div className="flex items-start justify-between gap-4">
                {/* Blue Side */}
                <div className="flex-1 min-w-0">
                  {/* Bans */}
                  <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">BANS</p>
                  <div className="flex gap-2 mb-6">
                    {blueBans.map((ban, idx) => (
                      <ChampionSlot key={`blue-ban-${idx}`} champion={ban} type="ban" side="blue" index={idx} onClick={() => handleSlotClick("ban", "blue", idx)} />
                    ))}
                  </div>

                  {/* Picks */}
                  <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">PICKS</p>
                  <div className="space-y-2">
                    {["TOP", "JGL", "MID", "ADC", "SUP"].map((role, idx) => (
                      <div key={role} className="flex items-center gap-3">
                        <ChampionSlot champion={bluePicks[idx]} type="pick" side="blue" index={idx} onClick={() => handleSlotClick("pick", "blue", idx)} />
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

                {/* Red Side */}
                <div className="flex-1 min-w-0">
                  {/* Bans */}
                  <p className="text-slate-400 text-xs uppercase tracking-wider mb-2 text-right">BANS</p>
                  <div className="flex gap-2 mb-6 justify-end">
                    {redBans.map((ban, idx) => (
                      <ChampionSlot key={`red-ban-${idx}`} champion={ban} type="ban" side="red" index={idx} onClick={() => handleSlotClick("ban", "red", idx)} />
                    ))}
                  </div>

                  {/* Picks */}
                  <p className="text-slate-400 text-xs uppercase tracking-wider mb-2 text-right">PICKS</p>
                  <div className="space-y-2">
                    {["TOP", "JGL", "MID", "ADC", "SUP"].map((role, idx) => (
                      <div key={role} className="flex items-center gap-3 justify-end">
                        <span className="text-slate-500 text-xs uppercase">{role}</span>
                        <ChampionSlot champion={redPicks[idx]} type="pick" side="red" index={idx} onClick={() => handleSlotClick("pick", "red", idx)} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Enemy Team Priority Picks */}
          <div className="col-span-3 space-y-4">
            <PriorityPicksPanel title="Priority Picks - T1" data={PRIORITY_PICKS.enemyTeam} onSelect={handleChampionSelect} isActive={!isMyTeamTurn} />
            <BestCombosPanel combos={BEST_COMBOS.enemyTeam} />
          </div>
        </div>
      </div>
    </div>
  )
}

function PriorityPicksPanel({ title, data, onSelect, isActive }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 h-full">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-amber-500">⭐</span>
        <h3 className="text-white font-semibold text-sm">{title}</h3>
      </div>

      <div className="space-y-4">
        {Object.entries(data).map(([role, champions]) => (
          <div key={role}>
            <div className="flex items-center gap-2 mb-2">
              <span>{ROLE_ICONS[role]}</span>
              <span className="text-slate-400 text-xs font-medium uppercase">{role}</span>
            </div>
            <div className="space-y-1">
              {champions.map((champ, idx) => (
                <button
                  key={champ.name}
                  onClick={() => onSelect(champ.name, role)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${
                    isActive ? "hover:bg-slate-700/50 cursor-pointer" : "opacity-60 cursor-not-allowed"
                  }`}
                  disabled={!isActive}
                >
                  <div className="w-8 h-8 rounded-md overflow-hidden bg-slate-700">
                    <img
                      src={`/champions/${champ.name}.png`}
                      alt={champ.name}
                      className="w-full h-full object-cover"
                      onError={e => {
                        e.target.style.display = "none"
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500 text-xs">PR</span>
                      <span className="text-amber-400 text-xs font-semibold">{champ.pr}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500 text-xs">WR</span>
                      <span className={`text-xs font-semibold ${champ.wr >= 60 ? "text-emerald-400" : champ.wr >= 50 ? "text-amber-400" : "text-red-400"}`}>{champ.wr}%</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ChampionSlot({ champion, type, side, onClick, index }) {
  const isBan = type === "ban"
  const [showTooltip, setShowTooltip] = useState(false)

  const positionLabel = POSITION_LABELS[index] || ""
  const typeLabel = isBan ? "ban" : "pick"
  const sideLabel = side === "blue" ? "Blue Side" : "Red Side"
  const proChampions = isBan ? PRO_AVERAGE_BANS[side]?.[index] : PRO_AVERAGE_PICKS[side]?.[index]

  const isBlue = side === "blue"
  const borderColor = isBlue ? "border-blue-500/50" : "border-red-500/50"
  const bgColor = isBlue ? "bg-blue-500/10" : "bg-red-500/10"
  const hoverBorderColor = isBlue ? "hover:border-blue-400" : "hover:border-red-400"

  return (
    <div className={`relative ${showTooltip ? "z-[100]" : ""}`} onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}>
      <button
        onClick={onClick}
        className={`
          ${isBan ? "w-12 h-12" : "w-14 h-14"}
          rounded-lg border-2 border-dashed transition-all
          ${
            champion
              ? isBan
                ? `${borderColor} ${bgColor} grayscale`
                : `${borderColor} ${bgColor}`
              : `border-slate-600 bg-slate-700/30 ${hoverBorderColor}`
          }
          flex items-center justify-center overflow-hidden
        `}
      >
        {champion ? (
          <div className="w-full h-full relative">
            <img
              src={`/champions/${champion.champion}.png`}
              alt={champion.champion}
              className={`w-full h-full object-cover ${isBan ? "grayscale opacity-50" : ""}`}
              onError={e => {
                e.target.style.display = "none"
              }}
            />
            {isBan && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={`w-full h-0.5 ${isBlue ? "bg-blue-500" : "bg-red-500"} rotate-45`} />
              </div>
            )}
          </div>
        ) : (
          <span className={`text-xs ${isBlue ? "text-blue-400" : "text-red-400"}`}>{isBan ? "BAN" : side === "blue" ? "B" : "R"}</span>
        )}
      </button>

      {/* Tooltip */}
      {showTooltip && proChampions && (
        <div className={`absolute z-[100] bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 border ${isBlue ? "border-blue-500/50" : "border-red-500/50"} rounded-lg p-3 shadow-xl whitespace-nowrap`}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${isBlue ? "bg-blue-500/20 text-blue-400" : "bg-red-500/20 text-red-400"}`}>
              {sideLabel}
            </span>
          </div>
          <p className="text-white text-xs font-semibold mb-2">
            {positionLabel} {typeLabel} average Pro:
          </p>
          <div className="flex items-center gap-2">
            {proChampions.map((champ, idx) => (
              <div key={idx} className={`w-8 h-8 rounded-md overflow-hidden bg-slate-700 border ${isBlue ? "border-blue-500/30" : "border-red-500/30"}`}>
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
          {/* Arrow */}
          <div className={`absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] ${isBlue ? "border-t-blue-500/50" : "border-t-red-500/50"}`} />
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
        <h3 className="text-emerald-500 font-semibold text-sm">Best Combos</h3>
      </div>

      <div className="space-y-2">
        {combos.map((combo, idx) => (
          <div key={idx} className="flex items-center justify-between bg-slate-700/30 rounded-full px-3 py-2">
            <div className="flex items-center gap-2">
              {/* Champion 1 badge */}
              <div className="flex items-center">
                <div className="w-7 h-7 rounded-full bg-slate-600 overflow-hidden border-2 border-slate-500">
                  <img
                    src={`/champions/${combo.champ1}.png`}
                    alt={combo.champ1}
                    className="w-full h-full object-cover"
                    onError={e => {
                      e.target.style.display = "none"
                      e.target.parentElement.innerHTML = `<span class="text-[10px] text-slate-400 flex items-center justify-center w-full h-full">${combo.champ1Short}</span>`
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
                      e.target.parentElement.innerHTML = `<span class="text-[10px] text-slate-400 flex items-center justify-center w-full h-full">${combo.champ2Short}</span>`
                    }}
                  />
                </div>
              </div>
              <span className="text-white text-sm">
                {combo.champ1Short} + {combo.champ2}
              </span>
            </div>
            <span className="text-emerald-400 font-semibold text-sm">{combo.wr}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
