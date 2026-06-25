import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ModuleShell } from "@/components/ModuleShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus, Trash2, Pencil, MapPin, Clock, Link2, ExternalLink } from "lucide-react";
import {
  type PlanningEvent, type PlanningEventType, type PlanningIntensity, type CalendarEvent, type EventSource, type Microcycle,
  TYPE_LABELS, TYPE_ICONS, TYPE_COLORS, INTENSITY_LABELS, ALL_TYPES,
  ymd, parseYmd, startOfWeek, addDays,
} from "@/lib/planning";
import { StructureView } from "@/components/planning/StructureView";
import { LoadDashboard } from "@/components/planning/LoadDashboard";
import { ExecutiveDashboard } from "@/components/planning/ExecutiveDashboard";

export const Route = createFileRoute("/planificacion")({
  head: () => ({
    meta: [
      { title: "Planificación — Aureon Futsal Pro Suite" },
      { name: "description", content: "Planificación operativa y de temporada por equipo." },
    ],
  }),
  component: PlanificacionPage,
});

type Team = { id: string; name: string; category: string };
type Season = { id: string; name: string; is_active: boolean; team_id: string | null; start_date: string | null; end_date: string | null };

function deriveSeasonLabel(s: Season | null | undefined): string {
  if (!s) return "";
  if (s.start_date && s.end_date) {
    const sy = Number(s.start_date.slice(0, 4));
    const ey = Number(s.end_date.slice(0, 4));
    if (sy && ey) return sy === ey ? `Temporada ${sy}` : `Temporada ${sy}/${ey}`;
  }
  return s.name;
}
type Fixture = {
  id: string; matchday: string; match_date: string | null; competition: string;
  home_team_id: string; away_team_id: string; own_team_id: string | null;
};
type SeasonTeam = { id: string; name: string };
type TrainingSession = {
  id: string; team_id: string; session_date: string | null; session_time: string;
  venue: string; objectives: string; microcycle: string; session_number: string; rival: string;
};

const VIEW_KEY = "aureon.planning.view";
const TEAM_KEY = "aureon.planning.teamId";
const SEASON_KEY = "aureon.planning.seasonId";
const SECTION_KEY = "aureon.planning.section";

type View = "month" | "week" | "season";
type Section = "calendar" | "structure" | "summary";

function PlanificacionPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [teamId, setTeamId] = useState<string>("");
  const [seasonId, setSeasonId] = useState<string>("");
  const [events, setEvents] = useState<PlanningEvent[]>([]);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [sTeams, setSTeams] = useState<SeasonTeam[]>([]);
  const [trainings, setTrainings] = useState<TrainingSession[]>([]);
  const [microcycles, setMicrocycles] = useState<Microcycle[]>([]);
  const [sourceInfo, setSourceInfo] = useState<CalendarEvent | null>(null);
  const navigate = useNavigate();
  const [view, setView] = useState<View>(() =>
    (typeof window !== "undefined" && (localStorage.getItem(VIEW_KEY) as View)) || "month"
  );
  const [section, setSection] = useState<Section>(() =>
    (typeof window !== "undefined" && (localStorage.getItem(SECTION_KEY) as Section)) || "calendar"
  );
  const [cursor, setCursor] = useState<Date>(() => { const d = new Date(); d.setDate(1); return d; });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<PlanningEvent> | null>(null);
  const [confirmDel, setConfirmDel] = useState<PlanningEvent | null>(null);

  useEffect(() => { localStorage.setItem(VIEW_KEY, view); }, [view]);
  useEffect(() => { localStorage.setItem(SECTION_KEY, section); }, [section]);
  useEffect(() => { if (teamId) localStorage.setItem(TEAM_KEY, teamId); }, [teamId]);
  useEffect(() => { if (seasonId) localStorage.setItem(SEASON_KEY, seasonId); }, [seasonId]);

  // Bootstrap: equipos + temporadas.
  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: t }, { data: s }] = await Promise.all([
        supabase.from("teams").select("id,name,category").order("name"),
        supabase.from("seasons").select("id,name,is_active,team_id,start_date,end_date").order("created_at", { ascending: false }),
      ]);
      const ts = (t as Team[]) ?? [];
      const ss = (s as Season[]) ?? [];
      setTeams(ts);
      setSeasons(ss);
      const storedTeam = localStorage.getItem(TEAM_KEY);
      const validTeam = storedTeam && ts.some((x) => x.id === storedTeam) ? storedTeam : (ts[0]?.id ?? "");
      setTeamId(validTeam);
      setLoading(false);
    })();
  }, []);

  // Cuando cambia el equipo, ajustar temporada disponible.
  useEffect(() => {
    if (!teamId) { setSeasonId(""); return; }
    const list = seasons.filter((x) => x.team_id === teamId);
    const storedSeason = localStorage.getItem(SEASON_KEY);
    const valid = list.find((x) => x.id === storedSeason)?.id
      ?? list.find((x) => x.is_active)?.id
      ?? list[0]?.id
      ?? "";
    setSeasonId(valid);
  }, [teamId, seasons]);

  const loadEvents = async () => {
    if (!teamId) return setEvents([]);
    const { data, error } = await (supabase as any)
      .from("planning_events")
      .select("*")
      .eq("team_id", teamId)
      .order("event_date", { ascending: true });
    if (error) { toast.error("No se pudieron cargar los eventos"); return; }
    setEvents((data as PlanningEvent[]) ?? []);
  };

  const loadTrainings = async () => {
    if (!teamId) return setTrainings([]);
    const { data, error } = await (supabase as any)
      .from("training_sessions")
      .select("id,team_id,session_date,session_time,venue,objectives,microcycle,session_number,rival")
      .eq("team_id", teamId)
      .not("session_date", "is", null)
      .order("session_date", { ascending: true });
    if (!error) setTrainings((data as TrainingSession[]) ?? []);
  };

  const loadMicrocycles = async () => {
    if (!teamId) return setMicrocycles([]);
    const { data } = await (supabase as any)
      .from("planning_microcycles").select("*").eq("team_id", teamId)
      .order("week_start", { ascending: true });
    setMicrocycles((data as Microcycle[]) ?? []);
  };


  const loadSeasonRefs = async () => {
    if (!seasonId) { setFixtures([]); setSTeams([]); return; }
    const [{ data: fx }, { data: st }] = await Promise.all([
      supabase.from("fixtures").select("id,matchday,match_date,competition,home_team_id,away_team_id,own_team_id").eq("season_id", seasonId),
      supabase.from("season_teams").select("id,name").eq("season_id", seasonId),
    ]);
    setFixtures((fx as Fixture[]) ?? []);
    setSTeams((st as SeasonTeam[]) ?? []);
  };

  useEffect(() => { loadEvents(); loadTrainings(); loadMicrocycles(); }, [teamId]);
  useEffect(() => { loadSeasonRefs(); }, [seasonId]);

  const teamSeasons = useMemo(() => seasons.filter((s) => s.team_id === teamId), [seasons, teamId]);

  // ─────────── CRUD evento ───────────
  const openNew = (date: string) => {
    setEditing({
      event_date: date, type: "training", title: "", location: "", notes: "",
      event_time: null, duration_minutes: null, intensity: null,
      fixture_id: null, training_session_id: null,
    });
  };
  const openEdit = (ev: PlanningEvent) => setEditing({ ...ev });

  const saveEvent = async () => {
    if (!editing || !teamId) return;
    if (!editing.event_date) return toast.error("Indica una fecha");
    if (!editing.type) return toast.error("Indica el tipo");
    const payload: any = {
      team_id: teamId,
      season_id: seasonId || null,
      event_date: editing.event_date,
      event_time: editing.event_time || null,
      duration_minutes: editing.duration_minutes ?? null,
      type: editing.type,
      title: (editing.title ?? "").toString().slice(0, 200),
      location: (editing.location ?? "").toString().slice(0, 200),
      notes: (editing.notes ?? "").toString().slice(0, 4000),
      intensity: editing.intensity || null,
      fixture_id: editing.fixture_id || null,
      training_session_id: editing.training_session_id || null,
    };
    // Si es partido vinculado a fixture, autocompletar campos faltantes.
    if (payload.type === "match" && payload.fixture_id) {
      const fx = fixtures.find((f) => f.id === payload.fixture_id);
      if (fx) {
        if (!payload.event_date && fx.match_date) payload.event_date = fx.match_date.slice(0, 10);
        if (!payload.title) {
          const home = sTeams.find((t) => t.id === fx.home_team_id)?.name ?? "Local";
          const away = sTeams.find((t) => t.id === fx.away_team_id)?.name ?? "Visitante";
          payload.title = `${home} vs ${away} · J${fx.matchday}`;
        }
      }
    }
    if ((editing as PlanningEvent).id) {
      const { error } = await (supabase as any).from("planning_events").update(payload).eq("id", (editing as PlanningEvent).id);
      if (error) return toast.error("No se pudo guardar");
      toast.success("Evento actualizado");
    } else {
      const { error } = await (supabase as any).from("planning_events").insert(payload);
      if (error) return toast.error("No se pudo crear");
      toast.success("Evento creado");
    }
    setEditing(null);
    loadEvents();
  };

  const deleteEvent = async () => {
    if (!confirmDel) return;
    const { error } = await (supabase as any).from("planning_events").delete().eq("id", confirmDel.id);
    if (error) return toast.error("Error al eliminar");
    toast.success("Evento eliminado");
    setConfirmDel(null);
    loadEvents();
  };

  // ─────────── Agrupar eventos por fecha ───────────
  // ─────────── Eventos combinados (planning + fixtures + entrenamientos) ───────────
  const eventsByDate = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>();
    const push = (e: CalendarEvent) => {
      if (!e.event_date) return;
      const arr = m.get(e.event_date) ?? [];
      arr.push(e);
      m.set(e.event_date, arr);
    };

    // IDs ya referenciados desde planning_events → evitar duplicados sintéticos.
    const linkedFixtures = new Set(events.map((e) => e.fixture_id).filter(Boolean) as string[]);
    const linkedTrainings = new Set(events.map((e) => e.training_session_id).filter(Boolean) as string[]);

    events.forEach((e) => push({ ...e, source: "planning" }));

    // Fixtures del equipo seleccionado (own_team_id) en la temporada actual.
    fixtures.forEach((fx) => {
      if (!fx.match_date) return;
      if (fx.own_team_id && fx.own_team_id !== teamId) return;
      if (linkedFixtures.has(fx.id)) return;
      const home = sTeams.find((t) => t.id === fx.home_team_id)?.name ?? "Local";
      const away = sTeams.find((t) => t.id === fx.away_team_id)?.name ?? "Visitante";
      push({
        id: `fx-${fx.id}`,
        team_id: teamId,
        season_id: seasonId || null,
        event_date: fx.match_date.slice(0, 10),
        event_time: null,
        duration_minutes: null,
        type: "match",
        title: `${home} vs ${away} · J${fx.matchday}`,
        location: "",
        notes: fx.competition || "",
        intensity: null,
        fixture_id: fx.id,
        training_session_id: null,
        data: {},
        created_at: "",
        updated_at: "",
        source: "fixture",
        source_id: fx.id,
      });
    });

    // Entrenamientos planificados desde Gestión de Entrenamientos.
    trainings.forEach((ts) => {
      if (!ts.session_date) return;
      if (linkedTrainings.has(ts.id)) return;
      const title = ts.session_number
        ? `Sesión ${ts.session_number}${ts.microcycle ? ` · MC ${ts.microcycle}` : ""}`
        : (ts.microcycle ? `Microciclo ${ts.microcycle}` : "Entrenamiento");
      push({
        id: `ts-${ts.id}`,
        team_id: ts.team_id,
        season_id: null,
        event_date: ts.session_date.slice(0, 10),
        event_time: ts.session_time || null,
        duration_minutes: null,
        type: "training",
        title,
        location: ts.venue || "",
        notes: ts.objectives || "",
        intensity: null,
        fixture_id: null,
        training_session_id: ts.id,
        data: {},
        created_at: "",
        updated_at: "",
        source: "training_session",
        source_id: ts.id,
      });
    });

    // Orden estable por hora dentro del día.
    m.forEach((arr) => arr.sort((a, b) => (a.event_time ?? "").localeCompare(b.event_time ?? "")));
    return m;
  }, [events, fixtures, trainings, sTeams, teamId, seasonId]);

  // Click en chip: planning → editar; entrenamiento sintético → editar (creará planning_event al guardar); fixture → módulo partidos.
  const onChipClick = (ev: CalendarEvent) => {
    if (ev.source === "planning") {
      setEditing({ ...(ev as PlanningEvent) });
    } else if (ev.source === "training_session" && ev.source_id) {
      // Evento sintético (sesión sin planning_event aún): abrir editor con los datos pre-cargados.
      setEditing({
        team_id: ev.team_id,
        event_date: ev.event_date,
        event_time: ev.event_time,
        duration_minutes: null,
        type: "training",
        title: ev.title,
        location: ev.location ?? "",
        notes: ev.notes ?? "",
        intensity: null,
        fixture_id: null,
        training_session_id: ev.source_id,
      });
    } else if (ev.source === "fixture") {
      navigate({ to: "/partidos" });
    }
  };

  const openSource = (ev: CalendarEvent) => {
    if (ev.source === "fixture") navigate({ to: "/partidos" });
    else if (ev.source === "training_session" && ev.source_id) {
      navigate({ to: "/entrenamientos/$sessionId", params: { sessionId: ev.source_id } });
    }
    setSourceInfo(null);
  };



  // ─────────── Cambio de cursor ───────────
  const goPrev = () => {
    const d = new Date(cursor);
    if (view === "month") d.setMonth(d.getMonth() - 1);
    else if (view === "week") d.setDate(d.getDate() - 7);
    else d.setFullYear(d.getFullYear() - 1);
    setCursor(d);
  };
  const goNext = () => {
    const d = new Date(cursor);
    if (view === "month") d.setMonth(d.getMonth() + 1);
    else if (view === "week") d.setDate(d.getDate() + 7);
    else d.setFullYear(d.getFullYear() + 1);
    setCursor(d);
  };
  const goToday = () => {
    const t = new Date();
    if (view === "month") { t.setDate(1); }
    setCursor(t);
  };

  const cursorLabel = useMemo(() => {
    if (view === "month") return cursor.toLocaleDateString("es-ES", { month: "long", year: "numeric" }).toUpperCase();
    if (view === "week") {
      const s = startOfWeek(cursor);
      const e = addDays(s, 6);
      return `${s.toLocaleDateString("es-ES", { day: "2-digit", month: "short" })} – ${e.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}`.toUpperCase();
    }
    const seasonObj = seasons.find((s) => s.id === seasonId) ?? null;
    return deriveSeasonLabel(seasonObj).toUpperCase() || `TEMPORADA ${cursor.getFullYear()}`;
  }, [cursor, view, seasons, seasonId]);

  const activeSeason = useMemo(() => seasons.find((s) => s.id === seasonId) ?? null, [seasons, seasonId]);

  // ─────────── Render principal ───────────
  return (
    <ModuleShell title="PLANIFICACIÓN" subtitle="Calendario operativo · Planificación de temporada">
      {loading ? (
        <p className="text-muted-foreground text-sm">Cargando…</p>
      ) : teams.length === 0 ? (
        <div className="rounded-2xl border border-aureon-orange/40 bg-aureon-orange/10 p-6">
          <p className="text-white text-sm">Necesitas crear primero un equipo en <strong>Gestión de Jugadores</strong> para usar Planificación.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Selector temporada + equipo */}
          <div className="rounded-2xl border border-white/10 bg-background/40 backdrop-blur-md p-4 sm:p-5 grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-[10px] uppercase tracking-[0.25em] text-white/70">Equipo</Label>
              <Select value={teamId} onValueChange={setTeamId}>
                <SelectTrigger className="mt-1 bg-background/60 border-white/15"><SelectValue placeholder="Selecciona equipo" /></SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}{t.category ? ` · ${t.category}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-[0.25em] text-white/70">Temporada</Label>
              <Select value={seasonId} onValueChange={setSeasonId}>
                <SelectTrigger className="mt-1 bg-background/60 border-white/15">
                  <SelectValue placeholder={teamSeasons.length === 0 ? "Sin temporadas para este equipo" : "Selecciona temporada"} />
                </SelectTrigger>
                <SelectContent>
                  {teamSeasons.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{deriveSeasonLabel(s)}{s.is_active ? " ★" : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Sección principal: Calendario vs Estructura */}
          <div className="grid grid-cols-3 sm:inline-flex rounded-lg border border-white/10 bg-background/40 backdrop-blur-md overflow-hidden">
            {(["calendar", "structure", "summary"] as Section[]).map((sec) => (
              <button
                key={sec}
                onClick={() => setSection(sec)}
                aria-pressed={section === sec}
                className={`min-h-11 px-3 sm:px-4 py-2 text-xs font-display tracking-[0.2em] transition-colors ${section === sec ? "bg-aureon-orange text-black shadow-inner" : "text-white hover:bg-white/10 active:bg-white/15"}`}
              >
                {sec === "calendar" ? "CALENDARIO" : sec === "structure" ? "ESTRUCTURA" : "RESUMEN"}
              </button>
            ))}
          </div>

          {section === "calendar" && (
            <>
              {/* Tabs vistas + navegación */}
              <div className="space-y-3">
                <div className="grid grid-cols-3 sm:inline-flex rounded-lg border border-white/10 bg-background/40 backdrop-blur-md overflow-hidden w-full sm:w-auto">
                  {(["month", "week", "season"] as View[]).map((v) => (
                    <button
                      key={v}
                      onClick={() => setView(v)}
                      aria-pressed={view === v}
                      className={`min-h-11 px-3 sm:px-4 py-2 text-xs font-display tracking-[0.2em] transition-colors ${view === v ? "bg-aureon-orange text-black shadow-inner" : "text-white hover:bg-white/10 active:bg-white/15"}`}
                    >
                      {v === "month" ? "MES" : v === "week" ? "SEMANA" : "TEMPORADA"}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="font-display text-sm sm:text-base tracking-[0.15em] text-white truncate min-w-0">{cursorLabel}</div>
                  <div className="flex items-center gap-2 ml-auto">
                    <Button variant="outline" onClick={goPrev} aria-label="Anterior" className="h-11 w-11 p-0 active:scale-95 transition-transform"><ChevronLeft className="w-5 h-5" /></Button>
                    <Button variant="outline" onClick={goToday} className="h-11 px-4 active:scale-95 transition-transform">Hoy</Button>
                    <Button variant="outline" onClick={goNext} aria-label="Siguiente" className="h-11 w-11 p-0 active:scale-95 transition-transform"><ChevronRight className="w-5 h-5" /></Button>
                    <Button onClick={() => openNew(ymd(new Date()))} className="h-11 px-4 bg-aureon-orange text-black hover:bg-aureon-orange/90 active:scale-95 transition-transform">
                      <Plus className="w-4 h-4 mr-1" /> NUEVO
                    </Button>
                  </div>
                </div>
              </div>

              <LoadDashboard
                events={Array.from(eventsByDate.values()).flat()}
                microcycles={microcycles}
                cursor={cursor}
              />

              {view === "month" && <MonthView cursor={cursor} eventsByDate={eventsByDate} onCreate={openNew} onEdit={onChipClick} />}
              {view === "week" && <WeekView cursor={cursor} eventsByDate={eventsByDate} onCreate={openNew} onEdit={onChipClick} />}
              {view === "season" && <SeasonView cursor={cursor} eventsByDate={eventsByDate} onEdit={onChipClick} onCreate={openNew} season={activeSeason} />}
            </>
          )}

          {section === "structure" && <StructureView teamId={teamId} seasonId={seasonId} />}

          {section === "summary" && (
            <ExecutiveDashboard
              teamId={teamId}
              seasonId={seasonId}
              teamName={teams.find((t) => t.id === teamId)?.name ?? ""}
              seasonName={seasons.find((s) => s.id === seasonId)?.name ?? ""}
              events={Array.from(eventsByDate.values()).flat()}
              microcycles={microcycles}
            />
          )}
        </div>
      )}


      {/* Diálogo evento */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl bg-white text-slate-900 border-slate-200">
          <DialogHeader>
            <DialogTitle className="font-display tracking-[0.2em] text-black">
              {(editing as PlanningEvent | null)?.id ? "EDITAR EVENTO" : "NUEVO EVENTO"}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs font-semibold text-black">Tipo</Label>
                <Select value={editing.type} onValueChange={(v) => setEditing({ ...editing, type: v as PlanningEventType })}>
                  <SelectTrigger className="mt-1 bg-white border-slate-300 text-slate-900"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ALL_TYPES.map((t) => <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-black">Título</Label>
                <Input className="mt-1 bg-white border-slate-300 text-slate-900"
                  value={editing.title ?? ""} maxLength={200}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs font-semibold text-black">Fecha</Label>
                <Input type="date" className="mt-1 bg-white border-slate-300 text-slate-900"
                  value={editing.event_date ?? ""}
                  onChange={(e) => setEditing({ ...editing, event_date: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs font-semibold text-black">Hora</Label>
                <Input type="time" className="mt-1 bg-white border-slate-300 text-slate-900"
                  value={editing.event_time ?? ""}
                  onChange={(e) => setEditing({ ...editing, event_time: e.target.value || null })} />
              </div>
              <div>
                <Label className="text-xs font-semibold text-black">Lugar</Label>
                <Input className="mt-1 bg-white border-slate-300 text-slate-900"
                  value={editing.location ?? ""} maxLength={200}
                  onChange={(e) => setEditing({ ...editing, location: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs font-semibold text-black">Duración (min)</Label>
                <Input type="number" min={0} max={600} className="mt-1 bg-white border-slate-300 text-slate-900"
                  value={editing.duration_minutes ?? ""}
                  onChange={(e) => setEditing({ ...editing, duration_minutes: e.target.value ? Number(e.target.value) : null })} />
              </div>
              {editing.type === "training" && (
                <div>
                  <Label className="text-xs font-semibold text-black">Intensidad prevista</Label>
                  <Select value={editing.intensity ?? ""} onValueChange={(v) => setEditing({ ...editing, intensity: (v || null) as PlanningIntensity | null })}>
                    <SelectTrigger className="mt-1 bg-white border-slate-300 text-slate-900"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(INTENSITY_LABELS) as PlanningIntensity[]).map((k) => (
                        <SelectItem key={k} value={k}>{INTENSITY_LABELS[k]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {editing.type === "match" && (
                <div className="sm:col-span-2">
                  <Label className="text-xs font-semibold text-black">Jornada vinculada</Label>
                  <Select value={editing.fixture_id ?? ""} onValueChange={(v) => setEditing({ ...editing, fixture_id: v || null })}>
                    <SelectTrigger className="mt-1 bg-white border-slate-300 text-slate-900">
                      <SelectValue placeholder={fixtures.length === 0 ? "Sin jornadas en la temporada seleccionada" : "Selecciona jornada (opcional)"} />
                    </SelectTrigger>
                    <SelectContent>
                      {fixtures.map((f) => {
                        const home = sTeams.find((t) => t.id === f.home_team_id)?.name ?? "Local";
                        const away = sTeams.find((t) => t.id === f.away_team_id)?.name ?? "Visitante";
                        return <SelectItem key={f.id} value={f.id}>J{f.matchday} · {home} vs {away}{f.match_date ? ` · ${f.match_date.slice(0, 10)}` : ""}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-[11px] text-slate-600">El rival, fecha y categoría se cargan automáticamente desde la jornada al guardar.</p>
                </div>
              )}
              <div className="sm:col-span-2">
                <Label className="text-xs font-semibold text-black">Observaciones</Label>
                <Textarea className="mt-1 bg-white border-slate-300 text-slate-900"
                  value={editing.notes ?? ""} rows={4} maxLength={4000}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 flex-wrap">
            {(editing as PlanningEvent | null)?.id && (
              <Button variant="destructive" onClick={() => { const e = editing as PlanningEvent; setEditing(null); setConfirmDel(e); }}>
                <Trash2 className="w-4 h-4 mr-1" /> Eliminar
              </Button>
            )}
            {editing?.training_session_id && (
              <Button
                onClick={() => {
                  const sid = editing!.training_session_id as string;
                  setEditing(null);
                  navigate({ to: "/entrenamientos/$sessionId", params: { sessionId: sid } });
                }}
                className="bg-aureon-blue text-white hover:brightness-110"
              >
                <ExternalLink className="w-4 h-4 mr-1" /> Ir a la sesión
              </Button>
            )}
            <Button variant="outline" onClick={() => setEditing(null)} className="border-slate-300 text-slate-900 hover:bg-slate-100">Cancelar</Button>
            <Button onClick={saveEvent} className="bg-aureon-orange text-black hover:bg-aureon-orange/90">Guardar</Button>
            {/* Atajos: crear directamente la sesión/jornada en su módulo, arrastrando la fecha.
                NO pre-guardamos un planning_event aquí: el módulo destino crea su propio registro
                y la planificación se sincroniza por training_session_id / fixture_id, evitando duplicados. */}
            {editing?.type === "training" && !editing?.training_session_id && (
              <Button
                onClick={() => {
                  const date = editing?.event_date ?? "";
                  setEditing(null);
                  navigate({ to: "/entrenamientos/nuevo", search: { ...(date ? { date } : {}), from: "planning" } });
                }}
                className="bg-aureon-blue text-white hover:brightness-110"
              >
                <ExternalLink className="w-4 h-4 mr-1" /> CREAR ENTRENAMIENTO
              </Button>
            )}
            {editing?.type === "match" && !editing?.fixture_id && (
              <Button
                onClick={() => {
                  const date = editing?.event_date ?? "";
                  setEditing(null);
                  navigate({ to: "/temporadas", search: { nuevoFix: "1", from: "planning", ...(date ? { date } : {}) } });
                }}
                className="bg-aureon-red text-white hover:brightness-110"
              >
                <ExternalLink className="w-4 h-4 mr-1" /> NUEVO PARTIDO
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar evento?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteEvent} className="bg-aureon-red text-white hover:bg-aureon-red/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo informativo para eventos provenientes de otros módulos */}
      <Dialog open={!!sourceInfo} onOpenChange={(o) => !o && setSourceInfo(null)}>
        <DialogContent className="max-w-md bg-background/95 backdrop-blur-md border-white/10">
          <DialogHeader>
            <DialogTitle className="font-display tracking-[0.2em] text-white">
              {sourceInfo?.source === "fixture" ? "PARTIDO PROGRAMADO" : "ENTRENAMIENTO PROGRAMADO"}
            </DialogTitle>
          </DialogHeader>
          {sourceInfo && (
            <div className="space-y-3 text-sm">
              <p className="text-white font-medium break-words">{sourceInfo.title}</p>
              <div className="text-[12px] text-white/70 space-y-1">
                <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5" />{sourceInfo.event_date}{sourceInfo.event_time ? ` · ${sourceInfo.event_time.slice(0, 5)}` : ""}</div>
                {sourceInfo.location && <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" />{sourceInfo.location}</div>}
                {sourceInfo.notes && <p className="text-white/60 break-words">{sourceInfo.notes}</p>}
              </div>
              <div className="rounded-lg border border-aureon-orange/30 bg-aureon-orange/10 px-3 py-2 text-[11px] text-white/85">
                Este evento proviene de {sourceInfo.source === "fixture" ? "Gestión de Partidos" : "Gestión de Entrenamientos"}. Cualquier cambio debe hacerse en su módulo original para mantener una única fuente de verdad.
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSourceInfo(null)}>Cerrar</Button>
            {sourceInfo && (
              <Button onClick={() => openSource(sourceInfo)} className="bg-aureon-orange text-black hover:bg-aureon-orange/90">
                <ExternalLink className="w-4 h-4 mr-1" /> Abrir en módulo
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </ModuleShell>
  );
}

// ─────────── Vista MES ───────────
function MonthView({ cursor, eventsByDate, onCreate, onEdit }: {
  cursor: Date; eventsByDate: Map<string, CalendarEvent[]>;
  onCreate: (d: string) => void; onEdit: (e: CalendarEvent) => void;
}) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startCol = (first.getDay() + 6) % 7; // L=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startCol; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  const today = ymd(new Date());

  return (
    <div className="rounded-2xl border border-white/10 bg-background/40 backdrop-blur-md overflow-hidden">
      <div className="grid grid-cols-7 text-[10px] uppercase tracking-[0.2em] text-white/70 bg-white/5">
        {["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"].map((d) => (
          <div key={d} className="px-2 py-2 text-center border-r border-white/10 last:border-r-0">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 auto-rows-fr">
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="min-h-[72px] sm:min-h-[110px] border-t border-r border-white/10 last:border-r-0 bg-background/20" />;
          const key = ymd(d);
          const evs = eventsByDate.get(key) ?? [];
          const isToday = key === today;
          return (
            <div
              key={i}
              onClick={() => onCreate(key)}
              className={`text-left min-h-[72px] sm:min-h-[110px] border-t border-r border-white/10 last:border-r-0 p-1 sm:p-1.5 hover:bg-white/5 transition-colors cursor-pointer overflow-hidden ${isToday ? "bg-aureon-orange/10" : ""}`}
            >
              <div className={`text-[10px] sm:text-[11px] font-display tracking-wider mb-1 ${isToday ? "text-aureon-orange" : "text-white/90"}`}>{d.getDate()}</div>
              <div className="space-y-0.5 sm:space-y-1">
                {evs.map((e) => <EventChip key={e.id} ev={e} onClick={() => onEdit(e)} />)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────── Vista SEMANA ───────────
function WeekView({ cursor, eventsByDate, onCreate, onEdit }: {
  cursor: Date; eventsByDate: Map<string, CalendarEvent[]>;
  onCreate: (d: string) => void; onEdit: (e: CalendarEvent) => void;
}) {
  const start = startOfWeek(cursor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const today = ymd(new Date());
  return (
    <div className="grid gap-3 md:grid-cols-7">
      {days.map((d) => {
        const key = ymd(d);
        const evs = eventsByDate.get(key) ?? [];
        const isToday = key === today;
        return (
          <div
            key={key}
            onClick={(e) => { if (e.target === e.currentTarget) onCreate(key); }}
            className={`rounded-xl border ${isToday ? "border-aureon-orange/50 bg-aureon-orange/5" : "border-white/10 bg-background/40"} backdrop-blur-md p-3 min-h-[180px] cursor-pointer hover:bg-white/5 transition-colors`}
          >
            <div className="flex items-center justify-between mb-2">
              <div onClick={() => onCreate(key)} className="cursor-pointer">
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/70">{d.toLocaleDateString("es-ES", { weekday: "short" })}</div>
                <div className={`font-display text-lg ${isToday ? "text-aureon-orange" : "text-white"}`}>{d.getDate()}</div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); onCreate(key); }} className="p-1 rounded hover:bg-white/10 text-white/70" title="Añadir">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
              {evs.length === 0
                ? <p className="text-[11px] text-white/40 cursor-pointer" onClick={() => onCreate(key)}>Sin eventos · pulsa para añadir</p>
                : evs.map((e) => <EventChip key={e.id} ev={e} expanded onClick={() => onEdit(e)} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────── Vista TEMPORADA (mini-calendarios mensuales según rango real) ───────────
function SeasonView({ cursor, eventsByDate, onEdit, onCreate, season }: {
  cursor: Date; eventsByDate: Map<string, CalendarEvent[]>; onEdit: (e: CalendarEvent) => void;
  onCreate: (d: string) => void;
  season: { start_date: string | null; end_date: string | null } | null;
}) {
  // Si la temporada define fechas, mostramos sólo los meses entre inicio y fin.
  // Si no, caemos al año del cursor (12 meses naturales).
  const months: Date[] = (() => {
    if (season?.start_date && season?.end_date) {
      const start = new Date(season.start_date + "T00:00:00");
      const end = new Date(season.end_date + "T00:00:00");
      const list: Date[] = [];
      const m = new Date(start.getFullYear(), start.getMonth(), 1);
      const last = new Date(end.getFullYear(), end.getMonth(), 1);
      while (m <= last) {
        list.push(new Date(m));
        m.setMonth(m.getMonth() + 1);
      }
      return list;
    }
    const y = cursor.getFullYear();
    return Array.from({ length: 12 }, (_, i) => new Date(y, i, 1));
  })();
  const today = ymd(new Date());
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {months.map((m) => {
        const year = m.getFullYear();
        const monthIdx = m.getMonth();
        const first = new Date(year, monthIdx, 1);
        const startCol = (first.getDay() + 6) % 7;
        const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
        const cells: (Date | null)[] = [];
        for (let i = 0; i < startCol; i++) cells.push(null);
        for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, monthIdx, d));
        while (cells.length % 7 !== 0) cells.push(null);

        return (
          <div key={`${year}-${monthIdx}`} className="rounded-xl border border-white/10 bg-background/40 backdrop-blur-md p-3">
            <div className="font-display text-sm tracking-[0.2em] text-white mb-2">
              {m.toLocaleDateString("es-ES", { month: "long", year: "numeric" }).toUpperCase()}
            </div>
            <div className="grid grid-cols-7 text-[9px] uppercase tracking-wider text-white/55 mb-1">
              {["L","M","X","J","V","S","D"].map((d) => (
                <div key={d} className="text-center py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((d, i) => {
                if (!d) return <div key={i} className="aspect-square rounded-md bg-transparent" />;
                const key = ymd(d);
                const evs = eventsByDate.get(key) ?? [];
                const isToday = key === today;
                const hasMatch = evs.some((e) => e.type === "match");
                const hasTraining = evs.some((e) => e.type === "training");
                const bg = hasMatch
                  ? "bg-green-600/85 border-green-400/70"
                  : hasTraining
                  ? "bg-aureon-blue/85 border-blue-300/70"
                  : "bg-background/60 border-white/10";
                const textCls = (hasMatch || hasTraining) ? "text-white" : "text-white/85";
                const matchEv = evs.find((e) => e.type === "match");
                const trainingEv = evs.find((e) => e.type === "training");
                const primaryEv = matchEv ?? trainingEv ?? evs[0];

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => (primaryEv ? onEdit(primaryEv) : onCreate(key))}
                    title={
                      evs.length === 0
                        ? `${key} · pulsa para añadir`
                        : evs.map((e) => `${TYPE_LABELS[e.type]}: ${e.title || ""}`).join("\n")
                    }
                    className={`relative aspect-square rounded-md border ${bg} ${textCls} hover:brightness-110 cursor-pointer ${isToday ? "ring-2 ring-aureon-orange" : ""} flex flex-col items-stretch justify-between p-1 overflow-hidden transition`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-display leading-none">{d.getDate()}</span>
                      {hasMatch && (
                        <span className="text-[9px] font-bold leading-none bg-white text-green-700 rounded px-1 py-px">P</span>
                      )}
                    </div>
                    {trainingEv && !hasMatch && (
                      <span className="text-[8px] leading-tight truncate text-left font-medium">
                        {trainingEv.title || "Entreno"}
                      </span>
                    )}
                    {evs.length > 1 && (
                      <span className="absolute bottom-0.5 right-0.5 text-[8px] leading-none bg-black/40 rounded px-1 py-px">+{evs.length - 1}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EventChip({ ev, onClick, expanded }: { ev: CalendarEvent; onClick: () => void; expanded?: boolean }) {
  const Icon = TYPE_ICONS[ev.type];
  const external = ev.source !== "planning";
  const sourceLabel =
    ev.source === "fixture" ? "Desde Gestión de Partidos"
    : ev.source === "training_session" ? "Desde Gestión de Entrenamientos"
    : "";
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`w-full min-w-0 flex items-center gap-1 sm:gap-1.5 text-left px-1 sm:px-1.5 py-0.5 sm:py-1 rounded text-[10px] sm:text-[11px] leading-tight ${TYPE_COLORS[ev.type]} hover:opacity-90 ${external ? "ring-1 ring-white/40 ring-inset" : ""}`}
      title={`${sourceLabel ? sourceLabel + " · " : ""}${TYPE_LABELS[ev.type]}: ${ev.title || ""}`}
    >
      <Icon className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
      {external && <Link2 className="hidden sm:inline-block w-2.5 h-2.5 flex-shrink-0 opacity-90" />}
      <span className="truncate font-medium min-w-0">{ev.title || TYPE_LABELS[ev.type]}</span>
      {expanded && ev.event_time && (
        <span className="ml-auto inline-flex items-center gap-0.5 opacity-90 flex-shrink-0"><Clock className="w-3 h-3" />{ev.event_time.slice(0, 5)}</span>
      )}
      {expanded && !ev.event_time && ev.location && (
        <span className="ml-auto hidden sm:inline-flex items-center gap-0.5 opacity-90 truncate max-w-[60%]"><MapPin className="w-3 h-3" />{ev.location}</span>
      )}
    </button>
  );
}


// Re-export del icono Pencil para que el bundler no lo elimine si se usa en futuro.
export { Pencil };
