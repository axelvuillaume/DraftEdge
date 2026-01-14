import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Menu, Transition } from "@headlessui/react"
import { LogOut, ChevronDown, User, Settings, Shield } from "lucide-react"

import useStore from "@/services/store"
import api from "@/services/api"

const TopBar = () => {
  const { user } = useStore()

  return (
    <div className="w-full h-16 bg-slate-900/80 border-b border-slate-700/50 flex items-center justify-between px-6 relative z-40">
      {/* Logo / Brand */}
      <div className="flex items-center gap-3">
        <span className="text-white font-bold text-lg tracking-tight">{user?.team_name}</span>
      </div>

      {/* Profile Menu */}
      <ProfileMenu />
    </div>
  )
}

const ProfileMenu = () => {
  const navigate = useNavigate()
  const { user, setUser } = useStore()

  const handleLogout = async () => {
    setUser(null)
    api.removeToken()
    navigate("/auth")
  }

  const getInitials = name => {
    if (!name) return "?"
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Menu as="div" className="relative">
      <Menu.Button className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700/50 hover:border-slate-600/50 transition-all duration-200">
        {/* User Info */}
        <div className="hidden sm:flex flex-col items-start">
          <span className="text-white text-sm font-semibold leading-tight">{user?.name || "User"}</span>
        </div>

        <ChevronDown className="w-4 h-4 text-slate-400 ml-1" />
      </Menu.Button>

      <Transition
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right bg-slate-800 border border-slate-700/50 rounded-xl shadow-xl shadow-black/20 overflow-hidden focus:outline-none z-50">
          <div className="py-1">
            <Menu.Item>
              {({ active }) => (
                <button className={`${active ? "bg-slate-700/50" : ""} w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 transition-colors`}>
                  <User className="w-4 h-4 text-slate-400" />
                  <span>Mon profil</span>
                </button>
              )}
            </Menu.Item>
          </div>

          <div className="border-t border-slate-700/50 py-1">
            <Menu.Item>
              {({ active }) => (
                <button onClick={handleLogout} className={`${active ? "bg-red-500/10" : ""} w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 transition-colors`}>
                  <LogOut className="w-4 h-4" />
                  <span>Déconnexion</span>
                </button>
              )}
            </Menu.Item>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  )
}

export default TopBar
