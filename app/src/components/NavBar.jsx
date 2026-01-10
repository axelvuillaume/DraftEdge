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
  { title: "Stats", to: "/stats", icon: BarChart },
  { title: "My Team", to: "/team", icon: Shield }
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
  const [files, setFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({})
  const [dragActive, setDragActive] = useState(false)
  const [uploadType, setUploadType] = useState("scoreboard")
  const inputRef = useRef(null)

  const handleFiles = selectedFiles => {
    if (!selectedFiles || selectedFiles.length === 0) return

    const imageFiles = Array.from(selectedFiles).filter(file => {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image file`)
        return false
      }
      return true
    })

    if (imageFiles.length === 0) return

    const newFiles = [...files, ...imageFiles]
    setFiles(newFiles)

    imageFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = e => {
        setPreviews(prev => [...prev, { file, preview: e.target.result }])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeFile = index => {
    setFiles(prev => prev.filter((_, i) => i !== index))
    setPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const handleDrag = e => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true)
    if (e.type === "dragleave") setDragActive(false)
  }

  const handleDrop = e => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files)
  }

  const handleUpload = async () => {
    if (files.length === 0) return

    setUploading(true)
    setUploadProgress({})

    const initialProgress = {}
    files.forEach((_, i) => (initialProgress[i] = "uploading"))
    setUploadProgress(initialProgress)

    try {
      const uploadPromises = files.map(async (file, index) => {
        try {
          const reader = new FileReader()
          const base64 = await new Promise((resolve, reject) => {
            reader.onload = e => resolve(e.target.result)
            reader.onerror = reject
            reader.readAsDataURL(file)
          })

          const { ok, code } = await api.post(uploadType === "scoreboard" ? "/game/upload-scoreboard" : "/game/upload-advanced-stats", { screenshot: base64, user })

          if (!ok) return toast.error(`Failed to upload ${file.name}: ${code}`)
          setUploadProgress(prev => ({ ...prev, [index]: "success" }))
        } catch (error) {
          return toast.error(`Error uploading ${file.name}: ${error.message}`)
        }
      })

      await Promise.all(uploadPromises)

      setUploading(false)
    } catch (error) {
      toast.error(error.message)
      setUploading(false)
    }
  }

  const handleClose = () => {
    if (uploading) return
    setFiles([])
    setPreviews([])
    setUploadProgress({})
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <div className="p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-2">Upload Screenshots</h2>
        <p className="text-slate-500 text-sm mb-6">Upload your end-game scoreboard screenshots to automatically extract game data. You can upload multiple screenshots at once.</p>

        <div className="flex gap-2 mb-6 bg-slate-100 p-1 rounded-xl">
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              uploadType === "scoreboard" ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"
            }`}
            onClick={() => setUploadType("scoreboard")}
          >
            Scoreboard
          </button>
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              uploadType === "advanced" ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"
            }`}
            onClick={() => setUploadType("advanced")}
          >
            Advanced Stats
          </button>
        </div>

        {previews.length === 0 ? (
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
            <input ref={inputRef} type="file" accept="image/*" multiple onChange={e => handleFiles(e.target.files)} className="hidden" />
            <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 font-medium mb-1">Drop your screenshots here</p>
            <p className="text-slate-400 text-sm">or click to browse (multiple files supported)</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {previews.map((item, index) => {
                const progress = uploadProgress[index]
                const isUploading = progress === "uploading"

                return (
                  <div key={index} className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                    <img src={item.preview} alt={`Preview ${index + 1}`} className="w-full h-auto max-h-48 object-contain bg-slate-100" />
                    {!uploading && (
                      <button onClick={() => removeFile(index)} className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors z-10">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    {isUploading && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      </div>
                    )}
                    <div className="p-3 bg-white border-t border-slate-200">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600 truncate max-w-[150px]" title={item.file.name}>
                          {item.file.name}
                        </span>
                        <span className="text-slate-400">{(item.file.size / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {!uploading && (
              <div
                className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors cursor-pointer ${
                  dragActive ? "border-amber-500 bg-amber-50" : "border-slate-300 hover:border-amber-400 hover:bg-amber-50/50"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
              >
                <input ref={inputRef} type="file" accept="image/*" multiple onChange={e => handleFiles(e.target.files)} className="hidden" />
                <p className="text-slate-500 text-sm">Click or drag to add more screenshots</p>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between items-center mt-6">
          {previews.length > 0 && (
            <span className="text-slate-500 text-sm">
              {previews.length} screenshot{previews.length > 1 ? "s" : ""} selected
            </span>
          )}
          <div className="flex justify-end gap-3 ml-auto">
            <button
              onClick={handleUpload}
              disabled={files.length === 0 || uploading}
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
                  <span>Upload & Analyze {files.length > 0 && `(${files.length})`}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
export default Navbar
