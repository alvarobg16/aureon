import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ModuleShell } from "@/components/ModuleShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, GripVertical, Save } from "lucide-react";
import { toast } from "sonner";
import type { AnalysisCategory } from "@/lib/analisis";

export const Route = createFileRoute("/analisis/categorias")({
  head: () => ({ meta: [{ title: "Categorías de análisis — Aureon Futsal Pro Suite" }] }),
  component: Categorias,
});

const PRESETS = [
  { name: "Gol a favor", color: "#22c55e" },
  { name: "Gol en contra", color: "#ef4444" },
  { name: "Ocasión clara", color: "#f59e0b" },
  { name: "Pérdida peligrosa", color: "#a855f7" },
  { name: "Falta", color: "#06b6d4" },
];

function Categorias() {
  const [cats, setCats] = useState<AnalysisCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("analysis_categories")
      .select("*")
      .order("order_index", { ascending: true });
    setCats((data as AnalysisCategory[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addCategory = async (preset?: { name: string; color: string }) => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data, error } = await supabase
      .from("analysis_categories")
      .insert({
        name: preset?.name ?? "Nueva categoría",
        color: preset?.color ?? "#3b82f6",
        icon: "flag",
        hotkey: "",
        pre_seconds: 5,
        post_seconds: 5,
        order_index: cats.length,
      })
      .select("*")
      .maybeSingle();
    if (error) { toast.error(error.message); return; }
    if (data) setCats([...cats, data as AnalysisCategory]);
  };

  const updateCat = (id: string, patch: Partial<AnalysisCategory>) => {
    setCats(cats.map(c => c.id === id ? { ...c, ...patch } : c));
  };

  const removeCat = async (id: string) => {
    if (!confirm("¿Eliminar esta categoría? Los eventos ya etiquetados no se borran, pero perderán el vínculo.")) return;
    const { error } = await supabase.from("analysis_categories").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setCats(cats.filter(c => c.id !== id));
  };

  const saveAll = async () => {
    setSaving(true);
    for (let i = 0; i < cats.length; i++) {
      const c = cats[i];
      await supabase
        .from("analysis_categories")
        .update({
          name: c.name,
          color: c.color,
          hotkey: c.hotkey,
          pre_seconds: c.pre_seconds,
          post_seconds: c.post_seconds,
          order_index: i,
        })
        .eq("id", c.id);
    }
    setSaving(false);
    toast.success("Categorías guardadas");
  };

  return (
    <ModuleShell
      title="CATEGORÍAS DE TAGGING"
      subtitle="Plantilla global · Se reutiliza en todos los partidos"
      moduleKey="tareas"
      actions={
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => addCategory()}><Plus className="w-4 h-4 mr-1" />Añadir</Button>
          <Button size="sm" onClick={saveAll} disabled={saving}><Save className="w-4 h-4 mr-1" />{saving ? "Guardando…" : "Guardar todo"}</Button>
        </div>
      }
    >
      {loading ? <p className="text-sm text-muted-foreground">Cargando…</p> : (
        <>
          {cats.length === 0 && (
            <div className="rounded-xl border border-white/10 bg-background/40 p-5 mb-5">
              <p className="text-sm text-foreground font-semibold mb-2">Empieza con presets</p>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map(p => (
                  <Button key={p.name} size="sm" variant="outline" onClick={() => addCategory(p)} style={{ borderColor: p.color }}>
                    <span className="w-2 h-2 rounded-full mr-1.5" style={{ background: p.color }} />
                    {p.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2 max-w-4xl">
            {cats.map(c => (
              <div key={c.id} className="rounded-lg border border-white/10 bg-background/60 backdrop-blur p-3 flex items-center gap-2 flex-wrap">
                <GripVertical className="w-4 h-4 text-muted-foreground" />
                <input
                  type="color"
                  value={c.color}
                  onChange={(e) => updateCat(c.id, { color: e.target.value })}
                  className="w-9 h-9 rounded cursor-pointer bg-transparent border border-white/10"
                />
                <Input value={c.name} onChange={(e) => updateCat(c.id, { name: e.target.value })} className="flex-1 min-w-[180px]" placeholder="Nombre" />
                <div className="flex items-center gap-1">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Tecla</Label>
                  <Input
                    value={c.hotkey}
                    onChange={(e) => updateCat(c.id, { hotkey: e.target.value.slice(0, 1).toUpperCase() })}
                    maxLength={1}
                    className="w-12 text-center"
                    placeholder="–"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Antes</Label>
                  <Input type="number" min={0} max={60} value={c.pre_seconds} onChange={(e) => updateCat(c.id, { pre_seconds: Number(e.target.value) || 0 })} className="w-16" />
                </div>
                <div className="flex items-center gap-1">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Después</Label>
                  <Input type="number" min={0} max={60} value={c.post_seconds} onChange={(e) => updateCat(c.id, { post_seconds: Number(e.target.value) || 0 })} className="w-16" />
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeCat(c.id)}><Trash2 className="w-4 h-4 text-aureon-red" /></Button>
              </div>
            ))}
          </div>
        </>
      )}
    </ModuleShell>
  );
}
