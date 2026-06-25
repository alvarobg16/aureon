import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type AureonSettings = {
  logoDataUrl: string | null;
  heroTitleLine1: string;
  heroTitleLine2: string;
  ctaText: string;
  footerText: string;
  colorBlue: string;
  colorOrange: string;
  colorRed: string;
  bgFrom: string;
  bgTo: string;
  adminPassword: string;
};

const DEFAULTS: AureonSettings = {
  logoDataUrl: null,
  heroTitleLine1: "AUREON",
  heroTitleLine2: "FUTSAL PRO SUITE",
  ctaText: "ACCESO A LA PLATAFORMA",
  footerText: "Aureon Futsal ProSuite 2026 · V1.0",
  colorBlue: "oklch(0.7 0.16 240)",
  colorOrange: "oklch(0.72 0.18 55)",
  colorRed: "oklch(0.62 0.22 28)",
  bgFrom: "oklch(0.16 0.04 250)",
  bgTo: "oklch(0.10 0.04 265)",
  adminPassword: "admin",
};

const KEY = "aureon-settings-v1";

type Ctx = {
  settings: AureonSettings;
  update: (patch: Partial<AureonSettings>) => void;
  reset: () => void;
};

const SettingsContext = createContext<Ctx | null>(null);

function applyCssVars(s: AureonSettings) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--aureon-blue", s.colorBlue);
  root.style.setProperty("--aureon-orange", s.colorOrange);
  root.style.setProperty("--aureon-red", s.colorRed);
  root.style.setProperty("--aureon-bg-from", s.bgFrom);
  root.style.setProperty("--aureon-bg-to", s.bgTo);
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AureonSettings>(DEFAULTS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = { ...DEFAULTS, ...JSON.parse(raw) } as AureonSettings;
        setSettings(parsed);
        applyCssVars(parsed);
        return;
      }
    } catch {}
    applyCssVars(DEFAULTS);
  }, []);

  const update = (patch: Partial<AureonSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {}
      applyCssVars(next);
      return next;
    });
  };

  const reset = () => {
    try {
      localStorage.removeItem(KEY);
    } catch {}
    setSettings(DEFAULTS);
    applyCssVars(DEFAULTS);
  };

  return (
    <SettingsContext.Provider value={{ settings, update, reset }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    // Safe fallback so SSR / outside-provider reads still work
    return { settings: DEFAULTS, update: () => {}, reset: () => {} } as Ctx;
  }
  return ctx;
}
