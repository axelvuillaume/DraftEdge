import { useEffect, useState, useRef } from "react"
import { Link, useLocation } from "react-router-dom"
import { LayoutDashboard, Gamepad2, Shield, ImagePlus, Loader2, Upload, X, BarChart, FileText, Check, ChevronDown } from "lucide-react"
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
          <span>Importer une game</span>
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
  const [uploadType, setUploadType] = useState("rofl") // "rofl", "scoreboard", "advanced"
  const inputRef = useRef(null)

  // ROFL specific state
  const [roflConfig, setRoflConfig] = useState({
    team_side: "",
    opponent_name: "",
    name: ""
  })
  const [roflPreview, setRoflPreview] = useState(null) // Données parsées du ROFL
  const [parsing, setParsing] = useState(false)

  const isRoflMode = uploadType === "rofl"
  const acceptedFiles = isRoflMode ? ".rofl" : "image/*"

  const handleFiles = async selectedFiles => {
    if (!selectedFiles || selectedFiles.length === 0) return

    if (isRoflMode) {
      // Mode ROFL : un seul fichier
      const file = selectedFiles[0]
      if (!file.name.endsWith(".rofl")) {
        toast.error("Le fichier doit être un .rofl")
        return
      }

      setFiles([file])
      setPreviews([{ file, preview: null }])

      // Parser le fichier pour preview
      setParsing(true)
      try {
        const formData = new FormData()
        formData.append("replay", file)

        const response = await api.postFormData("/parser/parse", formData)
        if (response.ok && response.data) {
          setRoflPreview(response.data)
          toast.success("Fichier ROFL parsé avec succès")
        } else {
          toast.error(response.error || response.details || "Erreur lors du parsing")
          setFiles([])
          setPreviews([])
        }
      } catch (error) {
        toast.error("Erreur: " + error.message)
        setFiles([])
        setPreviews([])
      } finally {
        setParsing(false)
      }
    } else {
      // Mode screenshots
      const imageFiles = Array.from(selectedFiles).filter(file => {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} n'est pas une image`)
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
  }

  const removeFile = index => {
    setFiles(prev => prev.filter((_, i) => i !== index))
    setPreviews(prev => prev.filter((_, i) => i !== index))
    if (isRoflMode) {
      setRoflPreview(null)
      setRoflConfig({ team_side: "", opponent_name: "", name: "" })
    }
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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleUpload = async () => {
    if (files.length === 0) return

    setUploading(true)
    setUploadProgress({})

    if (isRoflMode) {
      // Upload ROFL
      if (!roflConfig.team_side) {
        toast.error("Sélectionne ton side (Blue/Red)")
        setUploading(false)
        return
      }

      try {
        const formData = new FormData()
        formData.append("replay", files[0])
        formData.append("team_side", roflConfig.team_side)
        formData.append("team_id", user?.team_id || "")
        formData.append("team_name", user?.team_name || "")
        formData.append("opponent_name", roflConfig.opponent_name)
        formData.append("name", roflConfig.name)

        setUploadProgress({ 0: "uploading" })

        const response = await api.postFormData("/parser/import", formData)

        if (response.ok) {
          setUploadProgress({ 0: "success" })
          toast.success("Game importée avec succès!")
          setTimeout(() => {
            handleClose()
            onSuccess?.()
          }, 1000)
        } else {
          toast.error(response.error || response.details || "Erreur lors de l'import")
          setUploadProgress({ 0: "error" })
        }
      } catch (error) {
        toast.error("Erreur: " + error.message)
        setUploadProgress({ 0: "error" })
      } finally {
        setUploading(false)
      }
    } else {
      // Upload screenshots (ancien code)
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

            if (!ok) return toast.error(`Échec upload ${file.name}: ${code}`)
            setUploadProgress(prev => ({ ...prev, [index]: "success" }))
          } catch (error) {
            return toast.error(`Erreur ${file.name}: ${error.message}`)
          }
        })

        await Promise.all(uploadPromises)
      } catch (error) {
        toast.error(error.message)
      } finally {
        setUploading(false)
      }
    }
  }

  const handleClose = () => {
    if (uploading || parsing) return
    setFiles([])
    setPreviews([])
    setUploadProgress({})
    setRoflPreview(null)
    setRoflConfig({ team_side: "", opponent_name: "", name: "" })
    onClose()
  }

  const handleTypeChange = type => {
    if (uploading || parsing) return
    setUploadType(type)
    setFiles([])
    setPreviews([])
    setRoflPreview(null)
    setRoflConfig({ team_side: "", opponent_name: "", name: "" })
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <div className="p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-2">Importer une game</h2>
        <p className="text-slate-500 text-sm mb-6">
          {isRoflMode
            ? "Importe un fichier replay (.rofl) pour extraire automatiquement toutes les stats de la partie."
            : "Upload tes screenshots de fin de game pour extraire les données automatiquement."}
        </p>

        {/* Type selector */}
        <div className="flex gap-2 mb-6 bg-slate-100 p-1 rounded-xl">
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
              uploadType === "rofl" ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"
            }`}
            onClick={() => handleTypeChange("rofl")}
          >
            <FileText className="w-4 h-4" />
            Replay (.rofl)
          </button>
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              uploadType === "scoreboard" ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"
            }`}
            onClick={() => handleTypeChange("scoreboard")}
          >
            Scoreboard
          </button>
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              uploadType === "advanced" ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"
            }`}
            onClick={() => handleTypeChange("advanced")}
          >
            Stats avancées
          </button>
        </div>

        {/* File drop zone */}
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
            <input ref={inputRef} type="file" accept={acceptedFiles} multiple={!isRoflMode} onChange={e => handleFiles(e.target.files)} className="hidden" />
            {isRoflMode ? (
              <>
                <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600 font-medium mb-1">Dépose ton fichier .rofl ici</p>
                <p className="text-slate-400 text-sm">ou clique pour parcourir</p>
                <p className="text-slate-400 text-xs mt-2">📁 Documents/League of Legends/Replays/</p>
              </>
            ) : (
              <>
                <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600 font-medium mb-1">Dépose tes screenshots ici</p>
                <p className="text-slate-400 text-sm">ou clique pour parcourir (plusieurs fichiers)</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* ROFL Preview */}
            {isRoflMode && (
              <div className="space-y-4">
                {/* File info */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-slate-800 font-medium">{files[0]?.name}</p>
                      <p className="text-slate-400 text-sm">{(files[0]?.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  {!uploading && !parsing && (
                    <button onClick={() => removeFile(0)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  )}
                  {parsing && <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />}
                  {uploadProgress[0] === "uploading" && <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />}
                  {uploadProgress[0] === "success" && <Check className="w-5 h-5 text-green-500" />}
                </div>

                {/* ROFL parsed preview */}
                {roflPreview && (
                  <div className="p-4 bg-slate-900 rounded-xl text-white">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-slate-400 text-xs">PATCH</p>
                        <p className="font-mono">{roflPreview.game?.patch}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs">DURÉE</p>
                        <p className="font-mono">
                          {Math.floor(roflPreview.game?.duration / 60)}:{String(roflPreview.game?.duration % 60).padStart(2, "0")}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs">GAME ID</p>
                        <p className="font-mono text-sm">{roflPreview.game?.game_id}</p>
                      </div>
                    </div>

                    {/* Teams preview */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Blue Team */}
                      <div className={`p-3 rounded-lg ${roflPreview.game?.blue_team?.win ? "bg-blue-500/20 border border-blue-500/30" : "bg-slate-800"}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-blue-400 font-semibold text-sm">BLUE TEAM</span>
                          {roflPreview.game?.blue_team?.win && <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded">WIN</span>}
                        </div>
                        <div className="space-y-1">
                          {roflPreview.players
                            ?.filter(p => p.side === "blue")
                            .map((p, i) => (
                              <div key={i} className="flex items-center justify-between text-xs">
                                <span className="text-slate-300">{p.champion}</span>
                                <span className="text-slate-500">
                                  {p.kills}/{p.deaths}/{p.assists}
                                </span>
                              </div>
                            ))}
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-700 text-xs text-slate-400">
                          {roflPreview.game?.blue_team?.kills} kills · {Math.round(roflPreview.game?.blue_team?.gold / 1000)}k gold
                        </div>
                      </div>

                      {/* Red Team */}
                      <div className={`p-3 rounded-lg ${roflPreview.game?.red_team?.win ? "bg-red-500/20 border border-red-500/30" : "bg-slate-800"}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-red-400 font-semibold text-sm">RED TEAM</span>
                          {roflPreview.game?.red_team?.win && <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded">WIN</span>}
                        </div>
                        <div className="space-y-1">
                          {roflPreview.players
                            ?.filter(p => p.side === "red")
                            .map((p, i) => (
                              <div key={i} className="flex items-center justify-between text-xs">
                                <span className="text-slate-300">{p.champion}</span>
                                <span className="text-slate-500">
                                  {p.kills}/{p.deaths}/{p.assists}
                                </span>
                              </div>
                            ))}
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-700 text-xs text-slate-400">
                          {roflPreview.game?.red_team?.kills} kills · {Math.round(roflPreview.game?.red_team?.gold / 1000)}k gold
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ROFL Config form */}
                {roflPreview && (
                  <div className="grid grid-cols-2 gap-4">
                    {/* Side selector */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Ton équipe était *</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setRoflConfig(prev => ({ ...prev, team_side: "blue" }))}
                          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                            roflConfig.team_side === "blue" ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          🔵 Blue
                        </button>
                        <button
                          type="button"
                          onClick={() => setRoflConfig(prev => ({ ...prev, team_side: "red" }))}
                          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                            roflConfig.team_side === "red" ? "bg-red-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          🔴 Red
                        </button>
                      </div>
                    </div>

                    {/* Opponent name */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Équipe adverse</label>
                      <input
                        type="text"
                        value={roflConfig.opponent_name}
                        onChange={e => setRoflConfig(prev => ({ ...prev, opponent_name: e.target.value }))}
                        placeholder="Ex: Team Vitality"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                      />
                    </div>

                    {/* Game name */}
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Nom de la game (optionnel)</label>
                      <input
                        type="text"
                        value={roflConfig.name}
                        onChange={e => setRoflConfig(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Ex: Scrim Week 5 - Game 1"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Screenshots preview (ancien code) */}
            {!isRoflMode && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {previews.map((item, index) => {
                    const progress = uploadProgress[index]
                    const isUploading = progress === "uploading"

                    return (
                      <div key={index} className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                        <img src={item.preview} alt={`Preview ${index + 1}`} className="w-full h-auto max-h-48 object-contain bg-slate-100" />
                        {!uploading && (
                          <button
                            onClick={() => removeFile(index)}
                            className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors z-10"
                          >
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
                    <input ref={inputRef} type="file" accept={acceptedFiles} multiple={!isRoflMode} onChange={e => handleFiles(e.target.files)} className="hidden" />
                    <p className="text-slate-500 text-sm">Clique ou glisse pour ajouter d'autres screenshots</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center mt-6">
          {previews.length > 0 && !isRoflMode && (
            <span className="text-slate-500 text-sm">
              {previews.length} screenshot{previews.length > 1 ? "s" : ""} sélectionné{previews.length > 1 ? "s" : ""}
            </span>
          )}
          <div className="flex justify-end gap-3 ml-auto">
            <button
              onClick={handleClose}
              disabled={uploading || parsing}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium rounded-xl transition-all disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={handleUpload}
              disabled={files.length === 0 || uploading || parsing || (isRoflMode && !roflConfig.team_side)}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:from-slate-300 disabled:to-slate-400 text-white font-semibold rounded-xl transition-all duration-200 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Import en cours...</span>
                </>
              ) : parsing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analyse...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>{isRoflMode ? "Importer la game" : `Upload ${files.length > 0 ? `(${files.length})` : ""}`}</span>
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
