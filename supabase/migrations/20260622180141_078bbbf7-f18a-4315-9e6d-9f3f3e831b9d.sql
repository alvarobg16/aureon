
-- =============================================================
-- Migration & Cloning Center — Phase 1
-- =============================================================

-- 1) Audit table
CREATE TABLE IF NOT EXISTS public.migration_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL,
  source_user_id UUID,
  dest_user_ids UUID[] NOT NULL DEFAULT '{}',
  operation TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  items_requested INT NOT NULL DEFAULT 0,
  items_copied INT NOT NULL DEFAULT 0,
  items_skipped INT NOT NULL DEFAULT 0,
  items_failed INT NOT NULL DEFAULT 0,
  conflicts INT NOT NULL DEFAULT 0,
  duration_ms INT NOT NULL DEFAULT 0,
  result TEXT NOT NULL DEFAULT 'ok',
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.migration_audit_log TO authenticated;
GRANT ALL ON public.migration_audit_log TO service_role;

ALTER TABLE public.migration_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_select_audit"
  ON public.migration_audit_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_migration_audit_created ON public.migration_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_migration_audit_admin ON public.migration_audit_log (admin_user_id);

-- 2) Clone team (with its players) into one or more destination users — transactional per call
CREATE OR REPLACE FUNCTION public.clone_team_to_user(
  _source_team_id UUID,
  _dest_user_id UUID,
  _conflict_strategy TEXT DEFAULT 'rename' -- 'rename' | 'skip' | 'replace'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _started TIMESTAMPTZ := clock_timestamp();
  _src RECORD;
  _new_team_id UUID;
  _existing_id UUID;
  _new_name TEXT;
  _suffix INT := 2;
  _players_copied INT := 0;
  _conflicts INT := 0;
  _skipped INT := 0;
  _result JSONB;
BEGIN
  -- Admin gate
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;

  SELECT * INTO _src FROM public.teams WHERE id = _source_team_id;
  IF _src IS NULL THEN
    RAISE EXCEPTION 'source team not found';
  END IF;

  -- Conflict detection: same name within destination user
  SELECT id INTO _existing_id
  FROM public.teams
  WHERE user_id = _dest_user_id AND lower(name) = lower(_src.name)
  LIMIT 1;

  _new_name := _src.name;

  IF _existing_id IS NOT NULL THEN
    _conflicts := 1;
    IF _conflict_strategy = 'skip' THEN
      _skipped := 1;
      INSERT INTO public.migration_audit_log
        (admin_user_id, source_user_id, dest_user_ids, operation, entity_type,
         items_requested, items_copied, items_skipped, conflicts, duration_ms, result, details)
      VALUES (
        auth.uid(), _src.user_id, ARRAY[_dest_user_id], 'clone', 'team',
        1, 0, 1, 1,
        (EXTRACT(MILLISECOND FROM (clock_timestamp() - _started)))::int,
        'skipped',
        jsonb_build_object('source_team_id', _source_team_id, 'reason', 'name_conflict')
      );
      RETURN jsonb_build_object('status','skipped','reason','name_conflict','new_team_id',null);
    ELSIF _conflict_strategy = 'replace' THEN
      DELETE FROM public.teams WHERE id = _existing_id;
    ELSE -- rename
      WHILE EXISTS (
        SELECT 1 FROM public.teams
        WHERE user_id = _dest_user_id AND lower(name) = lower(_src.name || ' (' || _suffix || ')')
      ) LOOP
        _suffix := _suffix + 1;
      END LOOP;
      _new_name := _src.name || ' (' || _suffix || ')';
    END IF;
  END IF;

  -- Insert team
  INSERT INTO public.teams (name, category, competition, photo_url, user_id)
  VALUES (_new_name, _src.category, _src.competition, _src.photo_url, _dest_user_id)
  RETURNING id INTO _new_team_id;

  -- Copy players
  INSERT INTO public.players (
    first_name, last_name, sport_name, jersey_number, position,
    dominant_foot, dominant_hand, phone, email, birth_date, photo_url, team_id, user_id
  )
  SELECT
    first_name, last_name, sport_name, jersey_number, position,
    dominant_foot, dominant_hand, phone, email, birth_date, photo_url, _new_team_id, _dest_user_id
  FROM public.players
  WHERE team_id = _source_team_id;

  GET DIAGNOSTICS _players_copied = ROW_COUNT;

  _result := jsonb_build_object(
    'status','ok',
    'new_team_id', _new_team_id,
    'new_name', _new_name,
    'players_copied', _players_copied,
    'conflicts', _conflicts
  );

  INSERT INTO public.migration_audit_log
    (admin_user_id, source_user_id, dest_user_ids, operation, entity_type,
     items_requested, items_copied, items_skipped, conflicts, duration_ms, result, details)
  VALUES (
    auth.uid(), _src.user_id, ARRAY[_dest_user_id], 'clone', 'team',
    1, 1, _skipped, _conflicts,
    (EXTRACT(MILLISECOND FROM (clock_timestamp() - _started)))::int,
    'ok',
    _result || jsonb_build_object('source_team_id', _source_team_id)
  );

  RETURN _result;
END;
$$;

REVOKE ALL ON FUNCTION public.clone_team_to_user(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clone_team_to_user(UUID, UUID, TEXT) TO authenticated;

-- 3) Clone tasks to a destination user — transactional
CREATE OR REPLACE FUNCTION public.clone_tasks_to_user(
  _task_ids UUID[],
  _dest_user_id UUID,
  _numbering_mode TEXT DEFAULT 'auto' -- 'auto' | 'preserve'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _started TIMESTAMPTZ := clock_timestamp();
  _t RECORD;
  _used INT[] := ARRAY[]::INT[];
  _next_auto INT;
  _task_number INT;
  _copied INT := 0;
  _conflicts INT := 0;
  _source_user UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;

  IF _task_ids IS NULL OR array_length(_task_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'no tasks provided';
  END IF;

  SELECT COALESCE(array_agg(task_number), ARRAY[]::INT[])
    INTO _used
    FROM public.tasks
    WHERE user_id = _dest_user_id;

  _next_auto := COALESCE((SELECT MAX(n) FROM unnest(_used) AS n), 0) + 1;

  FOR _t IN
    SELECT * FROM public.tasks WHERE id = ANY(_task_ids) ORDER BY task_number
  LOOP
    IF _source_user IS NULL THEN _source_user := _t.user_id; END IF;

    IF _numbering_mode = 'preserve' AND NOT (_t.task_number = ANY(_used)) THEN
      _task_number := _t.task_number;
    ELSE
      IF _numbering_mode = 'preserve' AND (_t.task_number = ANY(_used)) THEN
        _conflicts := _conflicts + 1;
      END IF;
      WHILE _next_auto = ANY(_used) LOOP _next_auto := _next_auto + 1; END LOOP;
      _task_number := _next_auto;
      _next_auto := _next_auto + 1;
    END IF;

    _used := array_append(_used, _task_number);

    INSERT INTO public.tasks (
      user_id, task_number, description, keywords, category, secondary_category,
      image_url, video_url, surface, players, material, duration, other_notes
    ) VALUES (
      _dest_user_id, _task_number, _t.description, _t.keywords, _t.category, _t.secondary_category,
      _t.image_url, _t.video_url, _t.surface, _t.players, _t.material, _t.duration, _t.other_notes
    );

    _copied := _copied + 1;
  END LOOP;

  INSERT INTO public.migration_audit_log
    (admin_user_id, source_user_id, dest_user_ids, operation, entity_type,
     items_requested, items_copied, items_skipped, conflicts, duration_ms, result, details)
  VALUES (
    auth.uid(), _source_user, ARRAY[_dest_user_id], 'clone', 'task',
    COALESCE(array_length(_task_ids,1),0), _copied, 0, _conflicts,
    (EXTRACT(MILLISECOND FROM (clock_timestamp() - _started)))::int,
    'ok',
    jsonb_build_object('numbering_mode', _numbering_mode)
  );

  RETURN jsonb_build_object('status','ok','copied',_copied,'conflicts',_conflicts);
END;
$$;

REVOKE ALL ON FUNCTION public.clone_tasks_to_user(UUID[], UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clone_tasks_to_user(UUID[], UUID, TEXT) TO authenticated;
