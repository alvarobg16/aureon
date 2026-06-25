import { createFileRoute, Outlet, Link, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { AccessBlocked } from "@/components/AccessBlocked";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { isAdmin, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="min-h-screen aureon-bg flex items-center justify-center text-muted-foreground text-sm">Cargando…</div>;
  if (!isAdmin) return <AccessBlocked status="no-access" moduleLabel="Panel de administración" />;

  const tabs = [
    { to: "/admin", label: "Usuarios", exact: true },
    { to: "/admin/modulos", label: "Módulos" },
    { to: "/admin/asignaciones", label: "Asignaciones" },
    { to: "/admin/limites", label: "Límites" },
    { to: "/admin/migracion", label: "Migración" },
    { to: "/admin/logs", label: "Logs" },
  ];

  return (
    <div className="min-h-screen aureon-bg">
      <header className="max-w-6xl mx-auto px-6 pt-8 flex items-center justify-between">
        <div>
          <Link to="/plataforma" className="text-xs text-muted-foreground hover:text-white">← Plataforma</Link>
          <h1 className="mt-2 font-display text-3xl tracking-[0.1em] aureon-title-gradient">PANEL DE ADMINISTRACIÓN</h1>
        </div>
      </header>
      <nav className="max-w-6xl mx-auto px-6 mt-6 flex gap-2 border-b border-white/10">
        {tabs.map((t) => {
          const active = t.exact ? location.pathname === t.to : location.pathname.startsWith(t.to);
          return (
            <Link key={t.to} to={t.to} className={`px-4 py-2 text-sm font-display tracking-[0.15em] border-b-2 ${active ? "border-aureon-orange text-white" : "border-transparent text-muted-foreground hover:text-white"}`}>
              {t.label.toUpperCase()}
            </Link>
          );
        })}
      </nav>
      <main className="max-w-6xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
