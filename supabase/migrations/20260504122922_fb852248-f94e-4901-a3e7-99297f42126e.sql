-- Rename module label
UPDATE public.modules
SET label = 'GESTIÓN DE TAREAS, ENTRENAMIENTOS Y SCOUTING'
WHERE key = 'tareas';

-- Videos
CREATE TABLE public.analysis_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  title TEXT NOT NULL DEFAULT '',
  match_date DATE,
  team_id UUID,
  season_team_id UUID,
  opponent TEXT NOT NULL DEFAULT '',
  competition TEXT NOT NULL DEFAULT '',
  video_url TEXT,
  source TEXT NOT NULL DEFAULT 'upload',
  duration_seconds NUMERIC,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.analysis_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_or_admin_select" ON public.analysis_videos FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "owner_or_admin_insert" ON public.analysis_videos FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "owner_or_admin_update" ON public.analysis_videos FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "owner_or_admin_delete" ON public.analysis_videos FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_analysis_videos_updated_at BEFORE UPDATE ON public.analysis_videos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_analysis_videos_user ON public.analysis_videos(user_id, created_at DESC);

-- Categories (per-user global template)
CREATE TABLE public.analysis_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  icon TEXT NOT NULL DEFAULT 'flag',
  hotkey TEXT NOT NULL DEFAULT '',
  pre_seconds INTEGER NOT NULL DEFAULT 5,
  post_seconds INTEGER NOT NULL DEFAULT 5,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.analysis_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_or_admin_select" ON public.analysis_categories FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "owner_or_admin_insert" ON public.analysis_categories FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "owner_or_admin_update" ON public.analysis_categories FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "owner_or_admin_delete" ON public.analysis_categories FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_analysis_categories_updated_at BEFORE UPDATE ON public.analysis_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Events (clips virtuales)
CREATE TABLE public.analysis_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  video_id UUID NOT NULL REFERENCES public.analysis_videos(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.analysis_categories(id) ON DELETE SET NULL,
  category_name TEXT NOT NULL DEFAULT '',
  category_color TEXT NOT NULL DEFAULT '#3b82f6',
  timestamp_seconds NUMERIC NOT NULL,
  pre_seconds INTEGER NOT NULL DEFAULT 5,
  post_seconds INTEGER NOT NULL DEFAULT 5,
  label TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.analysis_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_or_admin_select" ON public.analysis_events FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "owner_or_admin_insert" ON public.analysis_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "owner_or_admin_update" ON public.analysis_events FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "owner_or_admin_delete" ON public.analysis_events FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_analysis_events_updated_at BEFORE UPDATE ON public.analysis_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_analysis_events_video ON public.analysis_events(video_id, timestamp_seconds);

-- Storage bucket for analysis videos (private; signed URLs)
INSERT INTO storage.buckets (id, name, public)
VALUES ('analysis-videos', 'analysis-videos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "analysis-videos owner select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'analysis-videos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "analysis-videos owner insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'analysis-videos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "analysis-videos owner update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'analysis-videos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "analysis-videos owner delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'analysis-videos' AND auth.uid()::text = (storage.foldername(name))[1]);