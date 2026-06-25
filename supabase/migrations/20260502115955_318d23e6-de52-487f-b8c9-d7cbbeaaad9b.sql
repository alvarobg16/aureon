ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS period integer,
  ADD COLUMN IF NOT EXISTS effective_minute integer;

ALTER TABLE public.live_events
  ADD COLUMN IF NOT EXISTS effective_minute integer;

ALTER TABLE public.live_matches
  ADD COLUMN IF NOT EXISTS real_duration_p1 integer,
  ADD COLUMN IF NOT EXISTS real_duration_p2 integer,
  ADD COLUMN IF NOT EXISTS real_duration_p3 integer,
  ADD COLUMN IF NOT EXISTS real_duration_p4 integer;