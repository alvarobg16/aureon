export const SCOUTING_DEFENSIVE = [
  "Defensa posicional",
  "Defensa de transición",
  "Defensa de ABP",
  "Defensa de inferioridades",
  "Otros aspectos defensivos",
] as const;

export const SCOUTING_OFFENSIVE = [
  "Ataque posicional",
  "Ataque en transición",
  "Ataque de ABP",
  "Ataque en superioridad",
  "Penaltis",
  "10 metros",
  "Otras acciones ofensivas",
] as const;

export type ScoutingSide = "offensive" | "defensive";

export const categoriesFor = (side: ScoutingSide): readonly string[] =>
  side === "offensive" ? SCOUTING_OFFENSIVE : SCOUTING_DEFENSIVE;

export type ScoutingClip = {
  id: string;
  user_id: string;
  season_team_id: string;
  side: ScoutingSide;
  category: string;
  title: string;
  notes: string;
  tags: string[];
  video_url: string | null;
  source: "upload" | "external";
  created_at: string;
};
