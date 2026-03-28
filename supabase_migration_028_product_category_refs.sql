-- ============================================
-- Migration 028: Product Category References
-- ============================================
-- 添加分类外键引用到 products 表
-- 支持三级分类选择器

-- ==========================================
-- 1. 添加分类 ID 字段到 products 表
-- ==========================================

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS category_id TEXT REFERENCES public.product_categories(id),
ADD COLUMN IF NOT EXISTS subcategory_id TEXT REFERENCES public.product_categories(id),
ADD COLUMN IF NOT EXISTS level3_category_id TEXT REFERENCES public.product_categories(id),
ADD COLUMN IF NOT EXISTS category_slug TEXT;

COMMENT ON COLUMN public.products.category_id IS '一级分类 ID';
COMMENT ON COLUMN public.products.subcategory_id IS '二级分类 ID';
COMMENT ON COLUMN public.products.level3_category_id IS '三级分类 ID';
COMMENT ON COLUMN public.products.category_slug IS '分类路径 slug (用于 SEO)';

-- ==========================================
-- 2. 创建索引加速查询
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_subcategory_id ON public.products(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_products_level3_category_id ON public.products(level3_category_id);

-- ==========================================
-- 3. 验证
-- ==========================================

SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'products'
  AND column_name IN ('category_id', 'subcategory_id', 'level3_category_id', 'category_slug')
ORDER BY ordinal_position;

SELECT 'Migration 028 completed successfully!' as status;
