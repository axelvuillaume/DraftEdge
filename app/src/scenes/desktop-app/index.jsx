import { Download, Monitor, Gamepad2, MousePointerClick, PlayCircle, RefreshCw, CheckCircle2, Sparkles, ShieldCheck, Apple, ArrowRight, Zap } from "lucide-react"
import { desktopDownloadURLs } from "@/config"

const DOWNLOADS = [
  { key: "macArm64", label: "Mac", hint: "Apple Silicon · M1, M2, M3, M4", icon: Apple },
  { key: "macIntel", label: "Mac", hint: "Intel · Macs before 2021", icon: Apple },
  { key: "windows", label: "Windows", hint: "Windows 10 / 11 · 64-bit", icon: Monitor }
]

const FEATURES = [
  {
    icon: Gamepad2,
    color: "emerald",
    title: "Finds your League client",
    description: "Launch the League of Legends client and the app connects to it automatically. No setup, no file to locate, no API key."
  },
  {
    icon: MousePointerClick,
    color: "amber",
    title: "One-click scrim import",
    description: "Pick the games from your custom game history, choose the scrim block they belong to and import. Picks, bans, results and stats land straight on DraftEdge."
  },
  {
    icon: PlayCircle,
    color: "blue",
    title: "Watch replays from the site",
    description: "The replay file (.rofl) is uploaded with every game. Hit \"Watch replay\" on a scrim page and the desktop app opens it in your League client."
  },
  {
    icon: RefreshCw,
    color: "violet",
    title: "Synced with your team",
    description: "Games already imported are flagged so nobody imports them twice. Warm-ups are detected from your roster. Updates install themselves."
  }
]

const STEPS = [
  { title: "Download & install", description: "Grab the installer for your machine below. It takes less than a minute." },
  { title: "Sign in", description: "Use the same email and password as on DraftEdge. Your team is linked automatically." },
  { title: "Open the League client", description: "The app detects it as soon as it is running and lists your recent custom games." },
  { title: "Select & import", description: "Tick the games of the day, choose the scrim block, press Import. Done." }
]

const COLORS = {
  emerald: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  amber: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  blue: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  violet: "bg-violet-500/15 text-violet-400 border-violet-500/20"
}

