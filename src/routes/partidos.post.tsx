import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ModuleShell } from "@/components/ModuleShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";
import { Calendar, Eye, Pencil, Trash2 } from "lucide-react";
import { FutsalPitch } from "@/components/FutsalPitch";
import { FutsalGoal } from "@/components/FutsalGoal";
import {
  getCategories,
  getCategoryLabel,
  getSubLabel,
  type GoalSide,
} from "@/lib/goalCategories";

export const PREV_ACTIONS_FOR = [
  "Recuperación en presión tras pérdida",
  "Robo en presión alta",
  "Interceptación en línea de pase",
  "Bloqueo / pantalla ofensiva",
  "Rechace favorable / segunda jugada",
  "ABP – Corner",
  "ABP – Banda / falta lateral",
  "Error rival en salida / cesión comprometida",
  "Transición ofensiva / contraataque",
  "Ataque posicional elaborado",
] as const;

export const PREV_ACTIONS_AGAINST = [
  "Pérdida tras presión rival",
  "Pérdida en salida de balón",
  "Pérdida en ataque posicional",
  "Desajuste defensivo en bloqueo rival",
  "Segunda jugada / rechace concedido",
  "ABP encajada – Corner",
  "ABP encajada – Banda / falta lateral",
  "Error individual / mala cesión al portero",
  "Transición defensiva mal ajustada",
  "Desajuste en defensa posicional",
] as const;

export const FINISHING_FOOT_OPTIONS = [
  "Pierna dominante",
  "Pierna no dominante",
  "Otra superficie (cabeza / cuerpo)",
] as const;


export const Route = createFileRoute("/partidos/post")({
  head: () => ({
    meta: [
      { title: "Post-Partido — Aureon Futsal Pro Suite" },
      { name: "description", content: "Introduce las estadísticas de goles a favor y en contra del partido." },
    ],
  }),
  component: PostPartidoPage,
});

const ACTIVE_KEY = "aureon.activeSeasonId";
const ACTIVE_TEAM_KEY = "aureon.postTeamId";

type Season = { id: string; name: string };
type ClubTeam = { id: string; name: string; category: string };
type SeasonTeam = { id: string; name: string; is_own: boolean; own_team_id: string | null };
type Fixture = {
  id: string;
  season_id: string;
  matchday: string;
  match_date: string | null;
  competition: string;
  home_team_id: string;
  away_team_id: string;
  own_team_id: string | null;
};
type Player = {
  id: string;
  first_name: string;
  last_name: string;
  sport_name: string;
  jersey_number: number | null;
  position: string;
  team_id: string | null;
};
type Goal = {
  id: string;
  fixture_id: string | null;
  match_id: string | null;
  side: GoalSide;
  score_for: number;
  score_against: number;
  category: string;
  subcategory: string;
  pitch_x: number | null;
  pitch_y: number | null;
  goal_x: number | null;
  goal_y: number | null;
  players_on_court: string[];
  scorer_id: string | null;
  minute: number | null;
  ordinal: number;
  created_at: string;
  previous_action: string;
  finishing_foot: string;
  second_post: boolean;
};

type WizardStep = "score" | "category" | "players" | "scorer" | "pitch" | "goal" | "minute" | "prev" | "foot" | "secondPost";

type Wizard = {
  side: GoalSide;
  step: WizardStep;
  scoreFor: number;
  scoreAgainst: number;
  category: string;
  subcategory: string;
  players: string[];
  scorerId: string | null;
  pitch: { x: number; y: number } | null;
  goal: { x: number; y: number } | null;
  minute: number | null;
  previousAction: string;
  finishingFoot: string;
  secondPost: boolean;
  editingId?: string | null;
};


function emptyWizard(side: GoalSide, scoreFor: number, scoreAgainst: number): Wizard {
  return {
    side,
    step: "score",
    scoreFor: side === "for" ? scoreFor + 1 : scoreFor,
    scoreAgainst: side === "against" ? scoreAgainst + 1 : scoreAgainst,
    category: "",
    subcategory: "",
    players: [],
    scorerId: null,
    pitch: null,
    goal: null,
    minute: null,
    previousAction: "",
    finishingFoot: "",
    secondPost: false,
    editingId: null,
  };
}

