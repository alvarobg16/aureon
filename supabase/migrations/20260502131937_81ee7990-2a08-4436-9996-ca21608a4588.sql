ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_category_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_category_check CHECK (category = ANY (ARRAY['Ataque'::text, 'Defensa'::text, 'ABP'::text, 'Fundamentos Ofensivos'::text, 'Fundamentos Defensivos'::text, 'Modelo de juego'::text]));
UPDATE public.tasks SET category = 'Fundamentos Ofensivos' WHERE category = 'Ataque';
UPDATE public.tasks SET category = 'Fundamentos Defensivos' WHERE category = 'Defensa';