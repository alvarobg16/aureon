import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ModuleShell } from "@/components/ModuleShell";
import { TrainingSessionForm, type TrainingFormInitial } from "@/components/TrainingSessionForm";
import { supabase } from "@/integrations/supabase/client";
import type { TrainingBlock } from "@/lib/training";

export const Route = createFileRoute("/entrenamientos/$sessionId/editar")({
  head: () => ({ meta: [{ title: "Editar entrenamiento — Aureon Futsal Pro Suite" }] }),
  component: EditarEntrenamiento,
});

function EditarEntrenamiento() {
  const { sessionId } = Route.useParams();
  const [initial, setInitial] = useState<TrainingFormInitial | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.from("training_sessions").select("*").eq("id", sessionId).maybeSingle();
      if (!s) { setNotFound(true); return; }
      const [{ data: st }, { data: stx }, { data: a }] = await Promise.all([
        supabase.from("training_session_tasks").select("task_id,block,order_index").eq("session_id", sessionId).order("order_index"),
        (supabase as any).from("training_session_texts").select("content,block,order_index").eq("session_id", sessionId).order("order_index"),
        supabase.from("training_attendance").select("player_id,present").eq("session_id", sessionId),
      ]);
      const items = [
        ...(((st as any[]) ?? []).map(r => ({
          kind: "task" as const, task_id: r.task_id, block: r.block as TrainingBlock, order_index: r.order_index,
        }))),
        ...(((stx as any[]) ?? []).map(r => ({
          kind: "text" as const, content: r.content ?? "", block: r.block as TrainingBlock, order_index: r.order_index,
        }))),
      ];
      setInitial({
        id: s.id,
        team_id: s.team_id,
        session_date: s.session_date,
        session_time: s.session_time,
        venue: s.venue,
        competitive_period: s.competitive_period,
        microcycle: s.microcycle,
        session_number: s.session_number,
        rival: s.rival,
        objectives: s.objectives,
        other_notes: s.other_notes,
        items,
        attendance: ((a as any[]) ?? []).map(r => ({ player_id: r.player_id, present: r.present })),
      });
    })();
  }, [sessionId]);

  if (notFound) return <ModuleShell title="EDITAR SESIÓN"><p className="text-muted-foreground">Sesión no encontrada.</p></ModuleShell>;
  if (!initial) return <ModuleShell title="EDITAR SESIÓN"><p className="text-muted-foreground">Cargando…</p></ModuleShell>;

  return (
    <ModuleShell title="EDITAR SESIÓN" subtitle="Modifica los datos de la sesión">
      <div className="rounded-2xl border border-white/10 bg-background/60 backdrop-blur-md p-5 sm:p-7">
        <TrainingSessionForm mode="edit" initial={initial} />
      </div>
    </ModuleShell>
  );
}
