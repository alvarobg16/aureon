import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, X, ChevronUp, ChevronDown, Search, FileText } from "lucide-react";
import { BLOCK_LABELS, BLOCK_ORDER, type TrainingBlock } from "@/lib/training";
import { categoryStyle, formatTaskNumber } from "@/lib/tasks";

type Team = { id: string; name: string; category: string };
type Player = {
  id: string; first_name: string; last_name: string; sport_name: string;
  jersey_number: number | null; team_id: string | null;
};
type TaskRow = {
  id: string; task_number: number; keywords: string; description: string;
  category: string; secondary_category: string | null; image_url: string | null;
};

export type BlockItem =
  | { kind: "task"; task_id: string }
  | { kind: "text"; content: string };

export type TrainingFormInitial = {
  id?: string;
  team_id?: string;
  session_date?: string | null;
  session_time?: string;
  venue?: string;
  competitive_period?: string;
  microcycle?: string;
  session_number?: string;
  rival?: string;
  objectives?: string;
  other_notes?: string;
  /** Combined ordered items per block (tasks + text) */
  items?: Array<{ block: TrainingBlock; order_index: number } & BlockItem>;
  attendance?: Array<{ player_id: string; present: boolean }>;
};

export function TrainingSessionForm({
  initial, mode, returnTo,
}: {
  initial?: TrainingFormInitial;
  mode: "create" | "edit";
  returnTo?: "planning";
}) {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [tasksDb, setTasksDb] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [teamId, setTeamId] = useState(initial?.team_id ?? "");
  const [date, setDate] = useState(initial?.session_date ?? "");
  const [time, setTime] = useState(initial?.session_time ?? "");
  const [venue, setVenue] = useState(initial?.venue ?? "");
  const [period, setPeriod] = useState(initial?.competitive_period ?? "");
  const [microcycle, setMicrocycle] = useState(initial?.microcycle ?? "");
  const [sessionNumber, setSessionNumber] = useState(initial?.session_number ?? "");
  const [rival, setRival] = useState(initial?.rival ?? "");
  const [objectives, setObjectives] = useState(initial?.objectives ?? "");
  const [otherNotes, setOtherNotes] = useState(initial?.other_notes ?? "");

  // Items por bloque (mezcla de tareas y texto, en orden libre)
  const [blockItems, setBlockItems] = useState<Record<TrainingBlock, BlockItem[]>>(() => {
    const init: Record<TrainingBlock, BlockItem[]> = { warmup: [], main: [], cooldown: [] };
    (initial?.items ?? [])
      .slice()
      .sort((a, b) => a.order_index - b.order_index)
      .forEach((it) => {
        const list = init[it.block];
        if (!list) return;
        if (it.kind === "task") list.push({ kind: "task", task_id: it.task_id });
        else list.push({ kind: "text", content: it.content });
      });
    return init;
  });

  // Asistencia
  const [attendance, setAttendance] = useState<Record<string, boolean>>(() => {
    const m: Record<string, boolean> = {};
    (initial?.attendance ?? []).forEach(a => { m[a.player_id] = a.present; });
    return m;
  });
  const [includedPlayers, setIncludedPlayers] = useState<Set<string>>(
    () => new Set((initial?.attendance ?? []).map(a => a.player_id)),
  );

  useEffect(() => {
    (async () => {
      const [{ data: t }, { data: p }, { data: ts }] = await Promise.all([
        supabase.from("teams").select("id,name,category").order("name"),
        supabase.from("players").select("id,first_name,last_name,sport_name,jersey_number,team_id"),
        supabase.from("tasks").select("id,task_number,keywords,description,category,secondary_category,image_url").order("task_number"),
      ]);
      setTeams((t as Team[]) ?? []);
      setPlayers((p as Player[]) ?? []);
      setTasksDb((ts as TaskRow[]) ?? []);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (mode !== "create" || !teamId) return;
    const teamPlayers = players.filter(p => p.team_id === teamId);
    if (teamPlayers.length === 0) return;
    setIncludedPlayers(prev => {
      const next = new Set(prev);
      teamPlayers.forEach(p => next.add(p.id));
      return next;
    });
    setAttendance(prev => {
      const next = { ...prev };
      teamPlayers.forEach(p => { if (next[p.id] === undefined) next[p.id] = true; });
      return next;
    });
  }, [teamId, players, mode]);

  const selectedTeamPlayers = useMemo(() => players.filter(p => p.team_id === teamId), [players, teamId]);
  const otherPlayers = useMemo(() => players.filter(p => p.team_id !== teamId), [players, teamId]);
  const taskById = useMemo(() => {
    const m = new Map<string, TaskRow>();
    tasksDb.forEach(t => m.set(t.id, t));
    return m;
  }, [tasksDb]);

  const togglePlayer = (id: string, included: boolean) => {
    setIncludedPlayers(prev => {
      const next = new Set(prev);
      if (included) next.add(id); else next.delete(id);
      return next;
    });
    setAttendance(prev => {
      const next = { ...prev };
      if (included && next[id] === undefined) next[id] = true;
      return next;
    });
  };
  const setPresent = (id: string, present: boolean) => {
    setAttendance(prev => ({ ...prev, [id]: present }));
  };

  const addTask = (block: TrainingBlock, taskId: string) => {
    setBlockItems(prev => ({ ...prev, [block]: [...prev[block], { kind: "task", task_id: taskId }] }));
  };
  const addText = (block: TrainingBlock) => {
    setBlockItems(prev => ({ ...prev, [block]: [...prev[block], { kind: "text", content: "" }] }));
  };
  const updateText = (block: TrainingBlock, idx: number, content: string) => {
    setBlockItems(prev => {
      const arr = [...prev[block]];
      const cur = arr[idx];
      if (!cur || cur.kind !== "text") return prev;
      arr[idx] = { kind: "text", content };
      return { ...prev, [block]: arr };
    });
  };
  const removeItem = (block: TrainingBlock, idx: number) => {
    setBlockItems(prev => ({ ...prev, [block]: prev[block].filter((_, i) => i !== idx) }));
  };
  const moveItem = (block: TrainingBlock, idx: number, delta: -1 | 1) => {
    setBlockItems(prev => {
      const arr = [...prev[block]];
      const j = idx + delta;
      if (j < 0 || j >= arr.length) return prev;
      [arr[idx], arr[j]] = [arr[j], arr[idx]];
      return { ...prev, [block]: arr };
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamId) { toast.error("Selecciona un equipo"); return; }
    setSaving(true);
    try {
      let sessionId = initial?.id;
      const payload = {
        team_id: teamId,
        session_date: date || null,
        session_time: time,
        venue,
        competitive_period: period,
        microcycle,
        session_number: sessionNumber,
        rival,
        objectives,
        other_notes: otherNotes,
      };
      if (mode === "edit" && sessionId) {
        const { error } = await supabase.from("training_sessions").update(payload).eq("id", sessionId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("training_sessions").insert(payload).select("id").single();
        if (error) throw error;
        sessionId = data!.id as string;
      }

      // Borrar e insertar items: comparten order_index dentro del mismo bloque.
      await supabase.from("training_session_tasks").delete().eq("session_id", sessionId);
      await (supabase as any).from("training_session_texts").delete().eq("session_id", sessionId);

      const taskRows: Array<{ session_id: string; task_id: string; block: TrainingBlock; order_index: number }> = [];
      const textRows: Array<{ session_id: string; content: string; block: TrainingBlock; order_index: number }> = [];

      (Object.keys(blockItems) as TrainingBlock[]).forEach(block => {
        blockItems[block].forEach((it, order_index) => {
          if (it.kind === "task") {
            taskRows.push({ session_id: sessionId!, task_id: it.task_id, block, order_index });
          } else {
            textRows.push({ session_id: sessionId!, content: it.content, block, order_index });
          }
        });
      });

      if (taskRows.length > 0) {
        const { error: e2 } = await supabase.from("training_session_tasks").insert(taskRows);
        if (e2) throw e2;
      }
      if (textRows.length > 0) {
        const { error: e2b } = await (supabase as any).from("training_session_texts").insert(textRows);
        if (e2b) throw e2b;
      }

      await supabase.from("training_attendance").delete().eq("session_id", sessionId);
      const attRows = Array.from(includedPlayers).map(player_id => ({
        session_id: sessionId!,
        player_id,
        present: attendance[player_id] !== false,
      }));
      if (attRows.length > 0) {
        const { error: e3 } = await supabase.from("training_attendance").insert(attRows);
        if (e3) throw e3;
      }

      // Sincronización con PLANIFICACIÓN
      if (date) {
        const evTitle = sessionNumber
          ? `Sesión ${sessionNumber}${microcycle ? ` · MC ${microcycle}` : ""}`
          : (microcycle ? `Microciclo ${microcycle}` : "Entrenamiento");
        const planningPayload: any = {
          team_id: teamId,
          event_date: date,
          event_time: time || null,
          type: "training",
          title: evTitle,
          location: venue || "",
          notes: objectives || "",
          training_session_id: sessionId,
        };
        const { data: existing } = await (supabase as any)
          .from("planning_events").select("id").eq("training_session_id", sessionId).maybeSingle();
        if (existing?.id) {
          await (supabase as any).from("planning_events").update(planningPayload).eq("id", existing.id);
        } else {
          await (supabase as any).from("planning_events").insert(planningPayload);
        }
      } else {
        await (supabase as any).from("planning_events").delete().eq("training_session_id", sessionId);
      }

      toast.success(mode === "edit" ? "Sesión actualizada" : "Sesión creada");
      if (returnTo === "planning") navigate({ to: "/planificacion" });
      else navigate({ to: "/entrenamientos" });
    } catch (err) {
      console.error(err);
      toast.error("Error al guardar la sesión");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-muted-foreground">Cargando…</p>;

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Encabezado */}
      <section className="bg-card rounded-2xl border border-border/60 shadow-card p-6 space-y-4">
        <h2 className="font-display tracking-wider text-lg text-foreground">DATOS DE LA SESIÓN</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <Label className="text-foreground font-semibold">Equipo</Label>
            <select
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className="mt-2 flex h-9 w-full rounded-md border border-input bg-white text-neutral-900 px-3 py-1 text-sm shadow-sm"
              required
            >
              <option value="">Selecciona…</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>{t.name}{t.category ? ` · ${t.category}` : ""}</option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-foreground font-semibold">Fecha</Label>
            <Input type="date" value={date ?? ""} onChange={(e) => setDate(e.target.value)} className="mt-2" />
          </div>
          <div>
            <Label className="text-foreground font-semibold">Hora</Label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-2" />
          </div>
          <div>
            <Label className="text-foreground font-semibold">Pabellón</Label>
            <Input value={venue} onChange={(e) => setVenue(e.target.value)} className="mt-2" />
          </div>
          <div>
            <Label className="text-foreground font-semibold">Periodo competitivo</Label>
            <Input value={period} onChange={(e) => setPeriod(e.target.value)} className="mt-2" />
          </div>
          <div>
            <Label className="text-foreground font-semibold">Microciclo</Label>
            <Input value={microcycle} onChange={(e) => setMicrocycle(e.target.value)} className="mt-2" />
          </div>
          <div>
            <Label className="text-foreground font-semibold">Nº de sesión</Label>
            <Input value={sessionNumber} onChange={(e) => setSessionNumber(e.target.value)} className="mt-2" />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-foreground font-semibold">Rival de la jornada</Label>
            <Input value={rival} onChange={(e) => setRival(e.target.value)} className="mt-2" />
          </div>
        </div>
        <div>
          <Label className="text-foreground font-semibold">Objetivos para la sesión</Label>
          <Textarea value={objectives} onChange={(e) => setObjectives(e.target.value)} className="mt-2 min-h-[80px]" />
        </div>
      </section>

      {/* Asistencia */}
      <section className="bg-card rounded-2xl border border-border/60 shadow-card p-6 space-y-4">
        <h2 className="font-display tracking-wider text-lg text-foreground">JUGADORES PARTICIPANTES</h2>
        {!teamId ? (
          <p className="text-sm text-muted-foreground">Selecciona primero un equipo.</p>
        ) : (
          <>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Plantilla del equipo</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {selectedTeamPlayers.map(p => (
                  <PlayerRow
                    key={p.id} player={p}
                    included={includedPlayers.has(p.id)}
                    present={attendance[p.id] !== false}
                    onToggleInc={(v) => togglePlayer(p.id, v)}
                    onSetPresent={(v) => setPresent(p.id, v)}
                  />
                ))}
                {selectedTeamPlayers.length === 0 && (
                  <p className="text-sm text-muted-foreground">Este equipo aún no tiene jugadores.</p>
                )}
              </div>
            </div>

            <details className="rounded-xl border border-border/60 p-3">
              <summary className="cursor-pointer text-sm font-medium text-foreground">Añadir jugadores de otros equipos</summary>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {otherPlayers.map(p => (
                  <PlayerRow
                    key={p.id} player={p}
                    included={includedPlayers.has(p.id)}
                    present={attendance[p.id] !== false}
                    onToggleInc={(v) => togglePlayer(p.id, v)}
                    onSetPresent={(v) => setPresent(p.id, v)}
                    showTeam team={teams.find(tt => tt.id === p.team_id)?.name}
                  />
                ))}
                {otherPlayers.length === 0 && (
                  <p className="text-sm text-muted-foreground">No hay jugadores en otros equipos.</p>
                )}
              </div>
            </details>
          </>
        )}
      </section>

      {/* Bloques */}
      <section className="bg-card rounded-2xl border border-border/60 shadow-card p-6 space-y-5">
        <h2 className="font-display tracking-wider text-lg text-foreground">TAREAS DE LA SESIÓN</h2>
        {BLOCK_ORDER.map(block => (
          <BlockSection
            key={block}
            block={block}
            items={blockItems[block]}
            taskById={taskById}
            tasksDb={tasksDb}
            onAddTask={(id) => addTask(block, id)}
            onAddText={() => addText(block)}
            onUpdateText={(idx, v) => updateText(block, idx, v)}
            onRemove={(idx) => removeItem(block, idx)}
            onMove={(idx, dir) => moveItem(block, idx, dir)}
          />
        ))}
      </section>

      {/* Otros */}
      <section className="bg-card rounded-2xl border border-border/60 shadow-card p-6 space-y-3">
        <h2 className="font-display tracking-wider text-lg text-foreground">OTROS ASUNTOS RELEVANTES</h2>
        <Textarea value={otherNotes} onChange={(e) => setOtherNotes(e.target.value)} className="min-h-[100px]" />
      </section>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => navigate({ to: "/entrenamientos" })}>Cancelar</Button>
        <Button type="submit" disabled={saving} className="bg-aureon-orange text-black hover:bg-aureon-orange/90 font-display tracking-wider">
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> GUARDANDO…</> : (mode === "edit" ? "GUARDAR CAMBIOS" : "GUARDAR SESIÓN")}
        </Button>
      </div>
    </form>
  );
}

function PlayerRow({
  player, included, present, onToggleInc, onSetPresent, showTeam, team,
}: {
  player: Player;
  included: boolean;
  present: boolean;
  onToggleInc: (v: boolean) => void;
  onSetPresent: (v: boolean) => void;
  showTeam?: boolean;
  team?: string;
}) {
  const name = player.sport_name || `${player.first_name} ${player.last_name}`;
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background px-3 py-2">
      <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
        <input type="checkbox" checked={included} onChange={(e) => onToggleInc(e.target.checked)} className="w-4 h-4" />
        <span className="font-display text-sm w-7 text-foreground">{player.jersey_number ?? "—"}</span>
        <span className="text-sm text-foreground truncate">{name}</span>
        {showTeam && team && <span className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">{team}</span>}
      </label>
      {included && (
        <div className="flex gap-1">
          <button type="button" onClick={() => onSetPresent(true)}
            className={`px-2 py-1 rounded text-[10px] font-display tracking-wider ${present ? "bg-emerald-600 text-white" : "bg-muted text-foreground"}`}>
            P
          </button>
          <button type="button" onClick={() => onSetPresent(false)}
            className={`px-2 py-1 rounded text-[10px] font-display tracking-wider ${!present ? "bg-destructive text-destructive-foreground" : "bg-muted text-foreground"}`}>
            A
          </button>
        </div>
      )}
    </div>
  );
}

function BlockSection({
  block, items, taskById, tasksDb, onAddTask, onAddText, onUpdateText, onRemove, onMove,
}: {
  block: TrainingBlock;
  items: BlockItem[];
  taskById: Map<string, TaskRow>;
  tasksDb: TaskRow[];
  onAddTask: (id: string) => void;
  onAddText: () => void;
  onUpdateText: (idx: number, content: string) => void;
  onRemove: (idx: number) => void;
  onMove: (idx: number, dir: -1 | 1) => void;
}) {
  return (
    <div className="rounded-xl border border-border/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="font-display tracking-wider text-base text-foreground">{BLOCK_LABELS[block].toUpperCase()}</h3>
        <div className="flex flex-wrap gap-2">
          <TaskPickerDialog tasksDb={tasksDb} onPick={onAddTask} />
          <Button
            type="button" size="sm" variant="outline"
            onClick={onAddText}
            className="border-aureon-blue text-aureon-blue hover:bg-aureon-blue/10"
          >
            <FileText className="w-4 h-4 mr-1" /> Añadir texto
          </Button>
        </div>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin contenido añadido.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((it, idx) => (
            <li key={idx} className="rounded-lg border border-border/60 bg-background p-2">
              {it.kind === "task" ? (
                <div className="flex items-center gap-2">
                  {(() => {
                    const t = taskById.get(it.task_id);
                    return (
                      <>
                        {t?.image_url ? (
                          <img src={t.image_url} alt="" className="w-20 h-auto max-h-24 object-contain rounded border border-border/60 bg-white shrink-0" />
                        ) : (
                          <div className="w-14 h-14 rounded border border-border/60 bg-muted shrink-0" />
                        )}
                        <span className="font-display text-xs text-muted-foreground w-12">#{t ? formatTaskNumber(t.task_number) : "—"}</span>
                        {t && <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${categoryStyle(t.category)}`}>{t.category}</span>}
                        <span className="flex-1 text-sm text-foreground truncate">{t?.keywords || t?.description || "Tarea"}</span>
                      </>
                    );
                  })()}
                  <ItemControls onMove={(d) => onMove(idx, d)} onRemove={() => onRemove(idx)} />
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-aureon-blue/15 text-aureon-blue mt-1 shrink-0 inline-flex items-center gap-1">
                    <FileText className="w-3 h-3" /> Texto
                  </span>
                  <Textarea
                    value={it.content}
                    onChange={(e) => onUpdateText(idx, e.target.value)}
                    placeholder="Escribe consignas, observaciones técnicas, ejercicios libres, pautas tácticas, físicas o metodológicas…"
                    className="flex-1 min-h-[90px] text-sm whitespace-pre-wrap"
                  />
                  <div className="flex flex-col">
                    <ItemControls onMove={(d) => onMove(idx, d)} onRemove={() => onRemove(idx)} />
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ItemControls({ onMove, onRemove }: { onMove: (d: -1 | 1) => void; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <button type="button" onClick={() => onMove(-1)} className="p-1 text-foreground/70 hover:text-foreground"><ChevronUp className="w-4 h-4" /></button>
      <button type="button" onClick={() => onMove(1)} className="p-1 text-foreground/70 hover:text-foreground"><ChevronDown className="w-4 h-4" /></button>
      <button type="button" onClick={onRemove} className="p-1 text-destructive"><X className="w-4 h-4" /></button>
    </div>
  );
}

function TaskPickerDialog({ tasksDb, onPick }: { tasksDb: TaskRow[]; onPick: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return tasksDb.slice(0, 50);
    return tasksDb.filter(t =>
      t.keywords.toLowerCase().includes(k) ||
      t.description.toLowerCase().includes(k) ||
      t.category.toLowerCase().includes(k) ||
      (t.secondary_category ?? "").toLowerCase().includes(k) ||
      String(t.task_number).includes(k),
    ).slice(0, 50);
  }, [q, tasksDb]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" className="bg-aureon-blue text-white hover:brightness-110">
          <Plus className="w-4 h-4 mr-1" /> Añadir tarea
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Seleccionar tarea</DialogTitle></DialogHeader>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <Input className="pl-9" placeholder="Buscar por palabra clave, concepto o número…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="max-h-[50vh] overflow-y-auto divide-y divide-border/60">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">Sin resultados.</p>
          ) : filtered.map(t => (
            <button
              type="button" key={t.id}
              onClick={() => { onPick(t.id); setOpen(false); }}
              className="w-full text-left flex items-center gap-3 p-3 hover:bg-muted"
            >
              {t.image_url ? (
                <img src={t.image_url} alt="" className="w-16 h-auto max-h-20 object-contain rounded border border-border/60 bg-white shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded border border-border/60 bg-muted shrink-0" />
              )}
              <span className="font-display text-xs text-muted-foreground w-12">#{formatTaskNumber(t.task_number)}</span>
              <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${categoryStyle(t.category)}`}>{t.category}</span>
              <span className="flex-1 text-sm text-foreground truncate">{t.keywords || t.description}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
