import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { ModuleShell } from "@/components/ModuleShell";
import { supabase } from "@/integrations/supabase/client";
import { useScope } from "@/lib/scope";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { toast } from "sonner";
import { Plus, Pencil, Trash2, CalendarRange, Users2, Trophy, Star } from "lucide-react";

const searchSchema = z.object({
  nuevoFix: z.string().optional(),
  date: z.string().optional(),
  from: z.string().optional(),
});

export const Route = createFileRoute("/temporadas")({
  head: () => ({
    meta: [
      { title: "Gestión de Temporada — Aureon Futsal Pro Suite" },
      { name: "description", content: "Gestiona temporadas, equipos rivales y jornadas." },
    ],
  }),
  validateSearch: (s) => searchSchema.parse(s),
  component: TemporadasPage,
});

type Season = { id: string; name: string; is_active: boolean; created_at: string; team_id: string | null; start_date: string | null; end_date: string | null };

// Genera "Temporada 2026/2027" a partir de fecha de inicio y fin.
function deriveSeasonName(start?: string | null, end?: string | null): string {
  if (!start || !end) return "";
  const sy = Number(start.slice(0, 4));
  const ey = Number(end.slice(0, 4));
  if (!sy || !ey) return "";
  return sy === ey ? `Temporada ${sy}` : `Temporada ${sy}/${ey}`;
}

export function formatSeasonLabel(s: { name: string; start_date?: string | null; end_date?: string | null } | null | undefined): string {
  if (!s) return "";
  const derived = deriveSeasonName(s.start_date, s.end_date);
  return derived || s.name;
}
type Team = { id: string; name: string; category: string };
type SeasonTeam = {
  id: string;
  season_id: string;
  name: string;
  short_name: string;
  city: string;
  coach: string;
  logo_url: string | null;
  notes: string;
  is_own: boolean;
  own_team_id: string | null;
};
type Fixture = {
  id: string;
  season_id: string;
  matchday: string;
  match_date: string | null;
  competition: string;
  home_team_id: string;
  away_team_id: string;
  own_team_id: string | null;
  notes: string;
};

const ACTIVE_KEY = "aureon.activeSeasonId";

