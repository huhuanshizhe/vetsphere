-- ============================================
-- Migration 024: Product Categories Enhancement
-- ============================================
-- 增强产品分类系统：支持三级分类、SEO slug、站点隔离

-- ==========================================
-- 1. 添加新字段到 product_categories 表
-- ==========================================

-- 添加新字段
ALTER TABLE public.product_categories 
ADD COLUMN IF NOT EXISTS level integer DEFAULT 1 CHECK (level IN (1, 2, 3)),
ADD COLUMN IF NOT EXISTS icon text,
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS site_code text DEFAULT 'global' CHECK (site_code IN ('cn', 'intl', 'global')),
ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone default timezone('utc'::text, now());

-- 更新 name 字段（如果不存在则添加）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'product_categories' AND column_name = 'name'
  ) THEN
    ALTER TABLE public.product_categories ADD COLUMN name text;
  END IF;
END $$;

-- 确保 slug 唯一约束存在
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_categories_slug_key'
  ) THEN
    ALTER TABLE public.product_categories ADD CONSTRAINT product_categories_slug_key UNIQUE (slug);
  END IF;
END $$;

-- ==========================================
-- 2. 创建索引
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_product_categories_parent ON public.product_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_level ON public.product_categories(level);
CREATE INDEX IF NOT EXISTS idx_product_categories_site ON public.product_categories(site_code);
CREATE INDEX IF NOT EXISTS idx_product_categories_sort ON public.product_categories(sort_order);

-- ==========================================
-- 3. 创建触发器自动更新 updated_at
-- ==========================================

DROP TRIGGER IF EXISTS update_product_categories_updated_at ON public.product_categories;
CREATE TRIGGER update_product_categories_updated_at 
BEFORE UPDATE ON public.product_categories
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 4. RLS 策略
-- ==========================================

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active categories" ON public.product_categories;
CREATE POLICY "Anyone can view active categories" ON public.product_categories 
FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage categories" ON public.product_categories;
CREATE POLICY "Admins can manage categories" ON public.product_categories 
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'Admin')
);

-- ==========================================
-- 5. 创建辅助函数：获取分类树
-- ==========================================

CREATE OR REPLACE FUNCTION get_category_tree(p_site_code text DEFAULT 'global')
RETURNS TABLE (
  id text,
  name text,
  slug text,
  level integer,
  parent_id text,
  icon text,
  sort_order integer,
  children jsonb
) AS $$
BEGIN
  RETURN QUERY
  WITH level1 AS (
    SELECT 
      c.id, c.name, c.slug, c.level, c.parent_id, c.icon, c.sort_order
    FROM public.product_categories c
    WHERE c.parent_id IS NULL 
      AND c.is_active = true 
      AND (c.site_code = p_site_code OR c.site_code = 'global')
    ORDER BY c.sort_order
  ),
  level2 AS (
    SELECT 
      c.id, c.name, c.slug, c.level, c.parent_id, c.icon, c.sort_order
    FROM public.product_categories c
    WHERE c.level = 2
      AND c.is_active = true 
      AND (c.site_code = p_site_code OR c.site_code = 'global')
    ORDER BY c.sort_order
  ),
  level3 AS (
    SELECT 
      c.id, c.name, c.slug, c.level, c.parent_id, c.icon, c.sort_order
    FROM public.product_categories c
    WHERE c.level = 3
      AND c.is_active = true 
      AND (c.site_code = p_site_code OR c.site_code = 'global')
    ORDER BY c.sort_order
  )
  SELECT 
    l1.id,
    l1.name,
    l1.slug,
    l1.level,
    l1.parent_id,
    l1.icon,
    l1.sort_order,
    (
      SELECT jsonb_agg(jsonb_build_object(
        'id', l2.id,
        'name', l2.name,
        'slug', l2.slug,
        'level', l2.level,
        'icon', l2.icon,
        'sort_order', l2.sort_order,
        'children', (
          SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id', l3.id,
            'name', l3.name,
            'slug', l3.slug,
            'level', l3.level,
            'icon', l3.icon,
            'sort_order', l3.sort_order
          )), '[]'::jsonb)
          FROM level3 l3
          WHERE l3.parent_id = l2.id
        )
      ))
      FROM level2 l2
      WHERE l2.parent_id = l1.id
    ) as children
  FROM level1 l1;
END;
$$ LANGUAGE plpgsql STABLE;

-- ==========================================
-- 验证
-- ==========================================
SELECT 'Migration 024 completed successfully!' as status;
