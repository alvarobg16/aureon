
-- 1) Guard against self re-approval of revoked devices
CREATE OR REPLACE FUNCTION public.user_devices_guard_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    NEW.status := OLD.status;
  END IF;
  -- Clear confirmation token once device is approved
  IF NEW.status = 'approved' AND COALESCE(NEW.confirmation_token, '') <> '' THEN
    NEW.confirmation_token := '';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_devices_guard_status_trg ON public.user_devices;
CREATE TRIGGER user_devices_guard_status_trg
BEFORE UPDATE ON public.user_devices
FOR EACH ROW
EXECUTE FUNCTION public.user_devices_guard_status();

-- 2) Admin DELETE policy on activity_logs
DROP POLICY IF EXISTS "activity_logs admin delete" ON public.activity_logs;
CREATE POLICY "activity_logs admin delete"
ON public.activity_logs
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3) Owner DELETE policy on profiles
DROP POLICY IF EXISTS "profiles owner delete" ON public.profiles;
CREATE POLICY "profiles owner delete"
ON public.profiles
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
