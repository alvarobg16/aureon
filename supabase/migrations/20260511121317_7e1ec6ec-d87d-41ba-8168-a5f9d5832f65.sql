
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_approval_status_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_approval_status_check
  CHECK (approval_status IN ('pending','approved','rejected','suspended'));

-- Marcar usuarios existentes como aprobados
UPDATE public.profiles SET approval_status = 'approved' WHERE approval_status = 'pending';

-- Recrear el trigger para nuevos signups: pending por defecto, admin auto-aprobado
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  assigned_role public.app_role;
  initial_status text;
BEGIN
  IF lower(COALESCE(NEW.email,'')) = 'agusfutsalcoach@gmail.com' THEN
    assigned_role := 'admin';
    initial_status := 'approved';
  ELSE
    assigned_role := 'user';
    initial_status := 'pending';
  END IF;

  INSERT INTO public.profiles (user_id, email, full_name, avatar_url, approval_status)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.raw_user_meta_data->>'avatar_url',
    initial_status
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- Asegurar que el trigger existe sobre auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Función helper para que cualquier usuario autenticado consulte su propio status
CREATE OR REPLACE FUNCTION public.get_my_approval_status()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT approval_status FROM public.profiles WHERE user_id = auth.uid();
$$;
