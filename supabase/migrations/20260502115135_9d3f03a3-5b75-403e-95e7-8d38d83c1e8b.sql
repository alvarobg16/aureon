ALTER TABLE public.live_matches
  ADD COLUMN IF NOT EXISTS timeout_home_p1 boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS timeout_away_p1 boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS timeout_home_p2 boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS timeout_away_p2 boolean NOT NULL DEFAULT false;