export type GoalSide = "for" | "against";

export type CategoryDef = {
  key: string;
  label: string;
  subs: { key: string; label: string }[];
};

export const FOR_CATEGORIES: CategoryDef[] = [
  {
    key: "DEFENSA",
    label: "DEFENSA",
    subs: [
      { key: "DEFENSA_ALTA_ROBO_1L", label: "DEFENSA ALTA ROBO EN 1ª LÍNEA" },
      { key: "ATAQUE_POSICIONAL", label: "ATAQUE POSICIONAL" },
    ],
  },
  {
    key: "TRANSICION",
    label: "TRANSICIÓN",
    subs: [
      { key: "IGUALDAD", label: "EN IGUALDAD NUMÉRICA" },
      { key: "INFERIORIDAD", label: "EN INFERIORIDAD NUMÉRICA" },
      { key: "SUPERIORIDAD", label: "EN SUPERIORIDAD NUMÉRICA" },
    ],
  },
  {
    key: "ABP",
    label: "ABP",
    subs: [
      { key: "CORNER", label: "CÓRNER" },
      { key: "BANDA", label: "BANDA" },
      { key: "FALTA", label: "FALTA" },
    ],
  },
  {
    key: "SITUACION_ESPECIAL",
    label: "SITUACIÓN ESPECIAL",
    subs: [
      { key: "ATAQUE_5x4", label: "ATAQUE 5x4" },
      { key: "DEFENSA_4x5", label: "DEFENSA 4x5" },
    ],
  },
  {
    key: "OTROS",
    label: "OTROS",
    subs: [
      { key: "DIEZ_M_LD", label: "10M ó LD sin barrera" },
      { key: "PENALTI_4x3_PP", label: "Penaltis / 4x3 / P.P. o Extraordinarios" },
    ],
  },
];

export const AGAINST_CATEGORIES: CategoryDef[] = [
  {
    key: "DEFENSA",
    label: "DEFENSA",
    subs: [
      { key: "DEFENSA_ALTA", label: "DEFENSA ALTA" },
      { key: "DEFENSA_POSICIONAL", label: "DEFENSA POSICIONAL" },
    ],
  },
  {
    key: "TRANSICION",
    label: "TRANSICIÓN",
    subs: [
      { key: "MALA_PRESION_ALTA", label: "Por mala presión alta" },
      { key: "PERDIDA_ATAQUE_POS", label: "Tras pérdida en ataque posicional" },
    ],
  },
  {
    key: "ABP",
    label: "ABP",
    subs: [
      { key: "CORNER", label: "CÓRNER" },
      { key: "BANDA", label: "BANDA" },
      { key: "FALTA", label: "FALTA" },
    ],
  },
  {
    key: "SITUACION_ESPECIAL",
    label: "SITUACIÓN ESPECIAL",
    subs: [
      { key: "DEFENSA_4x5", label: "DEFENSA 4x5" },
      { key: "ATAQUE_5x4", label: "ATAQUE 5x4" },
    ],
  },
  {
    key: "OTROS",
    label: "OTROS",
    subs: [
      { key: "DIEZ_M_LD", label: "10M ó LD sin barrera" },
      { key: "PENALTI_4x3_PP", label: "Penaltis / 4x3 / P.P. o Extraordinarios" },
    ],
  },
];

export function getCategories(side: GoalSide) {
  return side === "for" ? FOR_CATEGORIES : AGAINST_CATEGORIES;
}

export function getSubLabel(side: GoalSide, categoryKey: string, subKey: string) {
  const cat = getCategories(side).find((c) => c.key === categoryKey);
  return cat?.subs.find((s) => s.key === subKey)?.label ?? subKey;
}

export function getCategoryLabel(side: GoalSide, categoryKey: string) {
  return getCategories(side).find((c) => c.key === categoryKey)?.label ?? categoryKey;
}
