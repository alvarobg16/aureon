import { useEffect, useMemo, useState } from "react";
import { Activity, Award, BarChart3, Calendar as CalIcon, Download, Target, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  type CalendarEvent, type Macrocycle, type Mesocycle, type Microcycle, type TeamGoal,
  LOAD_LABELS, LOAD_COLORS, STATUS_LABELS, STATUS_COLORS, GOAL_CATEGORIES,
  parseYmd, ymd, startOfWeek, addDays,
} from "@/lib/planning";
import { generatePlanningPdf } from "@/lib/planning-pdf";

type Props = {
  teamId: string;
  seasonId: string;
  teamName: string;
  seasonName: string;
  events: CalendarEvent[];
  microcycles: Microcycle[];
};

export function ExecutiveDashboard({ teamId, seasonId, teamName, seasonName, events, microcycles }: Props) {
  const [macros, setMacros] = useState<Macrocycle[]>([]);
  const [mesos, setMesos] = useState<Mesocycle[]>([]);
  const [goals, setGoals] = useState<TeamGoal[]>([]);

  useEffect(() => {
    (async () => {
      if (!teamId) return;
      const [{ data: ma }, { data: me }, { data: g }] = await Promise.all([
        (supabase as any).from("planning_macrocycles").select("*").eq("team_id", teamId).order("start_date"),
        (supabase as any).from("planning_mesocycles").select("*").eq("team_id", teamId).order("start_date"),
        (supabase as any).from("planning_team_goals").select("*").eq("team_id", teamId),
      ]);
      setMacros((ma as Macrocycle[]) ?? []);
      setMesos((me as Mesocycle[]) ?? []);
      setGoals((g as TeamGoal[]) ?? []);
    })();
  }, [teamId, seasonId]);

  const stats = useMemo(() => {
    const today = ymd(new Date());
    const total = events.length;
    const trainings = events.filter((e) => e.type === "training").length;
    const matches = events.filter((e) => e.type === "match").length;
    const rests = events.filter((e) => e.type === "rest").length;
    const past = events.filter((e) => e.event_date < today).length;
    const future = total - past;
    const seasonProgress = total > 0 ? Math.round((past / total) * 100) : 0;

    const achieved = goals.filter((g) => g.status === "achieved").length;
    const inProgress = goals.filter((g) => g.status === "in_progress").length;
    const missed = goals.filter((g) => g.status === "missed").length;
    const pending = goals.filter((g) => g.status === "pending").length;
    const compliance = goals.length > 0 ? Math.round((achieved / goals.length) * 100) : 0;

    // Macro/Meso activos hoy
    const now = new Date();
    const activeMacro = macros.find((m) => parseYmd(m.start_date) <= now && parseYmd(m.end_date) >= now);
    const activeMeso = mesos.find((m) => parseYmd(m.start_date) <= now && parseYmd(m.end_date) >= now);
    const weekStart = startOfWeek(now);
    const weekEnd = addDays(weekStart, 6);
    const activeMicro = microcycles.find((m) => parseYmd(m.week_start) <= weekEnd && parseYmd(m.week_end) >= weekStart);

    return {
      total, trainings, matches, rests, past, future, seasonProgress,
      achieved, inProgress, missed, pending, compliance,
      activeMacro, activeMeso, activeMicro,
    };
  }, [events, goals, macros, mesos, microcycles]);

  const onExportPdf = () => {
    try {
      const doc = generatePlanningPdf({
        teamName, seasonName, events,
        macrocycles: macros, mesocycles: mesos, microcycles, goals,
      });
      const safeTeam = (teamName || "equipo").replace(/[^a-z0-9]+/gi, "_").toLowerCase();
      doc.save(`planificacion_${safeTeam}_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success("Informe PDF generado");
    } catch (e: any) {
      toast.error("No se pudo generar el PDF");
    }
  };

  return (
    <section className="space-y-5">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-aureon-orange" />
          <h3 className="font-display tracking-[0.2em] text-white text-sm">DASHBOARD EJECUTIVO</h3>
        </div>
        <Button onClick={onExportPdf} className="bg-aureon-orange hover:bg-aureon-orange/90 text-black gap-2">
          <Download className="w-4 h-4" /> Exportar informe PDF
        </Button>
      </header>

      {/* KPIs principales */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<CalIcon className="w-4 h-4" />} label="Eventos planificados" value={String(stats.total)} hint={`${stats.past} pasados · ${stats.future} próximos`} />
        <Kpi icon={<Activity className="w-4 h-4" />} label="Entrenamientos" value={String(stats.trainings)} hint={`${stats.matches} partidos · ${stats.rests} descansos`} />
        <Kpi icon={<Target className="w-4 h-4" />} label="Objetivos" value={`${stats.achieved}/${goals.length}`} hint={`${stats.compliance}% cumplimiento`} />
        <Kpi icon={<TrendingUp className="w-4 h-4" />} label="Avance temporada" value={`${stats.seasonProgress}%`} hint="Eventos completados" progress={stats.seasonProgress} />
      </div>

      {/* Estado de ciclos */}
      <div className="grid gap-3 lg:grid-cols-3">
        <CycleCard title="Macrociclo actual" name={stats.activeMacro?.name ?? "—"} subtitle={stats.activeMacro?.objective || "Sin macrociclo activo"} />
        <CycleCard title="Mesociclo actual" name={stats.activeMeso?.name ?? "—"} subtitle={stats.activeMeso?.focus || "Sin mesociclo activo"}
          badge={stats.activeMeso ? <span className={`px-2 py-0.5 rounded text-[11px] ${LOAD_COLORS[stats.activeMeso.expected_load]}`}>{LOAD_LABELS[stats.activeMeso.expected_load]}</span> : null} />
        <CycleCard title="Microciclo actual" name={stats.activeMicro?.name ?? "—"} subtitle={stats.activeMicro?.weekly_objective || "Sin microciclo activo"}
          badge={stats.activeMicro ? <span className={`px-2 py-0.5 rounded text-[11px] ${LOAD_COLORS[stats.activeMicro.planned_load]}`}>{LOAD_LABELS[stats.activeMicro.planned_load]}</span> : null} />
      </div>

      {/* Objetivos por categoría */}
      <div className="rounded-2xl border border-white/10 bg-background/40 backdrop-blur-md p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <Award className="w-4 h-4 text-aureon-orange" />
          <h4 className="font-display tracking-[0.2em] text-white text-xs">DESGLOSE DE OBJETIVOS</h4>
        </div>
        {goals.length === 0 ? (
          <p className="text-white/55 text-sm">Aún no hay objetivos definidos. Crea objetivos desde la sección Estructura.</p>
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-4 mb-4">
              <StatusPill label="Conseguidos" value={stats.achieved} cls="bg-emerald-600 text-white" />
              <StatusPill label="En progreso" value={stats.inProgress} cls="bg-aureon-orange text-black" />
              <StatusPill label="Pendientes" value={stats.pending} cls="bg-slate-600 text-white" />
              <StatusPill label="No conseguidos" value={stats.missed} cls="bg-aureon-red text-white" />
            </div>
            <div className="space-y-2">
              {GOAL_CATEGORIES.map((cat) => {
                const list = goals.filter((g) => g.category === cat.value);
                if (list.length === 0) return null;
                return (
                  <div key={cat.value} className="rounded-lg border border-white/10 bg-background/50 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] uppercase tracking-[0.2em] text-white/70">{cat.label}</span>
                      <span className="text-white/55 text-[11px]">{list.length}</span>
                    </div>
                    <div className="space-y-1.5">
                      {list.map((g) => (
                        <div key={g.id} className="flex items-center justify-between gap-3 text-[12px]">
                          <span className="text-white/90 break-words min-w-0 flex-1">{g.title}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] flex-shrink-0 ${STATUS_COLORS[g.status]}`}>{STATUS_LABELS[g.status]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function Kpi({ icon, label, value, hint, progress }: { icon: React.ReactNode; label: string; value: string; hint?: string; progress?: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-background/40 backdrop-blur-md p-4">
      <div className="flex items-center gap-2 text-white/65 text-[10px] uppercase tracking-[0.2em]">{icon}{label}</div>
      <div className="mt-2 font-display text-3xl text-white">{value}</div>
      {hint && <div className="text-[11px] text-white/55 mt-1">{hint}</div>}
      {typeof progress === "number" && (
        <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-aureon-orange" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
        </div>
      )}
    </div>
  );
}

function CycleCard({ title, name, subtitle, badge }: { title: string; name: string; subtitle: string; badge?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-background/40 backdrop-blur-md p-4">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[10px] uppercase tracking-[0.2em] text-white/65">{title}</span>
        {badge}
      </div>
      <div className="font-display text-white text-base break-words">{name}</div>
      <p className="text-[12px] text-white/65 mt-1 break-words">{subtitle}</p>
    </div>
  );
}

function StatusPill({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-background/50 p-3 flex items-center justify-between">
      <span className="text-[11px] uppercase tracking-[0.2em] text-white/65">{label}</span>
      <span className={`px-2 py-0.5 rounded text-[12px] font-display ${cls}`}>{value}</span>
    </div>
  );
}
