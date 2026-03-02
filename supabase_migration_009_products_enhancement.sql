-- ============================================================
-- Migration 009: Products Enhancement
-- 商品管理增强：状态审核、库存数量、长描述、自动扣减
-- ============================================================

-- 1. 新增字段
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'Draft',
  ADD COLUMN IF NOT EXISTS stock_quantity integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 确保 long_description 列存在（部分环境可能已有）
DO $$ BEGIN
  ALTER TABLE public.products ADD COLUMN long_description text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 2. 数据迁移：现有商品设为已发布，库存默认 100
UPDATE public.products SET status = 'Published' WHERE status IS NULL OR status = 'Draft';
UPDATE public.products SET stock_quantity = 100 WHERE stock_quantity = 0 OR stock_quantity IS NULL;

-- 3. 索引优化
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON public.products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_products_low_stock ON public.products(stock_quantity) WHERE stock_quantity < 10;

-- 4. RLS 策略更新
-- 删除旧策略
DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can view products" ON public.products;
  DROP POLICY IF EXISTS "Anyone can view published products" ON public.products;
  DROP POLICY IF EXISTS "Suppliers view own products" ON public.products;
  DROP POLICY IF EXISTS "Admin view all products" ON public.products;
  DROP POLICY IF EXISTS "Suppliers can insert own products" ON public.products;
  DROP POLICY IF EXISTS "Suppliers can update own products" ON public.products;
  DROP POLICY IF EXISTS "Suppliers can delete own products" ON public.products;
END $$;

-- 公众只能查看已发布商品
CREATE POLICY "Anyone can view published products" ON public.products
  FOR SELECT USING (status = 'Published');

-- 供应商可查看自己所有商品（含草稿/待审核/已拒绝）
CREATE POLICY "Suppliers view own products" ON public.products
  FOR SELECT USING (auth.uid() = supplier_id);

-- Admin 可查看所有商品
CREATE POLICY "Admin view all products" ON public.products
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin')
  );

-- 供应商可插入自己的商品
CREATE POLICY "Suppliers can insert own products" ON public.products
  FOR INSERT WITH CHECK (auth.uid() = supplier_id);

-- 供应商可更新自己的商品
CREATE POLICY "Suppliers can update own products" ON public.products
  FOR UPDATE USING (auth.uid() = supplier_id);

-- Admin 可更新所有商品（用于审核）
CREATE POLICY "Admin can update all products" ON public.products
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin')
  );

-- 供应商可删除自己的商品
CREATE POLICY "Suppliers can delete own products" ON public.products
  FOR DELETE USING (auth.uid() = supplier_id);

-- 5. 自动更新 updated_at 触发器
CREATE OR REPLACE FUNCTION update_product_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_product_timestamp ON public.products;
CREATE TRIGGER trigger_update_product_timestamp
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION update_product_timestamp();

-- 6. 库存自动扣减触发器（订单支付后扣减商品库存）
CREATE OR REPLACE FUNCTION decrement_product_stock()
RETURNS TRIGGER AS $$
DECLARE
  item JSONB;
  product_id TEXT;
  qty INTEGER;
BEGIN
  -- 仅在订单状态变为 Paid 时触发
  IF NEW.status = 'Paid' AND (OLD.status IS NULL OR OLD.status != 'Paid') THEN
    FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
    LOOP
      IF (item->>'type')::text = 'product' THEN
        product_id := (item->>'id')::text;
        qty := COALESCE((item->>'quantity')::integer, 1);
        UPDATE public.products
        SET stock_quantity = GREATEST(stock_quantity - qty, 0)
        WHERE id = product_id;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_decrement_stock ON public.orders;
CREATE TRIGGER trigger_decrement_stock
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION decrement_product_stock();

-- ============================================================
-- 完成！验证: SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'products';
-- ============================================================
