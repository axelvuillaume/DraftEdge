import { useEffect, useState } from 'react'
import Login from './scenes/Login'
import Home from './scenes/Home'
import TitleBar from './components/TitleBar'
import UpdateBanner from './components/UpdateBanner'

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
        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">Chargement…</div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <TitleBar user={user} onLogout={handleLogout} />
      <UpdateBanner />
      {!user && <Login onLogin={setUser} />}
      {user && <Home user={user} />}
    </div>
  )
}
