// Motor de estadísticas para Gestión de Estadísticas.
// Funciones puras que transforman datos crudos del LIVE en métricas.

export type StatPlayer = {
  id: string;
  first_name: string;
  last_name: string;
  sport_name: string;
  jersey_number: number | null;
  position: string;
};

export type StatGoal = {
  id: string;
  side: "for" | "against" | string;
  scorer_id: string | null;
  pitch_x: number | null;
  pitch_y: number | null;
  goal_x: number | null;
  goal_y: number | null;
  players_on_court: string[];
  minute: number | null;
  effective_minute: number | null;
  period?: number | null;
  category: string;
  subcategory: string;
  live_match_id: string | null;
  previous_action?: string | null;
  finishing_foot?: string | null;
  second_post?: boolean | null;
};

export type StatEvent = {
  player_id: string | null;
  category: string;
  subcategory: string;
  live_match_id: string;
  kind: string; // 'action' | 'foul' | 'card' | ...
  pitch_x: number | null;
  pitch_y: number | null;
  minute: number | null;
  effective_minute: number | null;
  period?: number | null;
  on_court_ids: string[];
};

export type StatMatch = {
  id: string;
  season_id: string | null;
  created_at: string;
  home_team_id: string | null;
  away_team_id: string | null;
};

export type StatPlayerTime = {
  live_match_id: string;
  player_id: string;
  total_seconds: number;
};

// ─── Heurísticas semánticas (basadas en texto de category/subcategory) ────────
const norm = (s: string) => (s || "").toString().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

// Texto combinado normalizado (sin tildes, en minúsculas) de categoría+subcategoría.
const txt = (e: { category: string; subcategory: string }) =>
  norm(e.category) + " " + norm(e.subcategory);

export function isShotEvent(e: StatEvent): boolean {
  if (e.kind !== "action") return false;
  const c = txt(e);
  // Cualquier "tiro/disparo/remate/chut/lanzamiento" cuenta como tiro.
  // Penalti fallado y 10m fallado también son tiros que no acabaron en gol.
  if (/\b(tiro|disparo|remate|chut|lanzam)/.test(c)) return true;
  if (/\b(penalti|10m|10 m)\b.*\b(fall|fuera|parad)/.test(c)) return true;
  return false;
}
export function isShotOnTarget(e: StatEvent): boolean {
  if (!isShotEvent(e)) return false;
  const c = txt(e); // ya sin tildes: "porteria", "perdida", etc.
  if (/\b(fuera|desviad|intercep|palo)/.test(c)) return false;
  if (/\b(porteria|puerta|parad|gol)/.test(c)) return true;
  return false;
}
export function isSave(e: StatEvent): boolean {
  if (e.kind !== "action") return false;
  return /\b(parada|paradon|atajada|stop|parad)/.test(txt(e));
}
export function isRecovery(e: StatEvent): boolean {
  if (e.kind !== "action") return false;
  return /\b(recuperaci|robo|intercep)/.test(txt(e));
}
export function isLoss(e: StatEvent): boolean {
  if (e.kind !== "action") return false;
  return /\b(perdid|perdida|perdio|turnover)/.test(txt(e));
}
export function isAssist(e: StatEvent): boolean {
  if (e.kind !== "action") return false;
  return /\b(asisten|asist)/.test(txt(e));
}

// Etiqueta legible para un evento individual (usada en agrupaciones y
// resúmenes). Preferimos la subcategoría real ("TIRO PORTERÍA",
// "RECUPERACIÓN", "PARADA"...) y solo caemos a la categoría cuando la
// subcategoría no aporta información (faltas, tarjetas, etc.).
export function actionLabel(e: { kind: string; category: string; subcategory: string }): string {
  const sub = (e.subcategory || "").trim();
  const cat = (e.category || "").trim();
  if (e.kind === "action") {
    if (sub) return sub.toUpperCase();
    return (cat || "ACCIÓN").toUpperCase();
  }
  if (e.kind === "foul") {
    // category = "COMETIDA" | "RECIBIDA"
    return `FALTA ${cat || ""}`.trim().toUpperCase();
  }
  if (e.kind === "card") {
    return `TARJETA ${sub || ""}`.trim().toUpperCase();
  }
  if (e.kind === "goal") return "GOL MARCADO";
  if (e.kind === "red_ball") return "GOL RECIBIDO";
  return (sub || cat || "OTRO").toUpperCase();
}

