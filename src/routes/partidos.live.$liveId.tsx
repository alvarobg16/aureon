import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ModuleShell } from "@/components/ModuleShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Play, Pause, Flag, ArrowLeft, Plus, Minus, Shield, User, Clock,
  Square, AlertOctagon, Goal as GoalIcon, RefreshCw, TimerReset,
} from "lucide-react";
import { toast } from "sonner";
import { FutsalPitch } from "@/components/FutsalPitch";
import { FutsalGoal } from "@/components/FutsalGoal";
import { getCategories, type GoalSide } from "@/lib/goalCategories";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { liveSb, saveSnapshot, loadSnapshot, setActiveMatchId, clearActiveMatchId } from "@/lib/liveSync";
import { LiveSyncBadge } from "@/components/LiveSyncBadge";
import { normalizePeriod } from "@/lib/liveNormalize";

const Whistle = AlertOctagon;

export const Route = createFileRoute("/partidos/live/$liveId")({
  head: () => ({ meta: [{ title: "LIVE — partido en curso" }] }),
  component: LiveMatch,
});

type LiveMatch = {
  id: string;
  fixture_id: string | null;
  season_id: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
  own_side: "home" | "away";
  status: "live" | "finished";
  current_period: number;
  elapsed_seconds: number;
  fouls_home_p1: number; fouls_away_p1: number;
  fouls_home_p2: number; fouls_away_p2: number;
  score_home: number; score_away: number;
  called_player_ids: string[];
  on_court_ids: string[];
  finished_at: string | null;
  timeout_home_p1: boolean; timeout_away_p1: boolean;
  timeout_home_p2: boolean; timeout_away_p2: boolean;
};
type Player = {
  id: string; first_name: string; last_name: string; sport_name: string;
  jersey_number: number | null; position: string;
};
type LivePT = { player_id: string; total_seconds: number; current_stint_started_at: number | null };

// Botones del menú ACCIONES (jugadores de campo)
const ACTION_BUTTONS: string[] = [
  "RECUPERACIÓN",
  "PÉRDIDA",
  "TIRO PORTERÍA",
  "TIRO FUERA",
  "TIRO INTERCEPTADO",
  "TIRO AL PALO",
  "PENALTI FALLADO",
  "10M FALLADO",
];

// Acciones específicas del PORTERO (incluyen las de campo + PARADA + 10M PARADO)
const GOALIE_ACTION_BUTTONS: string[] = [
  "PARADA",
  "10M PARADO",
  ...ACTION_BUTTONS,
];

// Sin tope de cronómetro: avanza de forma continua hasta que el analista cierre el periodo.

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
const periodLabel = (p: number) => p === 1 ? "1ª PARTE" : p === 2 ? "2ª PARTE" : p === 3 ? "PRÓRROGA 1" : "PRÓRROGA 2";

// Icono SVG: árbitro haciendo "T" con las manos (tiempo muerto)
function TimeoutIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="4" r="2" />
      <path d="M12 6v6" />
      <path d="M5 12h14" />
      <path d="M12 12v5" />
      <path d="M9 22l3-5 3 5" />
    </svg>
  );
}

