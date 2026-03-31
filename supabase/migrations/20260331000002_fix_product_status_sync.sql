-- =====================================================
-- Fix Product Status Inconsistencies
-- 2026-03-31
-- =====================================================
-- Issues found:
-- 1. Products with status "rejected" but site_views still "published"
-- 2. Status values inconsistent (mixed case: "Published" vs "published")
-- 3. When admin changes status, site_views not synced properly
-- =====================================================

-- 1. Normalize ALL status values to lowercase
UPDATE products SET status = LOWER(status) WHERE status != LOWER(status);

-- 2. Fix inconsistent site_views: if product is not published, site_views should be offline
UPDATE product_site_views psv
SET 
  publish_status = 'offline',
  is_enabled = false
FROM products p
WHERE psv.product_id = p.id 
  AND p.status NOT IN ('published', 'Published')
  AND psv.publish_status = 'published';

-- 3. Fix trigger to sync status on ANY status change (not just published -> non-published)
CREATE OR REPLACE FUNCTION sync_product_status_to_views()
RETURNS TRIGGER AS $$
BEGIN
  -- If new status is not 'published', disable all site_views
  IF NEW.status != 'published' AND OLD.status = 'published' THEN
    UPDATE product_site_views
    SET is_enabled = false, publish_status = 'offline'
    WHERE product_id = NEW.id;
  END IF;
  
  -- If status changes to 'rejected' or 'draft', also disable
  IF NEW.status IN ('rejected', 'draft', 'offline') THEN
    UPDATE product_site_views
    SET is_enabled = false, publish_status = 'offline'
    WHERE product_id = NEW.id AND publish_status != 'offline';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Add a function to check and fix status inconsistencies (can be called manually)
CREATE OR REPLACE FUNCTION fix_product_status_inconsistencies()
RETURNS TABLE(fixed_count bigint) AS $$
DECLARE
  affected bigint;
BEGIN
  -- Fix site_views where product is not published
  UPDATE product_site_views psv
  SET 
    publish_status = 'offline',
    is_enabled = false
  FROM products p
  WHERE psv.product_id = p.id 
    AND p.status NOT IN ('published')
    AND psv.publish_status = 'published';
  
  GET DIAGNOSTICS affected = ROW_COUNT;
  
  RETURN QUERY SELECT affected;
END;
$$ LANGUAGE plpgsql;

-- 5. Run the fix function
SELECT fix_product_status_inconsistencies();

-- 6. Verify the fix
COMMENT ON FUNCTION fix_product_status_inconsistencies() IS 
  'Fixes any inconsistencies between products.status and product_site_views.publish_status';