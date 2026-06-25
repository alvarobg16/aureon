DROP POLICY IF EXISTS owner_or_admin_select ON public.training_session_texts;
DROP POLICY IF EXISTS owner_or_admin_insert ON public.training_session_texts;
DROP POLICY IF EXISTS owner_or_admin_update ON public.training_session_texts;
DROP POLICY IF EXISTS owner_or_admin_delete ON public.training_session_texts;

CREATE POLICY owner_or_admin_select ON public.training_session_texts
  FOR SELECT TO authenticated
  USING ((auth.uid() = user_id AND public.is_approved_or_admin()) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY owner_or_admin_insert ON public.training_session_texts
  FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = user_id AND public.is_approved_or_admin()) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY owner_or_admin_update ON public.training_session_texts
  FOR UPDATE TO authenticated
  USING ((auth.uid() = user_id AND public.is_approved_or_admin()) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK ((auth.uid() = user_id AND public.is_approved_or_admin()) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY owner_or_admin_delete ON public.training_session_texts
  FOR DELETE TO authenticated
  USING ((auth.uid() = user_id AND public.is_approved_or_admin()) OR public.has_role(auth.uid(), 'admin'::app_role));