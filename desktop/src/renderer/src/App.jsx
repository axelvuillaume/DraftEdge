import { useEffect, useState } from 'react'
import { Toaster } from 'react-hot-toast'
import { Shield, LogOut, Download, RefreshCw, Clapperboard, Loader2, X } from 'lucide-react'
import Auth from './scenes/auth'
import Home from './scenes/home'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.draftedge.auth.me().then((res) => {
      if (res.ok) setUser(res.user)
      setLoading(false)
    })
  }, [])

  async function handleLogout() {
    await window.draftedge.auth.logout()
    setUser(null)
  }

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <TitleBar />
        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">Loading…</div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <Toaster position="top-center" toastOptions={{ style: { background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155' } }} />
      <TitleBar user={user} onLogout={handleLogout} />
      <UpdateBanner />
      <ReplayBanner />
      {!user && <Auth onLogin={setUser} />}
      {user && <Home user={user} />}
    </div>
  )
}

function TitleBar({ user, onLogout }) {
  const isMac = window.draftedge.platform === 'darwin'
  const [version, setVersion] = useState('')

  useEffect(() => {
    window.draftedge.update.version().then(setVersion)
  }, [])

  return (
    <div className={`drag-region h-12 flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 ${isMac ? 'pl-20' : ''}`}>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
          <Shield className="w-4 h-4 text-slate-900" />
        </div>
        <span className="font-bold tracking-tight">DraftEdge</span>
        <span className="text-slate-500 text-xs">Desktop{version ? ` v${version}` : ''}</span>
      </div>
      {user && (
        <div className="no-drag flex items-center gap-3 text-sm">
          <span className="text-slate-300">{user.name || user.email}</span>
          {user.team_name && <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">{user.team_name}</span>}
          <button onClick={onLogout} className="text-slate-400 hover:text-white" title="Log out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}

function UpdateBanner() {
  const [update, setUpdate] = useState(null)

  useEffect(() => window.draftedge.update.onStatus(setUpdate), [])

  if (!update) return null
  if (update.status === 'downloading') {
    return (
      <div className="bg-slate-800 text-slate-300 text-xs px-4 py-1.5 flex items-center gap-2">
        <Download className="w-3.5 h-3.5 text-amber-400" /> Downloading update… {update.percent}%
      </div>
    )
  }
  if (update.status === 'ready') {
    return (
      <div className="bg-amber-500/10 border-b border-amber-500/30 text-amber-200 text-xs px-4 py-1.5 flex items-center gap-3">
        <span>Version {update.version} is ready. It will install on exit, or right now:</span>
        <button onClick={() => window.draftedge.update.install()} className="flex items-center gap-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold px-2 py-0.5">
          <RefreshCw className="w-3 h-3" /> Restart
        </button>
      </div>
    )
  }
  return null
}

// État du lancement d'un replay (bouton Watch de l'app ou deep link draftedge://watch/<id> depuis le site)
function ReplayBanner() {
  const [event, setEvent] = useState(null)

  useEffect(() => {
    window.draftedge.replay.last().then((last) => last && setEvent(last))
    return window.draftedge.replay.onStatus(setEvent)
  }, [])

  useEffect(() => {
    if (event?.status !== 'done') return
    const t = setTimeout(() => setEvent(null), 6000)
    return () => clearTimeout(t)
  }, [event])

  if (!event) return null

  if (event.status === 'running') {
    return (
      <div className="bg-slate-800 text-slate-300 text-xs px-4 py-1.5 flex items-center gap-2">
        <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
        <span className="flex-1">{event.message}</span>
        {typeof event.progress === 'number' && (
          <div className="w-32 h-1 rounded-full bg-slate-700 overflow-hidden">
            <div className="h-full bg-amber-400 transition-all" style={{ width: `${event.progress}%` }} />
          </div>
        )}
      </div>
    )
  }

  const isError = event.status === 'error'
  return (
    <div className={`text-xs px-4 py-1.5 flex items-center gap-2 border-b ${isError ? 'bg-red-500/10 border-red-500/30 text-red-200' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'}`}>
      <Clapperboard className="w-3.5 h-3.5" />
      <span className="flex-1">{event.message}</span>
      <button onClick={() => setEvent(null)} className="p-0.5 opacity-70 hover:opacity-100">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
