-- =============================================
-- WFH Check-in Database Schema
-- Run this in Supabase SQL Editor
-- =============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Branches
CREATE TABLE IF NOT EXISTS branches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Departments
CREATE TABLE IF NOT EXISTS departments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  UNIQUE(branch_id, name),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Employees (ใช้ employee_code แทน email)
CREATE TABLE IF NOT EXISTS employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_code VARCHAR(20) UNIQUE NOT NULL,
  name TEXT NOT NULL,
  pin_code VARCHAR(255) NOT NULL DEFAULT '123456',
  branch_id UUID REFERENCES branches(id),
  department_id UUID REFERENCES departments(id),
  role TEXT DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
  face_descriptor JSONB,
  avatar TEXT DEFAULT '👨‍💼',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Check-ins
CREATE TABLE IF NOT EXISTS checkins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  date DATE DEFAULT CURRENT_DATE,
  check_in_time TIME,
  check_out_time TIME,
  status TEXT CHECK (status IN ('wfh', 'office', 'leave')),
  note TEXT,
  verified_by TEXT DEFAULT 'pin' CHECK (verified_by IN ('face', 'pin', 'manual')),
  latitude double precision,
  longitude double precision,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, date)
);

ALTER TABLE employees
  ALTER COLUMN pin_code TYPE VARCHAR(255);

ALTER TABLE checkins ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS longitude double precision;

-- =============================================
-- Row Level Security (RLS)
-- =============================================

-- Enable RLS
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;

-- Allow public read/write for anon (for this demo app)
-- In production, you'd use proper auth policies
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

-- =============================================
-- Seed Data (Optional)
-- =============================================

-- Add initial admin if needed
-- INSERT INTO employees (employee_code, name, pin_code, role, avatar)
-- VALUES ('ADMIN01', 'Admin', '123456', 'admin', '👨‍💻')
-- ON CONFLICT (employee_code) DO NOTHING;
