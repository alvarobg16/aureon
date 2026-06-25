-- Add new fields to tasks: video, surface, players, material, time, other notes, and secondary category
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS surface TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS players TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS material TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS duration TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS other_notes TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS secondary_category TEXT;

-- Create storage bucket for video clips
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-videos', 'task-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Public storage policies for task-videos (open access, mirroring task-images)
DO $$ BEGIN
  CREATE POLICY "Anyone can view task videos"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'task-videos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Anyone can upload task videos"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'task-videos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Anyone can update task videos"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'task-videos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Anyone can delete task videos"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'task-videos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;