-- Migration 021: Add 'offline' course format and change default
-- Date: 2026-03-06
-- Description: Add offline (线下课程) as a course format option, change default from 'video' to 'offline'

-- 1. Change default format to 'offline'
ALTER TABLE public.courses ALTER COLUMN format SET DEFAULT 'offline';

-- 2. Fill null format values with 'offline'
UPDATE public.courses SET format = 'offline' WHERE format IS NULL;
