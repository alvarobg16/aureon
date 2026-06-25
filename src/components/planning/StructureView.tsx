import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Plus, Trash2, Pencil, Target, Layers, CalendarRange, CalendarDays, ChevronDown, ChevronRight,
} from "lucide-react";
import {
  type Macrocycle, type Mesocycle, type Microcycle, type TeamGoal,
  type LoadLevel, type GoalPriority, type GoalStatus,
  LOAD_LABELS, LOAD_COLORS, GOAL_CATEGORIES, PRIORITY_LABELS, PRIORITY_COLORS,
  STATUS_LABELS, STATUS_COLORS,
} from "@/lib/planning";

type Props = { teamId: string; seasonId: string };

const LOADS: LoadLevel[] = ["very_low", "low", "medium", "high", "very_high"];

export function StructureView({ teamId, seasonId }: Props) {
  const [macros, setMacros] = useState<Macrocycle[]>([]);
  const [mesos, setMesos] = useState<Mesocycle[]>([]);
  const [micros, setMicros] = useState<Microcycle[]>([]);
  const [goals, setGoals] = useState<TeamGoal[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [expandedMeso, setExpandedMeso] = useState<Record<string, boolean>>({});

  const [editingMacro, setEditingMacro] = useState<Partial<Macrocycle> | null>(null);
  const [editingMeso, setEditingMeso] = useState<Partial<Mesocycle> | null>(null);
  const [editingMicro, setEditingMicro] = useState<Partial<Microcycle> | null>(null);
  const [editingGoal, setEditingGoal] = useState<Partial<TeamGoal> | null>(null);

  const [confirmDel, setConfirmDel] = useState<{ kind: "macro" | "meso" | "micro" | "goal"; id: string } | null>(null);

  const loadAll = async () => {
    if (!teamId) return;
    const macroQ = (supabase as any).from("planning_macrocycles").select("*").eq("team_id", teamId);
    if (seasonId) macroQ.eq("season_id", seasonId);
    const goalQ = (supabase as any).from("planning_team_goals").select("*").eq("team_id", teamId);
    if (seasonId) goalQ.eq("season_id", seasonId);

    const [{ data: ma }, { data: me }, { data: mi }, { data: go }] = await Promise.all([
      macroQ.order("start_date", { ascending: true }),
      (supabase as any).from("planning_mesocycles").select("*").eq("team_id", teamId).order("start_date", { ascending: true }),
      (supabase as any).from("planning_microcycles").select("*").eq("team_id", teamId).order("week_start", { ascending: true }),
      goalQ.order("priority", { ascending: false }),
    ]);
    setMacros((ma as Macrocycle[]) ?? []);
    setMesos((me as Mesocycle[]) ?? []);
    setMicros((mi as Microcycle[]) ?? []);
    setGoals((go as TeamGoal[]) ?? []);
  };

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [teamId, seasonId]);

  // ─────────── helpers CRUD ───────────
  const saveMacro = async () => {
    if (!editingMacro || !teamId) return;
    if (!editingMacro.name || !editingMacro.start_date || !editingMacro.end_date) {
      return toast.error("Nombre y fechas son obligatorios");
    }
    const payload: any = {
      team_id: teamId,
      season_id: seasonId || null,
      name: editingMacro.name.slice(0, 200),
      start_date: editingMacro.start_date,
      end_date: editingMacro.end_date,
      objective: (editingMacro.objective ?? "").slice(0, 4000),
      color: editingMacro.color || "#F97316",
    };
    const id = (editingMacro as Macrocycle).id;
    const { error } = id
      ? await (supabase as any).from("planning_macrocycles").update(payload).eq("id", id)
      : await (supabase as any).from("planning_macrocycles").insert(payload);
    if (error) return toast.error("No se pudo guardar el macrociclo");
    toast.success(id ? "Macrociclo actualizado" : "Macrociclo creado");
    setEditingMacro(null);
    loadAll();
  };

  const saveMeso = async () => {
    if (!editingMeso || !teamId) return;
    if (!editingMeso.macrocycle_id || !editingMeso.name || !editingMeso.start_date || !editingMeso.end_date) {
      return toast.error("Macrociclo, nombre y fechas son obligatorios");
    }
    const payload: any = {
      team_id: teamId,
      macrocycle_id: editingMeso.macrocycle_id,
      name: editingMeso.name.slice(0, 200),
      start_date: editingMeso.start_date,
      end_date: editingMeso.end_date,
      focus: (editingMeso.focus ?? "").slice(0, 4000),
      expected_load: editingMeso.expected_load || "medium",
      notes: (editingMeso.notes ?? "").slice(0, 4000),
    };
    const id = (editingMeso as Mesocycle).id;
    const { error } = id
      ? await (supabase as any).from("planning_mesocycles").update(payload).eq("id", id)
      : await (supabase as any).from("planning_mesocycles").insert(payload);
    if (error) return toast.error("No se pudo guardar el mesociclo");
    toast.success(id ? "Mesociclo actualizado" : "Mesociclo creado");
    setEditingMeso(null);
    loadAll();
  };

  const saveMicro = async () => {
    if (!editingMicro || !teamId) return;
    if (!editingMicro.mesocycle_id || !editingMicro.name || !editingMicro.week_start || !editingMicro.week_end) {
      return toast.error("Mesociclo, nombre y fechas son obligatorios");
    }
    const payload: any = {
      team_id: teamId,
      mesocycle_id: editingMicro.mesocycle_id,
      name: editingMicro.name.slice(0, 200),
      week_start: editingMicro.week_start,
      week_end: editingMicro.week_end,
      weekly_objective: (editingMicro.weekly_objective ?? "").slice(0, 4000),
      planned_load: editingMicro.planned_load || "medium",
      notes: (editingMicro.notes ?? "").slice(0, 4000),
    };
    const id = (editingMicro as Microcycle).id;
    const { error } = id
      ? await (supabase as any).from("planning_microcycles").update(payload).eq("id", id)
      : await (supabase as any).from("planning_microcycles").insert(payload);
    if (error) return toast.error("No se pudo guardar el microciclo");
    toast.success(id ? "Microciclo actualizado" : "Microciclo creado");
    setEditingMicro(null);
    loadAll();
  };

  const saveGoal = async () => {
    if (!editingGoal || !teamId) return;
    if (!editingGoal.title) return toast.error("El título es obligatorio");
    const payload: any = {
      team_id: teamId,
      season_id: seasonId || null,
      category: editingGoal.category || "general",
      title: editingGoal.title.slice(0, 200),
      description: (editingGoal.description ?? "").slice(0, 4000),
      target_value: (editingGoal.target_value ?? "").slice(0, 200),
      priority: (editingGoal.priority || "medium") as GoalPriority,
      status: (editingGoal.status || "pending") as GoalStatus,
    };
    const id = (editingGoal as TeamGoal).id;
    const { error } = id
      ? await (supabase as any).from("planning_team_goals").update(payload).eq("id", id)
      : await (supabase as any).from("planning_team_goals").insert(payload);
    if (error) return toast.error("No se pudo guardar el objetivo");
    toast.success(id ? "Objetivo actualizado" : "Objetivo creado");
    setEditingGoal(null);
    loadAll();
  };

  const doDelete = async () => {
    if (!confirmDel) return;
    const table =
      confirmDel.kind === "macro" ? "planning_macrocycles" :
      confirmDel.kind === "meso" ? "planning_mesocycles" :
      confirmDel.kind === "micro" ? "planning_microcycles" :
      "planning_team_goals";
    const { error } = await (supabase as any).from(table).delete().eq("id", confirmDel.id);
    if (error) return toast.error("Error al eliminar");
    toast.success("Eliminado");
    setConfirmDel(null);
    loadAll();
  };

  const mesosByMacro = useMemo(() => {
    const m = new Map<string, Mesocycle[]>();
    mesos.forEach((x) => {
      const a = m.get(x.macrocycle_id) ?? [];
      a.push(x);
      m.set(x.macrocycle_id, a);
    });
    return m;
  }, [mesos]);

  const microsByMeso = useMemo(() => {
    const m = new Map<string, Microcycle[]>();
    micros.forEach((x) => {
      const a = m.get(x.mesocycle_id) ?? [];
      a.push(x);
      m.set(x.mesocycle_id, a);
    });
    return m;
  }, [micros]);

  return (
    <div className="space-y-6">
      {/* OBJETIVOS DE TEMPORADA */}
      <section className="rounded-2xl border border-white/10 bg-background/40 backdrop-blur-md p-4 sm:p-5">
        <header className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-aureon-orange" />
            <h2 className="font-display tracking-[0.2em] text-white text-sm">OBJETIVOS DEL EQUIPO</h2>
            <span className="text-[11px] text-white/50">({goals.length})</span>
          </div>
          <Button size="sm" onClick={() => setEditingGoal({ category: "general", priority: "medium", status: "pending" })}
            className="bg-aureon-orange text-black hover:bg-aureon-orange/90">
            <Plus className="w-4 h-4 mr-1" /> NUEVO OBJETIVO
          </Button>
        </header>
        {goals.length === 0 ? (
          <p className="text-[12px] text-white/50">Aún no hay objetivos definidos para esta temporada.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {goals.map((g) => (
              <div key={g.id} className="rounded-xl border border-white/10 bg-background/50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-white/55">
                      {GOAL_CATEGORIES.find((c) => c.value === g.category)?.label ?? g.category}
                    </div>
                    <div className="font-display text-white text-sm break-words">{g.title}</div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => setEditingGoal({ ...g })} className="p-1.5 rounded hover:bg-white/10 text-white/70" title="Editar">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setConfirmDel({ kind: "goal", id: g.id })} className="p-1.5 rounded hover:bg-aureon-red/20 text-aureon-red/80" title="Eliminar">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {g.target_value && <div className="mt-1 text-[12px] text-white/80">Meta: <span className="text-white">{g.target_value}</span></div>}
                {g.description && <p className="mt-1 text-[11px] text-white/60 break-words">{g.description}</p>}
                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${PRIORITY_COLORS[g.priority]}`}>{PRIORITY_LABELS[g.priority]}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${STATUS_COLORS[g.status]}`}>{STATUS_LABELS[g.status]}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* MACROCICLOS */}
      <section className="rounded-2xl border border-white/10 bg-background/40 backdrop-blur-md p-4 sm:p-5">
        <header className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <CalendarRange className="w-4 h-4 text-aureon-orange" />
            <h2 className="font-display tracking-[0.2em] text-white text-sm">MACROCICLOS</h2>
            <span className="text-[11px] text-white/50">({macros.length})</span>
          </div>
          <Button size="sm" onClick={() => setEditingMacro({ name: "", start_date: "", end_date: "", objective: "", color: "#F97316" })}
            className="bg-aureon-orange text-black hover:bg-aureon-orange/90">
            <Plus className="w-4 h-4 mr-1" /> NUEVO MACROCICLO
          </Button>
        </header>
        {macros.length === 0 ? (
          <p className="text-[12px] text-white/50">Aún no hay macrociclos. Empieza creando el primero (p. ej. "Pretemporada", "Fase regular", "Playoffs").</p>
        ) : (
          <div className="space-y-3">
            {macros.map((ma) => {
              const isOpen = expanded[ma.id] ?? true;
              const childMesos = mesosByMacro.get(ma.id) ?? [];
              return (
                <div key={ma.id} className="rounded-xl border border-white/10 bg-background/50">
                  <div className="flex items-center justify-between p-3 gap-2 flex-wrap">
                    <button onClick={() => setExpanded((s) => ({ ...s, [ma.id]: !isOpen }))} className="flex items-center gap-2 min-w-0 text-left">
                      {isOpen ? <ChevronDown className="w-4 h-4 text-white/70" /> : <ChevronRight className="w-4 h-4 text-white/70" />}
                      <span className="inline-block w-3 h-3 rounded-full flex-shrink-0" style={{ background: ma.color }} />
                      <div className="min-w-0">
                        <div className="font-display text-white text-sm break-words">{ma.name}</div>
                        <div className="text-[10px] text-white/55 uppercase tracking-wider">{ma.start_date} → {ma.end_date} · {childMesos.length} mesociclo(s)</div>
                      </div>
                    </button>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="outline" onClick={() => setEditingMeso({ macrocycle_id: ma.id, name: "", start_date: ma.start_date, end_date: ma.end_date, expected_load: "medium", focus: "", notes: "" })}>
                        <Plus className="w-3 h-3 mr-1" /> Mesociclo
                      </Button>
                      <button onClick={() => setEditingMacro({ ...ma })} className="p-1.5 rounded hover:bg-white/10 text-white/70"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setConfirmDel({ kind: "macro", id: ma.id })} className="p-1.5 rounded hover:bg-aureon-red/20 text-aureon-red/80"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  {ma.objective && isOpen && <p className="px-3 pb-2 text-[12px] text-white/70 break-words">{ma.objective}</p>}
                  {isOpen && (
                    <div className="px-3 pb-3 space-y-2">
                      {childMesos.length === 0 ? (
                        <p className="text-[11px] text-white/45 italic">Sin mesociclos en este macrociclo.</p>
                      ) : (
                        childMesos.map((me) => {
                          const open2 = expandedMeso[me.id] ?? true;
                          const childMicros = microsByMeso.get(me.id) ?? [];
                          return (
                            <div key={me.id} className="rounded-lg border border-white/10 bg-background/40">
                              <div className="flex items-center justify-between p-2.5 gap-2 flex-wrap">
                                <button onClick={() => setExpandedMeso((s) => ({ ...s, [me.id]: !open2 }))} className="flex items-center gap-2 min-w-0 text-left">
                                  {open2 ? <ChevronDown className="w-4 h-4 text-white/60" /> : <ChevronRight className="w-4 h-4 text-white/60" />}
                                  <Layers className="w-3.5 h-3.5 text-aureon-blue flex-shrink-0" />
                                  <div className="min-w-0">
                                    <div className="text-white text-[13px] font-medium break-words">{me.name}</div>
                                    <div className="text-[10px] text-white/55">{me.start_date} → {me.end_date} · {childMicros.length} microciclo(s)</div>
                                  </div>
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${LOAD_COLORS[me.expected_load]}`}>{LOAD_LABELS[me.expected_load]}</span>
                                </button>
                                <div className="flex items-center gap-1">
                                  <Button size="sm" variant="outline" onClick={() => setEditingMicro({ mesocycle_id: me.id, name: "", week_start: me.start_date, week_end: me.end_date, planned_load: me.expected_load, weekly_objective: "", notes: "" })}>
                                    <Plus className="w-3 h-3 mr-1" /> Microciclo
                                  </Button>
                                  <button onClick={() => setEditingMeso({ ...me })} className="p-1.5 rounded hover:bg-white/10 text-white/70"><Pencil className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => setConfirmDel({ kind: "meso", id: me.id })} className="p-1.5 rounded hover:bg-aureon-red/20 text-aureon-red/80"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                              </div>
                              {me.focus && open2 && <p className="px-3 pb-1 text-[12px] text-white/70 break-words">Enfoque: {me.focus}</p>}
                              {open2 && (
                                <div className="px-3 pb-3 space-y-1.5">
                                  {childMicros.length === 0 ? (
                                    <p className="text-[11px] text-white/45 italic">Sin microciclos.</p>
                                  ) : (
                                    childMicros.map((mi) => (
                                      <div key={mi.id} className="rounded-md border border-white/10 bg-background/40 p-2.5 flex items-start gap-2 flex-wrap">
                                        <CalendarDays className="w-3.5 h-3.5 text-aureon-orange mt-0.5 flex-shrink-0" />
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <div className="text-white text-[13px] font-medium break-words">{mi.name}</div>
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${LOAD_COLORS[mi.planned_load]}`}>{LOAD_LABELS[mi.planned_load]}</span>
                                          </div>
                                          <div className="text-[10px] text-white/55">{mi.week_start} → {mi.week_end}</div>
                                          {mi.weekly_objective && <p className="mt-1 text-[12px] text-white/75 break-words">{mi.weekly_objective}</p>}
                                          {mi.notes && <p className="mt-0.5 text-[11px] text-white/55 break-words">{mi.notes}</p>}
                                        </div>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                          <button onClick={() => setEditingMicro({ ...mi })} className="p-1.5 rounded hover:bg-white/10 text-white/70"><Pencil className="w-3.5 h-3.5" /></button>
                                          <button onClick={() => setConfirmDel({ kind: "micro", id: mi.id })} className="p-1.5 rounded hover:bg-aureon-red/20 text-aureon-red/80"><Trash2 className="w-3.5 h-3.5" /></button>
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ─────────── DIÁLOGO MACRO ─────────── */}
      <Dialog open={!!editingMacro} onOpenChange={(o) => !o && setEditingMacro(null)}>
        <DialogContent className="max-w-xl bg-background/95 backdrop-blur-md border-white/10">
          <DialogHeader>
            <DialogTitle className="font-display tracking-[0.2em] text-white">
              {(editingMacro as Macrocycle | null)?.id ? "EDITAR MACROCICLO" : "NUEVO MACROCICLO"}
            </DialogTitle>
          </DialogHeader>
          {editingMacro && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label className="text-xs text-white/70">Nombre</Label>
                <Input className="mt-1 bg-background/60 border-white/15" maxLength={200}
                  value={editingMacro.name ?? ""} onChange={(e) => setEditingMacro({ ...editingMacro, name: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs text-white/70">Inicio</Label>
                <Input type="date" className="mt-1 bg-background/60 border-white/15"
                  value={editingMacro.start_date ?? ""} onChange={(e) => setEditingMacro({ ...editingMacro, start_date: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs text-white/70">Fin</Label>
                <Input type="date" className="mt-1 bg-background/60 border-white/15"
                  value={editingMacro.end_date ?? ""} onChange={(e) => setEditingMacro({ ...editingMacro, end_date: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs text-white/70">Color</Label>
                <Input type="color" className="mt-1 h-10 bg-background/60 border-white/15"
                  value={editingMacro.color ?? "#F97316"} onChange={(e) => setEditingMacro({ ...editingMacro, color: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs text-white/70">Objetivo general</Label>
                <Textarea className="mt-1 bg-background/60 border-white/15" rows={3} maxLength={4000}
                  value={editingMacro.objective ?? ""} onChange={(e) => setEditingMacro({ ...editingMacro, objective: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditingMacro(null)}>Cancelar</Button>
            <Button onClick={saveMacro} className="bg-aureon-orange text-black hover:bg-aureon-orange/90">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─────────── DIÁLOGO MESO ─────────── */}
      <Dialog open={!!editingMeso} onOpenChange={(o) => !o && setEditingMeso(null)}>
        <DialogContent className="max-w-xl bg-background/95 backdrop-blur-md border-white/10">
          <DialogHeader>
            <DialogTitle className="font-display tracking-[0.2em] text-white">
              {(editingMeso as Mesocycle | null)?.id ? "EDITAR MESOCICLO" : "NUEVO MESOCICLO"}
            </DialogTitle>
          </DialogHeader>
          {editingMeso && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label className="text-xs text-white/70">Macrociclo</Label>
                <Select value={editingMeso.macrocycle_id ?? ""} onValueChange={(v) => setEditingMeso({ ...editingMeso, macrocycle_id: v })}>
                  <SelectTrigger className="mt-1 bg-background/60 border-white/15"><SelectValue placeholder="Selecciona macrociclo" /></SelectTrigger>
                  <SelectContent>
                    {macros.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs text-white/70">Nombre</Label>
                <Input className="mt-1 bg-background/60 border-white/15" maxLength={200}
                  value={editingMeso.name ?? ""} onChange={(e) => setEditingMeso({ ...editingMeso, name: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs text-white/70">Inicio</Label>
                <Input type="date" className="mt-1 bg-background/60 border-white/15"
                  value={editingMeso.start_date ?? ""} onChange={(e) => setEditingMeso({ ...editingMeso, start_date: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs text-white/70">Fin</Label>
                <Input type="date" className="mt-1 bg-background/60 border-white/15"
                  value={editingMeso.end_date ?? ""} onChange={(e) => setEditingMeso({ ...editingMeso, end_date: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs text-white/70">Enfoque</Label>
                <Input className="mt-1 bg-background/60 border-white/15" maxLength={500}
                  placeholder="Ej. transición ofensiva, ABP, balance corporal…"
                  value={editingMeso.focus ?? ""} onChange={(e) => setEditingMeso({ ...editingMeso, focus: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs text-white/70">Carga prevista</Label>
                <Select value={editingMeso.expected_load ?? "medium"} onValueChange={(v) => setEditingMeso({ ...editingMeso, expected_load: v as LoadLevel })}>
                  <SelectTrigger className="mt-1 bg-background/60 border-white/15"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LOADS.map((l) => <SelectItem key={l} value={l}>{LOAD_LABELS[l]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs text-white/70">Notas</Label>
                <Textarea className="mt-1 bg-background/60 border-white/15" rows={3} maxLength={4000}
                  value={editingMeso.notes ?? ""} onChange={(e) => setEditingMeso({ ...editingMeso, notes: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditingMeso(null)}>Cancelar</Button>
            <Button onClick={saveMeso} className="bg-aureon-orange text-black hover:bg-aureon-orange/90">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─────────── DIÁLOGO MICRO ─────────── */}
      <Dialog open={!!editingMicro} onOpenChange={(o) => !o && setEditingMicro(null)}>
        <DialogContent className="max-w-xl bg-background/95 backdrop-blur-md border-white/10">
          <DialogHeader>
            <DialogTitle className="font-display tracking-[0.2em] text-white">
              {(editingMicro as Microcycle | null)?.id ? "EDITAR MICROCICLO" : "NUEVO MICROCICLO"}
            </DialogTitle>
          </DialogHeader>
          {editingMicro && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label className="text-xs text-white/70">Mesociclo</Label>
                <Select value={editingMicro.mesocycle_id ?? ""} onValueChange={(v) => setEditingMicro({ ...editingMicro, mesocycle_id: v })}>
                  <SelectTrigger className="mt-1 bg-background/60 border-white/15"><SelectValue placeholder="Selecciona mesociclo" /></SelectTrigger>
                  <SelectContent>
                    {mesos.map((m) => {
                      const ma = macros.find((x) => x.id === m.macrocycle_id);
                      return <SelectItem key={m.id} value={m.id}>{ma ? `${ma.name} · ` : ""}{m.name}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs text-white/70">Nombre</Label>
                <Input className="mt-1 bg-background/60 border-white/15" maxLength={200}
                  placeholder="Ej. Semana 1 · Adaptación"
                  value={editingMicro.name ?? ""} onChange={(e) => setEditingMicro({ ...editingMicro, name: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs text-white/70">Lunes (inicio)</Label>
                <Input type="date" className="mt-1 bg-background/60 border-white/15"
                  value={editingMicro.week_start ?? ""} onChange={(e) => setEditingMicro({ ...editingMicro, week_start: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs text-white/70">Domingo (fin)</Label>
                <Input type="date" className="mt-1 bg-background/60 border-white/15"
                  value={editingMicro.week_end ?? ""} onChange={(e) => setEditingMicro({ ...editingMicro, week_end: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs text-white/70">Objetivo semanal</Label>
                <Textarea className="mt-1 bg-background/60 border-white/15" rows={3} maxLength={4000}
                  value={editingMicro.weekly_objective ?? ""} onChange={(e) => setEditingMicro({ ...editingMicro, weekly_objective: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs text-white/70">Carga prevista</Label>
                <Select value={editingMicro.planned_load ?? "medium"} onValueChange={(v) => setEditingMicro({ ...editingMicro, planned_load: v as LoadLevel })}>
                  <SelectTrigger className="mt-1 bg-background/60 border-white/15"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LOADS.map((l) => <SelectItem key={l} value={l}>{LOAD_LABELS[l]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs text-white/70">Notas</Label>
                <Textarea className="mt-1 bg-background/60 border-white/15" rows={2} maxLength={4000}
                  value={editingMicro.notes ?? ""} onChange={(e) => setEditingMicro({ ...editingMicro, notes: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditingMicro(null)}>Cancelar</Button>
            <Button onClick={saveMicro} className="bg-aureon-orange text-black hover:bg-aureon-orange/90">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─────────── DIÁLOGO OBJETIVO ─────────── */}
      <Dialog open={!!editingGoal} onOpenChange={(o) => !o && setEditingGoal(null)}>
        <DialogContent className="max-w-xl bg-background/95 backdrop-blur-md border-white/10">
          <DialogHeader>
            <DialogTitle className="font-display tracking-[0.2em] text-white">
              {(editingGoal as TeamGoal | null)?.id ? "EDITAR OBJETIVO" : "NUEVO OBJETIVO"}
            </DialogTitle>
          </DialogHeader>
          {editingGoal && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs text-white/70">Categoría</Label>
                <Select value={editingGoal.category ?? "general"} onValueChange={(v) => setEditingGoal({ ...editingGoal, category: v })}>
                  <SelectTrigger className="mt-1 bg-background/60 border-white/15"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GOAL_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-white/70">Prioridad</Label>
                <Select value={editingGoal.priority ?? "medium"} onValueChange={(v) => setEditingGoal({ ...editingGoal, priority: v as GoalPriority })}>
                  <SelectTrigger className="mt-1 bg-background/60 border-white/15"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["low", "medium", "high"] as GoalPriority[]).map((p) => <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs text-white/70">Título</Label>
                <Input className="mt-1 bg-background/60 border-white/15" maxLength={200}
                  value={editingGoal.title ?? ""} onChange={(e) => setEditingGoal({ ...editingGoal, title: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs text-white/70">Meta cuantificable</Label>
                <Input className="mt-1 bg-background/60 border-white/15" maxLength={200}
                  placeholder="Ej. 60 puntos, top-4, 90 % asistencia…"
                  value={editingGoal.target_value ?? ""} onChange={(e) => setEditingGoal({ ...editingGoal, target_value: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs text-white/70">Descripción</Label>
                <Textarea className="mt-1 bg-background/60 border-white/15" rows={3} maxLength={4000}
                  value={editingGoal.description ?? ""} onChange={(e) => setEditingGoal({ ...editingGoal, description: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs text-white/70">Estado</Label>
                <Select value={editingGoal.status ?? "pending"} onValueChange={(v) => setEditingGoal({ ...editingGoal, status: v as GoalStatus })}>
                  <SelectTrigger className="mt-1 bg-background/60 border-white/15"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["pending", "in_progress", "achieved", "missed"] as GoalStatus[]).map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditingGoal(null)}>Cancelar</Button>
            <Button onClick={saveGoal} className="bg-aureon-orange text-black hover:bg-aureon-orange/90">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar registro?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDel?.kind === "macro" && "Se eliminarán también todos los mesociclos y microciclos asociados."}
              {confirmDel?.kind === "meso" && "Se eliminarán también todos los microciclos asociados."}
              {confirmDel?.kind === "micro" && "Esta acción no se puede deshacer."}
              {confirmDel?.kind === "goal" && "Esta acción no se puede deshacer."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} className="bg-aureon-red text-white hover:bg-aureon-red/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
