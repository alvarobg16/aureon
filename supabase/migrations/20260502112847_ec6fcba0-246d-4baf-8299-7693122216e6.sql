
-- 1) Add user_id column to all data tables (nullable first for backfill)
ALTER TABLE public.teams        ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.players      ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.tasks        ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.seasons      ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.season_teams ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.fixtures     ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.matches      ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.goals        ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.live_matches ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.live_events  ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.live_player_time ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.attendance   ADD COLUMN IF NOT EXISTS user_id uuid;

-- 2) Backfill all existing rows to admin user (agusfutsalcoach@gmail.com)
DO $$
DECLARE
  admin_id uuid;
BEGIN
  SELECT id INTO admin_id FROM auth.users WHERE lower(email) = 'agusfutsalcoach@gmail.com' LIMIT 1;
  IF admin_id IS NOT NULL THEN
    UPDATE public.teams        SET user_id = admin_id WHERE user_id IS NULL;
    UPDATE public.players      SET user_id = admin_id WHERE user_id IS NULL;
    UPDATE public.tasks        SET user_id = admin_id WHERE user_id IS NULL;
    UPDATE public.seasons      SET user_id = admin_id WHERE user_id IS NULL;
    UPDATE public.season_teams SET user_id = admin_id WHERE user_id IS NULL;
    UPDATE public.fixtures     SET user_id = admin_id WHERE user_id IS NULL;
    UPDATE public.matches      SET user_id = admin_id WHERE user_id IS NULL;
    UPDATE public.goals        SET user_id = admin_id WHERE user_id IS NULL;
    UPDATE public.live_matches SET user_id = admin_id WHERE user_id IS NULL;
    UPDATE public.live_events  SET user_id = admin_id WHERE user_id IS NULL;
    UPDATE public.live_player_time SET user_id = admin_id WHERE user_id IS NULL;
    UPDATE public.attendance   SET user_id = admin_id WHERE user_id IS NULL;
  END IF;
END $$;

-- 3) Make user_id NOT NULL with default auth.uid()
ALTER TABLE public.teams        ALTER COLUMN user_id SET DEFAULT auth.uid(), ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.players      ALTER COLUMN user_id SET DEFAULT auth.uid(), ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.tasks        ALTER COLUMN user_id SET DEFAULT auth.uid(), ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.seasons      ALTER COLUMN user_id SET DEFAULT auth.uid(), ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.season_teams ALTER COLUMN user_id SET DEFAULT auth.uid(), ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.fixtures     ALTER COLUMN user_id SET DEFAULT auth.uid(), ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.matches      ALTER COLUMN user_id SET DEFAULT auth.uid(), ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.goals        ALTER COLUMN user_id SET DEFAULT auth.uid(), ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.live_matches ALTER COLUMN user_id SET DEFAULT auth.uid(), ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.live_events  ALTER COLUMN user_id SET DEFAULT auth.uid(), ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.live_player_time ALTER COLUMN user_id SET DEFAULT auth.uid(), ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.attendance   ALTER COLUMN user_id SET DEFAULT auth.uid(), ALTER COLUMN user_id SET NOT NULL;

-- 4) Drop old permissive public policies and create owner+admin policies
DO $$
DECLARE
  t text;
  pol record;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'teams','players','tasks','seasons','season_teams','fixtures',
    'matches','goals','live_matches','live_events','live_player_time','attendance'
  ]) LOOP
    -- Drop all existing policies on the table
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;
  END LOOP;
END $$;

-- 5) Create new owner-or-admin policies for every table
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'teams','players','tasks','seasons','season_teams','fixtures',
    'matches','goals','live_matches','live_events','live_player_time','attendance'
  ]) LOOP
    EXECUTE format($f$
      CREATE POLICY "owner_or_admin_select" ON public.%I
        FOR SELECT TO authenticated
        USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));
    $f$, t);
    EXECUTE format($f$
      CREATE POLICY "owner_or_admin_insert" ON public.%I
        FOR INSERT TO authenticated
        WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));
    $f$, t);
    EXECUTE format($f$
      CREATE POLICY "owner_or_admin_update" ON public.%I
        FOR UPDATE TO authenticated
        USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role))
        WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));
    $f$, t);
    EXECUTE format($f$
      CREATE POLICY "owner_or_admin_delete" ON public.%I
        FOR DELETE TO authenticated
        USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));
    $f$, t);
  END LOOP;
END $$;

-- 6) Indexes for performance
CREATE INDEX IF NOT EXISTS idx_teams_user        ON public.teams(user_id);
CREATE INDEX IF NOT EXISTS idx_players_user      ON public.players(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user        ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_seasons_user      ON public.seasons(user_id);
CREATE INDEX IF NOT EXISTS idx_season_teams_user ON public.season_teams(user_id);
CREATE INDEX IF NOT EXISTS idx_fixtures_user     ON public.fixtures(user_id);
CREATE INDEX IF NOT EXISTS idx_matches_user      ON public.matches(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user        ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS idx_live_matches_user ON public.live_matches(user_id);
CREATE INDEX IF NOT EXISTS idx_live_events_user  ON public.live_events(user_id);
CREATE INDEX IF NOT EXISTS idx_live_player_time_user ON public.live_player_time(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user   ON public.attendance(user_id);
