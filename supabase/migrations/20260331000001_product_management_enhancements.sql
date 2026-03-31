-- =====================================================
-- Product Management Enhancements
-- 2026-03-31
-- =====================================================
-- Features:
-- 1. Normalize status values to lowercase
-- 2. Soft delete trigger (cascade to site_views)
-- 3. Status sync trigger (offline -> site_views)
-- 4. Search indexes for products
-- =====================================================

-- 1. Normalize status values to lowercase
UPDATE products SET status = LOWER(status) WHERE status != LOWER(status);
UPDATE product_site_views SET publish_status = LOWER(publish_status) WHERE publish_status IS NOT NULL AND publish_status != LOWER(publish_status);

-- 2. Soft delete trigger: When product is soft-deleted, disable all site_views
CREATE OR REPLACE FUNCTION handle_product_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Disable all site views when product is soft-deleted
  UPDATE product_site_views
  SET is_enabled = false, publish_status = 'offline'
  WHERE product_id = OLD.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS product_soft_delete_trigger ON products;
CREATE TRIGGER product_soft_delete_trigger
  BEFORE UPDATE OF deleted_at ON products
  FOR EACH ROW
  WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
  EXECUTE FUNCTION handle_product_soft_delete();

-- 3. Status sync trigger: When product status changes from published to non-published, sync site_views
CREATE OR REPLACE FUNCTION sync_product_status_to_views()
RETURNS TRIGGER AS $$
BEGIN
  -- When product goes offline (not published anymore), disable site_views
  IF NEW.status NOT IN ('published') AND OLD.status = 'published' THEN
    UPDATE product_site_views
    SET is_enabled = false, publish_status = 'offline'
    WHERE product_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS product_status_sync_trigger ON products;
CREATE TRIGGER product_status_sync_trigger
  AFTER UPDATE OF status ON products
  FOR EACH ROW
  EXECUTE FUNCTION sync_product_status_to_views();

-- 4. Search indexes for better performance
-- Full-text search index on name, brand, sku
CREATE INDEX IF NOT EXISTS idx_products_name_brand_sku_search ON products 
  USING GIN (to_tsvector('simple', 
    coalesce(name, '') || ' ' || 
    coalesce(brand, '') || ' ' || 
    coalesce(sku, '')
  ));

-- Status + created_at composite index for filtered listings
CREATE INDEX IF NOT EXISTS idx_products_status_created ON products(status, created_at DESC) 
  WHERE deleted_at IS NULL;

-- Supplier + status index for supplier-based filtering
CREATE INDEX IF NOT EXISTS idx_products_supplier_status ON products(supplier_id, status) 
  WHERE deleted_at IS NULL AND supplier_id IS NOT NULL;

-- 5. Add comment to document triggers
COMMENT ON FUNCTION handle_product_soft_delete() IS 
  'Automatically disables site_views when a product is soft-deleted';
COMMENT ON FUNCTION sync_product_status_to_views() IS 
  'Automatically disables site_views when product status changes from published to offline';