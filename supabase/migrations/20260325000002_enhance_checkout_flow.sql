-- =====================================================
-- VetSphere B2B Checkout Flow Enhancement
-- Created: 2026-03-25
-- =====================================================

-- 1. 订单表增强 - 添加B2B字段
ALTER TABLE orders ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS po_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_method VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_fee DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_code VARCHAR(50);

-- 2. 价格阶梯表 - 批量采购折扣
CREATE TABLE IF NOT EXISTS product_price_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_id UUID REFERENCES product_skus(id) ON DELETE CASCADE,
  min_quantity INTEGER NOT NULL,
  max_quantity INTEGER,
  price_usd DECIMAL(10, 2) NOT NULL,
  price_cny DECIMAL(10, 2),
  price_jpy DECIMAL(10, 2),
  price_thb DECIMAL(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_min_quantity CHECK (min_quantity > 0),
  CONSTRAINT chk_max_quantity CHECK (max_quantity IS NULL OR max_quantity >= min_quantity)
);

-- 3. 支付记录表
CREATE TABLE IF NOT EXISTS payment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  payment_method VARCHAR(50) NOT NULL,
  payment_intent_id VARCHAR(255),
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USD',
  status VARCHAR(50) DEFAULT 'pending',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 银行转账配置表
CREATE TABLE IF NOT EXISTS bank_transfer_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_code VARCHAR(20) DEFAULT 'intl',
  bank_name VARCHAR(255) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  account_number VARCHAR(100) NOT NULL,
  swift_code VARCHAR(50),
  iban VARCHAR(100),
  instructions TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 购物车同步表（如果不存在）
CREATE TABLE IF NOT EXISTS shopping_cart (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  site_code VARCHAR(20) DEFAULT 'intl',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, site_code)
);

CREATE TABLE IF NOT EXISTS shopping_cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID REFERENCES shopping_cart(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
  sku_id UUID REFERENCES product_skus(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2),
  currency VARCHAR(10) DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_cart_quantity CHECK (quantity > 0)
);

-- 6. 索引优化
CREATE INDEX IF NOT EXISTS idx_price_tiers_sku ON product_price_tiers(sku_id);
CREATE INDEX IF NOT EXISTS idx_price_tiers_qty ON product_price_tiers(min_quantity, max_quantity);
CREATE INDEX IF NOT EXISTS idx_payment_records_order ON payment_records(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_status ON payment_records(status);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_cart_user ON shopping_cart(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON shopping_cart_items(cart_id);

-- 7. 触发器：自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_price_tiers_updated_at ON product_price_tiers;
CREATE TRIGGER update_price_tiers_updated_at
  BEFORE UPDATE ON product_price_tiers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payment_records_updated_at ON payment_records;
CREATE TRIGGER update_payment_records_updated_at
  BEFORE UPDATE ON payment_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_shopping_cart_updated_at ON shopping_cart;
CREATE TRIGGER update_shopping_cart_updated_at
  BEFORE UPDATE ON shopping_cart
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cart_items_updated_at ON shopping_cart_items;
CREATE TRIGGER update_cart_items_updated_at
  BEFORE UPDATE ON shopping_cart_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. 默认银行转账配置（示例）
INSERT INTO bank_transfer_configs (bank_name, account_name, account_number, swift_code, instructions, site_code)
VALUES 
  ('Bank of China', 'VetSphere Technology Co., Ltd.', '1234567890', 'BKCHCNBJ', 'Please include your order number in the transfer reference.', 'intl'),
  ('中国银行', '连川科技有限公司', '9876543210', 'BKCHCNBJ', '请在转账备注中填写订单号', 'cn')
ON CONFLICT DO NOTHING;

-- 9. 评论
COMMENT ON TABLE product_price_tiers IS 'SKU级别的批量价格阶梯，用于B2B批量折扣';
COMMENT ON TABLE payment_records IS '支付记录表，记录所有支付尝试和结果';
COMMENT ON TABLE bank_transfer_configs IS '银行转账配置，按站点存储银行账户信息';
COMMENT ON COLUMN orders.company_name IS 'B2B客户公司名称';
COMMENT ON COLUMN orders.po_number IS 'B2B客户采购订单号';
COMMENT ON COLUMN orders.tax_id IS 'B2B客户税号/VAT号';