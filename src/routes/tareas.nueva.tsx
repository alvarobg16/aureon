import { createFileRoute } from "@tanstack/react-router";
import { ModuleShell } from "@/components/ModuleShell";
import { TaskForm } from "@/components/TaskForm";

export const Route = createFileRoute("/tareas/nueva")({
  head: () => ({
    meta: [
      { title: "Nueva tarea — Aureon Futsal Pro Suite" },
      { name: "description", content: "Crea una nueva tarea de entrenamiento de fútbol sala." },
    ],
  }),
  component: NuevaTarea,
});

function NuevaTarea() {
  return (
    <ModuleShell title="NUEVA TAREA" subtitle="La app asignará el número correlativo automáticamente">
      <div className="rounded-2xl border border-white/10 bg-background/60 backdrop-blur-md p-5 sm:p-7">
        <TaskForm mode="create" />
      </div>
    </ModuleShell>
  );
}
