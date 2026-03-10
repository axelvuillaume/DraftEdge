import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import { Target, CheckCircle2, XCircle, BarChart3, FileText, TrendingUp, Loader2, Save } from "lucide-react"
import api from "@/services/api"
import { getChampionIcon } from "@/utils"
import useStore from "@/services/store"

function StatCard({ label, value, sub, color }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex flex-col">
      <span className="text-slate-500 text-xs uppercase tracking-wider">{label}</span>
      <span className={`text-2xl font-bold mt-1 ${color || "text-white"}`}>{value}</span>
      {sub && <span className="text-slate-500 text-xs mt-0.5">{sub}</span>}
    </div>
  )
}

function ProgressBar({ value, max, color = "bg-emerald-500" }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-700/50 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-400 tabular-nums w-10 text-right">{pct}%</span>
    </div>
  )
}

export default function GlobalView({ data }) {
  const { player, soloqOverall, champions, pocketPicks } = data
  const { user } = useStore()
  const [soloObjectives, setSoloObjectives] = useState([])
  const [soloResults, setSoloResults] = useState({})
  const [scrimObjectives, setScrimObjectives] = useState([])
  const [scrimResults, setScrimResults] = useState({})
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState(player.notes || "")
  const [savingNotes, setSavingNotes] = useState(false)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const teamId = user?.team_id
        const [soloObjRes, scrimObjRes] = await Promise.all([api.post("/solo-objectif/search", { player_id: player._id }), api.post("/scrim-objectif/search", { team_id: teamId })])

        const soloObjs = soloObjRes.ok ? soloObjRes.data : []
        setSoloObjectives(soloObjs)

        const scrimObjs = scrimObjRes.ok ? scrimObjRes.data : []
        setScrimObjectives(scrimObjs)

        // Fetch results for each solo objective
        if (soloObjs.length > 0) {
          const resultPromises = soloObjs.map(obj => api.post("/solo-objectif-result/search", { solo_objectif_id: obj._id }))
          const resultResponses = await Promise.all(resultPromises)
          const resultsMap = {}
          soloObjs.forEach((obj, i) => {
            resultsMap[obj._id] = resultResponses[i].ok ? resultResponses[i].data : []
          })
          setSoloResults(resultsMap)
        }

        // Fetch results for each scrim objective
        if (scrimObjs.length > 0) {
          const scrimResultPromises = scrimObjs.map(obj => api.post("/scrim-objectif-result/search", { objectif_id: obj._id }))
          const scrimResultResponses = await Promise.all(scrimResultPromises)
          const scrimResultsMap = {}
          scrimObjs.forEach((obj, i) => {
            scrimResultsMap[obj._id] = scrimResultResponses[i].ok ? scrimResultResponses[i].data : []
          })
          setScrimResults(scrimResultsMap)
        }
      } catch (error) {
        toast.error("Failed to fetch objectives")
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [player._id])

  const saveNotes = async () => {
    setSavingNotes(true)
    try {
      const { ok, code } = await api.put(`/player/${player._id}`, { notes })
      if (!ok) toast.error(code || "Failed to save notes")
      toast.success("Notes saved")
    } catch (error) {
      toast.error(error.code || "Failed to save notes")
    } finally {
      setSavingNotes(false)
    }
  }

  // Compute solo objective stats
  const soloObjStats = soloObjectives.map(obj => {
    const results = soloResults[obj._id] || []
    const total = results.length
    const passed = results.filter(r => r.success).length
    return { ...obj, total, passed, rate: total > 0 ? Math.round((passed / total) * 100) : null }
  })

  const totalSoloResults = soloObjStats.reduce((acc, o) => acc + o.total, 0)
  const totalSoloPassed = soloObjStats.reduce((acc, o) => acc + o.passed, 0)
  const overallSoloRate = totalSoloResults > 0 ? Math.round((totalSoloPassed / totalSoloResults) * 100) : null

  // Compute scrim objective stats
  // Player-specific scrim objectives
  const playerScrimObjs = scrimObjectives.filter(o => o.player_id === player._id)
  // Team-wide scrim objectives (no player_id)
  const teamScrimObjs = scrimObjectives.filter(o => !o.player_id)

  const computeScrimObjStats = objs => {
    return objs.map(obj => {
      const results = scrimResults[obj._id] || []
      const total = results.length
      if (obj.rating_type === "toggle") {
        const passed = results.filter(r => r.result >= 1).length
        return { ...obj, total, passed, rate: total > 0 ? Math.round((passed / total) * 100) : null }
      }
      // rating type
      const avg = total > 0 ? results.reduce((s, r) => s + (r.result || 0), 0) / total : null
      return { ...obj, total, avg: avg !== null ? Math.round(avg * 10) / 10 : null }
    })
  }

  const playerScrimStats = computeScrimObjStats(playerScrimObjs)
  const teamScrimStats = computeScrimObjStats(teamScrimObjs)

  // Top 3 most played
  const top3 = (data.mostPlayed || []).slice(0, 3)

  // Win/Loss
  const totalRanked = (player.current_wins || 0) + (player.current_losses || 0)
  const rankedWR = totalRanked > 0 ? (((player.current_wins || 0) / totalRanked) * 100).toFixed(1) : null

  return (
    <div className="space-y-6">
      {/* Key Stats */}
      {soloqOverall && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <StatCard
            label="KDA"
            value={soloqOverall.kda.toFixed(1)}
            sub={`${soloqOverall.avgKills} / ${soloqOverall.avgDeaths} / ${soloqOverall.avgAssists}`}
            color={soloqOverall.kda >= 3 ? "text-emerald-400" : soloqOverall.kda >= 2 ? "text-amber-400" : "text-red-400"}
          />
          <StatCard
            label="Win Rate"
            value={`${soloqOverall.winRate}%`}
            sub={`${soloqOverall.wins}W ${soloqOverall.games - soloqOverall.wins}L`}
            color={soloqOverall.winRate >= 50 ? "text-emerald-400" : "text-red-400"}
          />
          <StatCard label="Games" value={soloqOverall.games} sub="SoloQ analyzed" color="text-violet-400" />
          <StatCard label="CS / min" value={soloqOverall.csPerMin.toFixed(1)} color="text-sky-400" />
          <StatCard label="DMG / min" value={soloqOverall.dmgPerMin.toLocaleString()} color="text-red-400" />
          <StatCard label="Gold / min" value={soloqOverall.goldPerMin.toLocaleString()} color="text-amber-400" />
        </div>
      )}

      {/* Champion Pool + Top Played */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Notes */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl">
          <div className="px-4 py-3 border-b border-slate-700/30 flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-400" />
            <h3 className="text-white font-semibold text-sm">Notes</h3>
            <button
              onClick={saveNotes}
              disabled={savingNotes}
              className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-xs text-slate-300 hover:text-white transition-colors disabled:opacity-50"
            >
              {savingNotes ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
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

        {/* Top 3 Champions */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl">
          <div className="px-4 py-3 border-b border-slate-700/30 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h3 className="text-white font-semibold text-sm">Top Champions (SoloQ)</h3>
          </div>
          <div className="p-4 space-y-2">
            {top3.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">No data</p>
            ) : (
              top3.map((champ, i) => {
                const wrColor = champ.winRate >= 60 ? "text-emerald-400" : champ.winRate >= 50 ? "text-amber-300" : "text-red-400"
                return (
                  <div key={champ.name} className="flex items-center gap-3 bg-slate-700/20 rounded-lg p-3">
                    <span className="text-slate-500 font-bold text-sm w-5 text-center">#{i + 1}</span>
                    <img src={getChampionIcon(champ.name)} alt={champ.name} className="w-10 h-10 rounded-lg border border-slate-600/50" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">{champ.name}</p>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-slate-400">{champ.games} games</span>
                        <span className={wrColor}>{champ.winRate}% WR</span>
                        <span className="text-slate-400">{champ.kda.toFixed(1)} KDA</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-sky-400">{champ.csPerMin.toFixed(1)} CS/m</p>
                      <p className="text-xs text-red-400">{champ.dmgPerMin.toLocaleString()} DMG/m</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Objectives Section */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Solo Objectives */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl">
            <div className="px-4 py-3 border-b border-slate-700/30 flex items-center gap-2">
              <Target className="w-4 h-4 text-violet-400" />
              <h3 className="text-white font-semibold text-sm">SoloQ Objectives</h3>
              {overallSoloRate !== null && (
                <span className={`text-xs font-medium ml-auto ${overallSoloRate >= 70 ? "text-emerald-400" : overallSoloRate >= 50 ? "text-amber-400" : "text-red-400"}`}>
                  {overallSoloRate}% overall
                </span>
              )}
            </div>
            <div className="p-4 space-y-2">
              {soloObjStats.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">No solo objectives defined.</p>
              ) : (
                soloObjStats.map(obj => (
                  <div key={obj._id} className="bg-slate-700/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      {obj.rate !== null ? (
                        obj.rate >= 70 ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                        )
                      ) : (
                        <Target className="w-4 h-4 text-slate-500 shrink-0" />
                      )}
                      <span className="text-white text-sm font-medium flex-1 truncate">{obj.name}</span>
                      {obj.total > 0 && (
                        <span className="text-xs text-slate-400 tabular-nums">
                          {obj.passed}/{obj.total}
                        </span>
                      )}
                    </div>
                    {obj.total > 0 && <ProgressBar value={obj.passed} max={obj.total} color={obj.rate >= 70 ? "bg-emerald-500" : obj.rate >= 50 ? "bg-amber-500" : "bg-red-500"} />}
                    {obj.total === 0 && <span className="text-xs text-slate-600">No results yet</span>}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Scrim Objectives */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl">
            <div className="px-4 py-3 border-b border-slate-700/30 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-400" />
              <h3 className="text-white font-semibold text-sm">Scrim Objectives</h3>
            </div>
            <div className="p-4 space-y-4">
              {/* Player-specific scrim objectives */}
              {playerScrimStats.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Player</p>
                  {playerScrimStats.map(obj => (
                    <ScrimObjRow key={obj._id} obj={obj} />
                  ))}
                </div>
              )}

              {/* Team scrim objectives */}
              {teamScrimStats.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Team</p>
                  {teamScrimStats.map(obj => (
                    <ScrimObjRow key={obj._id} obj={obj} />
                  ))}
                </div>
              )}

              {playerScrimStats.length === 0 && teamScrimStats.length === 0 && <p className="text-slate-500 text-sm text-center py-4">No scrim objectives defined.</p>}
            </div>
          </div>
        </div>
      )}

      {/* No data fallback */}
      {!soloqOverall && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-12 text-center">
          <p className="text-slate-500">No SoloQ data available for this player.</p>
        </div>
      )}
    </div>
  )
}

