ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_category_check;

UPDATE public.tasks SET category = 'Fundamentos Ofensivos' WHERE category = 'Ataque';
UPDATE public.tasks SET category = 'Fundamentos Defensivos' WHERE category = 'Defensa';

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_category_check
  CHECK (category IN (
    'Fundamentos Ofensivos',
    'Fundamentos Defensivos',
    'ABP',
    'Modelo de juego',
    'Aspecto Condicional'
  ));