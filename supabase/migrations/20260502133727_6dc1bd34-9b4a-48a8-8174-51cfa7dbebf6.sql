-- Training sessions
CREATE TABLE public.training_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  team_id uuid NOT NULL,
  session_date date,
  session_time text NOT NULL DEFAULT '',
  venue text NOT NULL DEFAULT '',
  competitive_period text NOT NULL DEFAULT '',
  microcycle text NOT NULL DEFAULT '',
  session_number text NOT NULL DEFAULT '',
  rival text NOT NULL DEFAULT '',
  objectives text NOT NULL DEFAULT '',
  other_notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_or_admin_select" ON public.training_sessions FOR SELECT TO authenticated
  USING ((auth.uid() = user_id) OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "owner_or_admin_insert" ON public.training_sessions FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = user_id) OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "owner_or_admin_update" ON public.training_sessions FOR UPDATE TO authenticated
  USING ((auth.uid() = user_id) OR has_role(auth.uid(),'admin'::app_role))
  WITH CHECK ((auth.uid() = user_id) OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "owner_or_admin_delete" ON public.training_sessions FOR DELETE TO authenticated
  USING ((auth.uid() = user_id) OR has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER set_updated_at_training_sessions BEFORE UPDATE ON public.training_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Tareas asignadas por sesión y bloque
CREATE TABLE public.training_session_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  session_id uuid NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  task_id uuid NOT NULL,
  block text NOT NULL CHECK (block IN ('warmup','main','cooldown')),
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_tst_session ON public.training_session_tasks(session_id);
ALTER TABLE public.training_session_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_or_admin_select" ON public.training_session_tasks FOR SELECT TO authenticated
  USING ((auth.uid() = user_id) OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "owner_or_admin_insert" ON public.training_session_tasks FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = user_id) OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "owner_or_admin_update" ON public.training_session_tasks FOR UPDATE TO authenticated
  USING ((auth.uid() = user_id) OR has_role(auth.uid(),'admin'::app_role))
  WITH CHECK ((auth.uid() = user_id) OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "owner_or_admin_delete" ON public.training_session_tasks FOR DELETE TO authenticated
  USING ((auth.uid() = user_id) OR has_role(auth.uid(),'admin'::app_role));

-- Asistencia por sesión
CREATE TABLE public.training_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  session_id uuid NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  player_id uuid NOT NULL,
  present boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, player_id)
);
CREATE INDEX idx_ta_session ON public.training_attendance(session_id);
CREATE INDEX idx_ta_player ON public.training_attendance(player_id);
ALTER TABLE public.training_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_or_admin_select" ON public.training_attendance FOR SELECT TO authenticated
  USING ((auth.uid() = user_id) OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "owner_or_admin_insert" ON public.training_attendance FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = user_id) OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "owner_or_admin_update" ON public.training_attendance FOR UPDATE TO authenticated
  USING ((auth.uid() = user_id) OR has_role(auth.uid(),'admin'::app_role))
  WITH CHECK ((auth.uid() = user_id) OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "owner_or_admin_delete" ON public.training_attendance FOR DELETE TO authenticated
  USING ((auth.uid() = user_id) OR has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER set_updated_at_training_attendance BEFORE UPDATE ON public.training_attendance
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();