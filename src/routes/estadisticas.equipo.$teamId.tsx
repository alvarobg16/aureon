import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ModuleShell } from "@/components/ModuleShell";
import { supabase } from "@/integrations/supabase/client";
import { positionStyle } from "@/lib/players";
import { BarChart3 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlayerStatsDialog } from "@/components/PlayerStatsDialog";
import {
  StatEvent, StatGoal, StatPlayer, StatMatch, StatPlayerTime,
  computeAdvancedPercentages, computeLineups, computePlayerRows,
  timelineGoals, buildInsights, isShotEvent, isShotOnTarget, isSave,
  isRecovery, isLoss, playerName, actionLabel,
} from "@/lib/statsEngine";
import { PitchHeatmap } from "@/components/stats/PitchHeatmap";
import { GoalHeatmap } from "@/components/stats/GoalHeatmap";
import { GoalTypeDonut } from "@/components/stats/GoalTypeDonut";
import { LineupsPanel } from "@/components/stats/LineupsPanel";
import { TimelineChart } from "@/components/stats/TimelineChart";
import { InsightsPanel } from "@/components/stats/InsightsPanel";
import { StatsFilters, FilterState } from "@/components/stats/StatsFilters";

export const Route = createFileRoute("/estadisticas/equipo/$teamId")({
  head: () => ({ meta: [{ title: "Estadísticas del equipo — Aureon Futsal Pro Suite" }] }),
  component: EquipoStats,
});

type Team = { id: string; name: string; category: string };

const ACTION_COLORS = ["#f97316", "#38bdf8", "#34d399", "#ef4444", "#a78bfa", "#facc15", "#22d3ee", "#fb7185", "#84cc16", "#e879f9"];

