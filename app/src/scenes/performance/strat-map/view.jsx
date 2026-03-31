import { useEffect, useRef, useState, useCallback } from "react"
import { useParams } from "react-router-dom"
import { toast } from "react-hot-toast"
import { IoArrowUndo, IoArrowRedo, IoRefresh, IoDownload } from "react-icons/io5"
import { FaMousePointer, FaPen, FaArrowRight, FaEraser, FaEye, FaSearchPlus } from "react-icons/fa"
import api from "@/services/api"
import DebounceInput from "@/components/debounceInput"
import OpponentDropdown from "@/components/OpponentDropdown"
import {
  NormalDrakeIcon,
  OceanDrakeIcon,
  MountainDrakeIcon,
  FireDrakeIcon,
  AirDrakeIcon,
  HextechDrakeIcon,
  ChemtechDrakeIcon,
  Nash1Icon,
  Nash2Icon,
  Nash3Icon
} from "@/components/icons/drake-icons"

const MAP_TYPES = [
  { id: "default", label: "Default", src: "/map/map.jpeg", icon: NormalDrakeIcon, color: "#ffffff" },
  { id: "ocean", label: "Ocean", src: "/map/OceanMap.jpeg", icon: OceanDrakeIcon, color: "#00ffce" },
  { id: "mountain", label: "Mountain", src: "/map/mountainDrake.jpeg", icon: MountainDrakeIcon, color: "#9b7342" },
  { id: "fire", label: "Infernal", src: "/map/FireDRake.jpeg", icon: FireDrakeIcon, color: "#e59535" },
  { id: "air", label: "Cloud", src: "/map/AirDrake.jpeg", icon: AirDrakeIcon, color: "#74bedd" },
  { id: "hextech", label: "Hextech", src: "/map/HextechMap.jpeg", icon: HextechDrakeIcon, color: "#00c3ff" },
  { id: "chemtech", label: "Chemtech", src: "/map/map.jpeg", icon: ChemtechDrakeIcon, color: "#73e000" }
]

const NASH_OPTIONS = [
  { id: "nash1", src: "/map/nash1.png", icon: Nash1Icon, color: "#a855f7" },
  { id: "nash2", src: "/map/nash2.png", icon: Nash2Icon, color: "#a855f7" },
  { id: "nash3", src: "/map/nash3.png", icon: Nash3Icon, color: "#a855f7" }
]

const ROLES = [
  { id: "top", label: "T", icon: "/roles/top.png" },
  { id: "jungle", label: "J", icon: "/roles/jungle.png" },
  { id: "mid", label: "M", icon: "/roles/mid.png" },
  { id: "bottom", label: "A", icon: "/roles/bottom.png" },
  { id: "support", label: "S", icon: "/roles/support.png" }
]

const INITIAL_ELEMENTS = [
  { type: "role", roleId: "top", side: "blue", x: 95, y: 260 },
  { type: "role", roleId: "jungle", side: "blue", x: 220, y: 400 },
  { type: "role", roleId: "mid", side: "blue", x: 300, y: 380 },
  { type: "role", roleId: "bottom", side: "blue", x: 500, y: 600 },
  { type: "role", roleId: "support", side: "blue", x: 460, y: 620 },
  { type: "role", roleId: "top", side: "red", x: 220, y: 120 },
  { type: "role", roleId: "jungle", side: "red", x: 500, y: 320 },
  { type: "role", roleId: "mid", side: "red", x: 420, y: 340 },
  { type: "role", roleId: "bottom", side: "red", x: 625, y: 460 },
  { type: "role", roleId: "support", side: "red", x: 600, y: 480 }
]

const WARD_TYPES = [
  { id: "ward_green", label: "Ward", color: "#22c55e" },
  { id: "ward_pink", label: "Control", color: "#ec4899" },
  { id: "ward_blue", label: "Blue Trinket", color: "#3b82f6" }
]

const COLORS = ["#ef4444", "#3b82f6", "#eab308"]

const MAP_SIZE = 720
const ZOOM_SCALE = 4

