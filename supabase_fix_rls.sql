-- =============================================
-- Quick Fix: RLS Policies สำหรับทุกตาราง
-- ถ้า seed data ไม่ขึ้น หรือ เพิ่มข้อมูลไม่ได้
-- ให้รัน SQL นี้ใน Supabase SQL Editor
-- =============================================

-- ปิด RLS ชั่วคราวแล้วเปิดใหม่พร้อม policy
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to branches" ON branches;
CREATE POLICY "Allow all access to branches" ON branches
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to departments" ON departments;
CREATE POLICY "Allow all access to departments" ON departments
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to employees" ON employees;
CREATE POLICY "Allow all access to employees" ON employees
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to checkins" ON checkins;
CREATE POLICY "Allow all access to checkins" ON checkins
  FOR ALL USING (true) WITH CHECK (true);

-- ตรวจสอบว่า policy ถูกสร้างแล้ว
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public';
