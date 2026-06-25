ALTER TABLE public.live_events ADD COLUMN IF NOT EXISTS client_id uuid;
ALTER TABLE public.goals       ADD COLUMN IF NOT EXISTS client_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS live_events_client_id_uq
  ON public.live_events(client_id) WHERE client_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS goals_client_id_uq
  ON public.goals(client_id) WHERE client_id IS NOT NULL;