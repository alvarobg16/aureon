-- Add own_team_id to fixtures to scope fixtures by the user's own club team
-- (separate from home_team_id/away_team_id which reference season_teams).
ALTER TABLE public.fixtures
  ADD COLUMN IF NOT EXISTS own_team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_fixtures_season_team
  ON public.fixtures (season_id, own_team_id);

-- Add own_team_id to live_matches so live sessions are scoped by club team too.
ALTER TABLE public.live_matches
  ADD COLUMN IF NOT EXISTS own_team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_live_matches_season_team
  ON public.live_matches (season_id, own_team_id);