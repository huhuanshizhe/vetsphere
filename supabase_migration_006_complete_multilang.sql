-- Migration 006: Add complete multi-language support
-- 
-- Problem: The database is missing columns for Japanese and English translations
-- - title_ja, description_ja missing
-- - title_en, description_en missing (needed when source is not English)
--
-- Execute this SQL in Supabase Dashboard: SQL Editor -> New Query -> Paste & Run

-- Add Japanese translation columns
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS title_ja text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS description_ja text;

-- Add English translation columns (needed when source is Chinese/Thai/Japanese)
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS title_en text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS description_en text;

-- Add translation status columns
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS translations_complete boolean DEFAULT false;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS translated_at timestamp with time zone;

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'courses' 
  AND column_name IN ('title_ja', 'description_ja', 'title_en', 'description_en', 'translations_complete', 'translated_at')
ORDER BY column_name;
