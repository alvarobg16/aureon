import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Copy, Search, Users, ClipboardList, Layers, RefreshCw, FileStack, History } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { AccessBlocked } from "@/components/AccessBlocked";
import { useServerFn } from "@tanstack/react-start";
import { listAdminUserProfiles } from "@/lib/admin-users.functions";

export const Route = createFileRoute("/admin/migracion")({
  component: MigrationCenter,
});

type UserRow = { user_id: string; email: string; full_name: string };

function MigrationCenter() {
  const { isAdmin, loading: authLoading } = useAuth();
  const fetchUserProfiles = useServerFn(listAdminUserProfiles);
  const [users, setUsers] = useState<UserRow[]>([]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchUserProfiles().then((data) => setUsers(data as UserRow[]));
  }, [fetchUserProfiles, isAdmin]);

  if (authLoading) return <div className="text-muted-foreground text-sm">Cargando…</div>;
  if (!isAdmin) return <AccessBlocked status="no-access" moduleLabel="Centro de Migración" />;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-2xl tracking-[0.1em] text-white">CENTRO DE MIGRACIÓN Y CLONADO DE DATOS</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Herramienta avanzada de replicación, migración y distribución de información entre cuentas supervisadas.
          Toda acción se registra en el log de auditoría y se ejecuta de forma transaccional.
        </p>
      </header>

      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="bg-background/40 border border-white/10 p-1">
          <TabsTrigger value="tasks" className="data-[state=active]:bg-aureon-orange data-[state=active]:text-black"><ClipboardList className="w-4 h-4 mr-1.5" />Tareas</TabsTrigger>
          <TabsTrigger value="teams" className="data-[state=active]:bg-aureon-orange data-[state=active]:text-black"><Users className="w-4 h-4 mr-1.5" />Equipos y plantillas</TabsTrigger>
          <TabsTrigger value="structures" className="data-[state=active]:bg-aureon-orange data-[state=active]:text-black"><Layers className="w-4 h-4 mr-1.5" />Estructuras</TabsTrigger>
          <TabsTrigger value="migrate" className="data-[state=active]:bg-aureon-orange data-[state=active]:text-black"><RefreshCw className="w-4 h-4 mr-1.5" />Migrar</TabsTrigger>
          <TabsTrigger value="templates" className="data-[state=active]:bg-aureon-orange data-[state=active]:text-black"><FileStack className="w-4 h-4 mr-1.5" />Plantillas</TabsTrigger>
          <TabsTrigger value="audit" className="data-[state=active]:bg-aureon-orange data-[state=active]:text-black"><History className="w-4 h-4 mr-1.5" />Auditoría</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-5"><CloneTasksPanel users={users} /></TabsContent>
        <TabsContent value="teams" className="mt-5"><CloneTeamsPanel users={users} /></TabsContent>
        <TabsContent value="structures" className="mt-5"><ComingSoon title="Clonado de estructuras completas" desc="Permitirá clonar club, equipo o temporada con todas sus relaciones internas." /></TabsContent>
        <TabsContent value="migrate" className="mt-5"><ComingSoon title="Migración entre cuentas" desc="Fusionar, sobrescribir, copiar solo si no existe o actualizar diferencias entre dos cuentas." /></TabsContent>
        <TabsContent value="templates" className="mt-5"><ComingSoon title="Plantillas maestras" desc="Crear plantillas Club Base, Temporada Base o Entrenador Base y aplicarlas con un clic." /></TabsContent>
        <TabsContent value="audit" className="mt-5"><AuditPanel /></TabsContent>
      </Tabs>
    </div>
  );
}

function ComingSoon({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-dashed border-white/15 bg-background/30 p-8 text-center">
      <h3 className="font-display tracking-[0.15em] text-white">{title.toUpperCase()}</h3>
      <p className="text-sm text-muted-foreground mt-2 max-w-lg mx-auto">{desc}</p>
      <p className="text-xs text-aureon-orange mt-4 font-semibold">Disponible en fases posteriores · Fase 1: clonado individual + auditoría</p>
    </div>
  );
}

