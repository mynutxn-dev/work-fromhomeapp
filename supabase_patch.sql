CREATE TABLE IF NOT EXISTS public.branches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'branches'
      AND policyname = 'Allow all access to branches'
  ) THEN
    CREATE POLICY "Allow all access to branches" ON public.branches
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

INSERT INTO public.branches (name)
VALUES ('สำนักงานใหญ่')
ON CONFLICT (name) DO NOTHING;

ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS branch_id UUID;

UPDATE public.departments
SET branch_id = (SELECT id FROM public.branches WHERE name = 'สำนักงานใหญ่')
WHERE branch_id IS NULL;

ALTER TABLE public.departments
  ALTER COLUMN branch_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'departments_branch_id_fkey'
  ) THEN
    ALTER TABLE public.departments
      ADD CONSTRAINT departments_branch_id_fkey
      FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'departments_branch_id_name_key'
  ) THEN
    ALTER TABLE public.departments
      ADD CONSTRAINT departments_branch_id_name_key UNIQUE (branch_id, name);
  END IF;
END $$;

ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS branch_id UUID;

UPDATE public.employees e
SET branch_id = d.branch_id
FROM public.departments d
WHERE e.department_id = d.id
  AND e.branch_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'employees_branch_id_fkey'
  ) THEN
    ALTER TABLE public.employees
      ADD CONSTRAINT employees_branch_id_fkey
      FOREIGN KEY (branch_id) REFERENCES public.branches(id);
  END IF;
END $$;

ALTER TABLE public.checkins ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE public.checkins ADD COLUMN IF NOT EXISTS longitude double precision;
