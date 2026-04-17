import { useState, useEffect, useRef } from "react"
import { toast } from "react-hot-toast"
import { ArrowLeft, Plus, Trash2, Clock, Play, Pencil } from "lucide-react"
import api from "@/services/api"
import { useParams, useNavigate } from "react-router-dom"

export default function View() {
  const { id } = useParams()
  const navigate = useNavigate()
  const playerRef = useRef(null)
  const containerRef = useRef(null)
  const [replay, setReplay] = useState(null)
  const [newNote, setNewNote] = useState({ title: "", description: "", timing: "" })
  const [showNoteForm, setShowNoteForm] = useState(false)
  const [editingIndex, setEditingIndex] = useState(null)
  const [editingName, setEditingName] = useState(null)

  const fetchReplay = async () => {
    try {
      const { ok, data, code } = await api.get(`/replay-book/${id}`)
      if (!ok) return toast.error(code || "Failed to fetch replay")
      setReplay(data)
    } catch (error) {
      toast.error(error.code || "Failed to fetch replay")
    }
  }

  const handleSaveNote = async () => {
    if (!newNote.title.trim()) return toast.error("Enter a note title")
    const timingParts = newNote.timing.split(":").map(Number)
    if (timingParts.length !== 2 || timingParts.some(p => isNaN(p))) return toast.error("Enter a valid timing (MM:SS)")
    try {
      const note = { title: newNote.title.trim(), description: newNote.description.trim(), timing: timingParts[0] * 60 + timingParts[1] }
      const notes = editingIndex !== null ? replay.notes.map((n, i) => (i === editingIndex ? note : n)) : [...(replay.notes || []), note]
      const { ok, code } = await api.put(`/replay-book/${id}`, { ...replay, notes })
      if (!ok) return toast.error(code || "Failed to save note")
      setNewNote({ title: "", description: "", timing: "" })
      setShowNoteForm(false)
      setEditingIndex(null)
      fetchReplay()
    } catch (error) {
      toast.error(error.code || "Failed to save note")
    }
  }

  const handleSaveName = async () => {
    if (!editingName.trim()) return toast.error("Name cannot be empty")
    try {
      const { ok, code } = await api.put(`/replay-book/${id}`, { ...replay, name: editingName.trim() })
      if (!ok) return toast.error(code || "Failed to update name")
      setEditingName(null)
      fetchReplay()
    } catch (error) {
      toast.error(error.code || "Failed to update name")
    }
  }

  const handleDeleteNote = async index => {
    try {
      const { ok, code } = await api.put(`/replay-book/${id}`, { ...replay, notes: replay.notes.filter((_, i) => i !== index) })
      if (!ok) return toast.error(code || "Failed to delete note")
      fetchReplay()
    } catch (error) {
      toast.error(error.code || "Failed to delete note")
    }
  }

  useEffect(() => {
    fetchReplay()
  }, [])

  useEffect(() => {
    if (!showNoteForm) return
    const interval = setInterval(() => {
      if (!playerRef.current?.getPlayerState || playerRef.current.getPlayerState() !== 1) return
      if (!playerRef.current?.getCurrentTime) return
      setNewNote(prev => ({
        ...prev,
        timing: `${String(Math.floor(playerRef.current.getCurrentTime() / 60)).padStart(2, "0")}:${String(Math.floor(playerRef.current.getCurrentTime() % 60)).padStart(2, "0")}`
      }))
    }, 1000)
    return () => clearInterval(interval)
  }, [showNoteForm])

  useEffect(() => {
    if (!replay) return
    const videoId = replay.link?.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/)?.[1]
    if (!videoId || !containerRef.current) return

    const loadPlayer = () => {
      if (playerRef.current?.destroy) playerRef.current.destroy()
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        width: "100%",
        height: "100%"
      })
    }

    if (window.YT?.Player) return loadPlayer()

    const tag = document.createElement("script")
    tag.src = "https://www.youtube.com/iframe_api"
    document.head.appendChild(tag)
    window.onYouTubeIframeAPIReady = loadPlayer
    return () => {
      window.onYouTubeIframeAPIReady = null
    }
  }, [replay?.link])

  if (!replay) return null

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 lg:p-8">
      <div className="max-w-[1800px] mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/scrim-hub/replay-book")} className="p-2 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          {editingName !== null ? (
            <form
              onSubmit={e => {
                e.preventDefault()
                handleSaveName()
              }}
              className="flex items-center gap-2 flex-1"
            >
              <input
                autoFocus
                value={editingName}
                onChange={e => setEditingName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Escape") setEditingName(null)
                }}
                className="px-3 py-1 rounded-lg border border-slate-600 bg-slate-700/50 text-white text-xl font-semibold focus:border-amber-500 focus:outline-none flex-1"
              />
              <button type="submit" className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded-lg text-sm transition-colors">
                Save
              </button>
              <button type="button" onClick={() => setEditingName(null)} className="px-3 py-1 text-slate-400 hover:text-white text-sm transition-colors">
                Cancel
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2 group">
              <h1 className="text-white text-xl font-semibold">{replay.name}</h1>
              <button onClick={() => setEditingName(replay.name)} className="p-1 text-slate-500 hover:text-amber-400 transition-colors opacity-0 group-hover:opacity-100">
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
              {replay.link?.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/)?.[1] ? (
                <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                  <div ref={containerRef} className="absolute inset-0 w-full h-full" />
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 text-slate-500 text-sm">Invalid YouTube link</div>
              )}
            </div>
          </div>

          <div className="xl:col-span-1 space-y-4">
            {!showNoteForm && (
              <button
                onClick={() => {
                  if (playerRef.current?.getCurrentTime)
                    setNewNote(prev => ({
                      ...prev,
                      timing: `${String(Math.floor(playerRef.current.getCurrentTime() / 60)).padStart(2, "0")}:${String(Math.floor(playerRef.current.getCurrentTime() % 60)).padStart(2, "0")}`
                    }))
                  setShowNoteForm(true)
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded-xl text-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Note
              </button>
            )}

            {showNoteForm && (
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold text-sm">{editingIndex !== null ? "Edit Note" : "Add Note"}</h3>
                  <button
                    onClick={() => {
                      setShowNoteForm(false)
                      setEditingIndex(null)
                      setNewNote({ title: "", description: "", timing: "" })
                    }}
                    className="text-slate-400 hover:text-white transition-colors text-xs"
                  >
                    Cancel
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1 block">Timing (MM:SS)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newNote.timing}
                        onChange={e => setNewNote(prev => ({ ...prev, timing: e.target.value }))}
                        placeholder="12:30"
                        className="flex-1 px-3 py-2 rounded-lg border border-slate-600 bg-slate-700/50 text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none text-sm"
                      />
                      <button
                        onClick={() => {
                          if (playerRef.current?.getCurrentTime)
                            setNewNote(prev => ({
                              ...prev,
                              timing: `${String(Math.floor(playerRef.current.getCurrentTime() / 60)).padStart(2, "0")}:${String(Math.floor(playerRef.current.getCurrentTime() % 60)).padStart(2, "0")}`
                            }))
                        }}
                        className="p-2 text-slate-400 hover:text-amber-500 transition-colors border border-slate-600 rounded-lg"
                        title="Get current time"
                      >
                        <Clock className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1 block">Title</label>
                    <input
                      type="text"
                      value={newNote.title}
                      onChange={e => setNewNote(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g. Dragon fight"
                      className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-700/50 text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1 block">Description</label>
                    <textarea
                      value={newNote.description}
                      onChange={e => setNewNote(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="What happened here..."
                      rows={3}
                      className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-700/50 text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none text-sm resize-none"
                    />
                  </div>
                  <button
                    onClick={handleSaveNote}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded-lg text-sm transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
              <h3 className="text-white font-semibold text-sm mb-4">Notes ({(replay.notes || []).length})</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {(replay.notes || []).length === 0 && <p className="text-slate-500 text-sm">No notes yet</p>}
                {[...(replay.notes || [])]
                  .sort((a, b) => a.timing - b.timing)
                  .map((note, i) => (
                    <div key={i} className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-3 group">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <button
                              onClick={() => {
                                if (playerRef.current?.seekTo) playerRef.current.seekTo(note.timing, true)
                              }}
                              className="flex items-center gap-1 text-amber-500 hover:text-amber-400 transition-colors text-xs font-mono shrink-0"
                            >
                              <Play className="w-3 h-3" />
                              {`${String(Math.floor(note.timing / 60)).padStart(2, "0")}:${String(Math.floor(note.timing % 60)).padStart(2, "0")}`}
                            </button>
                            <span className="text-white text-sm font-medium truncate">{note.title}</span>
                          </div>
                          {note.description && <p className="text-slate-400 text-xs leading-relaxed">{note.description}</p>}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 shrink-0">
                          <button
                            onClick={() => {
                              const idx = replay.notes.findIndex(n => n.title === note.title && n.timing === note.timing)
                              setNewNote({
                                title: replay.notes[idx].title,
                                description: replay.notes[idx].description || "",
                                timing: `${String(Math.floor(replay.notes[idx].timing / 60)).padStart(2, "0")}:${String(Math.floor(replay.notes[idx].timing % 60)).padStart(2, "0")}`
                              })
                              setEditingIndex(idx)
                              setShowNoteForm(true)
                            }}
                            className="p-1 text-slate-500 hover:text-amber-400 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteNote(replay.notes.findIndex(n => n.title === note.title && n.timing === note.timing))}
                            className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
