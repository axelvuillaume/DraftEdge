import { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { Gamepad2, RefreshCw, Download, Plus, X, Play, Loader2, AlertTriangle, CheckCircle2, Users, XCircle, Copy, Clock } from "lucide-react";
import api from "../../services/api";
import { ROLES, getChampionIcon, detectWarmup } from "../../utils";

const DAY_MS = 24 * 3600 * 1000;
const INITIAL_DAYS = 7;
const MORE_DAYS = 7;

export default function Home({ user }) {
  const [lcu, setLcu] = useState({ connected: false, summoner: null });
  const [roster, setRoster] = useState([]);

  useEffect(() => {
    window.draftedge.lcu.status().then(setLcu);
    return window.draftedge.lcu.onStatus(setLcu);
  }, []);

  // Roster partagé par l'historique (détection des warmups) : fetch dans le parent, passé en prop
  const fetchRoster = async () => {
    try {
      const { ok, data, code } = await api.post("/player/search", { team_id: user.team_id, limit: 50 });
      if (!ok) return toast.error(code || "Failed to fetch roster");
      setRoster(data);
    } catch (error) {
      toast.error(error.code || "Failed to fetch roster");
    }
  };

  useEffect(() => {
    if (user.team_id) fetchRoster();
  }, [user.team_id]);

  if (!user.team_id) {
    return <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-400 text-sm">Your account is not linked to any team. Join a team on DraftEdge before importing games.</div>;
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-6 pt-4 max-w-4xl w-full mx-auto">
        <LcuStatus lcu={lcu} />
      </div>
      <Import user={user} lcu={lcu} roster={roster} />
    </div>
  );
}

// ==================== CLIENT LEAGUE ====================

function LcuStatus({ lcu }) {
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    await window.draftedge.lcu.refresh();
    setRefreshing(false);
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${lcu.connected ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-800 text-slate-500"}`}>
          <Gamepad2 className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${lcu.connected ? "bg-emerald-400" : "bg-slate-600"}`} />
            <span className="font-medium">{lcu.connected ? "League client connected" : "League client not found"}</span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {lcu.connected && lcu.summoner && (
              <>
                {lcu.summoner.gameName}
                <span className="text-slate-500">#{lcu.summoner.tagLine}</span>
              </>
            )}
            {lcu.connected && !lcu.summoner && "Log in to the client to see your match history"}
            {!lcu.connected && "Launch the League of Legends client, it will be detected automatically"}
          </p>
        </div>
      </div>
      <button onClick={refresh} className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800" title="Refresh">
        <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
      </button>
    </div>
  );
}

// ==================== IMPORT ====================

function Import({ user, lcu, roster }) {
  const [session, setSession] = useState(null);
  const [history, setHistory] = useState({ games: [], hasMore: false, nextIndex: 0 });
  const [daysShown, setDaysShown] = useState(INITIAL_DAYS);
  const [showAll, setShowAll] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [importing, setImporting] = useState(null); // games en cours d'import
  const [importCount, setImportCount] = useState(0); // incrémenté après chaque import pour rafraîchir la liste des games du bloc
  const seen = useRef(new Set()); // games déjà passées par la sélection par défaut

  const fetchHistory = async ({ reset = false } = {}) => {
    if (!lcu.connected) return;
    setLoading(true);
    try {
      const { ok, data, code } = await window.draftedge.lcu.history({ detailCustoms: true });
      setLoading(false);
      if (!ok) return toast.error(code || "Match history unavailable");
      if (reset) {
        seen.current = new Set();
        setSelected(new Set());
        setDaysShown(INITIAL_DAYS);
      }
      setHistory(data);
    } catch (error) {
      setLoading(false);
      toast.error(error.code || "Match history unavailable");
    }
  };

  useEffect(() => {
    fetchHistory({ reset: true });
  }, [lcu.connected]);

  useEffect(() => {
    const onFocus = () => fetchHistory();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [lcu.connected]);

  // "Voir plus" : on élargit la fenêtre de 7 jours et on charge la page suivante du client si besoin
  const loadMore = async () => {
    setDaysShown(daysShown + MORE_DAYS);
    if (!history.hasMore || Math.min(...history.games.map((g) => g.creation)) < new Date().setHours(0, 0, 0, 0) - (daysShown + MORE_DAYS) * DAY_MS) return;
    setLoadingMore(true);
    try {
      const { ok, data, code } = await window.draftedge.lcu.history({ detailCustoms: true, begIndex: history.nextIndex });
      setLoadingMore(false);
      if (!ok) return toast.error(code || "Match history unavailable");
      setHistory((prev) => ({ ...data, games: [...prev.games, ...data.games.filter((g) => !prev.games.find((p) => p.gameId === g.gameId))] }));
    } catch (error) {
      setLoadingMore(false);
      toast.error(error.code || "Match history unavailable");
    }
  };

  // Sélection par défaut (customs non importées et non warmup), appliquée une seule fois par game
  useEffect(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const g of history.games) {
        if (seen.current.has(g.gameId)) continue;
        seen.current.add(g.gameId);
        if (g.isCustom && !g.imported && !detectWarmup(g, { roster }).isWarmup) next.add(g.gameId);
      }
      return next;
    });
  }, [history.games, roster]);

  // Une game qui s'avère déjà importée (ici ou sur le web) sort de la sélection
  useEffect(() => {
    setSelected((prev) => new Set([...prev].filter((id) => !history.games.find((g) => g.gameId === id && g.imported))));
  }, [history.games]);

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      if (!prev.has(id)) next.add(id);
      return next;
    });
  };

  const finishImport = async () => {
    setImporting(null);
    setImportCount((n) => n + 1);
    fetchHistory();
  };

  // Historique local du client : fenêtre de jours et filtre custom appliqués ici, groupé par jour du plus récent au plus ancien
  const start = new Date().setHours(0, 0, 0, 0) - (daysShown - 1) * DAY_MS;
  const visible = history.games.filter((g) => g.creation >= start && (showAll || g.isCustom)).sort((a, b) => a.creation - b.creation);
  const days = [...new Set(visible.map((g) => new Date(g.creation).setHours(0, 0, 0, 0)))].sort((a, b) => b - a);
  const selectedGames = visible.filter((g) => selected.has(g.gameId));
  // Les blocs sont stockés à minuit UTC (date seule) : on lit les composantes UTC pour retrouver le bon jour local
  const sessionDay = session ? new Date(new Date(session.date).getUTCFullYear(), new Date(session.date).getUTCMonth(), new Date(session.date).getUTCDate()).getTime() : null;
  const offDayCount = session ? selectedGames.filter((g) => new Date(g.creation).setHours(0, 0, 0, 0) !== sessionDay).length : 0;
  const canImport = !!session && selectedGames.length > 0 && lcu.connected && !importing;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-auto p-6 space-y-4 max-w-4xl w-full mx-auto">
        <BlockPicker user={user} value={session} onChange={setSession} />
        <SessionGames session={session} lcu={lcu} refreshKey={importCount} />

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500">Since {new Date(start).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
          <label className="flex items-center gap-1.5 text-slate-400 cursor-pointer">
            <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} className="accent-amber-500" /> Also show non-custom games
          </label>
          <button onClick={() => fetchHistory({ reset: true })} disabled={loading || !lcu.connected} className="ml-auto flex items-center gap-1 text-slate-400 hover:text-white disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        {offDayCount > 0 && (
          <p className="text-xs text-amber-400">
            {offDayCount} selected game{offDayCount > 1 ? "s" : ""} {offDayCount > 1 ? "were" : "was"} not played on the session day ({new Date(sessionDay).toLocaleDateString("en-US", { month: "short", day: "numeric" })}). {offDayCount > 1 ? "They" : "It"} will still be attached to this session.
          </p>
        )}

        {!lcu.connected && <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-slate-500 text-sm">Waiting for the League client…</div>}

        {lcu.connected && !loading && visible.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-slate-500 text-sm">
            No {showAll ? "games" : "custom games"} since {new Date(start).toLocaleDateString("en-US", { month: "short", day: "numeric" })}.
          </div>
        )}

        {loading && history.games.length === 0 && <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-slate-500 text-sm">Reading the client match history…</div>}

        <div className="space-y-4">
          {days.map((day) => (
            <div key={day} className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
                <span className="font-medium text-slate-200 capitalize">{day === new Date().setHours(0, 0, 0, 0) ? "Today" : day === new Date().setHours(0, 0, 0, 0) - DAY_MS ? "Yesterday" : new Date(day).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</span>
                <span>
                  · {visible.filter((g) => new Date(g.creation).setHours(0, 0, 0, 0) === day).length} game{visible.filter((g) => new Date(g.creation).setHours(0, 0, 0, 0) === day).length > 1 ? "s" : ""}
                </span>
                {sessionDay === day && <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-medium">Session day</span>}
                <span className="flex-1 border-t border-slate-800" />
              </div>
              {visible
                .filter((g) => new Date(g.creation).setHours(0, 0, 0, 0) === day)
                .map((g) => (
                  <GameRow key={g.gameId} game={g} roster={roster} checked={selected.has(g.gameId)} onToggle={() => toggle(g.gameId)} />
                ))}
            </div>
          ))}
        </div>

        {lcu.connected && history.games.length > 0 && (history.hasMore || Math.min(...history.games.map((g) => g.creation)) < start) && (
          <div className="flex justify-center pt-2">
            <button onClick={loadMore} disabled={loadingMore} className="text-sm text-slate-400 hover:text-white px-4 py-2 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-50">
              {loadingMore ? "Loading…" : `Show more (${MORE_DAYS} more days)`}
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-slate-800 bg-slate-900/80 px-6 py-3 flex items-center justify-between">
        <span className="text-sm text-slate-400">
          {selectedGames.length} game{selectedGames.length > 1 ? "s" : ""} selected
          {session ? ` → ${session.name || "session"}` : " · pick a session"}
        </span>
        <button onClick={() => canImport && setImporting(selectedGames)} disabled={!canImport} className="flex items-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 font-semibold px-4 py-2 text-sm">
          <Download className="w-4 h-4" /> Import
        </button>
      </div>

      {importing && <ImportPanel games={importing} session={session} user={user} onClose={finishImport} />}
    </div>
  );
}

// ==================== BLOC DE SCRIM ====================

function BlockPicker({ user, value, onChange }) {
  const [sessions, setSessions] = useState([]);
  const [creating, setCreating] = useState(false);

  const fetchSessions = async () => {
    try {
      const { ok, data, code } = await api.post("/scrim-session/search", { team_id: user.team_id });
      if (!ok) return toast.error(code || "Failed to fetch sessions");
      setSessions(data);
    } catch (error) {
      toast.error(error.code || "Failed to fetch sessions");
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [user.team_id]);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Scrim session</h2>
        <button onClick={() => setCreating((v) => !v)} className="text-xs flex items-center gap-1 text-slate-400 hover:text-white">
          {creating ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
          {creating ? "Cancel" : "New session"}
        </button>
      </div>

      {!creating && (
        <select value={value?._id || ""} onChange={(e) => onChange(sessions.find((s) => s._id === e.target.value) || null)} className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm focus:outline-none focus:border-amber-500">
          <option value="">Pick a session…</option>
          {sessions.map((s) => (
            <option key={s._id} value={s._id}>
              {new Date(s.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · {s.name || "Untitled"}
              {s.opponent_name ? ` vs ${s.opponent_name}` : ""}
            </option>
          ))}
        </select>
      )}

      {creating && (
        <NewSessionForm
          user={user}
          onCreated={(created) => {
            setSessions((prev) => [created, ...prev]);
            onChange(created);
            setCreating(false);
          }}
        />
      )}

      {value && (
        <p className="text-xs text-slate-400">
          {value.opponent_name ? (
            <>
              Opponent <span className="text-slate-200">{value.opponent_name}</span> ·{" "}
            </>
          ) : (
            <span className="text-amber-400">No opponent set · </span>
          )}
          {new Date(value.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          {value.patch ? ` · patch ${value.patch}` : ""}
        </p>
      )}
    </div>
  );
}

function NewSessionForm({ user, onCreated }) {
  const [enemies, setEnemies] = useState([]);
  const [form, setForm] = useState({ name: "", opponentId: "", date: new Date().toISOString().slice(0, 10) });
  const [saving, setSaving] = useState(false);

  const fetchEnemies = async () => {
    try {
      const { ok, data, code } = await api.post("/enemy-team/search", { team_id: user.team_id, limit: 200 });
      if (!ok) return toast.error(code || "Failed to fetch opponents");
      setEnemies(data);
    } catch (error) {
      toast.error(error.code || "Failed to fetch opponents");
    }
  };

  useEffect(() => {
    fetchEnemies();
  }, [user.team_id]);

  const create = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { ok, data, code } = await api.post("/scrim-session", {
        name: form.name.trim(),
        opponent_id: enemies.find((x) => x._id === form.opponentId)?._id,
        opponent_name: enemies.find((x) => x._id === form.opponentId)?.name,
        date: new Date(form.date).toISOString(),
      });
      setSaving(false);
      if (!ok) return toast.error(code || "Could not create session");
      onCreated(data);
    } catch (error) {
      setSaving(false);
      toast.error(error.code || "Could not create session");
    }
  };

  return (
    <form onSubmit={create} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      <input placeholder="Session name" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} className="rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
      <select value={form.opponentId} onChange={(e) => setForm((prev) => ({ ...prev, opponentId: e.target.value }))} className="rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm focus:outline-none focus:border-amber-500">
        <option value="">Opponent…</option>
        {enemies.map((t) => (
          <option key={t._id} value={t._id}>
            {t.name}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <input type="date" value={form.date} onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))} className="flex-1 rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
        <button type="submit" disabled={saving || !form.name.trim()} className="rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 font-semibold px-3 text-sm">
          {saving ? "…" : "Create"}
        </button>
      </div>
    </form>
  );
}

// ==================== GAMES IMPORTÉES DU BLOC ====================

// Games déjà importées dans le bloc sélectionné, avec lancement du replay dans le client
function SessionGames({ session, lcu, refreshKey }) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [launching, setLaunching] = useState(null);

  const fetchGames = async () => {
    if (!session?._id) return setGames([]);
    setLoading(true);
    try {
      const { ok, data, code } = await api.post("/game/search", { session_id: session._id, limit: 100, sort: { createdAt: 1 } });
      setLoading(false);
      if (!ok) return toast.error(code || "Failed to fetch games");
      setGames(data);
    } catch (error) {
      setLoading(false);
      toast.error(error.code || "Failed to fetch games");
    }
  };

  useEffect(() => {
    fetchGames();
  }, [session?._id, refreshKey]);

  // Une game supprimée ou ajoutée sur le web : on recharge quand la fenêtre reprend le focus
  useEffect(() => {
    window.addEventListener("focus", fetchGames);
    return () => window.removeEventListener("focus", fetchGames);
  }, [session?._id]);

  useEffect(() => {
    return window.draftedge.replay.onStatus((event) => {
      if (event.status !== "running") setLaunching(null);
    });
  }, []);

  const watch = async (game) => {
    setLaunching(game._id);
    await window.draftedge.replay.watch(game._id);
  };

  if (!session) return null;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-2">
      <div className="flex items-center gap-2">
        <h2 className="font-medium">Imported games</h2>
        {games.length > 0 && <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded-full">{games.length}</span>}
        {loading && <Loader2 className="w-3.5 h-3.5 text-slate-500 animate-spin" />}
      </div>

      {!loading && games.length === 0 && <p className="text-xs text-slate-500">No game imported in this session yet.</p>}

      {games.map((g, idx) => (
        <div key={g._id} className="flex items-center gap-3 rounded-lg border border-slate-800 px-3 py-2 text-sm">
          <span className="text-slate-500 text-[10px] font-mono w-5">G{idx + 1}</span>
          {g.team_side && <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${g.team_side === "blue" ? "bg-blue-500/15 text-blue-400" : "bg-red-500/15 text-red-400"}`}>{g.team_side.toUpperCase()}</span>}
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${g.win ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-700 text-slate-300"}`}>{g.win ? "W" : "L"}</span>
          <div className="flex items-center gap-0.5">
            {ROLES.map((role) =>
              g.champions?.[g.team_side]?.[role] ? <img key={role} src={getChampionIcon(g.champions[g.team_side][role])} alt={g.champions[g.team_side][role]} title={g.champions[g.team_side][role]} className="w-5 h-5 rounded" /> : <div key={role} className="w-5 h-5 rounded bg-slate-800" />,
            )}
          </div>
          <div className="flex-1 min-w-0 truncate">
            <span className="text-slate-200">{g.name || `Game ${g.game_id || ""}`}</span>
            <span className="text-slate-500 text-xs ml-2">{g.duration ? `${Math.floor(g.duration / 60)}:${String(g.duration % 60).padStart(2, "0")}` : ""}</span>
            {g.patch && <span className="text-slate-500 text-xs ml-2">{g.patch.split(".").slice(0, 2).join(".")}</span>}
          </div>
          <button
            onClick={() => watch(g)}
            disabled={!g.rofl?.key || !lcu.connected || !!launching}
            title={!lcu.connected ? "Open the League client first" : !g.rofl?.key ? "Replay file not available (imported before replay storage)" : `Launch in the League client · patch ${g.patch ? g.patch.split(".").slice(0, 2).join(".") : "?"}`}
            className="flex items-center gap-1 rounded-md bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 text-xs font-medium px-2 py-1 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {launching === g._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />} Watch
          </button>
        </div>
      ))}
    </div>
  );
}

