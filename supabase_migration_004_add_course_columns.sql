-- Migration 004: Add missing course columns
-- 
-- Problem: The online Supabase database is missing columns that are defined in supabase_schema.sql
-- Test script revealed these columns don't exist: title_zh, title_th, description_zh, description_th,
-- max_enrollment, current_enrollment, enrollment_deadline, target_audience, target_audience_zh, 
-- total_hours, rejection_reason
--
-- Execute this SQL in Supabase Dashboard: SQL Editor -> New Query -> Paste & Run

-- Multi-language title fields
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS title_zh text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS title_th text;

-- Multi-language description fields
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS description_zh text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS description_th text;

-- Capacity & enrollment fields
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS max_enrollment integer DEFAULT 30;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS current_enrollment integer DEFAULT 0;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS enrollment_deadline date;

-- Metadata fields
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS target_audience text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS target_audience_zh text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS total_hours numeric;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Verify columns were added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'courses' 
ORDER BY ordinal_position;
