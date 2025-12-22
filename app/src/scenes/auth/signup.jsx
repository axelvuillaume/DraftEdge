import React, { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import toast from "react-hot-toast"
import { Shield, Mail, Lock, Users, ArrowRight, Gamepad2, BarChart3, Trophy } from "lucide-react"

import LoadingButton from "@/components/loadingButton"
import store from "@/services/store"
import api from "@/services/api"

export default () => {
  const [values, setValues] = useState({ team_name: "", email: "", password: "" })
  const { user, setUser } = store()
  const navigate = useNavigate()

  const send = async () => {
    try {
      const { user, token } = await api.post(`/user/signup`, values)
      if (token) api.setToken(token)
      if (user) setUser(user)
    } catch (e) {
      console.log("e", e)
      toast.error(e.code)
    }
  }

  if (user) navigate("/")

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-12 flex-col justify-between relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-600/10 rounded-full blur-3xl" />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center">
            <Shield className="w-7 h-7 text-slate-900" />
          </div>
          <div>
            <span className="text-white font-bold text-2xl tracking-tight">DraftEdge</span>
            <p className="text-slate-500 text-sm">Scrim Tracker</p>
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-4xl font-bold text-white mb-4">Start tracking today</h2>
            <p className="text-slate-400 text-lg">Create your team account and gain competitive insights in minutes.</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4 text-slate-300">
              <div className="w-10 h-10 rounded-lg bg-slate-800/80 flex items-center justify-center">
                <Gamepad2 className="w-5 h-5 text-amber-500" />
              </div>
              <span>Upload game screenshots automatically</span>
            </div>
            <div className="flex items-center gap-4 text-slate-300">
              <div className="w-10 h-10 rounded-lg bg-slate-800/80 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-amber-500" />
              </div>
              <span>Detailed statistics per role</span>
            </div>
            <div className="flex items-center gap-4 text-slate-300">
              <div className="w-10 h-10 rounded-lg bg-slate-800/80 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-amber-500" />
              </div>
              <span>Track win rates and KDA trends</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-slate-600 text-sm relative z-10">© 2024 DraftEdge. All rights reserved.</p>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 bg-slate-950 flex items-center justify-center p-8 lg:p-16">
        <div className="w-full max-w-lg">
          {/* Mobile Logo */}
          <div className="flex items-center gap-3 mb-12 lg:hidden">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-slate-900" />
            </div>
            <span className="text-white font-bold text-xl tracking-tight">DraftEdge</span>
          </div>

          <div className="mb-10">
            <h1 className="text-3xl font-bold text-white mb-3">Create your account</h1>
            <p className="text-slate-500">Start tracking your team's performance</p>
          </div>

          <div className="space-y-6">
            {/* Team Name Input */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2.5" htmlFor="team_name">
                Team name
              </label>
              <div className="relative">
                <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                <input
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-4 pl-12 pr-4 text-white placeholder-slate-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors text-base"
                  type="text"
                  id="team_name"
                  placeholder="Your team name"
                  value={values.team_name}
                  onChange={e => setValues({ ...values, team_name: e.target.value })}
                />
              </div>
            </div>

            {/* Email Input */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2.5" htmlFor="email">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                <input
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-4 pl-12 pr-4 text-white placeholder-slate-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors text-base"
                  name="email"
                  type="email"
                  id="email"
                  placeholder="you@example.com"
                  value={values.email}
                  onChange={e => setValues({ ...values, email: e.target.value })}
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2.5" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                <input
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-4 pl-12 pr-4 text-white placeholder-slate-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors text-base"
                  name="password"
                  type="password"
                  id="password"
                  placeholder="••••••••"
                  value={values.password}
                  onChange={e => setValues({ ...values, password: e.target.value })}
                />
              </div>
              <p className="mt-2 text-sm text-slate-600">Must be at least 8 characters</p>
            </div>

            {/* Submit Button */}
            <LoadingButton
              className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-900 font-semibold rounded-xl transition-all duration-200 text-base mt-2"
              onClick={send}
            >
              <span>Create account</span>
              <ArrowRight className="w-5 h-5" />
            </LoadingButton>

            {/* Divider */}
            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800"></div>
              </div>
            </div>

            {/* Footer */}
            <p className="text-center text-slate-500">
              Already have an account?{" "}
              <Link className="text-amber-500 hover:text-amber-400 font-medium transition-colors" to="/auth">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
