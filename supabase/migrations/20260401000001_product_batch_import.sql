-- =====================================================
-- Product Batch Import Support
-- 2026-04-01
-- =====================================================
-- Features:
-- 1. Add SKU code field for business identifier
-- 2. Add source URL for product origin tracking
-- 3. Add SEO focus keyword
-- 4. Add package quantity and unit fields
-- 5. Add lead time field
-- 6. Create category_mappings table for Excel import
-- =====================================================

-- ============================================
-- 1. Add new fields to products table
-- ============================================

-- Business SKU code (e.g., ALI0001)
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku_code TEXT UNIQUE;

-- Source URL (e.g., Alibaba product URL)
ALTER TABLE products ADD COLUMN IF NOT EXISTS source_url TEXT;

-- SEO focus keyword
ALTER TABLE products ADD COLUMN IF NOT EXISTS focus_keyword TEXT;

-- Package quantity (e.g., 100 pieces per box)
ALTER TABLE products ADD COLUMN IF NOT EXISTS package_qty INTEGER;

-- Package unit (e.g., Each, Box, Set)
ALTER TABLE products ADD COLUMN IF NOT EXISTS package_unit TEXT;

-- Lead time / Delivery time (e.g., 2-4 weeks)
ALTER TABLE products ADD COLUMN IF NOT EXISTS lead_time TEXT;

-- ============================================
-- 2. Add SKU code to product_skus if not exists
-- ============================================

-- SKU code already exists in product_skus, but ensure it's unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_skus_sku_code_unique ON product_skus(sku_code) WHERE sku_code IS NOT NULL;

-- ============================================
-- 3. Create category_mappings table
-- ============================================

CREATE TABLE IF NOT EXISTS category_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  excel_l1 TEXT NOT NULL,                    -- Excel Level 1 category (e.g., "防护用品")
  excel_l2 TEXT,                             -- Excel Level 2 category (e.g., "手套")
  excel_l3 TEXT,                             -- Excel Level 3 category (e.g., "丁腈手套")
  category_id TEXT REFERENCES product_categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(excel_l1, excel_l2, excel_l3)
);

-- Indexes for category_mappings
CREATE INDEX IF NOT EXISTS idx_category_mappings_l1 ON category_mappings(excel_l1);
CREATE INDEX IF NOT EXISTS idx_category_mappings_l2 ON category_mappings(excel_l2) WHERE excel_l2 IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_category_mappings_category ON category_mappings(category_id);

-- ============================================
-- 4. RLS for category_mappings
-- ============================================

ALTER TABLE category_mappings ENABLE ROW LEVEL SECURITY;

-- Admin can manage all category mappings
CREATE POLICY "Admins can manage category_mappings" ON category_mappings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('Admin', 'admin', 'super_admin')
    )
  );

-- ============================================
-- 5. Trigger for updated_at on category_mappings
-- ============================================

DROP TRIGGER IF EXISTS update_category_mappings_updated_at ON category_mappings;
CREATE TRIGGER update_category_mappings_updated_at
  BEFORE UPDATE ON category_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. Comments for documentation
-- ============================================

COMMENT ON COLUMN products.sku_code IS 'Business SKU code from source platform (e.g., ALI0001)';
COMMENT ON COLUMN products.source_url IS 'Original product URL from source platform';
COMMENT ON COLUMN products.focus_keyword IS 'SEO focus keyword for search optimization';
COMMENT ON COLUMN products.package_qty IS 'Package quantity (pieces per unit)';
COMMENT ON COLUMN products.package_unit IS 'Package unit type (Each, Box, Set, etc.)';
COMMENT ON COLUMN products.lead_time IS 'Delivery/fulfillment time estimate';
COMMENT ON TABLE category_mappings IS 'Maps Excel category names to database category IDs for batch import';

-- ============================================
-- Migration Complete
-- ============================================