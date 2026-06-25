
REVOKE ALL ON FUNCTION public.get_my_approval_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_approval_status() TO authenticated;
