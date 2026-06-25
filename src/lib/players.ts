export const POSITIONS = [
  "Portero",
  "Cierre",
  "Ala",
  "Pívot",
  "Universal",
  "ENTRENADOR",
  "STAFF TÉCNICO",
] as const;
export type Position = (typeof POSITIONS)[number];

// Border color around the player card preview
export const positionBorderClass = (p: string) => {
  switch (p) {
    case "ENTRENADOR":
      return "ring-2 ring-white border-white/60";
    case "Portero":
      return "ring-2 ring-pink-500 border-pink-500/60";
    case "STAFF TÉCNICO":
      return "ring-2 ring-aureon-red border-aureon-red/60";
    default:
      // jugadores de campo
      return "ring-2 ring-yellow-400 border-yellow-400/60";
  }
};

// Badge style for the position label inside the card
export const positionStyle = (p: string) => {
  switch (p) {
    case "ENTRENADOR":
      return "bg-white text-black";
    case "Portero":
      return "bg-aureon-blue text-white";
    case "STAFF TÉCNICO":
      return "bg-aureon-red text-white";
    case "Cierre":
    case "Ala":
    case "Pívot":
    case "Universal":
      return "bg-yellow-400 text-black";
    default:
      return "bg-foreground/70 text-background";
  }
};

export const isStaff = (p: string) => p === "ENTRENADOR" || p === "STAFF TÉCNICO";
