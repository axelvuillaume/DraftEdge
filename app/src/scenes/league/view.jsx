import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { toast } from "react-hot-toast"
import { ArrowLeft, ExternalLink, Users, UserCog, UserPlus, Trophy } from "lucide-react"
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
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">{team.name}</h1>
            {team.league_name && <p className="text-sm text-slate-400 mt-0.5">{team.league_name}{team.group ? ` — Group ${team.group}` : ""}</p>}
          </div>
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-center">
              <div className="text-xs text-slate-400 uppercase tracking-wider">Record</div>
              <div className="text-lg font-bold text-white">{team.wins || 0}-{team.losses || 0}</div>
            </div>
            <div className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-center">
              <div className="text-xs text-slate-400 uppercase tracking-wider">Points</div>
              <div className="text-lg font-bold text-amber-400">{team.points || 0}</div>
            </div>
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
            <PlayersList team={team} />

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
                      <span className="text-white text-sm">{player.name}</span>
                      {player.riot_id && <span className="text-slate-500 text-xs">{player.riot_id}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <OldPlayersList team={team} />
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
                      <span className="text-white text-sm">{member.name}</span>
                      {member.riot_id && <span className="text-slate-500 text-xs">{member.riot_id}</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm">No staff listed</p>
              )}
            </div>

            {/* Contacts */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-4">
              <h2 className="text-white font-semibold text-sm uppercase tracking-wider opacity-70">Contacts</h2>
              {team.contacts?.length > 0 ? (
                <div className="space-y-3">
                  {team.contacts.map((contact, i) => (
                    <div key={i} className="px-4 py-3 bg-slate-700/30 rounded-lg space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-amber-400 font-medium uppercase">{contact.role}</span>
                        {contact.name && <span className="text-white text-sm font-medium">{contact.name}</span>}
                      </div>
                      <div className="flex items-center gap-4">
                        {contact.discord && <span className="text-slate-400 text-xs">Discord: {contact.discord}</span>}
                        {contact.twitter && <span className="text-slate-400 text-xs">Twitter: {contact.twitter}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm">No contacts listed</p>
              )}
            </div>

            {/* Multi OP.GG */}
            {(() => {
              const multiUrl =
                team.multi_opgg ||
                (team.players?.length > 0 ? `https://www.op.gg/multisearch/euw?summoners=${team.players.map(p => encodeURIComponent(p.riot_id)).join(",")}` : null)
              if (!multiUrl) return null
              return (
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
                  <a href={multiUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-amber-400 hover:text-amber-300 text-sm transition-colors">
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
  )
}

const ROLE_ORDER = { top: 0, jungle: 1, mid: 2, bottom: 3, support: 4 }

function OldPlayersList({ team }) {
  const [players, setPlayers] = useState([])

  const fetchPlayers = async () => {
    try {
      const { ok, data, code } = await api.post("/player/search", { team_league_id: team._id, active: false })
      if (!ok) return toast.error(code || "Failed to fetch old players")
      setPlayers(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch old players")
    }
  }

  useEffect(() => {
    fetchPlayers()
  }, [team._id])

  if (players.length === 0) return null

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-slate-500" />
        <h2 className="text-white font-semibold text-sm uppercase tracking-wider opacity-70">Old Players ({players.length})</h2>
      </div>
      <div className="space-y-2">
        {[...players]
          .sort((a, b) => (ROLE_ORDER[a.role] ?? 99) - (ROLE_ORDER[b.role] ?? 99))
          .map(player => (
            <div key={player._id} className="flex items-center gap-3 px-4 py-2.5 bg-slate-700/30 rounded-lg opacity-60">
              {player.role && <span className="text-xs text-slate-500 uppercase w-14">{player.role}</span>}
              <span className="text-white text-sm">{player.player_name || player.game_name || "—"}</span>
              {player.riot_id && <span className="text-slate-500 text-xs flex-1">{player.riot_id}</span>}
              <div className="flex items-center gap-2 text-xs">
                {player.current_tier && (
                  <span className="text-slate-400">
                    {player.current_tier} {player.current_rank}
                  </span>
                )}
                {player.current_lp != null && <span className="text-amber-400 font-medium">{player.current_lp} LP</span>}
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}

function PlayersList({ team }) {
  const [players, setPlayers] = useState([])

  const fetchPlayers = async () => {
    try {
      const { ok, data, code } = await api.post("/player/search", { team_league_id: team._id, active: true })
      if (!ok) return toast.error(code || "Failed to fetch players")
      setPlayers(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch players")
    }
  }

  useEffect(() => {
    fetchPlayers()
  }, [team._id])

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-amber-500" />
          <h2 className="text-white font-semibold text-sm uppercase tracking-wider opacity-70">Players ({players.length})</h2>
        </div>
        {players.length > 0 && (
          <div className="flex items-center gap-2">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-amber-400 text-sm font-medium">{players.reduce((sum, p) => sum + (p.current_lp || 0), 0)} LP</span>
            <span className="text-slate-500 text-xs">Best of 5</span>
          </div>
        )}
      </div>
      {players.length > 0 ? (
        <div className="space-y-2">
          {[...players]
            .sort((a, b) => (ROLE_ORDER[a.role] ?? 99) - (ROLE_ORDER[b.role] ?? 99))
            .map(player => (
              <div key={player._id} className="flex items-center gap-3 px-4 py-2.5 bg-slate-700/30 rounded-lg">
                {player.role && <span className="text-xs text-slate-500 uppercase w-14">{player.role}</span>}
                <span className="text-white text-sm">{player.player_name || player.game_name || "—"}</span>
                {player.riot_id && <span className="text-slate-500 text-xs flex-1">{player.riot_id}</span>}
                <div className="flex items-center gap-2 text-xs">
                  {player.current_tier && (
                    <span className="text-slate-400">
                      {player.current_tier} {player.current_rank}
                    </span>
                  )}
                  {player.current_lp != null && <span className="text-amber-400 font-medium">{player.current_lp} LP</span>}
                </div>
                {player.game_name && player.tag_line && (
                  <a
                    href={`https://dpm.lol/${encodeURIComponent(player.game_name)}-${encodeURIComponent(player.tag_line)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-slate-600/80 transition-all flex-shrink-0"
                  >
                    <img src="/dpm_full_logo.png" alt="DPM.lol" className="h-4 object-contain" />
                  </a>
                )}
              </div>
            ))}
        </div>
      ) : (
        <p className="text-slate-500 text-sm">No players listed</p>
      )}
    </div>
  )
}
