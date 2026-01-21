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
    <div className="h-screen w-64 bg-slate-900 border-r border-slate-700/50 flex flex-col relative z-40">
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
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef(null)

  // ROFL specific state
  const [roflConfig, setRoflConfig] = useState({
    team_side: "",
    opponent_name: "",
    name: ""
  })
  const [roflPreview, setRoflPreview] = useState(null)
  const [parsing, setParsing] = useState(false)

  const acceptedFiles = ".rofl"

  const handleFiles = async selectedFiles => {
    if (!selectedFiles || selectedFiles.length === 0) return

    const selectedFile = selectedFiles[0]
    if (!selectedFile.name.endsWith(".rofl")) {
      toast.error("Le fichier doit être un .rofl")
      return
    }

    setFile(selectedFile)

    // Parser le fichier pour preview
    setParsing(true)
    try {
      const formData = new FormData()
      formData.append("replay", selectedFile)

      const response = await api.postFormData("/parser/parse", formData)
      if (response.ok && response.data) {
        setRoflPreview(response.data)
        toast.success("Fichier ROFL parsé avec succès")
      } else {
        toast.error(response.error || response.details || "Erreur lors du parsing")
        setFile(null)
      }
    } catch (error) {
      toast.error("Erreur: " + error.message)
      setFile(null)
    } finally {
      setParsing(false)
    }
  }

  const removeFile = () => {
    setFile(null)
    setRoflPreview(null)
    setRoflConfig({ team_side: "", opponent_name: "", name: "" })
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
    if (!file) return

    setUploading(true)
    setUploadProgress("uploading")

    if (!roflConfig.team_side) {
      toast.error("Sélectionne ton side (Blue/Red)")
      setUploading(false)
      return
    }

    try {
      const formData = new FormData()
      formData.append("replay", file)
      formData.append("team_side", roflConfig.team_side)
      formData.append("team_id", user?.team_id || "")
      formData.append("team_name", user?.team_name || "")
      formData.append("opponent_name", roflConfig.opponent_name)
      formData.append("name", roflConfig.name)

      const response = await api.postFormData("/parser/import", formData)

      if (response.ok) {
        setUploadProgress("success")
        toast.success("Game importée avec succès!")
        setTimeout(() => {
          handleClose()
          onSuccess?.()
        }, 1000)
      } else {
        toast.error(response.error || response.details || "Erreur lors de l'import")
        setUploadProgress("error")
      }
    } catch (error) {
      toast.error("Erreur: " + error.message)
      setUploadProgress("error")
    } finally {
      setUploading(false)
    }
  }

  const handleClose = () => {
    if (uploading || parsing) return
    setFile(null)
    setUploadProgress(null)
    setRoflPreview(null)
    setRoflConfig({ team_side: "", opponent_name: "", name: "" })
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <div className="p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-2">Importer une game</h2>
        <p className="text-slate-500 text-sm mb-6">Importe un fichier replay (.rofl) pour extraire automatiquement toutes les stats de la partie.</p>

        {/* File drop zone */}
        {!file ? (
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
            <input ref={inputRef} type="file" accept={acceptedFiles} onChange={e => handleFiles(e.target.files)} className="hidden" />
            <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 font-medium mb-1">Dépose ton fichier .rofl ici</p>
            <p className="text-slate-400 text-sm">ou clique pour parcourir</p>
            <p className="text-slate-400 text-xs mt-2">📁 Documents/League of Legends/Replays/</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* File info */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-slate-800 font-medium">{file.name}</p>
                  <p className="text-slate-400 text-sm">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              {!uploading && !parsing && (
                <button onClick={removeFile} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              )}
              {parsing && <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />}
              {uploadProgress === "uploading" && <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />}
              {uploadProgress === "success" && <Check className="w-5 h-5 text-green-500" />}
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

        {/* Footer */}
        <div className="flex justify-between items-center mt-6">
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
              disabled={!file || uploading || parsing || !roflConfig.team_side}
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
                  <span>Importer la game</span>
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
