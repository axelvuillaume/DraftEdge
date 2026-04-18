import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import { CreditCard, ExternalLink, Check, Clock } from "lucide-react"
import api from "@/services/api"
import useStore from "@/services/store"

export default function Billings() {
  const { user, team } = useStore()
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchSubscription = async () => {
    try {
      const { ok, data, code } = await api.get("/stripe/subscription")
      if (!ok) return toast.error(code || "Failed to fetch subscription")
      setSubscription(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch subscription")
    }
  }

  useEffect(() => {
    fetchSubscription()
  }, [])

  const handleSubscribe = async () => {
    setLoading(true)
    try {
      const { ok, url, code } = await api.post("/stripe/create-checkout-session")
      if (!ok) return toast.error(code || "Failed to create checkout session")
      window.location.href = url
    } catch (error) {
      toast.error(error.code || "Failed to create checkout session")
    }
    setLoading(false)
  }

  const handleManage = async () => {
    setLoading(true)
    try {
      const { ok, url, code } = await api.post("/stripe/create-portal-session")
      if (!ok) return toast.error(code || "Failed to open billing portal")
      window.location.href = url
    } catch (error) {
      toast.error(error.code || "Failed to open billing portal")
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-2">Billing</h1>
        {team?.createdAt && <p className="text-slate-400 text-sm mb-8">Team created on {new Date(team.createdAt).toLocaleDateString()}</p>}

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8">
          {subscription?.subscription_status === "trialing" ? (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-white font-semibold">Free Trial Active</p>
                  <p className="text-blue-400 text-sm">Your trial ends on {new Date(subscription.subscription_current_period_end).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
                <p className="text-blue-300 font-medium mb-1">Pay after the 14-day free trial</p>
                <p className="text-slate-400 text-sm">You won't be charged until your trial ends. Cancel anytime before.</p>
              </div>

              <div className="bg-slate-700/30 rounded-lg p-4 mb-6">
                <p className="text-slate-300">
                  <span className="text-white font-bold text-2xl">14.99€</span>
                  <span className="text-slate-400"> / month after trial</span>
                </p>
                <p className="text-slate-400 text-sm mt-1">Billed monthly for team {user?.team_name}</p>
              </div>

              {subscription?.has_payment_method ? (
                <button
                  onClick={handleManage}
                  disabled={loading}
                  className="flex items-center gap-2 justify-center w-full py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  <ExternalLink className="w-4 h-4" />
                  {loading ? "Loading..." : "Manage Subscription"}
                </button>
              ) : (
                <button
                  onClick={handleSubscribe}
                  disabled={loading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? "Loading..." : "Add Payment Method"}
                </button>
              )}
            </div>
          ) : subscription?.subscription_status === "cancel_scheduled" ? (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-white font-semibold">Subscription Ending</p>
                  <p className="text-amber-400 text-sm">Your access ends on {new Date(subscription.subscription_current_period_end).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="bg-slate-700/30 rounded-lg p-4 mb-6">
                <p className="text-slate-300">
                  <span className="text-white font-bold text-2xl">14.99€</span>
                  <span className="text-slate-400"> / month</span>
                </p>
                <p className="text-slate-400 text-sm mt-1">Billed monthly for team {user?.team_name}</p>
              </div>

              <button
                onClick={handleManage}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <ExternalLink className="w-4 h-4" />
                {loading ? "Loading..." : "Reactivate Subscription"}
              </button>
            </div>
          ) : subscription?.subscription_status === "active" ? (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Check className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-white font-semibold">Active Subscription</p>
                  <p className="text-slate-400 text-sm">Next billing date: {new Date(subscription.subscription_current_period_end).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="bg-slate-700/30 rounded-lg p-4 mb-6">
                <p className="text-slate-300">
                  <span className="text-white font-bold text-2xl">14.99€</span>
                  <span className="text-slate-400"> / month</span>
                </p>
                <p className="text-slate-400 text-sm mt-1">Billed monthly for team {user?.team_name}</p>
              </div>

              <button
                onClick={handleManage}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <ExternalLink className="w-4 h-4" />
                {loading ? "Loading..." : "Manage Subscription"}
              </button>
            </div>
          ) : (
            <div>
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="w-8 h-8 text-blue-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">DraftEdge Pro</h2>
                <p className="text-slate-400">Unlock full access for your team</p>
              </div>

              <div className="bg-slate-700/30 rounded-lg p-6 mb-8">
                <p className="text-center">
                  <span className="text-white font-bold text-4xl">14.99€</span>
                  <span className="text-slate-400"> / month</span>
                </p>
                <p className="text-slate-400 text-sm text-center mt-2">Per team, billed monthly</p>
              </div>

              <button
                onClick={handleSubscribe}
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? "Loading..." : "Subscribe Now"}
              </button>

              {subscription?.subscription_status === "past_due" && (
                <p className="text-amber-400 text-sm text-center mt-4">Your last payment failed. Please update your payment method.</p>
              )}
              {subscription?.subscription_status === "canceled" && (
                <p className="text-slate-400 text-sm text-center mt-4">Your subscription has been canceled. Subscribe again to regain access.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
