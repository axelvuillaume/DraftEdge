import React, { useState } from "react"
import { Link } from "react-router-dom"
import queryString from "query-string"
import toast from "react-hot-toast"
import { useNavigate, useLocation } from "react-router-dom"
import { Shield, Lock, ArrowRight, ShieldCheck, Gamepad2, BarChart3, Trophy, Info } from "lucide-react"

import LoadingButton from "@/components/loadingButton"
import api from "@/services/api"

export default () => {
  const [values, setValues] = useState({ password: "", password1: "" })

  const navigate = useNavigate()
  const location = useLocation()

  const send = async () => {
    try {
      if (values.password !== values.password1) {
        return toast.error("Passwords don't match")
      }
      if (values.password.length < 6) {
        return toast.error("Password must be at least 6 characters")
      }

      const { token } = queryString.parse(location.search)
      const res = await api.post("/user/forgot_password_reset", { ...values, token })
      if (!res.ok) throw res
      toast.success("Password updated successfully!")
      navigate("/auth")
    } catch (e) {
      toast.error(`Error: ${e && e.code}`)
    }
  }

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
            <h2 className="text-4xl font-bold text-white mb-4">Almost there!</h2>
            <p className="text-slate-400 text-lg">Create a strong password to keep your account secure.</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4 text-slate-300">
              <div className="w-10 h-10 rounded-lg bg-slate-800/80 flex items-center justify-center">
                <Gamepad2 className="w-5 h-5 text-amber-500" />
              </div>
              <span>Upload replay files</span>
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

          {/* Header */}
          <div className="mb-10">
            <div className="w-14 h-14 bg-gradient-to-br from-amber-500/20 to-amber-600/20 rounded-xl flex items-center justify-center mb-6 ring-1 ring-amber-500/30">
              <ShieldCheck className="w-7 h-7 text-amber-500" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-3">Create new password</h1>
            <p className="text-slate-500">Choose a strong password for your account.</p>
          </div>

          {/* Password Requirements */}
          <div className="flex items-start gap-3 bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-8">
            <Info className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-slate-400 text-sm">
              Password must be at least <span className="text-white font-medium">6 characters</span> and contain at least <span className="text-white font-medium">one letter</span>
              .
            </p>
          </div>

          <div className="space-y-6">
            {/* New Password Input */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2.5" htmlFor="password">
                New password
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
            </div>

            {/* Confirm Password Input */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2.5" htmlFor="password1">
                Confirm password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                <input
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-4 pl-12 pr-4 text-white placeholder-slate-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors text-base"
                  name="password1"
                  type="password"
                  id="password1"
                  placeholder="••••••••"
                  value={values.password1}
                  onChange={e => setValues({ ...values, password1: e.target.value })}
                  onKeyDown={e => e.key === "Enter" && send()}
                />
              </div>
              {values.password1 && values.password !== values.password1 && <p className="mt-2 text-sm text-red-400">Passwords don't match</p>}
            </div>

            {/* Submit Button */}
            <LoadingButton
              className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-900 font-semibold rounded-xl transition-all duration-200 text-base mt-2"
              onClick={send}
            >
              <span>Reset password</span>
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
              Remember your password?{" "}
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
