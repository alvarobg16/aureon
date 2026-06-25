import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ModuleShell } from "@/components/ModuleShell";
import { supabase } from "@/integrations/supabase/client";
import { TaskCard } from "@/components/TaskCard";
import { TaskPreviewDialog } from "@/components/TaskPreviewDialog";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";

export const Route = createFileRoute("/tareas/")({
  head: () => ({
    meta: [
      { title: "Listado de tareas — Aureon Futsal Pro Suite" },
      { name: "description", content: "Listado de todas las tareas de entrenamiento de fútbol sala." },
    ],
  }),
  component: ListadoTareas,
});

type Task = {
  id: string;
  task_number: number;
  description: string;
  keywords: string;
  category: string;
  secondary_category: string | null;
  image_url: string | null;
  video_url: string | null;
  surface: string;
  players: string;
  material: string;
  duration: string;
  other_notes: string;
};

function ListadoTareas() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Task | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    supabase
      .from("tasks")
      .select("*")
      .order("task_number", { ascending: true })
      .then(({ data }) => {
        setTasks((data ?? []) as Task[]);
        setLoading(false);
      });
  }, []);

  return (
    <ModuleShell
      title="TAREAS"
      subtitle={`${tasks.length} ${tasks.length === 1 ? "tarea registrada" : "tareas registradas"}`}
      actions={
        <Link to="/tareas/nueva">
          <Button className="gap-2 font-display tracking-wider bg-aureon-orange text-black hover:bg-aureon-orange/90">
            <Plus className="w-4 h-4" /> NUEVA TAREA
          </Button>
        </Link>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border border-dashed border-white/15 bg-background/40 backdrop-blur">
          <p className="text-muted-foreground mb-4">Aún no hay tareas. Crea la primera.</p>
          <Link to="/tareas/nueva">
            <Button className="bg-aureon-orange text-black hover:bg-aureon-orange/90"><Plus className="w-4 h-4 mr-2" /> Añadir tarea</Button>
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {tasks.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              onPreview={(task) => {
                setSelected(task);
                setOpen(true);
              }}
            />
          ))}
        </div>
      )}

      <TaskPreviewDialog task={selected} open={open} onOpenChange={setOpen} />
    </ModuleShell>
  );
}
