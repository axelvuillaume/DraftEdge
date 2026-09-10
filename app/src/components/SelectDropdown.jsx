import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { createPortal } from "react-dom"
import { ChevronDown } from "lucide-react"

export default function SelectDropdown({ value, onChange, options = [], placeholder = "Select...", clearLabel = "All", label }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const btnRef = useRef(null)
  const [dropdownPos, setDropdownPos] = useState(null)

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

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options
    return options.filter(opt => opt.toLowerCase().includes(search.trim().toLowerCase()))
  }, [options, search])

  return (
    <div className="relative min-w-[160px]">
      {label && <label className="block text-sm font-medium text-slate-400 mb-1">{label}</label>}
      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border border-slate-600 hover:border-slate-500 bg-slate-700/50 transition-all text-left"
      >
        <span className={`truncate ${value ? "text-white text-xs" : "text-slate-400 text-xs"}`}>{value || placeholder}</span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
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
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-slate-700/50 border-0 outline-none ring-0 focus:ring-1 focus:ring-amber-500 rounded-md px-2.5 py-1.5 text-white placeholder-slate-500 text-xs"
                  autoFocus
                />
              </div>
              <div className="max-h-40 overflow-y-auto p-1">
                <button
                  type="button"
                  onClick={() => {
                    onChange("")
                    setOpen(false)
                  }}
                  className={`w-full text-left px-3 py-1.5 rounded-md text-xs ${!value ? "bg-amber-500/20 text-amber-400" : "text-slate-400 hover:bg-slate-700/50"}`}
                >
                  {clearLabel}
                </button>
                {filteredOptions.length === 0 && <p className="text-xs text-slate-500 text-center py-2">No match</p>}
                {filteredOptions.map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      onChange(opt)
                      setOpen(false)
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-md text-xs ${value === opt ? "bg-amber-500/20 text-amber-400" : "text-slate-300 hover:bg-slate-700/50"}`}
                  >
                    {opt}
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
