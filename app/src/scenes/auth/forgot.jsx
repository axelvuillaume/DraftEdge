import React, { useState } from "react"
import { Link } from "react-router-dom"
import validator from "validator"
import toast from "react-hot-toast"
import { Shield, Mail, ArrowRight, ArrowLeft, KeyRound, CheckCircle2, Gamepad2, BarChart3, Trophy } from "lucide-react"

import LoadingButton from "@/components/loadingButton"
import api from "@/services/api"

export default () => {
  const [done, setDone] = useState(false)
  const [email, setEmail] = useState("")

  const send = async () => {
    try {
      if (!validator.isEmail(email)) return toast.error("Invalid email address")

      const res = await api.post("/user/forgot_password", { email })
      if (!res.ok) throw res
      toast.success("Email sent!")
      setDone(true)
    } catch (e) {
      toast.error("Error", e.code)
    }
  }

  if (done) {
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
              <h2 className="text-4xl font-bold text-white mb-4">Secure your account</h2>
              <p className="text-slate-400 text-lg">We take security seriously. Reset your password safely.</p>
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

        {/* Right Panel - Success */}
        <div className="w-full lg:w-1/2 bg-slate-950 flex items-center justify-center p-8 lg:p-16">
          <div className="w-full max-w-lg text-center">
            {/* Mobile Logo */}
            <div className="flex items-center gap-3 mb-12 lg:hidden justify-center">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-slate-900" />
              </div>
              <span className="text-white font-bold text-xl tracking-tight">DraftEdge</span>
            </div>

            {/* Success Icon */}
            <div className="mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 rounded-full flex items-center justify-center mx-auto mb-6 ring-1 ring-emerald-500/30">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-3">Check your inbox</h1>
              <p className="text-slate-400 text-lg max-w-sm mx-auto">
                We've sent a password reset link to <span className="text-white font-medium">{email}</span>
              </p>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-8">
              <p className="text-slate-400 text-sm">
                Didn't receive the email? Check your spam folder or{" "}
                <button onClick={() => setDone(false)} className="text-amber-500 hover:text-amber-400 font-medium transition-colors">
                  try again
                </button>
              </p>
            </div>

            <Link to="/auth" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to sign in</span>
            </Link>
          </div>
        </div>
      </div>
    )
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
            <h2 className="text-4xl font-bold text-white mb-4">Secure your account</h2>
            <p className="text-slate-400 text-lg">We take security seriously. Reset your password safely.</p>
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
              <KeyRound className="w-7 h-7 text-amber-500" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-3">Reset password</h1>
            <p className="text-slate-500">Enter your email and we'll send you a link to reset your password.</p>
          </div>

          <div className="space-y-6">
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
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && send()}
                />
              </div>
            </div>

            {/* Submit Button */}
            <LoadingButton
              className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-900 font-semibold rounded-xl transition-all duration-200 text-base"
              onClick={send}
            >
              <span>Send reset link</span>
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