/* ============================================================ *
 * Helpers
 * ============================================================ */
function UserSelect({ users, value, onChange, label, exclude }: {
  users: UserRow[]; value: string; onChange: (v: string) => void; label: string; exclude?: string;
}) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-[0.15em] text-muted-foreground mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 rounded-md border border-white/15 bg-background/60 px-3 text-sm text-white"
      >
        <option value="" className="bg-slate-900 text-white">— Selecciona un usuario —</option>
        {users.filter((u) => u.user_id !== exclude).map((u) => (
          <option key={u.user_id} value={u.user_id} className="bg-slate-900 text-white">
            {u.full_name || "(sin nombre)"} · {u.email}
          </option>
        ))}
      </select>
    </div>
  );
}

function MultiUserPicker({ users, value, onChange, exclude }: {
  users: UserRow[]; value: Set<string>; onChange: (v: Set<string>) => void; exclude?: string;
}) {
  const toggle = (id: string) => {
    const next = new Set(value);
    if (next.has(id)) next.delete(id); else next.add(id);
    onChange(next);
  };
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto rounded-lg border border-white/10 p-2">
      {users.filter((u) => u.user_id !== exclude).map((u) => {
        const checked = value.has(u.user_id);
        return (
          <label key={u.user_id} className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors ${checked ? "border-aureon-orange bg-aureon-orange/10" : "border-white/10 hover:bg-white/5"}`}>
            <Checkbox checked={checked} onCheckedChange={() => toggle(u.user_id)} />
            <span className="text-sm text-white truncate">
              {u.full_name || "(sin nombre)"}<span className="text-muted-foreground"> · {u.email}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}

/* ============================================================ *
 * Tasks panel (uses RPC clone_tasks_to_user — transactional)
 * ============================================================ */
type Task = {
  id: string; user_id: string; task_number: number; description: string; keywords: string;
  category: string;
};

function CloneTasksPanel({ users }: { users: UserRow[] }) {
  const [sourceId, setSourceId] = useState("");
  const [destIds, setDestIds] = useState<Set<string>>(new Set());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"auto" | "preserve">("auto");
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [report, setReport] = useState<null | { copied: number; conflicts: number; targets: number; ms: number }>(null);

  useEffect(() => {
    if (!sourceId) { setTasks([]); setSelected(new Set()); return; }
    setLoading(true);
    supabase.from("tasks").select("id,user_id,task_number,description,keywords,category")
      .eq("user_id", sourceId).order("task_number", { ascending: true })
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        setTasks((data ?? []) as Task[]); setSelected(new Set()); setLoading(false);
      });
  }, [sourceId]);

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return tasks;
    return tasks.filter((x) => [x.description, x.keywords, x.category, String(x.task_number).padStart(3, "0")].some((v) => (v ?? "").toLowerCase().includes(t)));
  }, [tasks, search]);

  const allSelected = filtered.length > 0 && filtered.every((t) => selected.has(t.id));
  const toggleAll = () => {
    const next = new Set(selected);
    if (allSelected) filtered.forEach((t) => next.delete(t.id)); else filtered.forEach((t) => next.add(t.id));
    setSelected(next);
  };

  const run = async () => {
    if (!sourceId) return toast.error("Selecciona usuario origen");
    if (selected.size === 0) return toast.error("Selecciona al menos una tarea");
    if (destIds.size === 0) return toast.error("Selecciona al menos un destino");
    setRunning(true); setReport(null);
    const t0 = performance.now();
    let totalCopied = 0, totalConflicts = 0;
    const ids = Array.from(destIds);
    setProgress({ current: 0, total: ids.length });
    try {
      for (let i = 0; i < ids.length; i++) {
        const { data, error } = await supabase.rpc("clone_tasks_to_user", {
          _task_ids: Array.from(selected),
          _dest_user_id: ids[i],
          _numbering_mode: mode,
        });
        if (error) throw error;
        const r = data as { copied: number; conflicts: number };
        totalCopied += r?.copied ?? 0;
        totalConflicts += r?.conflicts ?? 0;
        setProgress({ current: i + 1, total: ids.length });
      }
      const ms = Math.round(performance.now() - t0);
      setReport({ copied: totalCopied, conflicts: totalConflicts, targets: ids.length, ms });
      toast.success(`✔ ${totalCopied} tarea(s) copiadas a ${ids.length} usuario(s)`);
      setSelected(new Set()); setDestIds(new Set());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al copiar (operación revertida)");
    } finally { setRunning(false); setProgress(null); }
  };

  return (
    <div className="space-y-5">
      <Section step="1" title="Usuario origen">
        <UserSelect users={users} value={sourceId} onChange={setSourceId} label="" />
      </Section>

      <Section step="2" title="Tareas a copiar" right={(
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar…" className="pl-8 h-9 w-48 bg-background/60 border-white/15 text-white placeholder:text-muted-foreground" />
          </div>
          <Button type="button" variant="outline" size="sm" onClick={toggleAll} disabled={!sourceId || filtered.length === 0}>
            {allSelected ? "Deseleccionar todas" : "Seleccionar todas"}
          </Button>
        </div>
      )}>
        {!sourceId ? (
          <Empty msg="Selecciona primero un usuario origen." />
        ) : loading ? <Spinner /> : filtered.length === 0 ? (
          <Empty msg="Este usuario no tiene tareas." />
        ) : (
          <div className="max-h-80 overflow-y-auto rounded-lg border border-white/10">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-[0.15em] text-muted-foreground bg-white/5 sticky top-0">
                <tr><th className="p-2 w-10"></th><th className="text-left p-2">#</th><th className="text-left p-2">Categoría</th><th className="text-left p-2">Palabras clave</th></tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const checked = selected.has(t.id);
                  return (
                    <tr key={t.id} className="border-t border-white/5 text-white hover:bg-white/5 cursor-pointer" onClick={() => {
                      const n = new Set(selected); if (checked) n.delete(t.id); else n.add(t.id); setSelected(n);
                    }}>
                      <td className="p-2 text-center"><Checkbox checked={checked} onCheckedChange={() => {}} /></td>
                      <td className="p-2 font-mono">#{String(t.task_number).padStart(3, "0")}</td>
                      <td className="p-2">{t.category}</td>
                      <td className="p-2 truncate max-w-xs">{t.keywords || t.description}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-2">{selected.size} seleccionada(s) de {tasks.length}</p>
      </Section>

      <Section step="3" title="Usuarios destino">
        <MultiUserPicker users={users} value={destIds} onChange={setDestIds} exclude={sourceId} />
      </Section>

      <Section step="4" title="Numeración en destino">
        <div className="flex gap-2 flex-wrap">
          <ModeBtn active={mode === "auto"} onClick={() => setMode("auto")}>Automática (siguiente disponible)</ModeBtn>
          <ModeBtn active={mode === "preserve"} onClick={() => setMode("preserve")}>Conservar original (renumerar si conflicto)</ModeBtn>
        </div>
      </Section>

      <PreviewBar
        sourceLabel={users.find((u) => u.user_id === sourceId)?.full_name ?? "—"}
        destinations={destIds.size}
        items={selected.size}
        running={running}
        progress={progress}
        onRun={run}
        runLabel="COPIAR TAREAS"
      />

      {report && <Report title="Operación finalizada" rows={[
        ["Elementos copiados", report.copied],
        ["Usuarios destino", report.targets],
        ["Conflictos resueltos", report.conflicts],
        ["Tiempo empleado", `${report.ms} ms`],
        ["Resultado", "OK · transaccional"],
      ]} />}
    </div>
  );
}

/* ============================================================ *
 * Teams panel (uses RPC clone_team_to_user — transactional)
 * ============================================================ */
type Team = { id: string; user_id: string; name: string; category: string; competition: string };

function CloneTeamsPanel({ users }: { users: UserRow[] }) {
  const [sourceId, setSourceId] = useState("");
  const [destIds, setDestIds] = useState<Set<string>>(new Set());
  const [teams, setTeams] = useState<Team[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [playerCounts, setPlayerCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [strategy, setStrategy] = useState<"rename" | "skip" | "replace">("rename");
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [report, setReport] = useState<null | { copied: number; skipped: number; conflicts: number; targets: number; ms: number }>(null);

  useEffect(() => {
    if (!sourceId) { setTeams([]); setSelected(new Set()); setPlayerCounts({}); return; }
    setLoading(true);
    (async () => {
      const { data: ts } = await supabase.from("teams").select("id,user_id,name,category,competition")
        .eq("user_id", sourceId).order("name");
      const list = (ts ?? []) as Team[];
      setTeams(list);
      if (list.length) {
        const { data: ps } = await supabase.from("players").select("team_id").in("team_id", list.map((t) => t.id));
        const counts: Record<string, number> = {};
        (ps ?? []).forEach((p: { team_id: string | null }) => { if (p.team_id) counts[p.team_id] = (counts[p.team_id] ?? 0) + 1; });
        setPlayerCounts(counts);
      }
      setSelected(new Set()); setLoading(false);
    })();
  }, [sourceId]);

  const allSelected = teams.length > 0 && teams.every((t) => selected.has(t.id));
  const toggleAll = () => {
    const next = new Set(selected);
    if (allSelected) teams.forEach((t) => next.delete(t.id)); else teams.forEach((t) => next.add(t.id));
    setSelected(next);
  };

  const run = async () => {
    if (!sourceId) return toast.error("Selecciona usuario origen");
    if (selected.size === 0) return toast.error("Selecciona al menos un equipo");
    if (destIds.size === 0) return toast.error("Selecciona al menos un destino");
    setRunning(true); setReport(null);
    const t0 = performance.now();
    const teamIds = Array.from(selected);
    const dests = Array.from(destIds);
    const totalOps = teamIds.length * dests.length;
    setProgress({ current: 0, total: totalOps });
    let copied = 0, skipped = 0, conflicts = 0, n = 0;
    try {
      for (const destId of dests) {
        for (const teamId of teamIds) {
          const { data, error } = await supabase.rpc("clone_team_to_user", {
            _source_team_id: teamId,
            _dest_user_id: destId,
            _conflict_strategy: strategy,
          });
          if (error) throw error;
          const r = data as { status: string; conflicts?: number };
          if (r?.status === "skipped") skipped++; else copied++;
          if (r?.conflicts) conflicts += r.conflicts;
          n++; setProgress({ current: n, total: totalOps });
        }
      }
      const ms = Math.round(performance.now() - t0);
      setReport({ copied, skipped, conflicts, targets: dests.length, ms });
      toast.success(`✔ ${copied} equipo(s) copiados · ${skipped} omitidos`);
      setSelected(new Set()); setDestIds(new Set());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al clonar (operación revertida)");
    } finally { setRunning(false); setProgress(null); }
  };

  return (
    <div className="space-y-5">
      <Section step="1" title="Usuario origen">
        <UserSelect users={users} value={sourceId} onChange={setSourceId} label="" />
      </Section>

      <Section step="2" title="Equipos (con su plantilla)" right={(
        <Button type="button" variant="outline" size="sm" onClick={toggleAll} disabled={!sourceId || teams.length === 0}>
          {allSelected ? "Deseleccionar todos" : "Seleccionar todos"}
        </Button>
      )}>
        {!sourceId ? <Empty msg="Selecciona primero un usuario origen." />
          : loading ? <Spinner />
          : teams.length === 0 ? <Empty msg="Este usuario no tiene equipos." />
          : (
            <div className="max-h-80 overflow-y-auto rounded-lg border border-white/10">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-[0.15em] text-muted-foreground bg-white/5 sticky top-0">
                  <tr><th className="p-2 w-10"></th><th className="text-left p-2">Equipo</th><th className="text-left p-2">Categoría</th><th className="text-left p-2">Competición</th><th className="text-center p-2">Jugadores</th></tr>
                </thead>
                <tbody>
                  {teams.map((t) => {
                    const checked = selected.has(t.id);
                    return (
                      <tr key={t.id} className="border-t border-white/5 text-white hover:bg-white/5 cursor-pointer" onClick={() => {
                        const n = new Set(selected); if (checked) n.delete(t.id); else n.add(t.id); setSelected(n);
                      }}>
                        <td className="p-2 text-center"><Checkbox checked={checked} onCheckedChange={() => {}} /></td>
                        <td className="p-2 font-semibold">{t.name}</td>
                        <td className="p-2">{t.category || "—"}</td>
                        <td className="p-2">{t.competition || "—"}</td>
                        <td className="p-2 text-center font-mono">{playerCounts[t.id] ?? 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        <p className="text-xs text-muted-foreground mt-2">{selected.size} seleccionado(s) de {teams.length}. Se copian el equipo y todos sus jugadores.</p>
      </Section>

      <Section step="3" title="Usuarios destino">
        <MultiUserPicker users={users} value={destIds} onChange={setDestIds} exclude={sourceId} />
      </Section>

      <Section step="4" title="Resolución de conflictos (nombre duplicado)">
        <div className="flex gap-2 flex-wrap">
          <ModeBtn active={strategy === "rename"} onClick={() => setStrategy("rename")}>Renombrar automáticamente</ModeBtn>
          <ModeBtn active={strategy === "skip"} onClick={() => setStrategy("skip")}>Omitir</ModeBtn>
          <ModeBtn active={strategy === "replace"} onClick={() => setStrategy("replace")}>Sobrescribir (sustituir)</ModeBtn>
        </div>
        {strategy === "replace" && <p className="text-xs text-amber-300 mt-2">⚠ Eliminará el equipo existente con el mismo nombre antes de copiar.</p>}
      </Section>

      <PreviewBar
        sourceLabel={users.find((u) => u.user_id === sourceId)?.full_name ?? "—"}
        destinations={destIds.size}
        items={selected.size}
        running={running}
        progress={progress}
        onRun={run}
        runLabel="CLONAR EQUIPOS"
      />

      {report && <Report title="Operación finalizada" rows={[
        ["Equipos copiados", report.copied],
        ["Equipos omitidos", report.skipped],
        ["Conflictos detectados", report.conflicts],
        ["Usuarios destino", report.targets],
        ["Tiempo empleado", `${report.ms} ms`],
        ["Resultado", "OK · transaccional"],
      ]} />}
    </div>
  );
}

/* ============================================================ *
 * Audit panel
 * ============================================================ */
type AuditRow = {
  id: string; admin_user_id: string; source_user_id: string | null; dest_user_ids: string[];
  operation: string; entity_type: string; items_requested: number; items_copied: number;
  items_skipped: number; conflicts: number; duration_ms: number; result: string;
  created_at: string;
};

function AuditPanel() {
  const fetchUserProfiles = useServerFn(listAdminUserProfiles);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [users, setUsers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: audit }, profs] = await Promise.all([
      supabase.from("migration_audit_log").select("*").order("created_at", { ascending: false }).limit(200),
      fetchUserProfiles(),
    ]);
    const map: Record<string, string> = {};
    (profs ?? []).forEach((p: { user_id: string; full_name: string; email: string }) => { map[p.user_id] = p.full_name || p.email; });
    setUsers(map);
    setRows((audit ?? []) as AuditRow[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, [fetchUserProfiles]);

  if (loading) return <Spinner />;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display tracking-[0.15em] text-white">REGISTRO DE AUDITORÍA</h3>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-3 h-3 mr-1" />Refrescar</Button>
      </div>
      {rows.length === 0 ? (
        <Empty msg="Aún no hay operaciones registradas." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-background/40">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
              <tr>
                <th className="text-left p-2">Fecha</th>
                <th className="text-left p-2">Admin</th>
                <th className="text-left p-2">Operación</th>
                <th className="text-left p-2">Tipo</th>
                <th className="text-left p-2">Origen</th>
                <th className="text-left p-2">Destinos</th>
                <th className="text-center p-2">Solicitados</th>
                <th className="text-center p-2">Copiados</th>
                <th className="text-center p-2">Omitidos</th>
                <th className="text-center p-2">Conflictos</th>
                <th className="text-center p-2">Duración</th>
                <th className="text-center p-2">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-white/5 text-white">
                  <td className="p-2 text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="p-2 text-xs">{users[r.admin_user_id] ?? r.admin_user_id.slice(0, 8)}</td>
                  <td className="p-2 uppercase text-xs">{r.operation}</td>
                  <td className="p-2 uppercase text-xs">{r.entity_type}</td>
                  <td className="p-2 text-xs">{r.source_user_id ? (users[r.source_user_id] ?? r.source_user_id.slice(0, 8)) : "—"}</td>
                  <td className="p-2 text-xs">{r.dest_user_ids.map((d) => users[d] ?? d.slice(0, 8)).join(", ")}</td>
                  <td className="p-2 text-center font-mono">{r.items_requested}</td>
                  <td className="p-2 text-center font-mono text-emerald-300">{r.items_copied}</td>
                  <td className="p-2 text-center font-mono text-amber-300">{r.items_skipped}</td>
                  <td className="p-2 text-center font-mono">{r.conflicts}</td>
                  <td className="p-2 text-center text-xs">{r.duration_ms} ms</td>
                  <td className="p-2 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs ${r.result === "ok" ? "bg-emerald-500/20 text-emerald-300" : r.result === "skipped" ? "bg-amber-500/20 text-amber-300" : "bg-red-500/20 text-red-300"}`}>
                      {r.result}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ============================================================ *
 * Atoms
 * ============================================================ */
function Section({ step, title, right, children }: { step: string; title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-white/10 bg-background/40 backdrop-blur-md p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="font-display tracking-[0.15em] text-sm text-white flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-aureon-orange text-black text-xs font-bold">{step}</span>
          {title.toUpperCase()}
        </h3>
        {right}
      </div>
      {children}
    </section>
  );
}

function ModeBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`px-4 py-2 rounded-md text-sm font-semibold border transition-colors ${active ? "bg-aureon-orange text-black border-transparent" : "bg-white/5 text-white border-white/15 hover:bg-white/10"}`}>
      {children}
    </button>
  );
}

function Spinner() { return <div className="flex items-center justify-center py-10 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin" /></div>; }
function Empty({ msg }: { msg: string }) { return <p className="text-sm text-muted-foreground py-8 text-center">{msg}</p>; }

function PreviewBar({ sourceLabel, destinations, items, running, progress, onRun, runLabel }: {
  sourceLabel: string; destinations: number; items: number; running: boolean;
  progress: { current: number; total: number } | null; onRun: () => void; runLabel: string;
}) {
  const pct = progress ? Math.round((progress.current / Math.max(progress.total, 1)) * 100) : 0;
  return (
    <div className="rounded-xl border border-aureon-orange/30 bg-aureon-orange/5 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-xs text-muted-foreground">
          <span className="text-white font-semibold">{items}</span> elemento(s) ·
          desde <span className="text-white">{sourceLabel}</span> ·
          hacia <span className="text-white">{destinations}</span> destino(s) ·
          ejecución <span className="text-emerald-300">transaccional</span>
        </div>
        <Button onClick={onRun} disabled={running || items === 0 || destinations === 0}
          className="h-11 px-6 font-display tracking-wider bg-aureon-orange text-black hover:bg-aureon-orange/90">
          {running ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> EJECUTANDO…</> : <><Copy className="w-4 h-4 mr-2" /> {runLabel}</>}
        </Button>
      </div>
      {progress && (
        <div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-aureon-orange transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="text-xs text-muted-foreground mt-1">{progress.current} / {progress.total} · {pct}%</div>
        </div>
      )}
    </div>
  );
}

function Report({ title, rows }: { title: string; rows: (readonly [string, string | number])[] }) {
  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
      <h4 className="font-display tracking-[0.15em] text-emerald-300 mb-3">{title.toUpperCase()}</h4>
      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">{k}</dt>
            <dd className="text-white font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* Keep the deep link from previous admin sidebar working */
export { Link };
