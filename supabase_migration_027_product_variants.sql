-- ============================================
-- Migration 027: Product Variants (SKU System)
-- ============================================
-- 商品SKU规格变体系统
-- 支持多规格组合（颜色×尺寸×型号），每组合独立价格/库存

-- ==========================================
-- 1. 扩展 products 表
-- ==========================================

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS has_variants BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS price_range_min NUMERIC,
ADD COLUMN IF NOT EXISTS price_range_max NUMERIC,
ADD COLUMN IF NOT EXISTS total_stock INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS rich_description TEXT;

COMMENT ON COLUMN public.products.has_variants IS '是否启用多规格变体';
COMMENT ON COLUMN public.products.price_range_min IS '所有SKU中最低价（冗余字段，加速查询）';
COMMENT ON COLUMN public.products.price_range_max IS '所有SKU中最高价';
COMMENT ON COLUMN public.products.total_stock IS '所有SKU库存合计';
COMMENT ON COLUMN public.products.rich_description IS '富文本详情（HTML）';

-- ==========================================
-- 2. 规格属性定义表
-- ==========================================

CREATE TABLE IF NOT EXISTS public.product_variant_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  attribute_name TEXT NOT NULL,           -- 规格名称：如"颜色"、"尺寸"、"型号"
  attribute_values TEXT[] NOT NULL,       -- 规格值列表：如 ['红色','蓝色','白色']
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_product_attribute UNIQUE(product_id, attribute_name)
);

COMMENT ON TABLE public.product_variant_attributes IS '商品规格属性定义（颜色、尺寸等维度）';

CREATE INDEX IF NOT EXISTS idx_variant_attrs_product_id ON public.product_variant_attributes(product_id);

-- ==========================================
-- 3. SKU变体表
-- ==========================================

CREATE TABLE IF NOT EXISTS public.product_skus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku_code TEXT NOT NULL,                 -- SKU编码（唯一）
  attribute_combination JSONB NOT NULL,   -- 规格组合：{"颜色":"红色","尺寸":"M"}
  price NUMERIC NOT NULL,                 -- 该SKU的价格
  original_price NUMERIC,                 -- 原价（划线价）
  stock_quantity INTEGER DEFAULT 0,       -- 该SKU独立库存
  weight_kg NUMERIC,                      -- 单品重量
  image_url TEXT,                         -- 该SKU对应的图片
  barcode TEXT,                           -- 条形码
  is_active BOOLEAN DEFAULT true,         -- 是否启用
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_sku_code UNIQUE(sku_code)
);

COMMENT ON TABLE public.product_skus IS '商品SKU变体（每个规格组合独立价格/库存）';

CREATE INDEX IF NOT EXISTS idx_product_skus_product_id ON public.product_skus(product_id);
CREATE INDEX IF NOT EXISTS idx_product_skus_combination ON public.product_skus USING GIN(attribute_combination);

-- ==========================================
-- 4. 触发器：自动更新 updated_at
-- ==========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_variant_attributes_updated_at
  BEFORE UPDATE ON public.product_variant_attributes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_skus_updated_at
  BEFORE UPDATE ON public.product_skus
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 5. 触发器：自动同步价格区间和总库存
-- ==========================================

CREATE OR REPLACE FUNCTION sync_product_stats_fn()
RETURNS TRIGGER AS $$
DECLARE
  v_product_id TEXT;
  v_min_price NUMERIC;
  v_max_price NUMERIC;
  v_total_stock INTEGER;
BEGIN
  -- 确定要更新的产品ID
  IF TG_OP = 'DELETE' THEN
    v_product_id := OLD.product_id;
  ELSE
    v_product_id := NEW.product_id;
  END IF;

  -- 计算价格区间和总库存
  SELECT
    COALESCE(MIN(price), 0),
    COALESCE(MAX(price), 0),
    COALESCE(SUM(stock_quantity), 0)
  INTO v_min_price, v_max_price, v_total_stock
  FROM public.product_skus
  WHERE product_id = v_product_id AND is_active = true;

  -- 更新products表
  UPDATE public.products
  SET
    price_range_min = v_min_price,
    price_range_max = v_max_price,
    total_stock = v_total_stock
  WHERE id = v_product_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_product_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.product_skus
  FOR EACH ROW
  EXECUTE FUNCTION sync_product_stats_fn();

-- ==========================================
-- 6. RLS 策略
-- ==========================================

ALTER TABLE public.product_variant_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_skus ENABLE ROW LEVEL SECURITY;

-- 公开读取（商品详情页需要）
CREATE POLICY "Variant attributes are viewable by all"
  ON public.product_variant_attributes FOR SELECT
  USING (true);

CREATE POLICY "Product SKUs are viewable by all"
  ON public.product_skus FOR SELECT
  USING (true);

-- 供应商可以管理自己商品的规格
CREATE POLICY "Suppliers can manage their product variants"
  ON public.product_variant_attributes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.user_profiles u ON u.id = p.supplier_id
      WHERE p.id = product_variant_attributes.product_id
      AND u.id = auth.uid()
    )
  );

CREATE POLICY "Suppliers can manage their product SKUs"
  ON public.product_skus FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.user_profiles u ON u.id = p.supplier_id
      WHERE p.id = product_skus.product_id
      AND u.id = auth.uid()
    )
  );

-- Admin 可以管理所有
CREATE POLICY "Admins can manage all variant attributes"
  ON public.product_variant_attributes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'Admin'
    )
  );

CREATE POLICY "Admins can manage all product SKUs"
  ON public.product_skus FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'Admin'
    )
  );

-- ==========================================
-- 7. 验证
-- ==========================================

SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t.table_name) as column_count
FROM (
  VALUES ('product_variant_attributes'), ('product_skus')
) AS t(table_name);
