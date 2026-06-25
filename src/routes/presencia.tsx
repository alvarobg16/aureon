import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ModuleShell } from "@/components/ModuleShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Link2, Trash2, Printer, AlertTriangle, CheckCheck, Search } from "lucide-react";

export const Route = createFileRoute("/presencia")({
  head: () => ({ meta: [{ title: "Presencia — Aureon Futsal Pro Suite" }] }),
  component: PresenciaPage,
});

type Team = { id: string; name: string; category: string };
type Player = { id: string; first_name: string; last_name: string; sport_name: string; jersey_number: number | null; team_id: string | null };
type Training = { id: string; team_id: string; date: string; time: string; notes: string; season_id: string | null; source_session_id: string | null };
type Attendance = { id: string; training_id: string; player_id: string; status: "present" | "absent" | "justified" };
type Season = { id: string; name: string; is_active: boolean };
type SourceSession = {
  id: string; team_id: string; session_date: string | null; session_time: string;
  session_number: string; competitive_period: string; microcycle: string; rival: string; objectives: string; venue: string;
};

const STATUS_LABEL: Record<string, string> = { present: "Presente", absent: "Ausente", justified: "Justificada" };
const STATUS_ACTIVE: Record<string, string> = {
  present: "bg-emerald-500 border-emerald-400 text-white shadow-md shadow-emerald-500/40",
  absent: "bg-red-600 border-red-400 text-white shadow-md shadow-red-600/40",
  justified: "bg-yellow-500 border-yellow-300 text-black shadow-md shadow-yellow-500/40",
};
const STATUS_IDLE: Record<string, string> = {
  present: "bg-emerald-500/10 border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/25",
  absent: "bg-red-500/10 border-red-400/40 text-red-200 hover:bg-red-500/25",
  justified: "bg-yellow-500/10 border-yellow-400/40 text-yellow-200 hover:bg-yellow-500/25",
};

