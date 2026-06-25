
-- Nuevo módulo PLANIFICACIÓN (alta en catálogo de módulos)
INSERT INTO public.modules (key, label, route, description, is_system)
VALUES ('planificacion', 'PLANIFICACIÓN', '/planificacion', 'Planificación de temporada, microciclos y calendario operativo por equipo.', false)
ON CONFLICT (key) DO NOTHING;

-- Tabla de eventos del calendario de planificación (independiente por equipo).
CREATE TABLE IF NOT EXISTS public.planning_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  season_id uuid REFERENCES public.seasons(id) ON DELETE SET NULL,
  event_date date NOT NULL,
  event_time time,
  duration_minutes integer,
  type text NOT NULL CHECK (type IN ('training','match','event','meeting','rest','tournament','club_activity')),
  title text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  intensity text CHECK (intensity IN ('very_low','low','medium','high','very_high')),
  fixture_id uuid REFERENCES public.fixtures(id) ON DELETE SET NULL,
  training_session_id uuid REFERENCES public.training_sessions(id) ON DELETE SET NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_planning_events_team_date ON public.planning_events(team_id, event_date);
CREATE INDEX IF NOT EXISTS idx_planning_events_season ON public.planning_events(season_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.planning_events TO authenticated;
GRANT ALL ON public.planning_events TO service_role;

ALTER TABLE public.planning_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "planning_events read auth"
  ON public.planning_events FOR SELECT TO authenticated
  USING (public.is_approved_or_admin());

CREATE POLICY "planning_events insert approved"
  ON public.planning_events FOR INSERT TO authenticated
  WITH CHECK (public.is_approved_or_admin());

CREATE POLICY "planning_events update approved"
  ON public.planning_events FOR UPDATE TO authenticated
  USING (public.is_approved_or_admin())
  WITH CHECK (public.is_approved_or_admin());

CREATE POLICY "planning_events delete approved"
  ON public.planning_events FOR DELETE TO authenticated
  USING (public.is_approved_or_admin());

CREATE TRIGGER trg_planning_events_updated
  BEFORE UPDATE ON public.planning_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
