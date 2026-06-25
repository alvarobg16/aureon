export type TrainingBlock = "warmup" | "main" | "cooldown";

export const BLOCK_LABELS: Record<TrainingBlock, string> = {
  warmup: "Calentamiento",
  main: "Parte principal",
  cooldown: "Vuelta a la calma",
};

export const BLOCK_ORDER: TrainingBlock[] = ["warmup", "main", "cooldown"];

export type TrainingSession = {
  id: string;
  team_id: string;
  session_date: string | null;
  session_time: string;
  venue: string;
  competitive_period: string;
  microcycle: string;
  session_number: string;
  rival: string;
  objectives: string;
  other_notes: string;
  created_at: string;
};

export type TrainingSessionTask = {
  id: string;
  session_id: string;
  task_id: string;
  block: TrainingBlock;
  order_index: number;
};

export type TrainingAttendance = {
  id: string;
  session_id: string;
  player_id: string;
  present: boolean;
};
