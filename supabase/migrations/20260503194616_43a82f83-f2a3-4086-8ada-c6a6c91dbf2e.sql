-- Block 3: Scouting clips
CREATE TABLE public.scouting_clips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  season_team_id uuid NOT NULL,
  side text NOT NULL CHECK (side IN ('offensive','defensive')),
  category text NOT NULL,
  title text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  video_url text,
  source text NOT NULL DEFAULT 'upload' CHECK (source IN ('upload','external')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.scouting_clips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_or_admin_select" ON public.scouting_clips FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "owner_or_admin_insert" ON public.scouting_clips FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "owner_or_admin_update" ON public.scouting_clips FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin')) WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "owner_or_admin_delete" ON public.scouting_clips FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER scouting_clips_updated_at BEFORE UPDATE ON public.scouting_clips FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_scouting_clips_team ON public.scouting_clips(season_team_id);
CREATE INDEX idx_scouting_clips_user ON public.scouting_clips(user_id);

-- Storage bucket for scouting clips
INSERT INTO storage.buckets (id, name, public) VALUES ('scouting-clips','scouting-clips', true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "scouting clips public read" ON storage.objects FOR SELECT TO public USING (bucket_id = 'scouting-clips');
CREATE POLICY "scouting clips owner insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'scouting-clips' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "scouting clips owner update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'scouting-clips' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "scouting clips owner delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'scouting-clips' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Block 4: PRESENCIA (attendance to trainings) — reuses existing players table
CREATE TABLE public.presence_trainings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  season_id uuid,
  team_id uuid NOT NULL,
  date date NOT NULL,
  time text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.presence_trainings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_or_admin_select" ON public.presence_trainings FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "owner_or_admin_insert" ON public.presence_trainings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "owner_or_admin_update" ON public.presence_trainings FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin')) WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "owner_or_admin_delete" ON public.presence_trainings FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER presence_trainings_updated_at BEFORE UPDATE ON public.presence_trainings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_presence_trainings_team_date ON public.presence_trainings(team_id, date);

CREATE TABLE public.presence_callups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  training_id uuid NOT NULL REFERENCES public.presence_trainings(id) ON DELETE CASCADE,
  player_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(training_id, player_id)
);
ALTER TABLE public.presence_callups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_or_admin_select" ON public.presence_callups FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "owner_or_admin_insert" ON public.presence_callups FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "owner_or_admin_update" ON public.presence_callups FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin')) WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "owner_or_admin_delete" ON public.presence_callups FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_presence_callups_training ON public.presence_callups(training_id);

CREATE TABLE public.presence_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  training_id uuid NOT NULL REFERENCES public.presence_trainings(id) ON DELETE CASCADE,
  player_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'absent' CHECK (status IN ('present','absent')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(training_id, player_id)
);
ALTER TABLE public.presence_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_or_admin_select" ON public.presence_attendance FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "owner_or_admin_insert" ON public.presence_attendance FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "owner_or_admin_update" ON public.presence_attendance FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin')) WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "owner_or_admin_delete" ON public.presence_attendance FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER presence_attendance_updated_at BEFORE UPDATE ON public.presence_attendance FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_presence_attendance_training ON public.presence_attendance(training_id);