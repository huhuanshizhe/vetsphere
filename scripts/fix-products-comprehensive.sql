-- =====================================================
-- Comprehensive Fix for Imported Products
-- =====================================================

-- 1. Fix rich_description format - convert line breaks to HTML
UPDATE products
SET rich_description_en = '<p>' || REPLACE(REPLACE(rich_description_en, E'\r\n', '</p><p>'), E'\n', '</p><p>') || '</p>'
WHERE rich_description_en IS NOT NULL 
  AND rich_description_en != ''
  AND rich_description_en NOT LIKE '<p>%';

-- 2. Fix weight_unit display - ensure correct values
-- Check current values
SELECT DISTINCT weight_unit FROM product_skus;

-- 3. Update SKU image_url from product image_url
UPDATE product_skus ps
SET image_url = p.image_url
FROM products p
WHERE ps.product_id = p.id
  AND p.image_url IS NOT NULL 
  AND p.image_url != ''
  AND (ps.image_url IS NULL OR ps.image_url = '');

-- 4. Verify data
SELECT 
  p.sku_code,
  p.image_url as product_image,
  ps.image_url as sku_image,
  ps.weight_unit,
  LENGTH(p.rich_description_en) as rich_desc_len,
  CASE WHEN p.rich_description_en LIKE '<p>%' THEN 'HTML' ELSE 'PLAIN' END as rich_desc_format
FROM products p
LEFT JOIN product_skus ps ON ps.product_id = p.id
WHERE p.sku_code = 'ALI0001';

SELECT 
  COUNT(*) as total_products,
  COUNT(image_url) as with_image_url,
  COUNT(CASE WHEN rich_description_en LIKE '<p>%' THEN 1 END) as with_html_rich_desc
FROM products
WHERE sku_code LIKE 'ALI%';