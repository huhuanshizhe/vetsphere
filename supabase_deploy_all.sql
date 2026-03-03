-- ==========================================
-- VetSphere 一键部署脚本 (迁移 010-012 + 种子数据)
-- 在 Supabase SQL Editor 中直接执行
-- 所有操作使用 IF NOT EXISTS，安全重复执行
-- ==========================================

-- ============================================
-- STEP 1: Migration 010 — B2B Commerce
-- ============================================

-- 1.1 扩展 products 表
ALTER TABLE products ADD COLUMN IF NOT EXISTS purchase_mode TEXT DEFAULT 'direct';
ALTER TABLE products ADD COLUMN IF NOT EXISTS clinical_category TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sub_category TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS clinical_use_case TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS certifications JSONB;
ALTER TABLE products ADD COLUMN IF NOT EXISTS instructor_recommendation TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_slug TEXT;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_purchase_mode_check') THEN
    ALTER TABLE products ADD CONSTRAINT products_purchase_mode_check CHECK (purchase_mode IN ('direct', 'inquiry', 'hybrid'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_products_clinical_category ON products(clinical_category);
CREATE INDEX IF NOT EXISTS idx_products_purchase_mode ON products(purchase_mode);
CREATE INDEX IF NOT EXISTS idx_products_category_slug ON products(category_slug);

-- 1.2 产品分类表
CREATE TABLE IF NOT EXISTS product_categories (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  parent_id TEXT REFERENCES product_categories(id) ON DELETE SET NULL,
  name_en TEXT NOT NULL, name_th TEXT, name_ja TEXT,
  description_en TEXT, description_th TEXT, description_ja TEXT,
  icon TEXT, display_order INTEGER DEFAULT 0, is_active BOOLEAN DEFAULT true,
  meta_title_en TEXT, meta_title_th TEXT, meta_title_ja TEXT,
  meta_description_en TEXT, meta_description_th TEXT, meta_description_ja TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_product_categories_slug ON product_categories(slug);
CREATE INDEX IF NOT EXISTS idx_product_categories_parent ON product_categories(parent_id);

ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view active categories" ON product_categories;
CREATE POLICY "Anyone can view active categories" ON product_categories FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admins can manage categories" ON product_categories;
CREATE POLICY "Admins can manage categories" ON product_categories FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin')
);

INSERT INTO product_categories (id, slug, name_en, name_th, name_ja, description_en, icon, display_order, is_active)
VALUES 
  ('cat-imaging', 'imaging-diagnostics', 'Imaging & Diagnostics', 'การถ่ายภาพและการวินิจฉัย', '画像診断', 'Diagnostic imaging equipment', '🔬', 1, true),
  ('cat-surgery', 'surgery-anesthesia', 'Surgery & Anesthesia', 'ศัลยกรรมและการดมยา', '手術・麻酔', 'Surgical instruments and equipment', '⚕️', 2, true),
  ('cat-lab', 'in-house-lab', 'In-House Laboratory', 'ห้องปฏิบัติการในคลินิก', '院内検査室', 'Laboratory analyzers and diagnostics', '🧪', 3, true),
  ('cat-supplies', 'daily-supplies', 'Daily Clinical Supplies', 'เวชภัณฑ์ประจำวัน', '日常臨床用品', 'Essential clinical consumables', '📦', 4, true),
  ('cat-course', 'course-equipment', 'Course-Recommended Equipment', 'อุปกรณ์แนะนำจากหลักสูตร', 'コース推奨機器', 'Equipment from VetSphere courses', '🎓', 5, true)
ON CONFLICT (id) DO UPDATE SET name_en = EXCLUDED.name_en, name_th = EXCLUDED.name_th, name_ja = EXCLUDED.name_ja;

-- 1.3 课程-产品关系表
CREATE TABLE IF NOT EXISTS course_product_relations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  relationship_type TEXT DEFAULT 'recommended',
  instructor_note_en TEXT, instructor_note_th TEXT, instructor_note_ja TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cpr_relationship_type_check') THEN
    ALTER TABLE course_product_relations ADD CONSTRAINT cpr_relationship_type_check CHECK (relationship_type IN ('required', 'recommended', 'mentioned'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cpr_course ON course_product_relations(course_id);
CREATE INDEX IF NOT EXISTS idx_cpr_product ON course_product_relations(product_id);

ALTER TABLE course_product_relations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view course product relations" ON course_product_relations;
CREATE POLICY "Anyone can view course product relations" ON course_product_relations FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage course product relations" ON course_product_relations;
CREATE POLICY "Admins can manage course product relations" ON course_product_relations FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin')
);

-- 1.4 询盘表
CREATE TABLE IF NOT EXISTS inquiry_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  customer_name TEXT NOT NULL, customer_email TEXT NOT NULL, customer_phone TEXT, company_name TEXT,
  message TEXT NOT NULL, quantity INTEGER,
  status TEXT DEFAULT 'pending', admin_notes TEXT,
  ip_address TEXT, user_agent TEXT, source TEXT DEFAULT 'product_page',
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), replied_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_inquiry_product ON inquiry_requests(product_id);
CREATE INDEX IF NOT EXISTS idx_inquiry_status ON inquiry_requests(status);
CREATE INDEX IF NOT EXISTS idx_inquiry_email ON inquiry_requests(customer_email);
CREATE INDEX IF NOT EXISTS idx_inquiry_created ON inquiry_requests(created_at DESC);

ALTER TABLE inquiry_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can create inquiries" ON inquiry_requests;
CREATE POLICY "Anyone can create inquiries" ON inquiry_requests FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Admins can manage all inquiries" ON inquiry_requests;
CREATE POLICY "Admins can manage all inquiries" ON inquiry_requests FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin')
);

-- Helper functions
CREATE OR REPLACE FUNCTION get_category_product_count(cat_slug TEXT) RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM products WHERE clinical_category = cat_slug;
$$ LANGUAGE SQL;

-- Triggers
CREATE OR REPLACE FUNCTION update_product_categories_timestamp() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS update_product_categories_timestamp ON product_categories;
CREATE TRIGGER update_product_categories_timestamp BEFORE UPDATE ON product_categories FOR EACH ROW EXECUTE FUNCTION update_product_categories_timestamp();

CREATE OR REPLACE FUNCTION update_inquiry_requests_timestamp() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS update_inquiry_requests_timestamp ON inquiry_requests;
CREATE TRIGGER update_inquiry_requests_timestamp BEFORE UPDATE ON inquiry_requests FOR EACH ROW EXECUTE FUNCTION update_inquiry_requests_timestamp();

-- ============================================
-- STEP 2: Migration 011 — Inquiry Extension
-- ============================================

ALTER TABLE inquiry_requests ADD COLUMN IF NOT EXISTS clinic_name TEXT;
ALTER TABLE inquiry_requests ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE inquiry_requests ADD COLUMN IF NOT EXISTS estimated_purchase_time TEXT;
ALTER TABLE inquiry_requests ADD COLUMN IF NOT EXISTS budget_range TEXT;
ALTER TABLE inquiry_requests ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id);
ALTER TABLE inquiry_requests ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;
ALTER TABLE inquiry_requests ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES auth.users(id);
ALTER TABLE inquiry_requests ADD COLUMN IF NOT EXISTS distributor_id UUID;
ALTER TABLE inquiry_requests ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE inquiry_requests ADD COLUMN IF NOT EXISTS lead_source TEXT DEFAULT 'website';
ALTER TABLE inquiry_requests ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';
ALTER TABLE inquiry_requests ADD COLUMN IF NOT EXISTS inquiry_type TEXT DEFAULT 'quote';
ALTER TABLE inquiry_requests ADD COLUMN IF NOT EXISTS follow_up_date DATE;
ALTER TABLE inquiry_requests ADD COLUMN IF NOT EXISTS last_contact_date TIMESTAMPTZ;
ALTER TABLE inquiry_requests ADD COLUMN IF NOT EXISTS contact_count INTEGER DEFAULT 0;
ALTER TABLE inquiry_requests ADD COLUMN IF NOT EXISTS internal_notes TEXT;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inquiry_priority_check') THEN
    ALTER TABLE inquiry_requests ADD CONSTRAINT inquiry_priority_check CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inquiry_type_check') THEN
    ALTER TABLE inquiry_requests ADD CONSTRAINT inquiry_type_check CHECK (inquiry_type IN ('quote', 'consultation', 'demo', 'bulk_order', 'partnership'));
  END IF;
