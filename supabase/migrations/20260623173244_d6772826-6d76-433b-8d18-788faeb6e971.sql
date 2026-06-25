CREATE TABLE public.training_session_texts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  session_id uuid NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  block text NOT NULL CHECK (block IN ('warmup','main','cooldown')),
  order_index integer NOT NULL DEFAULT 0,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tstx_session ON public.training_session_texts(session_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_session_texts TO authenticated;
GRANT ALL ON public.training_session_texts TO service_role;

ALTER TABLE public.training_session_texts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_or_admin_select" ON public.training_session_texts FOR SELECT TO authenticated
  USING ((auth.uid() = user_id) OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "owner_or_admin_insert" ON public.training_session_texts FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = user_id) OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "owner_or_admin_update" ON public.training_session_texts FOR UPDATE TO authenticated
  USING ((auth.uid() = user_id) OR has_role(auth.uid(),'admin'::app_role))
  WITH CHECK ((auth.uid() = user_id) OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "owner_or_admin_delete" ON public.training_session_texts FOR DELETE TO authenticated
  USING ((auth.uid() = user_id) OR has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER trg_training_session_texts_updated_at
  BEFORE UPDATE ON public.training_session_texts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();