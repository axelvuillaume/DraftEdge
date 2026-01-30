import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { Menu, Transition } from "@headlessui/react"
import { LogOut, ChevronDown, User, Settings, Shield, Search, X } from "lucide-react"

import useStore from "@/services/store"
import api from "@/services/api"

const TopBar = () => {
  const navigate = useNavigate()
  const { setSearchNavigation } = useStore()
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState({ players: [], allyChampions: [], enemyChampions: [] })
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    const searchData = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults({ players: [], allyChampions: [], enemyChampions: [] })
        return
      }

      setIsSearching(true)
      try {
        const { ok, data } = await api.post("/playerstats/search_nav", { query: searchQuery })
        if (ok) {
          setSearchResults(data)
        }
      } catch (error) {
        console.error("Search error:", error)
      } finally {
        setIsSearching(false)
      }
    }

    const debounce = setTimeout(searchData, 300)
    return () => clearTimeout(debounce)
  }, [searchQuery])

  const handleSelectPlayer = (player) => {
    setSearchNavigation({ type: "player", data: player })
    setSearchQuery("")
    setShowResults(false)
    navigate("/statsV2")
  }

  const handleSelectAllyChampion = (champion) => {
    setSearchNavigation({ type: "allyChampion", data: champion })
    setSearchQuery("")
    setShowResults(false)
    navigate("/statsV2")
  }

  const handleSelectEnemyChampion = (champion) => {
    setSearchNavigation({ type: "enemyChampion", data: champion })
    setSearchQuery("")
    setShowResults(false)
    navigate("/statsV2")
  }

  const hasResults = searchResults.players.length > 0 || searchResults.allyChampions.length > 0 || searchResults.enemyChampions.length > 0

  return (
    <div className="w-full h-16 bg-slate-900/80 border-b border-slate-700/50 flex items-center justify-between px-6 relative z-40">
      {/* Search Bar */}
      <div ref={searchRef} className="relative w-80">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setShowResults(true)
            }}
            onFocus={() => setShowResults(true)}
            placeholder="Search for a player or champion..."
            className="w-full h-10 pl-10 pr-10 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("")
                setSearchResults({ players: [], allyChampions: [], enemyChampions: [] })
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {showResults && searchQuery.trim().length >= 2 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700/50 rounded-xl shadow-xl shadow-black/20 overflow-hidden max-h-80 overflow-y-auto">
            {isSearching ? (
              <div className="p-4 text-center text-slate-400 text-sm">Searching...</div>
            ) : !hasResults ? (
              <div className="p-4 text-center text-slate-400 text-sm">No results</div>
            ) : (
              <>
                {searchResults.players.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-900/50">
                      Players
                    </div>
                    {searchResults.players.map((player, idx) => (
                      <button
                        key={`player-${idx}`}
                        onClick={() => handleSelectPlayer(player)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700/50 transition-colors text-left"
                      >
                        <div className="w-8 h-8 bg-slate-700/50 rounded-lg flex items-center justify-center">
                          <img
                            src={`/roles/${player.role}.png`}
                            alt={player.role}
                            className="w-5 h-5"
                            onError={(e) => (e.target.style.display = "none")}
                          />
                        </div>
                        <div className="flex-1">
                          <span className="text-white font-medium text-sm">{player.name}</span>
                          <span className="text-slate-500 text-xs ml-2 capitalize">{player.role}</span>
                        </div>
                        <span className="text-slate-400 text-xs">{player.games} games</span>
                      </button>
                    ))}
                  </div>
                )}

                {searchResults.allyChampions.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-xs font-semibold text-emerald-500 uppercase tracking-wider bg-slate-900/50 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      Allied Champions
                    </div>
                    {searchResults.allyChampions.map((champion, idx) => (
                      <button
                        key={`ally-champ-${idx}`}
                        onClick={() => handleSelectAllyChampion(champion)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700/50 transition-colors text-left"
                      >
                        <div className="w-8 h-8 bg-slate-700/50 rounded-lg flex items-center justify-center overflow-hidden border border-emerald-500/30">
                          <img
                            src={`/champions/${champion.name}.png`}
                            alt={champion.name}
                            className="w-full h-full object-cover"
                            onError={(e) => (e.target.style.display = "none")}
                          />
                        </div>
                        <div className="flex-1">
                          <span className="text-white font-medium text-sm">{champion.name}</span>
                          <span className="text-slate-500 text-xs ml-2">{champion.playerName}</span>
                        </div>
                        <span className="text-emerald-400 text-xs">{champion.games} games</span>
                      </button>
                    ))}
                  </div>
                )}

                {searchResults.enemyChampions.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-xs font-semibold text-red-400 uppercase tracking-wider bg-slate-900/50 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      Enemy Champions
                    </div>
                    {searchResults.enemyChampions.map((champion, idx) => (
                      <button
                        key={`enemy-champ-${idx}`}
                        onClick={() => handleSelectEnemyChampion(champion)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700/50 transition-colors text-left"
                      >
                        <div className="w-8 h-8 bg-slate-700/50 rounded-lg flex items-center justify-center overflow-hidden border border-red-500/30">
                          <img
                            src={`/champions/${champion.name}.png`}
                            alt={champion.name}
                            className="w-full h-full object-cover"
                            onError={(e) => (e.target.style.display = "none")}
                          />
                        </div>
                        <div className="flex-1">
                          <span className="text-white font-medium text-sm">{champion.name}</span>
                          <span className="text-red-400/70 text-xs ml-2">Enemy</span>
                        </div>
                        <span className="text-red-400 text-xs">{champion.games} games</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
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
                  <span>My Profile</span>
                </button>
              )}
            </Menu.Item>
          </div>

          <div className="border-t border-slate-700/50 py-1">
            <Menu.Item>
              {({ active }) => (
                <button onClick={handleLogout} className={`${active ? "bg-red-500/10" : ""} w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 transition-colors`}>
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
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
