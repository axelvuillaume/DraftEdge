import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { createPortal } from "react-dom"
import { toast } from "react-hot-toast"
import api from "@/services/api"
import useStore from "@/services/store"
import { ChevronDown, Plus } from "lucide-react"

export default function OpponentDropdown({ value, onChange, label, allowClear = false }) {
  const { user } = useStore()
  const [enemyTeams, setEnemyTeams] = useState([])
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const btnRef = useRef(null)
  const [dropdownPos, setDropdownPos] = useState(null)

  const fetchEnemyTeams = async () => {
    try {
      const { ok, data, code } = await api.post("/enemy-team/search", { team_id: user.team_id })
      if (!ok) return toast.error(code || "Failed to fetch teams")
      setEnemyTeams(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch teams")
    }
  }

  useEffect(() => {
    if (user?.team_id) fetchEnemyTeams()
  }, [user?.team_id])

  const updatePosition = useCallback(() => {
    if (!btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width })
  }, [])

  const handleToggle = () => {
    if (!open) {
      updatePosition()
      setSearch("")
    }
    setOpen(prev => !prev)
  }

  useEffect(() => {
    if (!open) return
    const onScrollOrResize = () => updatePosition()
    window.addEventListener("scroll", onScrollOrResize, true)
    window.addEventListener("resize", onScrollOrResize)
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true)
      window.removeEventListener("resize", onScrollOrResize)
    }
  }, [open, updatePosition])

  const createEnemyTeam = async name => {
    try {
      const { ok, data, code } = await api.post("/enemy-team", { name })
      if (!ok) return toast.error(code || "Failed to create team")
      setEnemyTeams(prev => [data, ...prev])
      onChange({ _id: data._id, name: data.name })
      setSearch("")
      setOpen(false)
    } catch (error) {
      toast.error(error.code || "Failed to create team")
    }
  }

  const filteredTeams = useMemo(() => {
    if (!search.trim()) return enemyTeams
    const q = search.trim().toLowerCase()
    return enemyTeams.filter(t => t.name.toLowerCase().includes(q))
  }, [enemyTeams, search])

  const exactMatch = useMemo(() => {
    if (!search.trim()) return true
    return enemyTeams.some(t => t.name.toLowerCase() === search.trim().toLowerCase())
  }, [enemyTeams, search])

  return (
    <div className="relative min-w-[200px]">
      {label && <label className="block text-sm font-medium text-slate-400 mb-1">{label}</label>}
      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-slate-600 hover:border-slate-500 bg-slate-700/50 transition-all text-left"
      >
        <span className={value ? "text-white text-sm" : "text-slate-400 text-sm"}>{value || "Select opponent..."}</span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>
      {open &&
        dropdownPos &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
            <div
              className="fixed bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-[70] overflow-hidden"
              style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
            >
              <div className="p-2 border-b border-slate-700/50">
                <form
                  onSubmit={e => {
                    e.preventDefault()
                    if (search.trim() && !exactMatch) createEnemyTeam(search.trim())
                  }}
                  className="flex items-center gap-1.5"
                >
                  <input
                    type="text"
                    placeholder="Search or create team..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="flex-1 bg-slate-700/50 border-0 outline-none ring-0 focus:ring-1 focus:ring-blue-500 rounded-md px-2.5 py-1.5 text-white placeholder-slate-500 text-xs"
                    autoFocus
                  />
                  {search.trim() && !exactMatch && (
                    <button type="submit" className="p-1.5 bg-blue-500 hover:bg-blue-400 text-white rounded-md transition-colors" title="Create team">
                      <Plus className="w-3 h-3" />
                    </button>
                  )}
                </form>
              </div>
              <div className="max-h-40 overflow-y-auto p-1">
                {allowClear && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange({ _id: "", name: "" })
                      setOpen(false)
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-md text-xs ${!value ? "bg-blue-500/20 text-blue-400" : "text-slate-400 hover:bg-slate-700/50"}`}
                  >
                    All opponents
                  </button>
                )}
                {filteredTeams.length === 0 && <p className="text-xs text-slate-500 text-center py-2">{search.trim() ? "No match — press + to create" : "No teams yet"}</p>}
                {filteredTeams.map(team => (
                  <button
                    key={team._id}
                    type="button"
                    onClick={() => {
                      onChange({ _id: team._id, name: team.name })
                      setOpen(false)
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-md text-xs ${value === team.name ? "bg-blue-500/20 text-blue-400" : "text-slate-300 hover:bg-slate-700/50"}`}
                  >
                    {team.name}
                  </button>
                ))}
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  )
}
