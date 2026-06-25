-- 1. Helper: aprobado o admin
CREATE OR REPLACE FUNCTION public.is_approved_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND approval_status = 'approved'
    );
$$;

REVOKE EXECUTE ON FUNCTION public.is_approved_or_admin() FROM public;
GRANT EXECUTE ON FUNCTION public.is_approved_or_admin() TO authenticated;

-- 2. Aplicar a tablas owner_or_admin_* (datos de la app)
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'analysis_categories','analysis_events','analysis_videos','attendance',
    'fixtures','goals','live_events','live_matches','live_player_time',
    'matches','players','presence_attendance','presence_callups',
    'presence_trainings','scouting_clips','season_teams','seasons','tasks',
    'teams','training_attendance','training_session_tasks','training_sessions'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS owner_or_admin_select ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS owner_or_admin_insert ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS owner_or_admin_update ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS owner_or_admin_delete ON public.%I', t);

    EXECUTE format($f$
      CREATE POLICY owner_or_admin_select ON public.%I
        FOR SELECT TO authenticated
        USING (
          (auth.uid() = user_id AND public.is_approved_or_admin())
          OR public.has_role(auth.uid(), 'admin'::app_role)
        );
    $f$, t);

    EXECUTE format($f$
      CREATE POLICY owner_or_admin_insert ON public.%I
        FOR INSERT TO authenticated
        WITH CHECK (
          (auth.uid() = user_id AND public.is_approved_or_admin())
          OR public.has_role(auth.uid(), 'admin'::app_role)
        );
    $f$, t);

    EXECUTE format($f$
      CREATE POLICY owner_or_admin_update ON public.%I
        FOR UPDATE TO authenticated
        USING (
          (auth.uid() = user_id AND public.is_approved_or_admin())
          OR public.has_role(auth.uid(), 'admin'::app_role)
        )
        WITH CHECK (
          (auth.uid() = user_id AND public.is_approved_or_admin())
          OR public.has_role(auth.uid(), 'admin'::app_role)
        );
    $f$, t);

    EXECUTE format($f$
      CREATE POLICY owner_or_admin_delete ON public.%I
        FOR DELETE TO authenticated
        USING (
          (auth.uid() = user_id AND public.is_approved_or_admin())
          OR public.has_role(auth.uid(), 'admin'::app_role)
        );
    $f$, t);
  END LOOP;
END $$;