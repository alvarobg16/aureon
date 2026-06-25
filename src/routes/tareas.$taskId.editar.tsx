import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ModuleShell } from "@/components/ModuleShell";
import { TaskForm, type TaskFormInitial } from "@/components/TaskForm";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/tareas/$taskId/editar")({
  head: () => ({
    meta: [
      { title: "Editar tarea — Aureon Futsal Pro Suite" },
      { name: "description", content: "Modifica los datos de una tarea existente." },
    ],
  }),
  component: EditarTarea,
});

function EditarTarea() {
  const { taskId } = Route.useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState<TaskFormInitial | null>(null);
  const [loading, setLoading] = useState(true);
  const [number, setNumber] = useState<number | null>(null);

  useEffect(() => {
    supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setTask(data as TaskFormInitial);
          setNumber((data as { task_number: number }).task_number);
        }
        setLoading(false);
      });
  }, [taskId]);

  const handleDelete = async () => {
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (error) return toast.error("Error al eliminar");
    toast.success("Tarea eliminada");
    navigate({ to: "/tareas" });
  };

  return (
    <ModuleShell
      title={number !== null ? `EDITAR TAREA #${String(number).padStart(3, "0")}` : "EDITAR TAREA"}
      subtitle="Modifica los datos y guarda los cambios"
      actions={
        task && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="w-4 h-4 mr-2" /> ELIMINAR
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar esta tarea?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer. La tarea se borrará definitivamente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : !task ? (
        <p className="text-muted-foreground">No se encontró la tarea.</p>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-background/60 backdrop-blur-md p-5 sm:p-7">
          <TaskForm mode="edit" initial={task} />
        </div>
      )}
    </ModuleShell>
  );
}
