import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ModuleShell } from "@/components/ModuleShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, Link as LinkIcon, X } from "lucide-react";
import { categoriesFor, type ScoutingSide } from "@/lib/scouting";

export const Route = createFileRoute("/scouting/nuevo")({
  head: () => ({ meta: [{ title: "Nuevo clip de scouting — Aureon Futsal Pro Suite" }] }),
  component: NuevoClip,
});

type Season = { id: string; name: string; is_active: boolean };
type STeam = { id: string; name: string; season_id: string };

function NuevoClip() {
  const navigate = useNavigate();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [teams, setTeams] = useState<STeam[]>([]);
  const [seasonId, setSeasonId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [side, setSide] = useState<ScoutingSide | "">("");
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [mode, setMode] = useState<"upload" | "external">("upload");
  const [videoUrl, setVideoUrl] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const [{ data: s }, { data: st }] = await Promise.all([
        supabase.from("seasons").select("id,name,is_active").order("created_at", { ascending: false }),
        supabase.from("season_teams").select("id,name,season_id"),
      ]);
      const ss = (s as Season[]) ?? [];
      setSeasons(ss);
      setTeams((st as STeam[]) ?? []);
      const active = ss.find(x => x.is_active) ?? ss[0];
      if (active) setSeasonId(active.id);
    })();
  }, []);

  const teamsFiltered = teams.filter(t => t.season_id === seasonId);

  const addTag = () => {
    const v = tagInput.trim();
    if (!v) return;
    if (!tags.includes(v)) setTags([...tags, v]);
    setTagInput("");
  };

  const handleUpload = async (file: File) => {
    if (file.size > 200 * 1024 * 1024) {
      toast.error("El vídeo debe ser menor de 200MB");
      return;
    }
    setUploading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { toast.error("Debes iniciar sesión"); setUploading(false); return; }
    const ext = file.name.split(".").pop() || "mp4";
    const path = `${u.user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("scouting-clips").upload(path, file, { cacheControl: "3600", upsert: false });
    if (error) { toast.error("Error al subir el vídeo: " + error.message); setUploading(false); return; }
    // Bucket is private; store the storage path so the viewer can generate signed URLs.
    setVideoUrl(`storage://scouting-clips/${path}`);
    setUploading(false);
    toast.success("Vídeo subido");
  };

  const save = async () => {
    if (!teamId) { toast.error("Selecciona el equipo (obligatorio)"); return; }
    if (!side) { toast.error("Selecciona ofensivo o defensivo"); return; }
    if (!category) { toast.error("Selecciona la categoría"); return; }
    const finalUrl = mode === "upload" ? videoUrl : externalUrl.trim();
    if (!finalUrl) { toast.error("Sube un vídeo o pega un enlace"); return; }
    setSaving(true);
    const { data: ins, error } = await supabase.from("scouting_clips").insert({
      season_team_id: teamId,
      side,
      category,
      title: title.trim(),
      notes: notes.trim(),
      tags,
      video_url: finalUrl,
      source: mode,
    }).select("id").maybeSingle();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Clip guardado");
    if (ins?.id) navigate({ to: "/scouting/$clipId", params: { clipId: ins.id } });
    else navigate({ to: "/scouting" });
  };

  return (
    <ModuleShell title="NUEVO CLIP" subtitle="Subida de vídeo de scouting">
      <div className="rounded-2xl border border-white/10 bg-background/60 backdrop-blur p-5 sm:p-7 space-y-5 max-w-3xl">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-foreground font-semibold">Temporada</Label>
            <Select value={seasonId} onValueChange={(v) => { setSeasonId(v); setTeamId(""); }}>
              <SelectTrigger><SelectValue placeholder="Selecciona temporada" /></SelectTrigger>
              <SelectContent>
                {seasons.map(s => <SelectItem key={s.id} value={s.id}>{s.name}{s.is_active ? " ★" : ""}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-foreground font-semibold">Equipo (obligatorio)</Label>
            <Select value={teamId} onValueChange={setTeamId}>
              <SelectTrigger><SelectValue placeholder="Selecciona equipo" /></SelectTrigger>
              <SelectContent>
                {teamsFiltered.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-foreground font-semibold">Lado</Label>
            <Select value={side} onValueChange={(v) => { setSide(v as ScoutingSide); setCategory(""); }}>
              <SelectTrigger><SelectValue placeholder="Ofensivo / Defensivo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="offensive">Acción ofensiva</SelectItem>
                <SelectItem value="defensive">Acción defensiva</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-foreground font-semibold">Categoría</Label>
            <Select value={category} onValueChange={setCategory} disabled={!side}>
              <SelectTrigger><SelectValue placeholder="Selecciona categoría" /></SelectTrigger>
              <SelectContent>
                {side && categoriesFor(side).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-foreground font-semibold">Título</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} placeholder="Ej. Salida de presión 2-2" />
        </div>

        <div className="space-y-2">
          <Label className="text-foreground font-semibold">Notas / descripción</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={1000} />
        </div>

        <div className="space-y-2">
          <Label className="text-foreground font-semibold">Etiquetas</Label>
          <div className="flex gap-2">
            <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} placeholder="Añadir etiqueta y Enter" />
            <Button type="button" variant="outline" onClick={addTag}>Añadir</Button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {tags.map(t => (
                <span key={t} className="text-xs bg-white/10 px-2 py-0.5 rounded inline-flex items-center gap-1">
                  {t}
                  <button onClick={() => setTags(tags.filter(x => x !== t))} className="hover:text-aureon-red"><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-foreground font-semibold">Vídeo</Label>
          <div className="flex gap-2 mb-2">
            <Button type="button" variant={mode === "upload" ? "default" : "outline"} size="sm" onClick={() => setMode("upload")}><Upload className="w-3.5 h-3.5 mr-1" /> Subir archivo</Button>
            <Button type="button" variant={mode === "external" ? "default" : "outline"} size="sm" onClick={() => setMode("external")}><LinkIcon className="w-3.5 h-3.5 mr-1" /> Enlace externo</Button>
          </div>
          {mode === "upload" ? (
            <div className="space-y-2">
              <input ref={fileRef} type="file" accept="video/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? "Subiendo…" : videoUrl ? "Reemplazar vídeo" : "Seleccionar archivo de vídeo"}
              </Button>
              {videoUrl && <video src={videoUrl} controls className="max-w-md rounded border border-white/10" />}
            </div>
          ) : (
            <Input value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=… o enlace directo a vídeo" />
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => navigate({ to: "/scouting" })}>Cancelar</Button>
          <Button onClick={save} disabled={saving || uploading}>{saving ? "Guardando…" : "Guardar clip"}</Button>
        </div>
      </div>
    </ModuleShell>
  );
}
