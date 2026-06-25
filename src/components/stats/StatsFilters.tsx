import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type FilterState = {
  seasonId: string;
  matchId: string;
  playerId: string;
  actionType: string;
  prevAction: string;     // '__all__' or text
  finishingFoot: string;  // '__all__' or text
  secondPost: string;     // '__all__' | 'yes' | 'no'
};

type Props = {
  state: FilterState;
  onChange: (s: FilterState) => void;
  seasons: Array<{ id: string; name: string }>;
  matches: Array<{ id: string; label: string; season_id: string | null }>;
  players: Array<{ id: string; name: string }>;
  prevActions?: string[];
  finishingFeet?: string[];
};

export function StatsFilters({ state, onChange, seasons, matches, players, prevActions = [], finishingFeet = [] }: Props) {
  const matchOpts = state.seasonId === "__all__"
    ? matches
    : matches.filter(m => m.season_id === state.seasonId);

  const cell = (label: string, child: React.ReactNode) => (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-white/80 mb-1 font-semibold">{label}</p>
      {child}
    </div>
  );

  return (
    <div className="rounded-2xl border border-white/10 bg-background/40 backdrop-blur p-4 grid gap-3 grid-cols-2 lg:grid-cols-4">
      {cell("Temporada",
        <Select value={state.seasonId} onValueChange={(v) => onChange({ ...state, seasonId: v, matchId: "__all__" })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas</SelectItem>
            {seasons.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      {cell("Partido",
        <Select value={state.matchId} onValueChange={(v) => onChange({ ...state, matchId: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos</SelectItem>
            {matchOpts.map(m => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      {cell("Jugador",
        <Select value={state.playerId} onValueChange={(v) => onChange({ ...state, playerId: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos</SelectItem>
            {players.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      {cell("Tipo de acción",
        <Select value={state.actionType} onValueChange={(v) => onChange({ ...state, actionType: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="goals">Goles</SelectItem>
            <SelectItem value="shots">Tiros (todos)</SelectItem>
            <SelectItem value="shot_on">Tiro portería</SelectItem>
            <SelectItem value="shot_out">Tiro fuera</SelectItem>
            <SelectItem value="shot_block">Tiro interceptado</SelectItem>
            <SelectItem value="shot_post">Tiro al palo</SelectItem>
            <SelectItem value="penalty_miss">Penalti fallado</SelectItem>
            <SelectItem value="tenm_miss">10m fallado</SelectItem>
            <SelectItem value="saves">Paradas</SelectItem>
            <SelectItem value="tenm_save">10m parado</SelectItem>
            <SelectItem value="recoveries">Recuperaciones</SelectItem>
            <SelectItem value="losses">Pérdidas</SelectItem>
            <SelectItem value="fouls">Faltas</SelectItem>
            <SelectItem value="cards">Tarjetas</SelectItem>
          </SelectContent>
        </Select>
      )}
      {cell("Acción previa (goles)",
        <Select value={state.prevAction} onValueChange={(v) => onChange({ ...state, prevAction: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="__all__">Todas</SelectItem>
            {prevActions.map(pa => <SelectItem key={pa} value={pa}>{pa}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      {cell("Pierna de finalización",
        <Select value={state.finishingFoot} onValueChange={(v) => onChange({ ...state, finishingFoot: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas</SelectItem>
            {finishingFeet.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      {cell("Gol al 2º palo",
        <Select value={state.secondPost} onValueChange={(v) => onChange({ ...state, secondPost: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos</SelectItem>
            <SelectItem value="yes">Sí</SelectItem>
            <SelectItem value="no">No</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
