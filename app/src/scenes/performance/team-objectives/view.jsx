import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { toast } from "react-hot-toast"
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Users, ToggleLeft } from "lucide-react"
import api from "@/services/api"

const RATING_MAX = 10

function getRatingText(value) {
  if (!value) return "text-slate-500"
  if (value <= 3) return "text-red-400"
  if (value <= 5) return "text-amber-400"
  if (value <= 7) return "text-amber-300"
  return "text-emerald-400"
}

function getSuccessRateColor(rate) {
  if (rate == null) return "text-slate-500"
  if (rate < 30) return "text-red-400"
  if (rate < 50) return "text-amber-400"
  if (rate < 70) return "text-amber-300"
  return "text-emerald-400"
}

// SVG color values (Tailwind palette as space-separated rgb, matching soloq view.jsx)
function ratingColor(value) {
  if (value == null) return "rgb(100 116 139)"
  if (value <= 3) return "rgb(248 113 113)"
  if (value <= 5) return "rgb(251 191 36)"
  if (value <= 7) return "rgb(252 211 77)"
  return "rgb(52 211 153)"
}

function getSentiment(result, comment) {
  if (!comment) return "neutral"
  if (/^(work|need|fix|review|practice|focus)/i.test(comment)) return "action"
  if (result >= 7 || result === 1) return "positive"
  if (result <= 4 || result === 0) return "negative"
  return "neutral"
}

function sentimentColor(sentiment) {
  if (sentiment === "positive") return "rgb(52 211 153)"
  if (sentiment === "negative") return "rgb(248 113 113)"
  if (sentiment === "action") return "rgb(251 191 36)"
  return "rgb(100 116 139)"
}

export default function View() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [objective, setObjective] = useState(null)

  const fetchObjective = async () => {
    try {
      const { ok, data, code } = await api.get(`/scrim-objectif/${id}`)
      if (!ok) return toast.error(code || "Failed to fetch objective")
      setObjective(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch objective")
    }
  }

  useEffect(() => {
    fetchObjective()
  }, [id])

  if (!objective) return <div className="min-h-screen bg-slate-900 p-4 lg:p-6 text-slate-500 text-sm">Loading...</div>

  return (
    <div className="min-h-screen bg-slate-900 p-4 lg:p-6">
      <div className="max-w-[1180px] mx-auto space-y-5">
        <button onClick={() => navigate("/performance/team-objectives")} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <ObjectiveSplit objective={objective} />
      </div>
    </div>
  )
}

function ObjectiveSplit({ objective }) {
  const [results, setResults] = useState([])
  const [hoveredIdx, setHoveredIdx] = useState(null)

  const fetchResults = async () => {
    try {
      const { ok, data, code } = await api.post("/scrim-objectif-result/search", { objectif_id: objective._id })
      if (!ok) return toast.error(code || "Failed to fetch results")
      setResults(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch results")
    }
  }

  useEffect(() => {
    fetchResults()
  }, [objective._id])

  const sorted = [...results].filter(r => r.result != null).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))

  return (
    <>
      <MiniHeader objective={objective} sorted={sorted} />

      {sorted.length === 0 ? (
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl py-16 text-center">
          <p className="text-slate-500 text-sm">No evaluations yet</p>
          <p className="text-slate-600 text-xs mt-0.5">Rate this objective during scrims to track progress</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 items-start">
          <SplitChart objective={objective} sorted={sorted} hoveredIdx={hoveredIdx} setHoveredIdx={setHoveredIdx} />
          <SplitNotesPanel objective={objective} sorted={sorted} hoveredIdx={hoveredIdx} setHoveredIdx={setHoveredIdx} />
        </div>
      )}
    </>
  )
}

