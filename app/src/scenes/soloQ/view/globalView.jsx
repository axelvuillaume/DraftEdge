import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import { Target, CheckCircle2, XCircle, BarChart3, FileText, TrendingUp, Save } from "lucide-react"
import api from "@/services/api"
import { getChampionIcon } from "@/utils"
import useStore from "@/services/store"

export default function GlobalView({ player, soloqOverview }) {
  return (
    <div className="space-y-6">
      {/* Notes + Top Champions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PlayerNotes player={player} />
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl">
          <div className="px-4 py-3 border-b border-slate-700/30 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h3 className="text-white font-semibold text-sm">Top Champions (SoloQ)</h3>
          </div>
          <div className="p-4 space-y-2">
            {!soloqOverview?.topChampions?.length ? (
              <p className="text-slate-500 text-sm text-center py-4">No data</p>
            ) : (
              soloqOverview.topChampions.slice(0, 3).map((champ, i) => (
                <div key={champ.name} className="flex items-center gap-3 bg-slate-700/20 rounded-lg p-3">
                  <span className="text-slate-500 font-bold text-sm w-5 text-center">#{i + 1}</span>
                  <img src={getChampionIcon(champ.name)} alt={champ.name} className="w-10 h-10 rounded-lg border border-slate-600/50" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">{champ.name}</p>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-slate-400">{champ.games} games</span>
                      <span className={champ.winRate >= 60 ? "text-emerald-400" : champ.winRate >= 50 ? "text-amber-300" : "text-red-400"}>{champ.winRate}% WR</span>
                      <span className="text-slate-400">{champ.kda.toFixed(1)} KDA</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-sky-400">{champ.csPerMin.toFixed(1)} CS/m</p>
                    <p className="text-xs text-red-400">{champ.dmgPerMin.toLocaleString()} DMG/m</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>{" "}
      </div>

      {/* Objectives Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SoloObjectives player={player} />
        <ScrimObjectives player={player} />
      </div>
    </div>
  )
}

function PlayerNotes({ player }) {
  const [notes, setNotes] = useState(player.notes || "")

  const saveNotes = async () => {
    try {
      const { ok, code } = await api.put(`/player/${player._id}`, { notes })
      if (!ok) return toast.error(code || "Failed to save notes")
      toast.success("Notes saved")
    } catch (error) {
      toast.error(error.code || "Failed to save notes")
    }
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl">
      <div className="px-4 py-3 border-b border-slate-700/30 flex items-center gap-2">
        <FileText className="w-4 h-4 text-amber-400" />
        <h3 className="text-white font-semibold text-sm">Notes</h3>
        <button
          onClick={saveNotes}
          className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-xs text-slate-300 hover:text-white transition-colors disabled:opacity-50"
        >
          <Save className="w-3 h-3" />
          Save
        </button>
      </div>
      <div className="p-4">
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Add notes about this player..."
          className="w-full h-32 bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-slate-600 resize-y"
        />
      </div>
    </div>
  )
}
function SoloObjectives({ player }) {
  const [objectives, setObjectives] = useState([])

  const fetchObjectives = async () => {
    try {
      const { ok, data: resData, code } = await api.post("/solo-objectif/search", { player_id: player._id })
      if (!ok) return toast.error(code || "Failed to fetch solo objectives")
      setObjectives(resData)
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
      const { ok, data: resData, code } = await api.post("/scrim-objectif/search", { team_id: user?.team_id })
      if (!ok) return toast.error(code || "Failed to fetch scrim objectives")
      setObjectives(resData)
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
        {objectives.filter(o => o.player_id === player._id).length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Player</p>
            {objectives
              .filter(o => o.player_id === player._id)
              .map(obj => (
                <ScrimObjItem key={obj._id} objective={obj} />
              ))}
          </div>
        )}

        {objectives.filter(o => !o.player_id).length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Team</p>
            {objectives
              .filter(o => !o.player_id)
              .map(obj => (
                <ScrimObjItem key={obj._id} objective={obj} />
              ))}
          </div>
        )}

        {objectives.filter(o => o.player_id === player._id).length === 0 && objectives.filter(o => !o.player_id).length === 0 && (
          <p className="text-slate-500 text-sm text-center py-4">No scrim objectives defined.</p>
        )}
      </div>
    </div>
  )
}

function SoloObjItem({ objective }) {
  const [results, setResults] = useState([])

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

  return (
    <div className="bg-slate-700/20 rounded-lg p-3">
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
        <span className="text-white text-sm font-medium flex-1 truncate">{objective.name}</span>
        {results.length > 0 && (
          <span className="text-xs text-slate-400 tabular-nums">
            {passed}/{results.length}
          </span>
        )}
      </div>
      {results.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-slate-700/50 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${rate >= 70 ? "bg-emerald-500" : rate >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${rate}%` }} />
          </div>
          <span className="text-xs text-slate-400 tabular-nums w-10 text-right">{rate}%</span>
        </div>
      )}
      {results.length === 0 && <span className="text-xs text-slate-600">No results yet</span>}
    </div>
  )
}

function ScrimObjItem({ objective }) {
  const [results, setResults] = useState([])

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

  return (
    <div className="bg-slate-700/20 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-white text-sm font-medium flex-1 truncate">{objective.name}</span>
        {results.length > 0 &&
          (objective.rating_type === "toggle" ? (
            <span className={`text-xs font-medium tabular-nums ${rate >= 70 ? "text-emerald-400" : rate >= 50 ? "text-amber-400" : "text-red-400"}`}>
              {passed}/{results.length} ({rate}%)
            </span>
          ) : (
            <span className="text-xs font-medium text-sky-400 tabular-nums">
              {avg}/10 avg
              <span className="text-slate-500 ml-1">({results.length} games)</span>
            </span>
          ))}
        {results.length === 0 && <span className="text-xs text-slate-600">No results</span>}
      </div>
      {objective.description && <p className="text-xs text-slate-500 truncate">{objective.description}</p>}
      {results.length > 0 && objective.rating_type === "toggle" && (
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-2 bg-slate-700/50 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${rate >= 70 ? "bg-emerald-500" : rate >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${rate}%` }} />
          </div>
          <span className="text-xs text-slate-400 tabular-nums w-10 text-right">{rate}%</span>
        </div>
      )}
      {results.length > 0 && objective.rating_type === "rating" && (
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-2 bg-slate-700/50 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${avg >= 7 ? "bg-emerald-500" : avg >= 5 ? "bg-amber-500" : "bg-red-500"}`}
              style={{ width: `${results.length > 0 ? Math.round((avg / 10) * 100) : 0}%` }}
            />
          </div>
          <span className="text-xs text-slate-400 tabular-nums w-10 text-right">{results.length > 0 ? Math.round((avg / 10) * 100) : 0}%</span>
        </div>
      )}
    </div>
  )
}
