-- =============================================
-- Migration: เพิ่มระบบสาขา (branches) ลงฐานข้อมูลเดิม
-- รันทั้งก้อนใน Supabase SQL Editor
-- =============================================

-- 1) สร้างตาราง branches (ถ้ายังไม่มี)
CREATE TABLE IF NOT EXISTS public.branches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2) เพิ่ม branch_id ลงตาราง departments (ถ้ายังไม่มี)
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS branch_id UUID;

-- 3) เพิ่ม branch_id ลงตาราง employees (ถ้ายังไม่มี)
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS branch_id UUID;

-- 4) ขยาย pin_code ให้รองรับ bcrypt hash
ALTER TABLE public.employees ALTER COLUMN pin_code TYPE VARCHAR(255);

-- 5) เพิ่ม latitude/longitude ลงตาราง checkins (ถ้ายังไม่มี)
ALTER TABLE public.checkins ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE public.checkins ADD COLUMN IF NOT EXISTS longitude double precision;

-- 6) Seed สาขาเริ่มต้น
INSERT INTO public.branches (name)
VALUES ('สำนักงานใหญ่')
ON CONFLICT (name) DO NOTHING;

-- 7) Backfill: ผูกแผนกเดิมทั้งหมดเข้ากับ "สำนักงานใหญ่"
UPDATE public.departments
SET branch_id = (SELECT id FROM public.branches WHERE name = 'สำนักงานใหญ่')
WHERE branch_id IS NULL;

-- 8) Backfill: ผูกพนักงานเดิมเข้ากับ branch ตามแผนกที่สังกัด
UPDATE public.employees e
SET branch_id = d.branch_id
FROM public.departments d
WHERE e.department_id = d.id
  AND e.branch_id IS NULL;

-- 9) ทำให้ departments.branch_id เป็น NOT NULL
ALTER TABLE public.departments ALTER COLUMN branch_id SET NOT NULL;

-- 10) เพิ่ม Foreign Keys (ถ้ายังไม่มี)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'departments_branch_id_fkey') THEN
    ALTER TABLE public.departments
      ADD CONSTRAINT departments_branch_id_fkey
      FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employees_branch_id_fkey') THEN
    ALTER TABLE public.employees
      ADD CONSTRAINT employees_branch_id_fkey
      FOREIGN KEY (branch_id) REFERENCES public.branches(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'departments_branch_id_name_key') THEN
    ALTER TABLE public.departments
      ADD CONSTRAINT departments_branch_id_name_key UNIQUE (branch_id, name);
  END IF;
END $$;

-- 11) เปิด RLS ทุกตาราง
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;

-- 12) สร้าง Policies (drop ก่อนเพื่อไม่ให้ชน)
DROP POLICY IF EXISTS "Allow all access to branches" ON public.branches;
CREATE POLICY "Allow all access to branches" ON public.branches
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to departments" ON public.departments;
CREATE POLICY "Allow all access to departments" ON public.departments
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to employees" ON public.employees;
CREATE POLICY "Allow all access to employees" ON public.employees
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to checkins" ON public.checkins;
CREATE POLICY "Allow all access to checkins" ON public.checkins
  FOR ALL USING (true) WITH CHECK (true);

-- 13) ตรวจสอบผลลัพธ์
SELECT 'branches' AS tbl, count(*) FROM branches
UNION ALL
SELECT 'departments', count(*) FROM departments
UNION ALL
SELECT 'employees', count(*) FROM employees
UNION ALL
SELECT 'checkins', count(*) FROM checkins;
