import { useEffect, useState } from "react"
import { Toaster, toast } from "react-hot-toast"
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom"
import * as Sentry from "@sentry/browser"
import posthog from "posthog-js"
import { CreditCard } from "lucide-react"

import Auth from "@/scenes/auth"
import Home from "@/scenes/home"
import Navbar from "@/components/NavBar"
import TopBar from "@/components/TopBar"
import Loader from "@/components/loader"
import Team from "@/scenes/team"
import useStore from "@/services/store"
import api from "@/services/api"
import Modal from "@/components/modal"
import PerformancePage from "@/scenes/performance"
import { environment, SENTRY_URL, POSTHOG_API_KEY, POSTHOG_HOST } from "./config"
import SoloQ from "@/scenes/soloQ"
import Opponents from "@/scenes/opponents"
import Performance from "@/scenes/stats"
import League from "@/scenes/league"
import Website from "@/scenes/website"
import StratMap from "@/scenes/performance/strat-map"
import Billings from "@/scenes/billings"

if (environment === "production") {
  Sentry.init({ dsn: SENTRY_URL, environment: "app" })
}

// Initialize PostHog with Session Replay (only in production)
if (environment === "production") {
  posthog.init(POSTHOG_API_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: "identified_only",
    capture_pageview: false, // We'll capture manually for SPA
    capture_pageleave: true,
    session_recording: {
      maskAllInputs: false,
      maskInputOptions: {
        password: true
      }
    }
  })
}

// Component to track page views on route changes
function PostHogPageView() {
  const location = useLocation()

  useEffect(() => {
    if (environment === "production") {
      posthog.capture("$pageview", {
        $current_url: window.location.href
      })
    }
  }, [location])

  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <PostHogPageView />
      <Routes>
        <Route path="/website" element={<Website />} />
        <Route element={<AuthLayout />}>
          <Route path="/auth/*" element={<Auth />} />
        </Route>
        <Route element={<UserLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/team" element={<Team />} />
          <Route path="/scrim-hub/*" element={<PerformancePage />} />
          <Route path="/soloq/*" element={<SoloQ />} />
          <Route path="/opponents/*" element={<Opponents />} />
          <Route path="/performance/*" element={<Performance />} />
          <Route path="/league/*" element={<League />} />
          <Route path="/map/*" element={<StratMap />} />
          <Route path="/billings" element={<AdminRoute><Billings /></AdminRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <Toaster position="top-center" />
    </BrowserRouter>
  )
}

const AdminRoute = ({ children }) => {
  const { user } = useStore()
  if (user?.role !== "admin") return <Navigate to="/" replace={true} />
  return children
}

const AuthLayout = () => {
  const { user } = useStore()
  if (user) return <Navigate to="/" replace={true} />
  return <Outlet />
}

const NEWS_DATE = "2026-04-08"
const NEWS_CONTENT = [
  {
    title: "Strat Map",
    highlight: true,
    description: "Visualize and plan your strategies directly on the map. Place wards, draw movements, and coordinate your team's game plan.",
    link: "/map"
  },
  {
    title: "Scrim Objectives",
    items: ["View results and notes for each objective", "Link a map and a draft to an objective"],
    link: "/scrim-hub"
  }
]

const NewsModal = ({ user }) => {
  const { setUser } = useStore()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(!user.view_news_at || new Date(user.view_news_at) < new Date(NEWS_DATE))

  const handleClose = async () => {
    setIsOpen(false)
    try {
      const { ok, data, code } = await api.put("/user", { view_news_at: new Date() })
      if (!ok) return toast.error(code || "Failed to update")
      setUser(data)
    } catch (error) {
      toast.error(error.code || "Failed to update")
    }
  }

  return (
    <Modal isOpen={isOpen} className="max-w-lg w-full bg-slate-800">
      <div className="p-8">
        <h2 className="text-2xl font-bold text-white mb-1">What's new</h2>
        <p className="text-sm text-slate-400 mb-6">{new Date(NEWS_DATE).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
        <div className="space-y-4">
          {NEWS_CONTENT.map((item, i) => (
            <div key={i} className={`rounded-xl p-4 ${item.highlight ? "bg-blue-600/20 border border-blue-500/30" : "bg-slate-700/50"}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {item.highlight && <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-500 text-white px-2 py-0.5 rounded-full">New Feature</span>}
                  <h3 className="text-white font-semibold">{item.title}</h3>
                </div>
                {item.link && (
                  <button
                    onClick={() => {
                      handleClose()
                      navigate(item.link)
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Go to →
                  </button>
                )}
              </div>
              {item.description && <p className="text-slate-300 text-sm">{item.description}</p>}
              {item.items && (
                <ul className="mt-1 space-y-1">
                  {item.items.map((text, j) => (
                    <li key={j} className="text-slate-300 text-sm flex items-start gap-2">
                      <span className="text-blue-400 mt-0.5">•</span>
                      {text}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
        <button onClick={handleClose} className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl transition-colors">
          Got it
        </button>
      </div>
    </Modal>
  )
}

const UserLayout = () => {
  const [loading, setLoading] = useState(true)
  const [subscribeLoading, setSubscribeLoading] = useState(false)
  const { user, setUser, team, setTeam } = useStore()

  async function fetchUser() {
    try {
      const { ok, token, user } = await api.get("/user/signin_token")
      if (!ok) {
        setUser(null)
        posthog.reset()
        return
      }
      api.setToken(token)
      setUser(user)

      // Fetch team data
      if (user.team_id) {
        const teamRes = await api.get(`/team/${user.team_id}`)
        if (teamRes.ok) setTeam(teamRes.data)
      }

      // Identify user in PostHog for Session Replay
      posthog.identify(user._id, {
        email: user.email,
        name: user.name,
        team_name: user.team_name
      })
    } catch (e) {
      console.log(e)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUser()
  }, [])

  if (loading) return <Loader />

  if (!user) return <Navigate to="/auth" replace={true} />

  const handleSubscribe = async () => {
    setSubscribeLoading(true)
    try {
      const { ok, url, code } = await api.post("/stripe/create-checkout-session")
      if (!ok) return toast.error(code || "Failed to create checkout session")
      window.location.href = url
    } catch (error) {
      toast.error(error.code || "Failed to create checkout session")
    }
    setSubscribeLoading(false)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-900">
      <NewsModal user={user} />
      {/* Sidebar */}
      <nav className="hidden lg:block flex-shrink-0">
        <Navbar />
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <TopBar />
        <div className="flex-1 overflow-auto relative">
          <Outlet />
          {team?.subscription_status === "canceled" && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-md w-full mx-4 text-center shadow-2xl">
                <div className="w-14 h-14 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-5">
                  <CreditCard className="w-7 h-7 text-blue-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">No Active Subscription</h2>
                <p className="text-slate-400 mb-6">Your subscription has ended. Subscribe to regain full access to DraftEdge.</p>
                <div className="bg-slate-700/30 rounded-lg p-4 mb-6">
                  <span className="text-white font-bold text-3xl">14.99€</span>
                  <span className="text-slate-400"> / month</span>
                  <p className="text-slate-400 text-sm mt-1">Per team, billed monthly</p>
                </div>
                {user?.role === "admin" ? (
                  <button
                    onClick={handleSubscribe}
                    disabled={subscribeLoading}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors disabled:opacity-50">
                    {subscribeLoading ? "Loading..." : "Subscribe Now"}
                  </button>
                ) : (
                  <p className="text-slate-500 text-sm">Contact your team admin to resubscribe.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
