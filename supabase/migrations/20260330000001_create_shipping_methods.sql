-- ============================================
-- Migration: Create Shipping Methods Table
-- Date: 2026-03-30
-- Description: Shipping methods for checkout (Standard, Express, Local Pickup)
-- ============================================

CREATE TABLE IF NOT EXISTS shipping_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  method_code TEXT NOT NULL UNIQUE,
  method_name JSONB NOT NULL DEFAULT '{}',
  method_description JSONB NOT NULL DEFAULT '{}',
  -- Fixed shipping fee (0 for free shipping like local pickup)
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  -- Currency for this method
  currency TEXT NOT NULL DEFAULT 'USD',
  -- Estimated delivery days (null for local pickup)
  estimated_days_min INTEGER,
  estimated_days_max INTEGER,
  -- Active status
  is_active BOOLEAN DEFAULT true,
  -- Display order
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shipping_methods_active ON shipping_methods(is_active);
CREATE INDEX IF NOT EXISTS idx_shipping_methods_order ON shipping_methods(display_order);

-- Update trigger
CREATE OR REPLACE FUNCTION update_shipping_methods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_shipping_methods_updated_at ON shipping_methods;
CREATE TRIGGER update_shipping_methods_updated_at
  BEFORE UPDATE ON shipping_methods
  FOR EACH ROW EXECUTE FUNCTION update_shipping_methods_updated_at();

-- Row Level Security
ALTER TABLE shipping_methods ENABLE ROW LEVEL SECURITY;

-- Public read access for active methods
DROP POLICY IF EXISTS "Anyone can view active shipping methods" ON shipping_methods;
CREATE POLICY "Anyone can view active shipping methods" ON shipping_methods
  FOR SELECT USING (is_active = true);

-- Admin full access
DROP POLICY IF EXISTS "Admins can manage shipping methods" ON shipping_methods;
CREATE POLICY "Admins can manage shipping methods" ON shipping_methods
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Insert initial data: Standard, Express, Local Pickup
INSERT INTO shipping_methods (method_code, method_name, method_description, price, currency, estimated_days_min, estimated_days_max, display_order) VALUES
(
  'standard',
  '{"en": "Standard Shipping", "th": "จัดส่งปกติ", "ja": "通常配送"}',
  '{"en": "5-10 business days", "th": "5-10 วันทำการ", "ja": "5-10営業日"}',
  15.00,
  'USD',
  5,
  10,
  1
),
(
  'express',
  '{"en": "Express Shipping", "th": "จัดส่งด่วน", "ja": "お急ぎ配送"}',
  '{"en": "2-5 business days", "th": "2-5 วันทำการ", "ja": "2-5営業日"}',
  35.00,
  'USD',
  2,
  5,
  2
),
(
  'local_pickup',
  '{"en": "Local Pickup", "th": "รับสินค้าเอง", "ja": "現地引取"}',
  '{"en": "Free - Meet in person", "th": "ฟรี - นัดรับที่สถานที่", "ja": "無料 - 直接お渡し"}',
  0.00,
  'USD',
  NULL,
  NULL,
  3
) ON CONFLICT (method_code) DO NOTHING;

-- Comments
COMMENT ON TABLE shipping_methods IS 'Shipping methods available for checkout with fixed pricing and multi-language support.';
COMMENT ON COLUMN shipping_methods.method_code IS 'Unique method identifier (standard, express, local_pickup)';
COMMENT ON COLUMN shipping_methods.price IS 'Fixed shipping fee. 0 for free shipping methods like local pickup.';