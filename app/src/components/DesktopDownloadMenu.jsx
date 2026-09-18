import { Menu, Transition } from "@headlessui/react"
import { Download, Monitor } from "lucide-react"
import { desktopDownloadURLs } from "@/config"

const OPTIONS = [
  { key: "macArm64", label: "Mac · Apple Silicon", hint: "M1, M2, M3, M4" },
  { key: "macIntel", label: "Mac · Intel", hint: "Macs d'avant 2021" },
  { key: "windows", label: "Windows", hint: "Windows 10 / 11, 64 bits" },
]

// Détecte la plateforme pour mettre en avant le bon installeur
function detectKey() {
  const ua = navigator.userAgent || ""
  if (/Windows/i.test(ua)) return "windows"
  if (/Macintosh/i.test(ua)) {
    const arch = navigator.userAgentData?.architecture
    if (arch === "arm") return "macArm64"
    if (arch === "x86") return "macIntel"
    return "macArm64"
  }
  return null
}

export default function DesktopDownloadMenu() {
  const detected = detectKey()

  return (
    <Menu as="div" className="relative">
      <Menu.Button
        title="DraftEdge Desktop : importe tes scrims directement depuis le client League"
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700/50 hover:border-slate-600/50 text-slate-300 hover:text-white text-sm font-medium transition-all duration-200"
      >
        <Download className="w-4 h-4" />
        <span className="hidden md:inline">Download app</span>
      </Menu.Button>

      <Transition
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 mt-2 w-72 origin-top-right bg-slate-800 border border-slate-700/50 rounded-xl shadow-xl shadow-black/20 overflow-hidden focus:outline-none z-50">
          <div className="px-4 py-3 border-b border-slate-700/50 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
              <Monitor className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">DraftEdge Desktop</p>
              <p className="text-xs text-slate-400">Reads your League client history and imports your scrim games in one click.</p>
            </div>
          </div>
          <div className="py-1">
            {OPTIONS.map(opt => (
              <Menu.Item key={opt.key}>
                {({ active }) => (
                  <a href={desktopDownloadURLs[opt.key]} className={`${active ? "bg-slate-700/50" : ""} flex items-center justify-between px-4 py-2.5 transition-colors`}>
                    <div>
                      <div className="text-sm text-white font-medium">{opt.label}</div>
                      <div className="text-xs text-slate-500">{opt.hint}</div>
                    </div>
                    {detected === opt.key && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-medium">Recommended</span>}
                  </a>
                )}
              </Menu.Item>
            ))}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  )
}
