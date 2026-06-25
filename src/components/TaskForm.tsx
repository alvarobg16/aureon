import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES, SECONDARY_OPTIONS, ABP_PRESETS, CATEGORIES_WITH_DETAIL, normalizeCategory, type Category, type SecondaryCategory, categoryStyle } from "@/lib/tasks";
import { Upload, ImagePlus, Loader2, Film, Video, X } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

export type TaskFormInitial = {
  id?: string;
  user_id?: string;
  task_number?: number;
  description?: string;
  keywords?: string;
  category?: string;
  secondary_category?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  surface?: string;
  players?: string;
  material?: string;
  duration?: string;
  other_notes?: string;
};

export function TaskForm({ initial, mode }: { initial?: TaskFormInitial; mode: "create" | "edit" }) {
  const navigate = useNavigate();
  const imgInputRef = useRef<HTMLInputElement>(null);
  const vidInputRef = useRef<HTMLInputElement>(null);

  const [imgFile, setImgFile] = useState<File | null>(null);
  const [imgPreview, setImgPreview] = useState<string | null>(initial?.image_url ?? null);
  const [vidFile, setVidFile] = useState<File | null>(null);
  const [vidPreview, setVidPreview] = useState<string | null>(initial?.video_url ?? null);

  const [description, setDescription] = useState(initial?.description ?? "");
  const [keywords, setKeywords] = useState(initial?.keywords ?? "");
  const initialCategory = (normalizeCategory(initial?.category) as Category) || "Fundamentos Ofensivos";
  const initialSecondaryRaw = initial?.secondary_category ?? "";
  const isModeloInit = initialCategory === "Modelo de juego";
  const [category, setCategory] = useState<Category>(initialCategory);
  // Selector secundario solo se usa con "Modelo de juego"
  const [secondary, setSecondary] = useState<SecondaryCategory | "">(
    isModeloInit ? ((normalizeCategory(initialSecondaryRaw) as SecondaryCategory) || "") : "",
  );
  // Texto libre / detalle para Fundamentos Of/Def y ABP
  const [detail, setDetail] = useState<string>(!isModeloInit ? initialSecondaryRaw : "");
  const [surface, setSurface] = useState(initial?.surface ?? "");
  const [players, setPlayers] = useState(initial?.players ?? "");
  const [material, setMaterial] = useState(initial?.material ?? "");
  const [duration, setDuration] = useState(initial?.duration ?? "");
  const [otherNotes, setOtherNotes] = useState(initial?.other_notes ?? "");
  const [saving, setSaving] = useState(false);
  const [numberMode, setNumberMode] = useState<"auto" | "manual">(initial?.task_number ? "manual" : "auto");
  const [taskNumber, setTaskNumber] = useState<string>(initial?.task_number ? String(initial.task_number) : "");

  // Limpia campos no aplicables al cambiar de categoría
  useEffect(() => {
    if (category !== "Modelo de juego" && secondary) setSecondary("");
    if (!CATEGORIES_WITH_DETAIL.includes(category) && detail) setDetail("");
  }, [category, secondary, detail]);

  const handleImg = (f?: File) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("El archivo debe ser una imagen");
    setImgFile(f);
    const r = new FileReader();
    r.onload = (e) => setImgPreview(e.target?.result as string);
    r.readAsDataURL(f);
  };

  const handleVid = (f?: File) => {
    if (!f) return;
    if (!f.type.startsWith("video/")) return toast.error("El archivo debe ser un vídeo");
    if (f.size > 500 * 1024 * 1024) return toast.error("El vídeo no puede superar 500MB");
    setVidFile(f);
    setVidPreview(URL.createObjectURL(f));
  };

  const upload = async (bucket: string, file: File) => {
    const ext = file.name.split(".").pop() ?? "bin";
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id;
    if (!uid) throw new Error("Debes iniciar sesión");
    const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });
    if (error) throw error;
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let imageUrl = imgPreview ? (initial?.image_url ?? null) : null;
      let videoUrl = vidPreview ? (initial?.video_url ?? null) : null;
      if (imgFile) imageUrl = await upload("task-images", imgFile);
      if (vidFile) videoUrl = await upload("task-videos", vidFile);

      // Validación de numeración manual (scoped por usuario propietario)
      let manualNumber: number | null = null;
      if (numberMode === "manual") {
        const n = parseInt(taskNumber, 10);
        if (!Number.isFinite(n) || n <= 0) {
          toast.error("Introduce un número de tarea válido (>0)");
          setSaving(false);
          return;
        }
        // Determinar el user_id propietario: en edición el del registro, en creación el usuario actual.
        const ownerId = initial?.user_id ?? (await supabase.auth.getUser()).data.user?.id ?? null;
        if (ownerId) {
          const { data: dup } = await supabase
            .from("tasks")
            .select("id")
            .eq("task_number", n)
            .eq("user_id", ownerId)
            .neq("id", initial?.id ?? "00000000-0000-0000-0000-000000000000")
            .maybeSingle();
          if (dup) {
            toast.error(`El número #${String(n).padStart(3, "0")} ya está en uso`);
            setSaving(false);
            return;
          }
        }
        manualNumber = n;
      }

      const basePayload = {
        description,
        keywords,
        category,
        secondary_category:
          category === "Modelo de juego"
            ? (secondary || null)
            : (CATEGORIES_WITH_DETAIL.includes(category) && detail.trim() ? detail.trim() : null),
        image_url: imageUrl,
        video_url: videoUrl,
        surface,
        players,
        material,
        duration,
        other_notes: otherNotes,
      };
      const payload = manualNumber !== null
        ? { ...basePayload, task_number: manualNumber }
        : (mode === "edit" && initial?.task_number
            ? { ...basePayload, task_number: initial.task_number }
            : basePayload);

      if (mode === "edit" && initial?.id) {
        const { error } = await supabase.from("tasks").update(payload).eq("id", initial.id);
        if (error) throw error;
        toast.success("Tarea actualizada");
      } else {
        const { error } = await supabase.from("tasks").insert(payload);
        if (error) throw error;
        toast.success("Tarea creada");
      }
      navigate({ to: "/tareas" });
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ? `Error: ${err.message}` : "Error al guardar la tarea");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid lg:grid-cols-2 gap-6">
      {/* Columna izquierda: campos */}
      <div className="space-y-5 bg-card rounded-2xl border border-border/60 shadow-card p-6">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Imagen</Label>
            <input ref={imgInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImg(e.target.files?.[0])} />
            <Button type="button" onClick={() => imgInputRef.current?.click()} className="mt-2 w-full h-12 border-2 border-dashed border-aureon-blue/60 bg-aureon-blue text-white hover:brightness-110">
              <Upload className="w-4 h-4 mr-2" />
              {imgPreview ? "Cambiar" : "Cargar"}
            </Button>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Clip de vídeo</Label>
            <input ref={vidInputRef} type="file" accept="video/*" className="hidden" onChange={(e) => handleVid(e.target.files?.[0])} />
            <Button type="button" onClick={() => vidInputRef.current?.click()} className="mt-2 w-full h-12 border-2 border-dashed border-aureon-blue/60 bg-aureon-blue text-white hover:brightness-110">
              <Film className="w-4 h-4 mr-2" />
              {vidPreview ? "Cambiar" : "Cargar"}
            </Button>
          </div>
        </div>

        <div>
          <Label htmlFor="kw" className="text-xs uppercase tracking-wider text-muted-foreground">Palabras clave</Label>
          <Input id="kw" placeholder="ej: pressing, salida balón, 3-1" value={keywords} onChange={(e) => setKeywords(e.target.value)} className="mt-2" />
        </div>

        <div>
          <Label htmlFor="desc" className="text-xs uppercase tracking-wider text-muted-foreground">Descripción</Label>
          <Textarea id="desc" placeholder="Describe la tarea..." value={description} onChange={(e) => setDescription(e.target.value)} className="mt-2 min-h-[120px]" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="surface" className="text-xs uppercase tracking-wider text-muted-foreground">Superficie de juego</Label>
            <Input id="surface" placeholder="ej: pista completa" value={surface} onChange={(e) => setSurface(e.target.value)} className="mt-2" />
          </div>
          <div>
            <Label htmlFor="players" className="text-xs uppercase tracking-wider text-muted-foreground">Nº de jugadores</Label>
            <Input id="players" placeholder="ej: 4 vs 4 + P" value={players} onChange={(e) => setPlayers(e.target.value)} className="mt-2" />
          </div>
          <div>
            <Label htmlFor="material" className="text-xs uppercase tracking-wider text-muted-foreground">Material</Label>
            <Input id="material" placeholder="ej: 6 conos, 2 picas" value={material} onChange={(e) => setMaterial(e.target.value)} className="mt-2" />
          </div>
          <div>
            <Label htmlFor="duration" className="text-xs uppercase tracking-wider text-muted-foreground">Tiempo</Label>
            <Input id="duration" placeholder="ej: 4 x 3 min" value={duration} onChange={(e) => setDuration(e.target.value)} className="mt-2" />
          </div>
        </div>

        <div>
          <Label htmlFor="other" className="text-xs uppercase tracking-wider text-muted-foreground">Otros aspectos</Label>
          <Textarea id="other" placeholder="Variantes, observaciones..." value={otherNotes} onChange={(e) => setOtherNotes(e.target.value)} className="mt-2 min-h-[80px]" />
        </div>

        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Concepto</Label>
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CATEGORIES.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setCategory(c)}
                className={`py-2.5 px-2 rounded-lg font-display tracking-wider text-sm sm:text-base border transition-all text-center leading-tight ${
                  category === c
                    ? `${categoryStyle(c)} border-transparent shadow-card scale-[1.02]`
                    : "bg-background text-foreground border-border hover:border-primary/50"
                }`}
              >
                {c.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {(category === "Fundamentos Ofensivos" || category === "Fundamentos Defensivos" || category === "Aspecto Condicional") && (
          <div>
            <Label htmlFor="detail" className="text-xs uppercase tracking-wider text-muted-foreground">
              {category === "Aspecto Condicional" ? "Detalle del aspecto condicional" : "Detalle del fundamento"}
            </Label>
            <Input
              id="detail"
              placeholder={
                category === "Fundamentos Ofensivos"
                  ? "ej: conducción, pase interior, finalización..."
                  : category === "Fundamentos Defensivos"
                  ? "ej: marcaje, coberturas, repliegue..."
                  : "ej: resistencia, velocidad, fuerza, agilidad, coordinación..."
              }
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              className="mt-2"
            />
          </div>
        )}

        {category === "ABP" && (
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Tipo de ABP</Label>
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ABP_PRESETS.map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setDetail(p)}
                  className={`py-2 rounded-lg font-display tracking-wider text-sm border transition-all ${
                    detail === p
                      ? "bg-accent text-accent-foreground border-transparent shadow-card"
                      : "bg-background text-foreground border-border hover:border-primary/50"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <Input
              placeholder="O escribe un detalle personalizado..."
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              className="mt-2"
            />
          </div>
        )}

        {category === "Modelo de juego" && (
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Aplicado a (opcional)
            </Label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSecondary("")}
                className={`py-2 rounded-lg text-sm border transition-all ${
                  secondary === "" ? "bg-muted text-foreground border-primary" : "bg-background text-foreground border-border hover:border-primary/50"
                }`}
              >
                —
              </button>
              {SECONDARY_OPTIONS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setSecondary(c)}
                  className={`py-2 rounded-lg font-display tracking-wider border transition-all ${
                    secondary === c
                      ? `${categoryStyle(c)} border-transparent shadow-card`
                      : "bg-background text-foreground border-border hover:border-primary/50"
                  }`}
                >
                  {c.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-lg border border-border p-3 space-y-2 bg-muted/30">
          <Label className="text-xs uppercase tracking-wider text-foreground font-semibold">Numeración</Label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setNumberMode("auto")}
              className={`flex-1 py-2 rounded-md text-sm font-semibold border transition-colors ${numberMode === "auto" ? "bg-aureon-orange text-black border-transparent shadow-sm" : "bg-card text-foreground border-border hover:bg-muted"}`}>
              Automática
            </button>
            <button type="button" onClick={() => setNumberMode("manual")}
              className={`flex-1 py-2 rounded-md text-sm font-semibold border transition-colors ${numberMode === "manual" ? "bg-aureon-orange text-black border-transparent shadow-sm" : "bg-card text-foreground border-border hover:bg-muted"}`}>
              Manual
            </button>
          </div>
          {numberMode === "manual" && (
            <Input type="number" min={1} value={taskNumber} onChange={(e) => setTaskNumber(e.target.value)}
              placeholder="Ej: 5, 18, 102…" className="bg-card text-foreground border-border placeholder:text-muted-foreground" />
          )}
          {numberMode === "auto" && mode === "edit" && initial?.task_number && (
            <p className="text-xs text-foreground/80">Número actual: <span className="font-semibold">#{String(initial.task_number).padStart(3, "0")}</span></p>
          )}
        </div>

        <Button type="submit" disabled={saving} className="w-full h-12 font-display text-lg tracking-wider bg-aureon-orange text-black hover:bg-aureon-orange/90">
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> GUARDANDO...
            </>
          ) : mode === "edit" ? (
            "GUARDAR CAMBIOS"
          ) : (
            "GUARDAR TAREA"
          )}
        </Button>
      </div>

      {/* Columna derecha: preview */}
      <div className="space-y-4">
        <div className="bg-card rounded-2xl border border-border/60 shadow-card p-6 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Vista previa imagen</Label>
            {imgPreview && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setImgFile(null); setImgPreview(null); if (imgInputRef.current) imgInputRef.current.value = ""; }}
                className="h-7 px-2 text-destructive hover:text-destructive"
              >
                <X className="w-4 h-4 mr-1" /> Quitar
              </Button>
            )}
          </div>
          <div className="min-h-[260px] rounded-xl bg-muted overflow-hidden flex items-center justify-center">
            {imgPreview ? (
              <img src={imgPreview} alt="Vista previa" className="w-full h-full object-contain" />
            ) : (
              <div className="text-center text-muted-foreground p-8">
                <ImagePlus className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="text-sm">La imagen aparecerá aquí</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border/60 shadow-card p-6 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Vista previa vídeo</Label>
            {vidPreview && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setVidFile(null); setVidPreview(null); if (vidInputRef.current) vidInputRef.current.value = ""; }}
                className="h-7 px-2 text-destructive hover:text-destructive"
              >
                <X className="w-4 h-4 mr-1" /> Quitar
              </Button>
            )}
          </div>
          <div className="min-h-[200px] rounded-xl bg-black/90 overflow-hidden flex items-center justify-center">
            {vidPreview ? (
              <video src={vidPreview} controls className="w-full max-h-[320px]" />
            ) : (
              <div className="text-center text-muted-foreground p-8">
                <Video className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="text-sm">El vídeo aparecerá aquí al cargarlo</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