// ─── KPIs y porcentajes ──────────────────────────────────────────────────────
export type Pct = { value: number; total: number; pct: number };
const pct = (value: number, total: number): Pct => ({ value, total, pct: total > 0 ? (value / total) * 100 : 0 });

export type AdvancedPercentages = {
  shotAccuracy: Pct;       // tiros a puerta / tiros totales
  conversion: Pct;         // goles / tiros totales
  offensiveEfficiency: Pct;// goles / (tiros + asistencias)
  recoveryRatio: Pct;      // recuperaciones / (recuperaciones + perdidas)
};

export function computeAdvancedPercentages(events: StatEvent[], goalsFor: StatGoal[]): AdvancedPercentages {
  const shots = events.filter(isShotEvent).length;
  const onTarget = events.filter(isShotOnTarget).length;
  const recoveries = events.filter(isRecovery).length;
  const losses = events.filter(isLoss).length;
  const assists = events.filter(isAssist).length;
  const goals = goalsFor.length;
  return {
    shotAccuracy: pct(onTarget, shots),
    conversion: pct(goals, shots),
    offensiveEfficiency: pct(goals, shots + assists),
    recoveryRatio: pct(recoveries, recoveries + losses),
  };
}

// ─── Franjas 5' (1ª y 2ª parte) ──────────────────────────────────────────────
export const TIME_BUCKETS: Array<{ label: string; from: number; to: number; half: 1 | 2 }> = [
  { label: "0-5",   from: 0,  to: 5,  half: 1 },
  { label: "5-10",  from: 5,  to: 10, half: 1 },
  { label: "10-15", from: 10, to: 15, half: 1 },
  { label: "15-20", from: 15, to: 20, half: 1 },
  { label: "20-25", from: 20, to: 25, half: 2 },
  { label: "25-30", from: 25, to: 30, half: 2 },
  { label: "30-35", from: 30, to: 35, half: 2 },
  { label: "35-40", from: 35, to: 40, half: 2 },
];

function minuteOf(x: { effective_minute: number | null; minute: number | null; period?: number | null }): number | null {
  // Normalización temporal: cada parte se proyecta a 20 min oficiales (P1: 0-20, P2: 20-40,
  // prórrogas P3: 40-45, P4: 45-50). `effective_minute` se guarda RELATIVO a la parte
  // (0..19 en P1/P2, 0..4 en P3/P4) tras cerrar el periodo en el LIVE; aquí lo
  // desplazamos al timeline global del partido sumando el offset de la parte.
  const period = typeof x.period === "number" && x.period > 0 ? x.period : 1;
  const offset = period <= 2 ? (period - 1) * 20 : 40 + (period - 3) * 5;
  if (typeof x.effective_minute === "number") return x.effective_minute + offset;
  if (typeof x.minute === "number") {
    // Cronómetro a tiempo corrido: aún no hay normalización proporcional, pero al menos
    // garantizamos que los eventos de P2+ no caigan en las franjas de P1.
    return x.minute + offset;
  }
  return null;
}

export function timelineGoals(goalsFor: StatGoal[], goalsAgainst: StatGoal[]) {
  return TIME_BUCKETS.map((b) => {
    const inB = (g: StatGoal) => {
      const m = minuteOf(g);
      return m !== null && m >= b.from && m < b.to + (b.to === 40 ? 0.001 : 0);
    };
    const gf = goalsFor.filter(inB).length;
    const gc = goalsAgainst.filter(inB).length;
    return { label: b.label, gf, gc, diff: gf - gc };
  });
}

// ─── Zonas de pista (4×3) y portería (3×3) ───────────────────────────────────
export function bucketGrid(
  points: Array<{ x: number | null; y: number | null }>,
  cols: number,
  rows: number,
): number[][] {
  const grid: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (const p of points) {
    if (p.x == null || p.y == null) continue;
    const c = Math.min(cols - 1, Math.max(0, Math.floor(p.x * cols)));
    const r = Math.min(rows - 1, Math.max(0, Math.floor(p.y * rows)));
    grid[r][c]++;
  }
  return grid;
}

