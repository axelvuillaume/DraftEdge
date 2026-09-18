import { useEffect, useState } from 'react'
import { Gamepad2, RefreshCw } from 'lucide-react'

export function useLcuStatus() {
  const [status, setStatus] = useState({ connected: false, summoner: null })
  useEffect(() => {
    window.draftedge.lcu.status().then(setStatus)
    return window.draftedge.lcu.onStatus(setStatus)
  }, [])
  return status
}

export default function LcuStatus({ status }) {
  const [refreshing, setRefreshing] = useState(false)

  async function refresh() {
    setRefreshing(true)
    await window.draftedge.lcu.refresh()
    setRefreshing(false)
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${status.connected ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
          <Gamepad2 className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${status.connected ? 'bg-emerald-400' : 'bg-slate-600'}`} />
            <span className="font-medium">{status.connected ? 'Client League connecté' : 'Client League introuvable'}</span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {status.connected && status.summoner && (
              <>
                {status.summoner.gameName}
                <span className="text-slate-500">#{status.summoner.tagLine}</span>
              </>
            )}
            {status.connected && !status.summoner && 'Connecte-toi au client pour voir ton historique'}
            {!status.connected && 'Lance le client League of Legends, la détection est automatique'}
          </p>
        </div>
      </div>
      <button onClick={refresh} className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800" title="Rafraîchir">
        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
      </button>
    </div>
  )
}
