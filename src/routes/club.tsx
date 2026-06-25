import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, Upload, Image as ImageIcon, Star } from "lucide-react";
import { useScope } from "@/lib/scope";
import { ModuleShell } from "@/components/ModuleShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getMyLimits } from "@/lib/limits";

export const Route = createFileRoute("/club")({
  head: () => ({
    meta: [
      { title: "Gestión de Club — Aureon Futsal Pro Suite" },
      { name: "description", content: "Crea y gestiona los equipos del club por categoría y competición." },
    ],
  }),
  component: ClubPage,
});

type Team = {
  id: string;
  name: string;
  category: string;
  competition: string;
  photo_url: string | null;
  created_at: string;
};

function ClubPage() {
  const scope = useScope();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Team | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [competition, setCompetition] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Team | null>(null);
  const [maxTeams, setMaxTeams] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("teams").select("*").order("created_at", { ascending: true });
    if (error) toast.error("Error cargando equipos");
    setTeams((data as Team[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    getMyLimits().then(l => setMaxTeams(l.max_clubs));
  }, []);

  const reset = () => {
    setEditing(null);
    setName("");
    setCategory("");
    setCompetition("");
    setPhotoUrl(null);
  };

  const atLimit = maxTeams != null && teams.length >= maxTeams;

  const openNew = () => {
    if (atLimit) {
      toast.error(`Has alcanzado el límite asignado por el administrador (${maxTeams}).`);
      return;
    }
    reset();
    setOpen(true);
  };

  const openEdit = (t: Team) => {
    setEditing(t);
    setName(t.name);
    setCategory(t.category);
    setCompetition(t.competition ?? "");
    setPhotoUrl(t.photo_url);
    setOpen(true);
  };

  const handleUpload = async (file: File) => {
    if (file.size > 4 * 1024 * 1024) {
      toast.error("La imagen debe ser menor de 4MB");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() || "png";
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id;
    if (!uid) {
      toast.error("Debes iniciar sesión");
      setUploading(false);
      return;
    }
    const path = `${uid}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("team-photos").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) {
      toast.error("Error al subir la imagen");
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("team-photos").getPublicUrl(path);
    setPhotoUrl(data.publicUrl);
    setUploading(false);
  };

  const save = async () => {
    if (!name.trim()) {
      toast.error("Indica el nombre del equipo");
      return;
    }
    setSaving(true);
    const payload = {
      name: name.trim(),
      category: category.trim(),
      competition: competition.trim(),
      photo_url: photoUrl,
    };
    if (editing) {
      const { error } = await supabase.from("teams").update(payload).eq("id", editing.id);
      if (error) toast.error("Error al actualizar");
      else toast.success("Equipo actualizado");
    } else {
      const { error } = await supabase.from("teams").insert(payload);
      if (error) toast.error("Error al crear");
      else toast.success("Equipo creado");
    }
    setSaving(false);
    setOpen(false);
    load();
    scope.refresh();
  };

  const remove = async () => {
    if (!confirmDelete) return;
    const { error } = await supabase.from("teams").delete().eq("id", confirmDelete.id);
    if (error) toast.error("Error al eliminar");
    else toast.success("Equipo eliminado");
    setConfirmDelete(null);
    load();
    scope.refresh();
  };

  return (
    <ModuleShell
      title="GESTIÓN DE CLUB"
      subtitle="Equipos · Categorías · Competiciones"
      actions={
        <Button onClick={openNew} disabled={atLimit} className="gap-2 font-display tracking-wider">
          <Plus className="w-4 h-4" /> AÑADIR EQUIPO {maxTeams != null && <span className="text-xs opacity-70">({teams.length}/{maxTeams})</span>}
        </Button>
      }
    >
      {loading ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : teams.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-background/40 backdrop-blur p-10 text-center">
          <p className="text-muted-foreground">No hay equipos todavía. Pulsa AÑADIR EQUIPO para crear el primero.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((t) => {
            const isDefault = scope.defaultTeamId === t.id;
            return (
            <div
              key={t.id}
              className={`rounded-2xl border bg-gradient-to-br from-aureon-red/40 to-aureon-orange/20 backdrop-blur p-5 ring-1 ${isDefault ? "border-aureon-orange ring-aureon-orange/60" : "border-white/10 ring-aureon-red/30"}`}
            >
              <div className="flex items-start gap-3">
                <div className="w-16 h-16 rounded-xl border border-white/20 bg-background/40 flex items-center justify-center overflow-hidden shrink-0">
                  {t.photo_url ? (
                    <img src={t.photo_url} alt={t.name} className="w-full h-full object-contain" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-2xl tracking-wide truncate">{t.name}</h3>
                    {isDefault && (
                      <span className="text-[9px] font-display tracking-[0.2em] bg-aureon-orange text-black px-1.5 py-0.5 rounded">
                        PREDETERMINADO
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{t.category || "Sin categoría"}</p>
                  {t.competition && (
                    <p className="text-xs text-aureon-orange mt-0.5 truncate">🏆 {t.competition}</p>
                  )}
                </div>
              </div>
              <div className="mt-4 flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant={isDefault ? "secondary" : "outline"}
                  onClick={async () => {
                    await scope.setDefaultTeam(t.id);
                    scope.setActiveTeam(t.id);
                    toast.success(isDefault ? "Sigue como predeterminado" : `${t.name} es ahora tu equipo predeterminado`);
                  }}
                  className="gap-1"
                  title="Cargar este equipo automáticamente al iniciar"
                >
                  <Star className={`w-3.5 h-3.5 ${isDefault ? "fill-aureon-orange text-aureon-orange" : ""}`} />
                  {isDefault ? "Predeterminado" : "Marcar predeterminado"}
                </Button>
                <Button size="sm" onClick={() => openEdit(t)} className="gap-1 bg-aureon-orange text-black hover:bg-aureon-orange/90">
                  <Pencil className="w-3.5 h-3.5" /> Editar
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setConfirmDelete(t)} className="gap-1">
                  <Trash2 className="w-3.5 h-3.5" /> Eliminar
                </Button>
              </div>
            </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar equipo" : "Nuevo equipo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl border border-white/20 bg-background/40 flex items-center justify-center overflow-hidden shrink-0">
                {photoUrl ? (
                  <img src={photoUrl} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <ImageIcon className="w-7 h-7 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(f);
                  }}
                />
                <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading} className="gap-2">
                  <Upload className="w-4 h-4" />
                  {uploading ? "Subiendo…" : "Subir foto / escudo"}
                </Button>
                {photoUrl && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setPhotoUrl(null)}>
                    Quitar foto
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-name">Nombre del equipo</Label>
              <Input id="team-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-cat">Categoría</Label>
              <Input id="team-cat" value={category} onChange={(e) => setCategory(e.target.value)} maxLength={100} placeholder="Ej. Senior, Juvenil, Cadete…" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-comp">Competición</Label>
              <Input id="team-comp" value={competition} onChange={(e) => setCompetition(e.target.value)} maxLength={150} placeholder="Ej. Liga Nacional, Copa del Rey, Liga Local…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving || uploading}>{saving ? "Guardando…" : "Aceptar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar equipo?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a eliminar “{confirmDelete?.name}”. Los jugadores asignados quedarán sin equipo. Esta acción no se puede deshacer.
            </AlertDialogDescription>
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
