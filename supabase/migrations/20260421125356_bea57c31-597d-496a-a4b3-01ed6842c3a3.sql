
-- Tabla de tareas
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_number INTEGER NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  keywords TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL CHECK (category IN ('Ataque','Defensa','ABP')),
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Secuencia para número correlativo
CREATE SEQUENCE public.tasks_task_number_seq OWNED BY public.tasks.task_number;
ALTER TABLE public.tasks ALTER COLUMN task_number SET DEFAULT nextval('public.tasks_task_number_seq');
CREATE UNIQUE INDEX tasks_task_number_idx ON public.tasks(task_number);

-- RLS abierto
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view tasks" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "Anyone can insert tasks" ON public.tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update tasks" ON public.tasks FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete tasks" ON public.tasks FOR DELETE USING (true);

-- Bucket de imágenes
INSERT INTO storage.buckets (id, name, public) VALUES ('task-images', 'task-images', true);

CREATE POLICY "Public can view task images" ON storage.objects FOR SELECT USING (bucket_id = 'task-images');
CREATE POLICY "Anyone can upload task images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'task-images');
CREATE POLICY "Anyone can update task images" ON storage.objects FOR UPDATE USING (bucket_id = 'task-images');
CREATE POLICY "Anyone can delete task images" ON storage.objects FOR DELETE USING (bucket_id = 'task-images');
