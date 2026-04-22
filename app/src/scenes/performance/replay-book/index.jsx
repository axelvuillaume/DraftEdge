import { Routes, Route } from "react-router-dom"
import List from "./list"
import View from "./view"

export default function ReplayBook() {
  return (
    <Routes>
      <Route path="/" element={<List />} />
      <Route path="/:id" element={<View />} />
    </Routes>
  )
}
