DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY['planning_events','planning_macrocycles','planning_mesocycles','planning_microcycles','planning_team_goals'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS owner_or_admin_select ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS owner_or_admin_insert ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS owner_or_admin_update ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS owner_or_admin_delete ON public.%I', t);

    EXECUTE format($f$
      CREATE POLICY owner_or_admin_select ON public.%I
        FOR SELECT TO authenticated
        USING (((auth.uid() = created_by) AND is_approved_or_admin()) OR has_role(auth.uid(), 'admin'::app_role))
    $f$, t);

    EXECUTE format($f$
      CREATE POLICY owner_or_admin_insert ON public.%I
        FOR INSERT TO authenticated
        WITH CHECK (((auth.uid() = created_by) AND is_approved_or_admin()) OR has_role(auth.uid(), 'admin'::app_role))
    $f$, t);

    EXECUTE format($f$
      CREATE POLICY owner_or_admin_update ON public.%I
        FOR UPDATE TO authenticated
        USING (((auth.uid() = created_by) AND is_approved_or_admin()) OR has_role(auth.uid(), 'admin'::app_role))
        WITH CHECK (((auth.uid() = created_by) AND is_approved_or_admin()) OR has_role(auth.uid(), 'admin'::app_role))
    $f$, t);

    EXECUTE format($f$
      CREATE POLICY owner_or_admin_delete ON public.%I
        FOR DELETE TO authenticated
        USING (((auth.uid() = created_by) AND is_approved_or_admin()) OR has_role(auth.uid(), 'admin'::app_role))
    $f$, t);
  END LOOP;
END $$;