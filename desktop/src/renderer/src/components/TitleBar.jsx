import { useEffect, useState } from 'react'
import { Shield, LogOut } from 'lucide-react'

export default function TitleBar({ user, onLogout }) {
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
          <button onClick={onLogout} className="text-slate-400 hover:text-white" title="Se déconnecter">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
