import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ModuleShell } from "@/components/ModuleShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Eye, Pencil, Trash2, FileText, Search } from "lucide-react";

export const Route = createFileRoute("/entrenamientos/")({
  head: () => ({
    meta: [
      { title: "Gestión de entrenamientos — Aureon Futsal Pro Suite" },
      { name: "description", content: "Sesiones de entrenamiento planificadas." },
    ],
  }),
  component: EntrenamientosIndex,
});

type Row = {
  id: string;
  team_id: string;
  session_date: string | null;
  session_time: string;
  microcycle: string;
  session_number: string;
  rival: string;
  venue: string;
  team_name?: string;
  team_category?: string;
};

function EntrenamientosIndex() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [delTarget, setDelTarget] = useState<Row | null>(null);
  const [delBusy, setDelBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: s }, { data: t }] = await Promise.all([
      supabase.from("training_sessions").select("*").order("session_date", { ascending: false }),
      supabase.from("teams").select("id,name,category"),
    ]);
    const teamsMap = new Map<string, { name: string; category: string }>();
    (t ?? []).forEach((x: any) => teamsMap.set(x.id, { name: x.name, category: x.category }));
    const enriched: Row[] = ((s as any[]) ?? []).map((r) => ({
      ...r,
      team_name: teamsMap.get(r.team_id)?.name,
      team_category: teamsMap.get(r.team_id)?.category,
    }));
    setRows(enriched);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = rows.filter((r) => {
    const k = q.trim().toLowerCase();
    if (!k) return true;
    return [r.team_name, r.rival, r.microcycle, r.session_number, r.venue].some(v => (v ?? "").toLowerCase().includes(k));
  });

  const doDelete = async () => {
    if (!delTarget) return;
    setDelBusy(true);
    // Eliminar primero el evento de planificación vinculado para mantener sincronía.
    await (supabase as any).from("planning_events").delete().eq("training_session_id", delTarget.id);
    const { error } = await supabase.from("training_sessions").delete().eq("id", delTarget.id);
    setDelBusy(false);
    if (error) { toast.error("No se pudo eliminar"); return; }
    toast.success("Sesión eliminada");
    setDelTarget(null);
    load();
  };

  return (
    <ModuleShell
      title="ENTRENAMIENTOS"
      subtitle="Sesiones planificadas"
      actions={
        <Button onClick={() => navigate({ to: "/entrenamientos/nuevo" })}
          className="bg-aureon-orange text-black hover:bg-aureon-orange/90 font-display tracking-wider">
          <Plus className="w-4 h-4 mr-1" /> NUEVA SESIÓN
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <Input className="pl-9" placeholder="Buscar por equipo, rival, microciclo…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        {loading ? (
          <p className="text-muted-foreground">Cargando…</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-background/40 backdrop-blur p-10 text-center text-white/80">
            <p className="font-display text-lg tracking-wider">Aún no hay sesiones planificadas.</p>
            <Button onClick={() => navigate({ to: "/entrenamientos/nuevo" })} className="mt-4 bg-aureon-orange text-black hover:bg-aureon-orange/90 font-display tracking-wider">
              <Plus className="w-4 h-4 mr-1" /> CREAR LA PRIMERA
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-background/40 backdrop-blur overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white/10 text-xs uppercase tracking-[0.2em] text-white font-display">
                <tr>
                  <th className="text-left p-3">Fecha</th>
                  <th className="text-left p-3">Hora</th>
                  <th className="text-left p-3">Equipo</th>
                  <th className="text-left p-3">Microciclo</th>
                  <th className="text-left p-3">Nº</th>
                  <th className="text-left p-3">Rival</th>
                  <th className="text-right p-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-white/5">
                    <td className="p-3 text-white">{r.session_date ?? "—"}</td>
                    <td className="p-3 text-white">{r.session_time || "—"}</td>
                    <td className="p-3 text-white">{r.team_name ?? "—"}{r.team_category ? <span className="text-white/60 text-xs"> · {r.team_category}</span> : null}</td>
                    <td className="p-3 text-white">{r.microcycle || "—"}</td>
                    <td className="p-3 text-white">{r.session_number || "—"}</td>
                    <td className="p-3 text-white">{r.rival || "—"}</td>
                    <td className="p-3 text-right">
                      <div className="inline-flex gap-1">
                        <Link to="/entrenamientos/$sessionId" params={{ sessionId: r.id }} search={{}}
                          className="inline-flex items-center gap-1 text-xs font-display tracking-wider px-2.5 py-1.5 rounded-md bg-white text-black hover:bg-white/90">
                          <Eye className="w-3.5 h-3.5" /> VER
                        </Link>
                        <Link to="/entrenamientos/$sessionId" params={{ sessionId: r.id }} search={{ print: "1" }}
                          className="inline-flex items-center gap-1 text-xs font-display tracking-wider px-2.5 py-1.5 rounded-md bg-aureon-blue text-white hover:brightness-110">
                          <FileText className="w-3.5 h-3.5" /> PDF
                        </Link>
                        <Link to="/entrenamientos/$sessionId/editar" params={{ sessionId: r.id }}
                          className="inline-flex items-center gap-1 text-xs font-display tracking-wider px-2.5 py-1.5 rounded-md bg-amber-500 text-black hover:brightness-110">
                          <Pencil className="w-3.5 h-3.5" /> EDITAR
                        </Link>
                        <button
                          onClick={() => setDelTarget(r)}
                          className="inline-flex items-center gap-1 text-xs font-display tracking-wider px-2.5 py-1.5 rounded-md bg-destructive text-destructive-foreground hover:brightness-110"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> ELIMINAR
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AlertDialog open={!!delTarget} onOpenChange={(o) => !o && setDelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar sesión de entrenamiento</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminarán también las tareas y la asistencia asociadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} disabled={delBusy} className="bg-destructive text-destructive-foreground">
              {delBusy ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ModuleShell>
  );
}
