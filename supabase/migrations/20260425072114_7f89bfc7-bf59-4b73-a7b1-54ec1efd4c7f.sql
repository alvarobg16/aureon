ALTER TABLE public.goals DROP CONSTRAINT IF EXISTS goals_match_id_fkey;
ALTER TABLE public.goals ALTER COLUMN match_id DROP NOT NULL;