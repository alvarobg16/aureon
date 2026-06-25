import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Play, Pause, SkipBack, Maximize2, Download, Loader2, Film } from "lucide-react";
import { toast } from "sonner";
import {
  fmtTime, getPlayableUrl,
  type AnalysisVideo, type AnalysisCategory, type AnalysisEvent,
} from "@/lib/analisis";
import { detectExternalKind } from "@/lib/videoEmbed";
import {
  loadFFmpeg, encodeNormalizedSegment, downloadBlob, sanitizeFilename,
} from "@/lib/ffmpegLoader";

export function TaggedActionsBrowser() {
  const [videos, setVideos] = useState<AnalysisVideo[]>([]);
  const [cats, setCats] = useState<AnalysisCategory[]>([]);
  const [events, setEvents] = useState<AnalysisEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const [fVideo, setFVideo] = useState<string>("all");
  const [fCat, setFCat] = useState<string>("all");

  const [popup, setPopup] = useState<AnalysisEvent | null>(null);
  const [popupUrl, setPopupUrl] = useState<string | null>(null);

  const [exporting, setExporting] = useState(false);
  const [exportStage, setExportStage] = useState("");
  const [exportProgress, setExportProgress] = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [v, c, e] = await Promise.all([
        supabase.from("analysis_videos").select("*").order("created_at", { ascending: false }),
        supabase.from("analysis_categories").select("*").order("order_index"),
        supabase.from("analysis_events").select("*").order("created_at", { ascending: false }),
      ]);
      setVideos((v.data as AnalysisVideo[]) ?? []);
      setCats((c.data as AnalysisCategory[]) ?? []);
      setEvents((e.data as AnalysisEvent[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const videoMap = useMemo(() => Object.fromEntries(videos.map(v => [v.id, v])), [videos]);

  const filtered = useMemo(() => {
    return events.filter(e => {
      if (fVideo !== "all" && e.video_id !== fVideo) return false;
      if (fCat !== "all" && e.category_id !== fCat && e.category_name !== fCat) return false;
      return true;
    });
  }, [events, fVideo, fCat]);

  const grouped = useMemo(() => {
    const map = new Map<string, AnalysisEvent[]>();
    for (const e of filtered) {
      const k = e.category_name || "(sin categoría)";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const openPopup = async (ev: AnalysisEvent) => {
    setPopup(ev);
    const v = videoMap[ev.video_id];
    if (!v?.video_url) { setPopupUrl(null); return; }
    const url = await getPlayableUrl(v.video_url);
    setPopupUrl(url);
  };

  const exportClip = async (ev: AnalysisEvent) => {
    const v = videoMap[ev.video_id];
    if (!v?.video_url) { toast.error("Vídeo no disponible"); return; }
    const kind = detectExternalKind(v.video_url);
    if (kind === "youtube" || kind === "vimeo") {
      toast.error("Exportación no disponible para vídeos de YouTube/Vimeo");
      return;
    }
    setExporting(true); setExportProgress(0);
    try {
      const url = await getPlayableUrl(v.video_url);
      if (!url) throw new Error("URL no disponible");
      const { ffmpeg } = await loadFFmpeg(setExportStage);
      ffmpeg.on("progress", ({ progress }: { progress: number }) =>
        setExportProgress(Math.max(0, Math.min(100, Math.round(progress * 100)))));
      setExportStage("Descargando vídeo…");
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`No se pudo descargar (${resp.status})`);
      const data = new Uint8Array(await resp.arrayBuffer());
      await ffmpeg.writeFile("input.mp4", data);
      setExportStage("Cortando clip…");
      const start = Math.max(0, ev.timestamp_seconds - ev.pre_seconds);
      const dur = Math.max(0.1, ev.pre_seconds + ev.post_seconds);
      await encodeNormalizedSegment(ffmpeg, start, dur, "out.mp4", "mp4");
      const out = (await ffmpeg.readFile("out.mp4")) as Uint8Array;
      const blob = new Blob([out.buffer as ArrayBuffer], { type: "video/mp4" });
      const base = sanitizeFilename(v.title || "clip");
      downloadBlob(blob, `${base}_${sanitizeFilename(ev.category_name)}_${Math.round(ev.timestamp_seconds)}s.mp4`);
      toast.success("Clip exportado");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Error exportando: " + msg);
    } finally {
      setExporting(false); setExportStage(""); setExportProgress(0);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-background/40 backdrop-blur p-4 grid gap-3 md:grid-cols-2">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-white/70 mb-1 font-semibold">Partido / vídeo</p>
          <Select value={fVideo} onValueChange={setFVideo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los vídeos</SelectItem>
              {videos.map(v => (
                <SelectItem key={v.id} value={v.id}>
                  {v.title || "Sin título"}{v.opponent ? ` · vs ${v.opponent}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-white/70 mb-1 font-semibold">Categoría</p>
          <Select value={fCat} onValueChange={setFCat}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {cats.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Chips de filtro rápido por categoría */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setFCat("all")}
          className={`text-xs px-2.5 py-1 rounded ${fCat === "all" ? "bg-white/20 text-white" : "bg-white/5 text-muted-foreground"}`}
        >Todas</button>
        {cats.map(c => (
          <button
            key={c.id}
            onClick={() => setFCat(c.id)}
            className="text-xs px-2.5 py-1 rounded text-white"
            style={{ background: fCat === c.id ? c.color : `${c.color}55` }}
          >{c.name}</button>
        ))}
      </div>

      {exporting && (
        <div className="rounded border border-aureon-gold/40 bg-aureon-gold/10 p-3 flex items-center gap-3">
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

      {loading ? (
        <p className="text-muted-foreground text-sm">Cargando…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-background/40 p-10 text-center">
          <p className="text-muted-foreground">No hay acciones taggeadas. Etiqueta acciones desde Análisis de partidos.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map(([name, list]) => (
            <div key={name} className="rounded-2xl border border-white/10 bg-background/40 backdrop-blur p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-6 rounded-sm" style={{ background: list[0]?.category_color || "#888" }} />
                <h3 className="font-display text-base text-white tracking-wide">{name}</h3>
                <span className="text-xs text-muted-foreground">· {list.length}</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {list.map(ev => {
                  const v = videoMap[ev.video_id];
                  return (
                    <div key={ev.id} className="rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors p-2.5 flex flex-col gap-2">
                      <div className="text-xs font-semibold text-white truncate">{v?.title || "Vídeo"}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {fmtTime(ev.timestamp_seconds)} · −{ev.pre_seconds}s/+{ev.post_seconds}s
                      </div>
                      {ev.label && <div className="text-[10px] text-white/80 truncate">{ev.label}</div>}
                      <div className="flex items-center gap-1.5 mt-auto">
                        <Button size="sm" variant="outline" onClick={() => openPopup(ev)} className="h-7 px-2 text-xs flex-1">
                          <Maximize2 className="w-3 h-3 mr-1" /> Abrir
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => exportClip(ev)} disabled={exporting} className="h-7 px-2 text-xs">
                          <Download className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <PopupClipPlayer
        ev={popup}
        url={popupUrl}
        onClose={() => { setPopup(null); setPopupUrl(null); }}
        onExport={exportClip}
        exporting={exporting}
      />
    </div>
  );
}

function PopupClipPlayer({
  ev, url, onClose, onExport, exporting,
}: {
  ev: AnalysisEvent | null;
  url: string | null;
  onClose: () => void;
  onExport: (ev: AnalysisEvent) => void;
  exporting: boolean;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);

  const start = ev ? Math.max(0, ev.timestamp_seconds - ev.pre_seconds) : 0;
  const end = ev ? ev.timestamp_seconds + ev.post_seconds : 0;
  const dur = Math.max(0.01, end - start);

  useEffect(() => {
    setPlaying(false);
    setCurrent(0);
  }, [ev?.id]);

  const onMeta = () => {
    const el = ref.current; if (!el) return;
    el.currentTime = start;
    setCurrent(0);
  };
  const onTime = () => {
    const el = ref.current; if (!el) return;
    setCurrent(Math.max(0, el.currentTime - start));
    if (el.currentTime >= end) {
      el.pause();
    }
  };

  const toggle = () => {
    const el = ref.current; if (!el) return;
    if (el.paused) { el.play(); setPlaying(true); } else { el.pause(); setPlaying(false); }
  };
  const skip = (d: number) => {
    const el = ref.current; if (!el) return;
    el.currentTime = Math.max(start, Math.min(end, el.currentTime + d));
  };
  const seekRel = (v: number) => {
    const el = ref.current; if (!el) return;
    el.currentTime = start + v;
  };
  const restart = () => { const el = ref.current; if (!el) return; el.currentTime = start; el.play(); setPlaying(true); };

  return (
    <Dialog open={!!ev} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl bg-neutral-900 text-white border-white/10">
        {ev && (
          <>
            <DialogHeader>
              <DialogTitle className="text-white">
                {ev.category_name} · {fmtTime(ev.timestamp_seconds)}
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                {url ? (
                  <video
                    ref={ref}
                    src={url}
                    className="w-full h-full"
                    onLoadedMetadata={onMeta}
                    onTimeUpdate={onTime}
                    onPlay={() => setPlaying(true)}
                    onPause={() => setPlaying(false)}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-white/40"><Film className="w-12 h-12" /></div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={restart}><SkipBack className="w-4 h-4" /></Button>
                <Button size="sm" variant="outline" onClick={() => skip(-5)}>−5s</Button>
                <Button size="sm" onClick={toggle}>{playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}</Button>
                <Button size="sm" variant="outline" onClick={() => skip(5)}>+5s</Button>
                <input
                  type="range" min={0} max={dur} step={0.01} value={current}
                  onChange={(e) => seekRel(Number(e.target.value))}
                  className="flex-1 accent-aureon-gold"
                />
                <span className="text-xs font-mono w-20 text-right">{current.toFixed(1)} / {dur.toFixed(1)}s</span>
                <Button size="sm" variant="outline" onClick={() => onExport(ev)} disabled={exporting}>
                  <Download className="w-4 h-4 mr-1" /> Exportar
                </Button>
              </div>
              {ev.notes && <p className="text-sm text-white/80 whitespace-pre-wrap">{ev.notes}</p>}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