END $$;

ALTER TABLE inquiry_requests DROP CONSTRAINT IF EXISTS inquiry_status_check;
ALTER TABLE inquiry_requests ADD CONSTRAINT inquiry_status_check CHECK (status IN ('new', 'pending', 'contacted', 'quoted', 'negotiating', 'converted', 'closed', 'archived'));

CREATE INDEX IF NOT EXISTS idx_inquiry_country ON inquiry_requests(country);
CREATE INDEX IF NOT EXISTS idx_inquiry_assigned_to ON inquiry_requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_inquiry_priority ON inquiry_requests(priority);
CREATE INDEX IF NOT EXISTS idx_inquiry_follow_up ON inquiry_requests(follow_up_date);

-- Distributors table
CREATE TABLE IF NOT EXISTS distributors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT, website TEXT,
  country TEXT NOT NULL, region TEXT, coverage_areas TEXT[],
  company_registration TEXT, tax_id TEXT, contract_start_date DATE, contract_end_date DATE,
  lead_quota INTEGER, leads_assigned INTEGER DEFAULT 0, conversion_rate DECIMAL(5,2),
  status TEXT DEFAULT 'active', tier TEXT DEFAULT 'standard',
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE distributors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage distributors" ON distributors;
CREATE POLICY "Admins can manage distributors" ON distributors FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin')
);

