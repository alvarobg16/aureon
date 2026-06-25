import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ModuleShell } from "@/components/ModuleShell";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Video, Search, Tag, Trash2, Film, Tags } from "lucide-react";
import {
  SCOUTING_DEFENSIVE,
  SCOUTING_OFFENSIVE,
  type ScoutingClip,
} from "@/lib/scouting";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { TaggedActionsBrowser } from "@/components/scouting/TaggedActionsBrowser";

export const Route = createFileRoute("/scouting/")({
  head: () => ({ meta: [{ title: "Scouting — Aureon Futsal Pro Suite" }] }),
  component: ScoutingIndex,
});

type STeam = { id: string; name: string; season_id: string };
type Season = { id: string; name: string; is_active: boolean };

function ScoutingIndex() {
  const [tab, setTab] = useState<"clips" | "tagged">("clips");
  const [clips, setClips] = useState<ScoutingClip[]>([]);
  const [teams, setTeams] = useState<STeam[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [fSeason, setFSeason] = useState<string>("all");
  const [fTeam, setFTeam] = useState<string>("all");
  const [fSide, setFSide] = useState<string>("all");
  const [fCat, setFCat] = useState<string>("all");
  const [fText, setFText] = useState("");
  const [toDelete, setToDelete] = useState<ScoutingClip | null>(null);

  const removeClip = async () => {
    if (!toDelete) return;
    const id = toDelete.id;
    const url = toDelete.video_url;
    const { error } = await supabase.from("scouting_clips").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    if (url?.startsWith("storage://scouting-clips/")) {
      const path = url.replace("storage://scouting-clips/", "");
      await supabase.storage.from("scouting-clips").remove([path]);
    }
    setClips(prev => prev.filter(x => x.id !== id));
    setToDelete(null);
    toast.success("Clip eliminado");
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: c }, { data: st }, { data: s }] = await Promise.all([
        supabase.from("scouting_clips").select("*").order("created_at", { ascending: false }),
        supabase.from("season_teams").select("id,name,season_id"),
        supabase.from("seasons").select("id,name,is_active").order("created_at", { ascending: false }),
      ]);
      setClips((c as ScoutingClip[]) ?? []);
      setTeams((st as STeam[]) ?? []);
      setSeasons((s as Season[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const teamMap = useMemo(() => Object.fromEntries(teams.map(t => [t.id, t])), [teams]);
  const teamsFiltered = useMemo(
    () => fSeason === "all" ? teams : teams.filter(t => t.season_id === fSeason),
    [teams, fSeason]
  );

  const filtered = useMemo(() => {
    return clips.filter(c => {
      if (fTeam !== "all" && c.season_team_id !== fTeam) return false;
      if (fSeason !== "all" && teamMap[c.season_team_id]?.season_id !== fSeason) return false;
      if (fSide !== "all" && c.side !== fSide) return false;
      if (fCat !== "all" && c.category !== fCat) return false;
      if (fText.trim()) {
        const q = fText.toLowerCase();
        const hay = `${c.title} ${c.notes} ${(c.tags ?? []).join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [clips, fTeam, fSeason, fSide, fCat, fText, teamMap]);

  const cats = fSide === "offensive" ? SCOUTING_OFFENSIVE : fSide === "defensive" ? SCOUTING_DEFENSIVE : [...SCOUTING_OFFENSIVE, ...SCOUTING_DEFENSIVE];

  return (
    <ModuleShell
      title="GESTIÓN DE SCOUTING"
      subtitle="Vídeos rivales · Análisis · Etiquetas"
      actions={
        <Link to="/scouting/nuevo" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-aureon-orange text-black hover:bg-aureon-orange/90 text-sm font-display tracking-wider">
          <Plus className="w-4 h-4" /> NUEVO CLIP
        </Link>
      }
    >
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab("clips")}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-display tracking-wider transition-colors ${tab === "clips" ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/20"}`}
        >
          <Film className="w-4 h-4" /> CLIPS DE SCOUTING
        </button>
        <button
          onClick={() => setTab("tagged")}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-display tracking-wider transition-colors ${tab === "tagged" ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/20"}`}
        >
          <Tags className="w-4 h-4" /> ACCIONES TAGGEADAS
        </button>
      </div>

      {tab === "tagged" ? <TaggedActionsBrowser /> : (<>
      <div className="rounded-2xl border border-white/10 bg-background/40 backdrop-blur p-4 mb-4 grid gap-3 md:grid-cols-5">
        <Select value={fSeason} onValueChange={(v) => { setFSeason(v); setFTeam("all"); }}>
          <SelectTrigger><SelectValue placeholder="Temporada" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las temporadas</SelectItem>
            {seasons.map(s => <SelectItem key={s.id} value={s.id}>{s.name}{s.is_active ? " ★" : ""}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={fTeam} onValueChange={setFTeam}>
          <SelectTrigger><SelectValue placeholder="Equipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los equipos</SelectItem>
            {teamsFiltered.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={fSide} onValueChange={(v) => { setFSide(v); setFCat("all"); }}>
          <SelectTrigger><SelectValue placeholder="Lado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Ofensivo y defensivo</SelectItem>
            <SelectItem value="offensive">Ofensivo</SelectItem>
            <SelectItem value="defensive">Defensivo</SelectItem>
          </SelectContent>
        </Select>
        <Select value={fCat} onValueChange={setFCat}>
          <SelectTrigger><SelectValue placeholder="Categoría" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {cats.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={fText} onChange={(e) => setFText(e.target.value)} placeholder="Buscar texto / etiquetas…" className="pl-8" />
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-background/40 backdrop-blur p-10 text-center">
          <p className="text-muted-foreground">No hay clips. Sube el primero con NUEVO CLIP.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(c => {
            const t = teamMap[c.season_team_id];
            return (
              <div key={c.id} className="relative group">
                <Link to="/scouting/$clipId" params={{ clipId: c.id }} className="block rounded-2xl border border-white/10 bg-background/40 backdrop-blur p-4 hover:-translate-y-0.5 transition-transform">
                  <div className="aspect-video rounded-lg bg-black/60 border border-white/10 flex items-center justify-center mb-3 overflow-hidden">
                    <Video className="w-10 h-10 text-white/40 group-hover:text-aureon-orange transition-colors" />
                  </div>
                  <div className="flex items-start gap-2 justify-between pr-8">
                    <h3 className="font-display text-base text-white tracking-wide line-clamp-2">{c.title || "Sin título"}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded uppercase tracking-wider shrink-0 ${c.side === "offensive" ? "bg-aureon-orange/30 text-aureon-orange" : "bg-aureon-blue/30 text-aureon-blue"}`}>
                      {c.side === "offensive" ? "OF" : "DEF"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{t?.name ?? "—"} · {c.category}</p>
                  {c.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {c.tags.slice(0, 4).map(tag => (
                        <span key={tag} className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded inline-flex items-center gap-0.5"><Tag className="w-2.5 h-2.5" />{tag}</span>
                      ))}
                    </div>
                  )}
                </Link>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setToDelete(c); }}
                  aria-label="Eliminar clip"
                  className="absolute top-2 right-2 z-10 inline-flex items-center justify-center w-8 h-8 rounded-md bg-black/60 border border-white/10 text-white/70 hover:bg-red-600 hover:text-white transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
      </>)}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar clip?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará "{toDelete?.title || "Sin título"}" de forma permanente. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={removeClip} className="bg-red-600 hover:bg-red-700 text-white">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ModuleShell>
  );
}
