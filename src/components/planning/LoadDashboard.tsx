import { useMemo } from "react";
import { Activity, AlertTriangle, CheckCircle2, Lightbulb, TrendingDown, TrendingUp } from "lucide-react";
import {
  type CalendarEvent, type Microcycle, type LoadLevel,
  LOAD_LABELS, LOAD_COLORS, ymd, startOfWeek, addDays, parseYmd,
} from "@/lib/planning";

type Props = {
  events: CalendarEvent[];
  microcycles: Microcycle[];
  cursor: Date;
};

const LOAD_SCORE: Record<LoadLevel, number> = {
  very_low: 1, low: 2, medium: 3, high: 4, very_high: 5,
};
const SCORE_TO_LOAD = (s: number): LoadLevel => {
  if (s <= 1.5) return "very_low";
  if (s <= 2.5) return "low";
  if (s <= 3.5) return "medium";
  if (s <= 4.5) return "high";
  return "very_high";
};

const INTENSITY_TO_SCORE: Record<string, number> = {
  very_low: 1, low: 2, medium: 3, high: 4, very_high: 5,
};

const MATCH_LOAD = 4.5; // un partido cuenta como carga alta

export function LoadDashboard({ events, microcycles, cursor }: Props) {
  const data = useMemo(() => {
    const weekStart = startOfWeek(cursor);
    const weekEnd = addDays(weekStart, 6);
    const startK = ymd(weekStart);
    const endK = ymd(weekEnd);

    const weekEvents = events.filter((e) => e.event_date >= startK && e.event_date <= endK);
    const trainings = weekEvents.filter((e) => e.type === "training");
    const matches = weekEvents.filter((e) => e.type === "match");
    const rests = weekEvents.filter((e) => e.type === "rest");

    // Carga real estimada de la semana (suma de intensidades).
    let sum = 0;
    let count = 0;
    trainings.forEach((t) => {
      const score = t.intensity ? INTENSITY_TO_SCORE[t.intensity] : 3;
      sum += score; count += 1;
    });
    matches.forEach(() => { sum += MATCH_LOAD; count += 1; });
    const avg = count > 0 ? sum / count : 0;
    const actualLevel: LoadLevel | null = count > 0 ? SCORE_TO_LOAD(avg) : null;

    // Microciclo activo cubriendo esta semana.
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const active = microcycles.find((m) => {
      const ws = parseYmd(m.week_start);
      const we = parseYmd(m.week_end);
      return weekStart <= we && weekEnd >= ws;
    });

    const plannedLevel: LoadLevel | null = active?.planned_load ?? null;
    const plannedScore = plannedLevel ? LOAD_SCORE[plannedLevel] : null;
    const delta = plannedScore != null && count > 0 ? avg - plannedScore : null;

    // Recomendaciones rule-based.
    const recs: { tone: "info" | "warn" | "ok"; text: string }[] = [];
    if (count === 0) {
      recs.push({ tone: "info", text: "No hay sesiones planificadas esta semana. Considera añadir al menos 2 entrenamientos." });
    }
    if (matches.length >= 2) {
      recs.push({ tone: "warn", text: `Semana con ${matches.length} partidos: prioriza recuperación entre encuentros y reduce la intensidad de las sesiones intermedias.` });
    }
    if (delta != null) {
      if (delta > 0.7) recs.push({ tone: "warn", text: `Carga real (${LOAD_LABELS[actualLevel!]}) por encima de la prevista (${LOAD_LABELS[plannedLevel!]}). Riesgo de sobrecarga: introduce una sesión regenerativa.` });
      else if (delta < -0.7) recs.push({ tone: "info", text: `Carga real (${LOAD_LABELS[actualLevel!]}) por debajo de la prevista (${LOAD_LABELS[plannedLevel!]}). Tienes margen para reforzar intensidad o duración.` });
      else recs.push({ tone: "ok", text: `Carga ajustada al microciclo previsto (${LOAD_LABELS[plannedLevel!]}). Buen equilibrio.` });
    }
    if (matches.length === 1 && trainings.length > 0) {
      const matchDate = matches[0].event_date;
      const dayBefore = trainings.find((t) => t.event_date === ymd(addDays(parseYmd(matchDate), -1)));
      if (dayBefore && (dayBefore.intensity === "high" || dayBefore.intensity === "very_high")) {
        recs.push({ tone: "warn", text: "La sesión del día previo al partido es de alta intensidad. Recomendado bajar a media/baja (activación)." });
      }
    }
    if (rests.length === 0 && (trainings.length + matches.length) >= 5) {
      recs.push({ tone: "warn", text: "Semana con alta densidad de sesiones y sin día de descanso planificado. Incluye al menos 1 jornada de descanso." });
    }
    if (recs.length === 0) {
      recs.push({ tone: "ok", text: "Sin alertas. Mantén el plan." });
    }

    return {
      weekStart, weekEnd, count, avg, actualLevel, plannedLevel, delta,
      activeMicro: active ?? null, trainings: trainings.length, matches: matches.length, rests: rests.length, recs,
    };
  }, [events, microcycles, cursor]);

  return (
    <section className="rounded-2xl border border-white/10 bg-background/40 backdrop-blur-md p-4 sm:p-5">
      <header className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-aureon-orange" />
          <h3 className="font-display tracking-[0.2em] text-white text-sm">CONTROL DE CARGA · SEMANA</h3>
        </div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-white/55">
          {data.weekStart.toLocaleDateString("es-ES", { day: "2-digit", month: "short" })} → {data.weekEnd.toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-4 mb-4">
        <Metric label="Entrenamientos" value={String(data.trainings)} />
        <Metric label="Partidos" value={String(data.matches)} />
        <Metric label="Descansos" value={String(data.rests)} />
        <div className="rounded-lg border border-white/10 bg-background/50 p-3">
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/55">Carga real</div>
          {data.actualLevel ? (
            <div className="mt-1 flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[11px] ${LOAD_COLORS[data.actualLevel]}`}>{LOAD_LABELS[data.actualLevel]}</span>
              <span className="text-white/60 text-[11px]">({data.avg.toFixed(1)}/5)</span>
            </div>
          ) : (
            <p className="mt-1 text-[12px] text-white/50">Sin datos</p>
          )}
        </div>
      </div>

      {data.activeMicro && (
        <div className="rounded-lg border border-aureon-blue/30 bg-aureon-blue/10 p-3 mb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/55">Microciclo activo</div>
              <div className="text-white font-display text-sm break-words">{data.activeMicro.name}</div>
              {data.activeMicro.weekly_objective && <p className="text-[12px] text-white/75 mt-0.5 break-words">{data.activeMicro.weekly_objective}</p>}
            </div>
            <div className="flex items-center gap-2">
              {data.plannedLevel && <span className={`px-2 py-0.5 rounded text-[11px] ${LOAD_COLORS[data.plannedLevel]}`}>Previsto: {LOAD_LABELS[data.plannedLevel]}</span>}
              {data.delta != null && (
                <span className={`inline-flex items-center gap-1 text-[11px] ${data.delta > 0.5 ? "text-aureon-red" : data.delta < -0.5 ? "text-aureon-blue" : "text-emerald-400"}`}>
                  {data.delta > 0.5 ? <TrendingUp className="w-3.5 h-3.5" /> : data.delta < -0.5 ? <TrendingDown className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Δ {data.delta > 0 ? "+" : ""}{data.delta.toFixed(1)}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-3.5 h-3.5 text-aureon-orange" />
          <h4 className="font-display tracking-[0.2em] text-white text-xs">RECOMENDACIONES</h4>
        </div>
        {data.recs.map((r, i) => (
          <div
            key={i}
            className={`rounded-md border px-3 py-2 text-[12px] flex items-start gap-2 break-words ${
              r.tone === "warn" ? "border-aureon-red/40 bg-aureon-red/10 text-white"
              : r.tone === "ok" ? "border-emerald-500/30 bg-emerald-500/10 text-white"
              : "border-white/15 bg-background/50 text-white/85"
            }`}
          >
            {r.tone === "warn" ? <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-aureon-red" />
              : r.tone === "ok" ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-emerald-400" />
              : <Lightbulb className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-aureon-orange" />}
            <span>{r.text}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-background/50 p-3">
      <div className="text-[10px] uppercase tracking-[0.2em] text-white/55">{label}</div>
      <div className="mt-1 font-display text-2xl text-white">{value}</div>
    </div>
  );
}
