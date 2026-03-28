-- ============================================================
-- Migration: Add Multi-currency Selling Price Fields to SKUs
-- Date: 2025-03-25
-- Description: 为SKU添加多币种销售价字段，支持CNY/USD/JPY/THB
-- ============================================================

-- 1. 为 product_skus 表添加多币种销售价字段
ALTER TABLE public.product_skus
ADD COLUMN IF NOT EXISTS selling_price NUMERIC,        -- CNY销售价（中国站）
ADD COLUMN IF NOT EXISTS selling_price_usd NUMERIC,    -- USD销售价（国际站）
ADD COLUMN IF NOT EXISTS selling_price_jpy NUMERIC,    -- JPY销售价（日本市场）
ADD COLUMN IF NOT EXISTS selling_price_thb NUMERIC;    -- THB销售价（泰国市场）

-- 2. 添加重量和单位字段（如果不存在）
ALTER TABLE public.product_skus
ADD COLUMN IF NOT EXISTS weight NUMERIC,
ADD COLUMN IF NOT EXISTS weight_unit TEXT DEFAULT 'g';

-- 3. 添加SKU级别规格参数字段
ALTER TABLE public.product_skus
ADD COLUMN IF NOT EXISTS specs JSONB DEFAULT '{}';

-- 4. 数据迁移：复制现有 weight_kg 到 weight（如果存在weight_kg列）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'product_skus'
    AND column_name = 'weight_kg'
  ) THEN
    UPDATE public.product_skus
    SET weight = weight_kg, weight_unit = 'kg'
    WHERE weight_kg IS NOT NULL AND weight IS NULL;
  END IF;
END $$;

-- 5. 添加注释
COMMENT ON COLUMN public.product_skus.selling_price IS 'CNY销售价 - Admin设置，用于中国站';
COMMENT ON COLUMN public.product_skus.selling_price_usd IS 'USD销售价 - Admin设置，用于国际站';
COMMENT ON COLUMN public.product_skus.selling_price_jpy IS 'JPY销售价 - Admin设置，用于日本市场';
COMMENT ON COLUMN public.product_skus.selling_price_thb IS 'THB销售价 - Admin设置，用于泰国市场';
COMMENT ON COLUMN public.product_skus.specs IS 'SKU级别规格参数（JSON格式）';

-- 6. 创建索引以加速价格查询
CREATE INDEX IF NOT EXISTS idx_product_skus_selling_price
ON public.product_skus(product_id, selling_price)
WHERE selling_price IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_product_skus_selling_price_usd
ON public.product_skus(product_id, selling_price_usd)
WHERE selling_price_usd IS NOT NULL;

-- 7. 创建函数：自动更新产品的价格区间（基于销售价）
CREATE OR REPLACE FUNCTION update_product_selling_price_range()
RETURNS TRIGGER AS $$
BEGIN
  -- 更新产品的最低和最高销售价（USD用于国际站）
  UPDATE public.products
  SET
    price_min = (
      SELECT MIN(selling_price)
      FROM public.product_skus
      WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
      AND is_active = true
      AND selling_price IS NOT NULL
    ),
    price_max = (
      SELECT MAX(selling_price)
      FROM public.product_skus
      WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
      AND is_active = true
      AND selling_price IS NOT NULL
    )
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 8. 创建触发器
DROP TRIGGER IF EXISTS trg_update_product_selling_price_range ON public.product_skus;
CREATE TRIGGER trg_update_product_selling_price_range
AFTER INSERT OR UPDATE OF selling_price, is_active ON public.product_skus
FOR EACH ROW
EXECUTE FUNCTION update_product_selling_price_range();

-- 9. 为 product_site_views 添加价格来源字段
ALTER TABLE public.product_site_views
ADD COLUMN IF NOT EXISTS price_source TEXT DEFAULT 'sku'
CHECK (price_source IN ('sku', 'manual'));

COMMENT ON COLUMN public.product_site_views.price_source IS '价格来源：sku=从SKU读取，manual=手动设置display_price';