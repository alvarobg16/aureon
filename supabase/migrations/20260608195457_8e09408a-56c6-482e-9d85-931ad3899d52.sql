
-- Ensure created_by defaults to current user and is required
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['planning_events','planning_macrocycles','planning_mesocycles','planning_microcycles','planning_team_goals']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN created_by SET DEFAULT auth.uid()', t);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN created_by SET NOT NULL', t);
  END LOOP;
END$$;

-- planning_events
DROP POLICY IF EXISTS "planning_events read auth" ON public.planning_events;
DROP POLICY IF EXISTS "planning_events insert approved" ON public.planning_events;
DROP POLICY IF EXISTS "planning_events update approved" ON public.planning_events;
DROP POLICY IF EXISTS "planning_events delete approved" ON public.planning_events;
CREATE POLICY "owner_or_admin_select" ON public.planning_events FOR SELECT
  USING (((auth.uid() = created_by) AND is_approved_or_admin()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "owner_or_admin_insert" ON public.planning_events FOR INSERT
  WITH CHECK (((auth.uid() = created_by) AND is_approved_or_admin()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "owner_or_admin_update" ON public.planning_events FOR UPDATE
  USING (((auth.uid() = created_by) AND is_approved_or_admin()) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (((auth.uid() = created_by) AND is_approved_or_admin()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "owner_or_admin_delete" ON public.planning_events FOR DELETE
  USING (((auth.uid() = created_by) AND is_approved_or_admin()) OR has_role(auth.uid(), 'admin'::app_role));

-- planning_macrocycles
DROP POLICY IF EXISTS "macros select approved" ON public.planning_macrocycles;
DROP POLICY IF EXISTS "macros insert approved" ON public.planning_macrocycles;
DROP POLICY IF EXISTS "macros update approved" ON public.planning_macrocycles;
DROP POLICY IF EXISTS "macros delete approved" ON public.planning_macrocycles;
CREATE POLICY "owner_or_admin_select" ON public.planning_macrocycles FOR SELECT
  USING (((auth.uid() = created_by) AND is_approved_or_admin()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "owner_or_admin_insert" ON public.planning_macrocycles FOR INSERT
  WITH CHECK (((auth.uid() = created_by) AND is_approved_or_admin()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "owner_or_admin_update" ON public.planning_macrocycles FOR UPDATE
  USING (((auth.uid() = created_by) AND is_approved_or_admin()) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (((auth.uid() = created_by) AND is_approved_or_admin()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "owner_or_admin_delete" ON public.planning_macrocycles FOR DELETE
  USING (((auth.uid() = created_by) AND is_approved_or_admin()) OR has_role(auth.uid(), 'admin'::app_role));

-- planning_mesocycles
DROP POLICY IF EXISTS "mesos select approved" ON public.planning_mesocycles;
DROP POLICY IF EXISTS "mesos insert approved" ON public.planning_mesocycles;
DROP POLICY IF EXISTS "mesos update approved" ON public.planning_mesocycles;
DROP POLICY IF EXISTS "mesos delete approved" ON public.planning_mesocycles;
CREATE POLICY "owner_or_admin_select" ON public.planning_mesocycles FOR SELECT
  USING (((auth.uid() = created_by) AND is_approved_or_admin()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "owner_or_admin_insert" ON public.planning_mesocycles FOR INSERT
  WITH CHECK (((auth.uid() = created_by) AND is_approved_or_admin()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "owner_or_admin_update" ON public.planning_mesocycles FOR UPDATE
  USING (((auth.uid() = created_by) AND is_approved_or_admin()) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (((auth.uid() = created_by) AND is_approved_or_admin()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "owner_or_admin_delete" ON public.planning_mesocycles FOR DELETE
  USING (((auth.uid() = created_by) AND is_approved_or_admin()) OR has_role(auth.uid(), 'admin'::app_role));

-- planning_microcycles
DROP POLICY IF EXISTS "micros select approved" ON public.planning_microcycles;
DROP POLICY IF EXISTS "micros insert approved" ON public.planning_microcycles;
DROP POLICY IF EXISTS "micros update approved" ON public.planning_microcycles;
DROP POLICY IF EXISTS "micros delete approved" ON public.planning_microcycles;
CREATE POLICY "owner_or_admin_select" ON public.planning_microcycles FOR SELECT
  USING (((auth.uid() = created_by) AND is_approved_or_admin()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "owner_or_admin_insert" ON public.planning_microcycles FOR INSERT
  WITH CHECK (((auth.uid() = created_by) AND is_approved_or_admin()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "owner_or_admin_update" ON public.planning_microcycles FOR UPDATE
  USING (((auth.uid() = created_by) AND is_approved_or_admin()) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (((auth.uid() = created_by) AND is_approved_or_admin()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "owner_or_admin_delete" ON public.planning_microcycles FOR DELETE
  USING (((auth.uid() = created_by) AND is_approved_or_admin()) OR has_role(auth.uid(), 'admin'::app_role));

-- planning_team_goals
DROP POLICY IF EXISTS "goals select approved" ON public.planning_team_goals;
DROP POLICY IF EXISTS "goals insert approved" ON public.planning_team_goals;
DROP POLICY IF EXISTS "goals update approved" ON public.planning_team_goals;
DROP POLICY IF EXISTS "goals delete approved" ON public.planning_team_goals;
CREATE POLICY "owner_or_admin_select" ON public.planning_team_goals FOR SELECT
  USING (((auth.uid() = created_by) AND is_approved_or_admin()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "owner_or_admin_insert" ON public.planning_team_goals FOR INSERT
  WITH CHECK (((auth.uid() = created_by) AND is_approved_or_admin()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "owner_or_admin_update" ON public.planning_team_goals FOR UPDATE
  USING (((auth.uid() = created_by) AND is_approved_or_admin()) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (((auth.uid() = created_by) AND is_approved_or_admin()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "owner_or_admin_delete" ON public.planning_team_goals FOR DELETE
  USING (((auth.uid() = created_by) AND is_approved_or_admin()) OR has_role(auth.uid(), 'admin'::app_role));
