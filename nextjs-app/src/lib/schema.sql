-- =====================================================
-- VetSphere Database Schema
-- PostgreSQL (Supabase) - Complete initialization script
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 0. Extensions
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. ENUM TYPES
-- =====================================================
CREATE TYPE user_role AS ENUM ('Doctor', 'CourseProvider', 'ShopSupplier', 'Admin');
CREATE TYPE specialty AS ENUM ('Orthopedics', 'Neurosurgery', 'Soft Tissue', 'Eye Surgery', 'Exotics', 'Ultrasound');
CREATE TYPE course_status AS ENUM ('Draft', 'Pending', 'Published', 'Rejected');
CREATE TYPE course_level AS ENUM ('Basic', 'Intermediate', 'Advanced', 'Master');
CREATE TYPE doctor_level AS ENUM ('Resident', 'Surgeon', 'Expert', 'Master');
CREATE TYPE product_group AS ENUM ('PowerTools', 'Implants', 'HandInstruments', 'Consumables', 'Equipment');
CREATE TYPE stock_status AS ENUM ('In Stock', 'Low Stock', 'Out of Stock');
CREATE TYPE order_status AS ENUM ('Pending', 'Paid', 'Shipped', 'Completed', 'Cancelled');
CREATE TYPE enrollment_status AS ENUM ('Pending', 'Confirmed', 'Completed', 'Cancelled');
CREATE TYPE lead_status AS ENUM ('New', 'Contacted', 'Converted', 'Archived');
CREATE TYPE quote_status AS ENUM ('Active', 'Expired', 'Converted');
CREATE TYPE points_reason AS ENUM ('enrollment', 'case_publish', 'comment', 'referral', 'purchase', 'admin_award');

-- =====================================================
-- 2. CORE TABLES
-- =====================================================

-- 2.1 User Profiles (extends Supabase auth.users)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  role user_role NOT NULL DEFAULT 'Doctor',
  avatar_url TEXT,
  points INTEGER NOT NULL DEFAULT 0,
  level TEXT NOT NULL DEFAULT 'Resident',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.2 Doctor Extended Profiles
CREATE TABLE doctor_profiles (
  id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
  license_number TEXT,
  clinic_name TEXT,
  specialties specialty[] DEFAULT '{}',
  clinical_years INTEGER DEFAULT 0,
  referral_code TEXT UNIQUE,
  progress JSONB DEFAULT '[]'::jsonb
  -- progress: [{ specialty, level, completedCourses[] }]
);

-- 2.3 Course Provider Profiles
CREATE TABLE course_provider_profiles (
  id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
  organization_name TEXT NOT NULL DEFAULT '',
  license_id TEXT,
  website TEXT,
  description TEXT,
  verified BOOLEAN DEFAULT false
);

-- 2.4 Shop Supplier Profiles
CREATE TABLE shop_supplier_profiles (
  id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL DEFAULT '',
  origin_country TEXT,
  rating NUMERIC(2,1) DEFAULT 5.0,
  verified BOOLEAN DEFAULT false,
  contact_email TEXT,
  website TEXT
);

-- =====================================================
-- 3. COURSE TABLES
-- =====================================================

-- 3.1 Courses
CREATE TABLE courses (
  id TEXT PRIMARY KEY DEFAULT 'c-' || substr(md5(random()::text), 1, 12),
  provider_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  title_zh TEXT,
  title_th TEXT,
  specialty specialty NOT NULL,
  level course_level NOT NULL DEFAULT 'Basic',
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'CNY',
  start_date DATE,
  end_date DATE,
  image_url TEXT,
  description TEXT,
  description_zh TEXT,
  description_th TEXT,
  status course_status NOT NULL DEFAULT 'Draft',
  instructor JSONB DEFAULT '{}'::jsonb,
  -- { name, imageUrl, title, credentials[], bio }
  location JSONB DEFAULT '{}'::jsonb,
  -- { city, venue, address }
  agenda JSONB DEFAULT '[]'::jsonb,
  -- [{ day, date, items: [{ time, activity }] }]
  max_enrollment INTEGER DEFAULT 30,
  current_enrollment INTEGER DEFAULT 0,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.2 Course Enrollments
CREATE TABLE course_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  status enrollment_status NOT NULL DEFAULT 'Pending',
  payment_id TEXT,
  amount_paid NUMERIC(10,2) DEFAULT 0,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(course_id, user_id)
);

-- =====================================================
-- 4. COMMUNITY / BBS TABLES
-- =====================================================

