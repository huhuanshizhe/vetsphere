-- Migration: Create E-commerce Core Tables
-- Description: Create shopping_cart, shopping_cart_items, and addresses tables for the e-commerce platform
-- Date: 2026-03-16

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. Shopping Cart Tables
-- ============================================================================

-- Shopping cart table
CREATE TABLE IF NOT EXISTS shopping_cart (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  site_code TEXT NOT NULL DEFAULT 'intl',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_site_cart UNIQUE(user_id, site_code)
);

-- Shopping cart items table
CREATE TABLE IF NOT EXISTS shopping_cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID REFERENCES shopping_cart(id) ON DELETE CASCADE NOT NULL,
  product_id TEXT REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  sku_id UUID REFERENCES product_skus(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. Addresses Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  company TEXT,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  country TEXT NOT NULL,
  state TEXT,
  city TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  postal_code TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. Indexes for Performance
-- ============================================================================

-- Product indexes
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_site_published ON product_site_views(site_code, publish_status);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_is_featured ON products(is_featured);
-- Note: is_new field will be added in enhancement migration (20260316000002)

-- SKU indexes
CREATE INDEX IF NOT EXISTS idx_product_skus_product ON product_skus(product_id);
CREATE INDEX IF NOT EXISTS idx_product_skus_sku_code ON product_skus(sku_code);

-- Order indexes
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_supplier ON orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- Inquiry indexes
-- Note: inquiries table uses customer_name, customer_email instead of user_id
CREATE INDEX IF NOT EXISTS idx_inquiries_product ON inquiries(product_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON inquiries(created_at DESC);

-- Shopping cart indexes
CREATE INDEX IF NOT EXISTS idx_shopping_cart_user ON shopping_cart(user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_cart_items_cart ON shopping_cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_shopping_cart_items_product ON shopping_cart_items(product_id);

-- Address indexes
CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_is_default ON addresses(user_id, is_default);

-- ============================================================================
-- 4. Triggers for Updated At
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to shopping_cart
DROP TRIGGER IF EXISTS update_shopping_cart_updated_at ON shopping_cart;
CREATE TRIGGER update_shopping_cart_updated_at
  BEFORE UPDATE ON shopping_cart
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to shopping_cart_items
DROP TRIGGER IF EXISTS update_shopping_cart_items_updated_at ON shopping_cart_items;
CREATE TRIGGER update_shopping_cart_items_updated_at
  BEFORE UPDATE ON shopping_cart_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to addresses
DROP TRIGGER IF EXISTS update_addresses_updated_at ON addresses;
CREATE TRIGGER update_addresses_updated_at
  BEFORE UPDATE ON addresses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on shopping_cart
ALTER TABLE shopping_cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

-- Shopping cart policies
DROP POLICY IF EXISTS "Users can view own cart" ON shopping_cart;
CREATE POLICY "Users can view own cart"
  ON shopping_cart FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own cart" ON shopping_cart;
CREATE POLICY "Users can insert own cart"
  ON shopping_cart FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own cart" ON shopping_cart;
CREATE POLICY "Users can update own cart"
  ON shopping_cart FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own cart" ON shopping_cart;
CREATE POLICY "Users can delete own cart"
  ON shopping_cart FOR DELETE
  USING (auth.uid() = user_id);

-- Shopping cart items policies (through cart ownership)
DROP POLICY IF EXISTS "Users can view cart items" ON shopping_cart_items;
CREATE POLICY "Users can view cart items"
  ON shopping_cart_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shopping_cart
      WHERE shopping_cart.id = shopping_cart_items.cart_id
      AND shopping_cart.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert cart items" ON shopping_cart_items;
CREATE POLICY "Users can insert cart items"
  ON shopping_cart_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shopping_cart
      WHERE shopping_cart.id = shopping_cart_items.cart_id
      AND shopping_cart.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update cart items" ON shopping_cart_items;
CREATE POLICY "Users can update cart items"
  ON shopping_cart_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM shopping_cart
      WHERE shopping_cart.id = shopping_cart_items.cart_id
      AND shopping_cart.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete cart items" ON shopping_cart_items;
CREATE POLICY "Users can delete cart items"
  ON shopping_cart_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM shopping_cart
      WHERE shopping_cart.id = shopping_cart_items.cart_id
      AND shopping_cart.user_id = auth.uid()
    )
  );

-- Addresses policies
DROP POLICY IF EXISTS "Users can view own addresses" ON addresses;
CREATE POLICY "Users can view own addresses"
  ON addresses FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own addresses" ON addresses;
CREATE POLICY "Users can insert own addresses"
  ON addresses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own addresses" ON addresses;
CREATE POLICY "Users can update own addresses"
  ON addresses FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own addresses" ON addresses;
CREATE POLICY "Users can delete own addresses"
  ON addresses FOR DELETE
  USING (auth.uid() = user_id);

-- Admin can access all shopping carts and addresses
DROP POLICY IF EXISTS "Admin can view all carts" ON shopping_cart;
CREATE POLICY "Admin can view all carts"
  ON shopping_cart FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admin can view all cart items" ON shopping_cart_items;
CREATE POLICY "Admin can view all cart items"
  ON shopping_cart_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admin can view all addresses" ON addresses;
CREATE POLICY "Admin can view all addresses"
  ON addresses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- ============================================================================
-- 6. Comments for Documentation
-- ============================================================================

COMMENT ON TABLE shopping_cart IS 'Shopping cart for e-commerce platform, one cart per user per site';
COMMENT ON TABLE shopping_cart_items IS 'Items in shopping cart with product and optional SKU references';
COMMENT ON TABLE addresses IS 'User shipping addresses for order delivery';

COMMENT ON COLUMN shopping_cart.site_code IS 'Site code (cn/intl/global) for multi-site support';
COMMENT ON COLUMN shopping_cart_items.sku_id IS 'Optional SKU ID, NULL for products without variants';
COMMENT ON COLUMN addresses.is_default IS 'Flag to mark default shipping address for user';

-- ============================================================================
-- Migration Complete
-- ============================================================================