-- Inquiry activity log
CREATE TABLE IF NOT EXISTS inquiry_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inquiry_id UUID NOT NULL REFERENCES inquiry_requests(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, old_value TEXT, new_value TEXT, notes TEXT,
  performed_by UUID REFERENCES auth.users(id), performed_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inquiry_activity_inquiry ON inquiry_activities(inquiry_id);
ALTER TABLE inquiry_activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage inquiry activities" ON inquiry_activities;
CREATE POLICY "Admins can manage inquiry activities" ON inquiry_activities FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin')
);

-- ============================================
-- STEP 3: Migration 012 — Course-Product Enhanced
-- ============================================

ALTER TABLE course_product_relations ADD COLUMN IF NOT EXISTS day_index INTEGER;
ALTER TABLE course_product_relations ADD COLUMN IF NOT EXISTS relation_type TEXT DEFAULT 'course';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cpr_relation_type_check') THEN
    ALTER TABLE course_product_relations ADD CONSTRAINT cpr_relation_type_check CHECK (relation_type IN ('course', 'module', 'instructor'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cpr_day_index ON course_product_relations(course_id, day_index) WHERE day_index IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cpr_relation_type ON course_product_relations(course_id, relation_type);

-- Drop the original UNIQUE(course_id, product_id) constraint
-- Same product can appear on different days of the same course
DO $$ BEGIN
  ALTER TABLE course_product_relations DROP CONSTRAINT IF EXISTS course_product_relations_course_id_product_id_key;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- ============================================
-- STEP 4: SEED DATA — Products (8 items)
-- ============================================

INSERT INTO products (id, name, brand, price, specialty, group_category, image_url, description, specs, stock_status, purchase_mode, clinical_category, certifications, category_slug)
VALUES
  ('p1', 'TPLO High-Torque Saw System', 'SurgiTech', 15800, 'Orthopedics', 'PowerTools',
   'https://images.unsplash.com/photo-1581093588401-fbb62a02f120?auto=format&fit=crop&w=600&q=80',
   'German-engineered oscillating saw optimized for TPLO procedures with low vibration and high torque.',
   '{"No-load Speed":"0-15000 rpm","Weight":"820g","Sterilization":"134°C Autoclave","Noise Level":"<65dB"}'::jsonb,
   'In Stock', 'hybrid', 'surgery-anesthesia',
   '[{"type":"ISO 13485","number":"DE-2024-0891","issuer":"TÜV SÜD","validUntil":"2027-12"},{"type":"CE","number":"CE-0123-SAW","issuer":"BSI","validUntil":"2027-06"}]'::jsonb,
   'surgery-anesthesia'),
  ('p2', 'Titanium Locking Plate System 2.4/2.7/3.5mm', 'VetOrtho', 1250, 'Orthopedics', 'Implants',
   'https://images.unsplash.com/photo-1583483425070-cb9ce8fc51b5?auto=format&fit=crop&w=600&q=80',
   'Medical Grade 5 Titanium locking plates designed for superior biological stability.',
   '{"Material":"Ti-6Al-4V ELI","Surface":"Anodized (Type II)","Thickness":"2.4mm - 3.8mm"}'::jsonb,
   'In Stock', 'direct', 'surgery-anesthesia',
   '[{"type":"ISO 13485","number":"CN-2024-TLP-02","issuer":"SGS","validUntil":"2027-09"}]'::jsonb,
   'surgery-anesthesia'),
  ('p3', 'Micro-Ophthalmic Forceps (Straight/Curved)', 'PrecisionEye', 1880, 'Eye Surgery', 'HandInstruments',
   'https://images.unsplash.com/photo-1579154235602-4c202ff39040?auto=format&fit=crop&w=600&q=80',
   'Swiss-crafted tips designed for delicate corneal and intraocular maneuvers.',
   '{"Length":"115mm","Tip Size":"0.1mm","Material":"Non-magnetic Stainless Steel"}'::jsonb,
   'Low Stock', 'direct', 'surgery-anesthesia',
   '[{"type":"FDA 510(k)","number":"K241234","issuer":"FDA","validUntil":"2028-03"}]'::jsonb,
   'surgery-anesthesia'),
  ('p4', 'PGA Absorbable Sutures (Braided)', 'SutureExpert', 580, 'Soft Tissue', 'Consumables',
   'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80',
   'Box of 12. Excellent knot security and minimal tissue reaction.',
   '{"Sizes":"2-0 / 3-0 / 4-0","Length":"75cm","Needle":"Reverse Cutting 3/8"}'::jsonb,
   'In Stock', 'direct', 'daily-supplies', NULL, 'daily-supplies'),
  ('p5', 'VetSono Pro Portable Ultrasound', 'VetSono', 28500, 'Ultrasound', 'PowerTools',
   'https://images.unsplash.com/photo-1516733725897-1aa73b87c8e8?auto=format&fit=crop&w=600&q=80',
   'Compact portable ultrasound with 12MHz linear and 5MHz convex probes.',
   '{"Probes":"12MHz Linear + 5MHz Convex","Display":"15.6 HD LED","Weight":"5.2kg","Battery":"3h continuous"}'::jsonb,
   'In Stock', 'inquiry', 'imaging-diagnostics',
   '[{"type":"ISO 13485","number":"JP-2024-USP-05","issuer":"JQA","validUntil":"2028-01"},{"type":"CE","number":"CE-0197-USP","issuer":"TÜV Rheinland"}]'::jsonb,
   'imaging-diagnostics'),
  ('p6', 'Multi-Frequency Ultrasound Probe Set (3/7/12MHz)', 'VetSono', 8900, 'Ultrasound', 'PowerTools',
   'https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&w=600&q=80',
   'Professional probe set covering abdominal, cardiac, and musculoskeletal imaging.',
   '{"Frequencies":"3 / 7 / 12 MHz","Cable Length":"2.1m","Connector":"Universal USB-C"}'::jsonb,
   'In Stock', 'direct', 'imaging-diagnostics', NULL, 'imaging-diagnostics'),
  ('p7', 'Phacoemulsification System VetPhaco-3000', 'PrecisionEye', 45000, 'Eye Surgery', 'PowerTools',
   'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=600&q=80',
   'Complete phacoemulsification unit with integrated vitrectomy function.',
   '{"Phaco Frequency":"40kHz","Vacuum":"0-650mmHg","Aspiration":"0-65cc/min","Display":"10.1 Touchscreen"}'::jsonb,
   'In Stock', 'inquiry', 'surgery-anesthesia',
   '[{"type":"FDA 510(k)","number":"K240567","issuer":"FDA","validUntil":"2028-06"},{"type":"ISO 13485","number":"US-2024-PHC-07","issuer":"NSF International"}]'::jsonb,
   'surgery-anesthesia'),
  ('p8', 'Arthroscopy Tower System VetScope-HD', 'SurgiTech', 38000, 'Orthopedics', 'PowerTools',
   'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=600&q=80',
   'Full HD arthroscopy system with 2.7mm and 4.0mm scopes, LED light source, and fluid management pump.',
   '{"Resolution":"1920x1080 Full HD","Scope Diameter":"2.7mm / 4.0mm","Light Source":"LED 50W","Recording":"4K/1080p USB"}'::jsonb,
   'In Stock', 'hybrid', 'surgery-anesthesia',
   '[{"type":"ISO 13485","number":"DE-2024-ART-08","issuer":"TÜV SÜD","validUntil":"2027-11"},{"type":"CE","number":"CE-0123-ART","issuer":"BSI"}]'::jsonb,
   'surgery-anesthesia')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, brand = EXCLUDED.brand, price = EXCLUDED.price,
  specialty = EXCLUDED.specialty, group_category = EXCLUDED.group_category,
  image_url = EXCLUDED.image_url, description = EXCLUDED.description,
  specs = EXCLUDED.specs, stock_status = EXCLUDED.stock_status,
  purchase_mode = EXCLUDED.purchase_mode, clinical_category = EXCLUDED.clinical_category,
  certifications = EXCLUDED.certifications, category_slug = EXCLUDED.category_slug;

-- ============================================
-- STEP 5: SEED DATA — Courses (4 items)
-- ============================================

INSERT INTO courses (id, title, description, specialty, level, price, currency, start_date, end_date, location, instructor, image_url, status, max_enrollment, current_enrollment, enrollment_deadline, target_audience, target_audience_zh, total_hours, agenda)
VALUES
  ('csavs-ultra-basic-2026',
   'CSAVS Veterinary Ultrasound - Basic',
   'Systematic training on abdominal ultrasound physics, artifact recognition, and standard organ scanning protocols.',
   'Ultrasound', 'Basic', 9800, 'CNY', '2026-03-30', '2026-04-03',
   '{"city":"Maanshan, China","venue":"CSAVS Practical Training Center","address":"Next to Maanshan East Railway Station"}'::jsonb,
   '{"name":"Femke Bosma","title":"DVM, DECVDI","credentials":["European Specialist in Veterinary Diagnostic Imaging"],"imageUrl":"https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=400&h=400&q=80","bio":"Dr. Femke Bosma graduated from Utrecht University in 2016."}'::jsonb,
   'https://images.unsplash.com/photo-1516733725897-1aa73b87c8e8?auto=format&fit=crop&w=800&q=80',
   'Published', 12, 0, '2026-03-15', 'Small Animal Veterinarians', '小动物临床兽医', 40,
   '[{"day":"Day 1","date":"March 30","items":[{"time":"09:00-12:00","activity":"Basic Ultrasound Physics"},{"time":"13:00-17:00","activity":"Artifacts & Probe handling. Practical Session."}]},{"day":"Day 2","date":"March 31","items":[{"time":"09:00-12:00","activity":"Liver & Biliary System"},{"time":"13:00-17:00","activity":"Pancreas & Spleen. Practical."}]},{"day":"Day 3","date":"April 1","items":[{"time":"09:00-12:00","activity":"Urogenital System & Adrenal Glands"},{"time":"13:00-17:00","activity":"Retroperitoneal Space. Practical."}]},{"day":"Day 4","date":"April 2","items":[{"time":"09:00-12:00","activity":"Gastrointestinal Tract"},{"time":"13:00-17:00","activity":"Abdominal Lymph Nodes. Practical."}]},{"day":"Day 5","date":"April 3","items":[{"time":"09:00-12:00","activity":"Abdominal Vasculature & Doppler"},{"time":"13:00-17:00","activity":"Ultrasound-guided Interventions. Practical."}]}]'::jsonb),

  ('csavs-soft-2026',
   'CSAVS Practical Soft Tissue Surgery',
   'Intensive hands-on workshop covering Liver Lobectomy, Thoracic Surgery, and Reconstructive Skin Flaps.',
   'Soft Tissue', 'Advanced', 4800, 'CNY', '2026-03-18', '2026-03-20',
   '{"city":"Nanjing, China","venue":"Nanjing Agricultural Univ. Teaching Hospital","address":"4th Floor Practical Center"}'::jsonb,
   '{"name":"Joachim Proot","title":"DVM, CertSAS, DECVS","credentials":["European Specialist in Small Animal Surgery"],"imageUrl":"https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&h=400&q=80","bio":"15 years of specialized surgical experience in referral tertiary care centers."}'::jsonb,
   'https://images.unsplash.com/photo-1551601651-2a8555f1a136?auto=format&fit=crop&w=800&q=80',
   'Published', 16, 0, '2026-03-01', 'Small Animal Surgeons', '小动物外科兽医', 24,
   '[{"day":"Day 1","date":"March 18","items":[{"time":"14:30-16:00","activity":"Liver lobectomy & Diaphragmotomy"},{"time":"16:30-18:00","activity":"Cholecystoduodenostomy & Cholecystectomy"}]},{"day":"Day 2","date":"March 19","items":[{"time":"08:30-12:00","activity":"Thoracotomy, Lung lobectomy, Pericardectomy"},{"time":"13:00-17:30","activity":"TECA & Ventral bulla osteotomy"}]},{"day":"Day 3","date":"March 20","items":[{"time":"08:30-12:00","activity":"Axial pattern flaps & Skin grafts"},{"time":"13:00-17:30","activity":"Practical: Reconstructive techniques"}]}]'::jsonb),

  ('csavs-eye-2026',
   'European Veterinary Ophthalmology Certification VOSC-China',
   'Advanced Corneal Suturing, Reconstruction, and Phacoemulsification techniques.',
   'Eye Surgery', 'Master', 15000, 'CNY', '2026-01-03', '2026-01-05',
   '{"city":"Shanghai, China","venue":"I-VET Ophthalmology Training Center","address":"738 Shangcheng Road, Pudong"}'::jsonb,
   '{"name":"Rick F. Sanchez","title":"DVM, DECVO, CertVetEd","credentials":["European Specialist in Veterinary Ophthalmology"],"imageUrl":"https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=400&h=400&q=80","bio":"Pioneering veterinarian in suture burying techniques for corneal surgery."}'::jsonb,
   'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80',
   'Published', 10, 0, '2025-12-15', 'Veterinary Ophthalmologists', '兽医眼科医生', 32,
   '[{"day":"Day 1","date":"Jan 3","items":[{"time":"09:00-11:40","activity":"Corneal suture patterns & buried knots"},{"time":"12:40-17:00","activity":"Practical: Advanced Corneal Suturing"}]},{"day":"Day 2","date":"Jan 4","items":[{"time":"09:00-12:10","activity":"Keratectomy, grafting, CLCTS, Biomaterials"},{"time":"13:10-17:00","activity":"Practical: Advanced Corneal Reconstruction"}]},{"day":"Day 3","date":"Jan 5","items":[{"time":"09:00-15:30","activity":"Phacoemulsification: capsulorrhexis, CTR, IOL implant"},{"time":"16:30-17:00","activity":"Practical: Phacoemulsification techniques"}]}]'::jsonb),

  ('csavs-joint-2026',
   'CSAVS Practical Joint Surgery Workshop',
   'Mastering joint surgery: Bandaging, reduction of luxations, arthrotomy principles, and basic arthroscopy.',
   'Orthopedics', 'Advanced', 4800, 'CNY', '2026-03-18', '2026-03-20',
   '{"city":"Maanshan, China","venue":"CSAVS Training Center","address":"Maanshan, Anhui Province"}'::jsonb,
   '{"name":"Antonio Pozzi","title":"DVM, DECVS, DACVS, DACVSMR","credentials":["Director of Small Animal Surgery at University of Zurich"],"imageUrl":"https://images.unsplash.com/photo-1531891437567-317ff7fd9008?auto=format&fit=crop&w=400&h=400&q=80","bio":"World-renowned specialist in neurosurgery, orthopedics, and sports medicine."}'::jsonb,
   'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80',
   'Published', 20, 0, '2026-03-01', 'Small Animal Veterinarians', '小动物临床兽医', 40,
   '[{"day":"Day 1","date":"March 18","items":[{"time":"14:30-16:00","activity":"Bandaging for joint diseases (Lecture)"},{"time":"16:30-18:00","activity":"Arthrotomy principles (Lecture)"}]},{"day":"Day 2","date":"March 19","items":[{"time":"08:30-12:00","activity":"Orthopedic examination & Closed reduction (Practical)"},{"time":"13:00-17:30","activity":"Basic Arthroscopy introduction (Practical)"}]},{"day":"Day 3","date":"March 20","items":[{"time":"08:30-12:00","activity":"Stifle arthrotomy (Practical)"},{"time":"13:00-17:30","activity":"Advanced Arthroscopy (Practical)"}]}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description, specialty = EXCLUDED.specialty,
  level = EXCLUDED.level, price = EXCLUDED.price, currency = EXCLUDED.currency,
  start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date,
  location = EXCLUDED.location, instructor = EXCLUDED.instructor,
  image_url = EXCLUDED.image_url, status = EXCLUDED.status,
  max_enrollment = EXCLUDED.max_enrollment, enrollment_deadline = EXCLUDED.enrollment_deadline,
  target_audience = EXCLUDED.target_audience, target_audience_zh = EXCLUDED.target_audience_zh,
  total_hours = EXCLUDED.total_hours, agenda = EXCLUDED.agenda;

-- ============================================
-- STEP 6: SEED DATA — Course-Product Relations (23 items)
-- ============================================

DELETE FROM course_product_relations WHERE course_id IN ('csavs-ultra-basic-2026','csavs-soft-2026','csavs-eye-2026','csavs-joint-2026');

-- Ultrasound Basic
INSERT INTO course_product_relations (course_id, product_id, relationship_type, relation_type, day_index, display_order, instructor_note_en, instructor_note_th, instructor_note_ja) VALUES
  ('csavs-ultra-basic-2026','p5','required','course',NULL,1,'Primary ultrasound unit used throughout the course','เครื่องอัลตราซาวด์หลักที่ใช้ตลอดหลักสูตร','コース全体で使用するメイン超音波ユニット'),
  ('csavs-ultra-basic-2026','p6','required','module',1,2,'Multi-frequency probes for physics exercises','โพรบหลายความถี่สำหรับฝึกฟิสิกส์','物理学演習用マルチ周波数プローブ'),
  ('csavs-ultra-basic-2026','p6','required','module',3,3,'High-frequency probe for kidney imaging','โพรบความถี่สูงสำหรับภาพไต','腎臓イメージング用高周波プローブ'),
  ('csavs-ultra-basic-2026','p6','required','module',5,4,'Doppler-capable probes for vascular assessment','โพรบ Doppler สำหรับประเมินหลอดเลือด','血管評価用ドップラープローブ'),
  ('csavs-ultra-basic-2026','p4','recommended','module',5,5,'Sutures for ultrasound-guided FNA practice','ไหมเย็บสำหรับฝึก FNA','超音波ガイド下FNA練習用縫合糸'),
  ('csavs-ultra-basic-2026','p1','mentioned','instructor',NULL,6,'Dr. Bosma recommends for clinics expanding to surgery','Dr. Bosma แนะนำสำหรับคลินิกที่ขยายศัลยกรรม','Bosma先生が手術拡大クリニックに推奨');

-- Soft Tissue
INSERT INTO course_product_relations (course_id, product_id, relationship_type, relation_type, day_index, display_order, instructor_note_en, instructor_note_th, instructor_note_ja) VALUES
  ('csavs-soft-2026','p4','required','course',NULL,1,'Essential sutures for all soft tissue procedures','ไหมเย็บที่จำเป็นสำหรับหัตถการเนื้อเยื่ออ่อน','軟部組織手技に必須の縫合糸'),
  ('csavs-soft-2026','p1','required','module',1,2,'Liver lobectomy using powered stapler system','ตัดกลีบตับด้วยระบบ stapler','ステープラーによる肝葉切除'),
  ('csavs-soft-2026','p3','recommended','module',2,3,'Fine forceps for pericardectomy and TECA','คีมละเอียดสำหรับ TECA','心膜切除術・TECA用精密鉗子'),
  ('csavs-soft-2026','p2','recommended','module',3,4,'Mini plates for reconstructive flap stabilization','แผ่นเพลทสำหรับยึดแผ่นเนื้อเยื่อ','再建皮弁固定用ミニプレート'),
  ('csavs-soft-2026','p5','mentioned','instructor',NULL,5,'Dr. Proot recommends intraoperative ultrasound','Dr. Proot แนะนำอัลตราซาวด์ระหว่างผ่าตัด','Proot先生が術中超音波を推奨');

-- Ophthalmology
INSERT INTO course_product_relations (course_id, product_id, relationship_type, relation_type, day_index, display_order, instructor_note_en, instructor_note_th, instructor_note_ja) VALUES
  ('csavs-eye-2026','p3','required','course',NULL,1,'Primary micro-forceps for ophthalmic practicals','คีมจุลภาคหลักสำหรับจักษุ','全眼科実習用マイクロ鉗子'),
  ('csavs-eye-2026','p7','required','module',3,2,'Phaco system for Day 3 cataract surgery','ระบบ Phaco สำหรับผ่าตัดต้อกระจก','白内障手術実習用Phacoシステム'),
  ('csavs-eye-2026','p4','required','module',1,3,'8-0/9-0 sutures for corneal suturing','ไหมเย็บ 8-0/9-0 สำหรับเย็บกระจกตา','角膜縫合用8-0/9-0縫合糸'),
  ('csavs-eye-2026','p4','required','module',2,4,'Sutures for corneal reconstruction','ไหมเย็บสำหรับสร้างกระจกตาใหม่','角膜再建用縫合糸'),
  ('csavs-eye-2026','p5','mentioned','instructor',NULL,5,'Dr. Sanchez recommends ocular ultrasound','Dr. Sanchez แนะนำอัลตราซาวด์ตา','Sanchez先生が眼科超音波を推奨');

-- Joint Surgery
INSERT INTO course_product_relations (course_id, product_id, relationship_type, relation_type, day_index, display_order, instructor_note_en, instructor_note_th, instructor_note_ja) VALUES
  ('csavs-joint-2026','p8','required','course',NULL,1,'Full arthroscopy tower for practicals','ระบบอาร์โทรสโคปีครบชุด','実習用フル関節鏡タワー'),
  ('csavs-joint-2026','p1','required','module',2,2,'Power tools for arthrotomy demonstration','เครื่องมือสำหรับสาธิต arthrotomy','関節切開デモ用パワーツール'),
  ('csavs-joint-2026','p2','required','module',3,3,'Locking plates for stifle stabilization','แผ่นเพลทล็อคสำหรับยึดข้อเข่า','膝関節安定化用ロッキングプレート'),
  ('csavs-joint-2026','p8','required','module',2,4,'Arthroscope 2.7mm for basic exploration','กล้อง 2.7mm สำหรับสำรวจข้อต่อ','基本探索用2.7mm関節鏡'),
  ('csavs-joint-2026','p8','required','module',3,5,'Arthroscope 4.0mm for advanced stifle','กล้อง 4.0mm สำหรับข้อเข่าขั้นสูง','高度膝関節用4.0mm関節鏡'),
  ('csavs-joint-2026','p4','recommended','module',3,6,'Sutures for post-arthrotomy closure','ไหมเย็บปิดแผลหลัง arthrotomy','関節切開後創閉鎖用縫合糸'),
  ('csavs-joint-2026','p5','mentioned','instructor',NULL,7,'Dr. Pozzi recommends ultrasound for joint effusion','Dr. Pozzi แนะนำอัลตราซาวด์สำหรับน้ำในข้อ','Pozzi先生が関節液評価に超音波を推奨');

-- ============================================
-- VERIFICATION
-- ============================================
DO $$
DECLARE p INTEGER; c INTEGER; r INTEGER;
BEGIN
  SELECT COUNT(*) INTO p FROM products WHERE id IN ('p1','p2','p3','p4','p5','p6','p7','p8');
  SELECT COUNT(*) INTO c FROM courses WHERE id IN ('csavs-ultra-basic-2026','csavs-soft-2026','csavs-eye-2026','csavs-joint-2026');
  SELECT COUNT(*) INTO r FROM course_product_relations WHERE course_id IN ('csavs-ultra-basic-2026','csavs-soft-2026','csavs-eye-2026','csavs-joint-2026');
  RAISE NOTICE '=== DONE: % products, % courses, % relations ===', p, c, r;
END $$;
