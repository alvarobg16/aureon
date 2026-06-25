// Normalización tiempo real → tiempo efectivo de juego (módulo LIVE).
//
// Cada periodo reglamentario dura 20 min (P1/P2) o 5 min (prórrogas P3/P4).
// Durante el LIVE el cronómetro avanza con interrupciones, por lo que la
// duración REAL del periodo (segundos) suele ser mayor.
//
// Al cerrar un periodo, reescalamos cada evento al rango [0, targetSec)
// preservando el orden cronológico estricto (sin colisiones ni retrocesos).

export type NormalizableRow = {
  id: string;
  real_seconds: number | null;
  minute: number | null;
  created_at?: string | null;
};

export type NormalizedPatch = {
  id: string;
  effective_seconds: number;
  effective_minute: number;
};

export function targetSecondsForPeriod(period: number): number {
  return period <= 2 ? 20 * 60 : 5 * 60;
}

/**
 * Devuelve real_seconds usable: prioriza la columna nueva; si está vacía
 * (datos antiguos), reconstruye desde `minute` * 60.
 */
function resolveRealSeconds(row: NormalizableRow): number {
  if (typeof row.real_seconds === "number" && row.real_seconds >= 0) {
    return row.real_seconds;
  }
  if (typeof row.minute === "number" && row.minute >= 0) {
    return row.minute * 60;
  }
  return 0;
}

/**
 * Reescala una lista de eventos del mismo periodo al rango [0, targetSec).
 * Garantiza orden estricto: si dos eventos colapsan tras el factor, el
 * segundo recibe effSec = prevEffSec + 1 (capado a targetSec - 1).
 */
export function normalizePeriod(
  rows: NormalizableRow[],
  realDurationSeconds: number,
  period: number,
): NormalizedPatch[] {
  const targetSec = targetSecondsForPeriod(period);
  const realSec = Math.max(1, Math.round(realDurationSeconds));
  const factor = targetSec / realSec;

  // Orden estable: real_seconds asc, luego created_at asc, luego id.
  const sorted = [...rows].sort((a, b) => {
    const ra = resolveRealSeconds(a);
    const rb = resolveRealSeconds(b);
    if (ra !== rb) return ra - rb;
    const ca = a.created_at ?? "";
    const cb = b.created_at ?? "";
    if (ca !== cb) return ca < cb ? -1 : 1;
    return a.id < b.id ? -1 : 1;
  });

  const out: NormalizedPatch[] = [];
  let prevEff = -1;
  for (const r of sorted) {
    const rs = resolveRealSeconds(r);
    let eff = Math.round(rs * factor);
    if (eff <= prevEff) eff = prevEff + 1;
    if (eff < 0) eff = 0;
    if (eff > targetSec - 1) eff = targetSec - 1;
    // Si por capado se solapa con el previo, fuerza al límite y deja a
    // los siguientes apilarse también en el límite (caso degenerado).
    if (eff <= prevEff) eff = Math.min(targetSec - 1, prevEff + 1);
    prevEff = eff;
    out.push({
      id: r.id,
      effective_seconds: eff,
      effective_minute: Math.floor(eff / 60),
    });
  }
  return out;
}

/**
 * Recalcula effective_* para un único evento usando la duración real
 * almacenada del periodo. Útil al editar tiempo manualmente.
 */
export function recomputeEffectiveForEvent(
  realSeconds: number,
  realDurationSeconds: number,
  period: number,
): { effective_seconds: number; effective_minute: number } {
  const targetSec = targetSecondsForPeriod(period);
  const realSec = Math.max(1, Math.round(realDurationSeconds));
  const factor = targetSec / realSec;
  let eff = Math.round(Math.max(0, realSeconds) * factor);
  if (eff < 0) eff = 0;
  if (eff > targetSec - 1) eff = targetSec - 1;
  return { effective_seconds: eff, effective_minute: Math.floor(eff / 60) };
}

// --- Arquitectura preparatoria para tiempo efectivo basado en interrupciones ---
//
// Si en `live_events` existen pares `interruption_start` / `interruption_end`
// (kind), descontamos esos segundos de la duración real antes de calcular el
// factor de reescalado. Si no hay pares válidos, devuelve el reescalado
// proporcional clásico (idéntico a `normalizePeriod`). Esto deja la puerta
// abierta a una capa de IA que en el futuro detecte interrupciones a partir
// de otros eventos (faltas, tiempos muertos, goles…) sin cambiar el contrato.

export type InterruptionEvent = {
  kind: string;
  real_seconds: number | null;
};

export function effectiveRealSeconds(
  realDurationSeconds: number,
  interruptions: InterruptionEvent[],
): number {
  const starts = interruptions
    .filter((e) => e.kind === "interruption_start" && typeof e.real_seconds === "number")
    .map((e) => e.real_seconds as number)
    .sort((a, b) => a - b);
  const ends = interruptions
    .filter((e) => e.kind === "interruption_end" && typeof e.real_seconds === "number")
    .map((e) => e.real_seconds as number)
    .sort((a, b) => a - b);
  if (!starts.length || !ends.length) return realDurationSeconds;

  let lost = 0;
  let ei = 0;
  for (const s of starts) {
    while (ei < ends.length && ends[ei] < s) ei++;
    if (ei >= ends.length) break;
    lost += Math.max(0, ends[ei] - s);
    ei++;
  }
  return Math.max(1, realDurationSeconds - lost);
}

export function normalizePeriodWithInterruptions(
  rows: NormalizableRow[],
  realDurationSeconds: number,
  period: number,
  interruptions: InterruptionEvent[] = [],
) {
  const effectiveDuration = effectiveRealSeconds(realDurationSeconds, interruptions);
  return normalizePeriod(rows, effectiveDuration, period);
}
