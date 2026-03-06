-- Migration 022: Add multi-currency price columns
--
-- Problem: Only price_cny column exists (from migration 014).
-- The translation service generates prices in USD, JPY, THB but has no columns to save them.
--
-- Execute this SQL in Supabase Dashboard: SQL Editor -> New Query -> Paste & Run

ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS price_usd DECIMAL(10,2);
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS price_jpy DECIMAL(10,0);
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS price_thb DECIMAL(10,2);

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'courses'
  AND column_name IN ('price_cny', 'price_usd', 'price_jpy', 'price_thb')
ORDER BY column_name;
