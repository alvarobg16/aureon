import { Link } from "@tanstack/react-router";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b border-border/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <Link to="/tareas-modulo" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-lg bg-gradient-court flex items-center justify-center shadow-card group-hover:shadow-glow transition-shadow">
            <span className="font-display text-xl text-primary-foreground leading-none">P5</span>
          </div>
          <div className="leading-tight">
            <div className="font-display text-2xl tracking-wide">AM FUTSALBOARD</div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground -mt-0.5">
              V1.0 · Tareas Fútbol Sala
            </div>
          </div>
        </Link>
        <nav className="hidden sm:flex gap-6 text-sm font-medium">
          <Link to="/tareas/nueva" activeProps={{ className: "text-primary" }} className="hover:text-primary transition-colors">Nueva</Link>
          <Link to="/tareas" activeProps={{ className: "text-primary" }} className="hover:text-primary transition-colors">Listado</Link>
          <Link to="/buscar" activeProps={{ className: "text-primary" }} className="hover:text-primary transition-colors">Buscar</Link>
        </nav>
      </div>
    </header>
  );
}