function MiniHeader({ objective, sorted }) {
  const navigate = useNavigate()
  const isToggle = objective.rating_type === "toggle"
  const values = sorted.map(r => r.result)
  const rate = isToggle && values.length > 0 ? Math.round((values.filter(v => v === 1).length / values.length) * 100) : null
  const avg = !isToggle && values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null

  // Trend = recent half vs early half
  const half = Math.floor(values.length / 2)
  const recent = values.slice(-half)
  const prior = values.slice(0, half)
  const delta =
    values.length < 4
      ? 0
      : isToggle
      ? Math.round((recent.filter(v => v === 1).length / recent.length - prior.filter(v => v === 1).length / prior.length) * 100)
      : Math.round((recent.reduce((a, b) => a + b, 0) / recent.length - prior.reduce((a, b) => a + b, 0) / prior.length) * 10) / 10

  return (
    <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-700/50">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
          {objective.player?.length > 0 ? (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-300 bg-violet-500/15 px-1.5 py-0.5 rounded">
              {objective.player.map(p => p.name).join(" · ")}
            </span>
          ) : (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-300 bg-indigo-500/15 px-1.5 py-0.5 rounded flex items-center gap-1">
              <Users className="w-3 h-3" />
              Team
            </span>
          )}
          <span className="text-[9px] font-medium uppercase tracking-wider text-slate-400 border border-slate-700 px-1.5 py-0.5 rounded flex items-center gap-1">
            {isToggle ? <ToggleLeft className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
            {isToggle ? "✓/✗" : "1–10"}
          </span>
          {objective.draft_scenario_name && (
            <span
              onClick={() => objective.draft_scenario_id && navigate(`/performance/draft/${objective.draft_scenario_id}`)}
              className={`text-[10px] font-medium text-blue-400/80 bg-blue-500/10 px-1.5 py-0.5 rounded ${objective.draft_scenario_id ? "hover:text-blue-300 cursor-pointer" : ""}`}
            >
              Draft: {objective.draft_scenario_name}
            </span>
          )}
          {objective.strat_map_name && (
            <span
              onClick={() => objective.strat_map_id && navigate(`/performance/map/${objective.strat_map_id}`)}
              className={`text-[10px] font-medium text-teal-400/80 bg-teal-500/10 px-1.5 py-0.5 rounded ${objective.strat_map_id ? "hover:text-teal-300 cursor-pointer" : ""}`}
            >
              Map: {objective.strat_map_name}
            </span>
          )}
        </div>
        <h1 className="text-white text-lg font-semibold truncate">{objective.name}</h1>
        {objective.description && <p className="text-slate-500 text-xs mt-0.5">{objective.description}</p>}
      </div>

      <div className="text-right shrink-0">
        <div className="flex items-baseline justify-end gap-1 tabular-nums">
          <span className={`text-2xl font-bold ${isToggle ? getSuccessRateColor(rate) : getRatingText(Math.round(avg))}`}>
            {values.length === 0 ? "–" : isToggle ? rate : avg.toFixed(1)}
          </span>
          {values.length > 0 && <span className="text-slate-600 text-xs">{isToggle ? "%" : "/10"}</span>}
        </div>
        <div className="flex items-center justify-end gap-1 mt-0.5 text-xs font-bold tabular-nums">
          {delta === 0 ? (
            <span className="text-slate-500 flex items-center gap-1">
              <Minus className="w-3 h-3" />
              flat
            </span>
          ) : delta > 0 ? (
            <span className="text-emerald-400 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {Math.abs(delta)}
              {isToggle ? "%" : ""}
            </span>
          ) : (
            <span className="text-red-400 flex items-center gap-1">
              <TrendingDown className="w-3 h-3" />
              {Math.abs(delta)}
              {isToggle ? "%" : ""}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function SplitChart({ objective, sorted, hoveredIdx, setHoveredIdx }) {
  const isToggle = objective.rating_type === "toggle"
  const max = isToggle ? 1 : RATING_MAX
  const noteCount = sorted.filter(r => r.comment).length

  const w = 740
  const h = 380
  const pad = { l: 38, r: 22, t: 30, b: 32 }
  const innerW = w - pad.l - pad.r
  const innerH = h - pad.t - pad.b
  const x = i => pad.l + (sorted.length === 1 ? innerW / 2 : (i / (sorted.length - 1)) * innerW)
  const y = v => pad.t + innerH - (v / max) * innerH

  const path = sorted.map((r, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(r.result)}`).join(" ")
  const area = `${path} L ${x(sorted.length - 1)} ${pad.t + innerH} L ${x(0)} ${pad.t + innerH} Z`

  // Week boundaries derived from createdAt (no week field in the data model)
  const firstDate = new Date(sorted[0].createdAt)
  const weekOf = r => Math.floor((new Date(r.createdAt) - firstDate) / (7 * 24 * 60 * 60 * 1000))
  const weekStarts = []
  let cur = -1
  sorted.forEach((r, i) => {
    const wk = weekOf(r)
    if (wk !== cur) {
      weekStarts.push({ week: wk, x: x(i) })
      cur = wk
    }
  })

  const yTicks = isToggle ? [0, 0.5, 1] : [0, 5, 10]

  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
      <p className="text-slate-200 text-sm font-semibold mb-3">Progression</p>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
        {yTicks.map(t => (
          <g key={t}>
            <line
              x1={pad.l}
              y1={y(t)}
              x2={pad.l + innerW}
              y2={y(t)}
              stroke="rgb(51 65 85)"
              strokeWidth="1"
              strokeDasharray={t === 0 ? "" : "2 3"}
              opacity={t === 0 ? 0.6 : 0.3}
            />
            <text x={pad.l - 8} y={y(t) + 3} textAnchor="end" className="fill-slate-500" fontSize="10">
              {isToggle ? `${t * 100}%` : t}
            </text>
          </g>
        ))}

        {weekStarts.map(({ week, x: wx }, i) =>
          i === 0 ? null : <line key={week} x1={wx} y1={pad.t} x2={wx} y2={pad.t + innerH} stroke="rgb(51 65 85)" strokeWidth="1" opacity="0.35" />
        )}

        <path d={area} fill="rgb(99 102 241)" opacity="0.12" />
        <path d={path} fill="none" stroke="rgb(99 102 241)" strokeWidth="2" strokeLinecap="round" />

        {hoveredIdx != null && sorted[hoveredIdx] && (
          <line
            x1={x(hoveredIdx)}
            y1={pad.t}
            x2={x(hoveredIdx)}
            y2={pad.t + innerH}
            stroke={sentimentColor(getSentiment(sorted[hoveredIdx].result, sorted[hoveredIdx].comment))}
            strokeWidth="1.5"
            opacity="0.6"
          />
        )}

        {sorted.map((r, i) => {
          const hasNote = !!r.comment
          const isHovered = hoveredIdx === i
          return (
            <g
              key={r._id}
              onMouseEnter={() => hasNote && setHoveredIdx(i)}
              onMouseLeave={() => hasNote && setHoveredIdx(null)}
              style={{ cursor: hasNote ? "pointer" : "default" }}
            >
              <rect x={x(i) - 10} y={pad.t} width="20" height={innerH} fill="transparent" />
              <circle
                cx={x(i)}
                cy={y(r.result)}
                r={isHovered ? 6 : hasNote ? 4 : 2.5}
                fill={isToggle ? (r.result === 1 ? "rgb(52 211 153)" : "rgb(248 113 113)") : ratingColor(r.result)}
                stroke={hasNote ? sentimentColor(getSentiment(r.result, r.comment)) : "transparent"}
                strokeWidth={isHovered ? 2.5 : 1.5}
              />
            </g>
          )
        })}

        {weekStarts.map(({ week, x: wx }) => (
          <text key={week} x={wx} y={h - 8} textAnchor="middle" className="fill-slate-500" fontSize="10">
            W{week + 1}
          </text>
        ))}
      </svg>
      <p className="text-slate-500 text-[11px] mt-2">
        Ringed points = games with a coach note · {noteCount}/{sorted.length}
      </p>
    </div>
  )
}

function SplitNotesPanel({ objective, sorted, hoveredIdx, setHoveredIdx }) {
  const navigate = useNavigate()
  const items = sorted.map((r, i) => ({ ...r, idx: i })).filter(r => r.comment).reverse()

  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl max-h-[432px] overflow-hidden flex flex-col">
      <div className="px-4 py-3.5 border-b border-slate-700/50 flex items-center justify-between bg-slate-800/80">
        <span className="text-slate-200 text-sm font-semibold">Coach notes</span>
        <span className="text-slate-500 text-[10px] tabular-nums">{items.length} entries</span>
      </div>
      <div className="overflow-y-auto flex-1">
        {items.length === 0 ? (
          <p className="text-slate-500 text-xs text-center py-10">No notes on this objective yet</p>
        ) : (
          items.map(r => (
            <div
              key={r._id}
              onMouseEnter={() => setHoveredIdx(r.idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={() => r.session_id && navigate(`/performance/scrims/${r.session_id}`)}
              style={{ borderLeftColor: hoveredIdx === r.idx ? sentimentColor(getSentiment(r.result, r.comment)) : "transparent" }}
              className={`px-4 py-3 border-b border-slate-700/30 border-l-2 transition-colors ${hoveredIdx === r.idx ? "bg-slate-800/80" : ""} ${r.session_id ? "cursor-pointer" : ""}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: sentimentColor(getSentiment(r.result, r.comment)) }}
                  />
                  <span className="text-slate-500 text-[10.5px] tabular-nums truncate">
                    {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    {r.session_name ? ` · ${r.session_name}` : ""}
                  </span>
                </div>
                {objective.rating_type === "toggle" ? (
                  <span className={`text-[10.5px] font-bold tabular-nums shrink-0 ${r.result === 1 ? "text-emerald-400" : "text-red-400"}`}>
                    {r.result === 1 ? "Done" : "Missed"}
                  </span>
                ) : (
                  <span className={`text-[10.5px] font-bold tabular-nums shrink-0 ${getRatingText(r.result)}`}>{r.result}/10</span>
                )}
              </div>
              <p className="text-slate-200 text-xs leading-relaxed">{r.comment}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
