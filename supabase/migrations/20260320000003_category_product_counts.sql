-- ============================================
-- Migration: Create category product counts view
-- Date: 2026-03-20
-- Description: View for dynamic category visibility based on product count
-- ============================================

-- Create view for category product counts on INTL site
CREATE OR REPLACE VIEW category_product_counts AS
SELECT
  p.clinical_category AS category_slug,
  COUNT(*) AS product_count,
  SUM(CASE WHEN psv.is_featured THEN 1 ELSE 0 END) AS featured_count,
  MIN(psv.display_order) AS min_display_order
FROM products p
INNER JOIN product_site_views psv
  ON p.id = psv.product_id
  AND psv.site_code = 'intl'
  AND psv.publish_status = 'published'
  AND psv.is_enabled = true
WHERE p.status = 'Published'
GROUP BY p.clinical_category;

-- Create view for category details with rich content
CREATE OR REPLACE VIEW category_details_with_content AS
SELECT
  pc.slug AS category_slug,
  pc.name,
  pc.description,
  pc.rich_description,
  pc.rich_description_above,
  pc.rich_description_below,
  pc.faq_content,
  COALESCE(cpc.product_count, 0) AS product_count,
  COALESCE(cpc.featured_count, 0) AS featured_count
FROM product_categories pc
LEFT JOIN category_product_counts cpc
  ON pc.slug = cpc.category_slug;

-- Create function to get categories with products only
CREATE OR REPLACE FUNCTION get_active_categories_with_products()
RETURNS TABLE (
  category_slug TEXT,
  product_count BIGINT,
  featured_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cpc.category_slug,
    cpc.product_count,
    cpc.featured_count
  FROM category_product_counts cpc
  WHERE cpc.product_count > 0
  ORDER BY cpc.min_display_order NULLS LAST, cpc.category_slug;
END;
$$ LANGUAGE plpgsql;

-- Create function to get category SEO content
CREATE OR REPLACE FUNCTION get_category_seo_content(p_category_slug TEXT)
RETURNS TABLE (
  rich_description JSONB,
  rich_description_above JSONB,
  rich_description_below JSONB,
  faq_content JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pc.rich_description,
    pc.rich_description_above,
    pc.rich_description_below,
    pc.faq_content
  FROM product_categories pc
  WHERE pc.slug = p_category_slug;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON VIEW category_product_counts IS 'Count of published products per clinical category for INTL site. Used for dynamic category visibility.';
COMMENT ON VIEW category_details_with_content IS 'Category details with SEO content and product counts.';
COMMENT ON FUNCTION get_active_categories_with_products IS 'Returns categories that have at least one published product.';
COMMENT ON FUNCTION get_category_seo_content IS 'Returns SEO content for a specific category slug.';
