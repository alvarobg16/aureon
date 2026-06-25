import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PitchHeatmap } from "@/components/stats/PitchHeatmap";

type Props = {
  playerId: string | null;
  playerName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seasons: Array<{ id: string; name: string }>;
  matches: Array<{ id: string; label: string; season_id: string | null }>;
};

type EventRow = {
  category: string;
  subcategory: string;
  live_match_id: string;
  kind: string;
  pitch_x: number | null;
  pitch_y: number | null;
};
type GoalRow = {
  category: string;
  subcategory: string;
  live_match_id: string | null;
  side: string;
  pitch_x: number | null;
  pitch_y: number | null;
};

export function PlayerStatsDialog({ playerId, playerName, open, onOpenChange, seasons, matches }: Props) {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [seasonId, setSeasonId] = useState<string>("__all__");
  const [matchId, setMatchId] = useState<string>("__all__");
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!playerId || !open) return;
    setLoading(true);
    (async () => {
      const [{ data: ev }, { data: g }] = await Promise.all([
        supabase.from("live_events").select("category,subcategory,live_match_id,kind,pitch_x,pitch_y").eq("player_id", playerId),
        supabase.from("goals").select("category,subcategory,live_match_id,side,pitch_x,pitch_y").eq("scorer_id", playerId),
      ]);
      setEvents((ev as EventRow[]) ?? []);
      setGoals((g as GoalRow[]) ?? []);
      setLoading(false);
    })();
  }, [playerId, open]);

  useEffect(() => { if (open) { setSeasonId("__all__"); setMatchId("__all__"); setSelectedLabel(null); } }, [open]);

  const matchSeasonMap = useMemo(() => {
    const m: Record<string, string | null> = {};
    matches.forEach(x => { m[x.id] = x.season_id; });
    return m;
  }, [matches]);

  const matchOptions = useMemo(() => {
    if (seasonId === "__all__") return matches;
    return matches.filter(m => m.season_id === seasonId);
  }, [matches, seasonId]);

  const passes = (mid: string | null) => {
    if (matchId !== "__all__") return mid === matchId;
    if (seasonId !== "__all__") return !!mid && matchSeasonMap[mid] === seasonId;
    return true;
  };

  const filteredEvents = useMemo(() => events.filter(e => passes(e.live_match_id)), [events, seasonId, matchId, matchSeasonMap]);
  const filteredGoals = useMemo(() => goals.filter(g => passes(g.live_match_id)), [goals, seasonId, matchId, matchSeasonMap]);

  const labelOfEvent = (e: EventRow) => {
    if (e.kind === "foul") return `FALTA ${e.category || ""}`.trim().toUpperCase();
    if (e.kind === "card") return `TARJETA ${e.subcategory || ""}`.trim().toUpperCase();
    const sub = (e.subcategory || "").trim();
    return (sub || e.category || "OTRO").toUpperCase();
  };

  const allKnownLabels = useMemo(() => {
    const s = new Set<string>();
    events.forEach((e) => s.add(labelOfEvent(e)));
    if (goals.length > 0) s.add("GOLES");
    return s;
  }, [events, goals]);

  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    for (const e of filteredEvents) t[labelOfEvent(e)] = (t[labelOfEvent(e)] ?? 0) + 1;
    t["GOLES"] = (t["GOLES"] ?? 0) + filteredGoals.length;

    const seasonOnly = seasonId !== "__all__" && matchId === "__all__";
    if (seasonOnly) {
      allKnownLabels.forEach((k) => { if (!(k in t)) t[k] = 0; });
    } else {
      Object.keys(t).forEach((k) => { if (!t[k]) delete t[k]; });
    }
    return Object.entries(t).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [filteredEvents, filteredGoals, seasonId, matchId, allKnownLabels]);

  // Coords for selected label
  const selectedPoints = useMemo(() => {
    if (!selectedLabel) return [];
    if (selectedLabel === "GOLES") {
      return filteredGoals
        .filter(g => g.pitch_x != null && g.pitch_y != null)
        .map(g => ({ x: g.pitch_x, y: g.pitch_y }));
    }
    return filteredEvents
      .filter(e => labelOfEvent(e) === selectedLabel && e.pitch_x != null && e.pitch_y != null)
      .map(e => ({ x: e.pitch_x, y: e.pitch_y }));
  }, [selectedLabel, filteredEvents, filteredGoals]);

  // Reset selection when filters change if not present
  useEffect(() => {
    if (selectedLabel && !totals.find(([k]) => k === selectedLabel)) {
      setSelectedLabel(null);
    }
  }, [totals, selectedLabel]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-neutral-900 text-white border-white/10">
        <DialogHeader>
          <DialogTitle className="font-display tracking-wider text-white">{playerName}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/70 mb-1 font-semibold">Temporada</p>
            <Select value={seasonId} onValueChange={(v) => { setSeasonId(v); setMatchId("__all__"); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas</SelectItem>
                {seasons.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/70 mb-1 font-semibold">Partido</p>
            <Select value={matchId} onValueChange={setMatchId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                {matchOptions.map(m => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-white/70">Cargando…</p>
        ) : totals.length === 0 ? (
          <p className="text-sm text-white/70">Sin acciones registradas para este filtro.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="grid grid-cols-1 gap-2 max-h-[60vh] overflow-y-auto pr-1">
              {totals.map(([k, v]) => {
                const isSelected = selectedLabel === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setSelectedLabel(isSelected ? null : k)}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 transition text-left ${
                      isSelected
                        ? "bg-aureon-orange/20 border-aureon-orange"
                        : "bg-white/5 border-white/10 hover:bg-white/10"
                    }`}
                  >
                    <span className="text-sm font-medium text-white">{k}</span>
                    <span className="font-display text-2xl text-aureon-orange tabular-nums">{v}</span>
                  </button>
                );
              })}
            </div>
            <div>
              {selectedLabel ? (
                <PitchHeatmap
                  title={`${selectedLabel} · ${selectedPoints.length} ubicaciones`}
                  points={selectedPoints}
                />
              ) : (
                <div className="rounded-2xl border border-white/10 bg-background/40 backdrop-blur p-6 flex items-center justify-center text-center text-white/60 text-sm h-full min-h-[260px]">
                  Selecciona una acción para ver su distribución en la pista.
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
