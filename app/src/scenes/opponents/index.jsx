import { useState, useEffect } from "react"
import { Routes, Route } from "react-router-dom"
import { toast } from "react-hot-toast"
import api from "@/services/api"

import List from "./list"
import View from "./view"

export default function Index() {
  const [stats, setStats] = useState([])

  const fetchStats = async () => {
    try {
      const { ok, data, code } = await api.post("/enemy-team/stats")
      if (!ok) return toast.error(code || "Failed to fetch stats")
      setStats(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch stats")
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  return (
    <Routes>
      <Route path="/" element={<List stats={stats} />} />
      <Route path="/:id" element={<View stats={stats} />} />
    </Routes>
  )
}
