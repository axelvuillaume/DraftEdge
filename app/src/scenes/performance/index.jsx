import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom"
import Draft from "./draft"
import ScrimHub from "./scrim"
import TeamObjectives from "./team-objectives"
import SoloQObjectives from "./soloq-objectives"
import StratMap from "./strat-map"
import ReplayBook from "./replay-book"

const TABS = [
  { key: "team-objectives", label: "Team Objectives", path: "team-objectives", title: "Team Objectives", description: "Track scrim team objectives." },
  { key: "scrims", label: "Scrims", path: "scrims", title: "Scrim", description: "Organize your scrim sessions and track reviews." },
  { key: "soloq-objectives", label: "SoloQ Objectives", path: "soloq-objectives", title: "SoloQ Objectives", description: "Track individual SoloQ goals." },
  { key: "draft", label: "Draft", path: "draft", title: "Draft Prep", description: "Prepare and analyze draft scenarios for upcoming matches." },
  { key: "map", label: "Strat Map", path: "map", title: "Map Planner", description: "Plan strategies, vision control and rotations on the map." },
  { key: "replay-book", label: "Replay Book", path: "replay-book", title: "Replay Book", description: "Track and analyze your replay book." }
]

export default function Performance() {
  const location = useLocation()
  const navigate = useNavigate()

  const active = TABS.find(t => location.pathname.includes(`/performance/${t.path}`)) || TABS[0]
  const activeTab = active.key

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 border-b border-slate-700/50 bg-slate-900/50 px-6 pt-4">
        <div className="mb-3">
          <h1 className="text-white text-lg font-bold">{active.title}</h1>
          <p className="text-slate-400 text-sm">{active.description}</p>
        </div>
        <div className="flex items-center">
          {TABS.map((tab, i) => {
            const isActive = activeTab === tab.key
            return (
              <div key={tab.key} className="flex items-center">
                {i > 0 && <div className="w-px h-4 bg-slate-600 mx-1" />}
                <button
                  onClick={() => navigate(`/performance/${tab.path}`)}
                  className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
                    isActive ? "text-amber-400 border-amber-500" : "text-slate-400 border-transparent hover:text-white hover:border-slate-600"
                  }`}
                >
                  {tab.label}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <Routes>
          <Route path="scrims/*" element={<ScrimHub />} />
          <Route path="team-objectives" element={<TeamObjectives />} />
          <Route path="soloq-objectives/*" element={<SoloQObjectives />} />
          <Route path="draft/*" element={<Draft />} />
          <Route path="map/*" element={<StratMap />} />
          <Route path="replay-book/*" element={<ReplayBook />} />
          <Route path="*" element={<Navigate to="team-objectives" replace />} />
        </Routes>
      </div>
    </div>
  )
}
