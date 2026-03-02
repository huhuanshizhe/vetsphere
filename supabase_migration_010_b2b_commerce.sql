-- Migration 010: B2B Commerce Platform
-- Adds purchase modes, clinical categories, course-product relations, and inquiry system

-- ============================================
-- 1. EXTEND PRODUCTS TABLE
-- ============================================

-- Purchase mode: direct (normal cart), inquiry (quote only), hybrid (both)
ALTER TABLE products ADD COLUMN IF NOT EXISTS purchase_mode TEXT DEFAULT 'direct';

-- Add check constraint for purchase_mode
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_purchase_mode_check'
  ) THEN
    ALTER TABLE products ADD CONSTRAINT products_purchase_mode_check 
      CHECK (purchase_mode IN ('direct', 'inquiry', 'hybrid'));
  END IF;
END $$;

-- Clinical workflow category (replaces generic product groups for INTL)
ALTER TABLE products ADD COLUMN IF NOT EXISTS clinical_category TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sub_category TEXT;

-- Product detail enhancements
ALTER TABLE products ADD COLUMN IF NOT EXISTS clinical_use_case TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS certifications JSONB;
ALTER TABLE products ADD COLUMN IF NOT EXISTS instructor_recommendation TEXT;

-- SEO slug for category URL
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_slug TEXT;

-- Indexes for new columns
CREATE INDEX IF NOT EXISTS idx_products_clinical_category ON products(clinical_category);
CREATE INDEX IF NOT EXISTS idx_products_purchase_mode ON products(purchase_mode);
CREATE INDEX IF NOT EXISTS idx_products_category_slug ON products(category_slug);

-- ============================================
-- 2. PRODUCT CATEGORIES TABLE (Hierarchical)
-- ============================================

CREATE TABLE IF NOT EXISTS product_categories (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  parent_id TEXT REFERENCES product_categories(id) ON DELETE SET NULL,
  
  -- Multi-language names
  name_en TEXT NOT NULL,
  name_th TEXT,
  name_ja TEXT,
  
  -- Multi-language descriptions
  description_en TEXT,
  description_th TEXT,
  description_ja TEXT,
  
  -- Display settings
  icon TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  
  -- SEO metadata
  meta_title_en TEXT,
  meta_title_th TEXT,
  meta_title_ja TEXT,
  meta_description_en TEXT,
  meta_description_th TEXT,
  meta_description_ja TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_categories_slug ON product_categories(slug);
CREATE INDEX IF NOT EXISTS idx_product_categories_parent ON product_categories(parent_id);

-- RLS for product_categories
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active categories" ON product_categories;
CREATE POLICY "Anyone can view active categories" ON product_categories
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage categories" ON product_categories;
CREATE POLICY "Admins can manage categories" ON product_categories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin')
  );

-- Seed data for main categories
INSERT INTO product_categories (id, slug, name_en, name_th, name_ja, description_en, icon, display_order, is_active)
VALUES 
  ('cat-imaging', 'imaging-diagnostics', 'Imaging & Diagnostics', 'การถ่ายภาพและการวินิจฉัย', '画像診断', 'Diagnostic imaging equipment including ultrasound, X-ray, and endoscopy systems for veterinary practices.', '🔬', 1, true),
  ('cat-surgery', 'surgery-anesthesia', 'Surgery & Anesthesia', 'ศัลยกรรมและการดมยา', '手術・麻酔', 'Surgical instruments, anesthesia machines, and monitoring equipment for veterinary surgeries.', '⚕️', 2, true),
  ('cat-lab', 'in-house-lab', 'In-House Laboratory', 'ห้องปฏิบัติการในคลินิก', '院内検査室', 'Laboratory analyzers and diagnostic equipment for in-clinic testing and rapid results.', '🧪', 3, true),
  ('cat-supplies', 'daily-supplies', 'Daily Clinical Supplies', 'เวชภัณฑ์ประจำวัน', '日常臨床用品', 'Essential consumables and supplies for daily veterinary clinical operations.', '📦', 4, true),
  ('cat-course', 'course-equipment', 'Course-Recommended Equipment', 'อุปกรณ์แนะนำจากหลักสูตร', 'コース推奨機器', 'Equipment recommended and used in VetSphere training programs and courses.', '🎓', 5, true)
ON CONFLICT (id) DO UPDATE SET
  name_en = EXCLUDED.name_en,
  name_th = EXCLUDED.name_th,
  name_ja = EXCLUDED.name_ja,
  description_en = EXCLUDED.description_en,
  icon = EXCLUDED.icon,
  display_order = EXCLUDED.display_order;

-- ============================================
-- 3. COURSE-PRODUCT RELATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS course_product_relations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  -- Relationship type
  relationship_type TEXT DEFAULT 'recommended',
  
  -- Multi-language instructor notes
  instructor_note_en TEXT,
  instructor_note_th TEXT,
  instructor_note_ja TEXT,
  
  -- Display order within course
  display_order INTEGER DEFAULT 0,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  UNIQUE(course_id, product_id)
);