// ─── Quintetos (basados en on_court_ids / players_on_court) ──────────────────
export type LineupRow = {
  ids: string[];
  uses: number;       // veces que aparece (eventos + goles)
  goalsFor: number;
  goalsAgainst: number;
  diff: number;
  seconds: number;    // tiempo aproximado (suma de segundos cuando los 5 estuvieron en pista)
};

const lineupKey = (ids: string[]) => [...ids].sort().join("|");

export function computeLineups(
  events: StatEvent[],
  goalsFor: StatGoal[],
  goalsAgainst: StatGoal[],
): LineupRow[] {
  const map = new Map<string, LineupRow>();
  const touch = (ids: string[]) => {
    if (ids.length !== 5) return null;
    const k = lineupKey(ids);
    let cur = map.get(k);
    if (!cur) {
      cur = { ids: [...ids].sort(), uses: 0, goalsFor: 0, goalsAgainst: 0, diff: 0, seconds: 0 };
      map.set(k, cur);
    }
    return cur;
  };
  for (const e of events) {
    const r = touch(e.on_court_ids ?? []);
    if (r) r.uses++;
  }
  for (const g of goalsFor) {
    const r = touch(g.players_on_court ?? []);
    if (r) { r.uses++; r.goalsFor++; }
  }
  for (const g of goalsAgainst) {
    const r = touch(g.players_on_court ?? []);
    if (r) { r.uses++; r.goalsAgainst++; }
  }
  const arr = Array.from(map.values());
  for (const r of arr) r.diff = r.goalsFor - r.goalsAgainst;
  return arr;
}

export function topLineups(rows: LineupRow[], by: "uses" | "diff" | "vulnerable", n = 5): LineupRow[] {
  const sorted = [...rows];
  if (by === "uses") sorted.sort((a, b) => b.uses - a.uses);
  else if (by === "diff") sorted.sort((a, b) => b.diff - a.diff);
  else sorted.sort((a, b) => a.diff - b.diff);
  return sorted.slice(0, n);
}

// ─── Resumen por jugador (todas las columnas) ────────────────────────────────
export type PlayerRow = {
  player: StatPlayer;
  goals: number;
  assists: number;
  shots: number;
  shotsOnTarget: number;
  saves: number;
  recoveries: number;
  losses: number;
  fouls: number;
  yellows: number;
  reds: number;
  actions: number;        // total acciones tipo 'action'
  minutes: number;        // total segundos / 60 (todos los partidos)
  byCategory: Record<string, number>; // todas las categorías sueltas
};

export function computePlayerRows(
  players: StatPlayer[],
  events: StatEvent[],
  goalsFor: StatGoal[],
  pt: StatPlayerTime[],
): PlayerRow[] {
  const ptMap: Record<string, number> = {};
  for (const t of pt) ptMap[t.player_id] = (ptMap[t.player_id] ?? 0) + (t.total_seconds || 0);

  const rows: PlayerRow[] = players.map((p) => ({
    player: p, goals: 0, assists: 0, shots: 0, shotsOnTarget: 0, saves: 0,
    recoveries: 0, losses: 0, fouls: 0, yellows: 0, reds: 0, actions: 0,
    minutes: Math.round((ptMap[p.id] ?? 0) / 60), byCategory: {},
  }));
  const idx: Record<string, PlayerRow> = {};
  rows.forEach((r) => (idx[r.player.id] = r));

  for (const g of goalsFor) {
    if (g.scorer_id && idx[g.scorer_id]) idx[g.scorer_id].goals++;
  }
  for (const e of events) {
    if (!e.player_id || !idx[e.player_id]) continue;
    const r = idx[e.player_id];
    if (e.kind === "action") {
      r.actions++;
      // Indexamos por SUBCATEGORÍA (nombre real de la acción). Cuando
      // category="ACCION" la subcategoría contiene "TIRO PORTERÍA",
      // "RECUPERACIÓN", etc. Para datos antiguos sin subcategoría caemos a
      // la categoría.
      const cat = actionLabel(e);
      r.byCategory[cat] = (r.byCategory[cat] ?? 0) + 1;
      if (isShotEvent(e)) r.shots++;
      if (isShotOnTarget(e)) r.shotsOnTarget++;
      if (isSave(e)) r.saves++;
      if (isRecovery(e)) r.recoveries++;
      if (isLoss(e)) r.losses++;
      if (isAssist(e)) r.assists++;
    } else if (e.kind === "foul") {
      r.fouls++;
    } else if (e.kind === "card") {
      if (e.subcategory === "AMARILLA") r.yellows++;
      else if (e.subcategory === "ROJA") r.reds++;
    }
  }
  return rows;
}

