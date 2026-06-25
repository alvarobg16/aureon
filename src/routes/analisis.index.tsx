import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ModuleShell } from "@/components/ModuleShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Settings, Film, Search, Trash2 } from "lucide-react";
import { isStorageUrl, storagePathFromUrl, type AnalysisVideo } from "@/lib/analisis";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/analisis/")({
  head: () => ({ meta: [{ title: "Análisis de Partidos — Aureon Futsal Pro Suite" }] }),
  component: AnalisisIndex,
});

function AnalisisIndex() {
  const [videos, setVideos] = useState<AnalysisVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [toDelete, setToDelete] = useState<AnalysisVideo | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    const { data } = await supabase
      .from("analysis_videos")
      .select("*")
      .order("created_at", { ascending: false });
    setVideos((data as AnalysisVideo[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      // delete events first
      await supabase.from("analysis_events").delete().eq("video_id", toDelete.id);
      // delete file from storage if internal
      if (toDelete.video_url && isStorageUrl(toDelete.video_url)) {
        await supabase.storage.from("analysis-videos").remove([storagePathFromUrl(toDelete.video_url)]);
      }
      const { error } = await supabase.from("analysis_videos").delete().eq("id", toDelete.id);
      if (error) throw error;
      setVideos(v => v.filter(x => x.id !== toDelete.id));
      toast.success("Análisis eliminado");
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo eliminar");
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  }

  const filtered = videos.filter(v => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return v.title.toLowerCase().includes(s) ||
      v.opponent.toLowerCase().includes(s) ||
      v.competition.toLowerCase().includes(s) ||
      (v.match_date ?? "").includes(s);
  });

  return (
    <ModuleShell
      title="ANÁLISIS DE PARTIDOS"
      subtitle="Biblioteca de vídeos · Tagging · Clips · Resumen"
      moduleKey="tareas"
      actions={
        <div className="flex gap-2">
          <Link to="/analisis/categorias">
            <Button variant="outline" size="sm"><Settings className="w-4 h-4 mr-1" />Categorías</Button>
          </Link>
          <Link to="/analisis/nuevo">
            <Button size="sm"><Plus className="w-4 h-4 mr-1" />Nuevo vídeo</Button>
          </Link>
        </div>
      }
    >
      <div className="flex items-center gap-2 max-w-md mb-6">
        <Search className="w-4 h-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por título, rival, competición o fecha…" />
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Cargando…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-background/40 p-10 text-center">
          <Film className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-foreground font-semibold">No hay vídeos todavía</p>
          <p className="text-sm text-muted-foreground mt-1">Sube tu primer partido para empezar a etiquetar acciones.</p>
          <Link to="/analisis/nuevo" className="inline-block mt-4">
            <Button><Plus className="w-4 h-4 mr-1" />Subir vídeo</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(v => (
            <div key={v.id} className="relative group">
              <Link
                to="/analisis/$videoId"
                params={{ videoId: v.id }}
                className="block rounded-xl border border-white/10 bg-background/60 backdrop-blur p-4 hover:-translate-y-0.5 hover:border-cyan-400/50 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 pr-8">
                    <h3 className="font-semibold text-foreground truncate">{v.title || "(sin título)"}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {v.match_date ? new Date(v.match_date).toLocaleDateString("es-ES") : "Sin fecha"}
                      {v.opponent ? ` · vs ${v.opponent}` : ""}
                    </p>
                  </div>
                  <Film className="w-5 h-5 text-cyan-400 shrink-0" />
                </div>
                {v.competition && <p className="text-xs text-muted-foreground mt-2">{v.competition}</p>}
              </Link>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setToDelete(v); }}
                className="absolute top-2 right-2 p-1.5 rounded-md bg-background/80 border border-white/10 text-muted-foreground hover:text-red-400 hover:border-red-400/50 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Eliminar análisis"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este análisis?</AlertDialogTitle>
            <AlertDialogDescription>
              Se borrará el vídeo "{toDelete?.title}" junto con todos sus eventos y clips etiquetados. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700">
              {deleting ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ModuleShell>
  );
}
