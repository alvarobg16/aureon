import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Users, ClipboardList, Building2, BarChart3, CalendarRange, Home, Trophy, Settings, ShieldCheck, LogOut, Lock, Clock, CalendarX, CalendarCheck2, KeyRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useUserModules } from "@/lib/access";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";
import { getMustChangePassword } from "@/lib/admin-users.functions";

export const Route = createFileRoute("/plataforma")({
  head: () => ({
    meta: [
      { title: "Aureon Futsal Pro Suite — Plataforma" },
      { name: "description", content: "Accede a los módulos de gestión: equipo, tareas, club, estadísticas y temporadas." },
    ],
  }),
  component: Plataforma,
});

const ICONS: Record<string, LucideIcon> = {
  club: Building2,
  equipo: Users,
  temporadas: CalendarRange,
  planificacion: CalendarCheck2,
  tareas: ClipboardList,
  partidos: Trophy,
  estadisticas: BarChart3,
};

const TONES: Record<string, string> = {
  club: "from-aureon-red/80 to-aureon-orange/30 ring-aureon-red/40",
  equipo: "from-aureon-blue/80 to-aureon-blue/30 ring-aureon-blue/40",
  temporadas: "from-amber-400/70 to-aureon-orange/30 ring-amber-300/40",
  planificacion: "from-emerald-500/80 to-aureon-blue/30 ring-emerald-400/40",
  tareas: "from-aureon-orange/80 to-aureon-red/30 ring-aureon-orange/40",
  partidos: "from-aureon-red/80 to-aureon-orange/30 ring-aureon-red/40",
  estadisticas: "from-sky-400/70 to-aureon-blue/30 ring-sky-300/40",
};

function Plataforma() {
  // navegación se hace vía window.location para evitar tipos estrictos en Link/navigate
  const { user, isAdmin, loading, signOut } = useAuth();
  const { items, loading: modsLoading } = useUserModules();
  const checkMustChange = useServerFn(getMustChangePassword);
  const [pwOpen, setPwOpen] = useState(false);
  const [pwMandatory, setPwMandatory] = useState(false);

  useEffect(() => {
    if (!loading && !user) window.location.href = "/auth?redirect=/plataforma";
  }, [user, loading]);

  useEffect(() => {
    if (!user) return;
    checkMustChange().then((r) => {
      if (r.mustChange) { setPwMandatory(true); setPwOpen(true); }
    }).catch(() => { /* silent */ });
  }, [user, checkMustChange]);

  // Filtra solo módulos "raíz" (sin punto)
  const rootItems = items.filter((m) => !m.key.includes("."));

  return (
    <div className="relative min-h-screen aureon-bg">
      <div className="pointer-events-none absolute -top-40 -left-40 w-[480px] h-[480px] rounded-full bg-aureon-blue/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[520px] h-[520px] rounded-full bg-aureon-orange/25 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 aureon-grid opacity-30" />

      <header className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-8 flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <Home className="w-4 h-4" />
          <span className="font-display tracking-[0.25em]">INICIO</span>
        </Link>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link to="/admin" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-aureon-orange/40 bg-aureon-orange/10 hover:bg-aureon-orange/20 text-[10px] font-display tracking-[0.25em] text-aureon-orange leading-none">
              <ShieldCheck className="w-3 h-3" />
              <span>ADMIN</span>
            </Link>
          )}
          {isAdmin && (
            <Link
              to="/configuracion"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-white/15 bg-white/5 hover:bg-white/10 text-[10px] font-display tracking-[0.25em] text-white/80 hover:text-white transition-colors leading-none"
            >
              <Settings className="w-3 h-3" />
              <span>CONFIGURACIÓN</span>
            </Link>
          )}
          <button
            onClick={() => { setPwMandatory(false); setPwOpen(true); }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-white/15 bg-white/5 hover:bg-white/10 text-[10px] font-display tracking-[0.25em] text-white/80 hover:text-white transition-colors leading-none"
          >
            <KeyRound className="w-3 h-3" />
            <span>CAMBIAR CONTRASEÑA</span>
          </button>
          <button
            onClick={async () => { await signOut(); window.location.href = "/auth"; }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-white/15 bg-white/5 hover:bg-white/10 text-[10px] font-display tracking-[0.25em] text-white/80 hover:text-white transition-colors leading-none"
          >
            <LogOut className="w-3 h-3" />
            <span>SALIR</span>
          </button>
        </div>
      </header>

      <main className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-16">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="font-display text-4xl sm:text-6xl tracking-[0.06em]">
            <span className="aureon-title-gradient">AUREON</span> FUTSAL PRO SUITE
          </h1>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground">
            {user ? `Hola${user.email ? `, ${user.email}` : ""}. Selecciona un módulo para empezar.` : "Selecciona un módulo para empezar."}
          </p>
        </div>

        {modsLoading ? (
          <div className="mt-10 text-center text-sm text-muted-foreground">Cargando módulos…</div>
        ) : rootItems.length === 0 ? (
          <div className="mt-10 max-w-md mx-auto rounded-2xl border border-white/10 bg-background/40 backdrop-blur-md p-6 text-center">
            <Lock className="w-8 h-8 mx-auto text-aureon-red" />
            <p className="mt-3 text-sm text-white">No tienes módulos asignados.</p>
            <p className="mt-1 text-xs text-muted-foreground">Contacta con el administrador para solicitar acceso.</p>
          </div>
        ) : (
          <div className="mt-10 grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3">
            {rootItems.map((m) => {
              const Icon = ICONS[m.key] ?? ClipboardList;
              const tone = TONES[m.key] ?? "from-aureon-blue/80 to-aureon-blue/30 ring-aureon-blue/40";
              const blocked = m.status !== "active";
              const StatusIcon = m.status === "pending" ? Clock : m.status === "expired" ? CalendarX : Lock;
              return (
                <Link key={m.key} to={m.route} className={blocked ? "pointer-events-none" : undefined}>
                  <div className={`group relative h-full overflow-hidden rounded-2xl border border-white/10 bg-background/40 backdrop-blur-md p-4 sm:p-5 ring-1 transition-all hover:-translate-y-1 ${tone} bg-gradient-to-br hover:shadow-[0_20px_60px_-20px_oklch(0.65_0.2_240/0.6)] ${blocked ? "opacity-60 grayscale" : ""}`}>
                    <div className="absolute -right-8 -top-8 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Icon className="w-32 h-32" />
                    </div>
                    <div className="relative">
                      <div className="flex items-center justify-between">
                        <Icon className="w-7 h-7 text-white drop-shadow" />
                        {blocked && (
                          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.15em] text-white/90 bg-black/40 px-2 py-0.5 rounded">
                            <StatusIcon className="w-3 h-3" />
                            {m.status === "pending" ? "Próximamente" : m.status === "expired" ? "Caducado" : "Bloqueado"}
                          </span>
                        )}
                      </div>
                      <h2 className="mt-3 font-display text-lg sm:text-xl tracking-[0.06em] text-white leading-tight uppercase">{m.label}</h2>
                      {m.endsAt && !blocked && (
                        <p className="mt-1.5 text-[11px] text-white/70">Activo hasta {m.endsAt}</p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <footer className="relative text-center pb-6 text-xs uppercase tracking-[0.35em] text-muted-foreground/80">
        Aureon Futsal ProSuite 2026 · V1.0
      </footer>

      <ChangePasswordDialog
        open={pwOpen}
        onOpenChange={setPwOpen}
        mandatory={pwMandatory}
        onChanged={() => setPwMandatory(false)}
      />
    </div>
  );
}
