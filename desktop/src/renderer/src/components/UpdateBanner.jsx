import { useEffect, useState } from 'react'
import { Download, RefreshCw } from 'lucide-react'

export default function UpdateBanner() {
  const [update, setUpdate] = useState(null)

  useEffect(() => window.draftedge.update.onStatus(setUpdate), [])

  if (!update) return null
  if (update.status === 'downloading') {
    return (
      <div className="bg-slate-800 text-slate-300 text-xs px-4 py-1.5 flex items-center gap-2">
        <Download className="w-3.5 h-3.5 text-amber-400" /> Téléchargement de la mise à jour… {update.percent}%
      </div>
    )
  }
  if (update.status === 'ready') {
    return (
      <div className="bg-amber-500/10 border-b border-amber-500/30 text-amber-200 text-xs px-4 py-1.5 flex items-center gap-3">
        <span>
          Version {update.version} prête. Elle s&apos;installera à la fermeture, ou maintenant :
        </span>
        <button onClick={() => window.draftedge.update.install()} className="flex items-center gap-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold px-2 py-0.5">
          <RefreshCw className="w-3 h-3" /> Redémarrer
        </button>
      </div>
    )
  }
  return null
}
