import { useEffect, useState, useRef } from "react"
import { Link, useLocation } from "react-router-dom"
import { LayoutDashboard, Gamepad2, Shield, ImagePlus, Loader2, Upload, X, BarChart } from "lucide-react"
import useStore from "@/services/store"
import api from "@/services/api"
import { toast } from "react-hot-toast"
import Modal from "@/components/modal"

const MENU = [
  { title: "Dashboard", to: "/", icon: LayoutDashboard },
  { title: "Games", to: "/games", icon: Gamepad2 },
  { title: "Stats", to: "/stats", icon: BarChart }
]

const Navbar = () => {
  const [selected, setSelected] = useState(0)
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const { user } = useStore()
  useEffect(() => {
    const index = MENU.findIndex(e => {
      if (e.to === "/") return location.pathname === "/"
      return location.pathname.includes(e.to)
    })
    setSelected(index >= 0 ? index : 0)
  }, [location])

  return (
    <div className="h-screen w-64 bg-slate-900 border-r border-slate-700/50 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-slate-900" />
          </div>
          <div>
            <span className="text-white font-bold text-lg tracking-tight">DraftEdge</span>
            <p className="text-slate-500 text-xs">Scrim Tracker</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-3 px-3">Menu</p>
        <div className="space-y-1">
          {MENU.map((menu, index) => {
            const Icon = menu.icon
            const isActive = selected === index

            return (
              <Link
                to={menu.to}
                key={menu.title}
                className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-3 transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-amber-500/20 to-amber-600/10 text-amber-400 border border-amber-500/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                }`}
                onClick={() => setSelected(index)}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-amber-400" : ""}`} />
                <span className="text-sm font-medium">{menu.title}</span>
                {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-500" />}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700/50">
        <button
          onClick={() => setIsOpen(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-900 font-semibold text-sm rounded-xl transition-all duration-200"
        >
          <ImagePlus className="w-4 h-4" />
          <span>Ajouter des screens</span>
        </button>
      </div>

      <div className="p-4 border-t border-slate-700/50">
        <div className="px-3 py-2 rounded-lg bg-slate-800/50">
          <p className="text-slate-500 text-xs">Version 1.0.0</p>
        </div>
      </div>
      <UploadModal isOpen={isOpen} onClose={() => setIsOpen(false)} user={user} onSuccess={() => setIsOpen(false)} />
    </div>
  )
}
function UploadModal({ isOpen, onClose, user, onSuccess }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef(null)

  const handleFile = selectedFile => {
    if (!selectedFile) return

    if (!selectedFile.type.startsWith("image/")) {
      toast.error("Please select an image file")
      return
    }

    setFile(selectedFile)

    // Create preview
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target.result)
    reader.readAsDataURL(selectedFile)
  }

  const handleDrag = e => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = e => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    try {
      const reader = new FileReader()
      reader.onload = async e => {
        const base64 = e.target.result
        const { ok, code, message } = await api.post("/game/upload-screenshot", { screenshot: base64, user })

        if (!ok) {
          toast.error(message || code || "Upload failed")
          setUploading(false)
          return
        }

        toast.success("Screenshot analyzed successfully!")
        setFile(null)
        setPreview(null)
        setUploading(false)
        onSuccess()
      }
      reader.readAsDataURL(file)
    } catch (error) {
      toast.error(error.message)
      setUploading(false)
    }
  }

  const handleClose = () => {
    if (uploading) return
    setFile(null)
    setPreview(null)
    onClose()
  }

  const removeFile = () => {
    setFile(null)
    setPreview(null)
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-lg w-full">
      <div className="p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-2">Upload Screenshot</h2>
        <p className="text-slate-500 text-sm mb-6">Upload your end-game scoreboard screenshot to automatically extract game data.</p>

        {!preview ? (
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
              dragActive ? "border-amber-500 bg-amber-50" : "border-slate-300 hover:border-amber-400 hover:bg-amber-50/50"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input ref={inputRef} type="file" accept="image/*" onChange={e => handleFile(e.target.files?.[0])} className="hidden" />
            <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 font-medium mb-1">Drop your screenshot here</p>
            <p className="text-slate-400 text-sm">or click to browse</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative rounded-xl overflow-hidden border border-slate-200">
              <img src={preview} alt="Preview" className="w-full h-auto max-h-64 object-contain bg-slate-100" />
              {!uploading && (
                <button onClick={removeFile} className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 truncate max-w-[200px]">{file?.name}</span>
              <span className="text-slate-400">{(file?.size / 1024 / 1024).toFixed(2)} MB</span>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={handleClose} disabled={uploading} className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:from-slate-300 disabled:to-slate-400 text-white font-semibold rounded-xl transition-all duration-200 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Upload & Analyze</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}
export default Navbar
