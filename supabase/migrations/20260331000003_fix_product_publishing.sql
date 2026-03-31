-- =====================================================
-- Fix Product Publishing Issues
-- 2026-03-31
-- =====================================================
-- Issues fixed:
-- 1. Admin user role was NULL, preventing RLS policy from allowing writes
-- 2. RLS policy for product_site_views used uppercase 'Admin' but role values are lowercase
-- 3. product_site_views data was inconsistent (offline despite product being published)
-- 4. Missing trigger to sync product status to site_views
-- =====================================================

-- 1. Ensure admin user has correct role
INSERT INTO user_profiles (id, role, display_name)
SELECT id, 'admin', 'Admin User' FROM auth.users 
WHERE email = 'admin@vetsphere.pro'
AND NOT EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.users.id)
ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- 2. Fix RLS policy for product_site_views (use lowercase comparison)
DROP POLICY IF EXISTS "Admins can manage site views" ON product_site_views;
DROP POLICY IF EXISTS "psv_admin_all" ON product_site_views;

CREATE POLICY "Admins can manage site views"
  ON product_site_views FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND LOWER(user_profiles.role) IN ('admin', 'super_admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND LOWER(user_profiles.role) IN ('admin', 'super_admin')
  ));

-- 3. Fix inconsistent data in product_site_views
-- Products with status 'published' should have site_views with publish_status 'published'
UPDATE product_site_views psv
SET 
  publish_status = 'published',
  is_enabled = true,
  published_at = COALESCE(psv.published_at, NOW()),
  updated_at = NOW()
FROM products p
WHERE psv.product_id = p.id
  AND p.status = 'published'
  AND psv.publish_status != 'published';

-- 4. Create trigger to sync product status to site_views
CREATE OR REPLACE FUNCTION sync_product_status_to_views()
RETURNS TRIGGER AS $$
BEGIN
  -- When product goes offline (not published anymore), disable site_views
  IF NEW.status != 'published' AND OLD.status = 'published' THEN
    UPDATE product_site_views
    SET is_enabled = false, publish_status = 'offline', updated_at = NOW()
    WHERE product_id = NEW.id AND publish_status = 'published';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS product_status_sync_trigger ON products;
CREATE TRIGGER product_status_sync_trigger
  AFTER UPDATE OF status ON products
  FOR EACH ROW
  EXECUTE FUNCTION sync_product_status_to_views();

-- 5. Add comments
COMMENT ON FUNCTION sync_product_status_to_views() IS 
  'Automatically sets site_views to offline when product status changes from published to non-published';

-- =====================================================
-- Verification Queries (run manually to check)
-- =====================================================
-- SELECT p.id, p.status, psv.site_code, psv.publish_status, psv.is_enabled
-- FROM products p JOIN product_site_views psv ON p.id = psv.product_id
-- WHERE p.status = 'published';