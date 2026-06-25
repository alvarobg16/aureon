
-- Matches table (Live placeholder + Post-partido entries)
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  matchday TEXT NOT NULL DEFAULT '',
  opponent TEXT NOT NULL DEFAULT '',
  match_date DATE,
  home_away TEXT NOT NULL DEFAULT 'home',
  competition TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view matches" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Anyone can insert matches" ON public.matches FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update matches" ON public.matches FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete matches" ON public.matches FOR DELETE USING (true);

-- Goals table (a favor / en contra)
CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  side TEXT NOT NULL, -- 'for' | 'against'
  score_for INTEGER NOT NULL DEFAULT 0,
  score_against INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT '', -- DEFENSA / TRANSICION / ABP / SITUACION ESPECIAL / OTROS
  subcategory TEXT NOT NULL DEFAULT '',
  pitch_x NUMERIC,
  pitch_y NUMERIC,
  goal_x NUMERIC,
  goal_y NUMERIC,
  players_on_court UUID[] NOT NULL DEFAULT '{}',
  ordinal INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view goals" ON public.goals FOR SELECT USING (true);
CREATE POLICY "Anyone can insert goals" ON public.goals FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update goals" ON public.goals FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete goals" ON public.goals FOR DELETE USING (true);

CREATE INDEX idx_goals_match ON public.goals(match_id);
CREATE INDEX idx_matches_team ON public.matches(team_id);
