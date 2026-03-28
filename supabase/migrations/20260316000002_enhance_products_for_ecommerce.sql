-- Migration: Enhance Products Table for E-commerce
-- Description: Add missing fields for multi-language, multi-site, and e-commerce features
-- Date: 2026-03-16

-- ============================================================================
-- 1. Multi-language Support Fields
-- ============================================================================

-- Product name translations
ALTER TABLE products ADD COLUMN IF NOT EXISTS name_en TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS name_th TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS name_ja TEXT;

-- Brand translations
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand_en TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand_th TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand_ja TEXT;

-- Description translations
ALTER TABLE products ADD COLUMN IF NOT EXISTS description_en TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS description_th TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS description_ja TEXT;

-- Rich description translations (HTML)
ALTER TABLE products ADD COLUMN IF NOT EXISTS rich_description_en TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS rich_description_th TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS rich_description_ja TEXT;

-- Subtitle translations
ALTER TABLE products ADD COLUMN IF NOT EXISTS subtitle_en TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS subtitle_th TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS subtitle_ja TEXT;

-- SEO fields
ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_title TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_title_en TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_title_th TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_title_ja TEXT;

ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_description_en TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_description_th TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_description_ja TEXT;

-- Slug translations for SEO-friendly URLs
ALTER TABLE products ADD COLUMN IF NOT EXISTS slug_en TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS slug_th TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS slug_ja TEXT;

-- ============================================================================
-- 2. E-commerce Specific Fields
-- ============================================================================

-- Control whether to show price or inquiry
ALTER TABLE products ADD COLUMN IF NOT EXISTS has_price BOOLEAN DEFAULT true;

-- Currency for international pricing
ALTER TABLE products ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';

-- Video support
ALTER TABLE products ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS has_video BOOLEAN DEFAULT false;

-- Variant attributes storage (JSONB)
ALTER TABLE products ADD COLUMN IF NOT EXISTS variant_attributes JSONB DEFAULT '[]';

-- SKU data storage (JSONB) - for quick access
ALTER TABLE products ADD COLUMN IF NOT EXISTS skus JSONB DEFAULT '[]';

-- ============================================================================
-- 3. Multi-site Publishing
-- ============================================================================

-- Published sites tracking (JSONB: {cn: boolean, intl: boolean, global: boolean})
ALTER TABLE products ADD COLUMN IF NOT EXISTS published_sites JSONB DEFAULT '{"cn": false, "intl": false, "global": false}';

-- Site-specific content override (optional)
-- Note: Main content is stored in base fields and _en/_th/_ja fields
-- This field can store site-specific overrides if needed

-- ============================================================================
-- 4. Product Status Workflow
-- ============================================================================

-- Enhanced status field with more states
-- Status values: draft, pending_review, rejected, approved, published
-- Note: Reusing audit_status if it exists, otherwise create it
ALTER TABLE products ADD COLUMN IF NOT EXISTS audit_status TEXT DEFAULT 'draft';

-- Add constraint for valid status values
ALTER TABLE products DROP CONSTRAINT IF EXISTS check_audit_status;
ALTER TABLE products ADD CONSTRAINT check_audit_status
  CHECK (audit_status IN ('draft', 'pending_review', 'rejected', 'approved', 'published'));

-- Rejection details
ALTER TABLE products ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;
ALTER TABLE products ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES auth.users(id);
ALTER TABLE products ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE products ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);

-- ============================================================================
-- 5. Sorting and Display
-- ============================================================================

-- Manual sort order for admin to control display order
ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Mark as new arrival (auto-set on publish, can be manual)
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_new BOOLEAN DEFAULT false;

-- New arrival expiry date (auto-clear is_new after this date)
ALTER TABLE products ADD COLUMN IF NOT EXISTS new_until TIMESTAMPTZ;

-- ============================================================================
-- 6. Additional Product Attributes
-- ============================================================================

-- Minimum order quantity (for B2B)
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_order_quantity INTEGER DEFAULT 1;

-- Unit of measurement (piece, set, box, etc.)
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'piece';

-- Packaging information
ALTER TABLE products ADD COLUMN IF NOT EXISTS packaging_info TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS packaging_info_en TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS packaging_info_th TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS packaging_info_ja TEXT;

-- Delivery time estimate
ALTER TABLE products ADD COLUMN IF NOT EXISTS delivery_time TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS delivery_time_en TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS delivery_time_th TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS delivery_time_ja TEXT;

-- Warranty information
ALTER TABLE products ADD COLUMN IF NOT EXISTS warranty_info TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS warranty_info_en TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS warranty_info_th TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS warranty_info_ja TEXT;

-- ============================================================================
-- 7. Product Specifications (structured data)
-- ============================================================================

-- Specifications as JSONB for flexible attribute storage
-- Example: {"Power": "220V", "Weight": "5kg", "Material": "Stainless Steel"}
ALTER TABLE products ADD COLUMN IF NOT EXISTS specifications JSONB DEFAULT '{}';

-- ============================================================================
-- 8. Indexes for Performance
-- ============================================================================

-- Multi-site publishing index
CREATE INDEX IF NOT EXISTS idx_products_published_sites ON products USING GIN(published_sites);

-- Has price index for filtering
CREATE INDEX IF NOT EXISTS idx_products_has_price ON products(has_price);

-- New arrival index
CREATE INDEX IF NOT EXISTS idx_products_is_new ON products(is_new) WHERE is_new = true;

-- Sort order index
CREATE INDEX IF NOT EXISTS idx_products_sort_order ON products(sort_order);

-- Status indexes for admin management
CREATE INDEX IF NOT EXISTS idx_products_audit_status ON products(audit_status);
CREATE INDEX IF NOT EXISTS idx_products_approved_at ON products(approved_at) WHERE approved_at IS NOT NULL;

-- ============================================================================
-- 9. Comments for Documentation
-- ============================================================================

COMMENT ON COLUMN products.has_price IS 'Controls whether to show price (true) or inquiry-only (false)';
COMMENT ON COLUMN products.currency IS 'Currency code (USD, CNY, THB, JPY) for international pricing';
COMMENT ON COLUMN products.published_sites IS 'JSON object tracking which sites this product is published to';
COMMENT ON COLUMN products.audit_status IS 'Workflow status: draft, pending_review, rejected, approved, published';
COMMENT ON COLUMN products.variant_attributes IS 'JSON array of variant attribute definitions for SKU generation';
COMMENT ON COLUMN products.specifications IS 'JSON object of product specifications/parameters';
COMMENT ON COLUMN products.min_order_quantity IS 'Minimum order quantity for B2B wholesale';
COMMENT ON COLUMN products.unit IS 'Unit of measurement (piece, set, box, kg, etc.)';
COMMENT ON COLUMN products.sort_order IS 'Manual sort order for display ranking';
COMMENT ON COLUMN products.is_new IS 'Flag to mark product as new arrival';
COMMENT ON COLUMN products.new_until IS 'Expiry date for is_new flag';

-- ============================================================================
-- 10. Update Trigger for updated_at
-- ============================================================================

-- Ensure updated_at is refreshed on any update
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Migration Complete
-- ============================================================================
