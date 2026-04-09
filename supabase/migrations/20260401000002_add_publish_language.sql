-- =====================================================
-- Add publish_language field to products table
-- 2026-04-01
-- =====================================================
-- This field tracks the source language of the product content
-- Used by batch import to indicate whether English or Chinese is the source
-- =====================================================

-- Add publish_language field to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS publish_language TEXT DEFAULT 'zh'
  CHECK (publish_language IN ('zh', 'en', 'th', 'ja'));

-- Add comment
COMMENT ON COLUMN products.publish_language IS 'Source language of product content (zh/en/th/ja). Indicates which language fields contain the original content.';

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_products_publish_language ON products(publish_language);

-- =====================================================
-- Migration Complete
-- =====================================================