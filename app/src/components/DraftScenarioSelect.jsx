import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { toast } from "react-hot-toast"
import api from "@/services/api"
import useStore from "@/services/store"

export default function DraftScenarioSelect({ value, onChange }) {
  const [items, setItems] = useState([])
  const { user } = useStore()

  const fetchItems = async () => {
    try {
      const { ok, data, code } = await api.post("/draft-scenario/search", { team_id: user?.team_id })
      if (!ok) return toast.error(code || "Failed to fetch draft scenarios")
      setItems(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch draft scenarios")
    }
  }

  useEffect(() => {
    fetchItems()
  }, [user?.team_id])

  if (items.length === 0)
    return (
      <p className="text-slate-500 text-xs py-1">
        No draft scenarios yet.{" "}
        <Link to="/scrim-hub/draft" className="text-amber-400 hover:text-amber-300 transition-colors">
          Create one here
        </Link>
      </p>
    )

  return (
    <select
      value={value || ""}
      onChange={e => onChange(e.target.value || null, items.find(i => i._id === e.target.value)?.name || null)}
      className="w-full bg-slate-700/50 border-0 outline-none ring-0 focus:ring-1 focus:ring-amber-500 rounded-lg px-3 py-2.5 text-white text-sm"
    >
      <option value="">None</option>
      {items.map(item => (
        <option key={item._id} value={item._id}>
          {item.name}
        </option>
      ))}
    </select>
  )
}
