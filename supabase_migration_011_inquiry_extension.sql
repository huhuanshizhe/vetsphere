-- Migration 011: Professional Inquiry System Extension
-- Extends inquiry_requests for B2B clinical consultation workflow

-- ============================================
-- 1. EXTEND INQUIRY_REQUESTS TABLE
-- ============================================

-- Add new professional inquiry fields
ALTER TABLE inquiry_requests ADD COLUMN IF NOT EXISTS clinic_name TEXT;
ALTER TABLE inquiry_requests ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE inquiry_requests ADD COLUMN IF NOT EXISTS estimated_purchase_time TEXT;
ALTER TABLE inquiry_requests ADD COLUMN IF NOT EXISTS budget_range TEXT;

-- Sales/advisor assignment for follow-up
ALTER TABLE inquiry_requests ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id);
ALTER TABLE inquiry_requests ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;
ALTER TABLE inquiry_requests ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES auth.users(id);

-- Distributor support (future-ready)
ALTER TABLE inquiry_requests ADD COLUMN IF NOT EXISTS distributor_id UUID;
ALTER TABLE inquiry_requests ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE inquiry_requests ADD COLUMN IF NOT EXISTS lead_source TEXT DEFAULT 'website';

-- Priority and categorization
ALTER TABLE inquiry_requests ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';
ALTER TABLE inquiry_requests ADD COLUMN IF NOT EXISTS inquiry_type TEXT DEFAULT 'quote';

-- Follow-up tracking
ALTER TABLE inquiry_requests ADD COLUMN IF NOT EXISTS follow_up_date DATE;
ALTER TABLE inquiry_requests ADD COLUMN IF NOT EXISTS last_contact_date TIMESTAMPTZ;
ALTER TABLE inquiry_requests ADD COLUMN IF NOT EXISTS contact_count INTEGER DEFAULT 0;

-- Internal notes (admin only)
ALTER TABLE inquiry_requests ADD COLUMN IF NOT EXISTS internal_notes TEXT;

-- Add check constraints
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inquiry_priority_check'
  ) THEN
    ALTER TABLE inquiry_requests ADD CONSTRAINT inquiry_priority_check 
      CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inquiry_type_check'
  ) THEN
    ALTER TABLE inquiry_requests ADD CONSTRAINT inquiry_type_check 
      CHECK (inquiry_type IN ('quote', 'consultation', 'demo', 'bulk_order', 'partnership'));
  END IF;
END $$;

-- Update status constraint to include more statuses
ALTER TABLE inquiry_requests DROP CONSTRAINT IF EXISTS inquiry_status_check;
ALTER TABLE inquiry_requests ADD CONSTRAINT inquiry_status_check 
  CHECK (status IN ('new', 'pending', 'contacted', 'quoted', 'negotiating', 'converted', 'closed', 'archived'));

-- ============================================
-- 2. ADD INDEXES FOR NEW FIELDS
-- ============================================

CREATE INDEX IF NOT EXISTS idx_inquiry_country ON inquiry_requests(country);
CREATE INDEX IF NOT EXISTS idx_inquiry_assigned_to ON inquiry_requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_inquiry_priority ON inquiry_requests(priority);
CREATE INDEX IF NOT EXISTS idx_inquiry_distributor ON inquiry_requests(distributor_id);
CREATE INDEX IF NOT EXISTS idx_inquiry_region ON inquiry_requests(region);
CREATE INDEX IF NOT EXISTS idx_inquiry_follow_up ON inquiry_requests(follow_up_date);

-- ============================================
-- 3. DISTRIBUTORS TABLE (Future-ready)
-- ============================================

CREATE TABLE IF NOT EXISTS distributors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  
  -- Contact info
  email TEXT NOT NULL,
  phone TEXT,
  website TEXT,
  
  -- Location
  country TEXT NOT NULL,
  region TEXT,
  coverage_areas TEXT[], -- Array of countries/regions covered
  
  -- Business details
  company_registration TEXT,
  tax_id TEXT,
  contract_start_date DATE,
  contract_end_date DATE,
  
  -- Performance metrics
  lead_quota INTEGER,
  leads_assigned INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,2),
  
  -- Status
  status TEXT DEFAULT 'active',
  tier TEXT DEFAULT 'standard', -- standard, premium, exclusive
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'distributor_status_check'
  ) THEN
    ALTER TABLE distributors ADD CONSTRAINT distributor_status_check 
      CHECK (status IN ('pending', 'active', 'suspended', 'terminated'));
  END IF;
END $$;

-- RLS for distributors
ALTER TABLE distributors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage distributors" ON distributors;
CREATE POLICY "Admins can manage distributors" ON distributors
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin')
  );

DROP POLICY IF EXISTS "Distributors can view own profile" ON distributors;
CREATE POLICY "Distributors can view own profile" ON distributors
  FOR SELECT USING (id = auth.uid());

-- ============================================
-- 4. INQUIRY ACTIVITY LOG
-- ============================================

CREATE TABLE IF NOT EXISTS inquiry_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inquiry_id UUID NOT NULL REFERENCES inquiry_requests(id) ON DELETE CASCADE,
  
  -- Activity details
  activity_type TEXT NOT NULL, -- status_change, note_added, email_sent, call_made, assigned, etc.
  old_value TEXT,
  new_value TEXT,
  notes TEXT,
  
  -- Who performed the action
  performed_by UUID REFERENCES auth.users(id),
  performed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inquiry_activity_inquiry ON inquiry_activities(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_inquiry_activity_type ON inquiry_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_inquiry_activity_date ON inquiry_activities(performed_at DESC);

-- RLS for inquiry_activities
ALTER TABLE inquiry_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage inquiry activities" ON inquiry_activities;
CREATE POLICY "Admins can manage inquiry activities" ON inquiry_activities
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin')
  );

-- ============================================
-- 5. UPDATE TRIGGERS
-- ============================================

-- Trigger to update distributors timestamp
CREATE OR REPLACE FUNCTION update_distributors_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_distributors_timestamp ON distributors;
CREATE TRIGGER update_distributors_timestamp
  BEFORE UPDATE ON distributors
  FOR EACH ROW
  EXECUTE FUNCTION update_distributors_timestamp();

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Summary:
-- 1. Extended inquiry_requests with clinic_name, country, budget_range, etc.
-- 2. Added assignment fields for sales/advisor workflow
-- 3. Added distributor support fields for future expansion
-- 4. Created distributors table for distributor management
-- 5. Created inquiry_activities table for activity logging
-- 6. Added proper indexes and RLS policies
