-- Migration 005: Add missing course fields
-- 
-- These fields are needed for the course creation form but were not in original schema:
-- - publish_language: The source language of the course content
-- - teaching_languages: Languages the course is taught in (array)
-- - preview_video_url: URL to preview video
-- - services: JSONB for travel/accommodation service info
--
-- Execute this SQL in Supabase Dashboard: SQL Editor -> New Query -> Paste & Run

-- Add publish_language field
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS publish_language text DEFAULT 'zh';

-- Add teaching_languages field (stored as JSONB array)
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS teaching_languages jsonb DEFAULT '[]';

-- Add preview video URL
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS preview_video_url text;

-- Add services JSONB for travel/accommodation info
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS services jsonb DEFAULT '{}';

-- Verify columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'courses' 
  AND column_name IN ('publish_language', 'teaching_languages', 'preview_video_url', 'services')
ORDER BY column_name;