function LiveMatch() {
  const { liveId } = Route.useParams();
  const [match, setMatch] = useState<LiveMatch | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [pt, setPt] = useState<Record<string, LivePT>>({});
  const [running, setRunning] = useState(false);
  const [now, setNow] = useState(0);
  const [periodFouls, setPeriodFouls] = useState({ home: 0, away: 0 });
  const [teamNames, setTeamNames] = useState<{ home: string; away: string }>({ home: "Local", away: "Visitante" });
  const [confirmEnd, setConfirmEnd] = useState(false);

  // Sustituciones: jugador a sustituir → elegir uno del banquillo
  const [subOut, setSubOut] = useState<string | null>(null);

  const [panelOpen, setPanelOpen] = useState<null | { kind: "field" | "goalie"; playerId: string }>(null);

  // Tarjetas propias: playerId → nº de amarillas (>=2 = expulsado / roja)
  const [ownYellows, setOwnYellows] = useState<Record<string, number>>({});
  const [ownReds, setOwnReds] = useState<Record<string, boolean>>({});
  // Tarjetas rivales: dorsal (number) → "yellow" | "red"
  const [rivalCards, setRivalCards] = useState<Record<number, "yellow" | "red">>({});
  const [rivalCardOpen, setRivalCardOpen] = useState<null | "yellow" | "red">(null);
  const [rivalNumberInput, setRivalNumberInput] = useState<string>("");

  const [stepDialog, setStepDialog] = useState<null | {
    playerId: string;
    eventKind: "action" | "foul" | "card" | "red_ball" | "goal";
    category: string;
    subcategory: string;
    pitch?: { x: number; y: number };
    goal?: { x: number; y: number };
    step: "category" | "pitch" | "goal" | "saving";
    delta?: 1 | -1;
    // edición de un evento/gol existente
    editId?: string;
    editTable?: "live_events" | "goals";
  }>(null);

  // Historial de acciones (eventos + goles) para el panel inferior editable
  type HistRow = {
    id: string;
    table: "live_events" | "goals";
    kind: string; // 'action' | 'foul' | 'card' | 'goal' | 'red_ball'
    category: string;
    subcategory: string;
    player_id: string | null;
    minute: number | null;
    period: number | null;
    pitch_x: number | null; pitch_y: number | null;
    goal_x: number | null; goal_y: number | null;
    created_at: string;
  };
  const [history, setHistory] = useState<HistRow[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  // Diálogo para cambiar el jugador asignado a una acción concreta del historial.
  const [editPlayerRow, setEditPlayerRow] = useState<HistRow | null>(null);
  const [editPlayerSel, setEditPlayerSel] = useState<string>("");

  const load = async () => {
    const { data: m, error: mErr } = await liveSb.from("live_matches").select("*").eq("id", liveId).maybeSingle();
    if (!m) {
      // Sin red o sin permiso ⇒ intentar hidratar desde snapshot local.
      const snap = await loadSnapshot(liveId).catch(() => undefined);
      if (snap?.data?.match) {
        const mm = snap.data.match as LiveMatch;
        setMatch(mm);
        setPlayers(snap.data.players ?? []);
        setPt(snap.data.pt ?? {});
        setNow(snap.data.now ?? mm.elapsed_seconds ?? 0);
        setRunning(false); // por seguridad: arrancar parado tras recuperación
        setOwnYellows(snap.data.ownYellows ?? {});
        setOwnReds(snap.data.ownReds ?? {});
        setRivalCards(snap.data.rivalCards ?? {});
        toast.message("Partido restaurado desde almacenamiento local");
        return;
      }
      if (mErr) toast.error("No se pudo cargar el partido");
      return;
    }
    const mm = m as LiveMatch;
    setMatch(mm);

    setPeriodFouls(mm.current_period === 1
      ? { home: mm.fouls_home_p1, away: mm.fouls_away_p1 }
      : { home: mm.fouls_home_p2, away: mm.fouls_away_p2 });
    setNow(mm.elapsed_seconds);

    const ids = mm.called_player_ids ?? [];
    if (ids.length) {
      const { data: pl } = await supabase
        .from("players")
        .select("id,first_name,last_name,sport_name,jersey_number,position")
        .in("id", ids);
      setPlayers((pl as Player[]) ?? []);
    } else setPlayers([]);

    const { data: tt } = await liveSb.from("live_player_time").select("*").eq("live_match_id", liveId);
    const map: Record<string, LivePT> = {};
    ((tt as any[]) ?? []).forEach((r) => (map[r.player_id] = { player_id: r.player_id, total_seconds: r.total_seconds, current_stint_started_at: r.current_stint_started_at }));
    setPt(map);

    // Cargar tarjetas (propias y rivales) desde live_events
    const { data: cardEvs } = await supabase
      .from("live_events").select("player_id, category, subcategory")
      .eq("live_match_id", liveId).eq("kind", "card");
    const yel: Record<string, number> = {};
    const red: Record<string, boolean> = {};
    const riv: Record<number, "yellow" | "red"> = {};
    ((cardEvs as any[]) ?? []).forEach((e) => {
      if (e.category === "RIVAL_CARD") {
        const m = String(e.subcategory ?? "").match(/^(AMARILLA|ROJA)#(\d+)$/);
        if (m) {
          const n = parseInt(m[2], 10);
          // si ya hay roja, mantener roja
          if (riv[n] !== "red") riv[n] = m[1] === "ROJA" ? "red" : "yellow";
        }
      } else if (e.player_id) {
        if (e.subcategory === "AMARILLA") yel[e.player_id] = (yel[e.player_id] ?? 0) + 1;
        else if (e.subcategory === "ROJA") red[e.player_id] = true;
      }
    });
    // 2ª amarilla = roja automática
    Object.keys(yel).forEach((pid) => { if ((yel[pid] ?? 0) >= 2) red[pid] = true; });
    setOwnYellows(yel);
    setOwnReds(red);
    setRivalCards(riv);

    const teamIds = [mm.home_team_id, mm.away_team_id].filter(Boolean) as string[];
    if (teamIds.length) {
      const { data: ts } = await supabase.from("season_teams").select("id,name").in("id", teamIds);
      const tm: any = {};
      ((ts as any[]) ?? []).forEach((t) => (tm[t.id] = t.name));
      setTeamNames({
        home: (mm.home_team_id && tm[mm.home_team_id]) || "Local",
        away: (mm.away_team_id && tm[mm.away_team_id]) || "Visitante",
      });
    }
  };

  const loadHistory = async (mm?: LiveMatch | null) => {
    const cur = mm ?? match;
    if (!cur) return;
    const { data: evs } = await supabase
      .from("live_events")
      .select("id, kind, category, subcategory, player_id, minute, period, pitch_x, pitch_y, goal_x, goal_y, created_at")
      .eq("live_match_id", liveId)
      .order("created_at", { ascending: false });
    const eventRows: HistRow[] = ((evs as any[]) ?? []).map((e) => ({
      id: e.id, table: "live_events",
      kind: e.kind, category: e.category, subcategory: e.subcategory,
      player_id: e.player_id, minute: e.minute, period: e.period,
      pitch_x: e.pitch_x, pitch_y: e.pitch_y, goal_x: e.goal_x, goal_y: e.goal_y,
      created_at: e.created_at,
    }));
    let goalRows: HistRow[] = [];
    if (cur.fixture_id) {
      const { data: gs } = await supabase
        .from("goals")
        .select("id, side, category, subcategory, scorer_id, minute, period, pitch_x, pitch_y, goal_x, goal_y, created_at")
        .eq("fixture_id", cur.fixture_id)
        .order("created_at", { ascending: false });
      goalRows = ((gs as any[]) ?? []).map((g) => ({
        id: g.id, table: "goals",
        kind: g.side === "for" ? "goal" : "red_ball",
        category: g.category, subcategory: g.subcategory,
        player_id: g.scorer_id, minute: g.minute, period: g.period,
        pitch_x: g.pitch_x, pitch_y: g.pitch_y, goal_x: g.goal_x, goal_y: g.goal_y,
        created_at: g.created_at,
      }));
    }
    const all = [...eventRows, ...goalRows].sort((a, b) =>
      (b.created_at ?? "").localeCompare(a.created_at ?? ""),
    );
    setHistory(all);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [liveId]);
  useEffect(() => { if (match) loadHistory(match); /* eslint-disable-next-line */ }, [match?.id]);

  const runningRef = useRef(running);
  runningRef.current = running;
  useEffect(() => {
    if (!running) return;
    // Cronómetro continuo: no se detiene al llegar al minuto reglamentario.
    // El analista decide cuándo finalizar el periodo; al cerrarlo se reescalan
    // todos los eventos al tiempo efectivo oficial (20 min P1/P2, 5 min prórrogas).
    const t = setInterval(() => setNow((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  useEffect(() => {
    if (!match || !running) return;
    if (now % 5 !== 0) return;
    liveSb.from("live_matches").update({ elapsed_seconds: now }).eq("id", match.id).then(() => {});
  }, [now, running, match]);

  // Snapshot persistente del partido en curso (IndexedDB) + marca de partido activo.
  useEffect(() => {
    if (!match) return;
    const t = setTimeout(() => {
      void saveSnapshot(liveId, {
        match, players, pt, ownYellows, ownReds, rivalCards,
        now, running, savedAt: Date.now(),
      });
    }, 500);
    return () => clearTimeout(t);
  }, [liveId, match, players, pt, ownYellows, ownReds, rivalCards, now, running]);

  useEffect(() => {
    if (!match) return;
    if (match.status === "finished") void clearActiveMatchId();
    else void setActiveMatchId(liveId);
  }, [liveId, match?.status]);

  const onCourt = useMemo(() => (match?.on_court_ids ?? []), [match]);
  const onBench = useMemo(
    () => players.filter((p) => !onCourt.includes(p.id) && !ownReds[p.id]),
    [players, onCourt, ownReds]
  );
  const expelled = useMemo(
    () => players.filter((p) => ownReds[p.id]),
    [players, ownReds]
  );
  const onCourtPlayers = useMemo(
    () => onCourt.map((id) => players.find((p) => p.id === id)).filter(Boolean) as Player[],
    [onCourt, players]
  );

  const playingSeconds = (pid: string): number => {
    const r = pt[pid];
    if (!r) return 0;
    if (r.current_stint_started_at == null) return r.total_seconds;
    return r.total_seconds + Math.max(0, now - r.current_stint_started_at);
  };

  // Toggle simple para selección inicial de los 5 antes de arrancar
  const togglePlayer = async (id: string) => {
    if (!match) return;
    if (running) {
      // En partido, no se "suben" jugadores tocando la card. Hay que usar SUSTITUCIÓN
      return;
    }
    const onIt = onCourt.includes(id);
    let next: string[];
    if (onIt) next = onCourt.filter((x) => x !== id);
    else {
      if (onCourt.length >= 5) return toast.error("Máximo 5 jugadores en pista");
      next = [...onCourt, id];
    }
    setMatch({ ...match, on_court_ids: next });
    await liveSb.from("live_matches").update({ on_court_ids: next }).eq("id", match.id);
  };

  // Sustitución: saca a outId, mete a inId. Cierra/abre stints si el reloj corre.
  const substitute = async (outId: string, inId: string) => {
    if (!match) return;
    if (!onCourt.includes(outId) || onCourt.includes(inId)) return;
    const next = onCourt.map((x) => (x === outId ? inId : x));
    setMatch({ ...match, on_court_ids: next });
    await liveSb.from("live_matches").update({ on_court_ids: next }).eq("id", match.id);

    if (running) {
      const out = pt[outId];
      const stintStart = out?.current_stint_started_at ?? now;
      const totalOut = (out?.total_seconds ?? 0) + Math.max(0, now - stintStart);
      const inEx = pt[inId];
      await liveSb.from("live_player_time").upsert([
        { live_match_id: match.id, player_id: outId, total_seconds: totalOut, current_stint_started_at: null },
        { live_match_id: match.id, player_id: inId, total_seconds: inEx?.total_seconds ?? 0, current_stint_started_at: now },
      ], { onConflict: "live_match_id,player_id" });
      setPt({
        ...pt,
        [outId]: { player_id: outId, total_seconds: totalOut, current_stint_started_at: null },
        [inId]: { player_id: inId, total_seconds: inEx?.total_seconds ?? 0, current_stint_started_at: now },
      });
    }
    toast.success("Sustitución realizada");
  };

  const toggleRun = async () => {
    if (!match) return;
    if (!running) {
      if (onCourt.length !== 5) return toast.error("Selecciona 5 jugadores en pista para empezar");
      const updates = onCourt.map((pid) => ({
        live_match_id: match.id,
        player_id: pid,
        total_seconds: pt[pid]?.total_seconds ?? 0,
        current_stint_started_at: now,
      }));
      await liveSb.from("live_player_time").upsert(updates, { onConflict: "live_match_id,player_id" });
      const next = { ...pt };
      updates.forEach((u) => { next[u.player_id] = { player_id: u.player_id, total_seconds: u.total_seconds, current_stint_started_at: u.current_stint_started_at }; });
      setPt(next);
      setRunning(true);
    } else {
      const updates = onCourt.map((pid) => {
        const r = pt[pid];
        const stintStart = r?.current_stint_started_at ?? now;
        const add = Math.max(0, now - stintStart);
        const total = (r?.total_seconds ?? 0) + add;
        return { live_match_id: match.id, player_id: pid, total_seconds: total, current_stint_started_at: null };
      });
      if (updates.length) await liveSb.from("live_player_time").upsert(updates, { onConflict: "live_match_id,player_id" });
      const next = { ...pt };
      updates.forEach((u) => { next[u.player_id] = { player_id: u.player_id, total_seconds: u.total_seconds, current_stint_started_at: null }; });
      setPt(next);
      await liveSb.from("live_matches").update({ elapsed_seconds: now }).eq("id", match.id);
      setRunning(false);
    }
  };

  // Cierra una parte: guarda su duración real (segundos) y reescala todos los
  // eventos/goles de esa parte al tiempo efectivo reglamentario (20 min en
  // P1/P2, 5 min en prórrogas) con precisión de segundos y preservando el
  // orden cronológico estricto.
  const closePeriod = async (matchId: string, period: number, realSeconds: number) => {
    const colDur =
      period === 1 ? "real_duration_p1" :
      period === 2 ? "real_duration_p2" :
      period === 3 ? "real_duration_p3" : "real_duration_p4";
    await liveSb.from("live_matches").update({ [colDur]: realSeconds } as any).eq("id", matchId);

    // Eventos del periodo
    const { data: evs } = await supabase
      .from("live_events")
      .select("id, minute, real_seconds, created_at")
      .eq("live_match_id", matchId)
      .eq("period", period);
    const evPatches = normalizePeriod((evs as any[]) ?? [], realSeconds, period);
    for (const p of evPatches) {
      await liveSb.from("live_events").update({
        effective_minute: p.effective_minute,
        effective_seconds: p.effective_seconds,
      } as any).eq("id", p.id);
    }

    // Goles del periodo (filtramos por live_match_id, no por fixture_id).
    const { data: gs } = await supabase
      .from("goals")
      .select("id, minute, real_seconds, created_at")
      .eq("live_match_id", matchId)
      .eq("period", period);
    const goalPatches = normalizePeriod((gs as any[]) ?? [], realSeconds, period);
    for (const p of goalPatches) {
      await liveSb.from("goals").update({
        effective_minute: p.effective_minute,
        effective_seconds: p.effective_seconds,
      } as any).eq("id", p.id);
    }
  };


  // Cambia de periodo (avanzar o reabrir uno anterior). Guarda el estado del
  // periodo actual (faltas + duración real + reescalado de eventos), y al
  // entrar en el destino restaura su elapsed real anterior si ya se había
  // jugado. Si nunca se ha jugado, arranca a 0.
  const gotoPeriod = async (target: number) => {
    if (!match) return;
    if (target < 1 || target > 4) return;
    if (target === match.current_period) return;
    if (running) await toggleRun();

    const currentP = match.current_period;
    const currentSec = now;

    // Persistir faltas del periodo actual
    const currentFoulsPatch: any =
      currentP === 1
        ? { fouls_home_p1: periodFouls.home, fouls_away_p1: periodFouls.away }
        : currentP === 2
        ? { fouls_home_p2: periodFouls.home, fouls_away_p2: periodFouls.away }
        : {};

    // Recalcular tiempo efectivo del periodo que dejamos (siempre, aunque
    // sea una reapertura: así las estadísticas reflejan los últimos ajustes).
    await closePeriod(match.id, currentP, currentSec);

    // Releer estado completo para conocer real_duration y faltas del destino
    const { data: m2 } = await supabase
      .from("live_matches")
      .select("*")
      .eq("id", match.id)
      .maybeSingle();
    const mm = (m2 as any) ?? {};
    const destDurCol = `real_duration_p${target}`;
    const destDur = Number(mm[destDurCol] ?? 0) || 0;
    const destFouls =
      target === 1
        ? { home: mm.fouls_home_p1 ?? 0, away: mm.fouls_away_p1 ?? 0 }
        : target === 2
        ? { home: mm.fouls_home_p2 ?? 0, away: mm.fouls_away_p2 ?? 0 }
        : { home: 0, away: 0 };

    await liveSb.from("live_matches").update({
      ...currentFoulsPatch,
      current_period: target,
      elapsed_seconds: destDur,
    }).eq("id", match.id);

    setMatch({ ...match, ...(currentFoulsPatch as any), current_period: target, elapsed_seconds: destDur });
    setNow(destDur);
    setPeriodFouls(destFouls);
    await loadHistory({ ...match, current_period: target } as LiveMatch);

    if (target < currentP) {
      toast.success(`${periodLabel(target)} reabierta · puedes editar acciones`);
    } else {
      toast.success(`${periodLabel(currentP)} cerrada · acciones ajustadas a ${currentP <= 2 ? "20" : "5"} min`);
    }
  };

  const nextPeriod = async () => {
    if (!match) return;
    await gotoPeriod(Math.min(4, match.current_period + 1));
  };

  const reopenPreviousPeriod = async () => {
    if (!match) return;
    if (match.current_period <= 1) return;
    await gotoPeriod(match.current_period - 1);
  };


  const adjustFouls = async (side: "home" | "away", delta: number) => {
    if (!match) return;
    const next = { ...periodFouls, [side]: Math.max(0, periodFouls[side] + delta) };
    setPeriodFouls(next);
    const patch: any = match.current_period === 1
      ? { fouls_home_p1: next.home, fouls_away_p1: next.away }
      : { fouls_home_p2: next.home, fouls_away_p2: next.away };
    await liveSb.from("live_matches").update(patch).eq("id", match.id);
  };

  // Tiempo muerto: una vez por parte y por equipo. Solo P1/P2.
  const timeoutUsed = (side: "home" | "away") => {
    if (!match) return false;
    if (match.current_period === 1) return side === "home" ? match.timeout_home_p1 : match.timeout_away_p1;
    if (match.current_period === 2) return side === "home" ? match.timeout_home_p2 : match.timeout_away_p2;
    return true; // en prórroga deshabilitamos
  };
  const requestTimeout = async (side: "home" | "away") => {
    if (!match) return;
    if (match.current_period > 2) return toast.info("Sin tiempos muertos en prórroga");
    if (timeoutUsed(side)) return;
    const col =
      match.current_period === 1
        ? (side === "home" ? "timeout_home_p1" : "timeout_away_p1")
        : (side === "home" ? "timeout_home_p2" : "timeout_away_p2");
    const patch: any = { [col]: true };
    await liveSb.from("live_matches").update(patch).eq("id", match.id);
    setMatch({ ...match, ...patch });
    if (running) await toggleRun();
    toast.success(`Tiempo muerto ${side === "home" ? teamNames.home : teamNames.away}`);
  };

  const openActions = (playerId: string) => {
    const p = players.find((x) => x.id === playerId);
    if (!p) return;
    setPanelOpen({ kind: p.position === "Portero" ? "goalie" : "field", playerId });
  };

  const startEvent = (
    playerId: string,
    eventKind: "action" | "foul" | "card" | "red_ball" | "goal",
    category: string,
    subcategory: string,
    delta: 1 | -1 = 1,
  ) => {
    setPanelOpen(null);
    // Tarjetas no requieren coordenadas
    if (eventKind === "card") {
      saveEvent({ playerId, eventKind, category, subcategory, step: "saving", delta });
      return;
    }
    // Restar gol: no necesita categoría ni coordenadas
    if ((eventKind === "goal" || eventKind === "red_ball") && delta === -1) {
      saveEvent({ playerId, eventKind, category, subcategory, step: "saving", delta });
      return;
    }
    // Sumar gol: pedir categoría/subcategoría primero
    if (eventKind === "goal" || eventKind === "red_ball") {
      setStepDialog({ playerId, eventKind, category: "", subcategory: "", step: "category", delta });
      return;
    }
    setStepDialog({ playerId, eventKind, category, subcategory, step: "pitch", delta });
  };

  const onPitchPick = (x: number, y: number) => {
    if (!stepDialog) return;
    if (stepDialog.eventKind === "goal" || stepDialog.eventKind === "red_ball") {
      setStepDialog({ ...stepDialog, pitch: { x, y }, step: "goal" });
    } else {
      setStepDialog({ ...stepDialog, pitch: { x, y }, step: "saving" });
      saveEvent({ ...stepDialog, pitch: { x, y } });
    }
  };
  const onGoalPick = (x: number, y: number) => {
    if (!stepDialog) return;
    setStepDialog({ ...stepDialog, goal: { x, y }, step: "saving" });
    saveEvent({ ...stepDialog, goal: { x, y } });
  };

  // Expulsa a un jugador propio: lo saca de pista. Permanece en el listado como
  // EXPULSADO (no podrá volver a jugar) pero el usuario podrá meter a otro
  // jugador desde el banquillo en su lugar usando el botón "C".
  const expelPlayer = async (pid: string) => {
    if (!match) return;
    // Cerrar stint si estaba en pista y el reloj corre
    const wasOnCourt = onCourt.includes(pid);
    if (wasOnCourt && running) {
      const r = pt[pid];
      const stintStart = r?.current_stint_started_at ?? now;
      const total = (r?.total_seconds ?? 0) + Math.max(0, now - stintStart);
      await liveSb.from("live_player_time").upsert(
        [{ live_match_id: match.id, player_id: pid, total_seconds: total, current_stint_started_at: null }],
        { onConflict: "live_match_id,player_id" },
      );
      setPt({ ...pt, [pid]: { player_id: pid, total_seconds: total, current_stint_started_at: null } });
    }
    const nextOnCourt = onCourt.filter((x) => x !== pid);
    await liveSb.from("live_matches").update({
      on_court_ids: nextOnCourt,
    }).eq("id", match.id);
    setMatch({ ...match, on_court_ids: nextOnCourt });
  };

  // Mete a un jugador del banquillo directamente a pista (para reemplazar a un
  // expulsado). Se usa cuando el quinteto está incompleto por expulsión.
  const fillCourtFromBench = async (inId: string) => {
    if (!match) return;
    if (onCourt.includes(inId)) return;
    if (onCourt.length >= 5) return toast.error("Ya hay 5 jugadores en pista");
    if (ownReds[inId]) return toast.error("Jugador expulsado");
    const next = [...onCourt, inId];
    setMatch({ ...match, on_court_ids: next });
    await liveSb.from("live_matches").update({ on_court_ids: next }).eq("id", match.id);
    if (running) {
      const inEx = pt[inId];
      await liveSb.from("live_player_time").upsert(
        [{ live_match_id: match.id, player_id: inId, total_seconds: inEx?.total_seconds ?? 0, current_stint_started_at: now }],
        { onConflict: "live_match_id,player_id" },
      );
      setPt({ ...pt, [inId]: { player_id: inId, total_seconds: inEx?.total_seconds ?? 0, current_stint_started_at: now } });
    }
    toast.success("Jugador incorporado a pista");
  };

  // Registrar tarjeta a un jugador rival (por dorsal). Si ya tiene amarilla y se vuelve a
  // amonestar con TA → se convierte automáticamente en roja.
  const registerRivalCard = async (number: number, requested: "yellow" | "red") => {
    if (!match) return;
    const current = rivalCards[number];
    let final: "yellow" | "red" = requested;
    if (requested === "yellow" && current === "yellow") final = "red";
    if (current === "red") {
      toast.info(`#${number} ya tiene roja`);
      return;
    }
    const sub = (final === "red" ? "ROJA" : "AMARILLA") + "#" + number;
    await liveSb.from("live_events").insert({
      live_match_id: match.id,
      player_id: null,
      kind: "card",
      category: "RIVAL_CARD",
      subcategory: sub,
      pitch_x: null, pitch_y: null,
      goal_x: null, goal_y: null,
      period: match.current_period,
      minute: Math.floor(now / 60),
      real_seconds: now,
      on_court_ids: onCourt,
    } as any);
    setRivalCards({ ...rivalCards, [number]: final });
    await loadHistory(match);
    if (final === "red" && requested === "yellow") {
      toast.error(`#${number} · 2ª amarilla → ROJA`);
    } else {
      toast.success(`#${number} · ${final === "red" ? "ROJA" : "AMARILLA"} rival`);
    }
  };

  const saveEvent = async (s: NonNullable<typeof stepDialog>) => {
    if (!match) return;

    // EDICIÓN de un evento/gol existente: solo actualizamos los campos
    // (coords + categoría/subcategoría). No tocamos marcador/faltas para no
    // duplicar efectos colaterales.
    if (s.editId && s.editTable) {
      const patch: any = {
        category: s.category,
        subcategory: s.subcategory,
        pitch_x: s.pitch?.x ?? null, pitch_y: s.pitch?.y ?? null,
      };
      if (s.editTable === "goals" || s.eventKind === "goal" || s.eventKind === "red_ball") {
        patch.goal_x = s.goal?.x ?? null;
        patch.goal_y = s.goal?.y ?? null;
      }
      await supabase.from(s.editTable).update(patch).eq("id", s.editId);
      toast.success("Acción modificada");
      setStepDialog(null);
      await loadHistory(match);
      return;
    }

    // Tiempo REAL dentro de la parte. Guardamos segundos (precisión)
    // y también minutos (compat). Se reescala al cerrar el periodo.
    const realSeconds = now;
    const realMinute = Math.floor(now / 60);
    const period = match.current_period;
    const minute = realMinute;

    const delta = s.delta ?? 1;

    if (s.eventKind === "goal") {
      const ownIsHome = match.own_side === "home";
      const newScore = ownIsHome
        ? { score_home: Math.max(0, match.score_home + delta) }
        : { score_away: Math.max(0, match.score_away + delta) };
      if (delta > 0) {
        await liveSb.from("goals").insert({
          fixture_id: match.fixture_id,
          live_match_id: match.id,
          scorer_id: s.playerId,
          side: "for",
          score_for: 0, score_against: 0, ordinal: 1,
          category: s.category, subcategory: s.subcategory,
          pitch_x: s.pitch?.x ?? null, pitch_y: s.pitch?.y ?? null,
          goal_x: s.goal?.x ?? null, goal_y: s.goal?.y ?? null,
          players_on_court: onCourt,
          minute,
          real_seconds: realSeconds,
          period,
        } as any);
      }
      await liveSb.from("live_matches").update(newScore).eq("id", match.id);
      setMatch({ ...match, ...(newScore as any) });
      toast.success(delta > 0 ? "¡GOL MARCADO!" : "Gol descontado");
    } else if (s.eventKind === "red_ball") {
      const ownIsHome = match.own_side === "home";
      const newScore = ownIsHome
        ? { score_away: Math.max(0, match.score_away + delta) }
        : { score_home: Math.max(0, match.score_home + delta) };
      if (delta > 0) {
        await liveSb.from("goals").insert({
          fixture_id: match.fixture_id,
          live_match_id: match.id,
          scorer_id: null,
          side: "against",
          score_for: 0, score_against: 0, ordinal: 1,
          category: s.category, subcategory: s.subcategory,
          pitch_x: s.pitch?.x ?? null, pitch_y: s.pitch?.y ?? null,
          goal_x: s.goal?.x ?? null, goal_y: s.goal?.y ?? null,
          players_on_court: onCourt,
          minute,
          real_seconds: realSeconds,
          period,
        } as any);
      }
      await liveSb.from("live_matches").update(newScore).eq("id", match.id);
      setMatch({ ...match, ...(newScore as any) });
      toast.error(delta > 0 ? "Gol recibido" : "Gol rival descontado");
    } else {
      await liveSb.from("live_events").insert({
        live_match_id: match.id,
        player_id: s.playerId,
        kind: s.eventKind,
        category: s.category,
        subcategory: s.subcategory,
        pitch_x: s.pitch?.x ?? null, pitch_y: s.pitch?.y ?? null,
        goal_x: null, goal_y: null,
        period: match.current_period,
        minute,
        real_seconds: realSeconds,
        on_court_ids: onCourt,
      } as any);
      const ownIsHome = match.own_side === "home";
      if (s.eventKind === "foul") {
        if (s.category === "COMETIDA") {
          await adjustFouls(ownIsHome ? "home" : "away", 1);
        } else {
          await adjustFouls(ownIsHome ? "away" : "home", 1);
        }
      }
      if (s.eventKind === "card") {
        if (s.subcategory === "AMARILLA") {
          await adjustFouls(ownIsHome ? "home" : "away", 1);
          const prev = ownYellows[s.playerId] ?? 0;
          const nextCount = prev + 1;
          const nextYel = { ...ownYellows, [s.playerId]: nextCount };
          setOwnYellows(nextYel);
          if (nextCount >= 2) {
            setOwnReds({ ...ownReds, [s.playerId]: true });
            await expelPlayer(s.playerId);
            toast.error("2ª amarilla · EXPULSADO");
          } else {
            toast.success("Amarilla registrada");
          }
        } else if (s.subcategory === "ROJA") {
          setOwnReds({ ...ownReds, [s.playerId]: true });
          await expelPlayer(s.playerId);
          toast.error("Roja directa · EXPULSADO");
        }
      } else {
        toast.success("Registrado");
      }
    }
    setStepDialog(null);
    await loadHistory(match);
  };

  // ELIMINAR una acción del historial. Revierte efectos colaterales.
  const deleteHistoryRow = async (row: HistRow) => {
    if (!match) return;
    if (!confirm("¿Eliminar esta acción? Se revertirán marcador y contadores asociados.")) return;
    const ownIsHome = match.own_side === "home";

    if (row.table === "goals") {
      if (row.kind === "goal") {
        const newScore = ownIsHome
          ? { score_home: Math.max(0, match.score_home - 1) }
          : { score_away: Math.max(0, match.score_away - 1) };
        await liveSb.from("live_matches").update(newScore).eq("id", match.id);
        setMatch({ ...match, ...(newScore as any) });
      } else {
        const newScore = ownIsHome
          ? { score_away: Math.max(0, match.score_away - 1) }
          : { score_home: Math.max(0, match.score_home - 1) };
        await liveSb.from("live_matches").update(newScore).eq("id", match.id);
        setMatch({ ...match, ...(newScore as any) });
      }
      await liveSb.from("goals").delete().eq("id", row.id);
    } else {
      if (row.kind === "foul") {
        if (row.category === "COMETIDA") await adjustFouls(ownIsHome ? "home" : "away", -1);
        else await adjustFouls(ownIsHome ? "away" : "home", -1);
      }
      if (row.kind === "card") {
        if (row.category === "RIVAL_CARD") {
          const m = String(row.subcategory ?? "").match(/^(AMARILLA|ROJA)#(\d+)$/);
          if (m) {
            const n = parseInt(m[2], 10);
            const next = { ...rivalCards };
            delete next[n];
            setRivalCards(next);
          }
        } else if (row.player_id) {
          if (row.subcategory === "AMARILLA") {
            await adjustFouls(ownIsHome ? "home" : "away", -1);
            const prev = ownYellows[row.player_id] ?? 0;
            const nextCount = Math.max(0, prev - 1);
            const nextYel = { ...ownYellows, [row.player_id]: nextCount };
            setOwnYellows(nextYel);
            if (nextCount < 2 && ownReds[row.player_id]) {
              const nextRed = { ...ownReds };
              delete nextRed[row.player_id];
              setOwnReds(nextRed);
            }
          } else if (row.subcategory === "ROJA") {
            const nextRed = { ...ownReds };
            delete nextRed[row.player_id];
            setOwnReds(nextRed);
          }
        }
      }
      await liveSb.from("live_events").delete().eq("id", row.id);
    }
    toast.success("Acción eliminada");
    await loadHistory(match);
  };

  // EDITAR una acción: re-abre el flujo de selección.
  const editHistoryRow = (row: HistRow) => {
    if (row.kind === "goal" || row.kind === "red_ball") {
      setStepDialog({
        playerId: row.player_id ?? "",
        eventKind: row.kind as "goal" | "red_ball",
        category: row.category, subcategory: row.subcategory,
        pitch: row.pitch_x != null && row.pitch_y != null ? { x: row.pitch_x, y: row.pitch_y } : undefined,
        goal: row.goal_x != null && row.goal_y != null ? { x: row.goal_x, y: row.goal_y } : undefined,
        step: "category",
        editId: row.id, editTable: row.table,
      });
    } else {
      setStepDialog({
        playerId: row.player_id ?? "",
        eventKind: row.kind as any,
        category: row.category, subcategory: row.subcategory,
        pitch: row.pitch_x != null && row.pitch_y != null ? { x: row.pitch_x, y: row.pitch_y } : undefined,
        step: "pitch",
        editId: row.id, editTable: row.table,
      });
    }
  };


  // Cambia ÚNICAMENTE el jugador protagonista de una acción ya registrada.
  // No toca el resto de campos (categoría, coordenadas, minuto, marcador, etc.).
  const openChangePlayer = (row: HistRow) => {
    setEditPlayerRow(row);
    setEditPlayerSel(row.player_id ?? "");
  };
  const confirmChangePlayer = async () => {
    if (!editPlayerRow || !match) return;
    if (!editPlayerSel) { toast.error("Selecciona un jugador"); return; }
    if (editPlayerSel === editPlayerRow.player_id) { setEditPlayerRow(null); return; }
    try {
      if (editPlayerRow.table === "goals") {
        const { error } = await liveSb.from("goals")
          .update({ scorer_id: editPlayerSel }).eq("id", editPlayerRow.id);
        if (error) throw error;
      } else {
        const { error } = await liveSb.from("live_events")
          .update({ player_id: editPlayerSel }).eq("id", editPlayerRow.id);
        if (error) throw error;
      }
      // Refrescar historial y contadores derivados (tarjetas/expulsiones).
      await load();
      await loadHistory(match);
      toast.success("Acción actualizada correctamente");
      setEditPlayerRow(null);
    } catch (e: any) {
      toast.error("No se pudo actualizar: " + (e?.message ?? "error"));
    }
  };

  const addExtra = async () => {
    if (!match) return;
    if (match.current_period >= 4) return toast.info("Ya hay dos prórrogas");
    if (running) await toggleRun();
    const np = Math.max(3, match.current_period + 1);
    await liveSb.from("live_matches").update({ current_period: np, elapsed_seconds: 0 }).eq("id", match.id);
    setMatch({ ...match, current_period: np, elapsed_seconds: 0 });
    setNow(0);
    setPeriodFouls({ home: 0, away: 0 });
    toast.success(`${periodLabel(np)} habilitada`);
  };

  const finishMatch = async () => {
    if (!match) return;
    if (running) await toggleRun();
    // Cerrar la parte actual y reescalar a tiempo efectivo
    await closePeriod(match.id, match.current_period, now);
    await liveSb.from("live_matches").update({ status: "finished", finished_at: new Date().toISOString() }).eq("id", match.id);
    toast.success("Partido finalizado · acciones ajustadas a tiempo efectivo");
    setConfirmEnd(false);
    setMatch({ ...match, status: "finished", finished_at: new Date().toISOString() });
  };

  if (!match) {
    return (
      <ModuleShell title="LIVE" subtitle="Cargando partido…">
        <p className="text-muted-foreground">Cargando…</p>
      </ModuleShell>
    );
  }

  const isFinished = match.status === "finished";
  const ownIsHome = match.own_side === "home";

  return (
    <ModuleShell
      title="LIVE"
      subtitle={periodLabel(match.current_period)}
      actions={
        <div className="flex items-center gap-2">
          <LiveSyncBadge />
          <Link to="/partidos/live" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/15 text-white text-xs font-display tracking-[0.2em]">
            <ArrowLeft className="w-3.5 h-3.5" /> SALIR
          </Link>
        </div>
      }
    >
      {/* MARCADOR LUMINOSO */}
      <div className="rounded-3xl border border-aureon-orange/30 bg-gradient-to-b from-black/80 to-zinc-950 ring-1 ring-aureon-orange/20 p-4 sm:p-6 shadow-[0_0_60px_-20px_rgba(249,115,22,0.5)]">
        <div className="grid grid-cols-3 items-center gap-3">
          {/* HOME */}
          <div className="text-center min-w-0">
            <div className="font-display text-base sm:text-2xl md:text-3xl tracking-[0.15em] text-white leading-tight break-words" title={teamNames.home}>
              {teamNames.home}
            </div>
            <div className="font-display text-6xl sm:text-7xl md:text-8xl text-aureon-orange leading-none mt-2 tabular-nums" style={{ textShadow: "0 0 20px rgba(249,115,22,0.6)" }}>
              {match.score_home}
            </div>
            <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-1 text-[11px] tracking-[0.2em] text-white/80">
                <button onClick={() => adjustFouls("home", -1)} disabled={isFinished} className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 inline-flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                <span className="px-1">FALTAS {periodFouls.home}</span>
                <button onClick={() => adjustFouls("home", 1)} disabled={isFinished} className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 inline-flex items-center justify-center"><Plus className="w-3 h-3" /></button>
              </div>
              <TimeoutButton used={timeoutUsed("home")} onClick={() => requestTimeout("home")} disabled={isFinished || match.current_period > 2} />
              {!ownIsHome && (
                <RivalCardsButtons
                  cards={rivalCards}
                  disabled={isFinished}
                  onPick={registerRivalCard}
                  open={rivalCardOpen}
                  setOpen={setRivalCardOpen}
                  numberInput={rivalNumberInput}
                  setNumberInput={setRivalNumberInput}
                />
              )}
            </div>
          </div>

          {/* CRONO */}
          <div className="text-center">
            <div className="font-display text-3xl sm:text-5xl text-aureon-orange tabular-nums" style={{ textShadow: "0 0 24px rgba(249,115,22,0.7)" }}>
              {formatTime(now)}
            </div>
            <div className="mt-1 text-[10px] tracking-[0.3em] text-white/60">{periodLabel(match.current_period)}</div>
            <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
              <Button onClick={toggleRun} disabled={isFinished} size="sm" className={running ? "bg-aureon-red text-white" : "bg-aureon-orange text-black"}>
                {running ? <><Pause className="w-3.5 h-3.5 mr-1" />STOP</> : <><Play className="w-3.5 h-3.5 mr-1" />START</>}
              </Button>
              <Button onClick={nextPeriod} disabled={isFinished || match.current_period >= 4} size="sm" variant="outline" className="text-xs">
                {match.current_period === 1 ? "2ª PARTE" : "Siguiente"}
              </Button>
              {match.current_period > 1 && (
                <Button
                  onClick={reopenPreviousPeriod}
                  disabled={isFinished}
                  size="sm"
                  variant="outline"
                  className="text-xs border-aureon-blue/60 text-aureon-blue hover:bg-aureon-blue/10"
                  title="Volver al periodo anterior para editar acciones"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                  REABRIR {periodLabel(match.current_period - 1)}
                </Button>
              )}
              {!isFinished ? (
                <Button onClick={() => setConfirmEnd(true)} size="sm" variant="destructive">
                  <Flag className="w-3.5 h-3.5 mr-1" /> FIN
                </Button>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Button
                    onClick={async () => {
                      await liveSb.from("live_matches").update({ status: "live", finished_at: null }).eq("id", match.id);
                      setMatch({ ...match, status: "live", finished_at: null });
                      toast.success("Partido recuperado · puedes seguir editando");
                    }}
                    size="sm"
                    className="bg-emerald-500 hover:bg-emerald-600 text-black"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1" /> RECUPERAR
                  </Button>
                  <Button
                    onClick={async () => {
                      const [{ count: evCount }, { count: gCount }] = await Promise.all([
                        liveSb.from("live_events").select("id", { count: "exact", head: true }).eq("live_match_id", match.id),
                        liveSb.from("goals").select("id", { count: "exact", head: true }).eq("live_match_id", match.id),
                      ]);
                      const total = (evCount ?? 0) + (gCount ?? 0);
                      toast.success(`Estadísticas actualizadas · ${total} acciones sincronizadas`);
                    }}
                    size="sm"
                    className="bg-aureon-blue hover:bg-aureon-blue/90 text-white"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1" /> ACTUALIZAR ESTADÍSTICAS
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* AWAY */}
          <div className="text-center min-w-0">
            <div className="font-display text-base sm:text-2xl md:text-3xl tracking-[0.15em] text-white leading-tight break-words" title={teamNames.away}>
              {teamNames.away}
            </div>
            <div className="font-display text-6xl sm:text-7xl md:text-8xl text-aureon-orange leading-none mt-2 tabular-nums" style={{ textShadow: "0 0 20px rgba(249,115,22,0.6)" }}>
              {match.score_away}
            </div>
            <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-1 text-[11px] tracking-[0.2em] text-white/80">
                <button onClick={() => adjustFouls("away", -1)} disabled={isFinished} className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 inline-flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                <span className="px-1">FALTAS {periodFouls.away}</span>
                <button onClick={() => adjustFouls("away", 1)} disabled={isFinished} className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 inline-flex items-center justify-center"><Plus className="w-3 h-3" /></button>
              </div>
              <TimeoutButton used={timeoutUsed("away")} onClick={() => requestTimeout("away")} disabled={isFinished || match.current_period > 2} />
              {ownIsHome && (
                <RivalCardsButtons
                  cards={rivalCards}
                  disabled={isFinished}
                  onPick={registerRivalCard}
                  open={rivalCardOpen}
                  setOpen={setRivalCardOpen}
                  numberInput={rivalNumberInput}
                  setNumberInput={setRivalNumberInput}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* JUGADORES */}
      <div className="mt-6 space-y-4">
        <h3 className="font-display text-sm tracking-[0.25em] text-white/80">EN PISTA ({onCourt.length}/5)</h3>
        <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {onCourtPlayers.map((p) => (
            <PlayerCard
              key={p.id}
              player={p}
              onCourt
              currentSeconds={playingSeconds(p.id)}
              totalSeconds={pt[p.id]?.total_seconds ?? 0}
              onToggle={() => togglePlayer(p.id)}
              onActions={() => openActions(p.id)}
              onSubstitute={() => setSubOut(p.id)}
              disabled={isFinished}
              running={running}
              yellows={ownYellows[p.id] ?? 0}
              red={!!ownReds[p.id]}
            />
          ))}
        </div>

        <div className="flex items-center justify-between mt-2">
          <h3 className="font-display text-sm tracking-[0.25em] text-white/80">BANQUILLO</h3>
          {running && onCourt.length < 5 && onBench.length > 0 && (
            <span className="text-[11px] text-aureon-orange tracking-[0.15em]">
              ⚠ Faltan {5 - onCourt.length} en pista · pulsa "↑ A PISTA" para reemplazar al expulsado
            </span>
          )}
        </div>
        <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {onBench.map((p) => (
            <PlayerCard
              key={p.id}
              player={p}
              currentSeconds={0}
              totalSeconds={pt[p.id]?.total_seconds ?? 0}
              onToggle={() => togglePlayer(p.id)}
              onActions={() => openActions(p.id)}
              onPromote={running && onCourt.length < 5 ? () => fillCourtFromBench(p.id) : undefined}
              disabled={isFinished}
              running={running}
              yellows={ownYellows[p.id] ?? 0}
              red={!!ownReds[p.id]}
            />
          ))}
        </div>

        {expelled.length > 0 && (
          <>
            <h3 className="font-display text-sm tracking-[0.25em] text-aureon-red mt-2">EXPULSADOS</h3>
            <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
              {expelled.map((p) => (
                <PlayerCard
                  key={p.id}
                  player={p}
                  currentSeconds={0}
                  totalSeconds={pt[p.id]?.total_seconds ?? 0}
                  onToggle={() => {}}
                  onActions={() => {}}
                  disabled
                  running={running}
                  yellows={ownYellows[p.id] ?? 0}
                  red
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button onClick={addExtra} disabled={isFinished} variant="outline" className="border-aureon-orange/40">
          <Clock className="w-4 h-4 mr-1" /> PRÓRROGA
        </Button>
      </div>

      {/* HISTORIAL DE ACCIONES (panel inferior, editable) */}
      <div className="mt-6 rounded-xl border border-white/10 bg-zinc-950/70">
        <button
          type="button"
          onClick={() => setHistoryOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3"
        >
          <span className="font-display tracking-[0.25em] text-white/90 text-sm">
            HISTORIAL DE ACCIONES · {history.length}
          </span>
          <span className="text-xs text-aureon-orange tracking-[0.15em]">
            {historyOpen ? "OCULTAR ▲" : "MOSTRAR ▼"}
          </span>
        </button>
        {historyOpen && (
          <div className="border-t border-white/10 max-h-96 overflow-y-auto">
            {history.length === 0 && (
              <p className="px-4 py-6 text-xs text-muted-foreground text-center">
                Aún no hay acciones registradas.
              </p>
            )}
            <ul className="divide-y divide-white/5">
              {history.map((h) => {
                const ply = h.player_id ? players.find((p) => p.id === h.player_id) : null;
                const plyName = ply ? (ply.sport_name || `${ply.first_name} ${ply.last_name}`) : "—";
                const tone =
                  h.kind === "goal" ? "text-emerald-400" :
                  h.kind === "red_ball" ? "text-aureon-red" :
                  h.kind === "card" ? "text-yellow-400" :
                  h.kind === "foul" ? "text-orange-300" : "text-white/90";
                const label =
                  h.kind === "goal" ? "GOL MARCADO" :
                  h.kind === "red_ball" ? "GOL RECIBIDO" :
                  h.kind === "card" ? (h.category === "RIVAL_CARD" ? `TARJETA RIVAL · ${h.subcategory}` : `TARJETA · ${h.subcategory}`) :
                  h.kind === "foul" ? `FALTA · ${h.category}` :
                  `${h.subcategory || h.category}`;
                return (
                  <li key={`${h.table}:${h.id}`} className="flex items-center gap-2 px-3 py-2 text-xs">
                    <span className="w-12 shrink-0 tabular-nums text-white/60">
                      P{h.period ?? "?"} {String(h.minute ?? 0).padStart(2, "0")}'
                    </span>
                    <span className={`font-display tracking-wider shrink-0 ${tone}`}>{label}</span>
                    <span className="text-white/80 truncate flex-1">{plyName}</span>
                    {h.pitch_x != null && (
                      <span className="hidden sm:inline text-[10px] text-white/40">
                        pista {Math.round((h.pitch_x ?? 0) * 100)},{Math.round((h.pitch_y ?? 0) * 100)}
                      </span>
                    )}
                    {h.goal_x != null && (
                      <span className="hidden sm:inline text-[10px] text-white/40">
                        portería {Math.round((h.goal_x ?? 0) * 100)},{Math.round((h.goal_y ?? 0) * 100)}
                      </span>
                    )}
                    {h.category !== "RIVAL_CARD" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => editHistoryRow(h)}
                        disabled={isFinished}
                        className="h-7 px-2 text-[10px]"
                      >
                        Editar
                      </Button>
                    )}
                    {h.category !== "RIVAL_CARD" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openChangePlayer(h)}
                        disabled={isFinished}
                        className="h-7 px-2 text-[10px] border-aureon-blue/60 text-aureon-blue hover:bg-aureon-blue/10"
                      >
                        Cambiar jugador
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteHistoryRow(h)}
                      disabled={isFinished}
                      className="h-7 px-2 text-[10px]"
                    >
                      Eliminar
                    </Button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Diálogo: cambiar el jugador asignado a una acción ya registrada */}
      <Dialog open={!!editPlayerRow} onOpenChange={(o) => !o && setEditPlayerRow(null)}>
        <DialogContent className="max-w-md bg-neutral-900 text-white border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">
              <span className="inline-flex items-center gap-2"><User className="w-4 h-4" />Cambiar jugador de la acción</span>
            </DialogTitle>
          </DialogHeader>
          {editPlayerRow && (
            <div className="space-y-3">
              <p className="text-xs text-white/70">
                Solo se modifica el jugador de esta acción. Las estadísticas se recalculan automáticamente.
              </p>
              <div className="grid grid-cols-2 gap-2 max-h-[55vh] overflow-y-auto pr-1">
                {players.length === 0 && (
                  <p className="col-span-2 text-sm text-white/70">No hay jugadores convocados.</p>
                )}
                {players.map((p) => {
                  const sel = editPlayerSel === p.id;
                  const name = p.sport_name || `${p.first_name} ${p.last_name}`;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setEditPlayerSel(p.id)}
                      className={`text-left rounded-md border p-3 transition active:scale-95 touch-manipulation ${
                        sel
                          ? "border-aureon-blue bg-aureon-blue/25 text-white"
                          : "border-white/15 bg-zinc-800 text-white hover:border-white/40"
                      }`}
                    >
                      <div className="text-[10px] uppercase tracking-wider text-white/60">#{p.jersey_number ?? "—"}</div>
                      <div className="text-sm font-medium truncate text-white">{name}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPlayerRow(null)} className="bg-transparent border-white/30 text-white hover:bg-white/10">Cancelar</Button>
            <Button onClick={confirmChangePlayer} disabled={!editPlayerSel}>Guardar cambio</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!subOut} onOpenChange={(o) => !o && setSubOut(null)}>
        <DialogContent className="max-w-lg bg-neutral-900 text-white border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">
              <span className="inline-flex items-center gap-2"><RefreshCw className="w-4 h-4" />Sustituir jugador</span>
            </DialogTitle>
          </DialogHeader>
          {subOut && (
            <div className="space-y-3">
              <p className="text-sm text-white/70">
                Sale: <strong className="text-white">{(() => {
                  const p = players.find(x => x.id === subOut);
                  return p ? (p.sport_name || `${p.first_name} ${p.last_name}`) : "";
                })()}</strong>. Selecciona quién entra del banquillo.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {onBench.map((b) => (
                  <Button
                    key={b.id}
                    variant="outline"
                    className="justify-start bg-zinc-800 border-white/15 text-white hover:bg-zinc-700 hover:text-white"
                    onClick={async () => { await substitute(subOut, b.id); setSubOut(null); }}
                  >
                    <span className="w-6 h-6 rounded-full bg-yellow-400 text-black text-xs font-bold inline-flex items-center justify-center mr-2">
                      {b.jersey_number ?? "·"}
                    </span>
                    <span className="truncate">{b.sport_name || `${b.first_name} ${b.last_name}`}</span>
                  </Button>
                ))}
                {onBench.length === 0 && (
                  <p className="text-xs text-white/60 col-span-full">No hay jugadores en banquillo.</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubOut(null)} className="bg-transparent border-white/30 text-white hover:bg-white/10">Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Panel ACCIONES */}
      <Dialog open={!!panelOpen} onOpenChange={(o) => !o && setPanelOpen(null)}>
        <DialogContent className="max-w-2xl bg-neutral-900 text-white border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">
              {panelOpen && (() => {
                const p = players.find((x) => x.id === panelOpen.playerId);
                return p ? `${p.sport_name || `${p.first_name} ${p.last_name}`} · #${p.jersey_number ?? "·"}` : "";
              })()}
            </DialogTitle>
          </DialogHeader>
          {panelOpen && (
            <Tabs defaultValue="acciones">
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="acciones">Acciones</TabsTrigger>
                <TabsTrigger value="faltas"><Whistle className="w-3.5 h-3.5 mr-1" />Faltas</TabsTrigger>
                <TabsTrigger value="gol"><GoalIcon className="w-3.5 h-3.5 mr-1 text-emerald-400" />Gol</TabsTrigger>
                <TabsTrigger value="rojo"><GoalIcon className="w-3.5 h-3.5 mr-1 text-red-500" />Gol Recibido</TabsTrigger>
                <TabsTrigger value="tarjetas"><Square className="w-3.5 h-3.5 mr-1 text-yellow-400" />Tarjetas</TabsTrigger>
              </TabsList>

              <TabsContent value="acciones">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                  {(panelOpen.kind === "goalie" ? GOALIE_ACTION_BUTTONS : ACTION_BUTTONS).map((label) => (
                    <Button
                      key={label}
                      onClick={() => startEvent(panelOpen.playerId, "action", "ACCION", label)}
                      className={`bg-zinc-950 border-2 !text-white hover:bg-zinc-900 h-20 text-base font-display font-bold tracking-wider whitespace-normal text-center px-2 leading-tight shadow-lg drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] ${label === "PARADA" ? "border-aureon-blue/70 hover:border-aureon-blue" : "border-aureon-orange/50 hover:border-aureon-orange"}`}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground mt-3">
                  {panelOpen.kind === "goalie" ? "Acciones de portero · incluye PARADA." : "El resto de acciones se podrán configurar más adelante."}
                </p>
              </TabsContent>

              <TabsContent value="faltas">
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <Button
                    onClick={() => startEvent(panelOpen.playerId, "foul", "COMETIDA", "Falta cometida")}
                    className="h-14 bg-yellow-500 text-black hover:bg-yellow-400 font-display tracking-wider"
                  >
                    <Whistle className="w-4 h-4 mr-2" /> COMETIDA
                  </Button>
                  <Button
                    onClick={() => startEvent(panelOpen.playerId, "foul", "RECIBIDA", "Falta recibida")}
                    className="h-14 bg-aureon-blue text-white hover:bg-aureon-blue/90 font-display tracking-wider"
                  >
                    <Whistle className="w-4 h-4 mr-2" /> RECIBIDA
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground mt-3">
                  Cometida → suma a tu marcador de faltas. Recibida → suma al rival.
                </p>
              </TabsContent>

              <TabsContent value="gol">
                <div className="text-center mb-3 mt-3">
                  <div className="font-display text-sm tracking-[0.25em] text-emerald-400">GOL MARCADO</div>
                  <div className="text-[11px] text-muted-foreground">Selecciona <strong>+</strong> para añadir o <strong>−</strong> para restar. Después marcarás zona y portería.</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => startEvent(panelOpen.playerId, "goal", "GOL", "GOL MARCADO", 1)}
                    className="h-16 bg-emerald-600 text-white hover:bg-emerald-500 text-3xl font-display"
                  >
                    <Plus className="w-7 h-7" />
                  </Button>
                  <Button
                    onClick={() => startEvent(panelOpen.playerId, "goal", "GOL", "GOL MARCADO", -1)}
                    className="h-16 bg-emerald-900 text-white hover:bg-emerald-800 text-3xl font-display"
                  >
                    <Minus className="w-7 h-7" />
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="rojo">
                <div className="text-center mb-3 mt-3">
                  <div className="font-display text-sm tracking-[0.25em] text-red-400">GOL RECIBIDO</div>
                  <div className="text-[11px] text-muted-foreground">Selecciona <strong>+</strong> para añadir o <strong>−</strong> para restar.</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => startEvent(panelOpen.playerId, "red_ball", "ENCAJADO", "GOL RECIBIDO", 1)}
                    className="h-16 bg-aureon-red text-white hover:bg-aureon-red/90 text-3xl"
                  >
                    <Plus className="w-7 h-7" />
                  </Button>
                  <Button
                    onClick={() => startEvent(panelOpen.playerId, "red_ball", "ENCAJADO", "GOL RECIBIDO", -1)}
                    className="h-16 bg-red-950 text-white hover:bg-red-900 text-3xl"
                  >
                    <Minus className="w-7 h-7" />
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="tarjetas">
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <Button onClick={() => startEvent(panelOpen.playerId, "card", "TARJETA", "AMARILLA")} className="h-14 bg-yellow-400 text-black hover:bg-yellow-300 font-display">
                    AMARILLA
                  </Button>
                  <Button onClick={() => startEvent(panelOpen.playerId, "card", "TARJETA", "ROJA")} className="h-14 bg-aureon-red text-white hover:bg-aureon-red/90 font-display">
                    ROJA
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground mt-3">La amarilla suma automáticamente una falta al casillero.</p>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Selector de coordenadas */}
      <Dialog open={!!stepDialog} onOpenChange={(o) => !o && setStepDialog(null)}>
        <DialogContent className="max-w-3xl bg-neutral-900 text-white border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">
              {stepDialog?.step === "category" && (stepDialog.eventKind === "goal" ? "¿Cómo se ha producido el gol?" : "¿Cómo se ha encajado el gol?")}
              {stepDialog?.step === "pitch" && "Selecciona coordenada en la pista"}
              {stepDialog?.step === "goal" && "Selecciona coordenada en la portería"}
              {stepDialog?.step === "saving" && "Guardando…"}
            </DialogTitle>
          </DialogHeader>
          {stepDialog?.step === "category" && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {getCategories((stepDialog.eventKind === "goal" ? "for" : "against") as GoalSide).map((cat) => (
                <div key={cat.key} className="space-y-2">
                  <div className="font-display text-sm tracking-[0.2em] text-aureon-orange">{cat.label}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {cat.subs.map((sub) => (
                      <Button
                        key={sub.key}
                        onClick={() => setStepDialog({ ...stepDialog, category: cat.key, subcategory: sub.key, step: "pitch" })}
                        className="bg-zinc-950 border border-aureon-orange/40 !text-white hover:bg-zinc-900 hover:border-aureon-orange justify-start text-left h-auto py-2.5 px-3 whitespace-normal text-xs leading-snug"
                      >
                        {sub.label}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          {stepDialog?.step === "pitch" && (
            <div className="mx-auto w-full max-w-xl">
              <FutsalPitch onPick={onPitchPick} marker={stepDialog?.pitch ?? null} />
            </div>
          )}
          {stepDialog?.step === "goal" && (
            <div className="mx-auto w-full max-w-xl">
              <FutsalGoal onPick={onGoalPick} marker={stepDialog?.goal ?? null} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setStepDialog(null)}>Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmEnd} onOpenChange={setConfirmEnd}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Finalizar partido?</AlertDialogTitle>
            <AlertDialogDescription>El marcador, las acciones y los minutos jugados quedarán guardados.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={finishMatch} className="bg-aureon-red text-white hover:bg-aureon-red/90">Finalizar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ModuleShell>
  );
}

function TimeoutButton({ used, onClick, disabled }: { used: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || used}
      title={used ? "Tiempo muerto SELECCIONADO" : "Pedir tiempo muerto"}
      className={[
        "inline-flex items-center gap-1 px-2 h-7 rounded-md border text-[10px] font-display tracking-[0.2em] transition",
        used
          ? "bg-aureon-orange/20 border-aureon-orange/60 text-aureon-orange cursor-not-allowed"
          : "bg-white/10 border-white/20 text-white hover:bg-white/20",
        disabled && !used ? "opacity-40 cursor-not-allowed" : "",
      ].join(" ")}
    >
      <TimeoutIcon className="w-3.5 h-3.5" />
      <span>TM</span>
      <span className={used ? "text-aureon-orange" : "text-white/70"}>
        {used ? "SELECCIONADO" : "PENDIENTE"}
      </span>
    </button>
  );
}

function PlayerCard({
  player, onCourt = false, currentSeconds, totalSeconds, onToggle, onActions, onSubstitute, onPromote, disabled, running,
  yellows = 0, red = false,
}: {
  player: Player; onCourt?: boolean; currentSeconds: number; totalSeconds: number;
  onToggle: () => void; onActions: () => void; onSubstitute?: () => void; onPromote?: () => void;
  disabled?: boolean; running?: boolean;
  yellows?: number; red?: boolean;
}) {
  const goalie = player.position === "Portero";
  return (
    <div className={`relative rounded-xl border p-2 ${onCourt ? "border-aureon-orange/60 ring-1 ring-aureon-orange/40 bg-aureon-orange/10" : "border-white/10 bg-background/50"} ${red ? "opacity-60" : ""}`}>
      {/* Indicador de tarjetas */}
      {(yellows > 0 || red) && (
        <div className="absolute top-1 right-1 flex gap-0.5 z-10">
          {yellows > 0 && !red && (
            <span title={`${yellows} amarilla${yellows > 1 ? "s" : ""}`} className="w-3 h-4 rounded-sm bg-yellow-400 border border-yellow-600 shadow" />
          )}
          {red && (
            <span title="EXPULSADO" className="w-3 h-4 rounded-sm bg-aureon-red border border-red-700 shadow" />
          )}
        </div>
      )}
      <button
        onClick={onToggle}
        disabled={disabled || running || red}
        className="w-full text-left disabled:cursor-default"
        title={red ? "Jugador expulsado" : running ? "Usa el botón C para sustituir" : ""}
      >
        <div className="flex items-center gap-2">
          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${goalie ? "bg-aureon-blue text-white" : "bg-yellow-400 text-black"}`}>
            {player.jersey_number ?? "·"}
          </span>
          <div className="min-w-0">
            <div className="text-xs text-white truncate">{player.sport_name || `${player.first_name} ${player.last_name}`}</div>
            <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground inline-flex items-center gap-1">
              {goalie ? <Shield className="w-2.5 h-2.5" /> : <User className="w-2.5 h-2.5" />}
              {player.position}
            </div>
          </div>
        </div>
        <div className="mt-1.5 grid grid-cols-2 gap-1 text-[9px] text-white/80">
          <div className="inline-flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{onCourt ? formatTime(currentSeconds) : "00:00"}</div>
          <div className="inline-flex items-center gap-1 justify-end"><Clock className="w-2.5 h-2.5 text-aureon-orange" />{formatTime(totalSeconds)}</div>
        </div>
      </button>
      <div className="mt-1.5 flex items-center gap-1">
        <Button
          onClick={onActions}
          disabled={disabled || red}
          size="sm"
          className="flex-1 h-9 text-xs font-display tracking-wider bg-aureon-blue text-white hover:bg-aureon-blue/90 disabled:opacity-40"
        >
          {red ? "EXPULSADO" : "ACCIONES"}
        </Button>
        {onCourt && onSubstitute && !red && (
          <Button
            onClick={onSubstitute}
            disabled={disabled}
            size="sm"
            title="Cambio: sacar a este jugador"
            className="h-9 w-9 p-0 bg-white/15 text-white hover:bg-white/25 font-display text-base"
          >
            C
          </Button>
        )}
        {!onCourt && onPromote && !red && (
          <Button
            onClick={onPromote}
            disabled={disabled}
            size="sm"
            title="Subir a pista (reemplazar a expulsado)"
            className="h-9 px-2 bg-aureon-orange text-black hover:bg-aureon-orange/90 font-display text-[10px] tracking-wider"
          >
            ↑ PISTA
          </Button>
        )}
      </div>
    </div>
  );
}

function RivalCardsButtons({
  cards, disabled, onPick,
}: {
  cards: Record<number, "yellow" | "red">;
  disabled?: boolean;
  onPick: (n: number, kind: "yellow" | "red") => void | Promise<void>;
  // Compat (no longer used internamente; el dropdown es nativo):
  open?: null | "yellow" | "red";
  setOpen?: (v: null | "yellow" | "red") => void;
  numberInput?: string;
  setNumberInput?: (v: string) => void;
}) {
  const yellowed = Object.entries(cards).filter(([, v]) => v === "yellow").map(([k]) => parseInt(k, 10));
  const reds = Object.entries(cards).filter(([, v]) => v === "red").map(([k]) => parseInt(k, 10));

  const haptic = () => { try { (navigator as any).vibrate?.(12); } catch {} };

  // Dropdown nativo: usamos un <select> real superpuesto al botón.
  // Apertura instantánea al primer toque (sin Radix, sin animaciones).
  // Al elegir un dorsal, registramos la tarjeta y reseteamos.
  const handleChange = (kind: "yellow" | "red") => (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    if (!v) return;
    const n = parseInt(v, 10);
    if (!n || n < 1 || n > 99) { e.target.value = ""; return; }
    haptic();
    onPick(n, kind);
    e.target.value = ""; // listo para la próxima
    e.target.blur();
  };

  const renderNativeSelect = (kind: "yellow" | "red") => {
    const nums = Array.from({ length: 99 }, (_, i) => i + 1);
    return (
      <select
        defaultValue=""
        onChange={handleChange(kind)}
        onPointerDown={() => haptic()}
        disabled={disabled}
        aria-label={kind === "yellow" ? "Dorsal jugador rival · amarilla" : "Dorsal jugador rival · roja"}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer touch-manipulation appearance-none"
        style={{ fontSize: 16 }}
      >
        <option value="" disabled>Dorsal…</option>
        {kind === "yellow" && yellowed.length > 0 && (
          <optgroup label="Ya con amarilla (→ roja)">
            {yellowed.map((n) => (
              <option key={`y-${n}`} value={n}>#{n} · 2ª amarilla → ROJA</option>
            ))}
          </optgroup>
        )}
        <optgroup label={kind === "yellow" ? "Amarilla a dorsal" : "Roja directa a dorsal"}>
          {nums.map((n) => {
            const has = cards[n];
            const isRed = has === "red";
            const label = `#${n}${has === "yellow" ? " (amarilla)" : isRed ? " (roja)" : ""}`;
            return (
              <option key={n} value={n} disabled={kind === "red" && isRed}>{label}</option>
            );
          })}
        </optgroup>
      </select>
    );
  };

  return (
    <div className="inline-flex items-center gap-2">
      {/* Amarilla rival */}
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          tabIndex={-1}
          className="pointer-events-none px-5 h-14 min-w-[72px] rounded-md border-2 border-yellow-500/70 bg-yellow-400/25 text-yellow-100 text-base font-display tracking-[0.2em] disabled:opacity-40 select-none flex items-center justify-center"
          aria-hidden
        >
          TA{yellowed.length > 0 ? ` ${yellowed.length}` : ""}
        </button>
        {renderNativeSelect("yellow")}
      </div>

      {/* Roja rival */}
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          tabIndex={-1}
          className="pointer-events-none px-5 h-14 min-w-[72px] rounded-md border-2 border-red-500/70 bg-red-500/25 text-red-100 text-base font-display tracking-[0.2em] disabled:opacity-40 select-none flex items-center justify-center"
          aria-hidden
        >
          TR{reds.length > 0 ? ` ${reds.length}` : ""}
        </button>
        {renderNativeSelect("red")}
      </div>
    </div>
  );
}
