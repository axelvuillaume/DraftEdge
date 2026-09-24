import { AlertTriangle, CheckCircle2, Users } from 'lucide-react'

function champIcon(id) {
  return `https://cdn.communitydragon.org/latest/champion/${id}/square`
}

function fmtTime(ms) {
  return new Date(ms).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function fmtDuration(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function GameRow({ game, champions, checked, disabled, onToggle, imported, warmup }) {
  const mine = game.participants.filter((p) => p.side === game.mySide)
  const theirs = game.participants.filter((p) => p.side && p.side !== game.mySide)

  return (
    <label className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${disabled ? 'opacity-50 cursor-not-allowed border-slate-800/60' : 'cursor-pointer hover:bg-slate-800/40'} ${checked ? 'border-amber-500/50 bg-amber-500/5' : 'border-slate-800'}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={onToggle} className="accent-amber-500" />

      <div className="w-14 text-xs text-slate-400 tabular-nums">
        <div>{fmtTime(game.creation)}</div>
        <div className="text-slate-500">{fmtDuration(game.duration)}</div>
      </div>

      <div className="flex items-center gap-1">
        {game.mySide && <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${game.mySide === 'blue' ? 'bg-blue-500/15 text-blue-400' : 'bg-red-500/15 text-red-400'}`}>{game.mySide === 'blue' ? 'BLUE' : 'RED'}</span>}
        {game.myWin !== null && <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${game.myWin ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-700 text-slate-300'}`}>{game.myWin ? 'W' : 'L'}</span>}
      </div>

      <div className="flex-1 flex items-center gap-3 min-w-0">
        <Team players={mine} champions={champions} />
        <span className="text-slate-600 text-xs">vs</span>
        <Team players={theirs} champions={champions} dim />
        {!game.detailed && game.myChampionId && <img src={champIcon(game.myChampionId)} alt="" className="w-6 h-6 rounded" />}
      </div>

      <div className="flex items-center gap-2 text-xs shrink-0">
        {warmup?.rosterCount !== null && warmup?.rosterCount !== undefined && (
          <span className="flex items-center gap-1 text-slate-400" title="Roster players on your team">
            <Users className="w-3 h-3" /> {warmup.rosterCount}/5
          </span>
        )}
        {imported && (
          <span className="flex items-center gap-1 text-emerald-400" title={imported.session_name ? `Already in “${imported.session_name}”` : 'Already imported'}>
            <CheckCircle2 className="w-3.5 h-3.5" /> Imported{imported.session_name ? ` · ${imported.session_name}` : ''}
          </span>
        )}
        {!imported && warmup?.isWarmup && (
          <span className="flex items-center gap-1 text-amber-400" title={warmup.reasons.join(', ')}>
            <AlertTriangle className="w-3.5 h-3.5" /> {warmup.reasons[0]}
          </span>
        )}
      </div>
    </label>
  )
}

function Team({ players, champions, dim }) {
  if (!players.length) return <span className="text-slate-600 text-xs">—</span>
  return (
    <div className={`flex -space-x-1 ${dim ? 'opacity-70' : ''}`}>
      {players.map((p) => (
        <img key={p.participantId} src={champIcon(p.championId)} alt={champions?.[p.championId]?.name || ''} title={`${champions?.[p.championId]?.name || p.championId} · ${p.gameName}${p.tagLine ? '#' + p.tagLine : ''}`} className="w-6 h-6 rounded ring-1 ring-slate-900" />
      ))}
    </div>
  )
}
