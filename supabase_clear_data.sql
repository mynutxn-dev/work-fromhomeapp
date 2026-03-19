-- =============================================
-- Clear All WFH Check-in Data
-- Run this in Supabase SQL Editor to remove sample data
-- WARNING: This will delete ALL data in these tables!
-- =============================================

-- Using TRUNCATE with CASCADE to clear data in all related tables
-- This keeps the table structure (Schema) intact but removes all records
TRUNCATE TABLE public.checkins, public.employees, public.departments, public.branches CASCADE;

-- Optional: Reset default sequences if any (usually not needed for gen_random_uuid())
-- ALTER SEQUENCE sequence_name RESTART WITH 1;

SELECT 'Success: All data cleared from WFH tables.' as status;