-- Add check constraint for relationship_type
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cpr_relationship_type_check'
  ) THEN
    ALTER TABLE course_product_relations ADD CONSTRAINT cpr_relationship_type_check 
      CHECK (relationship_type IN ('required', 'recommended', 'mentioned'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cpr_course ON course_product_relations(course_id);
CREATE INDEX IF NOT EXISTS idx_cpr_product ON course_product_relations(product_id);

-- RLS for course_product_relations
ALTER TABLE course_product_relations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view course product relations" ON course_product_relations;
CREATE POLICY "Anyone can view course product relations" ON course_product_relations
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage course product relations" ON course_product_relations;
CREATE POLICY "Admins can manage course product relations" ON course_product_relations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin')
  );

DROP POLICY IF EXISTS "Course providers can manage their course relations" ON course_product_relations;
CREATE POLICY "Course providers can manage their course relations" ON course_product_relations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM courses c 
      WHERE c.id = course_product_relations.course_id 
      AND c.provider_id = auth.uid()
    )
  );

-- ============================================
-- 4. INQUIRY REQUESTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS inquiry_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Product reference
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  -- Optional user reference (for logged-in users)
  user_id UUID REFERENCES auth.users(id),
  
  -- Customer information
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  company_name TEXT,
  
  -- Inquiry details
  message TEXT NOT NULL,
  quantity INTEGER,
  
  -- Status tracking
  status TEXT DEFAULT 'pending',
  admin_notes TEXT,
  
  -- Tracking fields
  ip_address TEXT,
  user_agent TEXT,
  source TEXT DEFAULT 'product_page',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  replied_at TIMESTAMPTZ
);

-- Add check constraint for status
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inquiry_status_check'
  ) THEN
    ALTER TABLE inquiry_requests ADD CONSTRAINT inquiry_status_check 
      CHECK (status IN ('pending', 'replied', 'quoted', 'converted', 'archived'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_inquiry_product ON inquiry_requests(product_id);
CREATE INDEX IF NOT EXISTS idx_inquiry_status ON inquiry_requests(status);
CREATE INDEX IF NOT EXISTS idx_inquiry_email ON inquiry_requests(customer_email);
CREATE INDEX IF NOT EXISTS idx_inquiry_created ON inquiry_requests(created_at DESC);

-- RLS for inquiry_requests
ALTER TABLE inquiry_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own inquiries" ON inquiry_requests;
CREATE POLICY "Users can view their own inquiries" ON inquiry_requests
  FOR SELECT USING (
    user_id = auth.uid() OR customer_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Anyone can create inquiries" ON inquiry_requests;
CREATE POLICY "Anyone can create inquiries" ON inquiry_requests
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can manage all inquiries" ON inquiry_requests;
CREATE POLICY "Admins can manage all inquiries" ON inquiry_requests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin')
  );

DROP POLICY IF EXISTS "Suppliers can view inquiries for their products" ON inquiry_requests;
CREATE POLICY "Suppliers can view inquiries for their products" ON inquiry_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM products p 
      WHERE p.id = inquiry_requests.product_id 
      AND p.supplier_id = auth.uid()
    )
  );

-- ============================================
-- 5. HELPER FUNCTIONS
-- ============================================

-- Function to get category hierarchy
CREATE OR REPLACE FUNCTION get_category_path(category_slug TEXT)
RETURNS TABLE(id TEXT, slug TEXT, name_en TEXT, level INTEGER) AS $$
WITH RECURSIVE category_path AS (
  SELECT pc.id, pc.slug, pc.name_en, pc.parent_id, 1 as level
  FROM product_categories pc
  WHERE pc.slug = category_slug
  
  UNION ALL
  
  SELECT pc.id, pc.slug, pc.name_en, pc.parent_id, cp.level + 1
  FROM product_categories pc
  INNER JOIN category_path cp ON pc.id = cp.parent_id
)
SELECT cp.id, cp.slug, cp.name_en, cp.level
FROM category_path cp
ORDER BY cp.level DESC;
$$ LANGUAGE SQL;

-- Function to count products per category
CREATE OR REPLACE FUNCTION get_category_product_count(cat_slug TEXT)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM products
  WHERE clinical_category = cat_slug
    AND status = 'Published';
$$ LANGUAGE SQL;

-- ============================================
-- 6. UPDATE TRIGGERS
-- ============================================

-- Trigger to update updated_at on product_categories
CREATE OR REPLACE FUNCTION update_product_categories_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_product_categories_timestamp ON product_categories;
CREATE TRIGGER update_product_categories_timestamp
  BEFORE UPDATE ON product_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_product_categories_timestamp();

-- Trigger to update updated_at on inquiry_requests
CREATE OR REPLACE FUNCTION update_inquiry_requests_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_inquiry_requests_timestamp ON inquiry_requests;
CREATE TRIGGER update_inquiry_requests_timestamp
  BEFORE UPDATE ON inquiry_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_inquiry_requests_timestamp();

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Summary:
-- 1. Extended products table with purchase_mode, clinical_category, certifications, etc.
-- 2. Created product_categories table with hierarchical support and multi-language
-- 3. Created course_product_relations table for course-equipment linking
-- 4. Created inquiry_requests table for B2B quote requests
-- 5. Added RLS policies for all new tables
-- 6. Added helper functions for category operations
