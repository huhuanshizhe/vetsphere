-- ============================================
-- Migration 028: Add SKU weight_unit and suggested_retail_price columns
-- ============================================

-- 添加 weight_unit 列到 product_skus 表（重量单位：g, kg, lb）
ALTER TABLE public.product_skus
ADD COLUMN IF NOT EXISTS weight_unit TEXT DEFAULT 'g';

COMMENT ON COLUMN public.product_skus.weight_unit IS '重量单位：g(克), kg(千克), lb(磅)';

-- 添加 suggested_retail_price 列到 product_skus 表
ALTER TABLE public.product_skus
ADD COLUMN IF NOT EXISTS suggested_retail_price NUMERIC;

COMMENT ON COLUMN public.product_skus.suggested_retail_price IS '供应商建议的零售价';

-- 将现有的 weight_kg 转换为 weight + weight_unit（如果需要的话）
-- 这个迁移假设 weight_kg 已经存在，我们添加 weight_unit 和 suggested_retail_price
