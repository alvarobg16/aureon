ALTER TABLE public.live_events
  ADD COLUMN IF NOT EXISTS real_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS effective_seconds INTEGER;

ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS real_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS effective_seconds INTEGER;

CREATE INDEX IF NOT EXISTS idx_live_events_match_period_realsec
  ON public.live_events (live_match_id, period, real_seconds);

CREATE INDEX IF NOT EXISTS idx_goals_livematch_period_realsec
  ON public.goals (live_match_id, period, real_seconds);