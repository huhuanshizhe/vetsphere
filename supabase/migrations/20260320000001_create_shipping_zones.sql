-- ============================================
-- Migration: Create Shipping Zones Table
-- Date: 2026-03-20
-- Description: Weight-based shipping zones for US, EU, and SEA regions
-- ============================================

CREATE TABLE IF NOT EXISTS shipping_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_code TEXT NOT NULL UNIQUE,
  zone_name JSONB NOT NULL DEFAULT '{}',
  -- Supported regions: US, EU, SEA
  region TEXT NOT NULL CHECK (region IN ('US', 'EU', 'SEA')),
  -- Countries in this zone (ISO 3166-1 alpha-2)
  countries TEXT[] NOT NULL DEFAULT '{}',
  -- Billing type: 'weight' (per kg), 'flat' (fixed rate)
  billing_type TEXT NOT NULL DEFAULT 'weight',
  -- Base shipping fee for all orders
  base_fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
  -- Currency for this zone
  currency TEXT NOT NULL DEFAULT 'USD',
  -- Fee per unit weight (when billing_type = 'weight')
  per_unit_fee DECIMAL(10, 2) DEFAULT 0,
  -- Weight unit: 'g', 'kg', 'lb'
  weight_unit TEXT DEFAULT 'kg',
  -- Free shipping threshold (0 = no free shipping)
  free_shipping_threshold DECIMAL(10, 2) DEFAULT 0,
  -- Estimated delivery days
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
CREATE INDEX IF NOT EXISTS idx_shipping_zones_region ON shipping_zones(region);
CREATE INDEX IF NOT EXISTS idx_shipping_zones_active ON shipping_zones(is_active);
CREATE INDEX IF NOT EXISTS idx_shipping_zones_order ON shipping_zones(display_order);

-- Update trigger function
CREATE OR REPLACE FUNCTION update_shipping_zones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger
DROP TRIGGER IF EXISTS update_shipping_zones_updated_at ON shipping_zones;
CREATE TRIGGER update_shipping_zones_updated_at
  BEFORE UPDATE ON shipping_zones
  FOR EACH ROW EXECUTE FUNCTION update_shipping_zones_updated_at();

-- Row Level Security
ALTER TABLE shipping_zones ENABLE ROW LEVEL SECURITY;

-- Public read access for active zones
DROP POLICY IF EXISTS "Anyone can view active shipping zones" ON shipping_zones;
CREATE POLICY "Anyone can view active shipping zones" ON shipping_zones
  FOR SELECT USING (is_active = true);

-- Admin full access
DROP POLICY IF EXISTS "Admins can manage shipping zones" ON shipping_zones;
CREATE POLICY "Admins can manage shipping zones" ON shipping_zones
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Insert initial data: US, EU, SEA zones
INSERT INTO shipping_zones (zone_code, zone_name, region, countries, billing_type, base_fee, currency, per_unit_fee, weight_unit, estimated_days_min, estimated_days_max, display_order) VALUES
(
  'US',
  '{"en": "United States", "th": "สหรัฐอเมริกา", "ja": "アメリカ合衆国"}',
  'US',
  ARRAY['US', 'CA', 'MX'],
  'weight',
  25.00,
  'USD',
  0.50,
  'kg',
  7,
  14,
  1
),
(
  'EU',
  '{"en": "Europe", "th": "ยุโรป", "ja": "ヨーロッパ"}',
  'EU',
  ARRAY['GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'CH', 'PL', 'SE', 'DK', 'NO', 'FI', 'IE', 'PT', 'CZ', 'HU', 'RO', 'BG', 'HR', 'SK', 'SI', 'LT', 'LV', 'EE', 'GR', 'LU'],
  'weight',
  35.00,
  'USD',
  0.60,
  'kg',
  10,
  21,
  2
),
(
  'SEA',
  '{"en": "Southeast Asia & Pacific", "th": "เอเชียตะวันออกเฉียงใต้และแปซิฟิก", "ja": "東南アジア・太平洋"}',
  'SEA',
  ARRAY['TH', 'SG', 'MY', 'ID', 'PH', 'VN', 'AU', 'NZ', 'HK', 'TW', 'KR', 'JP'],
  'weight',
  30.00,
  'USD',
  0.55,
  'kg',
  7,
  14,
  3
) ON CONFLICT (zone_code) DO NOTHING;

-- Comments
COMMENT ON TABLE shipping_zones IS 'Shipping zones based on region with weight-based pricing. No free shipping by default.';
COMMENT ON COLUMN shipping_zones.zone_code IS 'Unique zone identifier (US, EU, SEA)';
COMMENT ON COLUMN shipping_zones.free_shipping_threshold IS 'Minimum order amount for free shipping. Set to 0 for no free shipping option.';