function TemporadasPage() {
  const scope = useScope();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [sTeams, setSTeams] = useState<SeasonTeam[]>([]);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);

  const [seasonOpen, setSeasonOpen] = useState(false);
  const [seasonName, setSeasonName] = useState("");
  const [seasonStart, setSeasonStart] = useState<string>("");
  const [seasonEnd, setSeasonEnd] = useState<string>("");
  const [seasonTeamId, setSeasonTeamId] = useState<string>("");
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);

  const [teamOpen, setTeamOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<SeasonTeam | null>(null);
  const [teamForm, setTeamForm] = useState<Omit<SeasonTeam, "id" | "season_id">>({
    name: "",
    short_name: "",
    city: "",
    coach: "",
    logo_url: null,
    notes: "",
    is_own: false,
    own_team_id: null,
  });

  const [fixOpen, setFixOpen] = useState(false);
  const [returnToPlanning, setReturnToPlanning] = useState(false);
  const [editingFix, setEditingFix] = useState<Fixture | null>(null);
  const [fixForm, setFixForm] = useState<Omit<Fixture, "id" | "season_id">>({
    matchday: "",
    match_date: "",
    competition: "",
    home_team_id: "",
    away_team_id: "",
    own_team_id: null,
    notes: "",
  });
  // Para opción "OTROS" en local/visitante: nombre libre del rival.
  const [homeOtherName, setHomeOtherName] = useState("");
  const [awayOtherName, setAwayOtherName] = useState("");

  const [confirmDelTeam, setConfirmDelTeam] = useState<SeasonTeam | null>(null);
  const [confirmDelFix, setConfirmDelFix] = useState<Fixture | null>(null);
  const [confirmDelSeason, setConfirmDelSeason] = useState<Season | null>(null);

  const [fixTeamFilter, setFixTeamFilter] = useState<string>(() =>
    typeof window !== "undefined" ? localStorage.getItem("aureon.fixtureTeamFilter") || "all" : "all"
  );
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("aureon.fixtureTeamFilter", fixTeamFilter);
  }, [fixTeamFilter]);

  const filteredFixtures = useMemo(() => fixtures.filter((f) => {
    if (fixTeamFilter === "all") return true;
    if (fixTeamFilter === "none") return !f.own_team_id;
    return f.own_team_id === fixTeamFilter;
  }), [fixtures, fixTeamFilter]);

  const reassignFixtureTeam = async (fixtureId: string, ownTeamId: string | null) => {
    const { error } = await supabase.from("fixtures").update({ own_team_id: ownTeamId }).eq("id", fixtureId);
    if (error) return toast.error("No se pudo reasignar");
    setFixtures((prev) => prev.map((f) => (f.id === fixtureId ? { ...f, own_team_id: ownTeamId } : f)));
    toast.success("Equipo actualizado");
  };

  const activeSeason = seasons.find((s) => s.id === activeId) ?? null;

  const ownTeam = useMemo(() => sTeams.find((t) => t.is_own) ?? null, [sTeams]);

  const loadSeasons = async () => {
    const { data } = await supabase.from("seasons").select("*").order("created_at", { ascending: false });
    const list = (data as Season[]) ?? [];
    setSeasons(list);
    // Filtrar por equipo activo del scope
    const scopedList = scope.activeTeamId ? list.filter((s) => s.team_id === scope.activeTeamId) : list;
    if (scopedList.length === 0) {
      setActiveId("");
      return;
    }
    const stored = localStorage.getItem(ACTIVE_KEY);
    const valid = stored && scopedList.some((s) => s.id === stored)
      ? stored
      : (scopedList.find((s) => s.is_active)?.id ?? scopedList[0].id);
    setActiveId(valid);
  };

  const loadTeams = async () => {
    const { data } = await supabase.from("teams").select("id,name,category").order("name");
    setTeams((data as Team[]) ?? []);
  };

  const loadSeasonData = async (id: string) => {
    if (!id) {
      setSTeams([]);
      setFixtures([]);
      return;
    }
    const [{ data: t }, { data: f }] = await Promise.all([
      supabase.from("season_teams").select("*").eq("season_id", id).order("name"),
      supabase.from("fixtures").select("*").eq("season_id", id).order("matchday", { ascending: true }),
    ]);
    setSTeams((t as SeasonTeam[]) ?? []);
    setFixtures((f as Fixture[]) ?? []);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadSeasons(), loadTeams()]);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (activeId) localStorage.setItem(ACTIVE_KEY, activeId);
    loadSeasonData(activeId);
  }, [activeId]);

  // Apertura automática de "Nueva jornada" desde Planificación (?nuevoFix=1&date=YYYY-MM-DD).
  useEffect(() => {
    if (loading) return;
    if (search.nuevoFix === "1" && activeId) {
      if (search.from === "planning") setReturnToPlanning(true);
      openNewFixture(search.date);
      // Limpiamos los params para que no se reabra en re-render.
      navigate({ to: "/temporadas", search: {}, replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, activeId, search.nuevoFix, search.date]);

  // Recargar/repicar temporada activa cuando cambia el equipo del scope
  useEffect(() => {
    loadSeasons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope.activeTeamId]);

  const scopedSeasons = useMemo(
    () => (scope.activeTeamId ? seasons.filter((s) => s.team_id === scope.activeTeamId) : seasons),
    [seasons, scope.activeTeamId]
  );
  const orphanSeasons = useMemo(() => seasons.filter((s) => !s.team_id), [seasons]);

  const assignSeasonTeam = async (seasonId: string, teamId: string) => {
    const { error } = await supabase.from("seasons").update({ team_id: teamId }).eq("id", seasonId);
    if (error) return toast.error("No se pudo asignar");
    toast.success("Temporada vinculada al equipo");
    await loadSeasons();
    scope.refresh();
  };

  // ─────────── Seasons CRUD ───────────
  const openNewSeason = () => {
    setEditingSeason(null);
    setSeasonName("");
    setSeasonStart("");
    setSeasonEnd("");
    setSeasonTeamId(scope.activeTeamId ?? "");
    setSeasonOpen(true);
  };
  const openEditSeason = (s: Season) => {
    setEditingSeason(s);
    setSeasonName(s.name);
    setSeasonStart(s.start_date ?? "");
    setSeasonEnd(s.end_date ?? "");
    setSeasonTeamId(s.team_id ?? "");
    setSeasonOpen(true);
  };
  const saveSeason = async () => {
    if (!seasonStart || !seasonEnd) {
      toast.error("Indica fecha de inicio y fecha de fin");
      return;
    }
    if (seasonEnd <= seasonStart) {
      toast.error("La fecha de fin debe ser posterior a la de inicio");
      return;
    }
    if (!seasonTeamId) {
      toast.error("Selecciona el equipo asociado a esta temporada");
      return;
    }
    const derived = deriveSeasonName(seasonStart, seasonEnd);
    const finalName = (seasonName.trim() || derived);
    if (!finalName) {
      toast.error("Indica un nombre para la temporada");
      return;
    }
    if (editingSeason) {
      const { error } = await supabase
        .from("seasons")
        .update({ name: finalName, team_id: seasonTeamId, start_date: seasonStart, end_date: seasonEnd })
        .eq("id", editingSeason.id);
      if (error) return toast.error("Error al actualizar");
      toast.success("Temporada actualizada");
    } else {
      const { data, error } = await supabase
        .from("seasons")
        .insert({
          name: finalName,
          team_id: seasonTeamId,
          start_date: seasonStart,
          end_date: seasonEnd,
          is_active: !seasons.some((s) => s.team_id === seasonTeamId),
        })
        .select()
        .single();
      if (error) return toast.error("Error al crear");
      toast.success("Temporada creada");
      if (data) setActiveId((data as Season).id);
    }
    setSeasonOpen(false);
    loadSeasons();
    scope.refresh();
  };
  const deleteSeason = async () => {
    if (!confirmDelSeason) return;
    const { error } = await supabase.from("seasons").delete().eq("id", confirmDelSeason.id);
    if (error) return toast.error("Error al eliminar");
    toast.success("Temporada eliminada");
    setConfirmDelSeason(null);
    if (activeId === confirmDelSeason.id) setActiveId("");
    loadSeasons();
  };

  // ─────────── Teams CRUD ───────────
  const openNewTeam = () => {
    if (!activeId) return toast.error("Selecciona o crea primero una temporada");
    setEditingTeam(null);
    setTeamForm({
      name: "",
      short_name: "",
      city: "",
      coach: "",
      logo_url: null,
      notes: "",
      is_own: false,
      own_team_id: null,
    });
    setTeamOpen(true);
  };
  const openEditTeam = (t: SeasonTeam) => {
    setEditingTeam(t);
    setTeamForm({
      name: t.name,
      short_name: t.short_name,
      city: t.city,
      coach: t.coach,
      logo_url: t.logo_url,
      notes: t.notes,
      is_own: t.is_own,
      own_team_id: t.own_team_id,
    });
    setTeamOpen(true);
  };
  const saveTeam = async () => {
    if (!teamForm.name.trim()) return toast.error("Indica el nombre del equipo");
    if (teamForm.is_own && ownTeam && (!editingTeam || editingTeam.id !== ownTeam.id)) {
      return toast.error(`Ya hay un equipo propio en esta temporada (${ownTeam.name})`);
    }
    const payload = { ...teamForm, season_id: activeId };
    if (editingTeam) {
      const { error } = await supabase.from("season_teams").update(payload).eq("id", editingTeam.id);
      if (error) return toast.error("Error al actualizar");
      toast.success("Equipo actualizado");
    } else {
      const { error } = await supabase.from("season_teams").insert(payload);
      if (error) return toast.error("Error al crear");
      toast.success("Equipo añadido");
    }
    setTeamOpen(false);
    loadSeasonData(activeId);
  };
  const deleteTeam = async () => {
    if (!confirmDelTeam) return;
    const { error } = await supabase.from("season_teams").delete().eq("id", confirmDelTeam.id);
    if (error) return toast.error("Error al eliminar (¿usado en alguna jornada?)");
    toast.success("Equipo eliminado");
    setConfirmDelTeam(null);
    loadSeasonData(activeId);
  };

  // ─────────── Fixtures CRUD ───────────
  const openNewFixture = (prefillDate?: string) => {
    if (!activeId) return toast.error("Selecciona o crea primero una temporada");
    setEditingFix(null);
    setFixForm({
      matchday: "",
      match_date: prefillDate ?? "",
      competition: "",
      home_team_id: ownTeam?.id ?? "",
      away_team_id: "",
      own_team_id: null,
      notes: "",
    });
    setHomeOtherName("");
    setAwayOtherName("");
    setFixOpen(true);
  };
  const openEditFixture = (f: Fixture) => {
    setEditingFix(f);
    setFixForm({
      matchday: f.matchday,
      match_date: f.match_date ?? "",
      competition: f.competition,
      home_team_id: f.home_team_id,
      away_team_id: f.away_team_id,
      own_team_id: f.own_team_id ?? null,
      notes: f.notes,
    });
    setHomeOtherName("");
    setAwayOtherName("");
    setFixOpen(true);
  };
  // Crea (o reutiliza) un season_team con un nombre libre — usado por la opción OTROS.
  const ensureSeasonTeamByName = async (name: string): Promise<string> => {
    const clean = name.trim();
    if (!clean) throw new Error("Indica el nombre del club");
    const existing = sTeams.find((t) => t.name.toLowerCase() === clean.toLowerCase());
    if (existing) return existing.id;
    const { data, error } = await supabase
      .from("season_teams")
      .insert({
        season_id: activeId,
        name: clean,
        short_name: "",
        city: "",
        coach: "",
        logo_url: null,
        notes: "",
        is_own: false,
        own_team_id: null,
      })
      .select("id")
      .single();
    if (error || !data) throw new Error("No se pudo crear el rival");
    return data.id;
  };
  const saveFixture = async () => {
    if (!fixForm.matchday.trim()) return toast.error("Indica la jornada");
    const isHomeOther = fixForm.home_team_id === "__OTHER__";
    const isAwayOther = fixForm.away_team_id === "__OTHER__";
    if (!fixForm.home_team_id || !fixForm.away_team_id) return toast.error("Selecciona local y visitante");
    if (isHomeOther && !homeOtherName.trim()) return toast.error("Indica el nombre del club local");
    if (isAwayOther && !awayOtherName.trim()) return toast.error("Indica el nombre del club visitante");

    let homeId = fixForm.home_team_id;
    let awayId = fixForm.away_team_id;
    try {
      if (isHomeOther) homeId = await ensureSeasonTeamByName(homeOtherName);
      if (isAwayOther) awayId = await ensureSeasonTeamByName(awayOtherName);
    } catch (e: any) {
      return toast.error(e?.message ?? "No se pudo registrar el rival");
    }

    if (homeId === awayId) return toast.error("Local y visitante deben ser distintos");
    if (ownTeam && homeId !== ownTeam.id && awayId !== ownTeam.id) {
      return toast.error(`Uno de los equipos debe ser tu equipo (${ownTeam.name}). Marca el equipo propio en la lista.`);
    }
    const payload = {
      ...fixForm,
      home_team_id: homeId,
      away_team_id: awayId,
      season_id: activeId,
      match_date: fixForm.match_date || null,
    };
    if (editingFix) {
      const { error } = await supabase.from("fixtures").update(payload).eq("id", editingFix.id);
      if (error) return toast.error("Error al actualizar");
      toast.success("Jornada actualizada");
    } else {
      const { error } = await supabase.from("fixtures").insert(payload);
      if (error) return toast.error("Error al crear");
      toast.success("Jornada añadida");
    }
    setFixOpen(false);
    loadSeasonData(activeId);
    if (returnToPlanning) {
      setReturnToPlanning(false);
      navigate({ to: "/planificacion" });
    }
  };
  const deleteFixture = async () => {
    if (!confirmDelFix) return;
    const { error } = await supabase.from("fixtures").delete().eq("id", confirmDelFix.id);
    if (error) return toast.error("Error al eliminar");
    toast.success("Jornada eliminada");
    setConfirmDelFix(null);
    loadSeasonData(activeId);
  };

  const teamName = (id: string) => sTeams.find((t) => t.id === id)?.name ?? "—";

  return (
    <ModuleShell
      title="GESTIÓN DE TEMPORADA"
      subtitle="Temporadas · Equipos · Jornadas"
      actions={
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to="/plataforma"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-aureon-orange text-black text-xs font-display tracking-[0.2em]"
          >
            ← VOLVER
          </Link>
        </div>
      }
    >
      {loading ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : (
        <div className="space-y-6">
          {/* Temporadas sin equipo asignado (datos previos a la actualización) */}
          {orphanSeasons.length > 0 && (
            <div className="rounded-2xl border border-aureon-orange/40 bg-aureon-orange/10 backdrop-blur p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                <div>
                  <h3 className="font-display text-sm tracking-[0.2em] text-white">TEMPORADAS SIN EQUIPO ASIGNADO</h3>
                  <p className="text-xs text-white/70 mt-1">
                    Asigna manualmente cada temporada existente al equipo correspondiente. No se modifica ningún dato interno.
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {orphanSeasons.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 flex-wrap bg-background/40 rounded-lg p-3 border border-white/10">
                    <span className="font-medium text-white">{s.name}</span>
                    <Select onValueChange={(v) => assignSeasonTeam(s.id, v)}>
                      <SelectTrigger className="h-8 max-w-[260px] ml-auto bg-background/60 border-white/15">
                        <SelectValue placeholder="Vincular a equipo…" />
                      </SelectTrigger>
                      <SelectContent>
                        {scope.teams.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}{t.category ? ` · ${t.category}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selector de temporada */}
          <div className="rounded-2xl border border-white/10 bg-background/40 backdrop-blur-md p-5">
            <div className="flex items-end gap-3 flex-wrap">
              <div className="flex-1 min-w-[260px]">
                <Label className="text-xs uppercase tracking-[0.25em] text-white/70">Temporada</Label>
                <Select value={activeId} onValueChange={setActiveId}>
                  <SelectTrigger className="mt-1 bg-background/60 border-white/15">
                    <SelectValue placeholder="Selecciona una temporada" />
                  </SelectTrigger>
                  <SelectContent>
                    {scopedSeasons.length === 0 && (
                      <div className="px-3 py-2 text-xs text-muted-foreground">
                        {scope.activeTeamId ? "Este equipo no tiene temporadas." : "Sin temporadas."}
                      </div>
                    )}
                    {scopedSeasons.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{formatSeasonLabel(s)}{s.is_active ? " ★" : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {scope.activeTeam && (
                <div className="text-[10px] uppercase tracking-[0.3em] text-aureon-orange self-center">
                  Equipo activo: <strong className="text-white">{scope.activeTeam.name}</strong>
                </div>
              )}
              <Button onClick={openNewSeason} className="bg-aureon-orange text-black hover:bg-aureon-orange/90">
                <Plus className="w-4 h-4 mr-1" /> NUEVA TEMPORADA
              </Button>
              {activeSeason && (
                <>
                  <Button onClick={() => openEditSeason(activeSeason)} className="bg-aureon-blue text-white hover:bg-aureon-blue/90">
                    <Pencil className="w-4 h-4 mr-1" /> EDITAR
                  </Button>
                  <Button onClick={() => setConfirmDelSeason(activeSeason)} variant="destructive">
                    <Trash2 className="w-4 h-4 mr-1" /> ELIMINAR
                  </Button>
                </>
              )}
            </div>
            {activeSeason && (
              <p className="mt-3 text-xs text-muted-foreground inline-flex items-center gap-2">
                <CalendarRange className="w-3.5 h-3.5" /> Trabajando sobre <strong className="text-white/90">{formatSeasonLabel(activeSeason)}</strong>{activeSeason.start_date && activeSeason.end_date ? ` · ${activeSeason.start_date} → ${activeSeason.end_date}` : " · (sin fechas — edita la temporada para añadirlas)"}
              </p>
            )}
          </div>

          {/* Submódulo Presencia */}
          <Link to="/presencia" className="block rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-500/30 to-aureon-blue/20 backdrop-blur-md p-5 hover:-translate-y-0.5 transition-transform">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg tracking-[0.2em] text-white">PRESENCIA</h2>
                <p className="text-xs text-white/70 mt-1">Asistencia a entrenamientos · Calendario · Estadísticas</p>
              </div>
              <span className="text-xs font-display tracking-widest bg-white text-black px-3 py-1.5 rounded-md">ABRIR →</span>
            </div>
          </Link>

          {!activeSeason ? (
            <div className="rounded-2xl border border-white/10 bg-background/40 backdrop-blur p-10 text-center">
              <p className="text-muted-foreground">Crea una temporada para añadir equipos y jornadas.</p>
            </div>
          ) : (
            <>
              {/* Equipos de la temporada */}
              <section className="rounded-2xl border border-white/10 bg-background/40 backdrop-blur-md p-5">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h2 className="font-display text-lg tracking-[0.2em] text-white inline-flex items-center gap-2">
                    <Users2 className="w-4 h-4" /> EQUIPOS DE LA LIGA
                  </h2>
                  <Button onClick={openNewTeam} className="bg-aureon-orange text-black hover:bg-aureon-orange/90">
                    <Plus className="w-4 h-4 mr-1" /> AÑADIR EQUIPO
                  </Button>
                </div>
                {sTeams.length === 0 ? (
                  <p className="mt-4 text-sm text-muted-foreground">Sin equipos. Añade los participantes de la liga.</p>
                ) : (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {sTeams.map((t) => (
                      <div
                        key={t.id}
                        className={`rounded-xl border p-4 bg-background/50 ${t.is_own ? "border-aureon-orange/60 ring-1 ring-aureon-orange/40" : "border-white/10"}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="font-display text-lg text-white truncate inline-flex items-center gap-1.5">
                              {t.is_own && <Star className="w-3.5 h-3.5 text-aureon-orange fill-aureon-orange" />}
                              {t.name}
                            </h3>
                            <p className="text-xs text-muted-foreground truncate">{t.city || "—"}</p>
                            {t.coach && <p className="text-[11px] text-white/70 mt-1">Entr.: {t.coach}</p>}
                          </div>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <Button size="sm" onClick={() => openEditTeam(t)} className="h-7 px-2 text-xs bg-aureon-blue text-white hover:bg-aureon-blue/90">
                            <Pencil className="w-3 h-3 mr-1" /> Editar
                          </Button>
                          <Button size="sm" variant="destructive" className="h-7 px-2 text-xs ml-auto" onClick={() => setConfirmDelTeam(t)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Jornadas */}
              <section className="rounded-2xl border border-white/10 bg-background/40 backdrop-blur-md p-5">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h2 className="font-display text-lg tracking-[0.2em] text-white inline-flex items-center gap-2">
                    <Trophy className="w-4 h-4" /> JORNADAS
                  </h2>
                  <Button onClick={() => openNewFixture()} className="bg-aureon-orange text-black hover:bg-aureon-orange/90">
                    <Plus className="w-4 h-4 mr-1" /> AÑADIR JORNADA
                  </Button>
                </div>
                {teams.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] uppercase tracking-[0.25em] text-white/60 mr-1">Equipo</span>
                    <button
                      onClick={() => setFixTeamFilter("all")}
                      className={`px-2.5 py-1 rounded-md text-xs font-display tracking-wider ${fixTeamFilter === "all" ? "bg-aureon-orange text-black" : "bg-black text-white hover:bg-white/10"}`}
                    >Todos</button>
                    {teams.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setFixTeamFilter(t.id)}
                        className={`px-2.5 py-1 rounded-md text-xs font-display tracking-wider ${fixTeamFilter === t.id ? "bg-aureon-orange text-black" : "bg-black text-white hover:bg-white/10"}`}
                      >{t.name}</button>
                    ))}
                    <button
                      onClick={() => setFixTeamFilter("none")}
                      className={`px-2.5 py-1 rounded-md text-xs font-display tracking-wider ${fixTeamFilter === "none" ? "bg-aureon-orange text-black" : "bg-black text-white hover:bg-white/10"}`}
                    >Sin asignar</button>
                  </div>
                )}
                {filteredFixtures.length === 0 ? (
                  <p className="mt-4 text-sm text-muted-foreground">Sin jornadas que coincidan.</p>
                ) : (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs uppercase tracking-[0.2em] text-muted-foreground bg-white/5">
                        <tr>
                          <th className="text-left p-3">J.</th>
                          <th className="text-left p-3">Fecha</th>
                          <th className="text-left p-3">Local</th>
                          <th className="text-left p-3">Visitante</th>
                          <th className="text-left p-3">Equipo del club</th>
                          <th className="text-left p-3">Competición</th>
                          <th className="p-3" />
                        </tr>
                      </thead>
                      <tbody>
                        {filteredFixtures.map((f) => (
                          <tr key={f.id} className="border-t border-white/5">
                            <td className="p-3 font-display">{f.matchday}</td>
                            <td className="p-3 text-muted-foreground">{f.match_date ?? "—"}</td>
                            <td className="p-3">{teamName(f.home_team_id)}</td>
                            <td className="p-3">{teamName(f.away_team_id)}</td>
                            <td className="p-3">
                              <Select
                                value={f.own_team_id ?? "none"}
                                onValueChange={(v) => reassignFixtureTeam(f.id, v === "none" ? null : v)}
                              >
                                <SelectTrigger className={`h-7 text-xs ${!f.own_team_id ? "border-aureon-orange/60 text-aureon-orange" : ""}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Sin asignar</SelectItem>
                                  {teams.map((t) => (
                                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-3 text-muted-foreground">{f.competition || "—"}</td>
                            <td className="p-3 text-right whitespace-nowrap">
                              <Button size="sm" onClick={() => openEditFixture(f)} className="h-7 px-2 text-xs mr-2 bg-aureon-blue text-white hover:bg-aureon-blue/90">
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button size="sm" variant="destructive" className="h-7 px-2 text-xs" onClick={() => setConfirmDelFix(f)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      )}

      {/* ── Season dialog ── */}
      <Dialog open={seasonOpen} onOpenChange={setSeasonOpen}>
        <DialogContent className="sm:max-w-md bg-white text-slate-900 border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-black font-display tracking-[0.2em]">{editingSeason ? "EDITAR TEMPORADA" : "NUEVA TEMPORADA"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-black text-xs font-semibold">Fecha de inicio *</Label>
                <Input type="date" className="mt-1 bg-white border-slate-300 text-slate-900"
                  value={seasonStart} onChange={(e) => setSeasonStart(e.target.value)} />
              </div>
              <div>
                <Label className="text-black text-xs font-semibold">Fecha de fin *</Label>
                <Input type="date" className="mt-1 bg-white border-slate-300 text-slate-900"
                  value={seasonEnd} onChange={(e) => setSeasonEnd(e.target.value)} />
              </div>
            </div>
            {(seasonStart && seasonEnd) && (
              <div className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900">
                Nomenclatura: <strong>{deriveSeasonName(seasonStart, seasonEnd) || "—"}</strong>
              </div>
            )}
            <div>
              <Label className="text-black text-xs font-semibold">Nombre (opcional)</Label>
              <Input className="mt-1 bg-white border-slate-300 text-slate-900"
                value={seasonName} onChange={(e) => setSeasonName(e.target.value)}
                placeholder={deriveSeasonName(seasonStart, seasonEnd) || "Ej. Temporada 2026/2027"} />
              <p className="mt-1 text-[11px] text-slate-600">Si lo dejas vacío, se usará la nomenclatura derivada de las fechas.</p>
            </div>
            <div>
              <Label className="text-black text-xs font-semibold">Equipo asociado *</Label>
              <Select value={seasonTeamId} onValueChange={setSeasonTeamId}>
                <SelectTrigger className="mt-1 bg-white border-slate-300 text-slate-900">
                  <SelectValue placeholder="Selecciona equipo del club" />
                </SelectTrigger>
                <SelectContent>
                  {scope.teams.length === 0 && (
                    <div className="px-3 py-2 text-xs text-slate-600">
                      Crea primero un equipo en Gestión de Club.
                    </div>
                  )}
                  {scope.teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}{t.category ? ` · ${t.category}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-[11px] text-slate-600">
                Esta temporada solo se mostrará cuando este equipo esté activo.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSeasonOpen(false)} className="border-slate-300 text-slate-900 hover:bg-slate-100">Cancelar</Button>
            <Button onClick={saveSeason} className="bg-aureon-orange text-black hover:bg-aureon-orange/90">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* ── Team dialog ── */}
      <Dialog open={teamOpen} onOpenChange={setTeamOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTeam ? "Editar equipo" : "Nuevo equipo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nombre</Label>
                <Input value={teamForm.name} onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })} />
              </div>
              <div>
                <Label>Abreviatura</Label>
                <Input value={teamForm.short_name} onChange={(e) => setTeamForm({ ...teamForm, short_name: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Ciudad</Label>
                <Input value={teamForm.city} onChange={(e) => setTeamForm({ ...teamForm, city: e.target.value })} />
              </div>
              <div>
                <Label>Entrenador</Label>
                <Input value={teamForm.coach} onChange={(e) => setTeamForm({ ...teamForm, coach: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea value={teamForm.notes} onChange={(e) => setTeamForm({ ...teamForm, notes: e.target.value })} rows={2} />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={teamForm.is_own}
                onChange={(e) => setTeamForm({ ...teamForm, is_own: e.target.checked })}
              />
              Este es <strong>nuestro equipo</strong>
            </label>
            {teamForm.is_own && teams.length > 0 && (
              <div>
                <Label>Vincular con equipo de Gestión de Club</Label>
                <Select
                  value={teamForm.own_team_id ?? "none"}
                  onValueChange={(v) => setTeamForm({ ...teamForm, own_team_id: v === "none" ? null : v })}
                >
                  <SelectTrigger><SelectValue placeholder="Ninguno" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin vincular</SelectItem>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name} {t.category ? `· ${t.category}` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTeamOpen(false)}>Cancelar</Button>
            <Button onClick={saveTeam} className="bg-aureon-orange text-black hover:bg-aureon-orange/90">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Fixture dialog ── */}
      <Dialog open={fixOpen} onOpenChange={setFixOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingFix ? "Editar jornada" : "Nueva jornada"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Jornada</Label>
                <Input value={fixForm.matchday} onChange={(e) => setFixForm({ ...fixForm, matchday: e.target.value })} placeholder="Ej. 12" />
              </div>
              <div>
                <Label>Fecha</Label>
                <Input type="date" value={fixForm.match_date ?? ""} onChange={(e) => setFixForm({ ...fixForm, match_date: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Competición</Label>
              <Input value={fixForm.competition} onChange={(e) => setFixForm({ ...fixForm, competition: e.target.value })} placeholder="Liga, Copa…" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Local</Label>
                <Select value={fixForm.home_team_id} onValueChange={(v) => setFixForm({ ...fixForm, home_team_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecciona…" /></SelectTrigger>
                  <SelectContent>
                    {sTeams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.is_own ? "★ " : ""}{t.name}</SelectItem>
                    ))}
                    <SelectItem value="__OTHER__">OTROS (club externo / amistoso)</SelectItem>
                  </SelectContent>
                </Select>
                {fixForm.home_team_id === "__OTHER__" && (
                  <div className="mt-2">
                    <Label className="text-[11px] text-muted-foreground">Nombre del club</Label>
                    <Input
                      value={homeOtherName}
                      onChange={(e) => setHomeOtherName(e.target.value)}
                      placeholder="Ej. AD Cáceres, Selección Extremeña…"
                      maxLength={120}
                    />
                  </div>
                )}
              </div>
              <div>
                <Label>Visitante</Label>
                <Select value={fixForm.away_team_id} onValueChange={(v) => setFixForm({ ...fixForm, away_team_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecciona…" /></SelectTrigger>
                  <SelectContent>
                    {sTeams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.is_own ? "★ " : ""}{t.name}</SelectItem>
                    ))}
                    <SelectItem value="__OTHER__">OTROS (club externo / amistoso)</SelectItem>
                  </SelectContent>
                </Select>
                {fixForm.away_team_id === "__OTHER__" && (
                  <div className="mt-2">
                    <Label className="text-[11px] text-muted-foreground">Nombre del club</Label>
                    <Input
                      value={awayOtherName}
                      onChange={(e) => setAwayOtherName(e.target.value)}
                      placeholder="Ej. CD Coria, Escuela Deportiva XYZ…"
                      maxLength={120}
                    />
                  </div>
                )}
              </div>
            </div>
            <div>
              <Label>Equipo del club</Label>
              <Select
                value={fixForm.own_team_id ?? "none"}
                onValueChange={(v) => setFixForm({ ...fixForm, own_team_id: v === "none" ? null : v })}
              >
                <SelectTrigger><SelectValue placeholder="Selecciona equipo…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin equipo asignado</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}{t.category ? ` · ${t.category}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-[11px] text-muted-foreground">Vincula la jornada al equipo del club (Senior, Juvenil…) para filtrar Live, Post y Estadísticas.</p>
            </div>
            {ownTeam && (
              <p className="text-[11px] text-muted-foreground">
                Uno de los dos equipos debe ser tu equipo (★ {ownTeam.name}).
              </p>
            )}
            <div>
              <Label>Notas</Label>
              <Textarea value={fixForm.notes} onChange={(e) => setFixForm({ ...fixForm, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFixOpen(false)}>Cancelar</Button>
            <Button onClick={saveFixture} className="bg-aureon-orange text-black hover:bg-aureon-orange/90">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirm dialogs ── */}
      <AlertDialog open={!!confirmDelTeam} onOpenChange={(o) => !o && setConfirmDelTeam(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar equipo?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a eliminar “{confirmDelTeam?.name}”. Si está en alguna jornada, esta acción fallará.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteTeam}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmDelFix} onOpenChange={(o) => !o && setConfirmDelFix(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar jornada?</AlertDialogTitle>
            <AlertDialogDescription>
              También se eliminarán los goles registrados en esta jornada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteFixture}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmDelSeason} onOpenChange={(o) => !o && setConfirmDelSeason(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar temporada?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán todos los equipos, jornadas y goles asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteSeason}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ModuleShell>
  );
}
