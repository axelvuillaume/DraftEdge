import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom"
import { Gamepad2, BarChart3, LayoutDashboard } from "lucide-react"
import Overview from "./overview"
import Games from "./games"
import StatsV2 from "./advanced-stats"
import FilterBar from "@/components/FilterBar"

const TABS = [
  { key: "overview", label: "Overview", icon: LayoutDashboard, path: "overview", title: "Overview", description: "Key team stats at a glance." },
  {
    key: "stats",
    label: "Advanced Stats",
    icon: BarChart3,
    path: "stats",
    title: "Team Stats",
    description: "Analyze your team's performance metrics and compare against pro play."
  },
  { key: "games", label: "Games", icon: Gamepad2, path: "games", title: "Game History", description: "Browse and manage all your imported scrims and matches." }
]

export default function Performance() {
  const location = useLocation()
  const navigate = useNavigate()

  const active = TABS.find(t => location.pathname.includes(`/stats-team/${t.path}`)) || TABS[0]
  const activeTab = active.key

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 border-b border-slate-700/50 bg-slate-900/50 px-6 pt-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h1 className="text-white text-lg font-bold">{active.title}</h1>
            <p className="text-slate-400 text-sm">{active.description}</p>
          </div>
          <FilterBar />
        </div>
        <div className="flex items-center gap-1">
          {TABS.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => navigate(`/stats-team/${tab.path}`)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
                  isActive ? "text-amber-400 border-amber-500" : "text-slate-400 border-transparent hover:text-white hover:border-slate-600"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <Routes>
          <Route path="overview" element={<Overview />} />
          <Route path="stats" element={<StatsV2 />} />
          <Route path="games" element={<Games />} />
          <Route path="*" element={<Navigate to="overview" replace />} />
        </Routes>
      </div>
    </div>
  )
}