export default function View() {
  const { id } = useParams()
  const canvasRef = useRef(null)
  const overlayCanvasRef = useRef(null)
  const containerRef = useRef(null)
  const saveTimerRef = useRef(null)
  const [loaded, setLoaded] = useState(false)
  const [name, setName] = useState("Untitled")
  const [opponentName, setOpponentName] = useState("")
  const [tool, setTool] = useState("select")
  const [color, setColor] = useState("#ef4444")
  const [brushSize] = useState(3)
  const [wardType, setWardType] = useState("ward_green")
  const [elements, setElements] = useState(INITIAL_ELEMENTS)
  const [drawings, setDrawings] = useState([])
  const [history, setHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentStroke, setCurrentStroke] = useState(null)
  const [arrowStart, setArrowStart] = useState(null)
  const [dragTarget, setDragTarget] = useState(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState({ active: false, x: 0, y: 0 })
  const [mapType, setMapType] = useState("default")
  const [nashType, setNashType] = useState("none")
  const [mapImage, setMapImage] = useState(null)
  const [nashImage, setNashImage] = useState(null)
  const [roleImages, setRoleImages] = useState({})
  const [note, setNote] = useState("")
  const [paletteDrag, setPaletteDrag] = useState(null)

  const fetchMap = async () => {
    try {
      const { ok, data, code } = await api.get(`/strat-map/${id}`)
      if (!ok) return toast.error(code || "Failed to load map")
      setName(data.name || "Untitled")
      if (data.elements?.length) setElements(data.elements)
      if (data.drawings?.length) setDrawings(data.drawings)
      if (data.map_type) setMapType(data.map_type)
      if (data.nash_type) setNashType(data.nash_type)
      if (data.opponent_name) setOpponentName(data.opponent_name)
      if (data.note) setNote(data.note)
      setLoaded(true)
    } catch (error) {
      toast.error(error.code || "Failed to load map")
    }
  }

  useEffect(() => {
    if (id) fetchMap()
  }, [id])

  const saveToApi = useCallback(
    (newElements, newDrawings, newMapType, newNashType) => {
      if (!loaded) return
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(async () => {
        try {
          const { ok, code } = await api.put(`/strat-map/${id}`, {
            elements: newElements,
            drawings: newDrawings,
            map_type: newMapType,
            nash_type: newNashType
          })
          if (!ok) toast.error(code || "Failed to save map")
        } catch (error) {
          toast.error(error.code || "Failed to save map")
        }
      }, 800)
    },
    [id, loaded]
  )

  const saveName = async newName => {
    try {
      const { ok, code } = await api.put(`/strat-map/${id}`, { name: newName })
      if (!ok) toast.error(code || "Failed to save name")
    } catch (error) {
      toast.error(error.code || "Failed to save name")
    }
  }

  const saveNote = async newNote => {
    try {
      const { ok, code } = await api.put(`/strat-map/${id}`, { note: newNote })
      if (!ok) toast.error(code || "Failed to save note")
    } catch (error) {
      toast.error(error.code || "Failed to save note")
    }
  }

  useEffect(() => {
    if (!paletteDrag) return
    const clear = () => setPaletteDrag(null)
    document.addEventListener("mouseup", clear)
    return () => document.removeEventListener("mouseup", clear)
  }, [paletteDrag])

  useEffect(() => {
    const img = new Image()
    img.src = MAP_TYPES.find(m => m.id === mapType).src
    img.onload = () => setMapImage(img)
  }, [mapType])

  useEffect(() => {
    const nash = NASH_OPTIONS.find(n => n.id === nashType)
    if (!nash?.src) return setNashImage(null)
    const img = new Image()
    img.src = nash.src
    img.onload = () => setNashImage(img)
  }, [nashType])

  useEffect(() => {
    for (const role of ROLES) {
      const img = new Image()
      img.src = role.icon
      img.onload = () => setRoleImages(prev => ({ ...prev, [role.id]: img }))
    }
  }, [])

  const saveToHistory = useCallback(
    (newElements, newDrawings) => {
      const state = { elements: JSON.parse(JSON.stringify(newElements)), drawings: JSON.parse(JSON.stringify(newDrawings)) }
      const newHistory = history.slice(0, historyIndex + 1)
      newHistory.push(state)
      setHistory(newHistory)
      setHistoryIndex(newHistory.length - 1)
      saveToApi(newElements, newDrawings, mapType, nashType)
    },
    [history, historyIndex, saveToApi, mapType, nashType]
  )

  const getPos = useCallback(
    e => {
      const canvas = canvasRef.current
      if (!canvas) return { x: 0, y: 0 }
      const rect = canvas.getBoundingClientRect()
      const scaleX = MAP_SIZE / rect.width
      const scaleY = MAP_SIZE / rect.height
      let x = (e.clientX - rect.left) * scaleX
      let y = (e.clientY - rect.top) * scaleY
      if (zoom.active) {
        const zoomScale = ZOOM_SCALE
        x = (x - (MAP_SIZE / 2 - zoom.x * zoomScale)) / zoomScale
        y = (y - (MAP_SIZE / 2 - zoom.y * zoomScale)) / zoomScale
      }
      return { x, y }
    },
    [zoom]
  )

  const findElementAt = useCallback(
    pos => {
      for (let i = elements.length - 1; i >= 0; i--) {
        const el = elements[i]
        const size = el.type === "role" ? 36 : 20
        const half = size / 2
        if (pos.x >= el.x - half && pos.x <= el.x + half && pos.y >= el.y - half && pos.y <= el.y + half) {
          return i
        }
      }
      return -1
    },
    [elements]
  )

  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !mapImage) return
    const ctx = canvas.getContext("2d")
    ctx.clearRect(0, 0, MAP_SIZE, MAP_SIZE)

    ctx.save()
    if (zoom.active) {
      const scale = ZOOM_SCALE
      ctx.translate(MAP_SIZE / 2 - zoom.x * scale, MAP_SIZE / 2 - zoom.y * scale)
      ctx.scale(scale, scale)
    }

    ctx.drawImage(mapImage, 0, 0, MAP_SIZE, MAP_SIZE)

    if (nashImage) {
      ctx.drawImage(nashImage, 0, 0, MAP_SIZE, MAP_SIZE)
    }

    const s = zoom.active ? 0.4 : 1

    for (const stroke of drawings) {
      if (stroke.type === "arrow") {
        drawArrow(ctx, stroke.from.x, stroke.from.y, stroke.to.x, stroke.to.y, stroke.color, stroke.size * s)
        continue
      }
      if (stroke.points.length < 2) continue
      ctx.beginPath()
      ctx.strokeStyle = stroke.color
      ctx.lineWidth = stroke.size * s
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
      }
      ctx.stroke()
    }

    for (const el of elements) {
      if (el.type === "role") {
        const img = roleImages[el.roleId]
        const r = 18 * s
        const iconSize = 24 * s
        ctx.beginPath()
        ctx.arc(el.x, el.y, r, 0, Math.PI * 2)
        ctx.fillStyle = el.side === "red" ? "#991b1b" : "#1e3a5f"
        ctx.fill()
        ctx.strokeStyle = el.side === "red" ? "#ef4444" : "#3b82f6"
        ctx.lineWidth = 2.5 * s
        ctx.stroke()
        if (img) {
          ctx.drawImage(img, el.x - iconSize / 2, el.y - iconSize / 2, iconSize, iconSize)
        }
      }
      if (el.type === "ward") {
        const wardInfo = WARD_TYPES.find(w => w.id === el.wardType)
        const wardColor = wardInfo?.color || "#22c55e"
        ctx.beginPath()
        ctx.arc(el.x, el.y, 35, 0, Math.PI * 2)
        ctx.fillStyle = wardColor + "35"
        ctx.fill()
        ctx.strokeStyle = wardColor + "70"
        ctx.lineWidth = 1 * s
        ctx.setLineDash([4 * s, 4 * s])
        ctx.stroke()
        ctx.setLineDash([])
        ctx.beginPath()
        ctx.arc(el.x, el.y, 6 * s, 0, Math.PI * 2)
        ctx.fillStyle = wardColor
        ctx.fill()
        ctx.strokeStyle = "#000"
        ctx.lineWidth = 1.5 * s
        ctx.stroke()
      }
    }
    ctx.restore()
  }, [mapImage, nashImage, drawings, elements, roleImages, zoom])

  const renderOverlay = useCallback(() => {
    const canvas = overlayCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    ctx.clearRect(0, 0, MAP_SIZE, MAP_SIZE)

    ctx.save()
    if (zoom.active) {
      const scale = ZOOM_SCALE
      ctx.translate(MAP_SIZE / 2 - zoom.x * scale, MAP_SIZE / 2 - zoom.y * scale)
      ctx.scale(scale, scale)
    }

    if (currentStroke && currentStroke.points.length > 1) {
      ctx.beginPath()
      ctx.strokeStyle = currentStroke.color
      ctx.lineWidth = currentStroke.size * (zoom.active ? 0.4 : 1)
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      ctx.moveTo(currentStroke.points[0].x, currentStroke.points[0].y)
      for (let i = 1; i < currentStroke.points.length; i++) {
        ctx.lineTo(currentStroke.points[i].x, currentStroke.points[i].y)
      }
      ctx.stroke()
    }
    ctx.restore()
  }, [currentStroke, zoom])

  useEffect(() => {
    render()
  }, [render])
  useEffect(() => {
    renderOverlay()
  }, [renderOverlay])

  function drawArrow(ctx, fromX, fromY, toX, toY, strokeColor, size) {
    const headLen = 12 + size * 2
    const angle = Math.atan2(toY - fromY, toX - fromX)
    ctx.beginPath()
    ctx.strokeStyle = strokeColor
    ctx.lineWidth = size
    ctx.lineCap = "round"
    ctx.moveTo(fromX, fromY)
    ctx.lineTo(toX, toY)
    ctx.stroke()
    ctx.beginPath()
    ctx.fillStyle = strokeColor
    ctx.moveTo(toX, toY)
    ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 6), toY - headLen * Math.sin(angle - Math.PI / 6))
    ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), toY - headLen * Math.sin(angle + Math.PI / 6))
    ctx.closePath()
    ctx.fill()
  }

  const handleMouseDown = e => {
    const pos = getPos(e)

    if (paletteDrag) return

    if (tool === "loupe") {
      if (zoom.active) return setZoom({ active: false, x: 0, y: 0 })
      setZoom({ active: true, x: pos.x, y: pos.y })
      setTool("draw")
      return
    }

    if (tool !== "eraser") {
      const idx = findElementAt(pos)
      if (idx >= 0) {
        setDragTarget(idx)
        setDragOffset({ x: pos.x - elements[idx].x, y: pos.y - elements[idx].y })
        return
      }
    }

    if (tool === "select") return

    if (tool === "draw") {
      setIsDrawing(true)
      setCurrentStroke({ color, size: brushSize, points: [pos] })
      return
    }

    if (tool === "arrow") {
      setArrowStart(pos)
      return
    }

    if (tool === "ward") {
      const newEl = { type: "ward", wardType, x: pos.x, y: pos.y }
      const newElements = [...elements, newEl]
      setElements(newElements)
      saveToHistory(newElements, drawings)
      return
    }

    if (tool === "eraser") {
      const idx = findElementAt(pos)
      if (idx >= 0) {
        const newElements = elements.filter((_, i) => i !== idx)
        setElements(newElements)
        saveToHistory(newElements, drawings)
        return
      }
      const newDrawings = drawings.filter(stroke => {
        if (stroke.type === "arrow") return distToSegment(pos, stroke.from, stroke.to) > 15
        return !stroke.points.some(p => Math.hypot(p.x - pos.x, p.y - pos.y) < 15)
      })
      if (newDrawings.length !== drawings.length) {
        setDrawings(newDrawings)
        saveToHistory(elements, newDrawings)
      }
    }
  }

  const handleMouseMove = e => {
    const pos = getPos(e)

    if (dragTarget !== null) {
      const newElements = [...elements]
      newElements[dragTarget] = { ...newElements[dragTarget], x: pos.x - dragOffset.x, y: pos.y - dragOffset.y }
      setElements(newElements)
      return
    }

    if (tool === "draw" && isDrawing && currentStroke) {
      setCurrentStroke(prev => ({ ...prev, points: [...prev.points, pos] }))
      return
    }

    if (tool === "arrow" && arrowStart) {
      const canvas = overlayCanvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext("2d")
      ctx.clearRect(0, 0, MAP_SIZE, MAP_SIZE)
      ctx.save()
      if (zoom.active) {
        const scale = ZOOM_SCALE
        ctx.translate(MAP_SIZE / 2 - zoom.x * scale, MAP_SIZE / 2 - zoom.y * scale)
        ctx.scale(scale, scale)
      }
      drawArrow(ctx, arrowStart.x, arrowStart.y, pos.x, pos.y, color, brushSize * (zoom.active ? 0.4 : 1))
      ctx.restore()
    }
  }

  const handleMouseUp = e => {
    const pos = getPos(e)

    if (paletteDrag) {
      const idx = elements.findIndex(el => el.type === "role" && el.roleId === paletteDrag.roleId && el.side === paletteDrag.side)
      if (idx >= 0) {
        const newElements = [...elements]
        newElements[idx] = { ...newElements[idx], x: pos.x, y: pos.y }
        setElements(newElements)
        saveToHistory(newElements, drawings)
      }
      setPaletteDrag(null)
      return
    }

    if (dragTarget !== null) {
      saveToHistory(elements, drawings)
      setDragTarget(null)
      return
    }

    if (tool === "draw" && isDrawing && currentStroke) {
      const newDrawings = [...drawings, currentStroke]
      setDrawings(newDrawings)
      saveToHistory(elements, newDrawings)
      setIsDrawing(false)
      setCurrentStroke(null)
      return
    }

    if (tool === "arrow" && arrowStart) {
      const newDrawings = [...drawings, { type: "arrow", from: arrowStart, to: pos, color, size: brushSize }]
      setDrawings(newDrawings)
      saveToHistory(elements, newDrawings)
      setArrowStart(null)
      const canvas = overlayCanvasRef.current
      if (canvas) canvas.getContext("2d").clearRect(0, 0, MAP_SIZE, MAP_SIZE)
    }
  }

  const handleMapTypeChange = newType => {
    setMapType(newType)
    saveToApi(elements, drawings, newType, nashType)
  }

  const handleNashTypeChange = newType => {
    setNashType(newType)
    saveToApi(elements, drawings, mapType, newType)
  }

  const undo = () => {
    if (historyIndex <= 0) return
    const newIndex = historyIndex - 1
    setHistoryIndex(newIndex)
    const state = history[newIndex]
    const newEls = JSON.parse(JSON.stringify(state.elements))
    const newDrw = JSON.parse(JSON.stringify(state.drawings))
    setElements(newEls)
    setDrawings(newDrw)
    saveToApi(newEls, newDrw, mapType, nashType)
  }

  const redo = () => {
    if (historyIndex >= history.length - 1) return
    const newIndex = historyIndex + 1
    setHistoryIndex(newIndex)
    const state = history[newIndex]
    const newEls = JSON.parse(JSON.stringify(state.elements))
    const newDrw = JSON.parse(JSON.stringify(state.drawings))
    setElements(newEls)
    setDrawings(newDrw)
    saveToApi(newEls, newDrw, mapType, nashType)
  }

  const clearAll = () => {
    setElements(INITIAL_ELEMENTS)
    setDrawings([])
    saveToHistory(INITIAL_ELEMENTS, [])
  }

  const exportImage = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement("a")
    link.download = `${name || "map-strategy"}.png`
    link.href = canvas.toDataURL("image/png")
    link.click()
  }

  useEffect(() => {
    const handler = e => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "z") {
          e.preventDefault()
          undo()
        }
        if (e.key === "y") {
          e.preventDefault()
          redo()
        }
      }
      if (!e.ctrlKey && !e.metaKey) {
        if (e.key === "z") setTool("select")
        if (e.key === "e") setTool("draw")
        if (e.key === "r") setTool("arrow")
        if (e.key === "t") setTool("ward")
        if (e.key === "y") setTool("eraser")
        if (e.key === "u") setTool("loupe")
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [historyIndex, history])

  return (
    <div className="flex bg-slate-900 text-white" style={{ height: "calc(100vh - 190px)" }}>
      <div className="w-12 flex-shrink-0 border-r border-slate-700 bg-slate-800 flex flex-col items-center py-3 gap-1">
        <button
          onClick={() => setTool("select")}
          className={`relative p-2 rounded transition-colors ${tool === "select" ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-600"}`}
        >
          <FaMousePointer size={16} />
          <span className="absolute -bottom-0.5 -right-0.5 text-[8px] text-slate-500 leading-none">Z</span>
        </button>

        <button
          onClick={() => setTool("arrow")}
          className={`relative p-2 rounded transition-colors ${tool === "arrow" ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-600"}`}
        >
          <FaArrowRight size={16} />
          <span className="absolute -bottom-0.5 -right-0.5 text-[8px] text-slate-500 leading-none">R</span>
        </button>

        <button
          onClick={() => setTool("draw")}
          className={`relative p-2 rounded transition-colors ${tool === "draw" ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-600"}`}
        >
          <FaPen size={16} />
          <span className="absolute -bottom-0.5 -right-0.5 text-[8px] text-slate-500 leading-none">E</span>
        </button>
        {COLORS.map(c => (
          <button
            key={c}
            onClick={() => {
              setColor(c)
              setTool("draw")
            }}
            className={`w-5 h-5 rounded-full border-2 transition-transform ${color === c && tool === "draw" ? "border-white scale-110" : "border-slate-600"}`}
            style={{ backgroundColor: c }}
          />
        ))}

        <button
          onClick={() => setTool("ward")}
          className={`relative p-2 rounded transition-colors mt-1 ${tool === "ward" ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-600"}`}
        >
          <FaEye size={16} />
          <span className="absolute -bottom-0.5 -right-0.5 text-[8px] text-slate-500 leading-none">T</span>
        </button>
        {WARD_TYPES.map(w => (
          <button
            key={w.id}
            onClick={() => {
              setWardType(w.id)
              setTool("ward")
            }}
            title={w.label}
            className={`w-5 h-5 rounded-full border-2 transition-transform ${wardType === w.id && tool === "ward" ? "border-white scale-110" : "border-slate-600"}`}
            style={{ backgroundColor: w.color }}
          />
        ))}

        <button
          onClick={() => setTool("eraser")}
          className={`relative p-2 rounded transition-colors mt-1 ${tool === "eraser" ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-600"}`}
        >
          <FaEraser size={16} />
          <span className="absolute -bottom-0.5 -right-0.5 text-[8px] text-slate-500 leading-none">Y</span>
        </button>

        <button
          onClick={() => {
            setTool("loupe")
            if (zoom.active) setZoom({ active: false, x: 0, y: 0 })
          }}
          className={`relative p-2 rounded transition-colors mt-1 ${tool === "loupe" ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-600"}`}
        >
          <FaSearchPlus size={16} />
          <span className="absolute -bottom-0.5 -right-0.5 text-[8px] text-slate-500 leading-none">U</span>
        </button>

        <div className="flex-1" />

        <button onClick={undo} title="⌘Z" className="p-2 rounded text-slate-300 hover:bg-slate-600 transition-colors">
          <IoArrowUndo size={16} />
        </button>
        <button onClick={redo} title="⌘Y" className="p-2 rounded text-slate-300 hover:bg-slate-600 transition-colors">
          <IoArrowRedo size={16} />
        </button>
        <button onClick={clearAll} className="p-2 rounded text-orange-400 hover:bg-orange-900/30 transition-colors">
          <IoRefresh size={16} />
        </button>
        <button onClick={exportImage} className="p-2 rounded text-emerald-400 hover:bg-emerald-900/30 transition-colors">
          <IoDownload size={16} />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        <div ref={containerRef} className="relative aspect-square h-full">
          <canvas ref={canvasRef} width={MAP_SIZE} height={MAP_SIZE} className="absolute inset-0 w-full h-full rounded-lg" />
          <canvas
            ref={overlayCanvasRef}
            width={MAP_SIZE}
            height={MAP_SIZE}
            className="absolute inset-0 w-full h-full rounded-lg"
            style={{ cursor: paletteDrag ? "copy" : tool === "select" ? "default" : "crosshair" }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>
      </div>

      {zoom.active && (
        <div className="w-14 flex-shrink-0 border-l border-slate-700 bg-slate-800/50 flex flex-col items-center py-3 gap-1">
          <span className="text-[10px] text-blue-400 font-bold mb-1">BLUE</span>
          {ROLES.map(role => (
            <div
              key={`pal-blue-${role.id}`}
              onMouseDown={e => {
                e.preventDefault()
                setPaletteDrag({ roleId: role.id, side: "blue" })
              }}
              className={`w-8 h-8 rounded-full bg-[#1e3a5f] border-2 border-blue-500 flex items-center justify-center cursor-grab active:cursor-grabbing hover:scale-110 transition-transform select-none ${paletteDrag?.roleId === role.id && paletteDrag?.side === "blue" ? "opacity-50 scale-90" : ""}`}
              title={role.id}
            >
              <img src={role.icon} alt={role.id} className="w-5 h-5 pointer-events-none" draggable={false} />
            </div>
          ))}
          <div className="w-8 border-t border-slate-600 my-1" />
          <span className="text-[10px] text-red-400 font-bold mb-1">RED</span>
          {ROLES.map(role => (
            <div
              key={`pal-red-${role.id}`}
              onMouseDown={e => {
                e.preventDefault()
                setPaletteDrag({ roleId: role.id, side: "red" })
              }}
              className={`w-8 h-8 rounded-full bg-[#991b1b] border-2 border-red-500 flex items-center justify-center cursor-grab active:cursor-grabbing hover:scale-110 transition-transform select-none ${paletteDrag?.roleId === role.id && paletteDrag?.side === "red" ? "opacity-50 scale-90" : ""}`}
              title={role.id}
            >
              <img src={role.icon} alt={role.id} className="w-5 h-5 pointer-events-none" draggable={false} />
            </div>
          ))}
        </div>
      )}

      <div className="w-56 flex-shrink-0 border-l border-slate-700 p-3 overflow-y-auto">
        {loaded && (
          <DebounceInput
            type="text"
            placeholder="Map name..."
            value={name}
            onChange={e => saveName(e.target.value)}
            className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-2.5 py-1.5 text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none text-xs mb-3"
          />
        )}
        <OpponentDropdown
          value={opponentName}
          onChange={team => {
            setOpponentName(team.name)
            api.put(`/strat-map/${id}`, { opponent_id: team._id, opponent_name: team.name })
          }}
        />
        <div className="my-3" />
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Map Type</h3>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {MAP_TYPES.map(m => (
            <button
              key={m.id}
              onClick={() => handleMapTypeChange(m.id)}
              title={m.label}
              className={`p-1.5 rounded transition-colors ${mapType === m.id ? "bg-slate-600" : "hover:bg-slate-700"}`}
              style={{ color: m.color }}
            >
              <m.icon className="size-5" />
            </button>
          ))}
        </div>

        <h3 className="text-sm font-semibold text-slate-300 mb-2">Nash</h3>
        <div className="flex gap-1.5 mb-4">
          {NASH_OPTIONS.map(n => (
            <button
              key={n.id}
              onClick={() => handleNashTypeChange(nashType === n.id ? "none" : n.id)}
              title={n.id}
              className={`p-1.5 rounded transition-colors ${nashType === n.id ? "bg-slate-600" : "hover:bg-slate-700"}`}
              style={{ color: nashType === n.id ? n.color : "#94a3b8" }}
            >
              <n.icon className="size-5" />
            </button>
          ))}
        </div>

        <h3 className="text-sm font-semibold text-slate-300 mb-3">Ward Types</h3>
        <div className="space-y-2">
          {WARD_TYPES.map(w => (
            <div key={w.id} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: w.color }} />
              <span className="text-xs text-slate-400">{w.label}</span>
            </div>
          ))}
        </div>

        <h3 className="text-sm font-semibold text-slate-300 mt-4 mb-2">Notes</h3>
        <DebounceInput
          isTextArea
          placeholder="Add a note..."
          value={note}
          onChange={e => saveNote(e.target.value)}
          className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-2.5 py-1.5 text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none text-xs resize-none"
          rows={9}
        />
      </div>
    </div>
  )
}

function distToSegment(p, a, b) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y)
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}
