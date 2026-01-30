import { useEffect, useState } from "react"
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom"
import { Toaster } from "react-hot-toast"
import * as Sentry from "@sentry/browser"
import posthog from "posthog-js"

import Auth from "@/scenes/auth"
import Home from "@/scenes/home"
import Games from "@/scenes/games"
import Stats from "@/scenes/stats"
import Navbar from "@/components/NavBar"
import TopBar from "@/components/TopBar"
import Loader from "@/components/loader"
import Team from "@/scenes/team"
import useStore from "@/services/store"
import api from "@/services/api"
import StatsV2 from "@/scenes/statsV2"
import { environment, SENTRY_URL, POSTHOG_API_KEY, POSTHOG_HOST } from "./config"

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
        password: true,
      },
    },
  })
}

// Component to track page views on route changes
function PostHogPageView() {
  const location = useLocation()

  useEffect(() => {
    if (environment === "production") {
      posthog.capture("$pageview", {
        $current_url: window.location.href,
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
        <Route element={<AuthLayout />}>
          <Route path="/auth/*" element={<Auth />} />
        </Route>
        <Route element={<UserLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/games" element={<Games />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/team" element={<Team />} />
          <Route path="/statsV2" element={<StatsV2 />} />
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <Toaster position="top-center" />
    </BrowserRouter>
  )
}

const AuthLayout = () => {
  const { user } = useStore()
  if (user) return <Navigate to="/" replace={true} />
  return <Outlet />
}

const UserLayout = () => {
  const [loading, setLoading] = useState(true)
  const { user, setUser } = useStore()

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

      // Identify user in PostHog for Session Replay
      posthog.identify(user._id, {
        email: user.email,
        name: user.name,
        team_name: user.team_name,
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

  return (
    <div className="flex h-screen overflow-hidden bg-slate-900">
      {/* Sidebar */}
      <nav className="hidden lg:block flex-shrink-0">
        <Navbar />
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <TopBar />
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
