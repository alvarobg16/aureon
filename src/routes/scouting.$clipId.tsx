import { createFileRoute, Link, Outlet, useMatches, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ModuleShell } from "@/components/ModuleShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Pencil, Trash2, Tag } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import type { ScoutingClip } from "@/lib/scouting";

export const Route = createFileRoute("/scouting/$clipId")({
  head: () => ({ meta: [{ title: "Clip de scouting — Aureon Futsal Pro Suite" }] }),
  component: ClipView,
});

function ClipView() {
  const { clipId } = Route.useParams();
  const navigate = useNavigate();
  const matches = useMatches();
  const isChild = matches.some((m) => m.routeId.endsWith("/editar"));
  const [clip, setClip] = useState<ScoutingClip | null>(null);
  const [teamName, setTeamName] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [signedVideoUrl, setSignedVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("scouting_clips").select("*").eq("id", clipId).maybeSingle();
      setClip((data as ScoutingClip) ?? null);
      if (data?.season_team_id) {
        const { data: t } = await supabase.from("season_teams").select("name").eq("id", data.season_team_id).maybeSingle();
        setTeamName((t as { name: string } | null)?.name ?? "");
      }
      const url = (data as ScoutingClip | null)?.video_url ?? null;
      if (url?.startsWith("storage://scouting-clips/")) {
        const path = url.replace("storage://scouting-clips/", "");
        const { data: s } = await supabase.storage.from("scouting-clips").createSignedUrl(path, 3600);
        setSignedVideoUrl(s?.signedUrl ?? null);
      } else {
        setSignedVideoUrl(url);
      }
      setLoading(false);
    })();
  }, [clipId]);

  if (isChild) return <Outlet />;
  if (loading) return <ModuleShell title="CLIP"><p className="text-muted-foreground">Cargando…</p></ModuleShell>;
  if (!clip) return <ModuleShell title="CLIP"><p className="text-muted-foreground">Clip no encontrado.</p></ModuleShell>;

  const remove = async () => {
    const { error } = await supabase.from("scouting_clips").delete().eq("id", clip.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Clip eliminado");
    navigate({ to: "/scouting" });
  };

  const isYouTube = clip.video_url?.includes("youtube.com") || clip.video_url?.includes("youtu.be");
  const ytEmbed = (() => {
    if (!isYouTube || !clip.video_url) return "";
    const m = clip.video_url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/);
    return m ? `https://www.youtube.com/embed/${m[1]}` : "";
  })();

  return (
    <ModuleShell
      title={clip.title || "CLIP"}
      subtitle={`${teamName} · ${clip.category}`}
      actions={
        <div className="flex gap-2">
          <Link to="/scouting" className="inline-flex items-center gap-1 text-sm px-3 py-2 rounded-md bg-white text-black hover:bg-white/90">
            <ArrowLeft className="w-4 h-4" /> Volver
          </Link>
          <Link to="/scouting/$clipId/editar" params={{ clipId }} className="inline-flex items-center gap-1 text-sm px-3 py-2 rounded-md bg-amber-500 text-black hover:brightness-110">
            <Pencil className="w-4 h-4" /> Editar
          </Link>
          <Button variant="destructive" onClick={() => setConfirmDelete(true)}><Trash2 className="w-4 h-4 mr-1" /> Eliminar</Button>
        </div>
      }
    >
      <div className="rounded-2xl border border-white/10 bg-background/60 backdrop-blur p-5 space-y-4 max-w-4xl">
        <div className="aspect-video bg-black rounded-lg overflow-hidden">
          {clip.source === "external" && ytEmbed ? (
            <iframe src={ytEmbed} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          ) : signedVideoUrl ? (
            <video src={signedVideoUrl} controls className="w-full h-full" />
          ) : (
            <div className="flex items-center justify-center h-full text-white/40">Sin vídeo</div>
          )}
        </div>
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <div><span className="text-xs uppercase text-muted-foreground">Equipo</span><p>{teamName || "—"}</p></div>
          <div><span className="text-xs uppercase text-muted-foreground">Lado</span><p>{clip.side === "offensive" ? "Ofensivo" : "Defensivo"}</p></div>
          <div><span className="text-xs uppercase text-muted-foreground">Categoría</span><p>{clip.category}</p></div>
          <div><span className="text-xs uppercase text-muted-foreground">Origen</span><p>{clip.source === "upload" ? "Archivo subido" : "Enlace externo"}</p></div>
        </div>
        {clip.notes && (
          <div>
            <span className="text-xs uppercase text-muted-foreground">Notas</span>
            <p className="whitespace-pre-wrap text-sm mt-1">{clip.notes}</p>
          </div>
        )}
        {clip.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {clip.tags.map(t => (
              <span key={t} className="text-xs bg-white/10 px-2 py-0.5 rounded inline-flex items-center gap-1"><Tag className="w-3 h-3" />{t}</span>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar clip?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ModuleShell>
  );
}
