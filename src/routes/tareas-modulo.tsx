import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, ListOrdered, Search, Dumbbell, Video, Film } from "lucide-react";
import { ModuleShell } from "@/components/ModuleShell";

export const Route = createFileRoute("/tareas-modulo")({
  head: () => ({
    meta: [
      { title: "Gestión de Tareas — Aureon Futsal Pro Suite" },
      { name: "description", content: "Crea, organiza y busca tareas de entrenamiento de fútbol sala." },
    ],
  }),
  component: Index,
});

type Variant = "primary" | "secondary" | "accent" | "training" | "scouting" | "analysis";

function ActionCard({
  to,
  icon,
  title,
  subtitle,
  variant,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  variant: Variant;
}) {
  const styles: Record<Variant, string> = {
    primary: "from-aureon-orange/80 to-aureon-red/30 ring-aureon-orange/40",
    secondary: "from-aureon-blue/80 to-aureon-blue/20 ring-aureon-blue/40",
    accent: "from-aureon-red/80 to-aureon-orange/30 ring-aureon-red/40",
    training: "from-emerald-500/80 to-aureon-blue/30 ring-emerald-400/40",
    scouting: "from-violet-500/80 to-aureon-orange/30 ring-violet-400/40",
    analysis: "from-cyan-500/80 to-aureon-blue/30 ring-cyan-400/40",
  };
  return (
    <Link
      to={to}
      className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-background/40 backdrop-blur-md ring-1 ${styles[variant]} bg-gradient-to-br p-6 sm:p-8 transition-all hover:-translate-y-1 hover:shadow-[0_20px_60px_-20px_oklch(0.65_0.2_240/0.6)]`}
    >
      <div className="absolute -right-6 -top-6 opacity-15 group-hover:opacity-25 transition-opacity">
        <div className="[&>svg]:w-32 [&>svg]:h-32 text-white">{icon}</div>
      </div>
      <div className="relative">
        <div className="[&>svg]:w-8 [&>svg]:h-8 mb-4 text-white">{icon}</div>
        <h2 className="font-display text-2xl sm:text-3xl tracking-[0.06em] leading-none text-white">{title}</h2>
        <p className="mt-2 text-sm text-white/85">{subtitle}</p>
      </div>
    </Link>
  );
}

function Index() {
  return (
    <ModuleShell title="GESTIÓN DE TAREAS, ENTRENAMIENTOS Y SCOUTING" subtitle="Tareas · Entrenamientos · Scouting · Conceptos · Búsqueda">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ActionCard
          to="/tareas/nueva"
          icon={<Plus />}
          title="AÑADIR NUEVA TAREA"
          subtitle="Sube imagen y vídeo, describe la jugada y etiqueta el concepto."
          variant="primary"
        />
        <ActionCard
          to="/tareas"
          icon={<ListOrdered />}
          title="VER TAREAS"
          subtitle="Listado completo con número, palabras clave y previsualización."
          variant="secondary"
        />
        <ActionCard
          to="/buscar"
          icon={<Search />}
          title="BUSCAR TAREAS"
          subtitle="Filtra por palabras clave o por concepto táctico."
          variant="accent"
        />
        <ActionCard
          to="/entrenamientos"
          icon={<Dumbbell />}
          title="GESTIÓN DE ENTRENAMIENTOS"
          subtitle="Planifica sesiones, controla asistencia y exporta a PDF."
          variant="training"
        />
        <ActionCard
          to="/scouting"
          icon={<Video />}
          title="GESTIÓN DE SCOUTING"
          subtitle="Sube clips de rivales, etiqueta y filtra por equipo y categoría."
          variant="scouting"
        />
        <ActionCard
          to="/analisis"
          icon={<Film />}
          title="ANÁLISIS DE PARTIDOS"
          subtitle="Tagging en directo, clips automáticos y videoresumen por categorías."
          variant="analysis"
        />
      </div>
    </ModuleShell>
  );
}