// ==================== HISTORIQUE DU CLIENT ====================

function GameRow({ game, roster, checked, onToggle }) {
  const warmup = detectWarmup(game, { roster });

  return (
    <label className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${game.imported || !game.isCustom ? "opacity-50 cursor-not-allowed border-slate-800/60" : "cursor-pointer hover:bg-slate-800/40"} ${checked ? "border-amber-500/50 bg-amber-500/5" : "border-slate-800"}`}>
      <input type="checkbox" checked={checked} disabled={!!game.imported || !game.isCustom} onChange={onToggle} className="accent-amber-500" />

      <div className="w-14 text-xs text-slate-400 tabular-nums">
        <div>{new Date(game.creation).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}</div>
        <div className="text-slate-500">{`${Math.floor(game.duration / 60)}:${String(game.duration % 60).padStart(2, "0")}`}</div>
      </div>

      <div className="flex items-center gap-1">
        {game.mySide && <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${game.mySide === "blue" ? "bg-blue-500/15 text-blue-400" : "bg-red-500/15 text-red-400"}`}>{game.mySide === "blue" ? "BLUE" : "RED"}</span>}
        {game.myWin !== null && <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${game.myWin ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-700 text-slate-300"}`}>{game.myWin ? "W" : "L"}</span>}
      </div>

      <div className="flex-1 flex items-center gap-3 min-w-0">
        <Team players={game.participants.filter((p) => p.side === game.mySide)} />
        <span className="text-slate-600 text-xs">vs</span>
        <Team players={game.participants.filter((p) => p.side && p.side !== game.mySide)} dim />
        {!game.detailed && game.myChampionId && <img src={getChampionIcon(game.myChampionId)} alt="" className="w-6 h-6 rounded" />}
      </div>

      <div className="flex items-center gap-2 text-xs shrink-0">
        {warmup.rosterCount !== null && (
          <span className="flex items-center gap-1 text-slate-400" title="Roster players on your team">
            <Users className="w-3 h-3" /> {warmup.rosterCount}/5
          </span>
        )}
        {game.imported && (
          <span className="flex items-center gap-1 text-emerald-400" title={game.imported.session_name ? `Already in “${game.imported.session_name}”` : "Already imported"}>
            <CheckCircle2 className="w-3.5 h-3.5" /> Imported{game.imported.session_name ? ` · ${game.imported.session_name}` : ""}
          </span>
        )}
        {!game.imported && warmup.isWarmup && (
          <span className="flex items-center gap-1 text-amber-400" title={warmup.reasons.join(", ")}>
            <AlertTriangle className="w-3.5 h-3.5" /> {warmup.reasons[0]}
          </span>
        )}
      </div>
    </label>
  );
}

