DROP INDEX IF EXISTS public.tasks_task_number_idx;
CREATE UNIQUE INDEX tasks_user_task_number_idx ON public.tasks (user_id, task_number);