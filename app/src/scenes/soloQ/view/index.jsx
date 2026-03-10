import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { toast } from "react-hot-toast"
import { Loader2, ArrowLeft } from "lucide-react"
import api from "@/services/api"
import { TIER_COLORS, RANK_ICON_TIERS, ROLE_LABELS } from "@/utils"

import SoloQOverviewTab from "./soloQ"
import GlobalView from "./globalView"

function getRankIcon(tier) {
  if (!tier) return null
  const key = tier.toLowerCase()
  return RANK_ICON_TIERS.has(tier.toUpperCase()) ? `/rank/${key}.png` : null
}

const TABS = [
  { key: "global", label: "Global" },
  { key: "overview", label: "SoloQ" }
]

export default function View() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState("global")

  const fetchData = async () => {
    try {
      const { ok, data, code } = await api.post("/soloq-match/compare", { player_id: id })
      if (!ok) return toast.error(code || "Failed to fetch data")
      setData(data)
    } catch (error) {
      toast.error(error.message || "Failed to fetch data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <p className="text-slate-500">No data available.</p>
      </div>
    )
  }

  const { player } = data

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 lg:p-8">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Back + Player Header */}
        <div className="flex items-center gap-4">
          <Link to="/soloq" className="p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-slate-600/80 transition-all">
            <ArrowLeft className="w-4 h-4 text-slate-400" />
          </Link>
          <div className="flex items-center gap-3">
            {player.role && <img src={`/roles/${player.role}.png`} alt={player.role} className="w-5 h-5 opacity-70" />}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-white font-bold text-xl">{player.game_name}</h1>
                <span className="text-slate-500 text-sm">#{player.tag_line}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {player.role && <span className="text-slate-400">{ROLE_LABELS[player.role] || player.role}</span>}
                {player.current_tier && (
                  <>
                    <span className="text-slate-600">-</span>
                    <span style={{ color: TIER_COLORS[player.current_tier] || "#94a3b8" }}>
                      {player.current_tier} {player.current_rank || ""}
                    </span>
                    <span className="text-slate-500">{player.current_lp ?? 0} LP</span>
                  </>
                )}
              </div>
            </div>
            {getRankIcon(player.current_tier) && (
              <img
                src={getRankIcon(player.current_tier)}
                alt={player.current_tier}
                className="w-12 h-12 object-contain"
                style={{ filter: `drop-shadow(0 0 8px ${TIER_COLORS[player.current_tier] || "#64748b"}40)` }}
              />
            )}
            <a
              href={`https://dpm.lol/${encodeURIComponent(player.game_name)}-${encodeURIComponent(player.tag_line)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-slate-600/80 transition-all"
            >
              <img src="/dpm_full_logo.png" alt="DPM.lol" className="h-6 object-contain" />
            </a>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-800/50 border border-slate-700/50 rounded-lg p-1 w-fit">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                tab === t.key ? "bg-slate-700 text-white shadow-sm" : "text-slate-400 hover:text-slate-300 hover:bg-slate-700/30"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === "overview" && <SoloQOverviewTab data={data} />}
        {tab === "global" && <GlobalView data={data} />}
      </div>
    </div>
  )
}