function Team({ players, dim }) {
  if (!players.length) return <span className="text-slate-600 text-xs">—</span>;
  return (
    <div className={`flex -space-x-1 ${dim ? "opacity-70" : ""}`}>
      {players.map((p) => (
        <img key={p.participantId} src={getChampionIcon(p.championId)} alt={p.championName || ""} title={`${p.championName || p.championId} · ${p.gameName}${p.tagLine ? "#" + p.tagLine : ""}`} className="w-6 h-6 rounded ring-1 ring-slate-900" />
      ))}
    </div>
  );
}

// ==================== PANNEAU D'IMPORT ====================

const IMPORT_ICONS = {
  pending: <Clock className="w-4 h-4 text-slate-500" />,
  downloading: <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />,
  uploading: <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />,
  done: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
  duplicate: <Copy className="w-4 h-4 text-slate-400" />,
  error: <XCircle className="w-4 h-4 text-red-400" />,
  cancelled: <X className="w-4 h-4 text-slate-500" />,
};

// Lance l'import dès le montage et affiche la progression par game. onClose() est appelé quand l'utilisateur ferme le panneau une fois terminé.
function ImportPanel({ games, session, user, onClose }) {
  const [states, setStates] = useState(() => Object.fromEntries(games.map((g) => [g.gameId, { status: "pending", message: "Pending" }])));
  const [summary, setSummary] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    const off = window.draftedge.import.onProgress((ev) => {
      setStates((prev) => ({ ...prev, [ev.gameId]: { status: ev.status, message: ev.message, progress: ev.progress } }));
    });
    window.draftedge.import.run({ games, session, user }).then((res) => {
      if (!res.ok) return setSummary({ error: res.code });
      setSummary({
        done: res.results.filter((r) => r.status === "done").length,
        duplicate: res.results.filter((r) => r.status === "duplicate").length,
        failed: res.results.filter((r) => r.status === "error").length,
        cancelled: res.results.filter((r) => r.status === "cancelled").length,
      });
    });
    return off;
  }, []);

  const cancel = async () => {
    setCancelling(true);
    await window.draftedge.import.cancel();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
        <div className="px-5 py-4 border-b border-slate-800">
          <h2 className="font-semibold">Import to “{session.name || "session"}”</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {games.length} game{games.length > 1 ? "s" : ""} · the client downloads each replay, then DraftEdge analyzes it
          </p>
        </div>

        <div className="max-h-80 overflow-auto px-5 py-3 space-y-2">
          {[...games]
            .sort((a, b) => a.creation - b.creation)
            .map((g, i) => (
              <div key={g.gameId} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 shrink-0">{IMPORT_ICONS[states[g.gameId].status] || IMPORT_ICONS.pending}</span>
                <span className="text-slate-500 text-xs w-10 tabular-nums mt-0.5 shrink-0">{new Date(g.creation).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}</span>
                <span className="text-slate-300 w-16 shrink-0">Game {i + 1}</span>
                <span className={`flex-1 text-xs break-all ${states[g.gameId].status === "error" ? "text-red-400" : "text-slate-400"}`}>{states[g.gameId].message}</span>
              </div>
            ))}
        </div>

        <div className="px-5 py-4 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            {!summary && "Import in progress… do not close the League client."}
            {summary?.error && <span className="text-red-400">{summary.error}</span>}
            {summary && !summary.error && (
              <span>
                <span className="text-emerald-400">{summary.done} imported</span>
                {summary.duplicate > 0 && (
                  <span>
                    {" "}
                    · {summary.duplicate} duplicate{summary.duplicate > 1 ? "s" : ""}
                  </span>
                )}
                {summary.failed > 0 && <span className="text-red-400"> · {summary.failed} failed</span>}
                {summary.cancelled > 0 && <span> · {summary.cancelled} cancelled</span>}
              </span>
            )}
          </div>
          {!summary && (
            <button onClick={cancel} disabled={cancelling} className="text-sm text-slate-400 hover:text-white disabled:opacity-50">
              {cancelling ? "Stopping after the current game…" : "Cancel"}
            </button>
          )}
          {summary && (
            <button onClick={onClose} className="rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold px-4 py-2 text-sm">
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
