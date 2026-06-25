ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS finishing_foot text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS second_post boolean NOT NULL DEFAULT false;