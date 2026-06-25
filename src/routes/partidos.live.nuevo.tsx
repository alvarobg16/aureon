import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ModuleShell } from "@/components/ModuleShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Check, Users2 } from "lucide-react";
import { toast } from "sonner";
import { isStaff } from "@/lib/players";

export const Route = createFileRoute("/partidos/live/nuevo")({
  head: () => ({
    meta: [
      { title: "Nuevo partido LIVE — Aureon Futsal Pro Suite" },
    ],
  }),
  component: NuevoLive,
});

type Season = { id: string; name: string };
type SeasonTeam = { id: string; name: string; is_own: boolean };
type Fixture = {
  id: string; season_id: string; matchday: string; match_date: string | null;
  competition: string; home_team_id: string; away_team_id: string; own_team_id: string | null;
};
type Player = { id: string; first_name: string; last_name: string; sport_name: string; jersey_number: number | null; position: string; team_id: string | null };
type TeamLite = { id: string; name: string; category: string };

function NuevoLive() {
  const nav = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonId, setSeasonId] = useState<string>("");
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [fixtureId, setFixtureId] = useState<string>("");
  const [teamsMap, setTeamsMap] = useState<Record<string, SeasonTeam>>({});
  const [players, setPlayers] = useState<Player[]>([]);
  const [clubTeams, setClubTeams] = useState<TeamLite[]>([]);
  const [ownTeamId, setOwnTeamId] = useState<string>(""); // club team chosen for this match
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [called, setCalled] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("seasons").select("id,name").order("created_at", { ascending: false });
      const list = (data as Season[]) ?? [];
      setSeasons(list);
      const stored = typeof window !== "undefined" ? localStorage.getItem("aureon.activeSeasonId") : null;
      if (stored && list.some((s) => s.id === stored)) setSeasonId(stored);
      else if (list[0]) setSeasonId(list[0].id);

      const storedTeam = typeof window !== "undefined" ? localStorage.getItem("aureon.liveTeamId") : null;
      if (storedTeam) setOwnTeamId(storedTeam);

      const [{ data: pl }, { data: tm }] = await Promise.all([
        supabase
          .from("players")
          .select("id,first_name,last_name,sport_name,jersey_number,position,team_id")
          .order("jersey_number", { nullsFirst: false } as any),
        supabase.from("teams").select("id,name,category").order("name"),
      ]);
      const onlyPlayers = ((pl as Player[]) ?? []).filter((p) => !isStaff(p.position));
      setPlayers(onlyPlayers);
      setClubTeams((tm as TeamLite[]) ?? []);
    })();
  }, []);

  useEffect(() => {
    if (!seasonId) return;
    (async () => {
      const [{ data: f }, { data: t }] = await Promise.all([
        supabase.from("fixtures").select("*").eq("season_id", seasonId).order("matchday"),
        supabase.from("season_teams").select("id,name,is_own").eq("season_id", seasonId),
      ]);
      setFixtures((f as Fixture[]) ?? []);
      const map: Record<string, SeasonTeam> = {};
      ((t as SeasonTeam[]) ?? []).forEach((x) => (map[x.id] = x));
      setTeamsMap(map);
      setFixtureId("");
    })();
  }, [seasonId]);

  useEffect(() => {
    if (ownTeamId && typeof window !== "undefined") {
      localStorage.setItem("aureon.liveTeamId", ownTeamId);
    }
    setFixtureId("");
    setTeamFilter(ownTeamId || "all");
  }, [ownTeamId]);

  const fixture = fixtures.find((f) => f.id === fixtureId) ?? null;
  const ownSeasonTeam = useMemo(() => Object.values(teamsMap).find((t) => t.is_own) ?? null, [teamsMap]);

  // Filter fixtures by chosen club team (own_team_id). Empty = show all (legacy/back-compat).
  const visibleFixtures = useMemo(() => {
    if (!ownTeamId) return fixtures;
    return fixtures.filter((f) => f.own_team_id === ownTeamId || !f.own_team_id);
  }, [fixtures, ownTeamId]);

  const togglePlayer = (id: string) =>
    setCalled((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const create = async () => {
    if (!fixture) return;
    if (called.length < 5) return toast.error("Selecciona al menos 5 convocados");
    setSaving(true);
    const own_side: "home" | "away" =
      ownSeasonTeam && fixture.home_team_id === ownSeasonTeam.id ? "home" : "away";
    const { data, error } = await supabase
      .from("live_matches")
      .insert({
        fixture_id: fixture.id,
        season_id: seasonId,
        home_team_id: fixture.home_team_id,
        away_team_id: fixture.away_team_id,
        own_team_id: ownTeamId || null,
        own_side,
        called_player_ids: called,
        on_court_ids: [],
        status: "live",
      })
      .select("id")
      .single();
    setSaving(false);
    if (error || !data) { console.error(error); return toast.error("No se pudo crear el partido"); }
    toast.success("Partido creado");
    nav({ to: "/partidos/live/$liveId", params: { liveId: (data as any).id } });
  };

  const goNext = () => {
    if (step === 1) {
      if (!seasonId || !ownTeamId || !fixtureId) return toast.error("Selecciona temporada, equipo y jornada");
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  return (
    <ModuleShell
      title="NUEVO PARTIDO"
      subtitle="Modo LIVE"
      actions={
        <Link to="/partidos/live" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/15 text-white text-xs font-display tracking-[0.2em]">
          <ArrowLeft className="w-3.5 h-3.5" /> VOLVER
        </Link>
      }
    >
      {/* Stepper */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map((n) => (
          <div key={n} className={`h-1.5 flex-1 rounded-full ${step >= n ? "bg-aureon-orange" : "bg-white/10"}`} />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-5 max-w-2xl">
          <div>
            <Label className="text-xs uppercase tracking-[0.25em] text-white/70">Temporada</Label>
            <Select value={seasonId} onValueChange={setSeasonId}>
              <SelectTrigger className="mt-1 bg-background/60 border-white/15 text-white"><SelectValue placeholder="Elige temporada" /></SelectTrigger>
              <SelectContent>
                {seasons.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-[0.25em] text-white/70">Equipo</Label>
            <Select value={ownTeamId} onValueChange={setOwnTeamId} disabled={!clubTeams.length}>
              <SelectTrigger className="mt-1 bg-background/60 border-white/15 text-white">
                <SelectValue placeholder={clubTeams.length ? "Elige equipo del club" : "Sin equipos en el club"} />
              </SelectTrigger>
              <SelectContent>
                {clubTeams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}{t.category ? ` · ${t.category}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-[0.25em] text-white/70">Jornada</Label>
            <Select value={fixtureId} onValueChange={setFixtureId} disabled={!visibleFixtures.length}>
              <SelectTrigger className="mt-1 bg-background/60 border-white/15 text-white">
                <SelectValue placeholder={visibleFixtures.length ? "Elige jornada" : "Sin jornadas para este equipo"} />
              </SelectTrigger>
              <SelectContent>
                {visibleFixtures.map((f) => {
                  const home = teamsMap[f.home_team_id]?.name ?? "?";
                  const away = teamsMap[f.away_team_id]?.name ?? "?";
                  const date = f.match_date ? new Date(f.match_date).toLocaleDateString() : "";
                  return (
                    <SelectItem key={f.id} value={f.id}>
                      J{f.matchday} · {home} vs {away}{date ? ` · ${date}` : ""}{f.competition ? ` · ${f.competition}` : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end">
            <Button onClick={goNext} className="bg-aureon-orange text-black hover:bg-aureon-orange/90">
              Siguiente <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {step === 2 && fixture && (
        <div className="space-y-5 max-w-2xl">
          <div className="rounded-2xl border border-white/10 bg-background/40 p-6 text-center">
            <p className="text-xs uppercase tracking-[0.25em] text-white/60">Confirma el partido</p>
            <div className="mt-3 font-display text-2xl text-white">
              {teamsMap[fixture.home_team_id]?.name} <span className="text-aureon-orange">vs</span> {teamsMap[fixture.away_team_id]?.name}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Jornada {fixture.matchday}{fixture.competition ? ` · ${fixture.competition}` : ""}
              {fixture.match_date ? ` · ${new Date(fixture.match_date).toLocaleDateString()}` : ""}
            </div>
            {ownSeasonTeam && (
              <p className="mt-3 text-[11px] text-aureon-orange uppercase tracking-[0.2em]">
                Mi equipo: {ownSeasonTeam.name} ({fixture.home_team_id === ownSeasonTeam.id ? "local" : "visitante"})
              </p>
            )}
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Atrás
            </Button>
            <Button onClick={goNext} className="bg-aureon-orange text-black hover:bg-aureon-orange/90">
              <Check className="w-4 h-4 mr-1" /> CONFIRMAR
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-display text-lg tracking-[0.2em] text-white inline-flex items-center gap-2">
              <Users2 className="w-4 h-4" /> CONVOCADOS
            </h2>
            <span className="text-xs text-muted-foreground">{called.length} seleccionados</span>
          </div>

          {/* Category / team filter — permite elegir jugadores de otras categorías */}
          {clubTeams.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-[0.25em] text-white/60 mr-1">Categoría</span>
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

          {players.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay jugadores. Crea jugadores en GESTIÓN DE JUGADORES.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {players
                .filter((p) => {
                  if (teamFilter === "all") return true;
                  if (teamFilter === "none") return !p.team_id;
                  return p.team_id === teamFilter;
                })
                .map((p) => {
                  const on = called.includes(p.id);
                  const goalie = p.position === "Portero";
                  const teamName = clubTeams.find((t) => t.id === p.team_id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => togglePlayer(p.id)}
                      className={`text-left rounded-lg border p-3 transition ${on ? "border-aureon-orange bg-aureon-orange/15 ring-1 ring-aureon-orange" : "border-white/10 bg-background/50 hover:bg-background/70"}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${goalie ? "bg-aureon-blue text-white" : "bg-yellow-400 text-black"}`}>
                          {p.jersey_number ?? "·"}
                        </span>
                        <div className="min-w-0">
                          <div className="text-sm text-white truncate">{p.sport_name || `${p.first_name} ${p.last_name}`}</div>
                          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground truncate">
                            {p.position}{teamName ? ` · ${teamName.category || teamName.name}` : ""}
                          </div>
                        </div>
                        {on && <Check className="w-4 h-4 ml-auto text-aureon-orange" />}
                      </div>
                    </button>
                  );
                })}
            </div>
          )}
          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setStep(2)}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Atrás
            </Button>
            <Button onClick={create} disabled={saving} className="bg-aureon-orange text-black hover:bg-aureon-orange/90">
              <Check className="w-4 h-4 mr-1" /> CONFIRMAR Y EMPEZAR
            </Button>
          </div>
        </div>
      )}
    </ModuleShell>
  );
}
