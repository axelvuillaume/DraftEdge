import { useState, useEffect, useRef, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import "./style.css"

export default function Website() {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [navScrolled, setNavScrolled] = useState(false)
  const navRef = useRef(null)

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 60)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible")
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    )
    document.querySelectorAll(".scroll-reveal").forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const scrollTo = useCallback((e, id) => {
    e.preventDefault()
    setMenuOpen(false)
    const target = document.getElementById(id)
    if (target) {
      const offset = (navRef.current?.offsetHeight || 60) + 20
      const top = target.getBoundingClientRect().top + window.scrollY - offset
      window.scrollTo({ top, behavior: "smooth" })
    }
  }, [])

  return (
    <div className="website-page">
      <div className="grain" aria-hidden="true" />

      {/* Navigation */}
      <nav className={`ws-navbar${navScrolled ? " scrolled" : ""}`} ref={navRef}>
        <div className="ws-container nav-container">
          <a href="#" className="nav-logo" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }) }}>
            <div className="logo-shield">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
              </svg>
            </div>
            <span className="logo-text">DraftEdge</span>
          </a>
          <div className={`nav-links${menuOpen ? " open" : ""}`}>
            <a href="#training" onClick={(e) => scrollTo(e, "training")}>Training</a>
            <a href="#stats" onClick={(e) => scrollTo(e, "stats")}>Stats</a>
            <a href="#players" onClick={(e) => scrollTo(e, "players")}>Players</a>
            <a href="#league" onClick={(e) => scrollTo(e, "league")}>League</a>
            <a href="#manager" onClick={(e) => scrollTo(e, "manager")}>Manager</a>
          </div>
          <div className="nav-actions">
            <button className="btn btn-primary" onClick={() => navigate("/auth")}>Commencer</button>
            <button className="mobile-menu-btn" aria-label="Menu" onClick={() => setMenuOpen(!menuOpen)}>
              <span /><span /><span />
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-bg">
          <div className="hero-gradient" />
          <div className="hero-lines" aria-hidden="true">
            <div className="h-line" style={{ top: "20%" }} />
            <div className="h-line" style={{ top: "40%" }} />
            <div className="h-line" style={{ top: "60%" }} />
            <div className="h-line" style={{ top: "80%" }} />
            <div className="v-line" style={{ left: "25%" }} />
            <div className="v-line" style={{ left: "50%" }} />
            <div className="v-line" style={{ left: "75%" }} />
          </div>
          <div className="hero-orb orb-1" />
          <div className="hero-orb orb-2" />
        </div>
        <div className="ws-container hero-container">
          <div className="hero-content">
            <h1 className="hero-title">
              <span className="anim-up" style={{ "--delay": 1 }}>Prenez</span>
              <span className="anim-up hero-title-accent" style={{ "--delay": 2 }}>l'avantage.</span>
            </h1>
            <p className="hero-sub anim-up" style={{ "--delay": 3 }}>Training, stats avancees, tracking SoloQ, gestion de ligue et import de replays — une seule plateforme pour dominer.</p>
            <div className="hero-actions anim-up" style={{ "--delay": 4 }}>
              <button className="btn btn-primary btn-lg" onClick={() => navigate("/auth")}>
                Creer mon equipe
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </button>
              <a href="#training" className="btn btn-outline btn-lg" onClick={(e) => scrollTo(e, "training")}>Explorer</a>
            </div>
          </div>
        </div>
        <div className="hero-ticker">
          <div className="ticker-inner">
            {[1, 2].map((r) => (
              <span key={r} style={{ display: "contents" }}>
                <span className="ticker-item" style={{ "--c": "#f97316" }}>TOP LANE</span>
                <span className="ticker-sep">/</span>
                <span className="ticker-item" style={{ "--c": "#10b981" }}>JUNGLE</span>
                <span className="ticker-sep">/</span>
                <span className="ticker-item" style={{ "--c": "#3b82f6" }}>MID LANE</span>
                <span className="ticker-sep">/</span>
                <span className="ticker-item" style={{ "--c": "#ef4444" }}>BOT LANE</span>
                <span className="ticker-sep">/</span>
                <span className="ticker-item" style={{ "--c": "#06b6d4" }}>SUPPORT</span>
                <span className="ticker-sep">/</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* TRAINING */}
      <section className="ws-section" id="training">
        <div className="ws-container">
          <div className="section-label">
            <span className="label-num">01</span>
            <span className="label-line" />
            <span className="label-text">Training</span>
          </div>
          <div className="training-hero">
            <div className="training-left">
              <h2 className="big-heading scroll-reveal">Entrainement<br /><span className="text-amber">pilote par l'IA.</span></h2>
              <p className="body-text scroll-reveal">Definissez des objectifs en langage naturel — DraftEdge les transforme en metriques mesurables et suit chaque game automatiquement.</p>
            </div>
            <div className="training-right scroll-reveal">
              <div className="ai-demo-card">
                <div className="ai-demo-top">
                  <span className="ai-badge coach">Coach</span>
                  <p className="ai-prompt">"Au moins 8 CS/min a 15 min et 65% kill participation sur les 20 prochaines games"</p>
                </div>
                <div className="ai-demo-arrow">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14" />
                    <path d="m19 12-7 7-7-7" />
                  </svg>
                </div>
                <div className="ai-demo-bottom">
                  <span className="ai-badge ai">DraftEdge AI</span>
                  <div className="ai-tags">
                    <span className="ai-tag">cs_per_min &gt;= 8</span>
                    <span className="ai-tag">at: 15min</span>
                    <span className="ai-tag">kill_part &gt;= 65%</span>
                    <span className="ai-tag">games: 20</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="feature-strip scroll-reveal">
            <div className="strip-item">
              <div className="strip-icon amber">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
              <div>
                <h4>Objectifs SoloQ IA</h4>
                <p>Parsing automatique du langage naturel en metriques trackables</p>
              </div>
            </div>
            <div className="strip-item">
              <div className="strip-icon blue">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 20V10" />
                  <path d="M18 20V4" />
                  <path d="M6 20v-4" />
                </svg>
              </div>
              <div>
                <h4>Objectifs scrims equipe</h4>
                <p>Notation et suivi scrim par scrim avec rating</p>
              </div>
            </div>
            <div className="strip-item">
              <div className="strip-icon emerald">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect width="18" height="18" x="3" y="3" rx="2" />
                  <path d="M3 9h18" />
                  <path d="M9 21V9" />
                </svg>
              </div>
              <div>
                <h4>Scenarios de draft</h4>
                <p>Simulation et preparation des picks/bans par role</p>
              </div>
            </div>
            <div className="strip-item">
              <div className="strip-icon purple">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div>
                <h4>Feedback IA par role</h4>
                <p>Analyse automatique et recommandations personnalisees</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="ws-section ws-section-alt" id="stats">
        <div className="ws-container">
          <div className="section-label">
            <span className="label-num">02</span>
            <span className="label-line" />
            <span className="label-text">Stats</span>
          </div>
          <div className="stats-layout">
            <div className="stats-left">
              <h2 className="big-heading scroll-reveal">Comparez-vous<br /><span className="text-amber">aux meilleurs.</span></h2>
              <p className="body-text scroll-reveal">Vision, CS, degats, KDA — analysez chaque metrique en spider chart et comparez vos performances directement avec des joueurs pro comme Faker.</p>
              <div className="compare-modes scroll-reveal">
                <div className="compare-mode">
                  <div className="compare-mode-icon amber">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                      <path d="M4 22h16" />
                      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                    </svg>
                  </div>
                  <div>
                    <h4>vs Pro</h4>
                    <p>Compare avec Faker, Caps, Chovy...</p>
                  </div>
                </div>
                <div className="compare-mode">
                  <div className="compare-mode-icon blue">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </div>
                  <div>
                    <h4>vs Scrim</h4>
                    <p>Compare avec tes adversaires de scrims</p>
                  </div>
                </div>
                <div className="compare-mode">
                  <div className="compare-mode-icon purple">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </div>
                  <div>
                    <h4>vs SoloQ</h4>
                    <p>Compare avec ta moyenne SoloQ</p>
                  </div>
                </div>
                <div className="compare-mode">
                  <div className="compare-mode-icon emerald">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 20V10" />
                      <path d="M18 20V4" />
                      <path d="M6 20v-4" />
                    </svg>
                  </div>
                  <div>
                    <h4>Offi vs Non-Offi</h4>
                    <p>Officiel vs non-officiel</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="stats-right scroll-reveal">
              <div className="spider-card">
                <div className="spider-card-header">
                  <h4>Performance by category</h4>
                  <div className="spider-compare-badge">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.3-4.3" />
                    </svg>
                    vs Faker
                  </div>
                </div>
                <div className="spider-scores">
                  <div className="spider-score">
                    <span className="ss-icon" style={{ background: "rgba(245, 158, 11, 0.12)", color: "#f59e0b" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275z" />
                      </svg>
                    </span>
                    <span className="ss-val">54</span>
                  </div>
                  <div className="spider-score">
                    <span className="ss-icon" style={{ background: "rgba(16, 185, 129, 0.12)", color: "#10b981" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" />
                        <path d="m9 12 2 2 4-4" />
                      </svg>
                    </span>
                    <span className="ss-val emerald">70</span>
                  </div>
                  <div className="spider-score">
                    <span className="ss-icon" style={{ background: "rgba(139, 92, 246, 0.12)", color: "#8b5cf6" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 20V10" />
                        <path d="M18 20V4" />
                        <path d="M6 20v-4" />
                      </svg>
                    </span>
                    <span className="ss-val">54</span>
                  </div>
                  <div className="spider-score">
                    <span className="ss-icon" style={{ background: "rgba(217, 119, 6, 0.12)", color: "#d97706" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </span>
                    <span className="ss-val amber">72</span>
                  </div>
                </div>
                <div className="spider-chart-wrap">
                  <svg className="spider-svg" viewBox="0 0 300 280" fill="none">
                    <polygon points="150,30 262,85 218,220 82,220 38,85" stroke="rgba(255,255,255,.06)" strokeWidth="1" fill="none" />
                    <polygon points="150,60 232,100 198,205 102,205 68,100" stroke="rgba(255,255,255,.05)" strokeWidth="1" fill="none" />
                    <polygon points="150,90 202,115 178,190 122,190 98,115" stroke="rgba(255,255,255,.04)" strokeWidth="1" fill="none" />
                    <polygon points="150,120 172,130 158,175 142,175 128,130" stroke="rgba(255,255,255,.03)" strokeWidth="1" fill="none" />
                    <line x1="150" y1="30" x2="150" y2="125" stroke="rgba(255,255,255,.04)" />
                    <line x1="262" y1="85" x2="150" y2="125" stroke="rgba(255,255,255,.04)" />
                    <line x1="218" y1="220" x2="150" y2="125" stroke="rgba(255,255,255,.04)" />
                    <line x1="82" y1="220" x2="150" y2="125" stroke="rgba(255,255,255,.04)" />
                    <line x1="38" y1="85" x2="150" y2="125" stroke="rgba(255,255,255,.04)" />
                    <polygon className="spider-shape spider-shape-pro" points="150,42 248,90 205,215 88,210 52,88" fill="rgba(245,158,11,.08)" stroke="#f59e0b" strokeWidth="1.8" />
                    <circle cx="150" cy="42" r="4" fill="#f59e0b" />
                    <circle cx="248" cy="90" r="4" fill="#f59e0b" />
                    <circle cx="205" cy="215" r="4" fill="#f59e0b" />
                    <circle cx="88" cy="210" r="4" fill="#f59e0b" />
                    <circle cx="52" cy="88" r="4" fill="#f59e0b" />
                    <polygon className="spider-shape spider-shape-team" points="150,65 220,105 185,195 108,188 72,98" fill="rgba(16,185,129,.1)" stroke="#10b981" strokeWidth="1.8" />
                    <circle cx="150" cy="65" r="4" fill="#10b981" />
                    <circle cx="220" cy="105" r="4" fill="#10b981" />
                    <circle cx="185" cy="195" r="4" fill="#10b981" />
                    <circle cx="108" cy="188" r="4" fill="#10b981" />
                    <circle cx="72" cy="98" r="4" fill="#10b981" />
                    <text x="150" y="20" fill="rgba(255,255,255,.5)" fontSize="11" fontWeight="600" textAnchor="middle" fontFamily="Syne">Vision Score / min</text>
                    <text x="278" y="88" fill="rgba(255,255,255,.5)" fontSize="11" fontWeight="600" textAnchor="start" fontFamily="Syne">Wards Placed</text>
                    <text x="228" y="238" fill="rgba(255,255,255,.5)" fontSize="11" fontWeight="600" textAnchor="start" fontFamily="Syne">Wards Killed</text>
                    <text x="72" y="238" fill="rgba(255,255,255,.5)" fontSize="11" fontWeight="600" textAnchor="end" fontFamily="Syne">Control Wards</text>
                    <text x="22" y="88" fill="rgba(255,255,255,.5)" fontSize="11" fontWeight="600" textAnchor="end" fontFamily="Syne">Ward Clear %</text>
                  </svg>
                </div>
                <div className="spider-legend">
                  <div className="legend-item"><span className="legend-dot" style={{ background: "#10b981" }} />Team <span className="spider-games">12 games</span></div>
                  <div className="legend-item"><span className="legend-dot" style={{ background: "#f59e0b" }} />Faker <span className="spider-games">23 games</span></div>
                </div>
                <div className="spider-tabs">
                  <span className="spider-tab">vs Scrim</span>
                  <span className="spider-tab active">vs Pro</span>
                  <span className="spider-tab">vs SoloQ</span>
                  <span className="spider-tab">Offi vs Non-Offi</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PLAYERS */}
      <section className="ws-section" id="players">
        <div className="ws-container">
          <div className="section-label">
            <span className="label-num">03</span>
            <span className="label-line" />
            <span className="label-text">Players</span>
          </div>
          <div className="players-layout">
            <div className="players-chart scroll-reveal">
              <div className="lp-chart-card">
                <div className="lp-chart-header">
                  <div className="roster-dot" />
                  <span>LP Progression — Last 7 days</span>
                  <span className="roster-sync">Sync /15min</span>
                </div>
                <div className="lp-chart-body">
                  <svg className="lp-chart-svg" viewBox="0 0 700 340" preserveAspectRatio="none">
                    <line x1="52" y1="30" x2="690" y2="30" stroke="rgba(255,255,255,.04)" strokeWidth="1" />
                    <line x1="52" y1="92" x2="690" y2="92" stroke="rgba(255,255,255,.04)" strokeWidth="1" />
                    <line x1="52" y1="154" x2="690" y2="154" stroke="rgba(255,255,255,.04)" strokeWidth="1" />
                    <line x1="52" y1="216" x2="690" y2="216" stroke="rgba(255,255,255,.04)" strokeWidth="1" />
                    <line x1="52" y1="278" x2="690" y2="278" stroke="rgba(255,255,255,.04)" strokeWidth="1" />
                    <line x1="52" y1="24" x2="52" y2="300" stroke="rgba(255,255,255,.04)" strokeWidth="1" />
                    <line x1="180" y1="24" x2="180" y2="300" stroke="rgba(255,255,255,.04)" strokeWidth="1" />
                    <line x1="308" y1="24" x2="308" y2="300" stroke="rgba(255,255,255,.04)" strokeWidth="1" />
                    <line x1="436" y1="24" x2="436" y2="300" stroke="rgba(255,255,255,.04)" strokeWidth="1" />
                    <line x1="564" y1="24" x2="564" y2="300" stroke="rgba(255,255,255,.04)" strokeWidth="1" />
                    <line x1="690" y1="24" x2="690" y2="300" stroke="rgba(255,255,255,.04)" strokeWidth="1" />
                    <text x="46" y="34" fill="rgba(255,255,255,.25)" fontSize="10" textAnchor="end" fontFamily="DM Sans">1500 LP</text>
                    <text x="46" y="96" fill="rgba(255,255,255,.25)" fontSize="10" textAnchor="end" fontFamily="DM Sans">1250 LP</text>
                    <text x="46" y="158" fill="rgba(255,255,255,.25)" fontSize="10" textAnchor="end" fontFamily="DM Sans">1000 LP</text>
                    <text x="46" y="220" fill="rgba(255,255,255,.25)" fontSize="10" textAnchor="end" fontFamily="DM Sans">750 LP</text>
                    <text x="46" y="282" fill="rgba(255,255,255,.25)" fontSize="10" textAnchor="end" fontFamily="DM Sans">500 LP</text>
                    <text x="52" y="318" fill="rgba(255,255,255,.25)" fontSize="10" textAnchor="middle" fontFamily="DM Sans">Mar 11</text>
                    <text x="180" y="318" fill="rgba(255,255,255,.25)" fontSize="10" textAnchor="middle" fontFamily="DM Sans">Mar 12</text>
                    <text x="308" y="318" fill="rgba(255,255,255,.25)" fontSize="10" textAnchor="middle" fontFamily="DM Sans">Mar 13</text>
                    <text x="436" y="318" fill="rgba(255,255,255,.25)" fontSize="10" textAnchor="middle" fontFamily="DM Sans">Mar 15</text>
                    <text x="564" y="318" fill="rgba(255,255,255,.25)" fontSize="10" textAnchor="middle" fontFamily="DM Sans">Mar 17</text>
                    <text x="690" y="318" fill="rgba(255,255,255,.25)" fontSize="10" textAnchor="middle" fontFamily="DM Sans">Mar 18</text>
                    <polyline className="chart-line line-1" fill="none" stroke="#f97316" strokeWidth="2" points="52,42 90,40 130,38 170,36 200,34 240,32 280,34 308,32 350,30 400,32 436,34 480,32 520,30 560,44 590,34 630,32 660,30 690,32" />
                    <polyline className="chart-line line-2" fill="none" stroke="#10b981" strokeWidth="2" points="52,62 80,64 110,68 150,78 180,82 210,72 250,68 290,76 308,70 340,66 380,68 420,64 450,68 480,72 510,66 540,70 570,64 600,74 630,68 660,64 690,72" />
                    <polyline className="chart-line line-3" fill="none" stroke="#3b82f6" strokeWidth="2" points="52,138 80,136 120,140 160,134 200,130 240,128 280,132 308,126 340,124 380,128 420,122 450,120 480,124 510,118 540,116 570,120 600,114 640,116 670,112 690,110" />
                    <polyline className="chart-line line-4" fill="none" stroke="#ef4444" strokeWidth="2" points="52,188 90,186 130,188 170,184 200,180 240,174 280,170 308,168 340,164 380,166 410,160 436,156 470,154 500,150 530,148 564,144 590,148 620,142 650,140 690,138" />
                    <polyline className="chart-line line-5" fill="none" stroke="#06b6d4" strokeWidth="2" points="52,258 80,264 110,260 140,262 170,256 200,260 240,258 270,244 308,228 340,214 370,220 400,208 436,196 470,188 500,180 530,176 564,168 590,184 620,172 650,162 690,156" />
                  </svg>
                  <div className="lp-chart-legend">
                    <div className="legend-item"><span className="legend-dot" style={{ background: "#f97316" }} />Top</div>
                    <div className="legend-item"><span className="legend-dot" style={{ background: "#10b981" }} />Jungle</div>
                    <div className="legend-item"><span className="legend-dot" style={{ background: "#3b82f6" }} />Mid</div>
                    <div className="legend-item"><span className="legend-dot" style={{ background: "#ef4444" }} />ADC</div>
                    <div className="legend-item"><span className="legend-dot" style={{ background: "#06b6d4" }} />Support</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="players-text">
              <h2 className="big-heading scroll-reveal">Suivez chaque<br /><span className="text-amber">joueur.</span></h2>
              <p className="body-text scroll-reveal">Synchronisation auto toutes les 15 minutes. LP, rank, matchs, champion pool par tier — tout est la, en temps reel.</p>
              <ul className="check-list scroll-reveal">
                <li><span className="ck" />&nbsp;Progression LP &amp; historique de rank</li>
                <li><span className="ck" />&nbsp;Champion pool tiers S / A / B</li>
                <li><span className="ck" />&nbsp;Profils joueurs &amp; snapshots quotidiens</li>
                <li><span className="ck" />&nbsp;Objectifs SoloQ personnalises</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* LEAGUE */}
      <section className="ws-section ws-section-alt" id="league">
        <div className="ws-container">
          <div className="section-label">
            <span className="label-num">04</span>
            <span className="label-line" />
            <span className="label-text">League</span>
          </div>
          <div className="league-layout">
            <div className="league-text">
              <h2 className="big-heading scroll-reveal">Votre ligue,<br /><span className="text-amber">centralisee.</span></h2>
              <p className="body-text scroll-reveal">Classement LP agrege, fiches adverses, multi OP.GG automatique et standings mis a jour quotidiennement.</p>
              <ul className="check-list scroll-reveal">
                <li><span className="ck" />&nbsp;Classement LP total par equipe</li>
                <li><span className="ck" />&nbsp;Fiches joueurs adverses</li>
                <li><span className="ck" />&nbsp;Synchronisation LP quotidienne</li>
              </ul>
            </div>
            <div className="league-visual scroll-reveal">
              <div className="league-card">
                <div className="league-card-header">
                  <div className="roster-dot amber" />
                  <span>Standings — LFL Div 2</span>
                </div>
                <div className="league-card-body">
                  <div className="lc-row lc-header">
                    <span className="lc-pos">#</span>
                    <span className="lc-team">Team</span>
                    <span className="lc-lp">Total LP</span>
                    <span className="lc-pts">Points</span>
                  </div>
                  <div className="lc-row gold">
                    <span className="lc-pos">1</span>
                    <span className="lc-team">DraftEdge Esports</span>
                    <span className="lc-lp">4,218</span>
                    <span className="lc-pts">15</span>
                  </div>
                  <div className="lc-row silver">
                    <span className="lc-pos">2</span>
                    <span className="lc-team">Team Phoenix</span>
                    <span className="lc-lp">3,892</span>
                    <span className="lc-pts">12</span>
                  </div>
                  <div className="lc-row bronze">
                    <span className="lc-pos">3</span>
                    <span className="lc-team">Nexus Gaming</span>
                    <span className="lc-lp">3,641</span>
                    <span className="lc-pts">9</span>
                  </div>
                  <div className="lc-row">
                    <span className="lc-pos">4</span>
                    <span className="lc-team">Rift Warriors</span>
                    <span className="lc-lp">3,205</span>
                    <span className="lc-pts">6</span>
                  </div>
                  <div className="lc-row">
                    <span className="lc-pos">5</span>
                    <span className="lc-team">Storm Esport</span>
                    <span className="lc-lp">2,987</span>
                    <span className="lc-pts">3</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MANAGER */}
      <section className="ws-section" id="manager">
        <div className="ws-container">
          <div className="section-label">
            <span className="label-num">05</span>
            <span className="label-line" />
            <span className="label-text">Manager</span>
          </div>
          <div className="manager-layout">
            <h2 className="big-heading scroll-reveal">L'espace<br /><span className="text-amber">du manager.</span></h2>
            <div className="manager-grid scroll-reveal">
              <div className="mgr-card">
                <div className="mgr-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                  </svg>
                </div>
                <h4>Import Replays .rofl</h4>
                <p>Drag &amp; drop vos fichiers replay. Le parser extrait toutes les stats et enrichit les donnees via l'API Riot.</p>
              </div>
              <div className="mgr-card">
                <div className="mgr-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <line x1="19" x2="19" y1="8" y2="14" />
                    <line x1="22" x2="16" y1="11" y2="11" />
                  </svg>
                </div>
                <h4>Gestion Roster</h4>
                <p>Invitations, roles, activation/desactivation des joueurs, tout le roster management en un seul endroit.</p>
              </div>
              <div className="mgr-card">
                <div className="mgr-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </div>
                <h4>Adversaires &amp; Scrims</h4>
                <p>Creez des fiches adversaires, organisez vos sessions de scrim, classez par dossiers et analysez match par match.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="ws-section cta-section" id="cta">
        <div className="ws-container">
          <div className="cta-card">
            <div className="cta-orb" />
            <div className="cta-inner">
              <div className="cta-shield">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
                </svg>
              </div>
              <h2 className="cta-heading">Pret a prendre l'avantage ?</h2>
              <p className="cta-sub">Creez votre equipe gratuitement. Setup en 2 minutes. Aucune carte requise.</p>
              <button className="btn btn-primary btn-xl" onClick={() => navigate("/auth")}>
                Commencer maintenant
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="ws-footer">
        <div className="ws-container footer-inner">
          <div className="footer-left">
            <a href="#" className="nav-logo" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }) }}>
              <div className="logo-shield small">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
                </svg>
              </div>
              <span className="logo-text">DraftEdge</span>
            </a>
            <p className="footer-sub">L'intelligence esport pour League of Legends.</p>
          </div>
          <div className="footer-cols">
            <div className="footer-col">
              <h5>Produit</h5>
              <a href="#training" onClick={(e) => scrollTo(e, "training")}>Training</a>
              <a href="#stats" onClick={(e) => scrollTo(e, "stats")}>Stats</a>
              <a href="#players" onClick={(e) => scrollTo(e, "players")}>Players</a>
            </div>
            <div className="footer-col">
              <h5>Equipe</h5>
              <a href="#league" onClick={(e) => scrollTo(e, "league")}>League</a>
              <a href="#manager" onClick={(e) => scrollTo(e, "manager")}>Manager</a>
              <a href="#cta" onClick={(e) => scrollTo(e, "cta")}>Commencer</a>
            </div>
          </div>
        </div>
        <div className="ws-container">
          <div className="footer-bottom">
            <p>&copy; 2026 DraftEdge. Tous droits reserves.</p>
            <p className="footer-riot">DraftEdge n'est pas endorse par Riot Games et ne reflete pas les vues de Riot Games ou de toute personne impliquee dans la production de League of Legends.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
