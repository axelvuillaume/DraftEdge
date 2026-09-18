import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Loader2, Copy, Clock, X } from 'lucide-react'

const ICONS = {
  pending: <Clock className="w-4 h-4 text-slate-500" />,
  downloading: <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />,
  uploading: <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />,
  done: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
  duplicate: <Copy className="w-4 h-4 text-slate-400" />,
  error: <XCircle className="w-4 h-4 text-red-400" />,
  cancelled: <X className="w-4 h-4 text-slate-500" />
}

function fmtTime(ms) {
  return new Date(ms).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

/**
 * Lance l'import dès le montage et affiche la progression par game.
 * onClose(summary) est appelé quand l'utilisateur ferme le panneau une fois terminé.
 */
export default function ImportPanel({ games, session, user, onClose }) {
  const [states, setStates] = useState(() => Object.fromEntries(games.map((g) => [g.gameId, { status: 'pending', message: 'En attente' }])))
  const [summary, setSummary] = useState(null)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    const off = window.draftedge.import.onProgress((ev) => {
      setStates((prev) => ({ ...prev, [ev.gameId]: { status: ev.status, message: ev.message, progress: ev.progress } }))
    })
    window.draftedge.import.run({ games, session, user }).then((res) => {
      if (!res.ok) {
        setSummary({ error: res.code })
        return
      }
      const count = (s) => res.results.filter((r) => r.status === s).length
      setSummary({ done: count('done'), duplicate: count('duplicate'), failed: count('error'), cancelled: count('cancelled') })
    })
    return off
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function cancel() {
    setCancelling(true)
    await window.draftedge.import.cancel()
  }

  const ordered = [...games].sort((a, b) => a.creation - b.creation)
  const finished = !!summary

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
        <div className="px-5 py-4 border-b border-slate-800">
          <h2 className="font-semibold">Import vers « {session.name || 'bloc'} »</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {games.length} game{games.length > 1 ? 's' : ''} · le client télécharge chaque replay puis DraftEdge l&apos;analyse
          </p>
        </div>

        <div className="max-h-80 overflow-auto px-5 py-3 space-y-2">
          {ordered.map((g, i) => {
            const st = states[g.gameId]
            return (
              <div key={g.gameId} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 shrink-0">{ICONS[st.status] || ICONS.pending}</span>
                <span className="text-slate-500 text-xs w-10 tabular-nums mt-0.5 shrink-0">{fmtTime(g.creation)}</span>
                <span className="text-slate-300 w-16 shrink-0">Game {i + 1}</span>
                <span className={`flex-1 text-xs break-all ${st.status === 'error' ? 'text-red-400' : 'text-slate-400'}`}>{st.message}</span>
              </div>
            )
          })}
        </div>

        <div className="px-5 py-4 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            {!finished && 'Import en cours… ne ferme pas le client League.'}
            {finished && summary.error && <span className="text-red-400">{summary.error}</span>}
            {finished && !summary.error && (
              <span>
                <span className="text-emerald-400">{summary.done} importée{summary.done > 1 ? 's' : ''}</span>
                {summary.duplicate > 0 && <span> · {summary.duplicate} doublon{summary.duplicate > 1 ? 's' : ''}</span>}
                {summary.failed > 0 && <span className="text-red-400"> · {summary.failed} échec{summary.failed > 1 ? 's' : ''}</span>}
                {summary.cancelled > 0 && <span> · {summary.cancelled} annulée{summary.cancelled > 1 ? 's' : ''}</span>}
              </span>
            )}
          </div>
          {!finished && (
            <button onClick={cancel} disabled={cancelling} className="text-sm text-slate-400 hover:text-white disabled:opacity-50">
              {cancelling ? 'Arrêt après la game en cours…' : 'Annuler'}
            </button>
          )}
          {finished && (
            <button onClick={() => onClose(summary)} className="rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold px-4 py-2 text-sm">
              Fermer
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
