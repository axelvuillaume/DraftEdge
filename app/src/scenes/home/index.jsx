import React, { useState, useRef } from "react"
import api from "@/services/api"
import useStore from "@/services/store"
import toast from "react-hot-toast"
export default function Home() {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef(null)
  const { user } = useStore()

  const handleFile = (selectedFile) => {
    if (!selectedFile) return
    setFile(selectedFile)
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target.result)
    reader.readAsDataURL(selectedFile)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile?.type.startsWith("image/")) {
      handleFile(droppedFile)
    }
  }

  const handleUpload = async () => {
    if (!preview) return
    setLoading(true)
    try {
      const { ok, code } = await api.post("/game/upload-screenshot", { screenshot: preview, user: user })
      if (!ok) return toast.error(code)
      setFile(null)
      setPreview(null)
      toast.success("Upload success")
    } catch (err) {
      toast.error(err.message)
    }
    setLoading(false)
  }

  const handleRemove = () => {
    setFile(null)
    setPreview(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Upload Screenshot</h1>
          <p className="text-slate-400">Glissez-déposez ou sélectionnez une image</p>
        </div>

        <div
          className={`
            relative border-2 border-dashed rounded-2xl p-8 transition-all duration-300 cursor-pointer
            ${isDragging 
              ? "border-blue-400 bg-blue-500/10" 
              : preview 
                ? "border-slate-600 bg-slate-800/50" 
                : "border-slate-600 bg-slate-800/30 hover:border-slate-500 hover:bg-slate-800/50"
            }
          `}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !preview && inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files[0])}
          />

          {preview ? (
            <div className="space-y-4">
              <div className="relative rounded-xl overflow-hidden bg-slate-900">
                <img src={preview} alt="Preview" className="w-full h-64 object-contain" />
                <button
                  onClick={(e) => { e.stopPropagation(); handleRemove() }}
                  className="absolute top-3 right-3 w-8 h-8 bg-red-500/80 hover:bg-red-500 rounded-full flex items-center justify-center transition-colors"
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-slate-400 text-center truncate">{file?.name}</p>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-700/50 flex items-center justify-center">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-slate-300 font-medium mb-1">Cliquez ou glissez une image ici</p>
              <p className="text-sm text-slate-500">PNG, JPG, GIF jusqu'à 10MB</p>
            </div>
          )}
        </div>

        {preview && (
          <button
            onClick={handleUpload}
            disabled={loading}
            className={`
              w-full mt-6 py-4 rounded-xl font-semibold text-white transition-all duration-300
              ${loading 
                ? "bg-slate-600 cursor-not-allowed" 
                : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
              }
            `}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Envoi en cours...
              </span>
            ) : (
              "Envoyer le screenshot"
            )}
          </button>
        )}
      </div>
    </div>
  )
}
