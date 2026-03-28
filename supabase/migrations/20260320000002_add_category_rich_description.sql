-- ============================================
-- Migration: Add rich_description fields to product_categories
-- Date: 2026-03-20
-- Description: Add SEO content fields for category pages
-- ============================================

-- Add rich description fields for SEO content
ALTER TABLE public.product_categories
ADD COLUMN IF NOT EXISTS rich_description JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS rich_description_above JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS rich_description_below JSONB DEFAULT NULL;

-- Add FAQ field for category pages
ALTER TABLE public.product_categories
ADD COLUMN IF NOT EXISTS faq_content JSONB DEFAULT NULL;

-- Add display settings
ALTER TABLE public.product_categories
ADD COLUMN IF NOT EXISTS show_product_count BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Update existing records with default values from description
UPDATE public.product_categories
SET
  rich_description = jsonb_build_object(
    'en', COALESCE(description, ''),
    'th', COALESCE(description, ''),
    'ja', COALESCE(description, '')
  )
WHERE rich_description IS NULL AND description IS NOT NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_product_categories_has_products
ON public.product_categories(id)
WHERE display_order > 0 OR rich_description IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.product_categories.rich_description IS 'Full rich content description (HTML/Markdown) for the category';
COMMENT ON COLUMN public.product_categories.rich_description_above IS 'SEO content displayed above the product list grid';
COMMENT ON COLUMN public.product_categories.rich_description_below IS 'SEO content displayed below the product list grid';
COMMENT ON COLUMN public.product_categories.faq_content IS 'FAQ items in JSONB format: [{question, answer}, ...]';
COMMENT ON COLUMN public.product_categories.show_product_count IS 'Whether to show product count in the category tab';
