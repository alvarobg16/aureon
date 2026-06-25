import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { listAdminUserProfiles } from "@/lib/admin-users.functions";

export const Route = createFileRoute("/admin/limites")({
  component: AdminLimits,
});

type Row = {
  user_id: string;
  email: string;
  full_name: string;
  max_clubs: number | null;
  max_teams: number | null;
};

function AdminLimits() {
  const fetchUserProfiles = useServerFn(listAdminUserProfiles);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [profiles, { data: limits }] = await Promise.all([
      fetchUserProfiles(),
      supabase.from("user_limits").select("user_id,max_clubs,max_teams"),
    ]);
    const limMap = new Map<string, { max_clubs: number | null; max_teams: number | null }>();
    (limits ?? []).forEach((l: any) => limMap.set(l.user_id, { max_clubs: l.max_clubs, max_teams: l.max_teams }));
    setRows((profiles ?? []).map((p: any) => ({
      user_id: p.user_id,
      email: p.email,
      full_name: p.full_name,
      max_clubs: limMap.get(p.user_id)?.max_clubs ?? null,
      max_teams: limMap.get(p.user_id)?.max_teams ?? null,
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = (uid: string, key: "max_clubs" | "max_teams", value: string) => {
    const v = value.trim() === "" ? null : Math.max(0, parseInt(value, 10) || 0);
    setRows(rs => rs.map(r => r.user_id === uid ? { ...r, [key]: v } : r));
  };

  const save = async (r: Row) => {
    setSaving(r.user_id);
    const { error } = await supabase
      .from("user_limits")
      .upsert({ user_id: r.user_id, max_clubs: r.max_clubs, max_teams: r.max_teams }, { onConflict: "user_id" });
    setSaving(null);
    if (error) toast.error(error.message);
    else toast.success(`Límites guardados para ${r.email}`);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display text-xl tracking-[0.1em] text-white">LÍMITES POR USUARIO</h2>
          <p className="text-xs text-muted-foreground mt-1">Vacío = sin límite. Aplica a Gestión de Club (clubs) y Gestión de Jugadores (equipos).</p>
        </div>
        <Button variant="outline" onClick={load}>Refrescar</Button>
      </div>
      {loading ? <p className="text-muted-foreground text-sm">Cargando…</p> : (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-background/40 backdrop-blur-md">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
              <tr>
                <th className="text-left p-3">Usuario</th>
                <th className="text-left p-3">Email</th>
                <th className="p-3">Máx. clubs</th>
                <th className="p-3">Máx. equipos</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.user_id} className="border-t border-white/5 text-white">
                  <td className="p-3">{r.full_name || "—"}</td>
                  <td className="p-3 text-muted-foreground">{r.email}</td>
                  <td className="p-3 text-center">
                    <Input type="number" min={0} value={r.max_clubs ?? ""} placeholder="∞"
                      onChange={(e) => update(r.user_id, "max_clubs", e.target.value)} className="w-24 mx-auto text-center" />
                  </td>
                  <td className="p-3 text-center">
                    <Input type="number" min={0} value={r.max_teams ?? ""} placeholder="∞"
                      onChange={(e) => update(r.user_id, "max_teams", e.target.value)} className="w-24 mx-auto text-center" />
                  </td>
                  <td className="p-3 text-center">
                    <Button size="sm" onClick={() => save(r)} disabled={saving === r.user_id}>
                      {saving === r.user_id ? "Guardando…" : "Guardar"}
                    </Button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Sin usuarios.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