-- 4.1 Posts (Clinical Cases)
CREATE TABLE posts (
  id TEXT PRIMARY KEY DEFAULT 'post-' || substr(md5(random()::text), 1, 12),
  author_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  specialty specialty NOT NULL,
  media JSONB DEFAULT '[]'::jsonb,
  -- [{ type: 'image'|'video', url }]
  patient_info JSONB,
  -- { species, age, weight }
  sections JSONB,
  -- { diagnosis, plan, outcome }
  is_ai_analyzed BOOLEAN DEFAULT false,
  expert_comment TEXT,
  likes_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  saves_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4.2 Post Likes
CREATE TABLE post_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- 4.3 Post Saves (Bookmarks)
CREATE TABLE post_saves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- 4.4 Post Comments
CREATE TABLE post_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- 5. SHOP TABLES
-- =====================================================

-- 5.1 Products
CREATE TABLE products (
  id TEXT PRIMARY KEY DEFAULT 'p-' || substr(md5(random()::text), 1, 12),
  supplier_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  brand TEXT,
  group_category product_group NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  specialty specialty NOT NULL,
  image_url TEXT,
  description TEXT,
  long_description TEXT,
  specs JSONB DEFAULT '{}'::jsonb,
  -- { key: value, ... }
  compare_data JSONB,
  -- { torque?, weight?, battery?, material? }
  stock_status stock_status NOT NULL DEFAULT 'In Stock',
  supplier_info JSONB DEFAULT '{}'::jsonb,
  -- { name, origin, rating }
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5.2 Orders
CREATE TABLE orders (
  id TEXT PRIMARY KEY DEFAULT 'ORD-' || to_char(now(), 'YYYY') || lpad(floor(random()*100000)::text, 5, '0'),
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- [{ id, name, price, currency, type, imageUrl, quantity }]
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  status order_status NOT NULL DEFAULT 'Pending',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  shipping_address TEXT,
  payment_method TEXT,
  tracking_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- 6. SUPPORT TABLES
-- =====================================================

-- 6.1 Points Transactions
CREATE TABLE points_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason points_reason NOT NULL,
  description TEXT,
  reference_id TEXT,
  -- could be course_id, post_id, order_id, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6.2 Shipping Templates
CREATE TABLE shipping_templates (
  id TEXT PRIMARY KEY DEFAULT 'ship-' || substr(md5(random()::text), 1, 8),
  supplier_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  region_code TEXT NOT NULL,
  base_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  per_item_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'CNY',
  estimated_days TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6.3 Leads (from AI Chat)
CREATE TABLE leads (
  id TEXT PRIMARY KEY DEFAULT 'LEAD-' || substr(md5(random()::text), 1, 10),
  source TEXT NOT NULL DEFAULT 'AI Chat',
  contact_info TEXT,
  interest_summary TEXT,
  full_chat_log JSONB DEFAULT '[]'::jsonb,
  status lead_status NOT NULL DEFAULT 'New',
  organization TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6.4 Quotes
CREATE TABLE quotes (
  id TEXT PRIMARY KEY DEFAULT 'QT-' || to_char(now(), 'YYYY') || lpad(floor(random()*100000)::text, 5, '0'),
  customer_email TEXT NOT NULL,
  customer_info JSONB,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  status quote_status NOT NULL DEFAULT 'Active',
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- 7. TRIGGER FUNCTIONS
-- =====================================================

-- 7.1 Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7.2 Sync post stats (likes_count)
CREATE OR REPLACE FUNCTION sync_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 7.3 Sync post stats (saves_count)
CREATE OR REPLACE FUNCTION sync_post_saves_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET saves_count = saves_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET saves_count = GREATEST(saves_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 7.4 Sync post stats (comments_count)
CREATE OR REPLACE FUNCTION sync_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 7.5 Sync course enrollment count
CREATE OR REPLACE FUNCTION sync_course_enrollment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status IN ('Confirmed', 'Completed') THEN
    UPDATE courses SET current_enrollment = current_enrollment + 1 WHERE id = NEW.course_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Went from non-confirmed to confirmed
    IF OLD.status NOT IN ('Confirmed', 'Completed') AND NEW.status IN ('Confirmed', 'Completed') THEN
      UPDATE courses SET current_enrollment = current_enrollment + 1 WHERE id = NEW.course_id;
    -- Went from confirmed to cancelled
    ELSIF OLD.status IN ('Confirmed', 'Completed') AND NEW.status = 'Cancelled' THEN
      UPDATE courses SET current_enrollment = GREATEST(current_enrollment - 1, 0) WHERE id = NEW.course_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.status IN ('Confirmed', 'Completed') THEN
    UPDATE courses SET current_enrollment = GREATEST(current_enrollment - 1, 0) WHERE id = OLD.course_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 7.6 Award points on enrollment confirmation
CREATE OR REPLACE FUNCTION award_enrollment_points()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'Confirmed' AND (OLD IS NULL OR OLD.status != 'Confirmed') THEN
    UPDATE user_profiles SET points = points + 100 WHERE id = NEW.user_id;
    INSERT INTO points_transactions (user_id, amount, reason, description, reference_id)
    VALUES (NEW.user_id, 100, 'enrollment', 'Course enrollment confirmed', NEW.course_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 7.7 Award points on post creation
CREATE OR REPLACE FUNCTION award_post_points()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_profiles SET points = points + 200 WHERE id = NEW.author_id;
  INSERT INTO points_transactions (user_id, amount, reason, description, reference_id)
  VALUES (NEW.author_id, 200, 'case_publish', 'Published clinical case', NEW.id);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 7.8 Auto-create user_profile on auth signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'Doctor')
  );
  -- Create role-specific profile
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'Doctor') = 'Doctor' THEN
    INSERT INTO doctor_profiles (id, referral_code)
    VALUES (NEW.id, 'REF-' || substr(md5(NEW.id::text), 1, 8));
  ELSIF NEW.raw_user_meta_data->>'role' = 'CourseProvider' THEN
    INSERT INTO course_provider_profiles (id, organization_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''));
  ELSIF NEW.raw_user_meta_data->>'role' = 'ShopSupplier' THEN
    INSERT INTO shop_supplier_profiles (id, company_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. APPLY TRIGGERS
-- =====================================================

-- updated_at triggers
CREATE TRIGGER trg_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_courses_updated_at BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_posts_updated_at BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Stats sync triggers
CREATE TRIGGER trg_post_likes_sync AFTER INSERT OR DELETE ON post_likes
  FOR EACH ROW EXECUTE FUNCTION sync_post_likes_count();
CREATE TRIGGER trg_post_saves_sync AFTER INSERT OR DELETE ON post_saves
  FOR EACH ROW EXECUTE FUNCTION sync_post_saves_count();
CREATE TRIGGER trg_post_comments_sync AFTER INSERT OR DELETE ON post_comments
  FOR EACH ROW EXECUTE FUNCTION sync_post_comments_count();
CREATE TRIGGER trg_course_enrollment_sync AFTER INSERT OR UPDATE OR DELETE ON course_enrollments
  FOR EACH ROW EXECUTE FUNCTION sync_course_enrollment_count();

-- Points triggers
CREATE TRIGGER trg_enrollment_points AFTER INSERT OR UPDATE ON course_enrollments
  FOR EACH ROW EXECUTE FUNCTION award_enrollment_points();
CREATE TRIGGER trg_post_points AFTER INSERT ON posts
  FOR EACH ROW EXECUTE FUNCTION award_post_points();

-- New user auto-profile
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- 9. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_provider_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_supplier_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

-- Helper function: check if current user is Admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'Admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- -----------------------------------------------
-- 9.1 user_profiles policies
-- -----------------------------------------------
-- Anyone can read profiles (public info)
CREATE POLICY "user_profiles_select" ON user_profiles
  FOR SELECT USING (true);
-- Users can update own profile
CREATE POLICY "user_profiles_update_own" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);
-- Admin can update any profile
CREATE POLICY "user_profiles_admin_update" ON user_profiles
  FOR UPDATE USING (is_admin());
-- Insert handled by trigger (SECURITY DEFINER), allow service_role
CREATE POLICY "user_profiles_insert" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id OR is_admin());

-- -----------------------------------------------
-- 9.2 doctor_profiles policies
-- -----------------------------------------------
CREATE POLICY "doctor_profiles_select" ON doctor_profiles
  FOR SELECT USING (true);
CREATE POLICY "doctor_profiles_update_own" ON doctor_profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "doctor_profiles_insert" ON doctor_profiles
  FOR INSERT WITH CHECK (auth.uid() = id OR is_admin());

-- -----------------------------------------------
-- 9.3 course_provider_profiles policies
-- -----------------------------------------------
CREATE POLICY "cp_profiles_select" ON course_provider_profiles
  FOR SELECT USING (true);
CREATE POLICY "cp_profiles_update_own" ON course_provider_profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "cp_profiles_insert" ON course_provider_profiles
  FOR INSERT WITH CHECK (auth.uid() = id OR is_admin());

-- -----------------------------------------------
-- 9.4 shop_supplier_profiles policies
-- -----------------------------------------------
CREATE POLICY "ss_profiles_select" ON shop_supplier_profiles
  FOR SELECT USING (true);
CREATE POLICY "ss_profiles_update_own" ON shop_supplier_profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "ss_profiles_insert" ON shop_supplier_profiles
  FOR INSERT WITH CHECK (auth.uid() = id OR is_admin());

-- -----------------------------------------------
-- 9.5 courses policies
-- -----------------------------------------------
-- Published courses visible to all; own courses visible to provider
CREATE POLICY "courses_select_published" ON courses
  FOR SELECT USING (status = 'Published' OR provider_id = auth.uid() OR is_admin());
-- Provider can insert own courses
CREATE POLICY "courses_insert" ON courses
  FOR INSERT WITH CHECK (provider_id = auth.uid() OR is_admin());
-- Provider can update own courses (except status, admin only for approval)
CREATE POLICY "courses_update_own" ON courses
  FOR UPDATE USING (provider_id = auth.uid() OR is_admin());
-- Admin can delete
CREATE POLICY "courses_delete_admin" ON courses
  FOR DELETE USING (is_admin());

-- -----------------------------------------------
-- 9.6 course_enrollments policies
-- -----------------------------------------------
-- Users can see own enrollments; provider can see enrollments for their courses
CREATE POLICY "enrollments_select" ON course_enrollments
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM courses WHERE courses.id = course_id AND courses.provider_id = auth.uid())
    OR is_admin()
  );
-- Users can enroll themselves
CREATE POLICY "enrollments_insert" ON course_enrollments
  FOR INSERT WITH CHECK (user_id = auth.uid());
-- Admin can update enrollment status
CREATE POLICY "enrollments_update" ON course_enrollments
  FOR UPDATE USING (user_id = auth.uid() OR is_admin());

-- -----------------------------------------------
-- 9.7 posts policies
-- -----------------------------------------------
-- All posts readable by everyone
CREATE POLICY "posts_select" ON posts
  FOR SELECT USING (true);
-- Authenticated users can create posts
CREATE POLICY "posts_insert" ON posts
  FOR INSERT WITH CHECK (author_id = auth.uid());
-- Authors can update own posts
CREATE POLICY "posts_update_own" ON posts
  FOR UPDATE USING (author_id = auth.uid() OR is_admin());
-- Authors or admin can delete
CREATE POLICY "posts_delete" ON posts
  FOR DELETE USING (author_id = auth.uid() OR is_admin());

-- -----------------------------------------------
-- 9.8 post_likes / post_saves policies
-- -----------------------------------------------
CREATE POLICY "post_likes_select" ON post_likes FOR SELECT USING (true);
CREATE POLICY "post_likes_insert" ON post_likes FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "post_likes_delete" ON post_likes FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "post_saves_select" ON post_saves FOR SELECT USING (true);
CREATE POLICY "post_saves_insert" ON post_saves FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "post_saves_delete" ON post_saves FOR DELETE USING (user_id = auth.uid());

-- -----------------------------------------------
-- 9.9 post_comments policies
-- -----------------------------------------------
CREATE POLICY "comments_select" ON post_comments FOR SELECT USING (true);
CREATE POLICY "comments_insert" ON post_comments FOR INSERT WITH CHECK (author_id = auth.uid());
CREATE POLICY "comments_update_own" ON post_comments FOR UPDATE USING (author_id = auth.uid());
CREATE POLICY "comments_delete" ON post_comments FOR DELETE USING (author_id = auth.uid() OR is_admin());

-- -----------------------------------------------
-- 9.10 products policies
-- -----------------------------------------------
CREATE POLICY "products_select" ON products FOR SELECT USING (true);
CREATE POLICY "products_insert" ON products
  FOR INSERT WITH CHECK (supplier_id = auth.uid() OR is_admin());
CREATE POLICY "products_update" ON products
  FOR UPDATE USING (supplier_id = auth.uid() OR is_admin());
CREATE POLICY "products_delete" ON products
  FOR DELETE USING (supplier_id = auth.uid() OR is_admin());

-- -----------------------------------------------
-- 9.11 orders policies
-- -----------------------------------------------
-- Users see own orders; supplier sees orders containing their products; admin sees all
CREATE POLICY "orders_select" ON orders
  FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "orders_insert" ON orders
  FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "orders_update" ON orders
  FOR UPDATE USING (user_id = auth.uid() OR is_admin());

-- -----------------------------------------------
-- 9.12 points_transactions policies
-- -----------------------------------------------
CREATE POLICY "points_select_own" ON points_transactions
  FOR SELECT USING (user_id = auth.uid() OR is_admin());
-- Insert via triggers only (SECURITY DEFINER functions), or admin
CREATE POLICY "points_insert" ON points_transactions
  FOR INSERT WITH CHECK (is_admin());

-- -----------------------------------------------
-- 9.13 shipping_templates policies
-- -----------------------------------------------
CREATE POLICY "shipping_select" ON shipping_templates FOR SELECT USING (true);
CREATE POLICY "shipping_insert" ON shipping_templates
  FOR INSERT WITH CHECK (supplier_id = auth.uid() OR is_admin());
CREATE POLICY "shipping_update" ON shipping_templates
  FOR UPDATE USING (supplier_id = auth.uid() OR is_admin());
CREATE POLICY "shipping_delete" ON shipping_templates
  FOR DELETE USING (supplier_id = auth.uid() OR is_admin());

-- -----------------------------------------------
-- 9.14 leads policies (admin only)
-- -----------------------------------------------
CREATE POLICY "leads_select" ON leads FOR SELECT USING (is_admin());
CREATE POLICY "leads_insert" ON leads FOR INSERT WITH CHECK (true);
-- anyone can create a lead from AI chat
CREATE POLICY "leads_update" ON leads FOR UPDATE USING (is_admin());

-- -----------------------------------------------
-- 9.15 quotes policies
-- -----------------------------------------------
CREATE POLICY "quotes_select" ON quotes
  FOR SELECT USING (customer_email = (SELECT email FROM user_profiles WHERE id = auth.uid()) OR is_admin());
CREATE POLICY "quotes_insert" ON quotes FOR INSERT WITH CHECK (true);

-- =====================================================
-- 10. INDEXES
-- =====================================================

-- Courses
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_courses_specialty ON courses(specialty);
CREATE INDEX idx_courses_provider ON courses(provider_id);
CREATE INDEX idx_courses_start_date ON courses(start_date);

-- Enrollments
CREATE INDEX idx_enrollments_user ON course_enrollments(user_id);
CREATE INDEX idx_enrollments_course ON course_enrollments(course_id);
CREATE INDEX idx_enrollments_status ON course_enrollments(status);

-- Posts
CREATE INDEX idx_posts_specialty ON posts(specialty);
CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_created ON posts(created_at DESC);

-- Post interactions
CREATE INDEX idx_post_likes_user ON post_likes(user_id);
CREATE INDEX idx_post_saves_user ON post_saves(user_id);
CREATE INDEX idx_post_comments_post ON post_comments(post_id);

-- Products
CREATE INDEX idx_products_group ON products(group_category);
CREATE INDEX idx_products_specialty ON products(specialty);
CREATE INDEX idx_products_supplier ON products(supplier_id);

-- Orders
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_date ON orders(date DESC);

-- Points
CREATE INDEX idx_points_user ON points_transactions(user_id);
CREATE INDEX idx_points_created ON points_transactions(created_at DESC);

-- Leads
CREATE INDEX idx_leads_status ON leads(status);

-- =====================================================
-- 11. STORAGE BUCKETS (run separately in Supabase Dashboard)
-- =====================================================
-- Supabase Storage SQL API:
INSERT INTO storage.buckets (id, name, public) VALUES ('post-media', 'post-media', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('course-images', 'course-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Storage RLS policies
CREATE POLICY "Public read post-media" ON storage.objects
  FOR SELECT USING (bucket_id = 'post-media');
CREATE POLICY "Auth upload post-media" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'post-media' AND auth.role() = 'authenticated');
CREATE POLICY "Own delete post-media" ON storage.objects
  FOR DELETE USING (bucket_id = 'post-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public read course-images" ON storage.objects
  FOR SELECT USING (bucket_id = 'course-images');
CREATE POLICY "Auth upload course-images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'course-images' AND auth.role() = 'authenticated');

CREATE POLICY "Public read product-images" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "Auth upload product-images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');

CREATE POLICY "Public read avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Own upload avatars" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =====================================================
-- 12. SEED DATA
-- =====================================================

-- 12.1 Seed Courses (from COURSES constant)
INSERT INTO courses (id, title, title_zh, specialty, level, price, currency, start_date, end_date, image_url, description, description_zh, status, instructor, location, agenda) VALUES
(
  'csavs-ultra-basic-2026',
  'CSAVS Veterinary Ultrasound - Basic',
  'CSAVS 腹部超声系列·基础班',
  'Ultrasound',
  'Basic',
  9800,
  'CNY',
  '2026-03-30',
  '2026-04-03',
  'https://images.unsplash.com/photo-1516733725897-1aa73b87c8e8?auto=format&fit=crop&w=800&q=80',
  'Systematic training on abdominal ultrasound physics, artifact recognition, and standard organ scanning protocols.',
  '系统学习腹部超声物理基础、伪像识别及标准器官扫描方案。',
  'Published',
  '{"name":"Femke Bosma","title":"DVM, DECVDI","credentials":["European Specialist in Veterinary Diagnostic Imaging"],"imageUrl":"https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=400&h=400&q=80","bio":"Dr. Femke Bosma graduated from Utrecht University in 2016. She joined the Animal Medical Center in Amsterdam and later completed her residency in radiology."}'::jsonb,
  '{"city":"Maanshan, China","venue":"CSAVS Practical Training Center","address":"Next to Maanshan East Railway Station (High Speed Rail)"}'::jsonb,
  '[{"day":"Day 1","date":"March 30","items":[{"time":"09:00-12:00","activity":"Basic Ultrasound Physics: Probes, Settings (Depth, Focus, Gain)"},{"time":"13:00-17:00","activity":"Artifacts: Recognition and mitigation. Probe handling. Practical Session."}]},{"day":"Day 2","date":"March 31","items":[{"time":"09:00-12:00","activity":"Liver & Biliary System: Normal anatomy, lesions, gallbladder mucocele."},{"time":"13:00-17:00","activity":"Pancreas & Spleen: Identification, pancreatitis, neoplasia. Practical."}]},{"day":"Day 3","date":"April 1","items":[{"time":"09:00-12:00","activity":"Urogenital System: Kidneys, Ureters, Bladder, Adrenal Glands."},{"time":"13:00-17:00","activity":"Retroperitoneal Space: Anatomy and common pathology. Practical."}]},{"day":"Day 4","date":"April 2","items":[{"time":"09:00-12:00","activity":"GI Tract: Normal anatomy, motility, ileus, foreign bodies."},{"time":"13:00-17:00","activity":"Abdominal Lymph Nodes: Reactive vs metastatic nodes. Practical."}]},{"day":"Day 5","date":"April 3","items":[{"time":"09:00-12:00","activity":"Abdominal Vasculature: Aorta, Vena Cava, Portal Vein, Doppler."},{"time":"13:00-17:00","activity":"US-guided Interventions: Cystocentesis, FNAs, Biopsy. Practical."}]}]'::jsonb
),
(
  'csavs-soft-2026',
  'CSAVS Practical Soft Tissue Surgery',
  'CSAVS 软组织外科实操课程',
  'Soft Tissue',
  'Advanced',
  4800,
  'CNY',
  '2026-03-18',
  '2026-03-20',
  'https://images.unsplash.com/photo-1551601651-2a8555f1a136?auto=format&fit=crop&w=800&q=80',
  'Intensive hands-on workshop covering Liver Lobectomy, Thoracic Surgery, and Reconstructive Skin Flaps.',
  '密集实操研讨会，涵盖肝叶切除术、胸腔外科和皮瓣重建术。',
  'Published',
  '{"name":"Joachim Proot","title":"DVM, CertSAS, DECVS","credentials":["European Specialist in Small Animal Surgery"],"imageUrl":"https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&h=400&q=80","bio":"Joachim possesses 15 years of specialized surgical experience in referral tertiary care centers across the UK."}'::jsonb,
  '{"city":"Nanjing, China","venue":"Nanjing Agricultural Univ. Teaching Hospital","address":"4th Floor Practical Center, New District"}'::jsonb,
  '[{"day":"Day 1","date":"March 18","items":[{"time":"14:30-16:00","activity":"Liver lobectomy using staplers & Diaphragmotomy"},{"time":"16:30-18:00","activity":"Cholecystoduodenostomy & Cholecystectomy. Sublumbar lymph node removal."}]},{"day":"Day 2","date":"March 19","items":[{"time":"08:30-12:00","activity":"Intercostal thoracotomy, Sternotomy, Lung lobectomy, Pericardectomy"},{"time":"13:00-17:30","activity":"Total ear canal ablation (TECA) & Ventral bulla osteotomy"}]},{"day":"Day 3","date":"March 20","items":[{"time":"08:30-12:00","activity":"Axial pattern flaps, Subdermal plexus flaps, Free skin graft"},{"time":"13:00-17:30","activity":"Practical: Axial pattern flaps & Subdermal plexus flaps"}]}]'::jsonb
),
(
  'csavs-eye-2026',
  'European Veterinary Ophthalmology Certification VOSC-China',
  '欧洲兽医眼科认证 VOSC-中国',
  'Eye Surgery',
  'Master',
  15000,
  'CNY',
  '2026-01-03',
  '2026-01-05',
  'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80',
  'Advanced Corneal Suturing, Reconstruction, and Phacoemulsification techniques.',
  '高级角膜缝合、角膜重建及超声乳化技术认证课程。',
  'Published',
  '{"name":"Rick F. Sanchez","title":"DVM, DECVO, CertVetEd","credentials":["European Specialist in Veterinary Ophthalmology"],"imageUrl":"https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=400&h=400&q=80","bio":"Rick is a pioneering veterinarian in applying suture burying techniques for corneal surgery. He re-established the Ophthalmology service at the RVC in 2011."}'::jsonb,
  '{"city":"Shanghai, China","venue":"I-VET Ophthalmology Training Center","address":"738 Shangcheng Road, Pudong New Area"}'::jsonb,
  '[{"day":"Day 1","date":"Jan 3","items":[{"time":"09:00-11:40","activity":"Micro-ophthalmic instruments, Corneal suture patterns, Buried knots"},{"time":"12:40-17:00","activity":"Practical: Advanced Corneal Suturing"}]},{"day":"Day 2","date":"Jan 4","items":[{"time":"09:00-12:10","activity":"Superficial keratectomy, Conjunctival grafting, CLCTS"},{"time":"13:10-17:00","activity":"Biomaterials. Practical: Advanced Corneal Reconstruction"}]},{"day":"Day 3","date":"Jan 5","items":[{"time":"09:00-11:30","activity":"Uncomplicated phacoemulsification, Capsulorrhexis problem solving"},{"time":"12:30-17:00","activity":"CTR, IOL implant, Wound closure. Practical: Phaco techniques"}]}]'::jsonb
),
(
  'csavs-joint-2026',
  'CSAVS Practical Joint Surgery Workshop',
  'CSAVS 关节外科实操课程',
  'Orthopedics',
  'Advanced',
  4800,
  'CNY',
  '2026-03-18',
  '2026-03-20',
  'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80',
  'Mastering joint surgery: Bandaging, reduction of luxations, arthrotomy principles, and basic arthroscopy.',
  '掌握关节外科：绷带、脱位复位、关节切开术原则及基础关节镜。',
  'Published',
  '{"name":"Antonio Pozzi","title":"DVM, DECVS, DACVS, DACVSMR","credentials":["Director of Small Animal Surgery at University of Zurich"],"imageUrl":"https://images.unsplash.com/photo-1531891437567-317ff7fd9008?auto=format&fit=crop&w=400&h=400&q=80","bio":"Dr. Antonio Pozzi is a world-renowned specialist in neurosurgery, orthopedics, and sports medicine."}'::jsonb,
  '{"city":"Maanshan, China","venue":"CSAVS Training Center","address":"Maanshan, Anhui Province"}'::jsonb,
  '[{"day":"Day 1","date":"March 18","items":[{"time":"14:30-16:00","activity":"Bandaging: bandages, splints, slings for joint diseases (Lecture)"},{"time":"16:30-18:00","activity":"Arthrotomy: Basic principles on how to perform an arthrotomy (Lecture)"}]},{"day":"Day 2","date":"March 19","items":[{"time":"08:30-10:00","activity":"Orthopedic examination: laxity tests, joint palpation (Practical)"},{"time":"10:30-12:00","activity":"Closed reduction of luxation (Hip), bandages (Modified Robert Jones, Ehmer) (Practical)"},{"time":"13:00-17:30","activity":"Arthroscopy: Introduction to basic arthroscopy (Practical)"}]},{"day":"Day 3","date":"March 20","items":[{"time":"08:30-12:00","activity":"Stifle arthrotomy: Surgical anatomy to joint exploration (Practical)"},{"time":"13:00-17:30","activity":"Arthroscopy: Arthroscopic assisted arthrotomy & other applications (Practical)"}]}]'::jsonb
);

-- 12.2 Seed Products (from PRODUCTS constant)
INSERT INTO products (id, name, brand, group_category, price, specialty, image_url, description, long_description, specs, stock_status, supplier_info) VALUES
(
  'p1',
  'TPLO High-Torque Saw System',
  'SurgiTech',
  'PowerTools',
  15800,
  'Orthopedics',
  'https://images.unsplash.com/photo-1581093588401-fbb62a02f120?auto=format&fit=crop&w=600&q=80',
  'German-engineered oscillating saw optimized for TPLO procedures with low vibration and high torque.',
  'This system features a fully sealed waterproof design, supporting autoclave sterilization. Its unique quick-coupling interface fits major global saw blade brands.',
  '{"No-load Speed":"0-15000 rpm","Weight":"820g","Sterilization":"134°C Autoclave","Noise Level":"<65dB"}'::jsonb,
  'In Stock',
  '{"name":"SurgiTech Germany GmbH","origin":"Germany","rating":4.9}'::jsonb
),
(
  'p2',
  'Titanium Locking Plate System 2.4/2.7/3.5mm',
  'VetOrtho',
  'Implants',
  1250,
  'Orthopedics',
  'https://images.unsplash.com/photo-1583483425070-cb9ce8fc51b5?auto=format&fit=crop&w=600&q=80',
  'Medical Grade 5 Titanium locking plates designed for superior biological stability.',
  'The VetOrtho locking system is designed to minimize bone contact pressure, preserving periosteal blood supply. Anodized surface treatment enhances biocompatibility.',
  '{"Material":"Ti-6Al-4V ELI","Surface":"Anodized (Type II)","Thickness":"2.4mm - 3.8mm"}'::jsonb,
  'In Stock',
  '{"name":"VetOrtho Precision Mfg","origin":"China","rating":4.8}'::jsonb
),
(
  'p3',
  'Micro-Ophthalmic Forceps (Straight/Curved)',
  'PrecisionEye',
  'HandInstruments',
  1880,
  'Eye Surgery',
  'https://images.unsplash.com/photo-1579154235602-4c202ff39040?auto=format&fit=crop&w=600&q=80',
  'Swiss-crafted tips designed for delicate corneal and intraocular maneuvers.',
  'Hand-finished tips (0.1mm) ensure ultimate tactile feedback under the microscope. Lightweight handle design reduces surgeon fatigue during long procedures.',
  '{"Length":"115mm","Tip Size":"0.1mm","Material":"Non-magnetic Stainless Steel"}'::jsonb,
  'Low Stock',
  '{"name":"Precision Eye Instruments","origin":"USA","rating":5.0}'::jsonb
),
(
  'p4',
  'PGA Absorbable Sutures (Braided)',
  'SutureExpert',
  'Consumables',
  580,
  'Soft Tissue',
  'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80',
  'Box of 12. Excellent knot security and minimal tissue reaction.',
  'PGA sutures degrade via hydrolysis, providing a stable wound support period (approx. 21-28 days). Coated surface ensures smooth passage through tissue.',
  '{"Sizes":"2-0 / 3-0 / 4-0","Length":"75cm","Needle":"Reverse Cutting 3/8"}'::jsonb,
  'In Stock',
  '{"name":"Global Medical Supplies","origin":"Germany","rating":4.7}'::jsonb
);

-- 12.3 Seed Posts (Clinical Cases) - author_id is NULL since no auth user exists yet
INSERT INTO posts (id, title, content, specialty, media, patient_info, sections, is_ai_analyzed, likes_count, comments_count, saves_count, created_at) VALUES
(
  'case-001',
  '复杂粉碎性股骨骨折的 TPLO + 锁定钢板联合固定',
  '患犬为3岁拉布拉多，遭遇车祸导致股骨远端粉碎性骨折，同时伴有交叉韧带断裂。我们采用了双板固定技术，术后8周复查显示良好的负重恢复。该病例展示了双板固定在复杂粉碎性骨折中的优势，包括更好的生物力学稳定性和更快的骨愈合速度。',
  'Orthopedics',
  '[{"type":"image","url":"https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&q=80"}]'::jsonb,
  '{"species":"Canine (Labrador)","age":"3y","weight":"32kg"}'::jsonb,
  '{"diagnosis":"Distal Femoral Comminuted Fracture + Cruciate Ligament Rupture","plan":"Dual Plate Fixation + TPLO Stabilization","outcome":"Post-op 8 weeks: Good weight bearing. Full recovery expected."}'::jsonb,
  true,
  42, 12, 28,
  '2025-05-15'
),
(
  'case-002',
  '神经外科：L3-L4 椎间盘突出导致的截瘫病例报告',
  '该病例展示了半椎板切除术在急性 IVDD 处理中的应用。6岁腊肠犬，急性发作后肢截瘫伴深部痛觉丧失。术后配合高压氧治疗，48小时内深部痛觉恢复，效果显著。本病例强调了早期手术干预和辅助治疗对IVDD预后的重要性。',
  'Neurosurgery',
  '[{"type":"image","url":"https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&w=800&q=80"}]'::jsonb,
  '{"species":"Canine (Dachshund)","age":"6y","weight":"8kg"}'::jsonb,
  '{"diagnosis":"Acute IVDD (Hansen Type I) at L3-L4","plan":"Hemilaminectomy at L3-L4 + Hyperbaric Oxygen Therapy","outcome":"Deep pain sensation recovered in 48h. Ambulatory at 2 weeks."}'::jsonb,
  true,
  35, 8, 15,
  '2025-05-18'
);

-- =====================================================
-- 13. UTILITY VIEWS (optional, for dashboard queries)
-- =====================================================

-- Course summary view for listings
CREATE OR REPLACE VIEW v_courses_published AS
SELECT
  c.id, c.title, c.title_zh, c.title_th,
  c.specialty, c.level, c.price, c.currency,
  c.start_date, c.end_date, c.image_url,
  c.description, c.description_zh, c.description_th,
  c.status, c.instructor, c.location, c.agenda,
  c.max_enrollment, c.current_enrollment,
  c.created_at, c.updated_at
FROM courses c
WHERE c.status = 'Published';

-- Post summary view with author info
CREATE OR REPLACE VIEW v_posts_feed AS
SELECT
  p.id, p.title, p.content, p.specialty,
  p.media, p.patient_info, p.sections,
  p.is_ai_analyzed, p.expert_comment,
  p.likes_count, p.comments_count, p.saves_count,
  p.created_at,
  up.name AS author_name,
  up.avatar_url AS author_avatar,
  up.level AS author_level,
  COALESCE(dp.clinic_name, '') AS author_hospital
FROM posts p
LEFT JOIN user_profiles up ON p.author_id = up.id
LEFT JOIN doctor_profiles dp ON p.author_id = dp.id
ORDER BY p.created_at DESC;

-- =====================================================
-- DONE! Schema is ready.
-- Next: Configure .env with your Supabase project URL and anon key.
-- =====================================================
