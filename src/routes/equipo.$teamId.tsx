import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, BarChart3, User, ArrowLeft } from "lucide-react";
import { ModuleShell } from "@/components/ModuleShell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PlayerForm, type PlayerFormValues } from "@/components/PlayerForm";
import { positionStyle, positionBorderClass, isStaff } from "@/lib/players";
import { PlayerStatsDialog } from "@/components/PlayerStatsDialog";

export const Route = createFileRoute("/equipo/$teamId")({
  head: () => ({
    meta: [
      { title: "Plantilla del equipo — Aureon Futsal Pro Suite" },
    ],
  }),
  component: EquipoDetallePage,
});

const MAX_PLAYERS = 25;

type Team = { id: string; name: string; category: string };
type Player = PlayerFormValues & { id: string };

function EquipoDetallePage() {
  const { teamId } = Route.useParams();
  const [players, setPlayers] = useState<Player[]>([]);
  const [team, setTeam] = useState<Team | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Player | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Player | null>(null);
  const [confirmEdit, setConfirmEdit] = useState<Player | null>(null);
  const [statsPlayer, setStatsPlayer] = useState<Player | null>(null);
  const [seasons, setSeasons] = useState<Array<{ id: string; name: string }>>([]);
  const [matches, setMatches] = useState<Array<{ id: string; label: string; season_id: string | null }>>([]);

  useEffect(() => {
    (async () => {
      const [{ data: s }, { data: lm }, { data: st }] = await Promise.all([
        supabase.from("seasons").select("id,name").order("created_at", { ascending: false }),
        supabase.from("live_matches").select("id,season_id,home_team_id,away_team_id,created_at").order("created_at", { ascending: false }),
        supabase.from("season_teams").select("id,name"),
      ]);
      setSeasons((s as Array<{ id: string; name: string }>) ?? []);
      const teamMap: Record<string, string> = {};
      ((st as Array<{ id: string; name: string }>) ?? []).forEach(t => { teamMap[t.id] = t.name; });
      const ms = ((lm as Array<{ id: string; season_id: string | null; home_team_id: string | null; away_team_id: string | null; created_at: string }>) ?? [])
        .map(m => ({
          id: m.id,
          season_id: m.season_id,
          label: `${teamMap[m.home_team_id ?? ""] ?? "—"} vs ${teamMap[m.away_team_id ?? ""] ?? "—"} · ${new Date(m.created_at).toLocaleDateString()}`,
        }));
      setMatches(ms);
    })();
  }, []);

  const load = async () => {
    setLoading(true);
    const [{ data: p }, { data: t }, { data: tt }] = await Promise.all([
      supabase.from("players").select("*").eq("team_id", teamId).order("jersey_number", { ascending: true, nullsFirst: false }),
      supabase.from("teams").select("id,name,category").eq("id", teamId).maybeSingle(),
      supabase.from("teams").select("id,name,category").order("name"),
    ]);
    setPlayers((p as Player[]) ?? []);
    setTeam((t as Team) ?? null);
    setTeams((tt as Team[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [teamId]);

  const openNew = () => {
    if (players.length >= MAX_PLAYERS) {
      toast.error(`Máximo ${MAX_PLAYERS} jugadores`);
      return;
    }
    setEditing(null);
    setOpen(true);
  };

  const askEdit = (p: Player) => setConfirmEdit(p);
  const startEdit = () => {
    if (!confirmEdit) return;
    setEditing(confirmEdit);
    setConfirmEdit(null);
    setOpen(true);
  };

  const handleSubmit = async (v: PlayerFormValues) => {
    setSaving(true);
    const payload = {
      first_name: v.first_name,
      last_name: v.last_name,
      sport_name: v.sport_name,
      jersey_number: v.jersey_number,
      position: v.position,
      dominant_foot: v.dominant_foot,
      dominant_hand: v.dominant_hand,
      phone: v.phone,
      email: v.email,
      birth_date: v.birth_date,
      photo_url: v.photo_url,
      team_id: v.team_id ?? teamId,
    };
    if (editing) {
      const { error } = await supabase.from("players").update(payload).eq("id", editing.id);
      if (error) toast.error("Error al actualizar");
      else toast.success("Jugador actualizado");
    } else {
      const { error } = await supabase.from("players").insert(payload);
      if (error) toast.error("Error al crear");
      else toast.success("Jugador añadido");
    }
    setSaving(false);
    setOpen(false);
    load();
  };

  const remove = async () => {
    if (!confirmDelete) return;
    const { error } = await supabase.from("players").delete().eq("id", confirmDelete.id);
    if (error) toast.error("Error al eliminar");
    else toast.success("Jugador eliminado");
    setConfirmDelete(null);
    load();
  };

  const { gk, field, staff } = useMemo(() => {
    const byNumber = (a: Player, b: Player) => (a.jersey_number ?? 999) - (b.jersey_number ?? 999);
    const gk = players.filter(p => p.position === "Portero").sort(byNumber);
    const field = players.filter(p => !isStaff(p.position) && p.position !== "Portero").sort(byNumber);
    const staffList = players.filter(p => isStaff(p.position)).sort(byNumber);
    return { gk, field, staff: staffList };
  }, [players]);

  const renderCard = (p: Player) => (
    <div
      key={p.id}
      className={`rounded-xl border bg-background/40 backdrop-blur overflow-hidden ${positionBorderClass(p.position)}`}
    >
      <div className="relative aspect-[4/3] bg-gradient-to-br from-aureon-blue/40 to-aureon-orange/20">
        {p.photo_url ? (
          <img src={p.photo_url} alt={p.sport_name || `${p.first_name} ${p.last_name}`} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white/60">
            <User className="w-12 h-12" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
        <div className="absolute top-1.5 right-1.5 flex items-center gap-2">
          {p.jersey_number != null && (
            <span className="font-display text-lg text-white drop-shadow bg-black/50 backdrop-blur rounded px-1.5 py-0.5">
              {String(p.jersey_number).padStart(2, "0")}
            </span>
          )}
        </div>
        <div className="absolute bottom-1.5 left-1.5 right-1.5 space-y-1">
          <h3 className="font-display text-sm text-white tracking-wide leading-tight">
            {p.sport_name || `${p.first_name} ${p.last_name}`}
          </h3>
          <div className="flex items-center justify-end gap-1">
            <span className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${positionStyle(p.position)}`}>
              {p.position}
            </span>
          </div>
        </div>
      </div>
      <div className="p-2 flex flex-wrap gap-1.5">
        <Button
          size="sm"
          variant="secondary"
          className="h-7 px-2 gap-1 text-xs"
          onClick={() => setStatsPlayer(p)}
        >
          <BarChart3 className="w-3 h-3" /> Stats
        </Button>
        <Button
          size="sm"
          className="h-7 px-2 gap-1 text-xs bg-aureon-orange text-black hover:bg-aureon-orange/90"
          onClick={() => askEdit(p)}
        >
          <Pencil className="w-3 h-3" /> Editar
        </Button>
        <Button size="sm" variant="destructive" className="h-7 px-2 gap-1 text-xs ml-auto" onClick={() => setConfirmDelete(p)}>
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );

  return (
    <ModuleShell
      title={team ? team.name.toUpperCase() : "EQUIPO"}
      subtitle={`${team?.category ?? ""} · Plantilla ${players.length}/${MAX_PLAYERS}`}
      actions={
        <div className="flex flex-wrap gap-2">
          <Link
            to="/equipo"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white text-black hover:bg-white/90 text-xs font-display tracking-[0.2em]"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> EQUIPOS
          </Link>
          <Button onClick={openNew} className="gap-2 font-display tracking-wider bg-aureon-orange text-black hover:bg-aureon-orange/90">
            <Plus className="w-4 h-4" /> AÑADIR JUGADOR
          </Button>
        </div>
      }
    >
      {loading ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : players.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-background/40 backdrop-blur p-10 text-center">
          <p className="text-muted-foreground">Aún no hay jugadores en este equipo. Pulsa AÑADIR JUGADOR.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {(gk.length > 0 || field.length > 0) && (
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {gk.map((p) => renderCard(p))}
              {field.map((p) => renderCard(p))}
            </div>
          )}
          {staff.length > 0 && (
            <div className="border-t border-white/10 pt-4">
              <h3 className="font-display text-lg tracking-[0.2em] text-white/70 mb-3">CUERPO TÉCNICO</h3>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {staff.map((p) => renderCard(p))}
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar jugador" : "Nuevo jugador"}</DialogTitle>
          </DialogHeader>
          <PlayerForm
            initial={editing ?? { team_id: teamId } as Partial<PlayerFormValues>}
            teams={teams}
            onSubmit={handleSubmit}
            onCancel={() => setOpen(false)}
            saving={saving}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmEdit} onOpenChange={(o) => !o && setConfirmEdit(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Modificar jugador?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a editar los datos de “{confirmEdit?.sport_name || `${confirmEdit?.first_name} ${confirmEdit?.last_name}`}”. ¿Quieres continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={startEdit}>Continuar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar jugador?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a eliminar a “{confirmDelete?.sport_name || `${confirmDelete?.first_name} ${confirmDelete?.last_name}`}”. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PlayerStatsDialog
        open={!!statsPlayer}
        onOpenChange={(o) => !o && setStatsPlayer(null)}
        playerId={statsPlayer?.id ?? null}
        playerName={statsPlayer?.sport_name || (statsPlayer ? `${statsPlayer.first_name} ${statsPlayer.last_name}` : "")}
        seasons={seasons}
        matches={matches}
      />
    </ModuleShell>
  );
}
