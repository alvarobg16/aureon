import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { listAdminUserProfiles } from "@/lib/admin-users.functions";

export const Route = createFileRoute("/admin/logs")({
  component: AdminLogs,
});

type LogRow = { id: string; user_id: string | null; action: string; metadata: Record<string, unknown>; created_at: string };
type Profile = { user_id: string; email: string; full_name: string };

function AdminLogs() {
  const fetchUserProfiles = useServerFn(listAdminUserProfiles);
  const [rows, setRows] = useState<LogRow[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [filter, setFilter] = useState("");

  useEffect(() => {
    (async () => {
      const [{ data: logs }, profs] = await Promise.all([
        supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(300),
        fetchUserProfiles(),
      ]);
      setRows((logs ?? []) as LogRow[]);
      setProfiles(new Map((profs ?? []).map((p) => [p.user_id, p as Profile])));
    })();
  }, []);

  const filtered = filter ? rows.filter((r) => r.action.includes(filter)) : rows;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="font-display text-xl tracking-[0.1em] text-white">REGISTRO DE ACTIVIDAD</h2>
        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="filtrar acción…" className="ml-auto h-8 px-3 rounded-md bg-background/50 border border-white/20 text-white text-sm" />
      </div>
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-background/40 backdrop-blur-md">
        <table className="w-full text-xs">
          <thead className="uppercase tracking-[0.15em] text-muted-foreground">
            <tr><th className="text-left p-3">Fecha</th><th className="text-left p-3">Usuario</th><th className="text-left p-3">Acción</th><th className="text-left p-3">Detalles</th></tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const p = r.user_id ? profiles.get(r.user_id) : undefined;
              return (
                <tr key={r.id} className="border-t border-white/5 text-white">
                  <td className="p-3 text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="p-3">{p?.email ?? "—"}</td>
                  <td className="p-3"><code className="text-aureon-orange">{r.action}</code></td>
                  <td className="p-3 text-muted-foreground"><code>{JSON.stringify(r.metadata)}</code></td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Sin registros.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
