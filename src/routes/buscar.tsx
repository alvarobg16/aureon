import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ModuleShell } from "@/components/ModuleShell";
import { supabase } from "@/integrations/supabase/client";
import { TaskCard } from "@/components/TaskCard";
import { TaskPreviewDialog } from "@/components/TaskPreviewDialog";
import { Input } from "@/components/ui/input";
import { CATEGORIES, categoryStyle, normalizeCategory } from "@/lib/tasks";
import { Search as SearchIcon, Loader2 } from "lucide-react";

export const Route = createFileRoute("/buscar")({
  head: () => ({
    meta: [
      { title: "Buscar tareas — Aureon Futsal Pro Suite" },
      { name: "description", content: "Busca tareas por palabras clave o por concepto táctico." },
    ],
  }),
  component: BuscarTareas,
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

function BuscarTareas() {
  const [all, setAll] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [activeCats, setActiveCats] = useState<string[]>([]);
  const [selected, setSelected] = useState<Task | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    supabase
      .from("tasks")
      .select("*")
      .order("task_number", { ascending: true })
      .then(({ data }) => {
        setAll((data ?? []) as Task[]);
        setLoading(false);
      });
  }, []);

  const toggleCat = (c: string) =>
    setActiveCats((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    return all.filter((t) => {
      if (activeCats.length) {
        const taskCats = [normalizeCategory(t.category), normalizeCategory(t.secondary_category)].filter(Boolean) as string[];
        if (!activeCats.some((c) => taskCats.includes(c))) return false;
      }
      if (!term) return true;
      return (
        t.keywords.toLowerCase().includes(term) ||
        t.description.toLowerCase().includes(term) ||
        t.category.toLowerCase().includes(term) ||
        String(t.task_number).padStart(3, "0").includes(term)
      );
    });
  }, [all, q, activeCats]);

  return (
    <ModuleShell title="BUSCAR TAREAS" subtitle="Filtra por palabras clave o concepto">
      <div className="rounded-2xl border border-white/10 bg-background/50 backdrop-blur-md p-5 mb-6 space-y-4">
        <div className="relative">
          <SearchIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Busca por palabras clave, descripción o nº de tarea..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-12 h-12 text-base bg-background/60 border-white/15 text-white"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="text-xs uppercase tracking-wider text-muted-foreground self-center mr-1">Concepto:</span>
          {CATEGORIES.map((c) => {
            const active = activeCats.includes(c);
            return (
              <button
                key={c}
                onClick={() => toggleCat(c)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  active ? `${categoryStyle(c)} border-transparent shadow-card` : "bg-background/40 border-white/15 text-white/80 hover:border-aureon-orange/60"
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-4">
            {results.length} {results.length === 1 ? "resultado" : "resultados"}
          </p>
          {results.length === 0 ? (
            <div className="text-center py-16 rounded-2xl border border-dashed border-white/15 bg-background/40 backdrop-blur">
              <p className="text-muted-foreground">No hay tareas que coincidan con tu búsqueda.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {results.map((t) => (
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
        </>
      )}

      <TaskPreviewDialog task={selected} open={open} onOpenChange={setOpen} />
    </ModuleShell>
  );
}
