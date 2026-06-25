import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Pencil } from "lucide-react";
import { categoryStyle, formatTaskNumber, normalizeCategory } from "@/lib/tasks";
import { Link } from "@tanstack/react-router";

type Task = {
  id: string;
  task_number: number;
  keywords: string;
  category: string;
  secondary_category?: string | null;
  image_url: string | null;
};

export function TaskCard<T extends Task>({ task, onPreview }: { task: T; onPreview: (t: T) => void }) {
  return (
    <div className="group rounded-xl border border-white/10 bg-background/50 backdrop-blur-md overflow-hidden hover:border-aureon-orange/50 hover:shadow-[0_10px_40px_-15px_oklch(0.72_0.18_55/0.6)] transition-all hover:-translate-y-0.5">
      <div className="aspect-video bg-muted/30 relative overflow-hidden">
        {task.image_url ? (
          <img
            src={task.image_url}
            alt={`Tarea ${formatTaskNumber(task.task_number)}`}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full court-stripes opacity-60" />
        )}
        <div className="absolute top-3 left-3 px-3 py-1 rounded-md bg-black/70 backdrop-blur font-display text-lg tracking-wider text-white">
          #{formatTaskNumber(task.task_number)}
        </div>
        <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
          <Badge className={categoryStyle(task.category)}>{normalizeCategory(task.category)}</Badge>
          {task.secondary_category && (
            <Badge className={categoryStyle(task.secondary_category)}>{normalizeCategory(task.secondary_category)}</Badge>
          )}
        </div>
      </div>
      <div className="p-4 space-y-3">
        <p className="text-sm font-medium line-clamp-2 min-h-[2.5rem] text-white/90">
          {task.keywords || <span className="text-muted-foreground italic">Sin palabras clave</span>}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => onPreview(task)} className="bg-aureon-blue text-white hover:brightness-110">
            <Eye className="w-4 h-4 mr-2" />
            VER
          </Button>
          <Link to="/tareas/$taskId/editar" params={{ taskId: task.id }}>
            <Button className="w-full bg-aureon-orange text-black hover:bg-aureon-orange/90">
              <Pencil className="w-4 h-4 mr-2" />
              EDITAR
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
