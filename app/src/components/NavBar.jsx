import { useEffect, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { LayoutDashboard, Shield, BarChart3, Trophy, Target, Briefcase, Users, Settings } from "lucide-react"
import useStore from "@/services/store"

const getMenu = user => [
  { title: "Home", to: "/", icon: LayoutDashboard },
  { title: "Players", to: "/soloq", icon: Users },
  { title: "Performance", to: "/scrim-hub", icon: Target },
  { title: "Stats Team", to: "/performance", icon: BarChart3 },
  { title: "Manager space", to: "/opponents", icon: Briefcase },
  { title: "My League", to: "/league", icon: Trophy }
]

const Navbar = () => {
  const [selected, setSelected] = useState(0)
  const location = useLocation()
  const { user } = useStore()

  const MENU = getMenu(user)

  useEffect(() => {
    const index = MENU.findIndex(e => {
      if (e.to === "/") return location.pathname === "/"
      return location.pathname.includes(e.to)
    })
    setSelected(index >= 0 ? index : 0)
  }, [location, MENU.length])

  return (
    <div className="h-screen w-64 bg-slate-900 border-r border-slate-700/50 flex flex-col relative z-40">
      {/* Logo */}
      <div className="p-6 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-slate-900" />
          </div>
          <div>
            <span className="text-white font-bold text-lg tracking-tight">DraftEdge</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-1">
          {MENU.map((menu, index) => {
            const Icon = menu.icon
            const isActive = selected === index

            return (
              <Link
                to={menu.to}
                key={menu.title}
                className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-3 transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-amber-500/20 to-amber-600/10 text-amber-400 border border-amber-500/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                }`}
                onClick={() => setSelected(index)}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-amber-400" : ""}`} />
                <span className="text-sm font-medium">{menu.title}</span>
                {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-500" />}
              </Link>
            )
          })}
        </div>
      </nav>

      <div className="p-4 border-t border-slate-700/50 space-y-2">
        <Link
          to="/team"
          className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-3 transition-all duration-200 ${
            location.pathname.includes("/team")
              ? "bg-gradient-to-r from-amber-500/20 to-amber-600/10 text-amber-400 border border-amber-500/30"
              : "text-slate-400 hover:text-white hover:bg-slate-800/50"
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-sm font-medium">Settings Members</span>
        </Link>
        <div className="px-3 py-2 rounded-lg bg-slate-800/50">
          <p className="text-slate-500 text-xs">Version 1.0.0</p>
        </div>
      </div>
    </div>
  )
}

export default Navbar
