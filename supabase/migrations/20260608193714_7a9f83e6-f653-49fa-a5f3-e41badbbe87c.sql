
-- ─────────── MACROCICLOS ───────────
CREATE TABLE public.planning_macrocycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  season_id uuid REFERENCES public.seasons(id) ON DELETE SET NULL,
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  objective text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT '#F97316',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.planning_macrocycles TO authenticated;
GRANT ALL ON public.planning_macrocycles TO service_role;
ALTER TABLE public.planning_macrocycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "macros select approved" ON public.planning_macrocycles FOR SELECT TO authenticated
  USING (public.is_approved_or_admin());
CREATE POLICY "macros insert approved" ON public.planning_macrocycles FOR INSERT TO authenticated
  WITH CHECK (public.is_approved_or_admin());
CREATE POLICY "macros update approved" ON public.planning_macrocycles FOR UPDATE TO authenticated
  USING (public.is_approved_or_admin()) WITH CHECK (public.is_approved_or_admin());
CREATE POLICY "macros delete approved" ON public.planning_macrocycles FOR DELETE TO authenticated
  USING (public.is_approved_or_admin());

CREATE TRIGGER trg_macros_updated_at BEFORE UPDATE ON public.planning_macrocycles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_macros_team_season ON public.planning_macrocycles(team_id, season_id);

-- ─────────── MESOCICLOS ───────────
CREATE TABLE public.planning_mesocycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  macrocycle_id uuid NOT NULL REFERENCES public.planning_macrocycles(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  focus text NOT NULL DEFAULT '',
  expected_load text NOT NULL DEFAULT 'medium',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.planning_mesocycles TO authenticated;
GRANT ALL ON public.planning_mesocycles TO service_role;
ALTER TABLE public.planning_mesocycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mesos select approved" ON public.planning_mesocycles FOR SELECT TO authenticated
  USING (public.is_approved_or_admin());
CREATE POLICY "mesos insert approved" ON public.planning_mesocycles FOR INSERT TO authenticated
  WITH CHECK (public.is_approved_or_admin());
CREATE POLICY "mesos update approved" ON public.planning_mesocycles FOR UPDATE TO authenticated
  USING (public.is_approved_or_admin()) WITH CHECK (public.is_approved_or_admin());
CREATE POLICY "mesos delete approved" ON public.planning_mesocycles FOR DELETE TO authenticated
  USING (public.is_approved_or_admin());

CREATE TRIGGER trg_mesos_updated_at BEFORE UPDATE ON public.planning_mesocycles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_mesos_macro ON public.planning_mesocycles(macrocycle_id);

-- ─────────── MICROCICLOS ───────────
CREATE TABLE public.planning_microcycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mesocycle_id uuid NOT NULL REFERENCES public.planning_mesocycles(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name text NOT NULL,
  week_start date NOT NULL,
  week_end date NOT NULL,
  weekly_objective text NOT NULL DEFAULT '',
  planned_load text NOT NULL DEFAULT 'medium',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.planning_microcycles TO authenticated;
GRANT ALL ON public.planning_microcycles TO service_role;
ALTER TABLE public.planning_microcycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "micros select approved" ON public.planning_microcycles FOR SELECT TO authenticated
  USING (public.is_approved_or_admin());
CREATE POLICY "micros insert approved" ON public.planning_microcycles FOR INSERT TO authenticated
  WITH CHECK (public.is_approved_or_admin());
CREATE POLICY "micros update approved" ON public.planning_microcycles FOR UPDATE TO authenticated
  USING (public.is_approved_or_admin()) WITH CHECK (public.is_approved_or_admin());
CREATE POLICY "micros delete approved" ON public.planning_microcycles FOR DELETE TO authenticated
  USING (public.is_approved_or_admin());

CREATE TRIGGER trg_micros_updated_at BEFORE UPDATE ON public.planning_microcycles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_micros_meso ON public.planning_microcycles(mesocycle_id);

-- ─────────── OBJETIVOS EQUIPO ───────────
CREATE TABLE public.planning_team_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  season_id uuid REFERENCES public.seasons(id) ON DELETE SET NULL,
  category text NOT NULL DEFAULT 'general',
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  target_value text NOT NULL DEFAULT '',
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.planning_team_goals TO authenticated;
GRANT ALL ON public.planning_team_goals TO service_role;
ALTER TABLE public.planning_team_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "goals select approved" ON public.planning_team_goals FOR SELECT TO authenticated
  USING (public.is_approved_or_admin());
CREATE POLICY "goals insert approved" ON public.planning_team_goals FOR INSERT TO authenticated
  WITH CHECK (public.is_approved_or_admin());
CREATE POLICY "goals update approved" ON public.planning_team_goals FOR UPDATE TO authenticated
  USING (public.is_approved_or_admin()) WITH CHECK (public.is_approved_or_admin());
CREATE POLICY "goals delete approved" ON public.planning_team_goals FOR DELETE TO authenticated
  USING (public.is_approved_or_admin());

CREATE TRIGGER trg_goals_updated_at BEFORE UPDATE ON public.planning_team_goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_goals_team_season ON public.planning_team_goals(team_id, season_id);
