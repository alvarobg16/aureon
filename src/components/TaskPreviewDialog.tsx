import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { categoryStyle, formatTaskNumber, normalizeCategory } from "@/lib/tasks";

type Task = {
  task_number: number;
  description: string;
  keywords: string;
  category: string;
  secondary_category?: string | null;
  image_url: string | null;
  video_url?: string | null;
  surface?: string;
  players?: string;
  material?: string;
  duration?: string;
  other_notes?: string;
};

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}

export function TaskPreviewDialog({
  task,
  open,
  onOpenChange,
}: {
  task: Task | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {task && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-display text-3xl text-primary">#{formatTaskNumber(task.task_number)}</span>
                <Badge className={categoryStyle(task.category)}>{normalizeCategory(task.category)}</Badge>
                {task.secondary_category && (
                  <Badge className={categoryStyle(task.secondary_category)}>{normalizeCategory(task.secondary_category)}</Badge>
                )}
              </div>
              <DialogTitle className="text-left font-display text-2xl tracking-wide">
                {task.keywords || "Tarea de entrenamiento"}
              </DialogTitle>
            </DialogHeader>

            {task.image_url && (
              <div className="rounded-lg overflow-hidden bg-muted shadow-card">
                <img
                  src={task.image_url}
                  alt={`Tarea ${formatTaskNumber(task.task_number)}`}
                  className="w-full max-h-[50vh] object-contain bg-black/5"
                />
              </div>
            )}

            {task.video_url && (
              <div className="rounded-lg overflow-hidden bg-black shadow-card">
                <video src={task.video_url} controls className="w-full max-h-[50vh]" />
              </div>
            )}

            {task.description && (
              <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                {task.description}
              </p>
            )}

            {(task.surface || task.players || task.material || task.duration || task.other_notes) && (
              <div className="grid sm:grid-cols-2 gap-3 p-4 rounded-lg bg-muted/40 border border-border/60">
                <Field label="Superficie de juego" value={task.surface} />
                <Field label="Nº de jugadores" value={task.players} />
                <Field label="Material" value={task.material} />
                <Field label="Tiempo" value={task.duration} />
                <div className="sm:col-span-2">
                  <Field label="Otros aspectos" value={task.other_notes} />
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
