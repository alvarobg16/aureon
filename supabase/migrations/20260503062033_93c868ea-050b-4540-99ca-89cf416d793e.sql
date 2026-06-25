ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS live_match_id uuid;
CREATE INDEX IF NOT EXISTS idx_goals_live_match_id ON public.goals(live_match_id);
CREATE INDEX IF NOT EXISTS idx_live_events_live_match_id ON public.live_events(live_match_id);