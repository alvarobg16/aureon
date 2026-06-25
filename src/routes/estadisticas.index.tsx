import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { ModuleShell } from "@/components/ModuleShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/estadisticas/")({
  head: () => ({
    meta: [
      { title: "Gestión de Estadísticas — Aureon Futsal Pro Suite" },
      { name: "description", content: "Selecciona un equipo para ver sus estadísticas." },
    ],
  }),
  component: EstadisticasIndex,
});

type Team = { id: string; name: string; category: string };

function EstadisticasIndex() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: t }, { data: p }] = await Promise.all([
        supabase.from("teams").select("id,name,category").order("name"),
        supabase.from("players").select("team_id"),
      ]);
      const c: Record<string, number> = {};
      (p ?? []).forEach((row: { team_id: string | null }) => {
        if (row.team_id) c[row.team_id] = (c[row.team_id] ?? 0) + 1;
      });
      setCounts(c);
      setTeams((t as Team[]) ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <ModuleShell title="GESTIÓN DE ESTADÍSTICAS" subtitle="Equipos">
      {loading ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : teams.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-background/40 backdrop-blur p-10 text-center">
          <p className="text-muted-foreground">Aún no hay equipos. Crea uno desde GESTIÓN DE CLUB.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((t) => (
            <Link
              key={t.id}
              to="/estadisticas/equipo/$teamId"
              params={{ teamId: t.id }}
              className="group rounded-2xl border border-white/10 bg-gradient-to-br from-aureon-blue/40 to-aureon-orange/20 backdrop-blur p-6 ring-1 ring-aureon-blue/30 hover:-translate-y-1 transition-all"
            >
              <Users className="w-8 h-8 text-white/90" />
              <h3 className="mt-3 font-display text-2xl tracking-wide">{t.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{t.category || "Sin categoría"}</p>
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mt-3">
                {counts[t.id] ?? 0} jugador{(counts[t.id] ?? 0) === 1 ? "" : "es"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </ModuleShell>
  );
}
