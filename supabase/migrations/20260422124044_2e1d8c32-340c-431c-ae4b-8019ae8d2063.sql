
-- Teams table
CREATE TABLE public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view teams" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Anyone can insert teams" ON public.teams FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update teams" ON public.teams FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete teams" ON public.teams FOR DELETE USING (true);

-- Players table
CREATE TABLE public.players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  sport_name TEXT NOT NULL DEFAULT '',
  jersey_number INTEGER,
  position TEXT NOT NULL DEFAULT 'universal',
  dominant_foot TEXT NOT NULL DEFAULT 'right',
  dominant_hand TEXT,
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  birth_date DATE,
  photo_url TEXT,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view players" ON public.players FOR SELECT USING (true);
CREATE POLICY "Anyone can insert players" ON public.players FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update players" ON public.players FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete players" ON public.players FOR DELETE USING (true);

CREATE INDEX idx_players_team_id ON public.players(team_id);

-- Storage bucket for player photos
INSERT INTO storage.buckets (id, name, public) VALUES ('player-photos', 'player-photos', true);

CREATE POLICY "Player photos are publicly accessible"
ON storage.objects FOR SELECT USING (bucket_id = 'player-photos');

CREATE POLICY "Anyone can upload player photos"
ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'player-photos');

CREATE POLICY "Anyone can update player photos"
ON storage.objects FOR UPDATE USING (bucket_id = 'player-photos');

CREATE POLICY "Anyone can delete player photos"
ON storage.objects FOR DELETE USING (bucket_id = 'player-photos');
