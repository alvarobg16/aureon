
-- Seasons
CREATE TABLE public.seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view seasons" ON public.seasons FOR SELECT USING (true);
CREATE POLICY "Anyone can insert seasons" ON public.seasons FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update seasons" ON public.seasons FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete seasons" ON public.seasons FOR DELETE USING (true);

-- Equipos rivales/de la liga vinculados a la temporada
CREATE TABLE public.season_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  name text NOT NULL,
  short_name text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  coach text NOT NULL DEFAULT '',
  logo_url text,
  notes text NOT NULL DEFAULT '',
  is_own boolean NOT NULL DEFAULT false,
  own_team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.season_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view season_teams" ON public.season_teams FOR SELECT USING (true);
CREATE POLICY "Anyone can insert season_teams" ON public.season_teams FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update season_teams" ON public.season_teams FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete season_teams" ON public.season_teams FOR DELETE USING (true);
CREATE INDEX idx_season_teams_season ON public.season_teams(season_id);

-- Jornadas (fixtures): un partido oficial de la temporada
CREATE TABLE public.fixtures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  matchday text NOT NULL DEFAULT '',
  match_date date,
  competition text NOT NULL DEFAULT '',
  home_team_id uuid NOT NULL REFERENCES public.season_teams(id) ON DELETE RESTRICT,
  away_team_id uuid NOT NULL REFERENCES public.season_teams(id) ON DELETE RESTRICT,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.fixtures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view fixtures" ON public.fixtures FOR SELECT USING (true);
CREATE POLICY "Anyone can insert fixtures" ON public.fixtures FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update fixtures" ON public.fixtures FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete fixtures" ON public.fixtures FOR DELETE USING (true);
CREATE INDEX idx_fixtures_season ON public.fixtures(season_id);

-- Vincular goals con fixture y goleador
ALTER TABLE public.goals
  ADD COLUMN fixture_id uuid REFERENCES public.fixtures(id) ON DELETE CASCADE,
  ADD COLUMN scorer_id uuid REFERENCES public.players(id) ON DELETE SET NULL;
CREATE INDEX idx_goals_fixture ON public.goals(fixture_id);
CREATE INDEX idx_goals_scorer ON public.goals(scorer_id);
