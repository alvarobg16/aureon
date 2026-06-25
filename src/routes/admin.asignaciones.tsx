import { Fragment } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { listAdminUserProfiles } from "@/lib/admin-users.functions";

export const Route = createFileRoute("/admin/asignaciones")({
  validateSearch: (s: Record<string, unknown>) => ({ user: (s.user as string) || "" }),
  component: AdminAssign,
});

type Profile = { user_id: string; email: string; full_name: string };
type Mod = { id: string; key: string; label: string };
type UM = { id: string; user_id: string; module_id: string; starts_at: string; ends_at: string; disabled: boolean };

const CHILD_KEYS = ["tareas.scouting", "tareas.analisis"] as const;
const CHILD_LABELS: Record<string, string> = {
  "tareas.scouting": "Gestión de Scouting",
  "tareas.analisis": "Análisis de Partidos",
};

function todayISO() { return new Date().toISOString().slice(0, 10); }
function plusYearISO() { const d = new Date(); d.setFullYear(d.getFullYear() + 1); return d.toISOString().slice(0, 10); }

function AdminAssign() {
  const search = Route.useSearch();
  const fetchUserProfiles = useServerFn(listAdminUserProfiles);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [mods, setMods] = useState<Mod[]>([]);
  const [ums, setUms] = useState<UM[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>(search.user);
  const [newModId, setNewModId] = useState("");
  const [newStarts, setNewStarts] = useState(todayISO());
  const [newEnds, setNewEnds] = useState(plusYearISO());

  const load = async () => {
    const [p, { data: m }] = await Promise.all([
      fetchUserProfiles(),
      supabase.from("modules").select("id, key, label").order("label"),
    ]);
    setProfiles(p as Profile[]);
    if (selectedUser && !p.some((profile) => profile.user_id === selectedUser)) setSelectedUser("");
    setMods((m ?? []) as Mod[]);
  };
  const loadUms = async (uid: string) => {
    if (!uid) { setUms([]); return; }
    const { data } = await supabase.from("user_modules").select("*").eq("user_id", uid);
    setUms((data ?? []) as UM[]);
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { loadUms(selectedUser); }, [selectedUser]);

  const modsById = useMemo(() => new Map(mods.map((m) => [m.id, m])), [mods]);
  const modsByKey = useMemo(() => new Map(mods.map((m) => [m.key, m])), [mods]);

  // Visible top-level assignments (hide child rows from main table — surfaced as toggles)
  const visibleUms = ums.filter((u) => {
    const mod = modsById.get(u.module_id);
    return mod && !CHILD_KEYS.includes(mod.key as typeof CHILD_KEYS[number]);
  });
  const assigned = visibleUms.map((u) => ({ ...u, mod: modsById.get(u.module_id) }));

  // Dropdown excludes already-assigned AND child sub-modules (managed via toggles)
  const availableMods = mods.filter(
    (m) => !ums.some((u) => u.module_id === m.id) && !CHILD_KEYS.includes(m.key as typeof CHILD_KEYS[number]),
  );

  const tareasMod = modsByKey.get("tareas");
  const tareasAssigned = tareasMod ? ums.find((u) => u.module_id === tareasMod.id) : undefined;

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !newModId) return;
    const { error } = await supabase.from("user_modules").insert({
      user_id: selectedUser, module_id: newModId, starts_at: newStarts, ends_at: newEnds,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Módulo asignado");
    setNewModId("");
    loadUms(selectedUser);
    await supabase.from("activity_logs").insert({
      user_id: (await supabase.auth.getUser()).data.user?.id,
      action: "admin_assign_module", metadata: { target_user: selectedUser, module_id: newModId } as never,
    });
  };

  const update = async (um: UM, field: "starts_at" | "ends_at", value: string) => {
    const patch = field === "starts_at" ? { starts_at: value } : { ends_at: value };
    const { error } = await supabase.from("user_modules").update(patch).eq("id", um.id);
    if (error) { toast.error(error.message); return; }
    loadUms(selectedUser);
  };

  const remove = async (um: UM) => {
    if (!confirm("¿Quitar este módulo al usuario?")) return;
    const { error } = await supabase.from("user_modules").delete().eq("id", um.id);
    if (error) { toast.error(error.message); return; }
    loadUms(selectedUser);
    await supabase.from("activity_logs").insert({
      user_id: (await supabase.auth.getUser()).data.user?.id,
      action: "admin_revoke_module", metadata: { target_user: um.user_id, module_id: um.module_id } as never,
    });
  };

  // Toggle for child sub-modules (tareas.scouting / tareas.analisis).
  // Semantics: no row OR row with disabled=false → enabled (inherits parent if no row).
  // Toggle OFF → upsert row with disabled=true.
  // Toggle ON  → if row exists, set disabled=false; else no-op (inherits parent).
  const toggleChild = async (childKey: string, enabled: boolean) => {
    if (!selectedUser || !tareasAssigned) return;
    const childMod = modsByKey.get(childKey);
    if (!childMod) { toast.error("Sub-módulo no encontrado"); return; }
    const existing = ums.find((u) => u.module_id === childMod.id);

    if (enabled) {
      if (!existing) { loadUms(selectedUser); return; }
      const { error } = await supabase.from("user_modules").update({ disabled: false }).eq("id", existing.id);
      if (error) { toast.error(error.message); return; }
    } else {
      if (existing) {
        const { error } = await supabase.from("user_modules").update({ disabled: true }).eq("id", existing.id);
        if (error) { toast.error(error.message); return; }
      } else {
        const { error } = await supabase.from("user_modules").insert({
          user_id: selectedUser,
          module_id: childMod.id,
          starts_at: tareasAssigned.starts_at,
          ends_at: tareasAssigned.ends_at,
          disabled: true,
        });
        if (error) { toast.error(error.message); return; }
      }
    }
    loadUms(selectedUser);
    await supabase.from("activity_logs").insert({
      user_id: (await supabase.auth.getUser()).data.user?.id,
      action: enabled ? "admin_enable_submodule" : "admin_disable_submodule",
      metadata: { target_user: selectedUser, submodule: childKey } as never,
    });
  };

  const childEnabled = (childKey: string) => {
    const childMod = modsByKey.get(childKey);
    if (!childMod) return true;
    const row = ums.find((u) => u.module_id === childMod.id);
    if (!row) return true; // inherits parent (default)
    return !row.disabled;
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <aside className="rounded-xl border border-white/10 bg-background/40 backdrop-blur-md p-4">
        <h2 className="font-display tracking-[0.1em] text-white">USUARIOS</h2>
        <ul className="mt-3 max-h-[60vh] overflow-y-auto divide-y divide-white/5">
          {profiles.map((p) => (
            <li key={p.user_id}>
              <button onClick={() => setSelectedUser(p.user_id)} className={`w-full text-left px-3 py-2 rounded-md text-sm ${selectedUser === p.user_id ? "bg-aureon-orange/20 text-white" : "text-muted-foreground hover:text-white hover:bg-white/5"}`}>
                <div className="font-medium">{p.full_name || p.email}</div>
                <div className="text-xs opacity-70">{p.email}</div>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="lg:col-span-2">
        {selectedUser ? (
          <>
            <div className="rounded-xl border border-white/10 bg-background/40 backdrop-blur-md p-4">
              <h2 className="font-display tracking-[0.1em] text-white">MÓDULOS ASIGNADOS</h2>
              <table className="w-full mt-3 text-sm">
                <thead className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
                  <tr><th className="text-left p-2">Módulo</th><th className="p-2">Inicio</th><th className="p-2">Fin</th><th></th></tr>
                </thead>
                <tbody>
                  {assigned.map((a) => (
                    <Fragment key={a.id}>
                      <tr className="border-t border-white/5 text-white">
                        <td className="p-2">{a.mod?.label ?? a.module_id}</td>
                        <td className="p-2 text-center"><Input type="date" value={a.starts_at} onChange={(e) => update(a, "starts_at", e.target.value)} className="h-8 text-xs bg-background/50 border-white/20 text-white" /></td>
                        <td className="p-2 text-center"><Input type="date" value={a.ends_at} onChange={(e) => update(a, "ends_at", e.target.value)} className="h-8 text-xs bg-background/50 border-white/20 text-white" /></td>
                        <td className="p-2 text-right"><button onClick={() => remove(a)} className="text-aureon-red"><Trash2 className="w-4 h-4" /></button></td>
                      </tr>
                      {a.mod?.key === "tareas" && (
                        <tr className="border-t border-white/5 bg-white/[0.02]">
                          <td colSpan={4} className="p-3">
                            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Sub-módulos · Activan/desactivan al activar el principal</div>
                            <ul className="pl-4 text-xs text-muted-foreground space-y-1 mb-3">
                              <li>• Añadir nueva tarea</li>
                              <li>• Ver tareas</li>
                              <li>• Buscar tareas</li>
                              <li>• Gestión de entrenamientos</li>
                            </ul>
                            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Sub-módulos · Control independiente</div>
                            <div className="pl-4 space-y-2">
                              {CHILD_KEYS.map((ck) => (
                                <div key={ck} className="flex items-center justify-between rounded-md bg-background/40 border border-white/10 px-3 py-2">
                                  <span className="text-sm text-white">{CHILD_LABELS[ck]}</span>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[10px] uppercase tracking-[0.2em] ${childEnabled(ck) ? "text-aureon-orange" : "text-muted-foreground"}`}>
                                      {childEnabled(ck) ? "Activo" : "Bloqueado"}
                                    </span>
                                    <Switch
                                      checked={childEnabled(ck)}
                                      onCheckedChange={(v) => toggleChild(ck, v)}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                  {assigned.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">Sin módulos asignados.</td></tr>}
                </tbody>
              </table>
            </div>

            <form onSubmit={add} className="mt-4 rounded-xl border border-white/10 bg-background/40 backdrop-blur-md p-4 grid sm:grid-cols-4 gap-3 items-end">
              <div className="sm:col-span-2">
                <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Módulo</Label>
                <select value={newModId} onChange={(e) => setNewModId(e.target.value)} required className="mt-1 w-full h-10 rounded-md bg-background/50 border border-white/20 text-white px-2 text-sm">
                  <option value="">— Selecciona —</option>
                  {availableMods.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Inicio</Label>
                <Input type="date" value={newStarts} onChange={(e) => setNewStarts(e.target.value)} className="mt-1 bg-background/50 border-white/20 text-white" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Fin</Label>
                <Input type="date" value={newEnds} onChange={(e) => setNewEnds(e.target.value)} className="mt-1 bg-background/50 border-white/20 text-white" />
              </div>
              <div className="sm:col-span-4">
                <Button type="submit" className="bg-aureon-orange text-black hover:bg-aureon-orange/90"><Plus className="w-4 h-4 mr-1" />Asignar</Button>
              </div>
            </form>
          </>
        ) : (
          <div className="rounded-xl border border-white/10 bg-background/40 backdrop-blur-md p-8 text-center text-muted-foreground">Selecciona un usuario para gestionar sus módulos.</div>
        )}
      </section>
    </div>
  );
}
