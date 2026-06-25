import { useEffect, useRef, useState } from "react";
import { Upload, Footprints, Hand } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { POSITIONS, type Position } from "@/lib/players";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type PlayerFormValues = {
  id?: string;
  first_name: string;
  last_name: string;
  sport_name: string;
  jersey_number: number | null;
  position: Position;
  dominant_foot: "right" | "left";
  dominant_hand: "right" | "left" | null;
  phone: string;
  email: string;
  birth_date: string | null;
  photo_url: string | null;
  team_id: string | null;
};

type Team = { id: string; name: string; category: string };

const empty: PlayerFormValues = {
  first_name: "",
  last_name: "",
  sport_name: "",
  jersey_number: null,
  position: "Universal",
  dominant_foot: "right",
  dominant_hand: null,
  phone: "",
  email: "",
  birth_date: null,
  photo_url: null,
  team_id: null,
};

export function PlayerForm({
  initial,
  teams,
  onSubmit,
  onCancel,
  saving,
}: {
  initial?: Partial<PlayerFormValues>;
  teams: Team[];
  onSubmit: (v: PlayerFormValues) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [v, setV] = useState<PlayerFormValues>({ ...empty, ...initial } as PlayerFormValues);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (v.position !== "Portero" && v.dominant_hand !== null) {
      setV((s) => ({ ...s, dominant_hand: null }));
    }
  }, [v.position]);

  const upload = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id;
    if (!uid) { toast.error("Debes iniciar sesión"); setUploading(false); return; }
    const path = `${uid}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("player-photos").upload(path, file, { upsert: false });
    if (error) {
      toast.error("Error subiendo foto");
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("player-photos").getPublicUrl(path);
    setV((s) => ({ ...s, photo_url: data.publicUrl }));
    setUploading(false);
  };

  const submit = () => {
    if (!v.first_name.trim() || !v.last_name.trim()) {
      toast.error("Nombre y apellidos son obligatorios");
      return;
    }
    if (v.position === "Portero" && !v.dominant_hand) {
      toast.error("Indica la mano dominante del portero");
      return;
    }
    onSubmit(v);
  };

  return (
    <div className="grid gap-5 md:grid-cols-[180px_1fr]">
      <div className="space-y-2">
        <Label>Foto</Label>
        <div className="aspect-square rounded-xl border border-white/10 bg-background/50 overflow-hidden flex items-center justify-center">
          {v.photo_url ? (
            <img src={v.photo_url} alt="Jugador" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs text-muted-foreground">Sin foto</span>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        />
        <Button type="button" variant="secondary" size="sm" className="w-full gap-2" onClick={() => fileRef.current?.click()} disabled={uploading}>
          <Upload className="w-3.5 h-3.5" />
          {uploading ? "Subiendo…" : "Cargar foto"}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Nombre</Label>
          <Input value={v.first_name} maxLength={60} onChange={(e) => setV({ ...v, first_name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Apellidos</Label>
          <Input value={v.last_name} maxLength={100} onChange={(e) => setV({ ...v, last_name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Nombre deportivo</Label>
          <Input value={v.sport_name} maxLength={40} onChange={(e) => setV({ ...v, sport_name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Dorsal</Label>
          <Input
            type="number"
            min={1}
            max={99}
            value={v.jersey_number ?? ""}
            onChange={(e) => setV({ ...v, jersey_number: e.target.value ? Number(e.target.value) : null })}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Posición</Label>
          <Select value={v.position} onValueChange={(val) => setV({ ...v, position: val as Position })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {POSITIONS.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Pierna dominante</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={v.dominant_foot === "right" ? "default" : "outline"}
              className="flex-1 gap-2"
              onClick={() => setV({ ...v, dominant_foot: "right" })}
            >
              <Footprints className="w-4 h-4" /> Diestro
            </Button>
            <Button
              type="button"
              variant={v.dominant_foot === "left" ? "default" : "outline"}
              className="flex-1 gap-2"
              onClick={() => setV({ ...v, dominant_foot: "left" })}
            >
              <Footprints className="w-4 h-4 -scale-x-100" /> Zurdo
            </Button>
          </div>
        </div>

        {v.position === "Portero" && (
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Mano dominante</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={v.dominant_hand === "right" ? "default" : "outline"}
                className="flex-1 gap-2"
                onClick={() => setV({ ...v, dominant_hand: "right" })}
              >
                <Hand className="w-4 h-4" /> Diestro
              </Button>
              <Button
                type="button"
                variant={v.dominant_hand === "left" ? "default" : "outline"}
                className="flex-1 gap-2"
                onClick={() => setV({ ...v, dominant_hand: "left" })}
              >
                <Hand className="w-4 h-4 -scale-x-100" /> Zurdo
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Teléfono</Label>
          <Input value={v.phone} maxLength={30} onChange={(e) => setV({ ...v, phone: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input type="email" value={v.email} maxLength={120} onChange={(e) => setV({ ...v, email: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Fecha de nacimiento</Label>
          <Input type="date" value={v.birth_date ?? ""} onChange={(e) => setV({ ...v, birth_date: e.target.value || null })} />
        </div>
        <div className="space-y-1.5">
          <Label>Equipo</Label>
          <Select
            value={v.team_id ?? "none"}
            onValueChange={(val) => setV({ ...v, team_id: val === "none" ? null : val })}
          >
            <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin asignar</SelectItem>
              {teams.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}{t.category ? ` · ${t.category}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
          <Button type="button" onClick={submit} disabled={saving}>
            {saving ? "Guardando…" : "Aceptar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
