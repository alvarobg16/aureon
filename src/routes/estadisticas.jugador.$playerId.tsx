import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ModuleShell } from "@/components/ModuleShell";
import { supabase } from "@/integrations/supabase/client";
import { positionStyle } from "@/lib/players";
import { User } from "lucide-react";
import { FutsalPitch } from "@/components/FutsalPitch";
import { FutsalGoal } from "@/components/FutsalGoal";

export const Route = createFileRoute("/estadisticas/jugador/$playerId")({
  head: () => ({
    meta: [{ title: "Estadísticas del jugador — Aureon Futsal Pro Suite" }],
  }),
  component: JugadorStats,
});

type Player = {
  id: string;
  first_name: string;
  last_name: string;
  sport_name: string;
  jersey_number: number | null;
  position: string;
  photo_url: string | null;
  team_id: string | null;
};

type GoalRow = {
  id: string;
  side: string;
  pitch_x: number | null;
  pitch_y: number | null;
  goal_x: number | null;
  goal_y: number | null;
  scorer_id: string | null;
  players_on_court: string[];
  category: string;
};

function JugadorStats() {
  const { playerId } = Route.useParams();
  const [player, setPlayer] = useState<Player | null>(null);
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [actions, setActions] = useState<Array<{ category: string; subcategory: string }>>([]);
  const [attendance, setAttendance] = useState<{ present: number; absent: number }>({ present: 0, absent: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: p }, { data: g }, { data: ev }, { data: at }] = await Promise.all([
        supabase.from("players").select("*").eq("id", playerId).maybeSingle(),
        supabase
          .from("goals")
          .select("id,side,pitch_x,pitch_y,goal_x,goal_y,scorer_id,players_on_court,category")
          .eq("scorer_id", playerId),
        supabase
          .from("live_events")
          .select("category,subcategory")
          .eq("player_id", playerId),
        supabase
          .from("training_attendance")
          .select("present")
          .eq("player_id", playerId),
      ]);
      setPlayer((p as Player) ?? null);
      setGoals(((g as unknown) as GoalRow[]) ?? []);
      setActions(((ev as unknown) as Array<{ category: string; subcategory: string }>) ?? []);
      const att = (at as Array<{ present: boolean }>) ?? [];
      setAttendance({
        present: att.filter(a => a.present).length,
        absent: att.filter(a => !a.present).length,
      });
      setLoading(false);
    })();
  }, [playerId]);

  const stats = useMemo(() => {
    const total = goals.length;
    const byCat: Record<string, number> = {};
    for (const g of goals) byCat[g.category] = (byCat[g.category] ?? 0) + 1;
    return { total, byCat };
  }, [goals]);

  const actionStats = useMemo(() => {
    const byCat: Record<string, number> = {};
    for (const a of actions) {
      const k = a.category || "Sin categoría";
      byCat[k] = (byCat[k] ?? 0) + 1;
    }
    return Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  }, [actions]);

  const totalAttendance = attendance.present + attendance.absent;
  const attendancePct = totalAttendance > 0 ? Math.round((attendance.present / totalAttendance) * 100) : 0;

  // Zonas: pista 3x2, portería 3x2 + puntos exactos
  const pitchPoints = useMemo(
    () => goals
      .filter((g) => g.pitch_x !== null && g.pitch_y !== null)
      .map((g) => ({ x: g.pitch_x as number, y: g.pitch_y as number })),
    [goals],
  );
  const goalPoints = useMemo(
    () => goals
      .filter((g) => g.goal_x !== null && g.goal_y !== null)
      .map((g) => ({ x: g.goal_x as number, y: g.goal_y as number })),
    [goals],
  );
  const pitchZones = useMemo(() => zoneCounts(goals.map((g) => ({ x: g.pitch_x, y: g.pitch_y })), 3, 2), [goals]);
  const goalZones = useMemo(() => zoneCounts(goals.map((g) => ({ x: g.goal_x, y: g.goal_y })), 3, 2), [goals]);

  if (loading) return <ModuleShell title="ESTADÍSTICAS"><p className="text-muted-foreground">Cargando…</p></ModuleShell>;
  if (!player) return <ModuleShell title="ESTADÍSTICAS"><p className="text-muted-foreground">Jugador no encontrado.</p></ModuleShell>;

  return (
    <ModuleShell title="ESTADÍSTICAS INDIVIDUALES" subtitle={player.sport_name || `${player.first_name} ${player.last_name}`}>
      <div className="grid gap-6 md:grid-cols-[260px_1fr]">
        <div className="rounded-2xl border border-white/10 bg-background/40 backdrop-blur overflow-hidden">
          <div className="aspect-square bg-gradient-to-br from-aureon-blue/40 to-aureon-orange/20 relative">
            {player.photo_url ? (
              <img src={player.photo_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-white/60"><User className="w-20 h-20" /></div>
            )}
          </div>
          <div className="p-4 space-y-2">
            <h3 className="font-display text-2xl tracking-wide">{player.sport_name || `${player.first_name} ${player.last_name}`}</h3>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-display text-lg">#{player.jersey_number ?? "—"}</span>
              <span className={`text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 rounded-full ${positionStyle(player.position)}`}>{player.position}</span>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Stat label="Goles totales" value={stats.total.toString()} accent="text-aureon-orange" />
          <Stat label="Categorías distintas" value={Object.keys(stats.byCat).length.toString()} />

          {Object.keys(stats.byCat).length > 0 && (
            <div className="sm:col-span-2 rounded-2xl border border-white/10 bg-background/40 backdrop-blur p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-white font-display mb-3">Goles por categoría</p>
              <div className="space-y-2">
                {Object.entries(stats.byCat).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-3 text-sm">
                    <span className="w-40 truncate text-white">{k}</span>
                    <div className="flex-1 h-2 rounded bg-white/10 overflow-hidden">
                      <div className="h-full bg-aureon-orange" style={{ width: `${(v / stats.total) * 100}%` }} />
                    </div>
                    <span className="w-10 text-right tabular-nums text-white">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="sm:col-span-2 grid gap-4 lg:grid-cols-2">
            <ZoneCard title="% por zona de pista · puntos exactos" zones={pitchZones} total={stats.total}>
              <FutsalPitch interactive={false} marker={null} markers={pitchPoints} showArrow={false} />
            </ZoneCard>
            <ZoneCard title="% por zona de portería · puntos exactos" zones={goalZones} total={stats.total}>
              <FutsalGoal interactive={false} marker={null} markers={goalPoints} />
            </ZoneCard>
          </div>

          {actionStats.length > 0 && (
            <div className="sm:col-span-2 rounded-2xl border border-white/10 bg-background/40 backdrop-blur p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-white font-display mb-3">Acciones registradas en partidos</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {actionStats.map(([k, v]) => (
                  <div key={k} className="flex items-center gap-3 text-sm bg-white/5 rounded px-3 py-2">
                    <span className="flex-1 truncate text-white">{k}</span>
                    <span className="font-display text-lg text-aureon-blue tabular-nums">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="sm:col-span-2 rounded-2xl border border-white/10 bg-background/40 backdrop-blur p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-white font-display mb-3">Asistencia a entrenamientos</p>
            {totalAttendance === 0 ? (
              <p className="text-sm text-white/70">Sin sesiones registradas.</p>
            ) : (
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-emerald-600/20 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-white/80">Presente</p>
                  <p className="font-display text-2xl text-emerald-300">{attendance.present}</p>
                </div>
                <div className="rounded-lg bg-destructive/20 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-white/80">Ausente</p>
                  <p className="font-display text-2xl text-red-300">{attendance.absent}</p>
                </div>
                <div className="rounded-lg bg-white/10 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-white/80">% Asist.</p>
                  <p className="font-display text-2xl text-white">{attendancePct}%</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ModuleShell>
  );
}

function Stat({ label, value, accent = "" }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-background/40 backdrop-blur p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-white font-display">{label}</p>
      <p className={`mt-2 font-display text-4xl ${accent || "text-white"}`}>{value}</p>
    </div>
  );
}

export function ZoneCard({
  title,
  zones,
  total,
  children,
}: {
  title: string;
  zones: number[][]; // rows x cols
  total: number;
  children: React.ReactNode;
}) {
  const rows = zones.length;
  const cols = zones[0]?.length ?? 0;
  return (
    <div className="rounded-2xl border border-white/10 bg-background/40 backdrop-blur p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-white font-display mb-3">{title}</p>
      <div className="relative">
        {children}
        <div className="absolute inset-0 grid pointer-events-none" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}>
          {zones.flatMap((row, ri) => row.map((v, ci) => {
            const pct = total > 0 ? (v / total) * 100 : 0;
            return (
              <div key={`${ri}-${ci}`} className="border border-white/10 flex items-center justify-center">
                <span className="text-[11px] sm:text-xs font-display font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] bg-black/55 rounded px-1.5 py-0.5">
                  {pct.toFixed(0)}%
                </span>
              </div>
            );
          }))}
        </div>
      </div>
    </div>
  );
}

export function zoneCounts(points: Array<{ x: number | null; y: number | null }>, cols: number, rows: number): number[][] {
  const grid: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (const p of points) {
    if (p.x === null || p.y === null) continue;
    const c = Math.min(cols - 1, Math.max(0, Math.floor(p.x * cols)));
    const r = Math.min(rows - 1, Math.max(0, Math.floor(p.y * rows)));
    grid[r][c]++;
  }
  return grid;
}
