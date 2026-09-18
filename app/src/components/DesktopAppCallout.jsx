import { Monitor, ExternalLink } from "lucide-react"

export const DESKTOP_RELEASES_URL = "https://github.com/axelvuillaume/DraftEdge/releases/latest"

export default function DesktopAppCallout({ compact = false }) {
  return (
    <a
      href={DESKTOP_RELEASES_URL}
      target="_blank"
      rel="noreferrer"
      className={`group flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-colors ${compact ? "px-3 py-2" : "px-4 py-3"}`}
    >
      <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
        <Monitor className="w-4.5 h-4.5 text-amber-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">Skip the manual upload with DraftEdge Desktop</p>
        <p className="text-xs text-slate-400">Reads your League client history, picks the scrim games, skips warmups and pushes them here in one click. Windows & macOS.</p>
      </div>
      <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-amber-400 shrink-0" />
    </a>
  )
}