function ScrimObjRow({ obj }) {
  return (
    <div className="bg-slate-700/20 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-white text-sm font-medium flex-1 truncate">{obj.name}</span>
        {obj.total > 0 &&
          (obj.rating_type === "toggle" ? (
            <span className={`text-xs font-medium tabular-nums ${obj.rate >= 70 ? "text-emerald-400" : obj.rate >= 50 ? "text-amber-400" : "text-red-400"}`}>
              {obj.passed}/{obj.total} ({obj.rate}%)
            </span>
          ) : (
            <span className="text-xs font-medium text-sky-400 tabular-nums">
              {obj.avg}/10 avg
              <span className="text-slate-500 ml-1">({obj.total} games)</span>
            </span>
          ))}
        {obj.total === 0 && <span className="text-xs text-slate-600">No results</span>}
      </div>
      {obj.description && <p className="text-xs text-slate-500 truncate">{obj.description}</p>}
      {obj.total > 0 && obj.rating_type === "toggle" && (
        <div className="mt-2">
          <ProgressBar value={obj.passed} max={obj.total} color={obj.rate >= 70 ? "bg-emerald-500" : obj.rate >= 50 ? "bg-amber-500" : "bg-red-500"} />
        </div>
      )}
      {obj.total > 0 && obj.rating_type === "rating" && (
        <div className="mt-2">
          <ProgressBar value={obj.avg} max={10} color={obj.avg >= 7 ? "bg-emerald-500" : obj.avg >= 5 ? "bg-amber-500" : "bg-red-500"} />
        </div>
      )}
    </div>
  )
}
