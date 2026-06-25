
-- 1) Profiles: require approval for self-updates
DROP POLICY IF EXISTS "profiles update own or admin" ON public.profiles;
CREATE POLICY "profiles update own or admin"
ON public.profiles FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (auth.uid() = user_id AND public.is_approved_or_admin())
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (auth.uid() = user_id AND public.is_approved_or_admin())
);

-- 2) user_devices: require approval for updates (insert remains open so device can register pre-approval)
DROP POLICY IF EXISTS "devices update own or admin" ON public.user_devices;
CREATE POLICY "devices update own or admin"
ON public.user_devices FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (auth.uid() = user_id AND public.is_approved_or_admin())
);

-- 3) Storage: require approval for writes on all app buckets
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Public read on public buckets
CREATE POLICY "Public read public buckets"
ON storage.objects FOR SELECT
USING (bucket_id IN ('task-images','task-videos','player-photos','team-photos'));

-- Owner read on private buckets
CREATE POLICY "Owner read private buckets"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id IN ('scouting-clips','analysis-videos')
  AND (auth.uid()::text = (storage.foldername(name))[1] OR has_role(auth.uid(),'admin'::app_role))
);

-- Approved-owner write (insert/update/delete) on all app buckets
CREATE POLICY "Approved owner insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id IN ('task-images','task-videos','player-photos','team-photos','scouting-clips','analysis-videos')
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND (public.is_approved_or_admin() OR has_role(auth.uid(),'admin'::app_role))
);

CREATE POLICY "Approved owner update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  auth.uid()::text = (storage.foldername(name))[1]
  AND (public.is_approved_or_admin() OR has_role(auth.uid(),'admin'::app_role))
);

CREATE POLICY "Approved owner delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  auth.uid()::text = (storage.foldername(name))[1]
  AND (public.is_approved_or_admin() OR has_role(auth.uid(),'admin'::app_role))
);

-- 4) Revoke EXECUTE on internal SECURITY DEFINER helpers from anon/public
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_approved_or_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_approval_status() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.profiles_guard_approval_status() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.user_devices_guard_status() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_approved_or_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_approval_status() TO authenticated;
