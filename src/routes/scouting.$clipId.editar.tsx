import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ModuleShell } from "@/components/ModuleShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { X } from "lucide-react";
import { categoriesFor, type ScoutingClip, type ScoutingSide } from "@/lib/scouting";

export const Route = createFileRoute("/scouting/$clipId/editar")({
  head: () => ({ meta: [{ title: "Editar clip — Aureon Futsal Pro Suite" }] }),
  component: EditarClip,
});

type STeam = { id: string; name: string; season_id: string };

function EditarClip() {
  const { clipId } = Route.useParams();
  const navigate = useNavigate();
  const [clip, setClip] = useState<ScoutingClip | null>(null);
  const [teams, setTeams] = useState<STeam[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: c }, { data: st }] = await Promise.all([
        supabase.from("scouting_clips").select("*").eq("id", clipId).maybeSingle(),
        supabase.from("season_teams").select("id,name,season_id"),
      ]);
      setClip((c as ScoutingClip) ?? null);
      setTeams((st as STeam[]) ?? []);
    })();
  }, [clipId]);

  if (!clip) return <ModuleShell title="EDITAR CLIP"><p className="text-muted-foreground">Cargando…</p></ModuleShell>;

  const update = (patch: Partial<ScoutingClip>) => setClip({ ...clip, ...patch });
  const addTag = () => {
    const v = tagInput.trim();
    if (!v) return;
    if (!clip.tags.includes(v)) update({ tags: [...clip.tags, v] });
    setTagInput("");
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("scouting_clips").update({
      season_team_id: clip.season_team_id,
      side: clip.side,
      category: clip.category,
      title: clip.title,
      notes: clip.notes,
      tags: clip.tags,
      video_url: clip.video_url,
    }).eq("id", clip.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Clip actualizado");
    navigate({ to: "/scouting/$clipId", params: { clipId } });
  };

  return (
    <ModuleShell title="EDITAR CLIP" subtitle={clip.title}>
      <div className="rounded-2xl border border-white/10 bg-background/60 backdrop-blur p-5 sm:p-7 space-y-5 max-w-3xl">
        <div className="space-y-2">
          <Label className="text-foreground font-semibold">Equipo</Label>
          <Select value={clip.season_team_id} onValueChange={(v) => update({ season_team_id: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-foreground font-semibold">Lado</Label>
            <Select value={clip.side} onValueChange={(v) => update({ side: v as ScoutingSide, category: "" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="offensive">Acción ofensiva</SelectItem>
                <SelectItem value="defensive">Acción defensiva</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-foreground font-semibold">Categoría</Label>
            <Select value={clip.category} onValueChange={(v) => update({ category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {categoriesFor(clip.side).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-foreground font-semibold">Título</Label>
          <Input value={clip.title} onChange={(e) => update({ title: e.target.value })} maxLength={150} />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground font-semibold">Notas</Label>
          <Textarea value={clip.notes} onChange={(e) => update({ notes: e.target.value })} rows={3} maxLength={1000} />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground font-semibold">Etiquetas</Label>
          <div className="flex gap-2">
            <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} />
            <Button type="button" variant="outline" onClick={addTag}>Añadir</Button>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {clip.tags.map(t => (
              <span key={t} className="text-xs bg-white/10 px-2 py-0.5 rounded inline-flex items-center gap-1">
                {t}
                <button onClick={() => update({ tags: clip.tags.filter(x => x !== t) })}><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => navigate({ to: "/scouting/$clipId", params: { clipId } })}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
        </div>
      </div>
    </ModuleShell>
  );
}
