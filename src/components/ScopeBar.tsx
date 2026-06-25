import { Link } from "@tanstack/react-router";
import { useScope } from "@/lib/scope";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, CalendarRange, AlertCircle } from "lucide-react";

export function ScopeBar() {
  const { teams, seasons, activeTeamId, activeSeasonId, setActiveTeam, setActiveSeason, loading } = useScope();

  if (loading) return null;

  if (teams.length === 0) {
    return (
      <div className="rounded-xl border border-aureon-orange/40 bg-aureon-orange/10 px-4 py-2.5 text-sm flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-aureon-orange shrink-0" />
        <span>No tienes equipos.</span>
        <Link to="/club" className="text-aureon-orange underline font-medium">Crear equipo</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-background/60 border border-white/10">
        <Trophy className="w-3.5 h-3.5 text-aureon-orange" />
        <Select value={activeTeamId ?? ""} onValueChange={(v) => setActiveTeam(v)}>
          <SelectTrigger className="h-7 border-0 bg-transparent px-1 text-xs font-display tracking-wider min-w-[120px] focus:ring-0">
            <SelectValue placeholder="Equipo" />
          </SelectTrigger>
          <SelectContent>
            {teams.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name} {t.category ? `· ${t.category}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-background/60 border border-white/10">
        <CalendarRange className="w-3.5 h-3.5 text-aureon-blue" />
        <Select
          value={activeSeasonId ?? ""}
          onValueChange={(v) => setActiveSeason(v)}
          disabled={seasons.length === 0}
        >
          <SelectTrigger className="h-7 border-0 bg-transparent px-1 text-xs font-display tracking-wider min-w-[110px] focus:ring-0">
            <SelectValue placeholder={seasons.length === 0 ? "Sin temporadas" : "Temporada"} />
          </SelectTrigger>
          <SelectContent>
            {seasons.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}{s.is_active ? " ★" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
