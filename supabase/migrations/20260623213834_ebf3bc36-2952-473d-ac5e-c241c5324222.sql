ALTER TABLE public.presence_trainings
  ADD COLUMN IF NOT EXISTS source_session_id uuid REFERENCES public.training_sessions(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS presence_trainings_team_source_unique
  ON public.presence_trainings(team_id, source_session_id)
  WHERE source_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_presence_trainings_source_session
  ON public.presence_trainings(source_session_id);