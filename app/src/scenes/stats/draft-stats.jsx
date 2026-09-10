import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { toast } from "react-hot-toast"
import api from "@/services/api"
import useStore from "@/services/store"
import { Swords, Dices, ArrowRight } from "lucide-react"
import { getChampionIcon, ROLES, ROLE_LABELS } from "@/utils"
import SelectDropdown from "@/components/SelectDropdown"

export default function DraftStats() {
  const [pro, setPro] = useState(false)
  const [proFilters, setProFilters] = useState({ league: "", team_name: "" })
  const [data, setData] = useState(null)
  const { user, globalFilters } = useStore()

  const fetchData = async () => {
    try {
      const { ok, data, code } = await api.post("/game/draft-slot-stats", { team_id: user?.team_id, ...globalFilters })
      if (!ok) return toast.error(code || "Failed to fetch draft stats")
      setData(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch draft stats")
    }
  }

  useEffect(() => {
    fetchData()
  }, [globalFilters.patch, globalFilters.folder_id, globalFilters.opponent_id])

  return (
    <div className="h-[calc(100vh-200px)] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-5 overflow-y-auto">
      <div className="max-w-[1800px] w-full mx-auto flex flex-col gap-4">
        <div className="flex items-center justify-end gap-2">
          {pro && <ProLeagueFilter filters={proFilters} onFilterChange={setProFilters} />}
          {pro && <ProTeamFilter filters={proFilters} onFilterChange={setProFilters} />}
          {[
            { value: false, label: "My Team" },
            { value: true, label: "Pro" }
          ].map(opt => (
            <button
              key={opt.label}
              onClick={() => setPro(opt.value)}
              className={`px-2.5 h-6 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-colors ${pro === opt.value ? "bg-amber-500/20 text-amber-400 ring-1 ring-amber-400/60" : "bg-slate-800/60 text-slate-500 hover:bg-slate-700/60"}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {!pro &&
        data &&
        !(data.rotations?.blue?.some(r => r?.length) || data.rotations?.red?.some(r => r?.length) || data.bans?.blue?.some(p => p?.length) || data.bans?.red?.some(p => p?.length)) ? (
          <EmptyDraftStats />
        ) : (
          <>
            <div className="flex items-stretch gap-3">
              <FirstPickPanel pro={pro} proFilters={proFilters} />
              <BansPanel pro={pro} proFilters={proFilters} />
              <BestDuosPanel pro={pro} proFilters={proFilters} />
            </div>
            <SlotRolesPanel pro={pro} proFilters={proFilters} />
          </>
        )}
      </div>
    </div>
  )
}

function ProLeagueFilter({ filters, onFilterChange }) {
  const [leagues, setLeagues] = useState([])

  const fetchLeagues = async () => {
    try {
      const { ok, data, code } = await api.get("/pro-game/leagues/list")
      if (!ok) return toast.error(code || "Failed to fetch leagues")
      setLeagues(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch leagues")
    }
  }

  useEffect(() => {
    fetchLeagues()
  }, [])

  return <SelectDropdown value={filters.league} onChange={league => onFilterChange({ ...filters, league, team_name: "" })} options={leagues} placeholder="All leagues" clearLabel="All leagues" />
}

function ProTeamFilter({ filters, onFilterChange }) {
  const [teams, setTeams] = useState([])

  const fetchTeams = async () => {
    try {
      const { ok, data, code } = await api.get(`/pro-game/teams/list${filters.league ? `?league=${encodeURIComponent(filters.league)}` : ""}`)
      if (!ok) return toast.error(code || "Failed to fetch teams")
      setTeams(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch teams")
    }
  }

  useEffect(() => {
    fetchTeams()
  }, [filters.league])

  return <SelectDropdown value={filters.team_name} onChange={team_name => onFilterChange({ ...filters, team_name })} options={teams} placeholder="All teams" clearLabel="All teams" />
}

function EmptyDraftStats() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="max-w-xl w-full text-center">
        <div className="w-20 h-20 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center mx-auto mb-6">
          <Swords className="w-10 h-10 text-slate-600" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">No drafts imported</h2>
        <p className="text-sm text-slate-400 mb-8">Add drafts to your games to unlock rotations, bans, role trends and duo analysis.</p>
        <Link
          to="/stats-team/games"
          className="group flex items-center gap-4 bg-slate-800/60 border border-slate-700/50 rounded-xl px-5 py-4 hover:border-amber-500/30 hover:bg-slate-800/80 transition-all"
        >
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <Dices className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-left flex-1">
            <p className="text-sm font-semibold text-white">Add a draft to a game</p>
            <p className="text-xs text-slate-500">Open a game and paste your draft link in the Draft tab, or add it during import.</p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400 transition-colors" />
        </Link>
      </div>
    </div>
  )
}

function FirstPickPanel({ pro, proFilters }) {
  const [data, setData] = useState(null)
  const [filters, setFilters] = useState({ sort: "games" })
  const { user, globalFilters } = useStore()

  const fetchData = async () => {
    try {
      const { ok, data, code } = await api.post(pro ? "/pro-game/draft-slot-stats" : "/game/draft-slot-stats", pro ? { ...proFilters, ...filters } : { team_id: user?.team_id, ...globalFilters, ...filters })
      if (!ok) return toast.error(code || "Failed to fetch draft stats")
      setData(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch draft stats")
    }
  }

  useEffect(() => {
    fetchData()
  }, [pro, proFilters, filters, globalFilters.patch, globalFilters.folder_id, globalFilters.opponent_id])

  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-3 flex-shrink-0 min-w-[420px] flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[8px] text-slate-600 font-semibold uppercase tracking-wider">Draft Rotations</p>
        <div className="flex items-center gap-1">
          {["games", "wr"].map(sort => (
            <button
              key={sort}
              onClick={() => setFilters(f => ({ ...f, sort }))}
              className={`px-1.5 h-5 rounded text-[8px] font-bold uppercase transition-colors ${filters.sort === sort ? "bg-amber-500/20 text-amber-400 ring-1 ring-amber-400/60" : "bg-slate-700/40 text-slate-500 hover:bg-slate-700/70"}`}
            >
              {sort === "games" ? "PR" : "WR"}
            </button>
          ))}
        </div>
      </div>
      {data && !(data.rotations?.blue?.some(r => r?.length) || data.rotations?.red?.some(r => r?.length)) ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-8 px-4">
          <Swords className="w-8 h-8 text-slate-600 mb-3" />
          <p className="text-sm text-slate-400 mb-1">No draft has been added to games</p>
          <p className="text-xs text-slate-500">
            You can edit games{" "}
            <Link to="/stats-team/games" className="text-amber-400 hover:text-amber-300 underline">
              here
            </Link>{" "}
            or add the draft link during import.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 flex-1">
          {[
            {
              side: "blue",
              label: "Blue Side",
              color: "text-blue-400",
              bg: "bg-blue-500/5 border-blue-500/20",
              rotations: [
                { rota: 0, desc: "First Pick" },
                { rota: 1, desc: "B2 + B3" }
              ]
            },
            {
              side: "red",
              label: "Red Side",
              color: "text-red-400",
              bg: "bg-red-500/5 border-red-500/20",
              rotations: [
                { rota: 0, desc: "R1 + R2" },
                { rota: 1, desc: "R3" }
              ]
            }
          ].map(s => (
            <div key={s.side} className={`rounded-xl border p-2.5 flex flex-col gap-2 ${s.bg}`}>
              <p className={`text-[10px] font-bold uppercase tracking-wide ${s.color}`}>{s.label}</p>
              {s.rotations.map(r => (
                <div key={r.rota}>
                  <p className="text-[8px] text-slate-600 mb-1">
                    Rota {r.rota + 1} — {r.desc}
                  </p>
                  <div className="flex flex-col gap-0.5">
                    {(data?.rotations?.[s.side]?.[r.rota] || []).slice(0, 3).map(champ => (
                      <div key={champ.name} className="flex items-center gap-1.5 px-1 py-1 rounded-lg hover:bg-slate-700/30 transition-colors">
                        <div className="w-6 h-6 rounded overflow-hidden bg-slate-700 flex-shrink-0">
                          <img
                            src={getChampionIcon(champ.name)}
                            alt={champ.name}
                            className="w-full h-full object-cover"
                            onError={e => {
                              e.target.style.display = "none"
                            }}
                          />
                        </div>
                        <span className="text-[11px] text-slate-200 font-medium flex-1 truncate">{champ.name}</span>
                        <span className="text-[8px] text-slate-600">{champ.games}G</span>
                        <span className={`text-[10px] font-bold ${champ.wr >= 50 ? "text-emerald-400" : "text-red-400"}`}>{champ.wr}%</span>
                      </div>
                    ))}
                    {(!data?.rotations?.[s.side]?.[r.rota] || data.rotations[s.side][r.rota].length === 0) && <span className="text-slate-600 text-xs">—</span>}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function BansPanel({ pro, proFilters }) {
  const [data, setData] = useState(null)
  const [filters, setFilters] = useState({ sort: "games" })
  const { user, globalFilters } = useStore()

  const fetchData = async () => {
    try {
      const { ok, data, code } = await api.post(pro ? "/pro-game/draft-slot-stats" : "/game/draft-slot-stats", pro ? { ...proFilters, ...filters } : { team_id: user?.team_id, ...globalFilters, ...filters })
      if (!ok) return toast.error(code || "Failed to fetch ban stats")
      setData(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch ban stats")
    }
  }

  useEffect(() => {
    fetchData()
  }, [pro, proFilters, filters, globalFilters.patch, globalFilters.folder_id, globalFilters.opponent_id])

  const mergeBans = side => {
    const map = {}
    ;(data?.bans?.[side] || []).forEach(phase => {
      ;(phase || []).forEach(champ => {
        if (!map[champ.name]) map[champ.name] = { name: champ.name, games: 0, wins: 0 }
        map[champ.name].games += champ.games
        map[champ.name].wins += Math.round((champ.games * champ.wr) / 100)
      })
    })
    return Object.values(map)
      .sort((a, b) => (filters.sort === "wr" ? b.wins / b.games - a.wins / a.games || b.games - a.games : b.games - a.games))
      .slice(0, 5)
  }

  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-3 flex-1 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[8px] text-slate-600 font-semibold uppercase tracking-wider">Most Banned</p>
        <div className="flex items-center gap-1">
          {["games", "wr"].map(sort => (
            <button
              key={sort}
              onClick={() => setFilters(f => ({ ...f, sort }))}
              className={`px-1.5 h-5 rounded text-[8px] font-bold uppercase transition-colors ${filters.sort === sort ? "bg-amber-500/20 text-amber-400 ring-1 ring-amber-400/60" : "bg-slate-700/40 text-slate-500 hover:bg-slate-700/70"}`}
            >
              {sort === "games" ? "PR" : "WR"}
            </button>
          ))}
        </div>
      </div>
      {data && !(data.bans?.blue?.some(p => p?.length) || data.bans?.red?.some(p => p?.length)) ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-8 px-4">
          <Swords className="w-8 h-8 text-slate-600 mb-3" />
          <p className="text-sm text-slate-400 mb-1">No draft has been added to games</p>
          <p className="text-xs text-slate-500">
            You can edit games{" "}
            <Link to="/stats-team/games" className="text-amber-400 hover:text-amber-300 underline">
              here
            </Link>{" "}
            or add the draft link during import.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 flex-1">
          {[
            { side: "blue", label: pro ? "Blue Bans" : "Our Bans", color: "text-blue-400", bg: "bg-blue-500/5 border-blue-500/20" },
            { side: "red", label: pro ? "Red Bans" : "Enemy Bans", color: "text-red-400", bg: "bg-red-500/5 border-red-500/20" }
          ].map(row => (
            <div key={row.side} className={`rounded-xl border p-2.5 flex flex-col ${row.bg}`}>
              <p className={`text-[10px] font-bold uppercase tracking-wide mb-1.5 ${row.color}`}>{row.label}</p>
              <div className="flex flex-col gap-1">
                {mergeBans(row.side).map(champ => (
                  <div key={champ.name} className="flex items-center gap-2 px-1 py-1 rounded-lg hover:bg-slate-700/30 transition-colors">
                    <div className="w-7 h-7 rounded-lg overflow-hidden bg-slate-700 flex-shrink-0 ring-1 ring-slate-600/50">
                      <img
                        src={getChampionIcon(champ.name)}
                        alt={champ.name}
                        className="w-full h-full object-cover grayscale"
                        onError={e => {
                          e.target.style.display = "none"
                        }}
                      />
                    </div>
                    <span className="text-[11px] text-slate-200 font-medium flex-1 truncate">{champ.name}</span>
                    <span className="text-[8px] text-slate-600">{champ.games}G</span>
                    <span className={`text-[10px] font-bold ${champ.games > 0 && Math.round((champ.wins / champ.games) * 100) >= 50 ? "text-emerald-400" : "text-red-400"}`}>
                      {champ.games > 0 ? Math.round((champ.wins / champ.games) * 100) : 0}%
                    </span>
                  </div>
                ))}
                {mergeBans(row.side).length === 0 && <span className="text-slate-600 text-xs">—</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SlotRolesPanel({ pro, proFilters }) {
  const [data, setData] = useState(null)
  const { user, globalFilters } = useStore()

  const fetchData = async () => {
    try {
      const { ok, data, code } = await api.post(pro ? "/pro-game/draft-slot-roles" : "/game/draft-slot-roles", pro ? { ...proFilters } : { team_id: user?.team_id, ...globalFilters })
      if (!ok) return toast.error(code || "Failed to fetch slot roles")
      setData(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch slot roles")
    }
  }

  useEffect(() => {
    fetchData()
  }, [pro, proFilters, globalFilters.patch, globalFilters.folder_id, globalFilters.opponent_id])

  return (
    <>
      {(data || []).map(rota => (
        <div key={rota.rotation}>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Rotation {rota.rotation} — Picks</p>
          <div className="grid grid-cols-2 gap-3">
            {rota.slots.map(slot => (
              <div key={slot.key} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${slot.side === "blue" ? "bg-blue-500/15 text-blue-400" : "bg-red-500/15 text-red-400"}`}>
                    {slot.key}
                  </span>
                  <span className="text-[10px] text-slate-400">{slot.label}</span>
                  <span className="ml-auto text-[9px] text-slate-600">
                    {slot.games} {slot.side} games
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {slot.roles.map(r => (
                    <div key={r.role} className="flex items-center gap-2">
                      <img src={`/roles/${r.role}.png`} alt={r.role} className="w-3.5 h-3.5 opacity-70" />
                      <span className="text-[10px] text-slate-300 w-14">{ROLE_LABELS[r.role]}</span>
                      <div className="flex-1 h-1 rounded-full bg-slate-700/40 overflow-hidden">
                        <div className={`h-full rounded-full ${slot.side === "blue" ? "bg-blue-400" : "bg-red-400"}`} style={{ width: `${r.pct}%` }} />
                      </div>
                      <span className="text-[10px] font-bold text-slate-200 w-8 text-right">{r.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  )
}

function BestDuosPanel({ pro, proFilters }) {
  const [data, setData] = useState(null)
  const [filters, setFilters] = useState({ roles: ["jungle", "mid"], sort: "games" })
  const { globalFilters } = useStore()

  const fetchData = async () => {
    try {
      const { ok, data, code } = await api.post(pro ? "/pro-game/best-combos" : "/playerstats/best-combos", pro ? { ...proFilters, ...filters, limit: 4, minGames: 2 } : { ...globalFilters, ...filters, limit: 4, minGames: 2 })
      if (!ok) return toast.error(code || "Failed to fetch duos")
      setData(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch duos")
    }
  }

  useEffect(() => {
    fetchData()
  }, [pro, proFilters, filters, globalFilters.patch, globalFilters.folder_id, globalFilters.opponent_id])

  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-3 min-w-[320px]">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[8px] text-slate-600 font-semibold uppercase tracking-wider">Best Duos</p>
        <div className="flex items-center gap-1">
          {["games", "wr"].map(sort => (
            <button
              key={sort}
              onClick={() => setFilters(f => ({ ...f, sort }))}
              className={`px-1.5 h-5 rounded text-[8px] font-bold uppercase transition-colors ${filters.sort === sort ? "bg-amber-500/20 text-amber-400 ring-1 ring-amber-400/60" : "bg-slate-700/40 text-slate-500 hover:bg-slate-700/70"}`}
            >
              {sort === "games" ? "PR" : "WR"}
            </button>
          ))}
          <div className="w-px h-4 bg-slate-700/60 mx-0.5" />
          {ROLES.map(role => (
            <button
              key={role}
              onClick={() => setFilters(f => ({ ...f, roles: f.roles.includes(role) ? f.roles.filter(r => r !== role) : [...f.roles, role].slice(-2) }))}
              className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${filters.roles.includes(role) ? "bg-amber-500/20 ring-1 ring-amber-400/60" : "bg-slate-700/40 hover:bg-slate-700/70"}`}
            >
              <img src={`/roles/${role}.png`} alt={role} className={`w-3.5 h-3.5 ${filters.roles.includes(role) ? "" : "opacity-40"}`} />
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        {(data || []).map((combo, i) => (
          <div key={i} className="flex items-center gap-2 px-1.5 py-1.5 rounded-lg hover:bg-slate-700/30 transition-colors">
            <div className="flex items-center -space-x-1.5">
              <img src={getChampionIcon(combo.champ1)} alt={combo.champ1} className="w-6 h-6 rounded ring-1 ring-slate-700 relative z-10" />
              <img src={getChampionIcon(combo.champ2)} alt={combo.champ2} className="w-6 h-6 rounded ring-1 ring-slate-700" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-slate-200 font-medium truncate">
                {combo.champ1} + {combo.champ2}
              </p>
              <span className="text-[8px] text-slate-600">{combo.games}G</span>
            </div>
            <span className={`text-sm font-black ${combo.wr >= 50 ? "text-emerald-400" : "text-red-400"}`}>{combo.wr}%</span>
          </div>
        ))}
        {(!data || data.length === 0) && <span className="text-slate-600 text-xs">—</span>}
      </div>
    </div>
  )
}
