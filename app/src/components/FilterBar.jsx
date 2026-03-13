import { useState, useEffect, useRef } from "react"
import { ChevronDown, X, Folder, Swords } from "lucide-react"
import useStore from "@/services/store"
import api from "@/services/api"
import { toast } from "react-hot-toast"

const FilterBar = () => {
  const { globalFilters, setGlobalFilters, resetGlobalFilters, filterOptions, setFilterOptions } = useStore()
  const [patchOpen, setPatchOpen] = useState(false)
  const [scopeOpen, setScopeOpen] = useState(false)
  const patchRef = useRef(null)
  const scopeRef = useRef(null)

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const { ok, data, code } = await api.post("/game/filter-options", {})
        if (!ok) return toast.error(code)
        setFilterOptions(data)
      } catch (error) {
        toast.error(error.message)
      }
    }
    fetchOptions()
  }, [])

  useEffect(() => {
    const handler = e => {
      if (patchRef.current && !patchRef.current.contains(e.target)) setPatchOpen(false)
      if (scopeRef.current && !scopeRef.current.contains(e.target)) setScopeOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const hasActiveFilters = globalFilters.patch || globalFilters.folder_id || globalFilters.opponent_id

  const getScopeLabel = () => {
    if (globalFilters.folder_id) {
      const folder = filterOptions.folders?.find(f => f._id === globalFilters.folder_id)
      return folder?.name || "Folder"
    }
    if (globalFilters.opponent_id) {
      const team = filterOptions.opponents?.find(t => t._id === globalFilters.opponent_id)
      return team ? `vs ${team.name}` : "Opponent"
    }
    return "All Games"
  }

  return (
    <div className="flex items-center gap-2">
      {/* Patch Filter */}
      <div ref={patchRef} className="relative">
        <button
          onClick={() => setPatchOpen(!patchOpen)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
            globalFilters.patch
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600"
          }`}
        >
          <span>{globalFilters.patch || "Patch"}</span>
          <ChevronDown className="w-3 h-3" />
        </button>
        {patchOpen && (
          <div className="absolute top-full left-0 mt-1 bg-slate-800 border border-slate-700/50 rounded-lg shadow-xl z-50 min-w-[120px] max-h-48 overflow-y-auto">
            <button
              onClick={() => {
                setGlobalFilters({ patch: null })
                setPatchOpen(false)
              }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-700/50 transition-colors ${!globalFilters.patch ? "text-emerald-400" : "text-white"}`}
            >
              All Patches
            </button>
            {filterOptions.patches?.map(patch => (
              <button
                key={patch}
                onClick={() => {
                  setGlobalFilters({ patch })
                  setPatchOpen(false)
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-700/50 transition-colors ${globalFilters.patch === patch ? "text-emerald-400" : "text-white"}`}
              >
                {patch}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Combined Scope Filter (Folder + Enemy Team) */}
      <div ref={scopeRef} className="relative">
        <button
          onClick={() => setScopeOpen(!scopeOpen)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
            globalFilters.folder_id || globalFilters.opponent_id
              ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
              : "bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600"
          }`}
        >
          {globalFilters.folder_id && <Folder className="w-3 h-3" />}
          {globalFilters.opponent_id && <Swords className="w-3 h-3" />}
          <span className="max-w-[140px] truncate">{getScopeLabel()}</span>
          <ChevronDown className="w-3 h-3" />
        </button>
        {scopeOpen && (
          <div className="absolute top-full left-0 mt-1 bg-slate-800 border border-slate-700/50 rounded-lg shadow-xl z-50 min-w-[200px] max-h-64 overflow-y-auto">
            {/* All Games */}
            <button
              onClick={() => {
                setGlobalFilters({ folder_id: null, opponent_id: null })
                setScopeOpen(false)
              }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-700/50 transition-colors ${
                !globalFilters.folder_id && !globalFilters.opponent_id ? "text-amber-400" : "text-white"
              }`}
            >
              All Games
            </button>
            <div className="border-t border-slate-700/50" />

            {/* Folders Section */}
            {filterOptions.folders?.length > 0 && (
              <>
                <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Folders</div>
                {filterOptions.folders.map(folder => (
                  <button
                    key={folder._id}
                    onClick={() => {
                      setGlobalFilters({ folder_id: folder._id, opponent_id: null })
                      setScopeOpen(false)
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-700/50 transition-colors flex items-center gap-2 ${
                      globalFilters.folder_id === folder._id ? "text-amber-400" : "text-white"
                    }`}
                  >
                    <Folder className="w-3.5 h-3.5 text-amber-500/70 shrink-0" />
                    <span className="truncate">{folder.name}</span>
                  </button>
                ))}
              </>
            )}

            {/* Enemy Teams Section */}
            {filterOptions.opponents?.length > 0 && (
              <>
                <div className="border-t border-slate-700/50" />
                <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Enemy Teams</div>
                {filterOptions.opponents.map(team => (
                  <button
                    key={team._id}
                    onClick={() => {
                      setGlobalFilters({ opponent_id: team._id, folder_id: null })
                      setScopeOpen(false)
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-700/50 transition-colors flex items-center gap-2 ${
                      globalFilters.opponent_id === team._id ? "text-amber-400" : "text-white"
                    }`}
                  >
                    <Swords className="w-3.5 h-3.5 text-red-400/70 shrink-0" />
                    <span className="truncate">{team.name}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Clear all filters */}
      {hasActiveFilters && (
        <button
          onClick={resetGlobalFilters}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-slate-500 hover:text-white hover:bg-slate-700/50 transition-colors"
          title="Clear all filters"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}

export default FilterBar
