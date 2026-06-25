import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { ModuleShell } from "@/components/ModuleShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Play, Pause, SkipBack, SkipForward, Settings, Trash2, Edit2, Film,
  ChevronLeft, ChevronRight, ListVideo, X, Check, Download, Video, Loader2,
  Maximize2, Plus, Minus
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { fmtTime, getPlayableUrl, type AnalysisVideo, type AnalysisCategory, type AnalysisEvent } from "@/lib/analisis";
import { AnalysisPlayer, type PlayerHandle } from "@/components/AnalysisPlayer";
import { detectExternalKind } from "@/lib/videoEmbed";

export const Route = createFileRoute("/analisis/$videoId")({
  head: () => ({ meta: [{ title: "Análisis · Reproductor — Aureon Futsal Pro Suite" }] }),
  component: VideoAnalysis,
});

function VideoAnalysis() {
  const { videoId } = Route.useParams();
  const navigate = useNavigate();
  const videoRef = useRef<PlayerHandle | null>(null);

  const [video, setVideo] = useState<AnalysisVideo | null>(null);
  const [playUrl, setPlayUrl] = useState<string | null>(null);
  const [cats, setCats] = useState<AnalysisCategory[]>([]);
  const [events, setEvents] = useState<AnalysisEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1);

  const [defaultPre, setDefaultPre] = useState(5);
  const [defaultPost, setDefaultPost] = useState(5);

  const [activeClip, setActiveClip] = useState<AnalysisEvent | null>(null);
  const [editingEvent, setEditingEvent] = useState<AnalysisEvent | null>(null);
  const [filterCat, setFilterCat] = useState<string>("");
  const [showSummary, setShowSummary] = useState(false);

  // Selección y exportación
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStage, setExportStage] = useState("");

  // Popup de clip individual
  const [popupClip, setPopupClip] = useState<AnalysisEvent | null>(null);
  const popupPlayerRef = useRef<PlayerHandle | null>(null);

  // Load
  useEffect(() => {
    (async () => {
      const [vRes, cRes, eRes] = await Promise.all([
        supabase.from("analysis_videos").select("*").eq("id", videoId).maybeSingle(),
        supabase.from("analysis_categories").select("*").order("order_index"),
        supabase.from("analysis_events").select("*").eq("video_id", videoId).order("timestamp_seconds"),
      ]);
      const v = vRes.data as AnalysisVideo | null;
      setVideo(v);
      setCats((cRes.data as AnalysisCategory[]) ?? []);
      setEvents((eRes.data as AnalysisEvent[]) ?? []);
      if (v?.video_url) {
        const url = await getPlayableUrl(v.video_url);
        setPlayUrl(url);
      }
      setLoading(false);
    })();
  }, [videoId]);

  const togglePlay = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) el.play(); else el.pause();
  }, []);

  const seek = useCallback((delta: number) => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = Math.max(0, Math.min(el.duration || 0, el.currentTime + delta));
  }, []);

  const seekTo = useCallback((t: number) => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = Math.max(0, t);
  }, []);

  const setSpeed = (r: number) => {
    setRate(r);
    if (videoRef.current) videoRef.current.playbackRate = r;
  };

  const tagEvent = useCallback(async (cat: AnalysisCategory) => {
    const el = videoRef.current;
    if (!el) return;
    const t = el.currentTime;
    const { data, error } = await supabase
      .from("analysis_events")
      .insert({
        video_id: videoId,
        category_id: cat.id,
        category_name: cat.name,
        category_color: cat.color,
        timestamp_seconds: t,
        pre_seconds: defaultPre || cat.pre_seconds,
        post_seconds: defaultPost || cat.post_seconds,
        source: "manual",
      })
      .select("*")
      .maybeSingle();
    if (error) { toast.error(error.message); return; }
    if (data) {
      setEvents(prev => [...prev, data as AnalysisEvent].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds));
      toast.success(`${cat.name} · ${fmtTime(t)}`, { duration: 1500 });
    }
  }, [videoId, defaultPre, defaultPost]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (e.code === "Space") { e.preventDefault(); togglePlay(); return; }
      if (e.code === "ArrowLeft") { e.preventDefault(); seek(e.shiftKey ? -1 : -5); return; }
      if (e.code === "ArrowRight") { e.preventDefault(); seek(e.shiftKey ? 1 : 5); return; }
      if (e.key === ",") { e.preventDefault(); seek(-1 / 30); return; }
      if (e.key === ".") { e.preventDefault(); seek(1 / 30); return; }
      const k = e.key.toUpperCase();
      const cat = cats.find(c => c.hotkey && c.hotkey.toUpperCase() === k);
      if (cat) { e.preventDefault(); tagEvent(cat); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [cats, tagEvent, togglePlay, seek]);

  const onTime = () => {
    const el = videoRef.current;
    if (el) setCurrentTime(el.currentTime);
  };
  const onMeta = () => {
    const el = videoRef.current;
    if (el) setDuration(el.duration || 0);
  };

  const playClip = (ev: AnalysisEvent) => {
    const el = videoRef.current;
    if (!el) return;
    const start = Math.max(0, ev.timestamp_seconds - ev.pre_seconds);
    el.currentTime = start;
    el.play();
    setActiveClip(ev);
  };

  const filteredEvents = useCallback(() => {
    if (!filterCat) return events;
    return events.filter(e => e.category_id === filterCat || e.category_name === filterCat);
  }, [events, filterCat]);

  useEffect(() => {
    if (!activeClip) return;
    const el = videoRef.current;
    if (!el) return;
    const end = activeClip.timestamp_seconds + activeClip.post_seconds;
    const onUpdate = () => {
      if (el.currentTime >= end) {
        if (showSummary) {
          const filtered = filteredEvents();
          const idx = filtered.findIndex(x => x.id === activeClip.id);
          const next = filtered[idx + 1];
          if (next) {
            playClip(next);
          } else {
            el.pause();
            setActiveClip(null);
            setShowSummary(false);
            toast.success("Resumen completado");
          }
        } else {
          el.pause();
          setActiveClip(null);
        }
      }
    };
    el.addEventListener("timeupdate", onUpdate);
    return () => el.removeEventListener("timeupdate", onUpdate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClip, showSummary]);

  const playSummary = () => {
    const list = filteredEvents();
    if (list.length === 0) { toast.error("No hay eventos para reproducir"); return; }
    setShowSummary(true);
    playClip(list[0]);
  };

  const playSelection = () => {
    const list = filteredEvents().filter(e => selectedIds.has(e.id));
    if (list.length === 0) { toast.error("No has seleccionado clips"); return; }
    setShowSummary(true);
    playClip(list[0]);
  };

  const deleteEvent = async (id: string) => {
    if (!confirm("¿Eliminar este evento?")) return;
    const { error } = await supabase.from("analysis_events").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setEvents(events.filter(e => e.id !== id));
    setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  // Ajuste rápido de duración del clip (pre/post) en pasos
  const adjustClip = async (ev: AnalysisEvent, field: "pre_seconds" | "post_seconds", delta: number) => {
    const next = Math.max(0, Math.min(120, (ev[field] as number) + delta));
    if (next === ev[field]) return;
    const updated = { ...ev, [field]: next };
    setEvents(prev => prev.map(e => e.id === ev.id ? updated : e));
    if (popupClip?.id === ev.id) setPopupClip(updated);
    const patch: { pre_seconds?: number; post_seconds?: number } = { [field]: next };
    const { error } = await supabase.from("analysis_events").update(patch).eq("id", ev.id);
    if (error) { toast.error(error.message); }
  };

  const saveEdit = async () => {
    if (!editingEvent) return;
    const { error } = await supabase
      .from("analysis_events")
      .update({
        timestamp_seconds: editingEvent.timestamp_seconds,
        pre_seconds: editingEvent.pre_seconds,
        post_seconds: editingEvent.post_seconds,
        label: editingEvent.label,
        notes: editingEvent.notes,
      })
      .eq("id", editingEvent.id);
    if (error) { toast.error(error.message); return; }
    setEvents(events.map(e => e.id === editingEvent.id ? editingEvent : e).sort((a, b) => a.timestamp_seconds - b.timestamp_seconds));
    setEditingEvent(null);
    toast.success("Evento actualizado");
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };
  const selectAllVisible = () => {
    const list = filteredEvents();
    const allSel = list.every(e => selectedIds.has(e.id));
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (allSel) list.forEach(e => n.delete(e.id));
      else list.forEach(e => n.add(e.id));
      return n;
    });
  };

  const visibleEvents = filteredEvents();
  const sourceKind = video?.video_url ? detectExternalKind(video.video_url) : "unknown";
  const canExport = sourceKind !== "youtube" && sourceKind !== "vimeo";

  const eventsByCat = useMemo(() => {
    const map = new Map<string, AnalysisEvent[]>();
    for (const e of events) {
      const k = e.category_name || "(sin categoría)";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    }
    return Array.from(map.entries());
  }, [events]);

  // ============ EXPORTACIÓN con ffmpeg.wasm ============
  const ensureSelection = (): AnalysisEvent[] | null => {
    const list = visibleEvents.filter(e => selectedIds.has(e.id));
    if (list.length === 0) { toast.error("Selecciona al menos un clip"); return null; }
    return list;
  };

  const loadFFmpeg = async () => {
    setExportStage("Cargando motor de vídeo…");
    const { loadFFmpeg: load } = await import("@/lib/ffmpegLoader");
    return load(setExportStage);
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const sanitize = (s: string) => s.replace(/[^a-z0-9_\-]+/gi, "_").slice(0, 40) || "clip";

  // Fetch del vídeo source. Usa fetch directo para mejor manejo de CORS y errores.
  const fetchVideoBytes = async (): Promise<Uint8Array> => {
    if (!playUrl) throw new Error("Vídeo no disponible");
    setExportStage("Descargando vídeo…");
    const resp = await fetch(playUrl);
    if (!resp.ok) throw new Error(`No se pudo descargar el vídeo (${resp.status})`);
    const buf = await resp.arrayBuffer();
    return new Uint8Array(buf);
  };

  // Codifica un segmento normalizado (fps, escala, sar, audio) — necesario para concat fiable
  const encodeNormalizedSegment = async (
    ffmpeg: any, start: number, dur: number, outName: string, container: "ts" | "mp4",
  ) => {
    const args = [
      "-ss", String(start), "-i", "input.mp4", "-t", String(dur),
      "-vf", "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30",
      "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-ar", "44100", "-ac", "2", "-b:a", "128k",
    ];
    if (container === "ts") {
      args.push("-bsf:v", "h264_mp4toannexb", "-f", "mpegts", outName);
    } else {
      args.push("-movflags", "+faststart", outName);
    }
    await ffmpeg.exec(args);
  };

  const exportSelectedClips = async () => {
    const list = ensureSelection(); if (!list) return;
    if (!playUrl) { toast.error("Vídeo no disponible"); return; }
    setExporting(true); setExportProgress(0);
    try {
      const { ffmpeg } = await loadFFmpeg();
      ffmpeg.on("progress", ({ progress }: { progress: number }) =>
        setExportProgress(Math.max(0, Math.min(100, Math.round(progress * 100)))));
      const inputData = await fetchVideoBytes();
      await ffmpeg.writeFile("input.mp4", inputData);

      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const baseName = sanitize(video?.title || "partido");

      for (let i = 0; i < list.length; i++) {
        const ev = list[i];
        setExportStage(`Cortando clip ${i + 1}/${list.length}…`);
        const start = Math.max(0, ev.timestamp_seconds - ev.pre_seconds);
        const dur = Math.max(0.1, ev.pre_seconds + ev.post_seconds);
        const outName = `clip_${i + 1}.mp4`;
        await encodeNormalizedSegment(ffmpeg, start, dur, outName, "mp4");
        const data = (await ffmpeg.readFile(outName)) as Uint8Array;
        const fname = `${baseName}_${String(i + 1).padStart(2, "0")}_${sanitize(ev.category_name)}.mp4`;
        zip.file(fname, data);
        await ffmpeg.deleteFile(outName);
      }

      setExportStage("Comprimiendo en ZIP…");
      const zipBlob = await zip.generateAsync({ type: "blob" });
      downloadBlob(zipBlob, `${baseName}_clips.zip`);
      toast.success(`${list.length} clip(s) exportado(s)`);
    } catch (err: any) {
      console.error(err);
      toast.error("Error exportando: " + (err?.message || String(err)));
    } finally {
      setExporting(false); setExportStage(""); setExportProgress(0);
    }
  };

  const exportSingleClip = async (ev: AnalysisEvent) => {
    if (!playUrl) { toast.error("Vídeo no disponible"); return; }
    if (!canExport) { toast.error("Exportación no disponible para vídeos de YouTube/Vimeo"); return; }
    setExporting(true); setExportProgress(0);
    try {
      const { ffmpeg } = await loadFFmpeg();
      ffmpeg.on("progress", ({ progress }: { progress: number }) =>
        setExportProgress(Math.max(0, Math.min(100, Math.round(progress * 100)))));
      const inputData = await fetchVideoBytes();
      await ffmpeg.writeFile("input.mp4", inputData);
      setExportStage("Cortando clip…");
      const start = Math.max(0, ev.timestamp_seconds - ev.pre_seconds);
      const dur = Math.max(0.1, ev.pre_seconds + ev.post_seconds);
      const outName = "clip_one.mp4";
      await encodeNormalizedSegment(ffmpeg, start, dur, outName, "mp4");
      const data = (await ffmpeg.readFile(outName)) as Uint8Array;
      const blob = new Blob([data.buffer as ArrayBuffer], { type: "video/mp4" });
      const baseName = sanitize(video?.title || "partido");
      downloadBlob(blob, `${baseName}_${sanitize(ev.category_name)}_${Math.round(ev.timestamp_seconds)}s.mp4`);
      try { await ffmpeg.deleteFile(outName); } catch { /* noop */ }
      toast.success("Clip exportado");
    } catch (err: any) {
      console.error(err);
      toast.error("Error exportando: " + (err?.message || String(err)));
    } finally {
      setExporting(false); setExportStage(""); setExportProgress(0);
    }
  };

  const exportSummaryVideo = async () => {
    const list = ensureSelection(); if (!list) return;
    if (!playUrl) { toast.error("Vídeo no disponible"); return; }
    setExporting(true); setExportProgress(0);
    try {
      const { ffmpeg } = await loadFFmpeg();
      ffmpeg.on("progress", ({ progress }: { progress: number }) =>
        setExportProgress(Math.max(0, Math.min(100, Math.round(progress * 100)))));
      const inputData = await fetchVideoBytes();
      await ffmpeg.writeFile("input.mp4", inputData);

      const parts: string[] = [];
      for (let i = 0; i < list.length; i++) {
        const ev = list[i];
        setExportStage(`Generando clip ${i + 1}/${list.length}…`);
        const start = Math.max(0, ev.timestamp_seconds - ev.pre_seconds);
        const dur = Math.max(0.1, ev.pre_seconds + ev.post_seconds);
        const outName = `part_${i}.ts`;
        await encodeNormalizedSegment(ffmpeg, start, dur, outName, "ts");
        parts.push(outName);
      }
      setExportStage("Uniendo clips…");
      const concatInput = `concat:${parts.join("|")}`;
      await ffmpeg.exec([
        "-i", concatInput, "-c", "copy",
        "-bsf:a", "aac_adtstoasc", "-movflags", "+faststart",
        "summary.mp4",
      ]);
      const data = (await ffmpeg.readFile("summary.mp4")) as Uint8Array;
      const blob = new Blob([data.buffer as ArrayBuffer], { type: "video/mp4" });
      downloadBlob(blob, `${sanitize(video?.title || "resumen")}_resumen.mp4`);
      for (const p of parts) { try { await ffmpeg.deleteFile(p); } catch { /* noop */ } }
      try { await ffmpeg.deleteFile("summary.mp4"); } catch { /* noop */ }
      toast.success("Videoresumen generado");
    } catch (err: any) {
      console.error(err);
      toast.error("Error generando resumen: " + (err?.message || String(err)));
    } finally {
      setExporting(false); setExportStage(""); setExportProgress(0);
    }
  };

  if (loading) {
    return <ModuleShell title="ANÁLISIS" moduleKey="tareas"><p className="text-muted-foreground text-sm">Cargando…</p></ModuleShell>;
  }
  if (!video) {
    return <ModuleShell title="ANÁLISIS" moduleKey="tareas"><p className="text-aureon-red">Vídeo no encontrado</p></ModuleShell>;
  }

  return (
    <ModuleShell
      title={video.title || "PARTIDO"}
      subtitle={`${video.match_date ? new Date(video.match_date).toLocaleDateString("es-ES") : ""}${video.opponent ? ` · vs ${video.opponent}` : ""}`}
      moduleKey="tareas"
      actions={
        <div className="flex gap-2">
          <Link to="/analisis/categorias"><Button size="sm" variant="outline"><Settings className="w-4 h-4 mr-1" />Categorías</Button></Link>
          <Button size="sm" variant="ghost" onClick={() => navigate({ to: "/analisis" })}><ChevronLeft className="w-4 h-4 mr-1" />Biblioteca</Button>
        </div>
      }
    >
      {/* === FILA SUPERIOR: Vídeo + Botonera al lado === */}
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        {/* Vídeo + controles */}
        <div className="space-y-3">
          <div className="rounded-xl overflow-hidden border border-white/10 bg-black aspect-video relative">
            {playUrl ? (
              <AnalysisPlayer
                ref={videoRef}
                src={playUrl}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onTimeUpdate={onTime}
                onLoadedMetadata={onMeta}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground"><Film className="w-12 h-12" /></div>
            )}
            {activeClip && (
              <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-2">
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: activeClip.category_color }} />
                Clip · {activeClip.category_name}
                <button onClick={() => { videoRef.current?.pause(); setActiveClip(null); setShowSummary(false); }}><X className="w-3 h-3" /></button>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="rounded-lg border border-white/10 bg-background/60 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <span className="font-mono text-foreground">{fmtTime(currentTime)}</span>
              <span>/</span>
              <span className="font-mono">{fmtTime(duration)}</span>
            </div>
            <div className="relative">
              <Slider
                value={[duration ? (currentTime / duration) * 100 : 0]}
                max={100}
                step={0.01}
                onValueChange={(v) => seekTo((v[0] / 100) * duration)}
              />
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 pointer-events-none h-3">
                {duration > 0 && events.map(ev => (
                  <button
                    key={ev.id}
                    title={`${ev.category_name} · ${fmtTime(ev.timestamp_seconds)}`}
                    onClick={() => playClip(ev)}
                    className="absolute pointer-events-auto -translate-x-1/2 w-1.5 h-3 rounded-sm hover:scale-150 transition-transform"
                    style={{
                      left: `${(ev.timestamp_seconds / duration) * 100}%`,
                      background: ev.category_color,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Controles del player */}
          <div className="rounded-lg border border-white/10 bg-background/60 p-3 flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => seek(-10)}><SkipBack className="w-4 h-4" /> 10s</Button>
            <Button size="sm" variant="outline" onClick={() => seek(-1 / 30)} title="Frame anterior (,)"><ChevronLeft className="w-4 h-4" /></Button>
            <Button size="sm" onClick={togglePlay}>{playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}</Button>
            <Button size="sm" variant="outline" onClick={() => seek(1 / 30)} title="Frame siguiente (.)"><ChevronRight className="w-4 h-4" /></Button>
            <Button size="sm" variant="outline" onClick={() => seek(10)}>10s <SkipForward className="w-4 h-4" /></Button>
            <div className="flex items-center gap-1 ml-3">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Velocidad</Label>
              {[0.25, 0.5, 1, 1.5, 2].map(r => (
                <Button key={r} size="sm" variant={rate === r ? "default" : "ghost"} onClick={() => setSpeed(r)} className="h-7 px-2 text-xs">{r}×</Button>
              ))}
            </div>
            <div className="flex items-center gap-2 ml-3">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Antes</Label>
              <Input type="number" min={0} max={60} value={defaultPre} onChange={(e) => setDefaultPre(Number(e.target.value) || 0)} className="w-14 h-8" />
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Después</Label>
              <Input type="number" min={0} max={60} value={defaultPost} onChange={(e) => setDefaultPost(Number(e.target.value) || 0)} className="w-14 h-8" />
            </div>
          </div>
        </div>

        {/* Botonera de tagging AL LADO del vídeo */}
        <aside className="space-y-3">
          {cats.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-background/40 p-5 text-center">
              <p className="text-sm text-foreground">No tienes categorías configuradas.</p>
              <Link to="/analisis/categorias" className="inline-block mt-2"><Button size="sm">Configurar categorías</Button></Link>
            </div>
          ) : (
            <div className="rounded-lg border border-white/10 bg-background/60 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Etiquetar (timestamp actual)</p>
              <div className="grid grid-cols-2 gap-2 max-h-[55vh] overflow-y-auto pr-1">
                {cats.map(c => (
                  <button
                    key={c.id}
                    onClick={() => tagEvent(c)}
                    className="rounded-lg p-3 text-white font-semibold text-sm shadow hover:scale-[1.02] active:scale-95 transition-transform flex flex-col items-center gap-0.5 min-h-[64px]"
                    style={{ background: c.color }}
                  >
                    <span className="text-base leading-tight text-center">{c.name}</span>
                    {c.hotkey && <span className="text-[10px] opacity-80">tecla [{c.hotkey}]</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Resumen por categoría */}
          {eventsByCat.length > 0 && (
            <div className="rounded-lg border border-white/10 bg-background/60 p-3">
              <h3 className="font-display text-xs tracking-wider mb-2">POR CATEGORÍA</h3>
              <div className="space-y-1">
                {eventsByCat.map(([name, list]) => (
                  <div key={name} className="flex items-center justify-between text-xs">
                    <span className="text-foreground">{name}</span>
                    <span className="font-mono text-muted-foreground">{list.length}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* === FILA INFERIOR: Eventos === */}
      <div className="mt-4 rounded-lg border border-white/10 bg-background/60 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-sm tracking-wider">EVENTOS REGISTRADOS ({visibleEvents.length})</h3>
            <span className="text-xs text-muted-foreground">· {selectedIds.size} seleccionados</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={selectAllVisible}>
              {visibleEvents.length > 0 && visibleEvents.every(e => selectedIds.has(e.id)) ? "Deseleccionar" : "Seleccionar todos"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSelectedIds(new Set())} disabled={selectedIds.size === 0}>Limpiar</Button>
            <Button size="sm" onClick={playSummary}><ListVideo className="w-4 h-4 mr-1" />Reproducir todos</Button>
            <Button size="sm" onClick={playSelection} disabled={selectedIds.size === 0}><Play className="w-4 h-4 mr-1" />Reproducir selección</Button>
            <Button size="sm" variant="default" onClick={exportSummaryVideo} disabled={exporting || selectedIds.size === 0 || !canExport} title={!canExport ? "Exportación no disponible para vídeos de YouTube/Vimeo" : ""}>
              <Video className="w-4 h-4 mr-1" />Generar videoresumen
            </Button>
            <Button size="sm" variant="outline" onClick={exportSelectedClips} disabled={exporting || selectedIds.size === 0 || !canExport} title={!canExport ? "Exportación no disponible para vídeos de YouTube/Vimeo" : ""}>
              <Download className="w-4 h-4 mr-1" />Descargar clips
            </Button>
          </div>
        </div>

        {/* Filtros por categoría */}
        <div className="flex flex-wrap gap-1 mb-3">
          <button
            onClick={() => setFilterCat("")}
            className={`text-[10px] px-2 py-0.5 rounded ${!filterCat ? "bg-white/20 text-white" : "bg-white/5 text-muted-foreground"}`}
          >Todas</button>
          {cats.map(c => (
            <button
              key={c.id}
              onClick={() => setFilterCat(c.id)}
              className="text-[10px] px-2 py-0.5 rounded text-white"
              style={{ background: filterCat === c.id ? c.color : `${c.color}55` }}
            >{c.name}</button>
          ))}
        </div>

        {/* Progreso de exportación */}
        {exporting && (
          <div className="mb-3 rounded border border-aureon-gold/40 bg-aureon-gold/10 p-3 flex items-center gap-3">
            <Loader2 className="w-4 h-4 animate-spin text-aureon-gold" />
            <div className="flex-1">
              <div className="text-xs font-semibold">{exportStage}</div>
              <div className="h-1.5 bg-white/10 rounded mt-1 overflow-hidden">
                <div className="h-full bg-aureon-gold transition-all" style={{ width: `${exportProgress}%` }} />
              </div>
            </div>
            <span className="text-xs font-mono">{exportProgress}%</span>
          </div>
        )}

        {/* Grid de eventos */}
        {visibleEvents.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">Sin eventos todavía. Etiqueta acciones desde la botonera mientras reproduces el vídeo.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 max-h-[40vh] overflow-y-auto pr-1">
            {visibleEvents.map(ev => {
              const sel = selectedIds.has(ev.id);
              return (
                <div key={ev.id} className={`flex flex-col gap-1.5 p-2 rounded border transition-colors group ${sel ? "border-aureon-gold bg-aureon-gold/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={sel} onCheckedChange={() => toggleSelect(ev.id)} />
                    <span className="w-1.5 h-10 rounded-sm shrink-0" style={{ background: ev.category_color }} />
                    <button onClick={() => playClip(ev)} className="flex-1 text-left min-w-0">
                      <div className="text-xs font-semibold text-foreground truncate">{ev.category_name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{fmtTime(ev.timestamp_seconds)} · −{ev.pre_seconds}s/+{ev.post_seconds}s</div>
                      {ev.label && <div className="text-[10px] text-muted-foreground truncate">{ev.label}</div>}
                    </button>
                    <button onClick={() => setPopupClip(ev)} title="Abrir en ventana"><Maximize2 className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" /></button>
                    <button onClick={() => exportSingleClip(ev)} disabled={exporting || !canExport} title={canExport ? "Exportar este clip" : "No disponible para YouTube/Vimeo"}><Download className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground disabled:opacity-30" /></button>
                    <button onClick={() => setEditingEvent(ev)} title="Editar"><Edit2 className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" /></button>
                    <button onClick={() => deleteEvent(ev.id)} title="Eliminar"><Trash2 className="w-3.5 h-3.5 text-aureon-red" /></button>
                  </div>
                  {/* Trim rápido del clip */}
                  <div className="flex items-center justify-between gap-1 pl-6 text-[10px]">
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground uppercase tracking-wider">Inicio</span>
                      <button onClick={() => adjustClip(ev, "pre_seconds", 1)} className="w-5 h-5 rounded bg-white/10 hover:bg-white/20 inline-flex items-center justify-center" title="Adelantar inicio 1s (más duración)"><Plus className="w-3 h-3" /></button>
                      <span className="font-mono w-6 text-center">{ev.pre_seconds}s</span>
                      <button onClick={() => adjustClip(ev, "pre_seconds", -1)} className="w-5 h-5 rounded bg-white/10 hover:bg-white/20 inline-flex items-center justify-center" title="Acortar inicio 1s"><Minus className="w-3 h-3" /></button>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground uppercase tracking-wider">Final</span>
                      <button onClick={() => adjustClip(ev, "post_seconds", -1)} className="w-5 h-5 rounded bg-white/10 hover:bg-white/20 inline-flex items-center justify-center" title="Acortar final 1s"><Minus className="w-3 h-3" /></button>
                      <span className="font-mono w-6 text-center">{ev.post_seconds}s</span>
                      <button onClick={() => adjustClip(ev, "post_seconds", 1)} className="w-5 h-5 rounded bg-white/10 hover:bg-white/20 inline-flex items-center justify-center" title="Alargar final 1s"><Plus className="w-3 h-3" /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit dialog */}
      {editingEvent && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setEditingEvent(null)}>
          <div className="bg-neutral-900 text-white rounded-xl border border-white/10 p-5 max-w-md w-full space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display tracking-wider text-white">EDITAR EVENTO · {editingEvent.category_name}</h3>
            <div className="space-y-2">
              <Label className="text-white">Timestamp (segundos)</Label>
              <Input type="number" step="0.1" value={editingEvent.timestamp_seconds} onChange={(e) => setEditingEvent({ ...editingEvent, timestamp_seconds: Number(e.target.value) })} />
              <p className="text-xs text-white/60">{fmtTime(editingEvent.timestamp_seconds)}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-white">Antes (s)</Label>
                <Input type="number" min={0} value={editingEvent.pre_seconds} onChange={(e) => setEditingEvent({ ...editingEvent, pre_seconds: Number(e.target.value) || 0 })} />
              </div>
              <div>
                <Label className="text-white">Después (s)</Label>
                <Input type="number" min={0} value={editingEvent.post_seconds} onChange={(e) => setEditingEvent({ ...editingEvent, post_seconds: Number(e.target.value) || 0 })} />
              </div>
            </div>
            <div>
              <Label className="text-white">Etiqueta breve</Label>
              <Input value={editingEvent.label} onChange={(e) => setEditingEvent({ ...editingEvent, label: e.target.value })} />
            </div>
            <div>
              <Label className="text-white">Notas</Label>
              <Textarea value={editingEvent.notes} onChange={(e) => setEditingEvent({ ...editingEvent, notes: e.target.value })} rows={2} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setEditingEvent(null)}>Cancelar</Button>
              <Button onClick={saveEdit}><Check className="w-4 h-4 mr-1" />Guardar</Button>
            </div>
          </div>
        </div>
      )}

      {/* Popup de clip individual */}
      <Dialog open={!!popupClip} onOpenChange={(o) => { if (!o) { popupPlayerRef.current?.pause(); setPopupClip(null); } }}>
        <DialogContent className="max-w-3xl bg-neutral-900 text-white border-white/10">
          {popupClip && (
            <>
              <DialogHeader>
                <DialogTitle className="text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: popupClip.category_color }} />
                  {popupClip.category_name}
                </DialogTitle>
                <DialogDescription className="text-white/60 font-mono">
                  {fmtTime(popupClip.timestamp_seconds)} · −{popupClip.pre_seconds}s / +{popupClip.post_seconds}s · duración {(popupClip.pre_seconds + popupClip.post_seconds).toFixed(1)}s
                </DialogDescription>
              </DialogHeader>
              <div className="bg-black rounded overflow-hidden">
                {playUrl ? (
                  <PopupClipPlayer
                    ref={popupPlayerRef}
                    src={playUrl}
                    start={Math.max(0, popupClip.timestamp_seconds - popupClip.pre_seconds)}
                    end={popupClip.timestamp_seconds + popupClip.post_seconds}
                  />
                ) : (
                  <div className="aspect-video flex items-center justify-center text-white/40">Sin vídeo</div>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="text-white/60 uppercase tracking-wider">Inicio</span>
                    <button onClick={() => adjustClip(popupClip, "pre_seconds", 1)} className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 inline-flex items-center justify-center"><Plus className="w-3 h-3" /></button>
                    <span className="font-mono w-8 text-center">{popupClip.pre_seconds}s</span>
                    <button onClick={() => adjustClip(popupClip, "pre_seconds", -1)} className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 inline-flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-white/60 uppercase tracking-wider">Final</span>
                    <button onClick={() => adjustClip(popupClip, "post_seconds", -1)} className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 inline-flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                    <span className="font-mono w-8 text-center">{popupClip.post_seconds}s</span>
                    <button onClick={() => adjustClip(popupClip, "post_seconds", 1)} className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 inline-flex items-center justify-center"><Plus className="w-3 h-3" /></button>
                  </div>
                </div>
                <Button size="sm" onClick={() => exportSingleClip(popupClip)} disabled={exporting || !canExport} title={canExport ? "Exportar este clip" : "No disponible para YouTube/Vimeo"}>
                  <Download className="w-4 h-4 mr-1" />Exportar clip
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </ModuleShell>
  );
}

import { forwardRef, useImperativeHandle as useImpHandle } from "react";
const PopupClipPlayer = forwardRef<PlayerHandle, { src: string; start: number; end: number }>(
  function PopupClipPlayer({ src, start, end }, ref) {
    const innerRef = useRef<PlayerHandle | null>(null);
    useImpHandle(ref, () => innerRef.current as PlayerHandle, []);
    const seeded = useRef(false);
    const [paused, setPaused] = useState(true);
    const [current, setCurrent] = useState(start);
    useEffect(() => { seeded.current = false; setCurrent(start); }, [src, start, end]);
    const onMeta = () => {
      const p = innerRef.current; if (!p || seeded.current) return;
      seeded.current = true;
      p.currentTime = start;
      p.play();
    };
    const onTime = () => {
      const p = innerRef.current; if (!p) return;
      setCurrent(p.currentTime);
      if (p.currentTime >= end) { p.pause(); }
    };
    const togglePlay = () => {
      const p = innerRef.current; if (!p) return;
      if (p.currentTime >= end - 0.05) p.currentTime = start;
      if (p.paused) p.play(); else p.pause();
    };
    const skip = (delta: number) => {
      const p = innerRef.current; if (!p) return;
      const t = Math.min(end, Math.max(start, p.currentTime + delta));
      p.currentTime = t;
      setCurrent(t);
    };
    const seekTo = (v: number) => {
      const p = innerRef.current; if (!p) return;
      p.currentTime = v;
      setCurrent(v);
    };
    const restart = () => { const p = innerRef.current; if (!p) return; p.currentTime = start; setCurrent(start); p.play(); };
    const duration = Math.max(0.01, end - start);
    const rel = Math.min(duration, Math.max(0, current - start));
    return (
      <div className="flex flex-col">
        <div className="aspect-video">
          <AnalysisPlayer
            ref={innerRef}
            src={src}
            onLoadedMetadata={onMeta}
            onTimeUpdate={onTime}
            onPlay={() => setPaused(false)}
            onPause={() => setPaused(true)}
          />
        </div>
        <div className="bg-black/80 px-3 py-2 flex items-center gap-2 text-white text-xs">
          <button onClick={restart} title="Reiniciar" className="w-7 h-7 rounded bg-white/10 hover:bg-white/20 inline-flex items-center justify-center"><SkipBack className="w-3.5 h-3.5" /></button>
          <button onClick={() => skip(-5)} title="-5s" className="w-7 h-7 rounded bg-white/10 hover:bg-white/20 inline-flex items-center justify-center text-[10px] font-mono">-5</button>
          <button onClick={togglePlay} title={paused ? "Reproducir" : "Pausar"} className="w-8 h-8 rounded-full bg-primary text-primary-foreground hover:opacity-90 inline-flex items-center justify-center">
            {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
          <button onClick={() => skip(5)} title="+5s" className="w-7 h-7 rounded bg-white/10 hover:bg-white/20 inline-flex items-center justify-center text-[10px] font-mono">+5</button>
          <span className="font-mono tabular-nums w-12 text-right">{rel.toFixed(1)}s</span>
          <input
            type="range"
            min={0}
            max={duration}
            step={0.1}
            value={rel}
            onChange={(e) => seekTo(start + Number(e.target.value))}
            className="flex-1 accent-primary"
          />
          <span className="font-mono tabular-nums w-12">{duration.toFixed(1)}s</span>
        </div>
      </div>
    );
  }
);