// ─── Insights automáticos ────────────────────────────────────────────────────
export type Insight = { tone: "good" | "bad" | "info"; title: string; detail: string };

export function buildInsights(
  events: StatEvent[],
  goalsFor: StatGoal[],
  goalsAgainst: StatGoal[],
  adv: AdvancedPercentages,
  lineups: LineupRow[],
  timeline: Array<{ label: string; gf: number; gc: number; diff: number }>,
): Insight[] {
  const out: Insight[] = [];

  // Tiro
  if (adv.shotAccuracy.total >= 8) {
    if (adv.shotAccuracy.pct >= 55) out.push({ tone: "good", title: "Buena puntería", detail: `${adv.shotAccuracy.pct.toFixed(0)}% de tiros a portería (${adv.shotAccuracy.value}/${adv.shotAccuracy.total}).` });
    else if (adv.shotAccuracy.pct < 35) out.push({ tone: "bad", title: "Baja precisión de tiro", detail: `Solo ${adv.shotAccuracy.pct.toFixed(0)}% de tiros entre los tres palos.` });
  }
  if (adv.conversion.total >= 8) {
    if (adv.conversion.pct >= 25) out.push({ tone: "good", title: "Alta conversión", detail: `${adv.conversion.pct.toFixed(0)}% de tiros acaban en gol.` });
    else if (adv.conversion.pct < 8) out.push({ tone: "bad", title: "Baja conversión", detail: `Solo ${adv.conversion.pct.toFixed(0)}% de tiros se convierten.` });
  }
  if (adv.recoveryRatio.total >= 6) {
    if (adv.recoveryRatio.pct < 40) out.push({ tone: "bad", title: "Más pérdidas que recuperaciones", detail: `Ratio ${adv.recoveryRatio.pct.toFixed(0)}%.` });
    else if (adv.recoveryRatio.pct >= 60) out.push({ tone: "good", title: "Dominio en disputas", detail: `${adv.recoveryRatio.pct.toFixed(0)}% recuperaciones sobre el total.` });
  }

  // Zonas de pérdida (mitad defensiva y=0..0.33 en orientación vertical no aplica; usamos x<0.33)
  const losses = events.filter(isLoss);
  if (losses.length >= 5) {
    const def = losses.filter((e) => e.pitch_x !== null && e.pitch_x < 0.34).length;
    if (def / losses.length >= 0.5) out.push({ tone: "bad", title: "Pérdidas en campo propio", detail: `${Math.round((def / losses.length) * 100)}% de las pérdidas se producen en zona defensiva.` });
  }

  // Franjas críticas
  const worst = [...timeline].sort((a, b) => a.diff - b.diff)[0];
  if (worst && worst.diff <= -2) out.push({ tone: "bad", title: `Momento crítico ${worst.label}'`, detail: `Diferencial ${worst.diff} en esa franja.` });
  const best = [...timeline].sort((a, b) => b.diff - a.diff)[0];
  if (best && best.diff >= 2) out.push({ tone: "good", title: `Momento fuerte ${best.label}'`, detail: `Diferencial +${best.diff} acumulado.` });

  // Quinteto vulnerable
  const vuln = lineups.filter((l) => l.goalsAgainst >= 3 && l.diff <= -2)[0];
  if (vuln) out.push({ tone: "bad", title: "Quinteto vulnerable", detail: `Encaja ${vuln.goalsAgainst} con diferencial ${vuln.diff}.` });
  const eff = lineups.filter((l) => l.goalsFor >= 3 && l.diff >= 2)[0];
  if (eff) out.push({ tone: "good", title: "Quinteto efectivo", detail: `${eff.goalsFor} a favor con diferencial +${eff.diff}.` });

  if (out.length === 0) out.push({ tone: "info", title: "Sin tendencias destacadas", detail: "A medida que registres más partidos, aparecerán insights." });
  return out;
}

export function playerName(players: StatPlayer[], id: string): string {
  const p = players.find((x) => x.id === id);
  if (!p) return "—";
  return p.sport_name || `${p.first_name} ${p.last_name}`.trim() || "—";
}