function wizardFromGoal(g: Goal): Wizard {
  return {
    side: g.side,
    step: "score",
    scoreFor: g.score_for,
    scoreAgainst: g.score_against,
    category: g.category,
    subcategory: g.subcategory,
    players: g.players_on_court ?? [],
    scorerId: g.scorer_id,
    pitch: g.pitch_x !== null && g.pitch_y !== null ? { x: g.pitch_x, y: g.pitch_y } : null,
    goal: g.goal_x !== null && g.goal_y !== null ? { x: g.goal_x, y: g.goal_y } : null,
    minute: g.minute ?? null,
    previousAction: g.previous_action ?? "",
    finishingFoot: g.finishing_foot ?? "",
    secondPost: !!g.second_post,
    editingId: g.id,
  };
}


function PostPartidoPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonId, setSeasonId] = useState<string>("");
  const [clubTeams, setClubTeams] = useState<ClubTeam[]>([]);
  const [teamId, setTeamId] = useState<string>("");
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [seasonTeams, setSeasonTeams] = useState<SeasonTeam[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [fixtureId, setFixtureId] = useState<string>("");
  const [wizard, setWizard] = useState<Wizard | null>(null);
  const [preview, setPreview] = useState<Goal | null>(null);

  const currentFixture = fixtures.find((f) => f.id === fixtureId) ?? null;
  const ownTeam = seasonTeams.find((t) => t.is_own) ?? null;
  const currentClubTeam = clubTeams.find((t) => t.id === teamId) ?? null;

  // Filter fixtures by selected club team (own_team_id). Empty teamId = show all (legacy/unassigned).
  const visibleFixtures = useMemo(() => {
    if (!teamId) return fixtures;
    if (teamId === "__unassigned__") return fixtures.filter((f) => !f.own_team_id);
    return fixtures.filter((f) => f.own_team_id === teamId);
  }, [fixtures, teamId]);

  const score = useMemo(() => {
    let f = 0, a = 0;
    for (const g of goals) {
      if (g.side === "for") f++;
      else a++;
    }
    return { f, a };
  }, [goals]);

  // Cumulative running score per goal (chronological) so display shows 1-0, 2-0, 2-1...
  const cumById = useMemo(() => {
    const sorted = [...goals].sort((a, b) => {
      const ma = a.minute ?? Number.MAX_SAFE_INTEGER;
      const mb = b.minute ?? Number.MAX_SAFE_INTEGER;
      if (ma !== mb) return ma - mb;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
    const m: Record<string, { f: number; a: number }> = {};
    let f = 0, a = 0;
    for (const g of sorted) {
      if (g.side === "for") f++; else a++;
      m[g.id] = { f, a };
    }
    return m;
  }, [goals]);

  useEffect(() => {
    (async () => {
      const [{ data: ss }, { data: ct }] = await Promise.all([
        supabase.from("seasons").select("id,name").order("created_at", { ascending: false }),
        supabase.from("teams").select("id,name,category").order("name"),
      ]);
      const list = (ss as Season[]) ?? [];
      setSeasons(list);
      setClubTeams((ct as ClubTeam[]) ?? []);
      const stored = localStorage.getItem(ACTIVE_KEY);
      const valid = stored && list.some((s) => s.id === stored) ? stored : list[0]?.id ?? "";
      setSeasonId(valid);
      const storedTeam = localStorage.getItem(ACTIVE_TEAM_KEY) ?? "";
      setTeamId(storedTeam);
    })();
  }, []);

  useEffect(() => {
    if (teamId) localStorage.setItem(ACTIVE_TEAM_KEY, teamId);
    // Reset selected fixture when team scope changes
    setFixtureId("");
  }, [teamId]);

  useEffect(() => {
    if (!seasonId) {
      setFixtures([]);
      setSeasonTeams([]);
      setFixtureId("");
      return;
    }
    (async () => {
      const [{ data: f }, { data: t }] = await Promise.all([
        supabase.from("fixtures").select("*").eq("season_id", seasonId).order("matchday"),
        supabase.from("season_teams").select("id,name,is_own,own_team_id").eq("season_id", seasonId),
      ]);
      setFixtures((f as Fixture[]) ?? []);
      setSeasonTeams((t as SeasonTeam[]) ?? []);
    })();
  }, [seasonId]);

  useEffect(() => {
    (async () => {
      // Priority: explicit team scope > season's "own team" link > all players
      const effectiveTeam = (teamId && teamId !== "__unassigned__")
        ? teamId
        : (ownTeam?.own_team_id ?? null);
      const q = supabase
        .from("players")
        .select("id,first_name,last_name,sport_name,jersey_number,position,team_id")
        .order("jersey_number", { ascending: true, nullsFirst: false });
      const { data } = effectiveTeam ? await q.eq("team_id", effectiveTeam) : await q;
      setPlayers((data as Player[]) ?? []);
    })();
  }, [ownTeam?.own_team_id, teamId]);

  useEffect(() => {
    (async () => {
      if (!fixtureId) {
        setGoals([]);
        return;
      }
      const { data } = await supabase
        .from("goals")
        .select("*")
        .eq("fixture_id", fixtureId)
        .order("created_at", { ascending: true });
      setGoals(((data as unknown) as Goal[]) ?? []);
    })();
  }, [fixtureId]);

  const teamName = (id: string) => seasonTeams.find((t) => t.id === id)?.name ?? "—";

  const fixtureLabel = (f: Fixture) => {
    const home = teamName(f.home_team_id);
    const away = teamName(f.away_team_id);
    return `J${f.matchday} · ${home} vs ${away}${f.match_date ? ` · ${f.match_date}` : ""}`;
  };

  const startGoal = (side: GoalSide) => {
    if (!fixtureId) return toast.error("Selecciona una jornada");
    setWizard(emptyWizard(side, score.f, score.a));
  };

  const submitGoal = async (w: Wizard) => {
    const ordinal = w.side === "for" ? w.scoreFor : w.scoreAgainst;
    const payload = {
      fixture_id: fixtureId,
      match_id: fixtureId,
      side: w.side,
      score_for: w.scoreFor,
      score_against: w.scoreAgainst,
      category: w.category,
      subcategory: w.subcategory,
      pitch_x: w.pitch?.x ?? null,
      pitch_y: w.pitch?.y ?? null,
      goal_x: w.goal?.x ?? null,
      goal_y: w.goal?.y ?? null,
      players_on_court: w.players,
      scorer_id: w.scorerId,
      minute: w.minute,
      previous_action: w.previousAction || "",
      finishing_foot: w.finishingFoot || "",
      second_post: !!w.secondPost,
      ordinal,
    };
    const { error } = w.editingId
      ? await supabase.from("goals").update(payload).eq("id", w.editingId)
      : await supabase.from("goals").insert(payload);
    if (error) {
      toast.error(w.editingId ? "Error actualizando gol" : "Error guardando gol");
      return;
    }
    toast.success(
      w.editingId
        ? "Gol actualizado"
        : w.side === "for" ? "Gol a favor registrado" : "Gol en contra registrado",
    );
    setWizard(null);
    const { data } = await supabase.from("goals").select("*").eq("fixture_id", fixtureId).order("created_at");
    setGoals(((data as unknown) as Goal[]) ?? []);
  };

  const deleteGoal = async (id: string) => {
    const { error } = await supabase.from("goals").delete().eq("id", id);
    if (error) return toast.error("Error eliminando");
    setGoals((prev) => prev.filter((g) => g.id !== id));
  };

  return (
    <ModuleShell
      title="POST-PARTIDO"
      subtitle="Estadísticas de goles"
      actions={
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to="/partidos"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-aureon-red text-white text-xs font-display tracking-[0.2em]"
          >
            ← VOLVER
          </Link>
        </div>
      }
    >
      <div className="rounded-2xl border border-white/10 bg-background/40 backdrop-blur-md p-5 space-y-4">
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs uppercase tracking-[0.25em] text-white/70">Temporada</Label>
            <Select value={seasonId} onValueChange={setSeasonId}>
              <SelectTrigger className="mt-1 bg-background/60 border-white/15">
                <SelectValue placeholder="Selecciona temporada" />
              </SelectTrigger>
              <SelectContent>
                {seasons.length === 0 && (
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    Sin temporadas. Créala en Gestión de Temporada.
                  </div>
                )}
                {seasons.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-[0.25em] text-white/70">Equipo</Label>
            <Select value={teamId || "__all__"} onValueChange={(v) => setTeamId(v === "__all__" ? "" : v)}>
              <SelectTrigger className="mt-1 bg-background/60 border-white/15">
                <SelectValue placeholder="Selecciona equipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos los equipos</SelectItem>
                {clubTeams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}{t.category ? ` · ${t.category}` : ""}</SelectItem>
                ))}
                <SelectItem value="__unassigned__">Sin equipo asignado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-[0.25em] text-white/70">Jornada</Label>
            <Select value={fixtureId} onValueChange={setFixtureId} disabled={!seasonId}>
              <SelectTrigger className="mt-1 bg-background/60 border-white/15">
                <SelectValue placeholder="Selecciona jornada" />
              </SelectTrigger>
              <SelectContent>
                {visibleFixtures.length === 0 && (
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    {fixtures.length === 0
                      ? "Sin jornadas en esta temporada."
                      : "No hay jornadas para este equipo. Cámbialo o reasigna desde Gestión de Temporada."}
                  </div>
                )}
                {visibleFixtures.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{fixtureLabel(f)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Cabecera contextual: Temporada > Equipo > Jornada */}
        {(seasonId || teamId) && (
          <div className="text-[11px] uppercase tracking-[0.25em] text-white/70 font-display">
            {seasons.find(s => s.id === seasonId)?.name ?? "—"}
            <span className="mx-2 text-aureon-orange">›</span>
            {currentClubTeam?.name ?? (teamId === "__unassigned__" ? "Sin asignar" : "Todos los equipos")}
            {currentFixture && (
              <>
                <span className="mx-2 text-aureon-orange">›</span>
                Jornada {currentFixture.matchday}
              </>
            )}
          </div>
        )}

        {!seasonId && (
          <p className="text-xs text-muted-foreground">
            Crea o selecciona una temporada en{" "}
            <Link to="/temporadas" className="text-aureon-orange underline">Gestión de Temporada</Link>.
          </p>
        )}

        {currentFixture && (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm text-white/85 inline-flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>
                Jornada {currentFixture.matchday} ·{" "}
                <strong>{teamName(currentFixture.home_team_id)}</strong> vs{" "}
                <strong>{teamName(currentFixture.away_team_id)}</strong>
                {currentFixture.competition ? ` · ${currentFixture.competition}` : ""}
              </span>
            </div>
            <div className="font-display text-2xl tracking-[0.1em] text-white">
              <span className="text-aureon-blue">{score.f}</span>
              <span className="opacity-50 mx-2">—</span>
              <span className="text-aureon-red">{score.a}</span>
            </div>
          </div>
        )}
      </div>

      {fixtureId && (
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <GoalsColumn
            title="GOLES A FAVOR"
            tone="for"
            goals={goals.filter((g) => g.side === "for")}
            players={players}
            cumById={cumById}
            onAdd={() => startGoal("for")}
            onDelete={deleteGoal}
            onPreview={setPreview}
            onEdit={(g) => setWizard(wizardFromGoal(g))}
          />
          <GoalsColumn
            title="GOLES EN CONTRA"
            tone="against"
            goals={goals.filter((g) => g.side === "against")}
            players={players}
            cumById={cumById}
            onAdd={() => startGoal("against")}
            onDelete={deleteGoal}
            onPreview={setPreview}
            onEdit={(g) => setWizard(wizardFromGoal(g))}
          />
        </div>
      )}

      {wizard && (
        <GoalWizard
          wizard={wizard}
          setWizard={setWizard}
          players={players}
          onCancel={() => setWizard(null)}
          onSubmit={submitGoal}
        />
      )}

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="sm:max-w-2xl bg-neutral-900 text-white border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">
              {preview && (preview.side === "for" ? "Gol a favor" : "Gol en contra")}{" "}
              {preview && cumById[preview.id] && `· ${cumById[preview.id].f}-${cumById[preview.id].a}`}
            </DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-white/70 mb-1">Pista</div>
                <FutsalPitch
                  interactive={false}
                  marker={preview.pitch_x !== null && preview.pitch_y !== null ? { x: preview.pitch_x, y: preview.pitch_y } : null}
                />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-white/70 mb-1">Portería</div>
                <FutsalGoal
                  interactive={false}
                  marker={preview.goal_x !== null && preview.goal_y !== null ? { x: preview.goal_x, y: preview.goal_y } : null}
                />
              </div>
              <div className="sm:col-span-2 rounded-lg bg-white text-black p-3 space-y-1 text-sm">
                <div>
                  <strong>{getCategoryLabel(preview.side, preview.category)}</strong> ·{" "}
                  {getSubLabel(preview.side, preview.category, preview.subcategory)}
                </div>
                {preview.minute !== null && preview.minute !== undefined && (
                  <div>
                    Minuto: <strong>{preview.minute}'</strong>{" "}
                    <span className="text-black/60 text-xs">
                      ({preview.minute <= 20 ? "1ª parte" : "2ª parte"})
                    </span>
                  </div>
                )}
                {preview.scorer_id && (
                  <div>
                    Goleador: <strong>{players.find((p) => p.id === preview.scorer_id)?.sport_name ?? "—"}</strong>
                  </div>
                )}
                {preview.previous_action && (
                  <div>
                    Acción previa: <strong>{preview.previous_action}</strong>
                  </div>
                )}
                {preview.side === "for" && preview.finishing_foot && (
                  <div>
                    Pierna de finalización: <strong>{preview.finishing_foot}</strong>
                  </div>
                )}
                <div>
                  Finalización al 2º palo: <strong>{preview.second_post ? "Sí" : "No"}</strong>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </ModuleShell>
  );
}

function GoalsColumn({
  title,
  tone,
  goals,
  players,
  cumById,
  onAdd,
  onDelete,
  onPreview,
  onEdit,
}: {
  title: string;
  tone: GoalSide;
  goals: Goal[];
  players: Player[];
  cumById: Record<string, { f: number; a: number }>;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onPreview: (g: Goal) => void;
  onEdit: (g: Goal) => void;
}) {
  const accent = tone === "for" ? "text-aureon-blue" : "text-aureon-red";
  const ringTone = tone === "for" ? "ring-aureon-blue/30" : "ring-aureon-red/30";
  return (
    <div className={`rounded-2xl border border-white/10 bg-background/40 backdrop-blur-md p-5 ring-1 ${ringTone}`}>
      <div className="flex items-center justify-between">
        <h3 className={`font-display text-lg tracking-[0.2em] ${accent}`}>{title}</h3>
        <Button size="sm" onClick={onAdd} className="bg-aureon-orange text-black hover:bg-aureon-orange/90">
          + AÑADIR
        </Button>
      </div>
      <div className="mt-3 space-y-2">
        {goals.length === 0 && <p className="text-xs text-muted-foreground">Sin goles registrados.</p>}
        {goals.map((g) => {
          const scorer = g.scorer_id ? players.find((p) => p.id === g.scorer_id) : null;
          const cum = cumById[g.id] ?? { f: g.score_for, a: g.score_against };
          return (
            <div key={g.id} className="flex items-center gap-3 rounded-md border border-white/10 bg-white/5 p-2">
              <span className={`font-display text-base tabular-nums ${accent}`}>
                {cum.f}-{cum.a}
              </span>
              <span className="text-xs text-white/85 flex-1 truncate">
                {g.minute !== null && g.minute !== undefined && (
                  <span className="text-aureon-blue font-display mr-1">{g.minute}'</span>
                )}
                {getCategoryLabel(g.side, g.category)} · {getSubLabel(g.side, g.category, g.subcategory)}
                {scorer && <span className="text-aureon-orange"> · {scorer.sport_name || scorer.first_name}</span>}
                {g.previous_action && <span className="text-emerald-300"> · {g.previous_action}</span>}
                {g.side === "for" && g.finishing_foot && <span className="text-cyan-300"> · {g.finishing_foot}</span>}
                {g.second_post && <span className="text-aureon-orange"> · 2º palo</span>}
              </span>
              <button onClick={() => onPreview(g)} className="p-1.5 rounded-md bg-aureon-blue text-white hover:bg-aureon-blue/80" aria-label="Ver">
                <Eye className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => onEdit(g)} className="p-1.5 rounded-md bg-aureon-orange text-black hover:bg-aureon-orange/80" aria-label="Editar">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => onDelete(g.id)} className="p-1.5 rounded-md bg-aureon-red text-white hover:bg-aureon-red/80" aria-label="Eliminar">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GoalWizard({
  wizard,
  setWizard,
  players,
  onCancel,
  onSubmit,
}: {
  wizard: Wizard;
  setWizard: (w: Wizard) => void;
  players: Player[];
  onCancel: () => void;
  onSubmit: (w: Wizard) => void;
}) {
  const cats = getCategories(wizard.side);
  const sideLabel = wizard.side === "for" ? "GOL A FAVOR" : "GOL EN CONTRA";
  const subs = cats.find((c) => c.key === wizard.category)?.subs ?? [];
  const selectablePlayers = players.filter((p) => p.position?.toUpperCase() !== "ENTRENADOR");
  const onCourtPlayers = players.filter((p) => wizard.players.includes(p.id));

  const togglePlayer = (id: string) => {
    const has = wizard.players.includes(id);
    if (has) setWizard({ ...wizard, players: wizard.players.filter((p) => p !== id) });
    else if (wizard.players.length < 5) setWizard({ ...wizard, players: [...wizard.players, id] });
    else toast.error("Máximo 5 jugadores en pista");
  };

  const isEditing = !!wizard.editingId;
  const isDone = (k: WizardStep): boolean => {
    switch (k) {
      case "score": return true;
      case "category": return !!wizard.category;
      case "players": return wizard.players.length >= 5;
      case "scorer": return !!wizard.scorerId;
      case "foot": return !!wizard.finishingFoot;
      case "pitch": return !!wizard.pitch;
      case "goal": return !!wizard.goal;
      case "secondPost": return isEditing; // boolean, completed when navigated in edit mode
      case "minute": return wizard.minute !== null && wizard.minute !== undefined;
      case "prev": return !!wizard.previousAction;
      default: return false;
    }
  };
  const STEPS = ([
    { key: "score", label: "Marcador", show: true },
    { key: "category", label: "Tipo", show: true },
    { key: "players", label: "5 en pista", show: true },
    { key: "scorer", label: "Goleador", show: wizard.side === "for" },
    { key: "foot", label: "Pierna", show: wizard.side === "for" },
    { key: "pitch", label: "Pista", show: true },
    { key: "goal", label: "Portería", show: true },
    { key: "secondPost", label: "2º palo", show: true },
    { key: "minute", label: "Minuto", show: true },
    { key: "prev", label: "Acción previa", show: true },
  ] as { key: WizardStep; label: string; show: boolean }[]).filter(s => s.show);


  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto bg-neutral-900 text-white border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white">{sideLabel} · {wizard.scoreFor}-{wizard.scoreAgainst}{isEditing ? " · Editar" : ""}</DialogTitle>
        </DialogHeader>

        {/* Step navigator — siempre visible, con 3 estados (pendiente / activo / completado) */}
        <div className="flex flex-wrap gap-1.5 border-b border-white/10 pb-3">
          {STEPS.map((s) => {
            const active = wizard.step === s.key;
            const done = !active && isDone(s.key);
            const base = "text-[10px] uppercase tracking-wider font-display px-2.5 py-1 rounded-md border transition inline-flex items-center gap-1";
            const cls = active
              ? "bg-aureon-orange text-black border-aureon-orange shadow-md shadow-aureon-orange/30 ring-2 ring-aureon-orange/40"
              : done
                ? "bg-aureon-orange/20 text-white border-aureon-orange/50 hover:bg-aureon-orange/30"
                : "bg-white/10 text-white border-white/25 hover:bg-white/20";
            return (
              <button
                key={s.key}
                onClick={() => setWizard({ ...wizard, step: s.key })}
                className={`${base} ${cls}`}
              >
                {done && <span aria-hidden>✓</span>}
                {s.label}
              </button>
            );
          })}
        </div>


        {wizard.step === "score" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Confirma el marcador tras este gol.</p>
            <div className="grid grid-cols-2 gap-3 max-w-sm">
              <div>
                <Label>A favor</Label>
                <Input type="number" value={wizard.scoreFor} onChange={(e) => setWizard({ ...wizard, scoreFor: Number(e.target.value) })} />
              </div>
              <div>
                <Label>En contra</Label>
                <Input type="number" value={wizard.scoreAgainst} onChange={(e) => setWizard({ ...wizard, scoreAgainst: Number(e.target.value) })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
              <Button onClick={() => setWizard({ ...wizard, step: "category" })} className="bg-aureon-orange text-black hover:bg-aureon-orange/90">Siguiente</Button>
            </DialogFooter>
          </div>
        )}

        {wizard.step === "category" && (
          <div className="space-y-4">
            <div>
              <Label className="text-white">Tipo de gol</Label>
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {cats.map((c) => {
                  const selected = wizard.category === c.key;
                  return (
                    <button
                      key={c.key}
                      onClick={() => setWizard({ ...wizard, category: c.key, subcategory: "" })}
                      className={`py-3 px-2 rounded-md border text-sm font-display tracking-wide transition ${
                        selected
                          ? "bg-aureon-orange text-black border-aureon-orange"
                          : "bg-black text-white border-white/30 hover:bg-black/80"
                      }`}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>
            {wizard.category && (
              <div>
                <Label className="text-white">Subtipo</Label>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {subs.map((s) => {
                    const selected = wizard.subcategory === s.key;
                    return (
                      <button
                        key={s.key}
                        onClick={() => setWizard({ ...wizard, subcategory: s.key })}
                        className={`py-3 px-3 rounded-md border text-xs sm:text-sm text-left transition ${
                          selected
                            ? "bg-aureon-orange text-black border-aureon-orange"
                            : "bg-black text-white border-white/30 hover:bg-black/80"
                        }`}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setWizard({ ...wizard, step: "score" })}>Atrás</Button>
              <Button
                disabled={!wizard.category || !wizard.subcategory}
                onClick={() => setWizard({ ...wizard, step: "players" })}
                className="bg-aureon-orange text-black hover:bg-aureon-orange/90"
              >
                Siguiente
              </Button>
            </DialogFooter>
          </div>
        )}

        {wizard.step === "players" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Selecciona los <strong>5 jugadores</strong> que estaban en pista ({wizard.players.length}/5).
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[50vh] overflow-y-auto">
              {selectablePlayers.map((p) => {
                const selected = wizard.players.includes(p.id);
                const name = p.sport_name || `${p.first_name} ${p.last_name}`;
                return (
                  <button
                    key={p.id}
                    onClick={() => togglePlayer(p.id)}
                    className={`text-left rounded-md border p-2 text-xs transition ${
                      selected
                        ? "bg-aureon-orange text-black border-aureon-orange"
                        : "bg-black text-white border-white/30 hover:bg-black/80"
                    }`}
                  >
                    <div className="font-display tracking-wide">
                      {p.jersey_number !== null ? `#${p.jersey_number} ` : ""}{name}
                    </div>
                    <div className={`text-[10px] ${selected ? "text-black/70" : "text-white/70"}`}>{p.position}</div>
                  </button>
                );
              })}
              {players.length === 0 && (
                <p className="col-span-full text-xs text-muted-foreground">No hay jugadores. Añádelos en Gestión de Jugadores.</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setWizard({ ...wizard, step: "category" })}>Atrás</Button>
              <Button
                disabled={wizard.players.length !== 5}
                onClick={() => setWizard({ ...wizard, step: wizard.side === "for" ? "scorer" : "pitch" })}
                className="bg-aureon-orange text-black hover:bg-aureon-orange/90"
              >
                Siguiente
              </Button>
            </DialogFooter>
          </div>
        )}

        {wizard.step === "scorer" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">¿Quién marcó el gol? (entre los 5 en pista)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {onCourtPlayers.map((p) => {
                const selected = wizard.scorerId === p.id;
                const name = p.sport_name || `${p.first_name} ${p.last_name}`;
                return (
                  <button
                    key={p.id}
                    onClick={() => setWizard({ ...wizard, scorerId: p.id })}
                    className={`text-left rounded-md border p-3 text-sm transition ${
                      selected
                        ? "bg-aureon-orange text-black border-aureon-orange"
                        : "bg-black text-white border-white/30 hover:bg-black/80"
                    }`}
                  >
                    <div className="font-display tracking-wide">
                      {p.jersey_number !== null ? `#${p.jersey_number} ` : ""}{name}
                    </div>
                    <div className={`text-[10px] ${selected ? "text-black/70" : "text-white/70"}`}>{p.position}</div>
                  </button>
                );
              })}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setWizard({ ...wizard, step: "players" })}>Atrás</Button>
              <Button
                disabled={!wizard.scorerId}
                onClick={() => setWizard({ ...wizard, step: "foot" })}
                className="bg-aureon-orange text-black hover:bg-aureon-orange/90"
              >
                Siguiente
              </Button>
            </DialogFooter>
          </div>
        )}

        {wizard.step === "foot" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Selecciona la <strong>pierna / superficie</strong> de finalización.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {FINISHING_FOOT_OPTIONS.map((opt) => {
                const sel = wizard.finishingFoot === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => setWizard({ ...wizard, finishingFoot: opt })}
                    className={`py-3 px-2 rounded-md border text-xs font-display tracking-wide transition ${
                      sel
                        ? "bg-aureon-orange text-black border-aureon-orange"
                        : "bg-black text-white border-white/30 hover:bg-black/80"
                    }`}
                  >
                    {opt.toUpperCase()}
                  </button>
                );
              })}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setWizard({ ...wizard, step: "scorer" })}>Atrás</Button>
              <Button
                disabled={!wizard.finishingFoot}
                onClick={() => setWizard({ ...wizard, step: "pitch" })}
                className="bg-aureon-orange text-black hover:bg-aureon-orange/90"
              >
                Siguiente
              </Button>
            </DialogFooter>
          </div>
        )}

        {wizard.step === "pitch" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Haz clic en la zona de la pista <strong>desde la que se produjo el disparo</strong>.
            </p>
            <FutsalPitch
              marker={wizard.pitch}
              onPick={(x, y) => setWizard({ ...wizard, pitch: { x, y }, step: "goal" })}
            />
            <DialogFooter>
              <Button variant="ghost" onClick={() => setWizard({ ...wizard, step: wizard.side === "for" ? "foot" : "players" })}>
                Atrás
              </Button>
            </DialogFooter>
          </div>
        )}

        {wizard.step === "goal" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Haz clic en la zona de la portería <strong>por la que entró el balón</strong>.
            </p>
            <FutsalGoal
              marker={wizard.goal}
              onPick={(x, y) => setWizard({ ...wizard, goal: { x, y }, step: "secondPost" })}
            />
            <DialogFooter>
              <Button variant="ghost" onClick={() => setWizard({ ...wizard, step: "pitch" })}>Atrás</Button>
            </DialogFooter>
          </div>
        )}

        {wizard.step === "secondPost" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              ¿La finalización fue al <strong>segundo palo</strong>?
            </p>
            <div className="grid grid-cols-2 gap-2 max-w-sm">
              {[
                { v: true, l: "SÍ" },
                { v: false, l: "NO" },
              ].map((opt) => {
                const sel = wizard.secondPost === opt.v;
                return (
                  <button
                    key={opt.l}
                    onClick={() => setWizard({ ...wizard, secondPost: opt.v })}
                    className={`py-3 rounded-md border text-sm font-display tracking-wide transition ${
                      sel
                        ? "bg-aureon-orange text-black border-aureon-orange"
                        : "bg-black text-white border-white/30 hover:bg-black/80"
                    }`}
                  >
                    {opt.l}
                  </button>
                );
              })}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setWizard({ ...wizard, step: "goal" })}>Atrás</Button>
              <Button
                onClick={() => setWizard({ ...wizard, step: "minute" })}
                className="bg-aureon-orange text-black hover:bg-aureon-orange/90"
              >
                Siguiente
              </Button>
            </DialogFooter>
          </div>
        )}

        {wizard.step === "minute" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecciona el <strong>minuto</strong> del gol. Pulsa directamente sobre el número.
            </p>
            <div className="space-y-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-aureon-blue mb-1.5 font-display">1ª parte</div>
                <div className="grid grid-cols-10 gap-1">
                  {Array.from({ length: 20 }, (_, i) => i + 1).map((m) => {
                    const sel = wizard.minute === m;
                    return (
                      <button
                        key={m}
                        onClick={() => setWizard({ ...wizard, minute: m })}
                        className={`py-2 rounded text-xs font-display tabular-nums border transition ${
                          sel
                            ? "bg-aureon-orange text-black border-aureon-orange"
                            : "bg-black text-white border-white/30 hover:bg-black/80"
                        }`}
                      >
                        {m}'
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-aureon-orange mb-1.5 font-display">2ª parte</div>
                <div className="grid grid-cols-10 gap-1">
                  {Array.from({ length: 20 }, (_, i) => i + 21).map((m) => {
                    const sel = wizard.minute === m;
                    return (
                      <button
                        key={m}
                        onClick={() => setWizard({ ...wizard, minute: m })}
                        className={`py-2 rounded text-xs font-display tabular-nums border transition ${
                          sel
                            ? "bg-aureon-orange text-black border-aureon-orange"
                            : "bg-black text-white border-white/30 hover:bg-black/80"
                        }`}
                      >
                        {m}'
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setWizard({ ...wizard, step: "secondPost" })}>Atrás</Button>
              <Button
                disabled={wizard.minute === null}
                onClick={() => setWizard({ ...wizard, step: "prev" })}
                className="bg-aureon-orange text-black hover:bg-aureon-orange/90"
              >
                Siguiente
              </Button>
            </DialogFooter>
          </div>
        )}

        {wizard.step === "prev" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Indica la <strong>acción previa</strong> que originó el gol (opcional).
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                onClick={() => setWizard({ ...wizard, previousAction: "" })}
                className={`py-3 px-2 rounded-md border text-xs font-display tracking-wide transition ${
                  wizard.previousAction === ""
                    ? "bg-aureon-orange text-black border-aureon-orange"
                    : "bg-black text-white border-white/30 hover:bg-black/80"
                }`}
              >
                — Sin especificar —
              </button>
              {(wizard.side === "for" ? PREV_ACTIONS_FOR : PREV_ACTIONS_AGAINST).map((opt: string) => {
                const sel = wizard.previousAction === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => setWizard({ ...wizard, previousAction: opt })}
                    className={`py-3 px-2 rounded-md border text-xs font-display tracking-wide transition ${
                      sel
                        ? "bg-aureon-orange text-black border-aureon-orange"
                        : "bg-black text-white border-white/30 hover:bg-black/80"
                    }`}
                  >
                    {opt.toUpperCase()}
                  </button>
                );
              })}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setWizard({ ...wizard, step: "minute" })}>Atrás</Button>
              <Button
                onClick={() => onSubmit(wizard)}
                className="bg-aureon-orange text-black hover:bg-aureon-orange/90"
              >
                Guardar gol
              </Button>
            </DialogFooter>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
}
