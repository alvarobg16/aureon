import { Dumbbell, Trophy, CalendarDays, Users2, BedDouble, Medal, Building2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type PlanningEventType =
  | "training"
  | "match"
  | "event"
  | "meeting"
  | "rest"
  | "tournament"
  | "club_activity";

export type PlanningIntensity = "very_low" | "low" | "medium" | "high" | "very_high";

export type PlanningEvent = {
  id: string;
  team_id: string;
  season_id: string | null;
  event_date: string; // yyyy-mm-dd
  event_time: string | null;
  duration_minutes: number | null;
  type: PlanningEventType;
  title: string;
  location: string;
  notes: string;
  intensity: PlanningIntensity | null;
  fixture_id: string | null;
  training_session_id: string | null;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

// Origen del evento mostrado en el calendario. Las entradas "fixture" y
// "training_session" provienen de otros módulos (referencias, no duplicados).
export type EventSource = "planning" | "fixture" | "training_session";

export type CalendarEvent = PlanningEvent & {
  source: EventSource;
  source_id?: string | null;
};

export const TYPE_LABELS: Record<PlanningEventType, string> = {
  training: "Entrenamiento",
  match: "Partido",
  event: "Evento",
  meeting: "Reunión",
  rest: "Descanso",
  tournament: "Torneo",
  club_activity: "Actividad de club",
};

export const TYPE_ICONS: Record<PlanningEventType, LucideIcon> = {
  training: Dumbbell,
  match: Trophy,
  event: CalendarDays,
  meeting: Users2,
  rest: BedDouble,
  tournament: Medal,
  club_activity: Building2,
};

// Colores con contraste alto (texto blanco sobre fondo saturado).
export const TYPE_COLORS: Record<PlanningEventType, string> = {
  training: "bg-aureon-blue text-white",
  match: "bg-green-600 text-white",
  event: "bg-violet-600 text-white",
  meeting: "bg-slate-600 text-white",
  rest: "bg-teal-700 text-white",
  tournament: "bg-amber-500 text-black",
  club_activity: "bg-cyan-600 text-white",
};

export const INTENSITY_LABELS: Record<PlanningIntensity, string> = {
  very_low: "Muy baja",
  low: "Baja",
  medium: "Media",
  high: "Alta",
  very_high: "Muy alta",
};

export const ALL_TYPES: PlanningEventType[] = [
  "training", "match", "event", "meeting", "rest", "tournament", "club_activity",
];

export function pad(n: number) { return n.toString().padStart(2, "0"); }
export function ymd(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
export function parseYmd(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}
export function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // lunes = 0
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}
export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

// ─────────── Estructura de planificación ───────────
export type LoadLevel = "very_low" | "low" | "medium" | "high" | "very_high";

export const LOAD_LABELS: Record<LoadLevel, string> = {
  very_low: "Muy baja",
  low: "Baja",
  medium: "Media",
  high: "Alta",
  very_high: "Muy alta",
};

export const LOAD_COLORS: Record<LoadLevel, string> = {
  very_low: "bg-emerald-600 text-white",
  low: "bg-teal-600 text-white",
  medium: "bg-aureon-blue text-white",
  high: "bg-amber-500 text-black",
  very_high: "bg-aureon-red text-white",
};

export type Macrocycle = {
  id: string;
  team_id: string;
  season_id: string | null;
  name: string;
  start_date: string;
  end_date: string;
  objective: string;
  color: string;
};

export type Mesocycle = {
  id: string;
  macrocycle_id: string;
  team_id: string;
  name: string;
  start_date: string;
  end_date: string;
  focus: string;
  expected_load: LoadLevel;
  notes: string;
};

export type Microcycle = {
  id: string;
  mesocycle_id: string;
  team_id: string;
  name: string;
  week_start: string;
  week_end: string;
  weekly_objective: string;
  planned_load: LoadLevel;
  notes: string;
};

export type GoalPriority = "low" | "medium" | "high";
export type GoalStatus = "pending" | "in_progress" | "achieved" | "missed";

export const GOAL_CATEGORIES = [
  { value: "classification", label: "Clasificación" },
  { value: "performance", label: "Rendimiento" },
  { value: "attendance", label: "Asistencia" },
  { value: "tactical", label: "Táctico" },
  { value: "physical", label: "Físico" },
  { value: "individual", label: "Individual" },
  { value: "general", label: "General" },
] as const;

export const PRIORITY_LABELS: Record<GoalPriority, string> = {
  low: "Baja", medium: "Media", high: "Alta",
};
export const PRIORITY_COLORS: Record<GoalPriority, string> = {
  low: "bg-slate-600 text-white",
  medium: "bg-aureon-blue text-white",
  high: "bg-aureon-red text-white",
};

export const STATUS_LABELS: Record<GoalStatus, string> = {
  pending: "Pendiente",
  in_progress: "En progreso",
  achieved: "Conseguido",
  missed: "No conseguido",
};
export const STATUS_COLORS: Record<GoalStatus, string> = {
  pending: "bg-slate-600 text-white",
  in_progress: "bg-aureon-orange text-black",
  achieved: "bg-emerald-600 text-white",
  missed: "bg-aureon-red text-white",
};

export type TeamGoal = {
  id: string;
  team_id: string;
  season_id: string | null;
  category: string;
  title: string;
  description: string;
  target_value: string;
  priority: GoalPriority;
  status: GoalStatus;
};

