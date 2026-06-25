import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ModuleShell } from "@/components/ModuleShell";
import { TrainingSessionForm } from "@/components/TrainingSessionForm";

const searchSchema = z.object({
  date: z.string().optional(),
  from: z.string().optional(),
});

export const Route = createFileRoute("/entrenamientos/nuevo")({
  head: () => ({
    meta: [
      { title: "Nuevo entrenamiento — Aureon Futsal Pro Suite" },
      { name: "description", content: "Crea una nueva sesión de entrenamiento." },
    ],
  }),
  validateSearch: (s) => searchSchema.parse(s),
  component: NuevoEntrenamiento,
});

function NuevoEntrenamiento() {
  const { date, from } = Route.useSearch();
  return (
    <ModuleShell title="NUEVA SESIÓN" subtitle="Planificación de entrenamiento">
      <div className="rounded-2xl border border-white/10 bg-background/60 backdrop-blur-md p-5 sm:p-7">
        <TrainingSessionForm
          mode="create"
          initial={date ? { session_date: date } : undefined}
          returnTo={from === "planning" ? "planning" : undefined}
        />
      </div>
    </ModuleShell>
  );
}
