-- =====================================================
-- Migration: Add International Trade Fields to SKU Level
-- Date: 2026-03-18
-- Description: 
--   Move international trade fields from product level to SKU level
--   Fields added:
--   - weight (DECIMAL): Product weight
--   - weight_unit (TEXT): Weight unit (g/kg/lb)
--   - suggested_retail_price (DECIMAL): Suggested retail price
-- =====================================================

-- Add weight field to products_skus table
ALTER TABLE public.products_skus 
ADD COLUMN IF NOT EXISTS weight DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS weight_unit TEXT DEFAULT 'g' CHECK (weight_unit IN ('g', 'kg', 'lb')),
ADD COLUMN IF NOT EXISTS suggested_retail_price DECIMAL(10,2);

-- Add comments
COMMENT ON COLUMN public.products_skus.weight IS '产品重量（每个 SKU 独立重量）';
COMMENT ON COLUMN public.products_skus.weight_unit IS '重量单位：g(克), kg(千克), lb(磅)';
COMMENT ON COLUMN public.products_skus.suggested_retail_price IS '建议零售价（供应商建议）';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_skus_weight ON products_skus(weight);
CREATE INDEX IF NOT EXISTS idx_products_skus_suggested_retail_price ON products_skus(suggested_retail_price);

-- Note: Product-level international trade fields (weight, weight_unit, suggested_retail_price, selling_price)
-- are deprecated and should be removed in a future migration after data migration is complete.
-- For now, they remain in the products table for backward compatibility.
