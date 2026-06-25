export const CATEGORIES = [
  "Fundamentos Ofensivos",
  "Fundamentos Defensivos",
  "ABP",
  "Modelo de juego",
  "Aspecto Condicional",
] as const;
export type Category = (typeof CATEGORIES)[number];

// Categorías que pueden combinarse con "Modelo de juego" como secundaria
export const SECONDARY_OPTIONS = ["Ofensivo", "Defensivo"] as const;
export type SecondaryCategory = (typeof SECONDARY_OPTIONS)[number];

// Presets para ABP
export const ABP_PRESETS = ["BANDA", "CORNER", "FALTA", "SALIDA DE PRESIÓN"] as const;

// Categorías que habilitan un campo de texto libre / detalle
export const CATEGORIES_WITH_DETAIL: Category[] = [
  "Fundamentos Ofensivos",
  "Fundamentos Defensivos",
  "ABP",
  "Aspecto Condicional",
];

// Compatibilidad con datos antiguos
export const normalizeCategory = (c?: string | null): string => {
  if (!c) return "";
  if (c === "Ataque") return "Fundamentos Ofensivos";
  if (c === "Defensa") return "Fundamentos Defensivos";
  return c;
};

export const formatTaskNumber = (n: number) => String(n).padStart(3, "0");

export const categoryStyle = (c: string) => {
  const n = normalizeCategory(c);
  switch (n) {
    case "Fundamentos Ofensivos":
    case "Ofensivo":
      return "bg-primary text-primary-foreground";
    case "Fundamentos Defensivos":
    case "Defensivo":
      return "bg-secondary text-secondary-foreground";
    case "ABP":
      return "bg-accent text-accent-foreground";
    case "Modelo de juego":
      return "bg-foreground text-background";
    case "Aspecto Condicional":
      return "bg-primary/80 text-primary-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
};
