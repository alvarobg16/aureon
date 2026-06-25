import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/modulos")({
  component: AdminModules,
});

type Mod = { id: string; key: string; label: string; route: string; is_system: boolean };

function AdminModules() {
  const [mods, setMods] = useState<Mod[]>([]);
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [route, setRoute] = useState("");

  const load = async () => {
    const { data } = await supabase.from("modules").select("*").order("is_system", { ascending: false }).order("label");
    setMods((data ?? []) as Mod[]);
  };
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("modules").insert({ key, label, route, is_system: false });
    if (error) { toast.error(error.message); return; }
    toast.success("Módulo creado");
    setKey(""); setLabel(""); setRoute(""); load();
    await supabase.from("activity_logs").insert({
      user_id: (await supabase.auth.getUser()).data.user?.id,
      action: "admin_create_module", metadata: { key, label } as never,
    });
  };

  const remove = async (m: Mod) => {
    if (m.is_system) { toast.error("No se pueden eliminar módulos del sistema"); return; }
    if (!confirm(`Eliminar módulo ${m.label}?`)) return;
    const { error } = await supabase.from("modules").delete().eq("id", m.id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <section className="lg:col-span-2 rounded-xl border border-white/10 bg-background/40 backdrop-blur-md overflow-hidden">
        <h2 className="p-4 font-display tracking-[0.1em] text-white border-b border-white/10">CATÁLOGO</h2>
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
            <tr><th className="text-left p-3">Etiqueta</th><th className="text-left p-3">Key</th><th className="text-left p-3">Ruta</th><th className="p-3">Tipo</th><th></th></tr>
          </thead>
          <tbody>
            {mods.map((m) => (
              <tr key={m.id} className="border-t border-white/5 text-white">
                <td className="p-3">{m.label}</td>
                <td className="p-3 font-mono text-xs text-muted-foreground">{m.key}</td>
                <td className="p-3 font-mono text-xs text-muted-foreground">{m.route}</td>
                <td className="p-3 text-center text-xs">{m.is_system ? <span className="text-aureon-orange">Sistema</span> : "Custom"}</td>
                <td className="p-3 text-right">
                  {!m.is_system && <button onClick={() => remove(m)} className="text-aureon-red hover:text-aureon-red/80"><Trash2 className="w-4 h-4" /></button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <aside className="rounded-xl border border-white/10 bg-background/40 backdrop-blur-md p-4">
        <h2 className="font-display tracking-[0.1em] text-white">NUEVO MÓDULO</h2>
        <form onSubmit={create} className="mt-4 space-y-3">
          <div>
            <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Etiqueta</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} required className="mt-1 bg-background/50 border-white/20 text-white" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Key (única)</Label>
            <Input value={key} onChange={(e) => setKey(e.target.value)} required pattern="[a-z0-9._-]+" className="mt-1 bg-background/50 border-white/20 text-white" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Ruta</Label>
            <Input value={route} onChange={(e) => setRoute(e.target.value)} placeholder="/mi-modulo" className="mt-1 bg-background/50 border-white/20 text-white" />
          </div>
          <Button type="submit" className="w-full bg-aureon-orange text-black hover:bg-aureon-orange/90">Crear</Button>
        </form>
      </aside>
    </div>
  );
}