function pad(n: number) { return n.toString().padStart(2, "0"); }
function ymd(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

function PresenciaPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [teamId, setTeamId] = useState<string>("");
  const [seasonId, setSeasonId] = useState<string>("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<Date>(() => { const d = new Date(); d.setDate(1); return d; });

  // Diálogo asignar entrenamiento desde módulo Entrenamientos
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignSearch, setAssignSearch] = useState("");
  const [sourceSessions, setSourceSessions] = useState<SourceSession[]>([]);
  // Marcador de asistencia
  const [markerOpen, setMarkerOpen] = useState<null | Training>(null);
  // Historial por jugador
  const [historyPlayer, setHistoryPlayer] = useState<null | Player>(null);

  useEffect(() => {
    (async () => {
      const [{ data: t }, { data: s }] = await Promise.all([
        supabase.from("teams").select("id,name,category").order("name"),
        supabase.from("seasons").select("id,name,is_active").order("created_at", { ascending: false }),
      ]);
      const ts = (t as Team[]) ?? [];
      setTeams(ts);
      setSeasons((s as Season[]) ?? []);
      const stored = localStorage.getItem("aureon.activeSeasonId");
      const storedTeam = localStorage.getItem("aureon.presenciaTeamId");
      if (storedTeam && ts.some(x => x.id === storedTeam)) setTeamId(storedTeam);
      else if (ts[0]) setTeamId(ts[0].id);
      if (stored) setSeasonId(stored);
      else setSeasonId((s as Season[] | null)?.find(x => x.is_active)?.id ?? "");
      setLoading(false);
    })();
  }, []);

  useEffect(() => { if (teamId) localStorage.setItem("aureon.presenciaTeamId", teamId); loadTeamData(); /* eslint-disable-next-line */ }, [teamId, seasonId]);

  const loadTeamData = async () => {
    if (!teamId) { setPlayers([]); setTrainings([]); setAttendance([]); return; }
    const [{ data: p }, { data: tr }] = await Promise.all([
      supabase.from("players").select("id,first_name,last_name,sport_name,jersey_number,team_id").eq("team_id", teamId).order("jersey_number", { nullsFirst: false }),
      (() => {
        let q = supabase.from("presence_trainings").select("*").eq("team_id", teamId);
        if (seasonId) q = q.eq("season_id", seasonId);
        return q.order("date", { ascending: false });
      })(),
    ]);
    setPlayers((p as Player[]) ?? []);
    const trs = (tr as Training[]) ?? [];
    setTrainings(trs);
    if (trs.length) {
      const { data: at } = await supabase.from("presence_attendance").select("*").in("training_id", trs.map(x => x.id));
      setAttendance((at as Attendance[]) ?? []);
    } else setAttendance([]);
  };

  const monthName = useMemo(() => cursor.toLocaleDateString("es-ES", { month: "long", year: "numeric" }), [cursor]);

  const monthCells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first);
    const dow = (first.getDay() + 6) % 7; // Lunes=0
    start.setDate(first.getDate() - dow);
    const cells: Array<{ date: Date; inMonth: boolean }> = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      cells.push({ date: d, inMonth: d.getMonth() === cursor.getMonth() });
    }
    return cells;
  }, [cursor]);

  const trainingsByDate = useMemo(() => {
    const m: Record<string, Training[]> = {};
    trainings.forEach(t => { (m[t.date] ??= []).push(t); });
    return m;
  }, [trainings]);

  const attendanceByTraining = useMemo(() => {
    const m: Record<string, Attendance[]> = {};
    attendance.forEach(a => { (m[a.training_id] ??= []).push(a); });
    return m;
  }, [attendance]);

  // % asistencia por jugador (todos los entrenamientos visibles del filtro)
  const playerStats = useMemo(() => {
    return players.map(p => {
      let total = 0, present = 0, justified = 0;
      trainings.forEach(t => {
        const att = attendanceByTraining[t.id]?.find(a => a.player_id === p.id);
        if (!att) return;
        total++;
        if (att.status === "present") present++;
        if (att.status === "justified") justified++;
      });
      const pct = total ? Math.round((present / total) * 100) : 0;
      const absences = total - present - justified;
      const absencePct = total ? Math.round((absences / total) * 100) : 0;
      return { p, total, present, justified, absences, pct, absencePct, atRisk: absencePct >= 25 };
    }).sort((a, b) => b.pct - a.pct);
  }, [players, trainings, attendanceByTraining]);

  // % por día (calendario)
  const dayStats = (date: string) => {
    const ts = trainingsByDate[date];
    if (!ts || ts.length === 0) return null;
    let total = 0, present = 0;
    ts.forEach(t => {
      attendanceByTraining[t.id]?.forEach(a => { total++; if (a.status === "present") present++; });
    });
    if (total === 0) return { hasTraining: true, pct: null as number | null };
    return { hasTraining: true, pct: Math.round((present / total) * 100) };
  };

  // ─── Asignar entrenamiento desde módulo Entrenamientos ───
  const openAssignDialog = async () => {
    if (!teamId) return toast.error("Selecciona un equipo");
    setAssignSearch("");
    setAssignOpen(true);
    const { data, error } = await supabase
      .from("training_sessions")
      .select("id,team_id,session_date,session_time,session_number,competitive_period,microcycle,rival,objectives,venue")
      .eq("team_id", teamId)
      .order("session_date", { ascending: false, nullsFirst: false });
    if (error) return toast.error("Error al cargar entrenamientos");
    setSourceSessions((data as SourceSession[]) ?? []);
  };

  const assignedSourceIds = useMemo(
    () => new Set(trainings.map(t => t.source_session_id).filter(Boolean) as string[]),
    [trainings],
  );

  const assignSession = async (s: SourceSession) => {
    if (!s.session_date) return toast.error("El entrenamiento no tiene fecha asignada");
    if (assignedSourceIds.has(s.id)) return toast.error("Este entrenamiento ya está asignado");
    const notesParts = [
      s.session_number && `Sesión ${s.session_number}`,
      s.microcycle && `MC ${s.microcycle}`,
      s.competitive_period,
      s.rival && `vs ${s.rival}`,
      s.objectives,
    ].filter(Boolean);
    const payload = {
      team_id: teamId,
      season_id: seasonId || null,
      date: s.session_date,
      time: s.session_time || "",
      notes: notesParts.join(" · "),
      source_session_id: s.id,
    };
    const { error } = await supabase.from("presence_trainings").insert(payload);
    if (error) return toast.error(error.message.includes("unique") ? "Ya estaba asignado" : "Error al asignar");
    toast.success("Entrenamiento asignado");
    setAssignOpen(false);
    loadTeamData();
  };

  const deleteTraining = async (t: Training) => {
    if (!confirm("¿Quitar este entrenamiento de Presencia y su asistencia? (No afecta al módulo Entrenamientos)")) return;
    await supabase.from("presence_attendance").delete().eq("training_id", t.id);
    await supabase.from("presence_trainings").delete().eq("id", t.id);
    toast.success("Eliminado"); loadTeamData();
  };


  // ─── Asistencia ───
  const setStatus = async (training: Training, playerId: string, status: "present" | "absent" | "justified") => {
    const existing = attendance.find(a => a.training_id === training.id && a.player_id === playerId);
    if (existing) {
      await supabase.from("presence_attendance").update({ status }).eq("id", existing.id);
    } else {
      await supabase.from("presence_attendance").insert({ training_id: training.id, player_id: playerId, status });
    }
    loadTeamData();
  };
  const markAllPresent = async (training: Training) => {
    const rows = players.map(p => ({ training_id: training.id, player_id: p.id, status: "present" as const }));
    // upsert
    await supabase.from("presence_attendance").delete().eq("training_id", training.id);
    if (rows.length) await supabase.from("presence_attendance").insert(rows);
    toast.success("Todos marcados como presentes");
    loadTeamData();
  };

  const team = teams.find(t => t.id === teamId);

  return (
    <ModuleShell
      title="PRESENCIA"
      subtitle="Asistencia a entrenamientos · Calendario · Estadísticas"
      actions={
        <div className="flex items-center gap-2">
          <Button onClick={() => window.print()} variant="outline" size="sm" className="text-xs">
            <Printer className="w-3.5 h-3.5 mr-1" /> Imprimir / PDF
          </Button>
          <Link to="/temporadas" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-aureon-orange text-black text-xs font-display tracking-[0.2em]">
            ← VOLVER
          </Link>
        </div>
      }
    >
      {loading ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : (
        <div className="space-y-6">
          {/* Filtros */}
          <div className="rounded-2xl border border-white/10 bg-background/40 backdrop-blur p-5 grid gap-3 sm:grid-cols-3">
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-white/70">Equipo</Label>
              <Select value={teamId} onValueChange={setTeamId}>
                <SelectTrigger className="mt-1 bg-background/60 border-white/15"><SelectValue placeholder="Equipo" /></SelectTrigger>
                <SelectContent>
                  {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}{t.category ? ` · ${t.category}` : ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-white/70">Temporada</Label>
              <Select value={seasonId || "__all__"} onValueChange={(v) => setSeasonId(v === "__all__" ? "" : v)}>
                <SelectTrigger className="mt-1 bg-background/60 border-white/15"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas</SelectItem>
                  {seasons.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={openAssignDialog} className="bg-aureon-orange text-black hover:bg-aureon-orange/90 w-full">
                <Link2 className="w-4 h-4 mr-1" /> ASIGNAR ENTRENAMIENTO
              </Button>
            </div>
          </div>

          {!teamId ? (
            <div className="rounded-2xl border border-white/10 bg-background/40 p-10 text-center text-muted-foreground">Selecciona un equipo.</div>
          ) : (
            <>
              {/* Calendario */}
              <section className="rounded-2xl border border-white/10 bg-background/40 backdrop-blur p-5">
                <div className="flex items-center justify-between mb-4">
                  <Button size="sm" variant="outline" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <h3 className="font-display text-lg tracking-[0.25em] text-white uppercase">{monthName}</h3>
                  <Button size="sm" variant="outline" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-[10px] uppercase tracking-wider text-white/60 font-display mb-1">
                  {["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].map(d => <div key={d} className="text-center p-1">{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {monthCells.map((c, i) => {
                    const key = ymd(c.date);
                    const ts = trainingsByDate[key] ?? [];
                    const stats = dayStats(key);
                    let bg = "bg-white/5";
                    if (stats?.pct != null) {
                      if (stats.pct > 80) bg = "bg-emerald-500/40";
                      else if (stats.pct >= 50) bg = "bg-yellow-500/40";
                      else bg = "bg-red-500/40";
                    } else if (ts.length) bg = "bg-aureon-blue/30";
                    return (
                      <div key={i} className={`min-h-[70px] rounded-md border border-white/10 p-1 ${c.inMonth ? bg : "opacity-40 bg-black/30"}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-white/80">{c.date.getDate()}</span>
                        </div>
                        {ts.map(t => (
                          <button
                            key={t.id}
                            onClick={() => setMarkerOpen(t)}
                            className="mt-1 block w-full text-left text-[10px] rounded bg-black/40 px-1 py-0.5 hover:bg-black/60"
                            title={t.notes || "Entrenamiento"}
                          >
                            {t.time || "—"} {stats?.pct != null && <span className="ml-1 font-display">{stats.pct}%</span>}
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-white/70">
                  <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500/60" /> &gt;80%</span>
                  <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-500/60" /> 50–80%</span>
                  <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500/60" /> &lt;50%</span>
                  <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-aureon-blue/40" /> Programado sin marcar</span>
                </div>
              </section>

              {/* Lista de entrenamientos */}
              <section className="rounded-2xl border border-white/10 bg-background/40 backdrop-blur p-5">
                <h3 className="font-display text-lg tracking-[0.25em] text-aureon-blue mb-3">ENTRENAMIENTOS</h3>
                {trainings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin entrenamientos. Crea el primero.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-white/10 text-[10px] uppercase tracking-wider text-white font-display">
                        <tr>
                          <th className="text-left p-2">Fecha</th>
                          <th className="text-left p-2">Hora</th>
                          <th className="text-left p-2">Notas</th>
                          <th className="text-right p-2">Asistencia</th>
                          <th className="text-right p-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {trainings.map(t => {
                          const att = attendanceByTraining[t.id] ?? [];
                          const present = att.filter(a => a.status === "present").length;
                          const total = players.length;
                          const pct = total ? Math.round((present / total) * 100) : 0;
                          return (
                            <tr key={t.id} className="border-t border-white/5">
                              <td className="p-2 text-white">{t.date}</td>
                              <td className="p-2 text-white/80">{t.time || "—"}</td>
                              <td className="p-2 text-white/70 truncate max-w-[280px]">{t.notes}</td>
                              <td className="p-2 text-right tabular-nums text-aureon-orange font-display">{present}/{total} · {pct}%</td>
                              <td className="p-2 text-right">
                                <Button size="sm" onClick={() => setMarkerOpen(t)} className="h-7 text-xs bg-white text-black hover:bg-white/90 mr-1">Marcar</Button>
                                <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => deleteTraining(t)}><Trash2 className="w-3 h-3" /></Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* Estadísticas por jugador */}
              <section className="rounded-2xl border border-white/10 bg-background/40 backdrop-blur p-5">
                <h3 className="font-display text-lg tracking-[0.25em] text-aureon-blue mb-3">RANKING DE ASISTENCIA</h3>
                {playerStats.filter(s => s.atRisk).length > 0 && (
                  <div className="mb-3 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200 inline-flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Jugadores en riesgo (≥25% ausencias):
                    <span className="text-white">{playerStats.filter(s => s.atRisk).map(s => s.p.sport_name || `${s.p.first_name} ${s.p.last_name}`).join(", ")}</span>
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-white/10 text-[10px] uppercase tracking-wider text-white font-display">
                      <tr>
                        <th className="text-left p-2">#</th>
                        <th className="text-left p-2"></th>
                        <th className="text-left p-2">Jugador</th>
                        <th className="text-right p-2">Asistidos</th>
                        <th className="text-right p-2">Ausencias</th>
                        <th className="text-right p-2">Total</th>
                        <th className="text-right p-2">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {playerStats.map(s => (
                        <tr key={s.p.id} className="border-t border-white/5 hover:bg-white/5 cursor-pointer" onClick={() => setHistoryPlayer(s.p)}>
                          <td className="p-2 font-display text-white">{s.p.jersey_number ?? "—"}</td>
                          <td className="p-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); setHistoryPlayer(s.p); }}
                              className="px-2 py-0.5 rounded-md bg-aureon-blue text-white text-[10px] font-display tracking-wider hover:bg-aureon-blue/80"
                            >
                              VER
                            </button>
                          </td>
                          <td className="p-2 text-white">{s.p.sport_name || `${s.p.first_name} ${s.p.last_name}`}</td>
                          <td className="p-2 text-right tabular-nums text-emerald-300">{s.present}</td>
                          <td className="p-2 text-right tabular-nums text-red-300">{s.absences}</td>
                          <td className="p-2 text-right tabular-nums text-white">{s.total}</td>
                          <td className={`p-2 text-right font-display tabular-nums ${s.pct > 80 ? "text-emerald-300" : s.pct >= 50 ? "text-yellow-300" : "text-red-300"}`}>{s.pct}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </div>
      )}

      {/* Diálogo Asignar entrenamiento desde módulo Entrenamientos */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-2xl bg-slate-900 border-white/15 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Asignar entrenamiento</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-white/60">
              Selecciona un entrenamiento creado en el módulo ENTRENAMIENTOS para vincularlo a Presencia.
              La asistencia que registres quedará asociada a ese entrenamiento.
            </p>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-white/50" />
              <Input
                placeholder="Buscar por fecha, sesión, microciclo, rival…"
                value={assignSearch}
                onChange={e => setAssignSearch(e.target.value)}
                className="pl-9 bg-background/60 border-white/15"
              />
            </div>
            <div className="max-h-[55vh] overflow-y-auto rounded-lg border border-white/10 divide-y divide-white/5">
              {(() => {
                const q = assignSearch.trim().toLowerCase();
                const list = sourceSessions.filter(s => {
                  if (!q) return true;
                  return [s.session_date, s.session_time, s.session_number, s.microcycle, s.competitive_period, s.rival, s.objectives, s.venue]
                    .join(" ").toLowerCase().includes(q);
                });
                if (sourceSessions.length === 0) {
                  return (
                    <div className="p-6 text-center text-sm text-white/60">
                      No hay entrenamientos creados para este equipo en el módulo ENTRENAMIENTOS.
                      <div className="mt-3">
                        <Link to="/entrenamientos" className="text-aureon-orange underline">Ir a crear entrenamiento</Link>
                      </div>
                    </div>
                  );
                }
                if (list.length === 0) return <div className="p-6 text-center text-sm text-white/60">Sin resultados.</div>;
                return list.map(s => {
                  const already = assignedSourceIds.has(s.id);
                  return (
                    <div key={s.id} className="flex items-center gap-3 p-3 hover:bg-white/5">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white flex items-center gap-2 flex-wrap">
                          <span className="font-display tabular-nums">{s.session_date ?? "Sin fecha"}</span>
                          {s.session_time && <span className="text-white/70">{s.session_time}</span>}
                          {s.session_number && <span className="text-aureon-orange text-[11px]">Sesión {s.session_number}</span>}
                          {s.microcycle && <span className="text-aureon-blue text-[11px]">MC {s.microcycle}</span>}
                        </div>
                        <div className="text-xs text-white/60 truncate">
                          {[s.competitive_period, s.rival && `vs ${s.rival}`, s.objectives].filter(Boolean).join(" · ") || "—"}
                        </div>
                      </div>
                      {already ? (
                        <span className="text-[10px] font-display tracking-wider text-emerald-300 border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 rounded">YA ASIGNADO</span>
                      ) : (
                        <Button
                          size="sm"
                          disabled={!s.session_date}
                          onClick={() => assignSession(s)}
                          className="bg-aureon-orange text-black hover:bg-aureon-orange/90 h-8 text-xs"
                        >
                          <Link2 className="w-3.5 h-3.5 mr-1" /> ASIGNAR
                        </Button>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo marcador de asistencia */}
      <Dialog open={!!markerOpen} onOpenChange={(o) => !o && setMarkerOpen(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Asistencia · {markerOpen?.date} {markerOpen?.time && `· ${markerOpen.time}`}</DialogTitle>
          </DialogHeader>
          {markerOpen && (
            <>
              <div className="flex justify-end mb-2">
                <Button size="sm" onClick={() => markAllPresent(markerOpen)} className="bg-emerald-600 text-white hover:bg-emerald-700">
                  <CheckCheck className="w-4 h-4 mr-1" /> Todos presentes
                </Button>
              </div>
              <div className="max-h-[55vh] overflow-y-auto space-y-1">
                {players.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin jugadores en el equipo.</p>
                ) : players.map(p => {
                  const cur = attendance.find(a => a.training_id === markerOpen.id && a.player_id === p.id);
                  return (
                    <div key={p.id} className="flex items-center gap-2 p-2 rounded-lg border border-white/15 bg-slate-800/80">
                      <span className="font-display text-aureon-orange w-7 text-center">{p.jersey_number ?? "—"}</span>
                      <span className="flex-1 text-white text-sm font-medium">{p.sport_name || `${p.first_name} ${p.last_name}`}</span>
                      {(["present","absent"] as const).map(st => (
                        <button
                          key={st}
                          onClick={() => setStatus(markerOpen, p.id, st)}
                          className={`px-2.5 py-1 text-[10px] rounded-md border font-display tracking-wider uppercase transition ${cur?.status === st ? STATUS_ACTIVE[st] : STATUS_IDLE[st]}`}
                        >
                          {STATUS_LABEL[st]}
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo historial del jugador */}
      <Dialog open={!!historyPlayer} onOpenChange={(o) => !o && setHistoryPlayer(null)}>
        <DialogContent className="max-w-lg bg-slate-900 border-white/15 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              Historial de asistencia · {historyPlayer?.sport_name || (historyPlayer ? `${historyPlayer.first_name} ${historyPlayer.last_name}` : "")}
            </DialogTitle>
          </DialogHeader>
          {historyPlayer && (() => {
            const rows = trainings
              .map(t => ({ t, a: attendance.find(a => a.training_id === t.id && a.player_id === historyPlayer.id) }))
              .sort((x, y) => y.t.date.localeCompare(x.t.date));
            const present = rows.filter(r => r.a?.status === "present");
            const absent = rows.filter(r => r.a?.status === "absent");
            const unmarked = rows.filter(r => !r.a);
            const Section = ({ title, items, cls }: { title: string; items: typeof rows; cls: string }) => (
              <div className={`rounded-lg border p-3 ${cls}`}>
                <div className="font-display tracking-wider text-xs uppercase mb-2">{title} · {items.length}</div>
                {items.length === 0 ? (
                  <p className="text-xs text-white/50">—</p>
                ) : (
                  <ul className="space-y-1 max-h-40 overflow-y-auto">
                    {items.map(r => (
                      <li key={r.t.id} className="text-sm flex justify-between gap-2">
                        <span>{r.t.date}</span>
                        <span className="opacity-70">{r.t.time || ""}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Section title="Presentes" items={present} cls="border-emerald-400/40 bg-emerald-500/15 text-emerald-100" />
                <Section title="Ausentes" items={absent} cls="border-red-400/40 bg-red-500/15 text-red-100" />
                <Section title="Sin marcar" items={unmarked} cls="border-white/15 bg-white/10 text-white/90 sm:col-span-2" />
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </ModuleShell>
  );
}
