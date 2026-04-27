import { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { toast } from "react-hot-toast"
import api from "@/services/api"

import SoloQOverviewTab from "./soloQ"
import GlobalView from "./globalView"

export default function View() {
  const { id } = useParams()
  const [player, setPlayer] = useState(null)
  const [soloqOverview, setSoloqOverview] = useState(null)
  const [view, setView] = useState("global")

  const fetchPlayer = async () => {
    try {
      const { ok, data, code } = await api.get(`/player/${id}`)
      if (!ok) return toast.error(code || "Failed to fetch player")
      setPlayer(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch player")
    }
  }

  const fetchSoloqOverview = async () => {
    try {
      const { ok, data, code } = await api.post("/soloq-match/soloq-overview", { player_id: id })
      if (!ok) return toast.error(code || "Failed to fetch soloq overview")
      setSoloqOverview(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch soloq overview")
    }
  }

  useEffect(() => {
    fetchPlayer()
    fetchSoloqOverview()
  }, [id])

  if (!player) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <p className="text-slate-500">No data available.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 lg:p-8">
      <div className="space-y-6">
        {view === "global" && <GlobalView player={player} onOpenSoloQ={() => setView("soloq")} />}
        {view === "soloq" && <SoloQOverviewTab player={player} soloqOverview={soloqOverview} onBackToGlobal={() => setView("global")} />}
      </div>
    </div>
  )
}
