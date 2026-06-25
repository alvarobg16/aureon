
-- 1) Trigger to prevent non-admins from changing approval_status
CREATE OR REPLACE FUNCTION public.profiles_guard_approval_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.approval_status IS DISTINCT FROM OLD.approval_status
     AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    NEW.approval_status := OLD.approval_status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_guard_approval_status ON public.profiles;
CREATE TRIGGER trg_profiles_guard_approval_status
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.profiles_guard_approval_status();

-- Add WITH CHECK to update policy so it matches USING
DROP POLICY IF EXISTS "profiles update own or admin" ON public.profiles;
CREATE POLICY "profiles update own or admin"
ON public.profiles
FOR UPDATE
TO authenticated
USING ((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK ((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::app_role));

-- 2) Allow users to delete their own device registrations
CREATE POLICY "devices delete own"
ON public.user_devices
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