export default function DesktopApp() {
  // Platform detection to highlight the right installer
  const ua = navigator.userAgent || ""
  let detected = null
  if (/Windows/i.test(ua)) detected = "windows"
  if (/Macintosh/i.test(ua)) detected = navigator.userAgentData?.architecture === "x86" ? "macIntel" : "macArm64"

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-16 pb-16">
        {/* ==================== HERO ==================== */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-700/50 bg-slate-800/40">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

          <div className="relative grid lg:grid-cols-2 gap-10 p-8 lg:p-12 items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-full mb-5">
                <Sparkles className="w-3.5 h-3.5" />
                New · Desktop app
              </span>
              <h1 className="text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight">
                DraftEdge <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">Desktop</span>
              </h1>
              <p className="mt-4 text-lg text-slate-300 leading-relaxed">
                The companion app that reads your League of Legends client and imports your scrims into DraftEdge in one click. No more exporting files or typing drafts by hand.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                {DOWNLOADS.map(opt => {
                  const Icon = opt.icon
                  return (
                    <a
                      key={opt.key}
                      href={desktopDownloadURLs[opt.key]}
                      className={`group flex items-center gap-3 pl-3 pr-4 py-2.5 rounded-xl border transition-all duration-200 ${
                        detected === opt.key
                          ? "bg-gradient-to-r from-amber-500 to-amber-600 border-amber-400 text-slate-900 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40"
                          : "bg-slate-800/60 border-slate-700/50 text-white hover:bg-slate-700/60 hover:border-slate-600"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <div className="text-left">
                        <div className="text-sm font-semibold leading-tight">{opt.label}</div>
                        <div className={`text-[11px] ${detected === opt.key ? "text-slate-800" : "text-slate-500"}`}>{opt.hint}</div>
                      </div>
                      <Download className={`w-4 h-4 ml-1 transition-transform group-hover:translate-y-0.5 ${detected === opt.key ? "" : "text-slate-400"}`} />
                    </a>
                  )
                })}
              </div>
              <p className="mt-4 text-xs text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Free for every member of your team · Mac & Windows
              </p>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/20 to-blue-500/20 blur-2xl rounded-3xl" />
              <div className="relative rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl shadow-black/40 overflow-hidden">
                <div className="h-8 bg-slate-800/80 border-b border-slate-700/50 flex items-center gap-1.5 px-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
                </div>
                <img src="/desktop/screenshot1.png" alt="DraftEdge Desktop" className="w-full block" />
              </div>
            </div>
          </div>
        </section>

        {/* ==================== FEATURES ==================== */}
        <section>
          <div className="text-center mb-10">
            <h2 className="text-2xl lg:text-3xl font-bold text-white">What is it for?</h2>
            <p className="mt-2 text-slate-400">Everything that used to be manual between the game client and DraftEdge, automated.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {FEATURES.map(feature => {
              const Icon = feature.icon
              return (
                <div key={feature.title} className="group rounded-2xl border border-slate-700/50 bg-slate-800/40 p-6 hover:bg-slate-800/70 hover:border-slate-600/60 transition-all duration-200">
                  <div className={`w-12 h-12 rounded-xl border flex items-center justify-center mb-4 ${COLORS[feature.color]}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </section>

        {/* ==================== HOW IT WORKS ==================== */}
        <section className="rounded-3xl border border-slate-700/50 bg-slate-800/40 p-8 lg:p-12">
          <div className="grid lg:grid-cols-5 gap-10 items-center">
            <div className="lg:col-span-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-3">
                <Zap className="w-3.5 h-3.5" />
                How it works
              </span>
              <h2 className="text-2xl lg:text-3xl font-bold text-white">Four steps, then it runs itself</h2>
              <p className="mt-3 text-slate-400">Set it up once. After that, importing a scrim day takes about thirty seconds.</p>
              <div className="mt-8 rounded-2xl border border-slate-700/60 bg-slate-900 overflow-hidden shadow-xl shadow-black/30">
                <img src="/desktop/screenshot2.png" alt="Sign in with your DraftEdge account" className="w-full block" />
              </div>
            </div>
            <ol className="lg:col-span-3 space-y-4">
              {STEPS.map((step, i) => (
                <li key={step.title} className="flex gap-4 rounded-2xl border border-slate-700/50 bg-slate-900/50 p-5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-900 font-bold flex items-center justify-center shrink-0">{i + 1}</div>
                  <div>
                    <h3 className="text-white font-semibold">{step.title}</h3>
                    <p className="text-sm text-slate-400 mt-1 leading-relaxed">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ==================== REPLAYS ==================== */}
        <section className="grid md:grid-cols-2 gap-5">
          <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-600/15 to-blue-500/5 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                <PlayCircle className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-white">Replays, one click away</h3>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              Every imported game comes with its replay file. From a scrim page on DraftEdge, press <span className="text-white font-medium">Watch replay</span>: the desktop app opens, downloads the replay if needed and launches it in your League client. Replays stay available for 21 days.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-slate-700/50 border border-slate-600/40 text-slate-300 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-white">Good to know</h3>
            </div>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li className="flex gap-2">
                <span className="text-amber-400 mt-0.5">•</span>
                The League client must be installed and running on the same computer.
              </li>
              <li className="flex gap-2">
                <span className="text-amber-400 mt-0.5">•</span>
                Sign in with your DraftEdge account. Any role (admin, staff, user) can import.
              </li>
              <li className="flex gap-2">
                <span className="text-amber-400 mt-0.5">•</span>
                <span>
                  On Windows, SmartScreen may show a warning the first time: click <span className="text-white">More info</span> then <span className="text-white">Run anyway</span>.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-amber-400 mt-0.5">•</span>
                <span>
                  On Mac, right-click the app and choose <span className="text-white">Open</span> the first time you launch it.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-amber-400 mt-0.5">•</span>
                The app updates itself. You will always be on the latest version.
              </li>
            </ul>
          </div>
        </section>

        {/* ==================== CTA ==================== */}
        <section className="rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent p-8 lg:p-10 flex flex-wrap items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Ready to stop typing drafts by hand?</h2>
            <p className="mt-1 text-slate-400">Install DraftEdge Desktop and import your next scrim block in one click.</p>
          </div>
          <a
            href={desktopDownloadURLs[detected || "windows"]}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-semibold shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all"
          >
            <Download className="w-5 h-5" />
            Download for {detected === "windows" || !detected ? "Windows" : "Mac"}
            <ArrowRight className="w-4 h-4" />
          </a>
        </section>

        <p className="text-center text-xs text-slate-600">DraftEdge is not affiliated with Riot Games. League of Legends is a trademark of Riot Games, Inc.</p>
      </div>
    </div>
  )
}
