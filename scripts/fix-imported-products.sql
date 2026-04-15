-- =====================================================
-- Fix Imported Products SQL Script
-- 
-- This script fixes issues with previously imported products:
-- 1. Set publish_language = 'en' for English source products
-- 2. Clear base fields (Chinese) when they contain duplicate English
-- 3. Fix SKU prices and weight_unit
-- =====================================================

-- 1. Fix products: Set publish_language and clear duplicate English from base fields
UPDATE products
SET 
  publish_language = 'en',
  name = NULLIF(NULLIF(name, name_en), ''),
  slug = CASE WHEN name IS NULL OR name = '' OR name = name_en THEN NULL ELSE slug END,
  description = NULLIF(NULLIF(description, description_en), ''),
  brand = NULLIF(NULLIF(brand, brand_en), ''),
  meta_title = NULLIF(NULLIF(meta_title, meta_title_en), ''),
  meta_description = NULLIF(NULLIF(meta_description, meta_description_en), '')
WHERE 
  name_en IS NOT NULL 
  AND name_en != ''
  AND (publish_language IS NULL OR publish_language = 'zh');

-- 2. Fix SKU weight_unit: normalize to kg/g/lb
UPDATE product_skus
SET weight_unit = 'kg'
WHERE weight_unit IN ('KG', 'KGS', 'kilogram', 'kilograms', 'Kilogram', 'Kilograms');

UPDATE product_skus
SET weight_unit = 'g'
WHERE weight_unit IN ('G', 'gram', 'grams', 'Gram', 'Grams');

UPDATE product_skus
SET weight_unit = 'lb'
WHERE weight_unit IN ('LB', 'LBS', 'pound', 'pounds', 'Pound', 'Pounds');

-- 3. Fix SKU prices: Calculate missing currency prices from USD
-- selling_price (CNY) = selling_price_usd * 7.2
UPDATE product_skus
SET selling_price = ROUND(selling_price_usd * 7.2, 2)
WHERE selling_price_usd > 0 
  AND (selling_price IS NULL OR selling_price = 0 OR selling_price = price);

-- selling_price_jpy = selling_price_usd * 150
UPDATE product_skus
SET selling_price_jpy = ROUND(selling_price_usd * 150)
WHERE selling_price_usd > 0 
  AND (selling_price_jpy IS NULL OR selling_price_jpy = 0);

-- selling_price_thb = selling_price_usd * 35
UPDATE product_skus
SET selling_price_thb = ROUND(selling_price_usd * 35, 2)
WHERE selling_price_usd > 0 
  AND (selling_price_thb IS NULL OR selling_price_thb = 0);

-- 4. Show results
SELECT 
  'Products fixed' as type, 
  COUNT(*) as count 
FROM products 
WHERE publish_language = 'en';

SELECT 
  'SKUs with prices' as type,
  COUNT(*) as count
FROM product_skus
WHERE selling_price > 0 AND selling_price_jpy > 0 AND selling_price_thb > 0;

-- =====================================================
-- Script Complete
-- =====================================================