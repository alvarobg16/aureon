-- Live matches: partidos en curso o finalizados desde el modo LIVE
CREATE TABLE public.live_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fixture_id UUID,
  season_id UUID,
  home_team_id UUID,
  away_team_id UUID,
  own_side TEXT NOT NULL DEFAULT 'home', -- 'home' | 'away'
  status TEXT NOT NULL DEFAULT 'live',   -- 'live' | 'finished'
  current_period INTEGER NOT NULL DEFAULT 1, -- 1,2,3(prorroga1),4(prorroga2)
  elapsed_seconds INTEGER NOT NULL DEFAULT 0,
  fouls_home_p1 INTEGER NOT NULL DEFAULT 0,
  fouls_away_p1 INTEGER NOT NULL DEFAULT 0,
  fouls_home_p2 INTEGER NOT NULL DEFAULT 0,
  fouls_away_p2 INTEGER NOT NULL DEFAULT 0,
  score_home INTEGER NOT NULL DEFAULT 0,
  score_away INTEGER NOT NULL DEFAULT 0,
  called_player_ids UUID[] NOT NULL DEFAULT '{}',
  on_court_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);
ALTER TABLE public.live_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view live_matches" ON public.live_matches FOR SELECT USING (true);
CREATE POLICY "Anyone can insert live_matches" ON public.live_matches FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update live_matches" ON public.live_matches FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete live_matches" ON public.live_matches FOR DELETE USING (true);

-- Eventos del partido en vivo (acciones, faltas, tarjetas, balones rojos…)
-- Los goles se siguen guardando en la tabla `goals` para alimentar estadísticas.
CREATE TABLE public.live_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  live_match_id UUID NOT NULL,
  player_id UUID,
  kind TEXT NOT NULL,           -- 'action' | 'foul' | 'card' | 'red_ball'
  category TEXT NOT NULL DEFAULT '',
  subcategory TEXT NOT NULL DEFAULT '',
  pitch_x NUMERIC,
  pitch_y NUMERIC,
  goal_x NUMERIC,
  goal_y NUMERIC,
  minute INTEGER,
  period INTEGER NOT NULL DEFAULT 1,
  on_court_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.live_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view live_events" ON public.live_events FOR SELECT USING (true);
CREATE POLICY "Anyone can insert live_events" ON public.live_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update live_events" ON public.live_events FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete live_events" ON public.live_events FOR DELETE USING (true);

-- Minutos jugados por cada jugador en un partido en vivo
CREATE TABLE public.live_player_time (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  live_match_id UUID NOT NULL,
  player_id UUID NOT NULL,
  total_seconds INTEGER NOT NULL DEFAULT 0,
  current_stint_started_at INTEGER, -- elapsed_seconds en el que entró a pista, NULL si está en banquillo
  UNIQUE(live_match_id, player_id)
);
ALTER TABLE public.live_player_time ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view live_player_time" ON public.live_player_time FOR SELECT USING (true);
CREATE POLICY "Anyone can insert live_player_time" ON public.live_player_time FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update live_player_time" ON public.live_player_time FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete live_player_time" ON public.live_player_time FOR DELETE USING (true);

CREATE INDEX idx_live_events_match ON public.live_events(live_match_id);
CREATE INDEX idx_live_player_time_match ON public.live_player_time(live_match_id);