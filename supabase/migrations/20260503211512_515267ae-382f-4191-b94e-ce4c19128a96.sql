
-- 1. Drop overly permissive storage policies
DROP POLICY IF EXISTS "Anyone can upload player photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update player photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete player photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload task images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update task images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete task images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload task videos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update task videos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete task videos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload team photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update team photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete team photos" ON storage.objects;

-- 2. Recreate as authenticated-only with folder ownership
DO $$
DECLARE
  b text;
BEGIN
  FOREACH b IN ARRAY ARRAY['player-photos','task-images','task-videos','team-photos']
  LOOP
    EXECUTE format($f$
      CREATE POLICY %I ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = %L AND (auth.uid())::text = (storage.foldername(name))[1]);
    $f$, b || ' owner insert', b);
    EXECUTE format($f$
      CREATE POLICY %I ON storage.objects FOR UPDATE TO authenticated
      USING (bucket_id = %L AND (auth.uid())::text = (storage.foldername(name))[1]);
    $f$, b || ' owner update', b);
    EXECUTE format($f$
      CREATE POLICY %I ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = %L AND (auth.uid())::text = (storage.foldername(name))[1]);
    $f$, b || ' owner delete', b);
  END LOOP;
END $$;

-- 3. Make scouting-clips private (read restricted to owner)
DROP POLICY IF EXISTS "scouting clips public read" ON storage.objects;
CREATE POLICY "scouting clips owner read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'scouting-clips' AND (auth.uid())::text = (storage.foldername(name))[1]);
UPDATE storage.buckets SET public = false WHERE id = 'scouting-clips';

-- 4. Fix set_updated_at search_path
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 5. Lock down SECURITY DEFINER function execute privileges
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
