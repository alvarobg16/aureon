// Módulos y sub-módulos configurables por cliente.
// El estado habilitado/deshabilitado se persiste en localStorage.

export type ModuleKey =
  | "club"
  | "equipo"
  | "temporadas"
  | "tareas"
  | "partidos"
  | "partidos.live"
  | "partidos.post"
  | "estadisticas";

export type ModuleNode = {
  key: ModuleKey;
  label: string;
  to?: string;
  defaultEnabled: boolean;
  children?: ModuleNode[];
};

export const MODULE_TREE: ModuleNode[] = [
  { key: "club", label: "GESTIÓN DE CLUB", to: "/club", defaultEnabled: true },
  { key: "equipo", label: "GESTIÓN DE JUGADORES", to: "/equipo", defaultEnabled: true },
  { key: "temporadas", label: "GESTIÓN DE TEMPORADA", to: "/temporadas", defaultEnabled: true },
  { key: "tareas", label: "GESTIÓN DE TAREAS, ENTRENAMIENTOS Y SCOUTING", to: "/tareas-modulo", defaultEnabled: true },
  {
    key: "partidos",
    label: "GESTIÓN DE PARTIDOS",
    to: "/partidos",
    defaultEnabled: true,
    children: [
      { key: "partidos.live", label: "Live", to: "/partidos/live", defaultEnabled: true },
      { key: "partidos.post", label: "Post-partido", to: "/partidos/post", defaultEnabled: true },
    ],
  },
  { key: "estadisticas", label: "GESTIÓN DE ESTADÍSTICAS", to: "/estadisticas", defaultEnabled: true },
];

const KEY = "aureon.enabledModules.v1";

function flatKeys(): ModuleKey[] {
  const out: ModuleKey[] = [];
  const walk = (n: ModuleNode) => {
    out.push(n.key);
    n.children?.forEach(walk);
  };
  MODULE_TREE.forEach(walk);
  return out;
}

function defaultsMap(): Record<string, boolean> {
  const m: Record<string, boolean> = {};
  const walk = (n: ModuleNode) => {
    m[n.key] = n.defaultEnabled;
    n.children?.forEach(walk);
  };
  MODULE_TREE.forEach(walk);
  return m;
}

export function loadEnabledModules(): Record<string, boolean> {
  if (typeof window === "undefined") return defaultsMap();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultsMap();
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return { ...defaultsMap(), ...parsed };
  } catch {
    return defaultsMap();
  }
}

export function saveEnabledModules(map: Record<string, boolean>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {}
  // notify listeners
  window.dispatchEvent(new CustomEvent("aureon:modules-changed"));
}

export function isModuleEnabled(key: ModuleKey): boolean {
  const m = loadEnabledModules();
  return m[key] !== false;
}

export const ALL_MODULE_KEYS = flatKeys();
