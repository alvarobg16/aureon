import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ModuleShell } from "@/components/ModuleShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Eye, Trash2, ArrowLeft, Radio } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getActiveMatchId, clearActiveMatchId, getPendingCount, liveSb } from "@/lib/liveSync";

export const Route = createFileRoute("/partidos/live/")({
  head: () => ({
    meta: [
      { title: "LIVE — Aureon Futsal Pro Suite" },
      { name: "description", content: "Modo Live de Gestión de Partidos." },
    ],
  }),
  component: LiveIndex,
});

type LiveRow = {
  id: string;
  status: string;
  score_home: number;
  score_away: number;
  created_at: string;
  finished_at: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
  own_team_id: string | null;
};
type TeamLite = { id: string; name: string; category: string };

function LiveIndex() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<LiveRow[]>([]);
  const [teamNames, setTeamNames] = useState<Record<string, string>>({});
  const [clubTeams, setClubTeams] = useState<TeamLite[]>([]);
  const [teamFilter, setTeamFilter] = useState<string>(() =>
    typeof window !== "undefined" ? localStorage.getItem("aureon.liveListTeamFilter") || "all" : "all"
  );
  const [showList, setShowList] = useState(false);
  const [confirmDel, setConfirmDel] = useState<LiveRow | null>(null);
  const [recover, setRecover] = useState<{ id: string; pending: number } | null>(null);

  const load = async () => {
    const [{ data }, { data: tm }] = await Promise.all([
      supabase
        .from("live_matches")
        .select("id,status,score_home,score_away,created_at,finished_at,home_team_id,away_team_id,own_team_id")
        .order("created_at", { ascending: false }),
      supabase.from("teams").select("id,name,category").order("name"),
    ]);
    const list = (data as LiveRow[]) ?? [];
    setRows(list);
    setClubTeams((tm as TeamLite[]) ?? []);
    const ids = Array.from(new Set(list.flatMap((r) => [r.home_team_id, r.away_team_id]).filter(Boolean) as string[]));
    if (ids.length) {
      const { data: ts } = await supabase.from("season_teams").select("id,name").in("id", ids);
      const map: Record<string, string> = {};
      (ts ?? []).forEach((t: any) => (map[t.id] = t.name));
      setTeamNames(map);
    }
  };
  useEffect(() => { load(); }, []);

  // Detectar partido en curso pendiente al reabrir la app.
  useEffect(() => {
    (async () => {
      const id = await getActiveMatchId();
      if (!id) return;
      const pending = await getPendingCount(id);
      // Sólo mostramos si el partido sigue 'live' o si quedan eventos por sincronizar.
      const isLive = rows.some((r) => r.id === id && r.status === "live");
      if (isLive || pending > 0) setRecover({ id, pending });
    })();
  }, [rows]);


  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("aureon.liveListTeamFilter", teamFilter);
  }, [teamFilter]);

  const filtered = rows.filter((r) => {
    if (teamFilter === "all") return true;
    if (teamFilter === "none") return !r.own_team_id;
    return r.own_team_id === teamFilter;
  });

  const del = async () => {
    if (!confirmDel) return;
    await supabase.from("live_events").delete().eq("live_match_id", confirmDel.id);
    await supabase.from("live_player_time").delete().eq("live_match_id", confirmDel.id);
    const { error } = await supabase.from("live_matches").delete().eq("id", confirmDel.id);
    if (error) return toast.error("Error al eliminar");
    toast.success("Partido eliminado");
    setConfirmDel(null);
    load();
  };

  const finished = filtered.filter((r) => r.status === "finished");
  const ongoing = filtered.filter((r) => r.status !== "finished");

  return (
    <ModuleShell
      title="LIVE"
      subtitle="Modo en directo"
      actions={
        <Link to="/partidos" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/15 text-white text-xs font-display tracking-[0.2em]">
          <ArrowLeft className="w-3.5 h-3.5" /> VOLVER
        </Link>
      }
    >
      {!showList ? (
        <div className="grid gap-5 sm:grid-cols-2 max-w-3xl mx-auto mt-4">
          <Link
            to="/partidos/live/nuevo"
            className="group rounded-2xl border border-white/10 bg-gradient-to-br from-aureon-orange/70 to-aureon-red/40 ring-1 ring-aureon-orange/40 p-8 text-center transition hover:-translate-y-1"
          >
            <Plus className="w-12 h-12 mx-auto text-white" />
            <h2 className="mt-4 font-display text-2xl tracking-[0.1em] text-white">NUEVO PARTIDO</h2>
            <p className="mt-2 text-sm text-white/85">Crea un partido en directo.</p>
          </Link>
          <button
            onClick={() => setShowList(true)}
            className="group rounded-2xl border border-white/10 bg-gradient-to-br from-aureon-blue/70 to-aureon-blue/20 ring-1 ring-aureon-blue/40 p-8 text-center transition hover:-translate-y-1"
          >
            <Eye className="w-12 h-12 mx-auto text-white" />
            <h2 className="mt-4 font-display text-2xl tracking-[0.1em] text-white">VER EXISTENTE</h2>
            <p className="mt-2 text-sm text-white/85">Consulta partidos finalizados o reanuda uno en curso.</p>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <Button onClick={() => setShowList(false)} variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" /> Atrás
            </Button>
            <span className="text-xs text-muted-foreground">{filtered.length} de {rows.length} partidos</span>
          </div>

          {clubTeams.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-[0.25em] text-white/60 mr-1">Equipo</span>
              <button
                onClick={() => setTeamFilter("all")}
                className={`px-2.5 py-1 rounded-md text-xs font-display tracking-wider ${teamFilter === "all" ? "bg-aureon-orange text-black" : "bg-black text-white hover:bg-white/10"}`}
              >
                Todos
              </button>
              {clubTeams.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTeamFilter(t.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-display tracking-wider ${teamFilter === t.id ? "bg-aureon-orange text-black" : "bg-black text-white hover:bg-white/10"}`}
                >
                  {t.name}{t.category ? ` · ${t.category}` : ""}
                </button>
              ))}
              <button
                onClick={() => setTeamFilter("none")}
                className={`px-2.5 py-1 rounded-md text-xs font-display tracking-wider ${teamFilter === "none" ? "bg-aureon-orange text-black" : "bg-black text-white hover:bg-white/10"}`}
              >
                Sin equipo
              </button>
            </div>
          )}

          {ongoing.length > 0 && (
            <section className="rounded-2xl border border-aureon-orange/40 bg-aureon-orange/10 p-4">
              <h3 className="font-display text-sm tracking-[0.2em] text-aureon-orange inline-flex items-center gap-2">
                <Radio className="w-4 h-4 animate-pulse" /> EN CURSO
              </h3>
              <div className="mt-3 grid gap-2">
                {ongoing.map((r) => <Row key={r.id} r={r} teamNames={teamNames} onDel={setConfirmDel} />)}
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-white/10 bg-background/40 p-4">
            <h3 className="font-display text-sm tracking-[0.2em] text-white">FINALIZADOS</h3>
            {finished.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Sin partidos finalizados todavía.</p>
            ) : (
              <div className="mt-3 grid gap-2">
                {finished.map((r) => <Row key={r.id} r={r} teamNames={teamNames} onDel={setConfirmDel} />)}
              </div>
            )}
          </section>
        </div>
      )}

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar partido?</AlertDialogTitle>
            <AlertDialogDescription>Se borrarán todos sus eventos y minutos jugados. Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={del} className="bg-aureon-red text-white hover:bg-aureon-red/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!recover} onOpenChange={(o) => !o && setRecover(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Partido en curso pendiente</AlertDialogTitle>
            <AlertDialogDescription>
              Se ha encontrado un partido en curso pendiente de sincronización
              {recover && recover.pending > 0 ? ` (${recover.pending} acción${recover.pending === 1 ? "" : "es"} sin enviar)` : ""}.
              ¿Desea continuarlo, finalizarlo o descartarlo?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                if (!recover) return;
                await clearActiveMatchId();
                setRecover(null);
                toast.message("Partido descartado de la recuperación local");
              }}
              className="text-aureon-red border-aureon-red/40"
            >
              Descartar
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                if (!recover) return;
                await liveSb.from("live_matches").update({
                  status: "finished",
                  finished_at: new Date().toISOString(),
                }).eq("id", recover.id);
                await clearActiveMatchId();
                setRecover(null);
                toast.success("Partido finalizado");
                load();
              }}
            >
              Finalizar
            </Button>
            <AlertDialogAction
              onClick={() => {
                if (!recover) return;
                const id = recover.id;
                setRecover(null);
                navigate({ to: "/partidos/live/$liveId", params: { liveId: id } });
              }}
              className="bg-aureon-orange text-black hover:bg-aureon-orange/90"
            >
              Continuar partido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </ModuleShell>
  );
}

function Row({ r, teamNames, onDel }: { r: LiveRow; teamNames: Record<string, string>; onDel: (r: LiveRow) => void }) {
  const home = (r.home_team_id && teamNames[r.home_team_id]) || "Local";
  const away = (r.away_team_id && teamNames[r.away_team_id]) || "Visitante";
  const date = new Date(r.created_at).toLocaleDateString();
  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-background/60 p-3">
      <div className="text-[11px] text-muted-foreground w-20">{date}</div>
      <div className="flex-1 min-w-0 truncate text-white text-sm">
        <span className="font-display tracking-wide">{home}</span>
        <span className="mx-2 text-aureon-orange font-bold">{r.score_home} – {r.score_away}</span>
        <span className="font-display tracking-wide">{away}</span>
      </div>
      <Link
        to="/partidos/live/$liveId"
        params={{ liveId: r.id }}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-aureon-blue text-white text-xs font-display tracking-[0.15em]"
      >
        <Eye className="w-3.5 h-3.5" /> ABRIR
      </Link>
      <Button size="sm" variant="destructive" className="h-8 px-2" onClick={() => onDel(r)}>
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
