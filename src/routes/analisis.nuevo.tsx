import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ModuleShell } from "@/components/ModuleShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Upload, Link2 } from "lucide-react";
import { detectExternalKind } from "@/lib/videoEmbed";

export const Route = createFileRoute("/analisis/nuevo")({
  head: () => ({ meta: [{ title: "Nuevo vídeo de análisis — Aureon Futsal Pro Suite" }] }),
  component: NuevoVideo,
});

type Mode = "upload" | "external";

function NuevoVideo() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>("upload");
  const [title, setTitle] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [opponent, setOpponent] = useState("");
  const [competition, setCompetition] = useState("");
  const [notes, setNotes] = useState("");
  const [storagePath, setStoragePath] = useState<string | null>(null);
  const [externalUrl, setExternalUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("video/")) {
      toast.error("Selecciona un archivo de vídeo (mp4, mov, avi…)");
      return;
    }
    setUploading(true);
    setProgress(10);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { toast.error("Debes iniciar sesión"); setUploading(false); return; }
    const ext = file.name.split(".").pop() || "mp4";
    const path = `${u.user.id}/${crypto.randomUUID()}.${ext}`;
    setProgress(30);
    const { error } = await supabase.storage.from("analysis-videos").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });
    if (error) {
      toast.error("Error al subir: " + error.message);
      setUploading(false);
      return;
    }
    setProgress(100);
    setStoragePath(path);
    if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ""));
    toast.success("Vídeo subido");
    setUploading(false);
  };

  const externalKind = externalUrl ? detectExternalKind(externalUrl) : "unknown";

  const save = async () => {
    let video_url: string | null = null;
    let source: "upload" | "external" = "upload";
    if (mode === "upload") {
      if (!storagePath) { toast.error("Sube primero un vídeo"); return; }
      video_url = `storage://analysis-videos/${storagePath}`;
      source = "upload";
    } else {
      const url = externalUrl.trim();
      if (!url) { toast.error("Pega una URL de YouTube, Vimeo o de un MP4"); return; }
      if (externalKind === "unknown") {
        toast.error("URL no reconocida. Usa YouTube, Vimeo o un enlace directo a .mp4/.webm/.m3u8");
        return;
      }
      video_url = url;
      source = "external";
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("analysis_videos")
      .insert({
        title: title.trim(),
        match_date: matchDate || null,
        opponent: opponent.trim(),
        competition: competition.trim(),
        notes: notes.trim(),
        video_url,
        source,
      })
      .select("id")
      .maybeSingle();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Vídeo guardado");
    if (data?.id) navigate({ to: "/analisis/$videoId", params: { videoId: data.id } });
    else navigate({ to: "/analisis" });
  };

  const canSave = mode === "upload" ? !!storagePath : externalUrl.trim().length > 0 && externalKind !== "unknown";

  return (
    <ModuleShell title="NUEVO VÍDEO" subtitle="Subida de partido para análisis" moduleKey="tareas">
      <div className="rounded-2xl border border-white/10 bg-background/60 backdrop-blur p-5 sm:p-7 space-y-5 max-w-3xl">
        {/* Selector de origen */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant={mode === "upload" ? "default" : "outline"}
            onClick={() => setMode("upload")}
          >
            <Upload className="w-4 h-4 mr-1" /> Subir archivo
          </Button>
          <Button
            type="button"
            variant={mode === "external" ? "default" : "outline"}
            onClick={() => setMode("external")}
          >
            <Link2 className="w-4 h-4 mr-1" /> Desde URL (YouTube / Vimeo / MP4)
          </Button>
        </div>

        {mode === "upload" ? (
          <div className="space-y-2">
            <Label className="text-foreground font-semibold">Archivo de vídeo (mp4, mov, avi)</Label>
            <input ref={fileRef} type="file" accept="video/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
              <Upload className="w-4 h-4 mr-1" />
              {uploading ? `Subiendo… ${progress}%` : storagePath ? "Reemplazar vídeo" : "Seleccionar archivo"}
            </Button>
            {storagePath && <p className="text-xs text-emerald-400">✓ Vídeo subido correctamente</p>}
          </div>
        ) : (
          <div className="space-y-2">
            <Label className="text-foreground font-semibold">URL del vídeo</Label>
            <Input
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=… · https://vimeo.com/… · https://.../partido.mp4"
            />
            {externalUrl && (
              <p className={`text-xs ${externalKind === "unknown" ? "text-red-400" : "text-emerald-400"}`}>
                {externalKind === "youtube" && "✓ YouTube detectado"}
                {externalKind === "vimeo" && "✓ Vimeo detectado"}
                {externalKind === "direct" && "✓ Enlace directo de vídeo detectado"}
                {externalKind === "unknown" && "URL no reconocida (usa YouTube, Vimeo o .mp4/.webm/.m3u8)"}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground">
              Nota: en vídeos de YouTube/Vimeo solo es posible reproducir y marcar eventos; la exportación de clips solo está disponible para vídeos subidos o enlaces directos a MP4.
            </p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-foreground font-semibold">Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. Jornada 12 vs Rival FC" />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground font-semibold">Fecha del partido</Label>
            <Input type="date" value={matchDate} onChange={(e) => setMatchDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground font-semibold">Rival</Label>
            <Input value={opponent} onChange={(e) => setOpponent(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground font-semibold">Competición</Label>
            <Input value={competition} onChange={(e) => setCompetition(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-foreground font-semibold">Notas</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => navigate({ to: "/analisis" })}>Cancelar</Button>
          <Button onClick={save} disabled={saving || uploading || !canSave}>{saving ? "Guardando…" : "Guardar y abrir"}</Button>
        </div>
      </div>
    </ModuleShell>
  );
}
