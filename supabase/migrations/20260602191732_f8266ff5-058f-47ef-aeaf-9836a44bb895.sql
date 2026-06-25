
ALTER TABLE public.seasons ADD COLUMN IF NOT EXISTS team_id uuid;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS default_team_id uuid;
CREATE INDEX IF NOT EXISTS idx_seasons_team_id ON public.seasons(team_id);
CREATE INDEX IF NOT EXISTS idx_profiles_default_team_id ON public.profiles(default_team_id);
