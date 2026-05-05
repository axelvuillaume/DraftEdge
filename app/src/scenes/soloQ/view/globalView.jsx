import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "react-hot-toast"
import { Target, CheckCircle2, XCircle, BarChart3, FileText, TrendingUp, Plus, Trash2, X } from "lucide-react"
import api from "@/services/api"
import { getChampionIcon, TIER_COLORS, RANK_ICON_TIERS } from "@/utils"
import useStore from "@/services/store"
import Modal from "@/components/modal"

export default function GlobalView({ player, onOpenSoloQ }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-4">
        <div className="space-y-4">
          <RecapHeader player={player} onOpenSoloQ={onOpenSoloQ} />
          <LPProgression player={player} />
          <KeyStatsTable player={player} />
        </div>
        <div className="space-y-4">
          <ScrimObjectives player={player} />
          <SoloObjectives player={player} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
        <TopChampions player={player} />
        <PlayerNotes player={player} />
      </div>
    </div>
  )
}

function RecapHeader({ player, onOpenSoloQ }) {
  const navigate = useNavigate()
  const { setSearchNavigation } = useStore()
  const [scrimCount, setScrimCount] = useState(null)

  const fetchScrimCount = async () => {
    try {
      const { ok, total, code } = await api.post("/playerstats/search", { puuid: player.puuid, limit: 1 })
      if (!ok) return toast.error(code || "Failed to fetch scrim stats")
      setScrimCount(total ?? 0)
    } catch (error) {
      toast.error(error.code || "Failed to fetch scrim stats")
    }
  }

  useEffect(() => {
    fetchScrimCount()
  }, [player.puuid])

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-4">
        {player.current_tier && RANK_ICON_TIERS.has(player.current_tier.toUpperCase()) ? (
          <img
            src={`/rank/${player.current_tier.toLowerCase()}.png`}
            alt={player.current_tier}
            className="w-14 h-14 object-contain shrink-0"
            style={{ filter: `drop-shadow(0 0 10px ${TIER_COLORS[player.current_tier] || "#64748b"}55)` }}
          />
        ) : (
          <div className="w-14 h-14 rounded-lg bg-slate-700/40 shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {player.player_name ? (
              <h2 className="text-white font-bold text-lg tracking-wide truncate">{player.player_name}</h2>
            ) : (
              <>
                <h2 className="text-white font-bold text-lg font-mono tracking-wide truncate">{player.game_name}</h2>
                <span className="text-slate-500 text-sm font-mono">#{player.tag_line}</span>
              </>
            )}
            {player.role && <img src={`/roles/${player.role}.png`} alt={player.role} className="w-4 h-4 opacity-70 ml-1" />}
          </div>
          <div className="flex flex-col mt-1">
            {player.current_tier && (
              <span style={{ color: TIER_COLORS[player.current_tier] || "#94a3b8" }} className="font-bold text-sm tracking-wide">
                {player.current_tier} {player.current_rank || ""}
              </span>
            )}
            <span className="text-white font-bold tabular-nums">
              {player.current_lp ?? 0} <span className="text-slate-500 text-xs font-bold">LP</span>
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <a
            href={`https://dpm.lol/${encodeURIComponent(player.game_name)}-${encodeURIComponent(player.tag_line)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-full hover:bg-slate-700/40 transition-all"
          >
            <img src="/DPMLOLBG.png" alt="DPM.lol" className="h-6 w-6 object-contain rounded-full" />
          </a>
          <button
            onClick={onOpenSoloQ}
            className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/15"
          >
            VIEW SOLOQ
          </button>
          <button
            onClick={() => {
              setSearchNavigation({ type: "player", data: { puuid: player.puuid }, timestamp: Date.now() })
              navigate("/stats-team/stats")
            }}
            className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/15"
          >
            ADVANCED STATS
          </button>
        </div>
      </div>

      <div className="h-px bg-slate-700/40" />

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-bold tracking-widest text-amber-300">SCRIM</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl text-white font-bold leading-none tabular-nums">{scrimCount === null ? "—" : scrimCount}</span>
            <span className="text-slate-500 text-[10px] font-mono">games</span>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-bold tracking-widest text-sky-400">SOLOQ</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl text-white font-bold leading-none tabular-nums">{(player.current_wins || 0) + (player.current_losses || 0)}</span>
            <span className="text-slate-500 text-[10px] font-mono">
              {player.current_wins || 0}W · {player.current_losses || 0}L
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function LPProgression({ player }) {
  const [snapshots, setSnapshots] = useState([])

  const fetchSnapshots = async () => {
    try {
      const { ok, data, code } = await api.post("/soloq-snapshot/search", { player_id: player._id, limit: 0, sort: { fetched_at: 1 } })
      if (!ok) return toast.error(code || "Failed to fetch LP snapshots")
      setSnapshots(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch LP snapshots")
    }
  }

  useEffect(() => {
    fetchSnapshots()
  }, [player._id])

  if (snapshots.length === 0) {
    return (
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl">
        <div className="px-4 py-3 border-b border-slate-700/30 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-sky-400" />
          <h3 className="text-white font-semibold text-sm">LP Progression</h3>
        </div>
        <p className="text-slate-500 text-sm text-center py-8">No snapshots yet</p>
      </div>
    )
  }

  const maxVal = Math.max(...snapshots.map(s => s.league_points ?? 0), 100) * 1.05
  const xAt = i => 42 + (snapshots.length === 1 ? 252 : (i / (snapshots.length - 1)) * 504)
  const yAt = v => 136 - (v / maxVal) * 118
  const linePath = snapshots.reduce((acc, p, i, arr) => {
    if (i === 0) return `M ${xAt(0)} ${yAt(p.league_points ?? 0)}`
    return `${acc} C ${(xAt(i - 1) + xAt(i)) / 2} ${yAt(arr[i - 1].league_points ?? 0)}, ${(xAt(i - 1) + xAt(i)) / 2} ${yAt(p.league_points ?? 0)}, ${xAt(i)} ${yAt(p.league_points ?? 0)}`
  }, "")

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl">
      <div className="px-4 py-3 border-b border-slate-700/30 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-sky-400" />
        <h3 className="text-white font-semibold text-sm">LP Progression</h3>
        <div className="ml-auto flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[8px] tracking-widest font-bold text-slate-500">CURRENT</span>
            <span className="text-sky-400 text-sm font-bold tabular-nums">{snapshots[snapshots.length - 1].league_points ?? 0} LP</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[8px] tracking-widest font-bold text-slate-500">Δ</span>
            <span
              className={`text-sm font-bold tabular-nums ${(snapshots[snapshots.length - 1].league_points ?? 0) - (snapshots[0].league_points ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}
            >
              {(snapshots[snapshots.length - 1].league_points ?? 0) - (snapshots[0].league_points ?? 0) >= 0 ? "+" : ""}
              {(snapshots[snapshots.length - 1].league_points ?? 0) - (snapshots[0].league_points ?? 0)}
            </span>
          </div>
        </div>
      </div>
      <div className="p-2">
        <svg width="100%" viewBox="0 0 560 160" style={{ display: "block", overflow: "visible" }}>
          <defs>
            <linearGradient id="lpFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
            </linearGradient>
          </defs>

          {[0, 250, 500, 750, 1000, 1500, 2000]
            .filter(v => v <= maxVal)
            .map(v => (
              <g key={v}>
                <line x1={42} y1={yAt(v)} x2={546} y2={yAt(v)} stroke="rgba(148,163,184,0.06)" strokeDasharray="2 3" />
                <text x={36} y={yAt(v) + 3} fill="#475569" fontSize="9" textAnchor="end" fontFamily="ui-monospace, monospace">
                  {v}
                </text>
              </g>
            ))}

          <path d={`${linePath} L ${xAt(snapshots.length - 1)} 136 L ${xAt(0)} 136 Z`} fill="url(#lpFill)" />
          <path d={linePath} fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

          <circle cx={xAt(snapshots.length - 1)} cy={yAt(snapshots[snapshots.length - 1].league_points ?? 0)} r="9" fill="#22d3ee" opacity="0.2" />
          <circle cx={xAt(snapshots.length - 1)} cy={yAt(snapshots[snapshots.length - 1].league_points ?? 0)} r="5" fill="#22d3ee" />

          {snapshots.map((p, i) => {
            if (i % Math.max(1, Math.ceil(snapshots.length / 6)) !== 0 && i !== snapshots.length - 1) return null
            return (
              <text key={i} x={xAt(i)} y={154} fill="#64748b" fontSize="9" textAnchor="middle" fontFamily="ui-monospace, monospace">
                {new Date(p.fetched_at || p.createdAt).toLocaleString("en", { month: "short" })} {new Date(p.fetched_at || p.createdAt).getDate()}
              </text>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

function KeyStatsTable({ player }) {
  const [pro, setPro] = useState(null)
  const [scrim, setScrim] = useState(null)

  const fetchPro = async () => {
    try {
      const { ok, data, code } = await api.post("/pro-game-playerstats/key-stats", { position: player.role })
      if (!ok) return toast.error(code || "Failed to fetch pro stats")
      setPro(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch pro stats")
    }
  }

  const fetchScrim = async () => {
    try {
      const { ok, data, code } = await api.post("/playerstats/key-stats", { puuid: player.puuid })
      if (!ok) return toast.error(code || "Failed to fetch scrim stats")
      setScrim(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch scrim stats")
    }
  }

  useEffect(() => {
    fetchPro()
    fetchScrim()
  }, [player.role, player.puuid])

  const rows = [
    { label: "Win Rate", scrim: scrim ? `${scrim.win_rate}%` : "—", soloq: "54.6%", pro: pro ? `${pro.win_rate}%` : "—" },
    { label: "KDA", scrim: scrim ? scrim.kda.toFixed(2) : "—", soloq: "3.18", pro: pro ? pro.kda.toFixed(2) : "—" },
    { label: "CS / min", scrim: scrim ? scrim.cs_per_min.toFixed(1) : "—", soloq: "8.7", pro: pro ? pro.cs_per_min.toFixed(1) : "—" },
    { label: "Vision / min", scrim: scrim ? scrim.vision_per_min.toFixed(2) : "—", soloq: "1.12", pro: pro ? pro.vision_per_min.toFixed(2) : "—" },
    { label: "Kill Participation", scrim: scrim ? `${scrim.kill_participation}%` : "—", soloq: "58.9%", pro: pro ? `${pro.kill_participation}%` : "—" }
  ]

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700/30 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-violet-400" />
        <h3 className="text-white font-semibold text-sm">Key Stats</h3>
        <span className="text-slate-500 text-xs">Scrim · SoloQ · Pro</span>
      </div>
      <div className="grid grid-cols-[1.3fr_70px_70px_70px] px-4 py-2 border-b border-slate-700/20 text-[9px] font-bold tracking-widest text-slate-500">
        <div>METRIC</div>
        <div className="text-right text-amber-300">SCRIM</div>
        <div className="text-right text-sky-400">SOLOQ</div>
        <div className="text-right text-violet-400">PRO {player.role && `· ${player.role.toUpperCase()}`}</div>
      </div>
      {rows.map((row, i) => (
        <div key={row.label} className={`grid grid-cols-[1.3fr_70px_70px_70px] px-4 py-2.5 items-center text-sm ${i < rows.length - 1 ? "border-b border-slate-700/10" : ""}`}>
          <div className="text-slate-300">{row.label}</div>
          <div className="text-right text-amber-300 font-semibold tabular-nums">{row.scrim}</div>
          <div className="text-right text-sky-400 font-semibold tabular-nums">{row.soloq}</div>
          <div className="text-right text-violet-400 font-semibold tabular-nums">{row.pro}</div>
        </div>
      ))}
    </div>
  )
}

function TopChampions({ player }) {
  const [champions, setChampions] = useState([])

  const fetchChampions = async () => {
    try {
      const { ok, data, code } = await api.post("/soloq-match/champion-comparison", { player_id: player._id, limit: 5 })
      if (!ok) return toast.error(code || "Failed to fetch top champions")
      setChampions(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch top champions")
    }
  }

  useEffect(() => {
    fetchChampions()
  }, [player._id])

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl">
      <div className="px-4 py-3 border-b border-slate-700/30 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-emerald-400" />
        <h3 className="text-white font-semibold text-sm tracking-wider">TOP CHAMPIONS</h3>
        <span className="px-2 py-0.5 rounded-md bg-slate-700/40 border border-slate-600/30 text-[10px] font-bold text-slate-300 tracking-wider">SoloQ vs Scrim</span>
      </div>

      <div className="grid grid-cols-[minmax(160px,1.4fr)_repeat(4,1fr)_16px_repeat(4,1fr)_24px] px-4 py-2 border-b border-slate-700/30 text-[9px] font-bold tracking-widest text-slate-500">
        <div>CHAMPION</div>
        <div className="text-right text-sky-400 col-span-4 flex items-center justify-end gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
          SOLOQ
        </div>
        <div className="self-stretch flex justify-center">
          <div className="w-px bg-slate-700/50" />
        </div>
        <div className="text-right text-violet-400 col-span-4 flex items-center justify-end gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
          SCRIM
        </div>
        <div />
      </div>

      <div className="grid grid-cols-[minmax(160px,1.4fr)_repeat(4,1fr)_16px_repeat(4,1fr)_24px] px-4 py-2 border-b border-slate-700/20 text-[9px] font-bold tracking-widest text-slate-500">
        <div />
        <div className="text-right">GAMES</div>
        <div className="text-right">WR</div>
        <div className="text-right">KDA</div>
        <div className="text-right">CS/M</div>
        <div className="self-stretch flex justify-center">
          <div className="w-px bg-slate-700/50" />
        </div>
        <div className="text-right">GAMES</div>
        <div className="text-right">WR</div>
        <div className="text-right">KDA</div>
        <div className="text-right">CS/M</div>
        <div />
      </div>

      {champions.length === 0 && <p className="text-slate-500 text-sm text-center py-8">No data</p>}

      {champions.map(champ => (
        <div
          key={champ.name}
          className="grid grid-cols-[minmax(160px,1.4fr)_repeat(4,1fr)_16px_repeat(4,1fr)_24px] px-4 py-3 items-center text-sm border-b border-slate-700/10 last:border-0 hover:bg-slate-700/10"
        >
          <div className="flex items-center gap-3 min-w-0">
            <img src={getChampionIcon(champ.name)} alt={champ.name} className="w-9 h-9 rounded-lg border border-slate-600/50 shrink-0" />
            <div className="min-w-0">
              <p className="text-white font-semibold truncate">{champ.name}</p>
              <p className="text-[10px] text-slate-500 tabular-nums">{champ.soloq?.dmgPerMin ? `${champ.soloq.dmgPerMin.toLocaleString()} dmg/min` : "—"}</p>
            </div>
          </div>

          <div className="text-right text-slate-300 tabular-nums">{champ.soloq?.games ?? "—"}</div>
          <div
            className={`text-right tabular-nums font-semibold ${!champ.soloq ? "text-slate-600" : champ.soloq.winRate >= 55 ? "text-emerald-400" : champ.soloq.winRate >= 50 ? "text-amber-300" : "text-red-400"}`}
          >
            {champ.soloq ? `${champ.soloq.winRate}%` : "—"}
          </div>
          <div className="text-right text-slate-300 tabular-nums">{champ.soloq ? champ.soloq.kda.toFixed(1) : "—"}</div>
          <div className="text-right text-slate-300 tabular-nums">{champ.soloq ? champ.soloq.csPerMin.toFixed(1) : "—"}</div>

          <div className="self-stretch flex justify-center">
            <div className="w-px bg-slate-700/50" />
          </div>

          <div className="text-right text-slate-300 tabular-nums">{champ.scrim?.games ?? "—"}</div>

          <div className="text-right tabular-nums">
            {!champ.scrim && <span className="text-slate-600">—</span>}
            {champ.scrim && (
              <div className="flex flex-col items-end">
                <span className={`font-semibold ${champ.scrim.winRate >= 55 ? "text-emerald-400" : champ.scrim.winRate >= 50 ? "text-amber-300" : "text-red-400"}`}>
                  {champ.scrim.winRate}%
                </span>
                {champ.soloq && (
                  <span className={`text-[10px] ${champ.scrim.winRate - champ.soloq.winRate >= 0 ? "text-emerald-400/80" : "text-red-400/80"}`}>
                    {champ.scrim.winRate - champ.soloq.winRate >= 0 ? "+" : ""}
                    {Math.round((champ.scrim.winRate - champ.soloq.winRate) * 10) / 10}pt
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="text-right tabular-nums">
            {!champ.scrim && <span className="text-slate-600">—</span>}
            {champ.scrim && (
              <div className="flex flex-col items-end">
                <span className="font-semibold text-slate-300">{champ.scrim.kda.toFixed(1)}</span>
                {champ.soloq && (
                  <span className={`text-[10px] ${champ.scrim.kda - champ.soloq.kda >= 0 ? "text-emerald-400/80" : "text-red-400/80"}`}>
                    {champ.scrim.kda - champ.soloq.kda >= 0 ? "+" : ""}
                    {Math.round((champ.scrim.kda - champ.soloq.kda) * 10) / 10}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="text-right tabular-nums">
            {!champ.scrim && <span className="text-slate-600">—</span>}
            {champ.scrim && (
              <div className="flex flex-col items-end">
                <span className="font-semibold text-slate-300">{champ.scrim.csPerMin.toFixed(1)}</span>
                {champ.soloq && (
                  <span className={`text-[10px] ${champ.scrim.csPerMin - champ.soloq.csPerMin >= 0 ? "text-emerald-400/80" : "text-red-400/80"}`}>
                    {champ.scrim.csPerMin - champ.soloq.csPerMin >= 0 ? "+" : ""}
                    {Math.round((champ.scrim.csPerMin - champ.soloq.csPerMin) * 10) / 10}
                  </span>
                )}
              </div>
            )}
          </div>

          <div />
        </div>
      ))}
    </div>
  )
}

function PlayerNotes({ player }) {
  const [notes, setNotes] = useState([])
  const [selected, setSelected] = useState(null)
  const [isCreating, setIsCreating] = useState(false)

  const fetchNotes = async () => {
    try {
      const { ok, data, code } = await api.post("/player-note/search", { player_id: player._id })
      if (!ok) return toast.error(code || "Failed to fetch notes")
      setNotes(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch notes")
    }
  }

  useEffect(() => {
    fetchNotes()
  }, [player._id])

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl">
      <div className="px-4 py-3 border-b border-slate-700/30 flex items-center gap-2">
        <FileText className="w-4 h-4 text-amber-400" />
        <h3 className="text-white font-semibold text-sm">Notes</h3>
        <button
          onClick={() => setIsCreating(true)}
          className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-xs text-slate-300 hover:text-white transition-colors"
        >
          <Plus className="w-3 h-3" />
          New
        </button>
      </div>
      <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
        {notes.length === 0 && <p className="text-slate-500 text-sm text-center py-6">No notes yet</p>}
        {notes.map(note => (
          <div
            key={note._id}
            onClick={() => setSelected(note)}
            className="bg-slate-700/20 hover:bg-slate-700/30 cursor-pointer rounded-lg p-3 transition-colors"
          >
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-white text-sm font-medium truncate">{note.title || "Untitled"}</p>
                <p className="text-slate-400 text-xs mt-1 line-clamp-2 whitespace-pre-wrap">{note.content || "—"}</p>
                <p className="text-[10px] text-slate-500 mt-1.5 font-mono">
                  {new Date(note.updatedAt || note.createdAt).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}
                  {note.author_name && ` · ${note.author_name}`}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isCreating && (
        <PlayerNoteModal
          player={player}
          onClose={() => setIsCreating(false)}
          onSaved={() => {
            setIsCreating(false)
            fetchNotes()
          }}
        />
      )}

      {selected && (
        <PlayerNoteModal
          player={player}
          note={selected}
          onClose={() => setSelected(null)}
          onSaved={() => {
            setSelected(null)
            fetchNotes()
          }}
        />
      )}
    </div>
  )
}

function PlayerNoteModal({ player, note, onClose, onSaved }) {
  const [data, setData] = useState(note || { title: "", content: "", player_id: player._id, player_name: player.player_name || player.game_name })

  const save = async () => {
    try {
      if (note?._id) {
        const { ok, code } = await api.put(`/player-note/${note._id}`, data)
        if (!ok) return toast.error(code || "Failed to save note")
        toast.success("Note saved")
        return onSaved()
      }
      const { ok, code } = await api.post("/player-note", data)
      if (!ok) return toast.error(code || "Failed to create note")
      toast.success("Note created")
      onSaved()
    } catch (error) {
      toast.error(error.code || "Failed to save note")
    }
  }

  const remove = async () => {
    try {
      if (!confirm("Delete this note?")) return
      const { ok, code } = await api.delete(`/player-note/${note._id}`)
      if (!ok) return toast.error(code || "Failed to delete note")
      toast.success("Note deleted")
      onSaved()
    } catch (error) {
      toast.error(error.code || "Failed to delete note")
    }
  }

  return (
    <Modal isOpen={true} onClose={onClose} className="max-w-2xl bg-slate-900 border border-slate-700/60 rounded-2xl">
      <div className="p-6 text-white">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-amber-400" />
          <h2 className="text-white font-bold text-lg">{note?._id ? "Edit note" : "New note"}</h2>
          <button onClick={onClose} className="ml-auto p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          <input
            type="text"
            value={data.title || ""}
            onChange={e => setData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Title"
            className="w-full bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-slate-600"
          />
          <textarea
            value={data.content || ""}
            onChange={e => setData(prev => ({ ...prev, content: e.target.value }))}
            placeholder="Note content..."
            className="w-full h-64 bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-slate-600 resize-y"
          />
        </div>
        <div className="flex items-center gap-2 mt-4">
          {note?._id && (
            <button
              onClick={remove}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          )}
          <div className="flex-1" />
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-xs text-slate-300 hover:text-white transition-colors">
            Cancel
          </button>
          <button onClick={save} className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-xs text-amber-400 hover:text-amber-300 transition-colors">
            Save
          </button>
        </div>
      </div>
    </Modal>
  )
}

function SoloObjectives({ player }) {
  const [objectives, setObjectives] = useState([])

  const fetchObjectives = async () => {
    try {
      const { ok, data, code } = await api.post("/solo-objectif/search", { player_id: player._id })
      if (!ok) return toast.error(code || "Failed to fetch solo objectives")
      setObjectives(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch solo objectives")
    }
  }

  useEffect(() => {
    fetchObjectives()
  }, [player._id])

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl">
      <div className="px-4 py-3 border-b border-slate-700/30 flex items-center gap-2">
        <Target className="w-4 h-4 text-violet-400" />
        <h3 className="text-white font-semibold text-sm">SoloQ Objectives</h3>
      </div>
      <div className="p-4 space-y-2">
        {objectives.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-4">No solo objectives defined.</p>
        ) : (
          objectives.map(obj => <SoloObjItem key={obj._id} objective={obj} />)
        )}
      </div>
    </div>
  )
}

function ScrimObjectives({ player }) {
  const { user } = useStore()
  const [objectives, setObjectives] = useState([])

  const fetchObjectives = async () => {
    try {
      const { ok, data, code } = await api.post("/scrim-objectif/search", { team_id: user?.team_id })
      if (!ok) return toast.error(code || "Failed to fetch scrim objectives")
      setObjectives(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch scrim objectives")
    }
  }

  useEffect(() => {
    fetchObjectives()
  }, [])

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl">
      <div className="px-4 py-3 border-b border-slate-700/30 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-amber-400" />
        <h3 className="text-white font-semibold text-sm">Scrim Objectives</h3>
      </div>
      <div className="p-4 space-y-4">
        {objectives.filter(o => o.player?.some(p => p.id === player._id)).length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Player</p>
            {objectives
              .filter(o => o.player?.some(p => p.id === player._id))
              .map(obj => (
                <ScrimObjItem key={obj._id} objective={obj} />
              ))}
          </div>
        )}

        {objectives.filter(o => !o.player?.length).length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Team</p>
            {objectives
              .filter(o => !o.player?.length)
              .map(obj => (
                <ScrimObjItem key={obj._id} objective={obj} />
              ))}
          </div>
        )}

        {objectives.filter(o => o.player?.some(p => p.id === player._id)).length === 0 && objectives.filter(o => !o.player?.length).length === 0 && (
          <p className="text-slate-500 text-sm text-center py-4">No scrim objectives defined.</p>
        )}
      </div>
    </div>
  )
}

function ObjectiveDetails({ isOpen, onClose, name, description, attempts, type, target, operator }) {
  const useActual = type === "toggle" && attempts.some(a => typeof a.actualValue === "number")
  const chartValues = useActual ? attempts.map(a => a.actualValue ?? 0) : attempts.map(a => a.value)
  const yMax = type === "rating" ? 10 : useActual ? Math.max(Math.max(...chartValues, 0), target ?? 0) * 1.2 || 10 : 1.5
  const yTicks = type === "rating" ? [0, 3, 5, 8, 10] : useActual ? [0, yMax * 0.25, yMax * 0.5, yMax * 0.75, yMax].map(v => Math.round(v * 10) / 10) : [0, 0.5, 1]
  const xAt = i => (attempts.length === 1 ? 50 + 820 / 2 : 50 + (i / (attempts.length - 1)) * 820)
  const yAt = v => 20 + 190 - (Math.min(v, yMax) / yMax) * 190
  const linePath = chartValues.map((v, i) => `${i === 0 ? "M" : "L"} ${xAt(i)} ${yAt(v)}`).join(" ")

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-4xl bg-slate-900 border border-slate-700/60 rounded-2xl">
      <div className="p-6 text-white">
        <div className="flex items-start gap-3 mb-6 pr-10">
          <div className="w-10 h-10 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-white font-bold text-lg truncate">{name}</h2>
            {description && <p className="text-slate-400 text-sm">{description}</p>}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6 pb-6 border-b border-slate-700/40">
          <div>
            <p className="text-[10px] font-bold tracking-widest text-slate-500 mb-1">ATTEMPTS</p>
            <p className="text-2xl font-bold text-white tabular-nums">{attempts.length}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-widest text-slate-500 mb-1">SUCCESS RATE</p>
            <p
              className={`text-2xl font-bold tabular-nums ${attempts.length === 0 ? "text-slate-600" : (attempts.filter(a => a.success).length / attempts.length) * 100 >= 70 ? "text-emerald-400" : (attempts.filter(a => a.success).length / attempts.length) * 100 >= 50 ? "text-amber-400" : "text-red-400"}`}
            >
              {attempts.length > 0 ? Math.round((attempts.filter(a => a.success).length / attempts.length) * 100) : 0}%
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-widest text-slate-500 mb-1">PASSED</p>
            <p className="text-2xl font-bold text-sky-400 tabular-nums">
              {attempts.filter(a => a.success).length}/{attempts.length}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-widest text-slate-500 mb-1">BEST</p>
            <p className="text-2xl font-bold text-violet-400 tabular-nums">{attempts.length > 0 ? Math.max(...chartValues).toFixed(1) : "0.0"}</p>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-[10px] font-bold tracking-widest text-slate-500 mb-2">HISTORY</p>
          {attempts.length === 0 && <p className="text-slate-500 text-sm py-12 text-center">No history</p>}
          {attempts.length > 0 && (
            <svg width="100%" viewBox="0 0 900 240" style={{ display: "block" }}>
              <defs>
                <linearGradient id="objFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                </linearGradient>
              </defs>
              {yTicks.map(v => (
                <g key={v}>
                  <line x1={50} y1={yAt(v)} x2={870} y2={yAt(v)} stroke="rgba(148,163,184,0.08)" strokeDasharray="2 3" />
                  <text x={42} y={yAt(v) + 4} fill="#475569" fontSize="11" textAnchor="end" fontFamily="ui-monospace, monospace">
                    {v}
                  </text>
                </g>
              ))}
              {useActual && target != null && (
                <g>
                  <line x1={50} y1={yAt(target)} x2={870} y2={yAt(target)} stroke="rgba(244,114,182,0.6)" strokeWidth="1.5" strokeDasharray="4 4" />
                  <text x={866} y={yAt(target) - 6} fill="#f472b6" fontSize="11" textAnchor="end" fontFamily="ui-monospace, monospace">
                    target {operator || ""} {target}
                  </text>
                </g>
              )}
              <path d={`${linePath} L ${xAt(attempts.length - 1)} 210 L ${xAt(0)} 210 Z`} fill="url(#objFill)" />
              <path d={linePath} fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              {attempts.map((a, i) => (
                <circle key={i} cx={xAt(i)} cy={yAt(chartValues[i])} r="4" fill={a.success ? "#34d399" : "#f87171"} stroke="#0f172a" strokeWidth="1.5" />
              ))}
              <text x={xAt(0)} y={234} fill="#64748b" fontSize="11" textAnchor="middle" fontFamily="ui-monospace, monospace">
                {new Date(attempts[0].date).toISOString().slice(5, 10)}
              </text>
              {attempts.length > 2 && (
                <text x={xAt(Math.floor((attempts.length - 1) / 2))} y={234} fill="#64748b" fontSize="11" textAnchor="middle" fontFamily="ui-monospace, monospace">
                  {new Date(attempts[Math.floor((attempts.length - 1) / 2)].date).toISOString().slice(5, 10)}
                </text>
              )}
              {attempts.length > 1 && (
                <text x={xAt(attempts.length - 1)} y={234} fill="#64748b" fontSize="11" textAnchor="middle" fontFamily="ui-monospace, monospace">
                  {new Date(attempts[attempts.length - 1].date).toISOString().slice(5, 10)}
                </text>
              )}
            </svg>
          )}
        </div>

        <div>
          <p className="text-[10px] font-bold tracking-widest text-slate-500 mb-2">RECENT ATTEMPTS</p>
          {attempts.length === 0 && <p className="text-slate-500 text-sm py-4">No attempts yet</p>}
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {[...attempts]
              .reverse()
              .slice(0, 12)
              .map((a, i) => (
                <div key={i} className="flex items-center gap-3 bg-slate-800/40 border border-slate-700/30 rounded-lg px-3 py-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${a.success ? "bg-emerald-400" : "bg-red-400"}`} />
                  <span className="text-slate-400 text-xs font-mono shrink-0 w-20">{new Date(a.date).toISOString().slice(0, 10)}</span>
                  {a.champion && (
                    <span className="flex items-center gap-1.5 shrink-0">
                      <img src={getChampionIcon(a.champion)} alt={a.champion} className="w-5 h-5 rounded" />
                      <span className="text-white text-xs font-medium">{a.champion}</span>
                    </span>
                  )}
                  {a.patch && <span className="text-slate-500 text-[10px] font-mono shrink-0 px-1.5 py-0.5 bg-slate-700/40 rounded">{a.patch}</span>}
                  {a.gameName && <span className="text-slate-400 text-xs truncate flex-1 min-w-0">{a.gameName}</span>}
                  {a.comment && <span className="text-slate-500 text-xs italic truncate flex-1 min-w-0">"{a.comment}"</span>}
                  {!a.gameName && !a.comment && !a.champion && <span className="flex-1" />}
                  <span className={`text-sm font-bold tabular-nums shrink-0 ${a.success ? "text-emerald-400" : "text-red-400"}`}>
                    {a.actualValue != null ? a.actualValue : a.value.toFixed(1)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}

function Sparkline({ values, color, max }) {
  if (!values || values.length < 2) return <div className="w-[60px] h-[22px] rounded bg-slate-900/60" />
  const w = 60
  const h = 22
  const step = w / (values.length - 1)
  const points = values.map((v, i) => `${i * step},${h - 3 - (Math.min(Math.max(v, 0), max) / max) * (h - 6)}`).join(" ")
  return (
    <svg width={w} height={h} className="rounded bg-slate-900/60 shrink-0">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

function SoloObjItem({ objective }) {
  const [results, setResults] = useState([])
  const [isOpen, setIsOpen] = useState(false)

  const fetchResults = async () => {
    try {
      const { ok, data, code } = await api.post("/solo-objectif-result/search", { solo_objectif_id: objective._id })
      if (!ok) return toast.error(code || "Failed to fetch results")
      setResults(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch results")
    }
  }

  useEffect(() => {
    fetchResults()
  }, [objective._id])

  const passed = results.filter(r => r.success).length
  const rate = results.length > 0 ? Math.round((passed / results.length) * 100) : null
  const attempts = [...results]
    .sort((a, b) => new Date(a.game_date || a.createdAt || 0) - new Date(b.game_date || b.createdAt || 0))
    .map(r => ({
      value: r.success ? 1 : 0,
      success: !!r.success,
      date: r.game_date || r.createdAt || new Date().toISOString(),
      champion: r.champion,
      actualValue: r.actual_value
    }))

  return (
    <>
      <div onClick={() => setIsOpen(true)} className="bg-slate-700/20 hover:bg-slate-700/30 cursor-pointer rounded-lg p-3 transition-colors">
        <div className="flex items-center gap-2 mb-2">
          {rate !== null ? (
            rate >= 70 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-red-400 shrink-0" />
            )
          ) : (
            <Target className="w-4 h-4 text-slate-500 shrink-0" />
          )}
          <span className="text-white text-sm font-medium truncate">{objective.name}</span>
          <div className="flex items-center gap-1 flex-wrap min-w-0">
            {objective.rule?.metric && (
              <span className="text-[10px] text-slate-300 bg-slate-700/50 px-1.5 py-0.5 rounded font-mono">
                {objective.rule.metric} {objective.rule.operator} {objective.rule.value}
                {objective.rule.timing != null && ` @ ${objective.rule.timing}min`}
              </span>
            )}
            {objective.side && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${objective.side === "blue" ? "text-blue-400 bg-blue-500/10" : "text-red-400 bg-red-500/10"}`}>
                {objective.side === "blue" ? "Blue" : "Red"}
              </span>
            )}
            {objective.type === "streak" && objective.streak_count && (
              <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded font-medium">{objective.streak_count}x</span>
            )}
            {objective.champions?.length > 0 && (
              <div className="flex items-center gap-0.5">
                {objective.champions.slice(0, 5).map(c => (
                  <img key={c} src={getChampionIcon(c)} alt={c} className="w-4 h-4 rounded" title={c} />
                ))}
                {objective.champions.length > 5 && <span className="text-[10px] text-slate-500 ml-0.5">+{objective.champions.length - 5}</span>}
              </div>
            )}
          </div>
          <div className="flex-1" />
          {rate !== null && (
            <span className={`text-sm font-bold tabular-nums shrink-0 ${rate >= 70 ? "text-emerald-400" : rate >= 50 ? "text-amber-400" : "text-red-400"}`}>{rate}%</span>
          )}
        </div>

        {results.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-slate-700/50 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${rate >= 70 ? "bg-emerald-500" : rate >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${rate}%` }} />
            </div>
            <Sparkline
              values={attempts.some(a => typeof a.actualValue === "number") ? attempts.map(a => a.actualValue ?? 0) : attempts.map(a => a.value)}
              color={rate >= 70 ? "#34d399" : rate >= 50 ? "#fbbf24" : "#f87171"}
              max={attempts.some(a => typeof a.actualValue === "number") ? Math.max(Math.max(...attempts.map(a => a.actualValue ?? 0)), objective.rule?.value ?? 0) || 1 : 1}
            />
            <span className="text-xs text-slate-500 tabular-nums w-10 text-right">
              {passed}/{results.length}
            </span>
          </div>
        )}
        {results.length === 0 && <span className="text-xs text-slate-600">No results yet</span>}
      </div>
      <ObjectiveDetails
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        name={objective.name}
        description={objective.description}
        attempts={attempts}
        type="toggle"
        target={objective.rule?.value ?? null}
        operator={objective.rule?.operator ?? null}
      />
    </>
  )
}

function ScrimObjItem({ objective }) {
  const navigate = useNavigate()
  const [results, setResults] = useState([])
  const [isOpen, setIsOpen] = useState(false)

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

  const passed = results.filter(r => r.result >= 1).length
  const rate = results.length > 0 ? Math.round((passed / results.length) * 100) : null
  const avg = results.length > 0 ? Math.round((results.reduce((s, r) => s + (r.result || 0), 0) / results.length) * 10) / 10 : null
  const attempts = [...results]
    .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0))
    .map(r => ({
      value: objective.rating_type === "rating" ? r.result || 0 : r.result >= 1 ? 1 : 0,
      success: objective.rating_type === "rating" ? (r.result || 0) >= 7 : r.result >= 1,
      date: r.createdAt || new Date().toISOString(),
      patch: r.patch,
      gameName: r.game_name,
      comment: r.comment,
      actualValue: objective.rating_type === "rating" ? r.result : null
    }))

  return (
    <>
      <div onClick={() => setIsOpen(true)} className="bg-slate-700/20 hover:bg-slate-700/30 cursor-pointer rounded-lg p-3 transition-colors">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-white text-sm font-medium truncate">{objective.name}</span>
          <div className="flex items-center gap-1 flex-wrap min-w-0">
            {objective.draft_scenario_name && (
              <button
                onClick={e => {
                  e.stopPropagation()
                  if (objective.draft_scenario_id) navigate(`/performance/draft/${objective.draft_scenario_id}`)
                }}
                className="text-[10px] text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 px-1.5 py-0.5 rounded font-medium truncate max-w-[120px]"
              >
                Draft: {objective.draft_scenario_name}
              </button>
            )}
            {objective.strat_map_name && (
              <button
                onClick={e => {
                  e.stopPropagation()
                  if (objective.strat_map_id) navigate(`/performance/map/${objective.strat_map_id}`)
                }}
                className="text-[10px] text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-1.5 py-0.5 rounded font-medium truncate max-w-[120px]"
              >
                Map: {objective.strat_map_name}
              </button>
            )}
          </div>
          <div className="flex-1" />
          {results.length > 0 && objective.rating_type === "toggle" && (
            <span className={`text-sm font-bold tabular-nums shrink-0 ${rate >= 70 ? "text-emerald-400" : rate >= 50 ? "text-amber-400" : "text-red-400"}`}>{rate}%</span>
          )}
          {results.length > 0 && objective.rating_type === "rating" && (
            <span className={`text-sm font-bold tabular-nums shrink-0 ${avg >= 7 ? "text-emerald-400" : avg >= 5 ? "text-amber-400" : "text-red-400"}`}>{avg}/10</span>
          )}
          {results.length === 0 && <span className="text-xs text-slate-600 shrink-0">No results</span>}
        </div>
        {objective.description && <p className="text-xs text-slate-500 truncate">{objective.description}</p>}
        {results.length > 0 && objective.rating_type === "toggle" && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-2 bg-slate-700/50 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${rate >= 70 ? "bg-emerald-500" : rate >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${rate}%` }} />
            </div>
            <Sparkline values={attempts.map(a => a.value)} color={rate >= 70 ? "#34d399" : rate >= 50 ? "#fbbf24" : "#f87171"} max={1} />
            <span className="text-xs text-slate-500 tabular-nums w-10 text-right">
              {passed}/{results.length}
            </span>
          </div>
        )}
        {results.length > 0 && objective.rating_type === "rating" && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-2 bg-slate-700/50 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${avg >= 7 ? "bg-emerald-500" : avg >= 5 ? "bg-amber-500" : "bg-red-500"}`}
                style={{ width: `${Math.round((avg / 10) * 100)}%` }}
              />
            </div>
            <Sparkline values={attempts.map(a => a.value)} color={avg >= 7 ? "#34d399" : avg >= 5 ? "#fbbf24" : "#f87171"} max={10} />
            <span className="text-xs text-slate-500 tabular-nums w-12 text-right">{results.length} games</span>
          </div>
        )}
      </div>
      <ObjectiveDetails
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        name={objective.name}
        description={objective.description}
        attempts={attempts}
        type={objective.rating_type === "rating" ? "rating" : "toggle"}
      />
    </>
  )
}
