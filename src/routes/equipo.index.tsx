import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, Image as ImageIcon } from "lucide-react";
import { ModuleShell } from "@/components/ModuleShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/equipo/")({
  head: () => ({
    meta: [
      { title: "Gestión de Jugadores — Aureon Futsal Pro Suite" },
      { name: "description", content: "Selecciona un equipo para gestionar su plantilla y el control de presencia." },
    ],
  }),
  component: EquipoIndexPage,
});

type Team = {
  id: string;
  name: string;
  category: string;
  competition: string;
  photo_url: string | null;
};

function EquipoIndexPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: t }, { data: p }] = await Promise.all([
        supabase.from("teams").select("id,name,category,competition,photo_url").order("created_at", { ascending: true }),
        supabase.from("players").select("id,team_id"),
      ]);
      setTeams((t as Team[]) ?? []);
      const c: Record<string, number> = {};
      ((p as { id: string; team_id: string | null }[]) ?? []).forEach((pl) => {
        if (pl.team_id) c[pl.team_id] = (c[pl.team_id] ?? 0) + 1;
      });
      setCounts(c);
      setLoading(false);
    })();
  }, []);

  return (
    <ModuleShell
      title="GESTIÓN DE JUGADORES"
      subtitle="Elige un equipo para ver y gestionar su plantilla"
    >
      {loading ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : teams.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-background/40 backdrop-blur p-10 text-center">
          <p className="text-muted-foreground">
            No hay equipos todavía. Crea tus equipos en{" "}
            <Link to="/club" className="text-aureon-orange underline">GESTIÓN DE CLUB</Link>.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((t) => (
            <div
              key={t.id}
              className="rounded-2xl border border-white/10 bg-gradient-to-br from-aureon-red/40 to-aureon-orange/20 backdrop-blur p-5 ring-1 ring-aureon-red/30 flex flex-col"
            >
              <div className="flex items-start gap-3">
                <div className="w-16 h-16 rounded-xl border border-white/20 bg-background/40 flex items-center justify-center overflow-hidden shrink-0">
                  {t.photo_url ? (
                    <img src={t.photo_url} alt={t.name} className="w-full h-full object-contain" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-2xl tracking-wide truncate text-white">{t.name}</h3>
                  <p className="text-sm text-white/80 truncate">{t.category || "Sin categoría"}</p>
                  <p className="text-xs text-white/60 mt-0.5">{counts[t.id] ?? 0} jugadores</p>
                </div>
              </div>
              <div className="mt-4">
                <Link
                  to="/equipo/$teamId"
                  params={{ teamId: t.id }}
                  className="inline-flex w-full items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-aureon-orange text-black hover:bg-aureon-orange/90 text-xs font-display tracking-[0.15em]"
                >
                  <Users className="w-3.5 h-3.5" /> PLANTILLA
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </ModuleShell>
  );
}
