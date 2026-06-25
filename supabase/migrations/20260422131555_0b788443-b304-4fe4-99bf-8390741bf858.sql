
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS competition text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS photo_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('team-photos', 'team-photos', true)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  CREATE POLICY "Team photos are publicly accessible"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'team-photos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Anyone can upload team photos"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'team-photos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Anyone can update team photos"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'team-photos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Anyone can delete team photos"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'team-photos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
