import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshCw, Download } from 'lucide-react'
import BlockPicker from '../components/BlockPicker'
import GameRow from '../components/GameRow'
import ImportPanel from '../components/ImportPanel'
import { detectWarmup } from '../lib/warmup'

const DAY_MS = 24 * 3600 * 1000
const INITIAL_DAYS = 7
const MORE_DAYS = 7

// Les blocs sont stockés à minuit UTC (date seule) : on lit les composantes UTC pour retrouver le bon jour local
function blockDay(session) {
  const d = new Date(session.date)
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function dayKey(ms) {
  return startOfDay(new Date(ms)).getTime()
}

function fmtDayLong(ms) {
  const d = new Date(ms)
  const today = startOfDay(new Date()).getTime()
  if (dayKey(ms) === today) return "Aujourd'hui"
  if (dayKey(ms) === today - DAY_MS) return 'Hier'
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' })
}

function fmtDay(ms) {
  return new Date(ms).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export default function Import({ user, lcu }) {
  const [session, setSession] = useState(null)
  const [daysShown, setDaysShown] = useState(INITIAL_DAYS)
  const [hasMore, setHasMore] = useState(false)
  const [nextIndex, setNextIndex] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [games, setGames] = useState([])
  const [champions, setChampions] = useState({})
  const [roster, setRoster] = useState([])
  const [existing, setExisting] = useState({})
  const [selected, setSelected] = useState(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [importing, setImporting] = useState(null) // games en cours d'import

  useEffect(() => {
    window.draftedge.api.post('/player/search', { team_id: user.team_id, limit: 50 }).then((r) => r.ok && setRoster(r.data))
  }, [user.team_id])

  const loadHistory = useCallback(async () => {
    if (!lcu.connected) return
    setLoading(true)
    setError('')
    const [h, c] = await Promise.all([window.draftedge.lcu.history({ detailCustoms: true }), window.draftedge.lcu.champions()])
    setLoading(false)
    if (!h.ok) return setError(h.code || 'Historique indisponible')
    setGames(h.data.games)
    setHasMore(h.data.hasMore)
    setNextIndex(h.data.nextIndex)
    setDaysShown(INITIAL_DAYS)
    setSeen(new Set())
    setSelected(new Set())
    if (c.ok) setChampions(c.data)
    await checkExisting(h.data.games)
  }, [lcu.connected])

  async function checkExisting(list) {
    const ids = list.filter((g) => g.isCustom).map((g) => g.riotGameId)
    if (!ids.length) return
    const check = await window.draftedge.api.post('/parser/check', { game_ids: ids })
    if (check.ok) setExisting((prev) => ({ ...prev, ...(check.data.existing || {}) }))
  }

  // "Voir plus" : on élargit la fenêtre de 7 jours et on charge la page suivante du client si besoin
  async function loadMore() {
    const newDays = daysShown + MORE_DAYS
    const lowerBound = startOfDay(new Date()).getTime() - newDays * DAY_MS
    const oldest = games.length ? Math.min(...games.map((g) => g.creation)) : Infinity
    setDaysShown(newDays)
    if (!hasMore || oldest < lowerBound) return
    setLoadingMore(true)
    const h = await window.draftedge.lcu.history({ detailCustoms: true, begIndex: nextIndex })
    setLoadingMore(false)
    if (!h.ok) return setError(h.code || 'Historique indisponible')
    const known = new Set(games.map((g) => g.gameId))
    const fresh = h.data.games.filter((g) => !known.has(g.gameId))
    setGames((prev) => [...prev, ...fresh])
    setHasMore(h.data.hasMore)
    setNextIndex(h.data.nextIndex)
    await checkExisting(fresh)
  }

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const start = useMemo(() => startOfDay(new Date()).getTime() - (daysShown - 1) * DAY_MS, [daysShown])

  const visible = useMemo(() => {
    return games.filter((g) => g.creation >= start).filter((g) => showAll || g.isCustom).sort((a, b) => a.creation - b.creation)
  }, [games, start, showAll])

  // Groupes par jour, du plus récent au plus ancien ; games dans l'ordre chronologique
  const days = useMemo(() => {
    const map = new Map()
    for (const g of visible) {
      const k = dayKey(g.creation)
      if (!map.has(k)) map.set(k, [])
      map.get(k).push(g)
    }
    return [...map.entries()].sort((a, b) => b[0] - a[0])
  }, [visible])
  const blockDayKey = session ? blockDay(session).getTime() : null
  const canLoadMore = hasMore || (games.length > 0 && Math.min(...games.map((g) => g.creation)) < start)

  const analysis = useMemo(() => {
    const out = {}
    for (const g of visible) {
      out[g.gameId] = {
        imported: existing[g.riotGameId] || null,
        warmup: detectWarmup(g, { roster })
      }
    }
    return out
  }, [visible, existing, roster])

  // Sélection par défaut (customs non importées et non warmup), appliquée une seule fois par game
  const [seen, setSeen] = useState(new Set())
  useEffect(() => {
    const fresh = visible.filter((g) => !seen.has(g.gameId))
    if (!fresh.length) return
    setSelected((prev) => {
      const next = new Set(prev)
      for (const g of fresh) {
        const a = analysis[g.gameId]
        if (g.isCustom && !a.imported && !a.warmup.isWarmup) next.add(g.gameId)
      }
      return next
    })
    setSeen((prev) => new Set([...prev, ...fresh.map((g) => g.gameId)]))
  }, [visible, analysis, seen])

  // Une game qui s'avère déjà importée après le check est retirée de la sélection
  useEffect(() => {
    setSelected((prev) => {
      const next = new Set([...prev].filter((id) => !visible.find((g) => g.gameId === id && existing[g.riotGameId])))
      return next.size === prev.size ? prev : next
    })
  }, [existing, visible])

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      if (!prev.has(id)) next.add(id)
      return next
    })
  }

  const selectedGames = visible.filter((g) => selected.has(g.gameId))
  const canImport = !!session && selectedGames.length > 0 && lcu.connected && !importing

  function startImport() {
    if (!canImport) return
    setImporting(selectedGames)
  }

  async function finishImport() {
    const done = importing
    setImporting(null)
    setSelected((prev) => new Set([...prev].filter((id) => !done.find((g) => g.gameId === id))))
    await checkExisting(done)
  }
  const offDayCount = session ? selectedGames.filter((g) => !sameDay(new Date(g.creation), blockDay(session))).length : 0

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-auto p-6 space-y-4 max-w-4xl w-full mx-auto">
        <BlockPicker user={user} value={session} onChange={setSession} />

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500">Depuis le {fmtDay(start)}</span>
          <label className="flex items-center gap-1.5 text-slate-400 cursor-pointer">
            <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} className="accent-amber-500" /> Afficher aussi les non-customs
          </label>
          <button onClick={loadHistory} disabled={loading || !lcu.connected} className="ml-auto flex items-center gap-1 text-slate-400 hover:text-white disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Rafraîchir
          </button>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {offDayCount > 0 && (
          <p className="text-xs text-amber-400">
            {offDayCount} game{offDayCount > 1 ? 's' : ''} sélectionnée{offDayCount > 1 ? 's' : ''} ne {offDayCount > 1 ? 'sont' : 'est'} pas le jour du bloc ({fmtDay(blockDay(session).getTime())}). Elles seront quand même rattachées à ce bloc.
          </p>
        )}

        {!lcu.connected && <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-slate-500 text-sm">En attente du client League…</div>}

        {lcu.connected && !loading && visible.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-slate-500 text-sm">
            Aucune {showAll ? 'game' : 'custom'} depuis le {fmtDay(start)}.
          </div>
        )}

        {loading && games.length === 0 && <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-slate-500 text-sm">Lecture de l&apos;historique du client…</div>}

        <div className="space-y-4">
          {days.map(([k, list]) => (
            <div key={k} className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
                <span className="font-medium text-slate-200 capitalize">{fmtDayLong(k)}</span>
                <span>· {list.length} game{list.length > 1 ? 's' : ''}</span>
                {blockDayKey === k && <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-medium">Jour du bloc</span>}
                <span className="flex-1 border-t border-slate-800" />
              </div>
              {list.map((g) => {
                const a = analysis[g.gameId]
                return <GameRow key={g.gameId} game={g} champions={champions} checked={selected.has(g.gameId)} disabled={!!a.imported || !g.isCustom} onToggle={() => toggle(g.gameId)} imported={a.imported} warmup={a.warmup} />
              })}
            </div>
          ))}
        </div>

        {lcu.connected && games.length > 0 && canLoadMore && (
          <div className="flex justify-center pt-2">
            <button onClick={loadMore} disabled={loadingMore} className="text-sm text-slate-400 hover:text-white px-4 py-2 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-50">
              {loadingMore ? 'Chargement…' : `Voir plus (${MORE_DAYS} jours de plus)`}
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-slate-800 bg-slate-900/80 px-6 py-3 flex items-center justify-between">
        <span className="text-sm text-slate-400">
          {selectedGames.length} game{selectedGames.length > 1 ? 's' : ''} sélectionnée{selectedGames.length > 1 ? 's' : ''}
          {session ? ` → ${session.name || 'bloc'}` : ' · choisis un bloc'}
        </span>
        <button onClick={startImport} disabled={!canImport} className="flex items-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 font-semibold px-4 py-2 text-sm">
          <Download className="w-4 h-4" /> Importer
        </button>
      </div>

      {importing && <ImportPanel games={importing} session={session} user={user} onClose={finishImport} />}
    </div>
  )
}
