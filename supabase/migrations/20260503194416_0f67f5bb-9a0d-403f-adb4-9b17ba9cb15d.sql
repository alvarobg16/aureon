-- Block 1: per-user limits for clubs and teams
CREATE TABLE public.user_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  max_clubs integer,
  max_teams integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_limits select own or admin" ON public.user_limits
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "user_limits admin write" ON public.user_limits
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER user_limits_updated_at
  BEFORE UPDATE ON public.user_limits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();