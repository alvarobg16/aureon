import { ReactNode, useEffect } from "react";
import { useLocation } from "@tanstack/react-router";
import { PlatformHomeLink } from "@/components/PlatformHomeLink";
import { ModuleGuard } from "@/components/ModuleGuard";
import { ScopeBar } from "@/components/ScopeBar";
import { useAuth } from "@/lib/auth";

/** Mapea el primer segmento de la URL al moduleKey que vive en BD. */
function inferModuleKey(pathname: string): string | null {
  const seg = pathname.split("/").filter(Boolean)[0];
  if (!seg) return null;
  const map: Record<string, string> = {
    club: "club",
    equipo: "equipo",
    temporadas: "temporadas",
    "tareas-modulo": "tareas",
    tareas: "tareas",
    buscar: "tareas",
    entrenamientos: "tareas",
    scouting: "tareas.scouting",
    analisis: "tareas.analisis",
    partidos: "partidos",
    estadisticas: "estadisticas",
    planificacion: "planificacion",
  };
  return map[seg] ?? null;
}

export function ModuleShell({
  title,
  subtitle,
  actions,
  children,
  moduleKey,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  /** Si se proporciona, requiere acceso activo a ese módulo (admin o asignación vigente). */
  moduleKey?: string;
}) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const effectiveKey = moduleKey ?? inferModuleKey(location.pathname);

  useEffect(() => {
    if (!loading && !user && typeof window !== "undefined") {
      const r = encodeURIComponent(window.location.pathname);
      window.location.href = `/auth?redirect=${r}`;
    }
  }, [user, loading]);

  const inner = (
    <div className="relative min-h-screen aureon-bg">
      <div className="pointer-events-none absolute -top-40 -left-40 w-[480px] h-[480px] rounded-full bg-aureon-blue/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[520px] h-[520px] rounded-full bg-aureon-orange/25 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 aureon-grid opacity-30" />

      <header className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-8 flex items-center justify-between gap-4 flex-wrap">
        <PlatformHomeLink />
        <div className="flex items-center gap-3 flex-wrap justify-end">
          <ScopeBar />
          <div className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground text-right hidden md:block">{subtitle ?? "Aureon Futsal Pro Suite"}</div>
        </div>
      </header>

      <main className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-20">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <h1 className="font-display text-3xl sm:text-5xl tracking-[0.06em]">
            <span className="aureon-title-gradient">{title}</span>
          </h1>
          {actions}
        </div>
        <div className="mt-8">{children}</div>
      </main>
    </div>
  );

  if (loading) {
    return <div className="min-h-screen aureon-bg flex items-center justify-center text-muted-foreground text-sm">Cargando…</div>;
  }
  if (!user) return null;
  if (effectiveKey) {
    return <ModuleGuard moduleKey={effectiveKey} label={title}>{inner}</ModuleGuard>;
  }
  return inner;
}
