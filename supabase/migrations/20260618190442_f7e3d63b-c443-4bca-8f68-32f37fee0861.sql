ALTER TABLE public.user_modules
  ADD COLUMN IF NOT EXISTS disabled boolean NOT NULL DEFAULT false;