function EquipoStats() {
  const { teamId } = Route.useParams();
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<StatPlayer[]>([]);
  const [goalsFor, setGoalsFor] = useState<StatGoal[]>([]);
  const [goalsAgainst, setGoalsAgainst] = useState<StatGoal[]>([]);
  const [events, setEvents] = useState<StatEvent[]>([]);
  const [matches, setMatches] = useState<StatMatch[]>([]);
  const [seasonTeams, setSeasonTeams] = useState<Record<string, string>>({});
  const [seasons, setSeasons] = useState<Array<{ id: string; name: string }>>([]);
  const [pt, setPt] = useState<StatPlayerTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [openPlayerId, setOpenPlayerId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    seasonId: "__all__", matchId: "__all__", playerId: "__all__", actionType: "all",
    prevAction: "__all__", finishingFoot: "__all__", secondPost: "__all__",
  });


  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: t }, { data: p }, { data: ss }] = await Promise.all([
        supabase.from("teams").select("*").eq("id", teamId).maybeSingle(),
        supabase.from("players").select("id,first_name,last_name,sport_name,jersey_number,position")
          .eq("team_id", teamId).order("jersey_number", { ascending: true, nullsFirst: false }),
        supabase.from("seasons").select("id,name").order("created_at", { ascending: false }),
      ]);
      setTeam((t as Team) ?? null);
      const playersData = (p as StatPlayer[]) ?? [];
      setPlayers(playersData);
      setSeasons((ss as Array<{ id: string; name: string }>) ?? []);

      // live_matches.home_team_id/away_team_id apuntan a season_teams.id (no a teams.id).
      // Resolvemos todos los season_teams equivalentes: por own_team_id O por nombre coincidente.
      const teamName = (t as Team | null)?.name ?? "";
      // Use parameterised filters and chained queries to avoid PostgREST filter injection
      // via user-controlled team names.
      const [{ data: stByTeam }, { data: stByName }] = await Promise.all([
        supabase
          .from("season_teams")
          .select("id")
          .or(`own_team_id.eq.${teamId},id.eq.${teamId}`),
        teamName
          ? supabase.from("season_teams").select("id").ilike("name", teamName)
          : Promise.resolve({ data: [] as Array<{ id: string }> }),
      ]);
      const stRows = [
        ...((stByTeam ?? []) as Array<{ id: string }>),
        ...((stByName ?? []) as Array<{ id: string }>),
      ];
      const teamIdSet = new Set<string>([teamId, ...((stRows ?? []) as Array<{ id: string }>).map(r => r.id)]);
      const idsCsv = Array.from(teamIdSet).join(",");
      const { data: lm } = await supabase
        .from("live_matches")
        .select("id,season_id,created_at,home_team_id,away_team_id")
        .or(`home_team_id.in.(${idsCsv}),away_team_id.in.(${idsCsv})`)
        .order("created_at", { ascending: false });
      const lmRows = (lm as StatMatch[]) ?? [];
      setMatches(lmRows);
      const lmIds = lmRows.map(m => m.id);

      // Resolver nombres reales de los equipos referenciados por los partidos.
      const refIds = Array.from(new Set(
        lmRows.flatMap(m => [m.home_team_id, m.away_team_id]).filter((x): x is string => !!x)
      ));
      if (refIds.length > 0) {
        const { data: stNames } = await supabase
          .from("season_teams")
          .select("id,name")
          .in("id", refIds);
        const map: Record<string, string> = {};
        ((stNames ?? []) as Array<{ id: string; name: string }>).forEach(r => { map[r.id] = r.name; });
        setSeasonTeams(map);
      } else {
        setSeasonTeams({});
      }

      if (lmIds.length > 0) {
        const goalCols = "id,side,scorer_id,pitch_x,pitch_y,goal_x,goal_y,players_on_court,minute,effective_minute,period,category,subcategory,live_match_id,previous_action,finishing_foot,second_post";
        const evCols = "player_id,category,subcategory,live_match_id,kind,pitch_x,pitch_y,minute,effective_minute,period,on_court_ids";
        const [{ data: gf }, { data: ga }, { data: ev }, { data: ptd }] = await Promise.all([
          supabase.from("goals").select(goalCols).eq("side", "for").in("live_match_id", lmIds),
          supabase.from("goals").select(goalCols).eq("side", "against").in("live_match_id", lmIds),
          supabase.from("live_events").select(evCols).in("live_match_id", lmIds),
          supabase.from("live_player_time").select("live_match_id,player_id,total_seconds").in("live_match_id", lmIds),
        ]);
        setGoalsFor((gf as StatGoal[]) ?? []);
        setGoalsAgainst((ga as StatGoal[]) ?? []);
        setEvents((ev as StatEvent[]) ?? []);
        setPt((ptd as StatPlayerTime[]) ?? []);
      } else {
        setGoalsFor([]); setGoalsAgainst([]); setEvents([]); setPt([]);
      }
      setLoading(false);
    })();
  }, [teamId]);



  const matchOpts = useMemo(() => matches.map(m => {
    const date = new Date(m.created_at).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
    const home = seasonTeams[m.home_team_id ?? ""] || "Local";
    const away = seasonTeams[m.away_team_id ?? ""] || "Visitante";
    return { id: m.id, season_id: m.season_id, label: `${date} – ${home} vs ${away}` };
  }), [matches, seasonTeams]);

  const playerOpts = useMemo(() => players.map(p => ({ id: p.id, name: playerName(players, p.id) })), [players]);

  // Opciones dinámicas para filtros tácticos (sólo valores presentes en los datos).
  const prevActionOpts = useMemo(() => {
    const s = new Set<string>();
    [...goalsFor, ...goalsAgainst].forEach(g => { if (g.previous_action) s.add(g.previous_action); });
    return Array.from(s).sort();
  }, [goalsFor, goalsAgainst]);
  const finishingFootOpts = useMemo(() => {
    const s = new Set<string>();
    [...goalsFor, ...goalsAgainst].forEach(g => { if (g.finishing_foot) s.add(g.finishing_foot); });
    return Array.from(s).sort();
  }, [goalsFor, goalsAgainst]);

  // Mapa partido → temporada
  const matchSeason = useMemo(() => {
    const m: Record<string, string | null> = {};
    matches.forEach(x => { m[x.id] = x.season_id; });
    return m;
  }, [matches]);

  const passMatch = (mid: string | null) => {
    if (filters.matchId !== "__all__") return mid === filters.matchId;
    if (filters.seasonId !== "__all__") return !!mid && matchSeason[mid] === filters.seasonId;
    return true;
  };

  const passTactical = (g: StatGoal) => {
    if (filters.prevAction !== "__all__" && (g.previous_action || "") !== filters.prevAction) return false;
    if (filters.finishingFoot !== "__all__" && (g.finishing_foot || "") !== filters.finishingFoot) return false;
    if (filters.secondPost === "yes" && !g.second_post) return false;
    if (filters.secondPost === "no" && !!g.second_post) return false;
    return true;
  };

  // Filtrado
  const fEvents = useMemo(() => events.filter(e =>
    passMatch(e.live_match_id) &&
    (filters.playerId === "__all__" || e.player_id === filters.playerId) &&
    matchActionType(e, filters.actionType)
  ), [events, filters, matchSeason]);

  const fGoalsFor = useMemo(() => goalsFor.filter(g =>
    passMatch(g.live_match_id) &&
    (filters.playerId === "__all__" || g.scorer_id === filters.playerId) &&
    passTactical(g)
  ), [goalsFor, filters, matchSeason]);

  const fGoalsAgainst = useMemo(() => goalsAgainst.filter(g =>
    passMatch(g.live_match_id) && passTactical(g)
  ), [goalsAgainst, filters, matchSeason]);



  const fPt = useMemo(() => pt.filter(t =>
    passMatch(t.live_match_id) &&
    (filters.playerId === "__all__" || t.player_id === filters.playerId)
  ), [pt, filters, matchSeason]);

  // Cálculos
  const adv = useMemo(() => computeAdvancedPercentages(fEvents, fGoalsFor), [fEvents, fGoalsFor]);
  const playerRows = useMemo(() => computePlayerRows(players, fEvents, fGoalsFor, fPt), [players, fEvents, fGoalsFor, fPt]);
  const lineups = useMemo(() => computeLineups(fEvents, fGoalsFor, fGoalsAgainst), [fEvents, fGoalsFor, fGoalsAgainst]);
  const timeline = useMemo(() => timelineGoals(fGoalsFor, fGoalsAgainst), [fGoalsFor, fGoalsAgainst]);
  const insights = useMemo(() => buildInsights(fEvents, fGoalsFor, fGoalsAgainst, adv, lineups, timeline),
    [fEvents, fGoalsFor, fGoalsAgainst, adv, lineups, timeline]);

  // Resumen por categoría
  const categorySummary = useMemo(() => {
    const map = new Map<string, { kind: string; category: string; subcategory: string; count: number }>();
    const add = (kind: string, c: string, s: string) => {
      const k = `${kind}|${c}|${s}`;
      const cur = map.get(k);
      if (cur) cur.count++; else map.set(k, { kind, category: c, subcategory: s, count: 1 });
    };
    fEvents.forEach(e => add(e.kind, e.category || "—", e.subcategory || "—"));
    fGoalsFor.forEach(g => add("goal_for", g.category || "SIN CATEGORÍA", ""));
    fGoalsAgainst.forEach(g => add("goal_against", g.category || "SIN CATEGORÍA", ""));
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [fEvents, fGoalsFor, fGoalsAgainst]);

  // KPIs principales
  const kpis = useMemo(() => {
    const matchIds = new Set<string>();
    fEvents.forEach(e => matchIds.add(e.live_match_id));
    fGoalsFor.forEach(g => g.live_match_id && matchIds.add(g.live_match_id));
    fGoalsAgainst.forEach(g => g.live_match_id && matchIds.add(g.live_match_id));
    const fouls = fEvents.filter(e => e.kind === "foul").length;
    const yellows = fEvents.filter(e => e.kind === "card" && e.subcategory === "AMARILLA").length;
    const reds = fEvents.filter(e => e.kind === "card" && e.subcategory === "ROJA").length;
    return {
      matches: matchIds.size,
      gf: fGoalsFor.length,
      gc: fGoalsAgainst.length,
      diff: fGoalsFor.length - fGoalsAgainst.length,
      shots: fEvents.filter(isShotEvent).length,
      saves: fEvents.filter(isSave).length,
      recoveries: fEvents.filter(isRecovery).length,
      losses: fEvents.filter(isLoss).length,
      fouls, yellows, reds,
    };
  }, [fEvents, fGoalsFor, fGoalsAgainst]);

  // Coordenadas para heatmaps
  const allActionPoints = useMemo(() =>
    fEvents.map(e => ({ x: e.pitch_x, y: e.pitch_y })).filter(p => p.x != null && p.y != null), [fEvents]);
  const lossPoints = useMemo(() =>
    fEvents.filter(isLoss).map(e => ({ x: e.pitch_x, y: e.pitch_y })), [fEvents]);
  const recoveryPoints = useMemo(() =>
    fEvents.filter(isRecovery).map(e => ({ x: e.pitch_x, y: e.pitch_y })), [fEvents]);
  const goalForPitchPoints = useMemo(() =>
    fGoalsFor.map(g => ({ x: g.pitch_x, y: g.pitch_y })), [fGoalsFor]);

  // Una pista por cada ACCIÓN concreta registrada. Agrupamos por el nombre
  // real (subcategoría: "TIRO PORTERÍA", "RECUPERACIÓN"…) en vez de por la
  // categoría genérica "ACCION". Faltas, tarjetas y goles tienen su propio
  // bucket legible.
  const pitchesByAction = useMemo(() => {
    const map = new Map<string, Array<{ x: number | null; y: number | null }>>();
    const push = (key: string, pt: { x: number | null; y: number | null }) => {
      if (pt.x == null || pt.y == null) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(pt);
    };
    fEvents.forEach(e => push(actionLabel(e), { x: e.pitch_x, y: e.pitch_y }));
    fGoalsFor.forEach(g => push("GOL MARCADO", { x: g.pitch_x, y: g.pitch_y }));
    fGoalsAgainst.forEach(g => push("GOL RECIBIDO", { x: g.pitch_x, y: g.pitch_y }));
    return Array.from(map.entries())
      .map(([label, pts]) => ({ label, pts }))
      .sort((a, b) => b.pts.length - a.pts.length);
  }, [fEvents, fGoalsFor, fGoalsAgainst]);

  // Para heatmap portería: tiros con coordenada en portería
  const shotPortPoints = useMemo(() =>
    fGoalsFor.map(g => ({ x: g.goal_x, y: g.goal_y })), [fGoalsFor]);
  const goalsPortPoints = useMemo(() =>
    fGoalsFor.map(g => ({ x: g.goal_x, y: g.goal_y })), [fGoalsFor]);
  const savesPortPoints = useMemo(() =>
    fEvents.filter(isSave).map(e => ({ x: e.pitch_x, y: e.pitch_y })).filter(p => p.x != null), [fEvents]);

  // Portería rival (recibidos)
  const goalsAgainstPortPoints = useMemo(() =>
    fGoalsAgainst.map(g => ({ x: g.goal_x, y: g.goal_y })), [fGoalsAgainst]);

  return (
    <ModuleShell title={team ? `ESTADÍSTICAS · ${team.name.toUpperCase()}` : "ESTADÍSTICAS"} subtitle={team?.category}>
      {loading ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : (
        <div className="space-y-5">
          <StatsFilters state={filters} onChange={setFilters}
            seasons={seasons} matches={matchOpts} players={playerOpts}
            prevActions={prevActionOpts} finishingFeet={finishingFootOpts} />


          {/* KPIs */}
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-6">
            <Kpi label="PJ" value={kpis.matches} color="text-white" />
            <Kpi label="GF" value={kpis.gf} color="text-aureon-blue" />
            <Kpi label="GC" value={kpis.gc} color="text-aureon-red" />
            <Kpi label="+/-" value={(kpis.diff > 0 ? "+" : "") + kpis.diff}
              color={kpis.diff >= 0 ? "text-emerald-300" : "text-red-300"} />
            <Kpi label="Tiros" value={kpis.shots} color="text-orange-300" />
            <Kpi label="Paradas" value={kpis.saves} color="text-cyan-300" />
            <Kpi label="Recup." value={kpis.recoveries} color="text-emerald-300" />
            <Kpi label="Pérdidas" value={kpis.losses} color="text-red-300" />
            <Kpi label="Faltas" value={kpis.fouls} color="text-orange-200" />
            <Kpi label="Amar." value={kpis.yellows} color="text-yellow-300" />
            <Kpi label="Rojas" value={kpis.reds} color="text-red-400" />
            <Kpi label="% Tiro" value={`${adv.shotAccuracy.pct.toFixed(0)}%`} color="text-aureon-orange" />
          </div>

          <Tabs defaultValue="resumen" className="w-full">
            <TabsList className="bg-background/40 border border-white/10 flex flex-wrap h-auto">
              <TabsTrigger value="resumen">Resumen</TabsTrigger>
              <TabsTrigger value="jugadores">Jugadores</TabsTrigger>
              <TabsTrigger value="pista">Pista</TabsTrigger>
              <TabsTrigger value="porteria">Portería</TabsTrigger>
              <TabsTrigger value="quintetos">Quintetos</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
            </TabsList>

            <TabsContent value="resumen" className="space-y-5 mt-5">
              <AdvancedPctGrid adv={adv} />
              {categorySummary.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-background/40 backdrop-blur p-5">
                  <h3 className="font-display text-lg tracking-[0.25em] text-aureon-blue mb-4">RESUMEN POR CATEGORÍA</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-white/10 text-[10px] uppercase tracking-[0.2em] text-white font-display">
                        <tr>
                          <th className="text-left p-2">Tipo</th>
                          <th className="text-left p-2">Categoría</th>
                          <th className="text-left p-2">Subcategoría</th>
                          <th className="text-right p-2">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categorySummary.map((r, i) => (
                          <tr key={i} className="border-t border-white/5">
                            <td className="p-2 text-white/80 uppercase text-[10px] tracking-wider">{r.kind}</td>
                            <td className="p-2 text-white">{r.category}</td>
                            <td className="p-2 text-white/80">{r.subcategory}</td>
                            <td className="p-2 text-right font-display text-aureon-orange tabular-nums">{r.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="jugadores" className="mt-5">
              <div className="rounded-2xl border border-white/10 bg-background/40 backdrop-blur overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-white/10 text-[10px] uppercase tracking-[0.2em] text-white font-display">
                    <tr>
                      <th className="text-left p-2">#</th>
                      <th className="text-left p-2">Jugador</th>
                      <th className="text-left p-2">Pos.</th>
                      <th className="text-right p-2">Min</th>
                      <th className="text-right p-2">Goles</th>
                      <th className="text-right p-2">Asist</th>
                      <th className="text-right p-2">Tiros</th>
                      <th className="text-right p-2">A puerta</th>
                      <th className="text-right p-2">Paradas</th>
                      <th className="text-right p-2">Recup</th>
                      <th className="text-right p-2">Pérd</th>
                      <th className="text-right p-2">Faltas</th>
                      <th className="text-right p-2">TA</th>
                      <th className="text-right p-2">TR</th>
                      <th className="text-right p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {playerRows.length === 0 ? (
                      <tr><td colSpan={15} className="p-6 text-center text-white/70">Sin jugadores.</td></tr>
                    ) : playerRows.map(r => (
                      <tr key={r.player.id} className="border-t border-white/5">
                        <td className="p-2 font-display text-base text-white">{r.player.jersey_number ?? "—"}</td>
                        <td className="p-2 text-white">{r.player.sport_name || `${r.player.first_name} ${r.player.last_name}`}</td>
                        <td className="p-2"><span className={`text-[10px] uppercase tracking-[0.15em] px-2 py-0.5 rounded-full ${positionStyle(r.player.position)}`}>{r.player.position}</span></td>
                        <td className="p-2 text-right tabular-nums text-white/80">{r.minutes}'</td>
                        <td className="p-2 text-right font-display text-aureon-orange">{r.goals}</td>
                        <td className="p-2 text-right tabular-nums text-emerald-300">{r.assists}</td>
                        <td className="p-2 text-right tabular-nums text-white">{r.shots}</td>
                        <td className="p-2 text-right tabular-nums text-white">{r.shotsOnTarget}</td>
                        <td className="p-2 text-right tabular-nums text-cyan-300">{r.saves}</td>
                        <td className="p-2 text-right tabular-nums text-emerald-300">{r.recoveries}</td>
                        <td className="p-2 text-right tabular-nums text-red-300">{r.losses}</td>
                        <td className="p-2 text-right tabular-nums text-orange-300">{r.fouls}</td>
                        <td className="p-2 text-right tabular-nums text-yellow-300">{r.yellows}</td>
                        <td className="p-2 text-right tabular-nums text-red-400">{r.reds}</td>
                        <td className="p-2 text-right">
                          <button onClick={() => setOpenPlayerId(r.player.id)}
                            className="inline-flex items-center gap-1.5 text-xs font-display tracking-wider px-3 py-1.5 rounded-md bg-white text-black hover:bg-white/90">
                            <BarChart3 className="w-3.5 h-3.5" /> VER
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="pista" className="mt-5 space-y-5">
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                <PitchHeatmap title="Todas las acciones" points={allActionPoints} accent="#f97316" />
                {pitchesByAction.map(({ label, pts }, i) => (
                  <PitchHeatmap
                    key={label}
                    title={`${label} (${pts.length})`}
                    points={pts}
                    accent={ACTION_COLORS[i % ACTION_COLORS.length]}
                  />
                ))}
                {pitchesByAction.length === 0 && (
                  <>
                    <PitchHeatmap title="Pérdidas" points={[]} accent="#ef4444" />
                    <PitchHeatmap title="Recuperaciones" points={[]} accent="#22c55e" />
                  </>
                )}
              </div>
            </TabsContent>

            <TabsContent value="porteria" className="mt-5 space-y-5">
              <GoalkeeperPanel
                goalsFor={fGoalsFor}
                goalsAgainst={fGoalsAgainst}
                saves={savesPortPoints}
              />
            </TabsContent>

            <TabsContent value="quintetos" className="mt-5">
              <LineupsPanel lineups={lineups} players={players} />
            </TabsContent>

            <TabsContent value="timeline" className="mt-5">
              <TimelineChart data={timeline} />
            </TabsContent>

            <TabsContent value="insights" className="mt-5">
              <InsightsPanel insights={insights} />
            </TabsContent>
          </Tabs>
        </div>
      )}

      <PlayerStatsDialog
        playerId={openPlayerId}
        playerName={openPlayerId ? playerName(players, openPlayerId) : ""}
        open={!!openPlayerId}
        onOpenChange={(o) => !o && setOpenPlayerId(null)}
        seasons={seasons}
        matches={matchOpts}
      />
    </ModuleShell>
  );
}

function matchActionType(e: StatEvent, type: string): boolean {
  if (type === "all") return true;
  if (type === "goals") return false; // los goles vienen de tabla goals, no de live_events
  if (type === "shots") return isShotEvent(e);
  if (type === "saves") return isSave(e);
  if (type === "recoveries") return isRecovery(e);
  if (type === "losses") return isLoss(e);
  if (type === "fouls") return e.kind === "foul";
  if (type === "cards") return e.kind === "card";
  // Subtipos por etiqueta exacta (subcategoría normalizada).
  const lbl = actionLabel(e);
  if (type === "shot_on") return lbl === "TIRO PORTERÍA";
  if (type === "shot_out") return lbl === "TIRO FUERA";
  if (type === "shot_block") return lbl === "TIRO INTERCEPTADO";
  if (type === "shot_post") return lbl === "TIRO AL PALO";
  if (type === "penalty_miss") return lbl === "PENALTI FALLADO";
  if (type === "tenm_miss") return lbl === "10M FALLADO";
  if (type === "tenm_save") return lbl === "10M PARADO";
  return true;
}

function GoalkeeperPanel({
  goalsFor, goalsAgainst, saves,
}: {
  goalsFor: StatGoal[];
  goalsAgainst: StatGoal[];
  saves: Array<{ x: number | null; y: number | null }>;
}) {
  const [selFor, setSelFor] = useState<string | null>(null);
  const [selAg, setSelAg] = useState<string | null>(null);

  const filterByKey = (gs: StatGoal[], key: string | null) => {
    if (!key) return gs;
    const [cat, sub] = key.split("|");
    return gs.filter((g) => (g.category || "").trim() === (cat === "SIN CATEGORÍA" ? "" : cat) && (g.subcategory || "").trim() === sub);
  };

  const forShown = filterByKey(goalsFor, selFor);
  const agShown = filterByKey(goalsAgainst, selAg);

  const forPts = forShown.map((g) => ({ x: g.goal_x, y: g.goal_y }));
  const agPts = agShown.map((g) => ({ x: g.goal_x, y: g.goal_y }));

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="space-y-4">
        <GoalHeatmap title="Portería rival (goles marcados)" shots={forPts} goals={forPts} saves={[]} />
        <CombinedGoalCard
          title="Goles marcados"
          goals={goalsFor}
          shown={forShown}
          side="for"
          selectedKey={selFor}
          onSelect={setSelFor}
        />
      </div>
      <div className="space-y-4">
        <GoalHeatmap title="Portería propia (goles encajados)" shots={agPts} goals={agPts} saves={saves} />
        <CombinedGoalCard
          title="Goles encajados"
          goals={goalsAgainst}
          shown={agShown}
          side="against"
          selectedKey={selAg}
          onSelect={setSelAg}
        />
      </div>
    </div>
  );
}

// Bloque unificado por lado: tipología (donut + leyenda) en la parte superior
// y desglose táctico completo (acción previa, pierna/superficie, 2º palo)
// justo debajo. Si hay una tipología seleccionada en el donut, el desglose
// inferior se filtra automáticamente a esa selección para inspección detallada.
function CombinedGoalCard({
  title, goals, shown, side, selectedKey, onSelect,
}: {
  title: string;
  goals: StatGoal[];
  shown: StatGoal[];
  side: "for" | "against";
  selectedKey: string | null;
  onSelect: (k: string | null) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-background/40 backdrop-blur p-4 space-y-4">
      <h4 className="font-display text-sm tracking-[0.25em] text-aureon-orange">
        {title.toUpperCase()} · INFORMACIÓN COMPLETA
      </h4>
      <GoalTypeDonut
        title={`Tipología · ${title}`}
        goals={goals}
        side={side as any}
        selectedKey={selectedKey}
        onSelect={onSelect}
      />
      <div className="border-t border-white/10 pt-4">
        <TacticalBreakdown
          title={selectedKey ? "Desglose táctico (filtrado)" : "Desglose táctico"}
          goals={shown}
        />
      </div>
    </div>
  );
}

function TacticalBreakdown({ title, goals }: { title: string; goals: StatGoal[] }) {
  const total = goals.length;
  const count = (pred: (g: StatGoal) => boolean) => goals.filter(pred).length;
  const groupBy = (key: (g: StatGoal) => string | null | undefined) => {
    const m = new Map<string, number>();
    for (const g of goals) {
      const k = (key(g) || "").trim();
      if (!k) continue;
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  };
  const prev = groupBy(g => g.previous_action);
  const feet = groupBy(g => g.finishing_foot);
  const sp = count(g => !!g.second_post);

  const Row = ({ label, value }: { label: string; value: number }) => (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-white/85 break-words">{label}</span>
      <span className="text-white/60 tabular-nums text-xs shrink-0">
        <span className="text-white font-display text-base mr-1">{value}</span>
        {total > 0 ? `· ${Math.round((value / total) * 100)}%` : ""}
      </span>
    </div>
  );

  return (
    <div>
      <h5 className="font-display text-xs tracking-[0.25em] text-aureon-blue mb-3">{title.toUpperCase()}</h5>
      {total === 0 ? (
        <p className="text-xs text-white/60">Sin datos.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-white/60 mb-2 font-semibold">Acción previa</p>
            {prev.length === 0 ? <p className="text-xs text-white/50">—</p> :
              <div className="space-y-1.5">{prev.map(([k, v]) => <Row key={k} label={k} value={v} />)}</div>}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-white/60 mb-2 font-semibold">Pierna / superficie</p>
            {feet.length === 0 ? <p className="text-xs text-white/50">—</p> :
              <div className="space-y-1.5">{feet.map(([k, v]) => <Row key={k} label={k} value={v} />)}</div>}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-white/60 mb-2 font-semibold">Finalización al 2º palo</p>
            <Row label="Sí" value={sp} />
            <Row label="No" value={total - sp} />
          </div>
        </div>
      )}
    </div>
  );
}



function Kpi({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-background/40 p-3 text-center">
      <p className="text-[10px] uppercase tracking-wider text-white/60">{label}</p>
      <p className={`font-display text-2xl ${color} tabular-nums`}>{value}</p>
    </div>
  );
}

function AdvancedPctGrid({ adv }: { adv: ReturnType<typeof computeAdvancedPercentages> }) {
  const items = [
    { label: "% acierto en tiros", v: adv.shotAccuracy, color: "from-aureon-orange/40 to-aureon-orange/10" },
    { label: "% conversión de ocasiones", v: adv.conversion, color: "from-aureon-blue/40 to-aureon-blue/10" },
    { label: "% eficacia ofensiva", v: adv.offensiveEfficiency, color: "from-emerald-500/40 to-emerald-500/10" },
    { label: "% recuperación vs pérdida", v: adv.recoveryRatio, color: "from-cyan-500/40 to-cyan-500/10" },
  ];
  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      {items.map((i) => (
        <div key={i.label} className={`rounded-xl border border-white/10 bg-gradient-to-br ${i.color} p-4`}>
          <p className="text-[10px] uppercase tracking-wider text-white/80 font-semibold">{i.label}</p>
          <p className="font-display text-3xl text-white tabular-nums mt-1">{i.v.pct.toFixed(0)}%</p>
          <p className="text-[10px] text-white/70 mt-1">{i.v.value} / {i.v.total}</p>
          <div className="mt-2 h-1.5 rounded bg-black/40 overflow-hidden">
            <div className="h-full bg-white/80" style={{ width: `${Math.min(100, i.v.pct)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
