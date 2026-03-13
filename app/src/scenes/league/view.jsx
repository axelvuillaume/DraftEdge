import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { toast } from "react-hot-toast"
import { ArrowLeft, ExternalLink, Users, UserCog, UserPlus } from "lucide-react"
import api from "@/services/api"

export default function View() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [team, setTeam] = useState(null)

  const fetchTeam = async () => {
    try {
      const { ok, data, code } = await api.get(`/team-league/${id}`)
      if (!ok) return toast.error(code || "Failed to load team")
      setTeam(data)
    } catch (error) {
      toast.error(error.code || "Failed to load team")
    }
  }

  useEffect(() => {
    fetchTeam()
  }, [id])

  if (!team) {
    return (
      <div className="min-h-[calc(100vh-65px)] flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <p className="text-slate-400">Team not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-65px)] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 lg:p-8">
      <div className="max-w-[1200px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/league")} className="p-2 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">{team.name}</h1>
            {team.league_name && <p className="text-sm text-slate-400 mt-0.5">{team.league_name}</p>}
          </div>
        </div>

        {/* Description */}
        {team.description && (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
            <p className="text-slate-300 text-sm">{team.description}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Players */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-500" />
                <h2 className="text-white font-semibold text-sm uppercase tracking-wider opacity-70">Players ({team.players?.length || 0})</h2>
              </div>
              {team.players?.length > 0 ? (
                <div className="space-y-2">
                  {team.players.map((player, i) => {
                    const riotId = team.players_ids?.[i]
                    const dpmUrl = riotId ? `https://dpm.lol/${encodeURIComponent(riotId.replace("#", "-"))}` : null
                    return (
                      <div key={i} className="flex items-center gap-3 px-4 py-2.5 bg-slate-700/30 rounded-lg">
                        <span className="text-white text-sm flex-1">{player}</span>
                        {dpmUrl && (
                          <a
                            href={dpmUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-slate-600/80 transition-all flex-shrink-0"
                          >
                            <img src="/dpm_full_logo.png" alt="DPM.lol" className="h-4 object-contain" />
                          </a>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-slate-500 text-sm">No players listed</p>
              )}
            </div>

            {/* Replacements */}
            {team.replacements?.length > 0 && (
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-teal-400" />
                  <h2 className="text-white font-semibold text-sm uppercase tracking-wider opacity-70">Replacements ({team.replacements.length})</h2>
                </div>
                <div className="space-y-2">
                  {team.replacements.map((player, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2.5 bg-slate-700/30 rounded-lg">
                      <span className="text-white text-sm">{player}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Staff */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <UserCog className="w-4 h-4 text-blue-400" />
                <h2 className="text-white font-semibold text-sm uppercase tracking-wider opacity-70">Staff ({team.staff?.length || 0})</h2>
              </div>
              {team.staff?.length > 0 ? (
                <div className="space-y-2">
                  {team.staff.map((member, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2.5 bg-slate-700/30 rounded-lg">
                      <span className="text-white text-sm">{member}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm">No staff listed</p>
              )}
            </div>

            {/* Contact & Links */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-4">
              <h2 className="text-white font-semibold text-sm uppercase tracking-wider opacity-70">Contact & Links</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1 block">Discord Manager</label>
                  <p className="text-white text-sm">{team.discord_manager || "—"}</p>
                </div>
                <div>
                  <label className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1 block">Discord Captain</label>
                  <p className="text-white text-sm">{team.discord_captain || "—"}</p>
                </div>
                {(() => {
                  const multiUrl =
                    team.multi_opgg ||
                    (team.players_ids?.length > 0 ? `https://www.op.gg/multisearch/euw?summoners=${team.players_ids.map(id => encodeURIComponent(id)).join(",")}` : null)
                  if (!multiUrl) return null
                  return (
                    <div>
                      <label className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1 block">Multi OP.GG</label>
                      <a
                        href={multiUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-amber-400 hover:text-amber-300 text-sm transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Open Multi OP.GG
                      </a>
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
