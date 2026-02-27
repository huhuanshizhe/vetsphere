-- VetSphere Complete Database Schema
-- Run this in Supabase SQL Editor to initialize all tables
-- Version: 2.0 (Production Ready)

-- =====================================================
-- 1. USERS PROFILE EXTENSION
-- =====================================================
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'Doctor' CHECK (role IN ('Doctor', 'CourseProvider', 'ShopSupplier', 'Admin')),
    hospital TEXT,
    specialty TEXT,
    bio TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all profiles" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "System can insert profiles" ON user_profiles FOR INSERT WITH CHECK (true);

-- =====================================================
-- 2. COURSES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    title_zh TEXT,
    title_th TEXT,
    description TEXT,
    description_zh TEXT,
    description_th TEXT,
    specialty TEXT,
    level TEXT DEFAULT 'Intermediate',
    price DECIMAL(10, 2) DEFAULT 0,
    currency TEXT DEFAULT 'CNY',
    start_date DATE,
    end_date DATE,
    location JSONB DEFAULT '{}',
    instructor JSONB DEFAULT '{}',
    image_url TEXT,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Published', 'Rejected', 'Completed')),
    agenda JSONB DEFAULT '[]',
    max_students INTEGER DEFAULT 50,
    provider_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view published courses" ON courses FOR SELECT USING (status = 'Published' OR auth.uid() = provider_id);
CREATE POLICY "Providers can manage own courses" ON courses FOR ALL USING (auth.uid() = provider_id);
CREATE POLICY "Admins can manage all courses" ON courses FOR ALL USING (
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'Admin')
);

CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_specialty ON courses(specialty);
CREATE INDEX IF NOT EXISTS idx_courses_start_date ON courses(start_date);

-- =====================================================
-- 3. PRODUCTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    brand TEXT,
    price DECIMAL(10, 2) DEFAULT 0,
    specialty TEXT,
    group_category TEXT,
    image_url TEXT,
    description TEXT,
    long_description TEXT,
    specs JSONB DEFAULT '{}',
    compare_data JSONB,
    stock_status TEXT DEFAULT 'In Stock',
    supplier_info JSONB DEFAULT '{}',
    supplier_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view products" ON products FOR SELECT USING (true);
CREATE POLICY "Suppliers can manage own products" ON products FOR ALL USING (auth.uid() = supplier_id);
CREATE POLICY "Admins can manage all products" ON products FOR ALL USING (
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'Admin')
);

CREATE INDEX IF NOT EXISTS idx_products_specialty ON products(specialty);
CREATE INDEX IF NOT EXISTS idx_products_group ON products(group_category);

-- =====================================================
-- 4. ORDERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    customer_name TEXT,
    customer_email TEXT,
    items JSONB DEFAULT '[]',
    total_amount DECIMAL(10, 2) DEFAULT 0,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Paid', 'Shipped', 'Completed', 'Cancelled', 'Refunded')),
    date DATE DEFAULT CURRENT_DATE,
    shipping_address TEXT,
    payment_method TEXT,
    payment_intent_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own orders" ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create orders" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins/Suppliers can view all orders" ON orders FOR SELECT USING (
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('Admin', 'ShopSupplier'))
);
CREATE POLICY "Admins can update orders" ON orders FOR UPDATE USING (
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('Admin', 'ShopSupplier'))
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(date);

-- =====================================================
-- 5. POSTS (Community Clinical Cases)
-- =====================================================
CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    author_id UUID REFERENCES auth.users(id),
    author_info JSONB DEFAULT '{}',
    title TEXT NOT NULL,
    content TEXT,
    specialty TEXT,
    media JSONB DEFAULT '[]',
    patient_info JSONB DEFAULT '{}',
    sections JSONB DEFAULT '{}',
    is_ai_analyzed BOOLEAN DEFAULT FALSE,
    ai_analysis TEXT,
    stats JSONB DEFAULT '{"likes": 0, "comments": 0, "saves": 0}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view posts" ON posts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create posts" ON posts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authors can update own posts" ON posts FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Authors can delete own posts" ON posts FOR DELETE USING (auth.uid() = author_id);

CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_specialty ON posts(specialty);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at);

-- =====================================================
-- 6. COURSE ENROLLMENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS course_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL,
    order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
    enrollment_date TIMESTAMPTZ DEFAULT NOW(),
    completion_status TEXT DEFAULT 'enrolled' CHECK (completion_status IN ('enrolled', 'in_progress', 'completed', 'dropped')),
    progress_percent INTEGER DEFAULT 0,
    certificate_issued BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, course_id)
);

ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own enrollments" ON course_enrollments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Providers can view course enrollments" ON course_enrollments FOR SELECT USING (
    EXISTS (SELECT 1 FROM courses WHERE id = course_enrollments.course_id AND provider_id = auth.uid())
);
CREATE POLICY "System can manage enrollments" ON course_enrollments FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON course_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_payment ON course_enrollments(payment_status);

-- =====================================================
-- 7. USER POINTS SYSTEM
-- =====================================================
CREATE TABLE IF NOT EXISTS user_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    total_points INTEGER DEFAULT 500,
    level TEXT DEFAULT 'Resident',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS point_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    reason TEXT NOT NULL,
    balance_after INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own points" ON user_points FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage points" ON user_points FOR ALL USING (true);
CREATE POLICY "Users can view own transactions" ON point_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert transactions" ON point_transactions FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON user_points(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id ON point_transactions(user_id);

-- =====================================================
-- 8. POST INTERACTIONS (Likes, Saves)
-- =====================================================
CREATE TABLE IF NOT EXISTS post_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    interaction_type TEXT NOT NULL CHECK (interaction_type IN ('like', 'save')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, user_id, interaction_type)
);

ALTER TABLE post_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view interactions" ON post_interactions FOR SELECT USING (true);
CREATE POLICY "Users can manage own interactions" ON post_interactions FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_post_interactions_post_id ON post_interactions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_interactions_user_id ON post_interactions(user_id);

-- =====================================================
-- 9. POST COMMENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS post_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    author_name TEXT NOT NULL,
    author_avatar TEXT,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view comments" ON post_comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can comment" ON post_comments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own comments" ON post_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON post_comments FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id);

-- =====================================================
-- 10. LEADS (Sales/Marketing)
-- =====================================================
CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    source TEXT,
    contact_info TEXT,
    interest_summary TEXT,
    full_chat_log JSONB DEFAULT '[]',
    status TEXT DEFAULT 'New' CHECK (status IN ('New', 'Contacted', 'Converted', 'Archived')),
    organization TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage leads" ON leads FOR ALL USING (
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'Admin')
);

-- =====================================================
-- 11. QUOTES
-- =====================================================
CREATE TABLE IF NOT EXISTS quotes (
    id TEXT PRIMARY KEY,
    customer_email TEXT,
    customer_info JSONB DEFAULT '{}',
    items JSONB DEFAULT '[]',
    total_amount DECIMAL(10, 2) DEFAULT 0,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Accepted', 'Expired', 'Cancelled')),
    valid_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own quotes" ON quotes FOR SELECT USING (customer_email = (SELECT email FROM auth.users WHERE id = auth.uid()));
CREATE POLICY "System can manage quotes" ON quotes FOR ALL USING (true);

-- =====================================================
-- 12. SHIPPING TEMPLATES
-- =====================================================
CREATE TABLE IF NOT EXISTS shipping_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    region_code TEXT,
    base_fee DECIMAL(10, 2) DEFAULT 0,
    per_item_fee DECIMAL(10, 2) DEFAULT 0,
    estimated_days INTEGER DEFAULT 7,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE shipping_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view shipping" ON shipping_templates FOR SELECT USING (true);
CREATE POLICY "Admins can manage shipping" ON shipping_templates FOR ALL USING (
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('Admin', 'ShopSupplier'))
);

-- =====================================================
-- 13. HELPER FUNCTIONS
-- =====================================================

-- Function: Calculate User Level
CREATE OR REPLACE FUNCTION calculate_user_level(points INTEGER)
RETURNS TEXT AS $$
BEGIN
    IF points >= 10000 THEN RETURN 'Master';
    ELSIF points >= 5000 THEN RETURN 'Expert';
    ELSIF points >= 2000 THEN RETURN 'Senior';
    ELSIF points >= 1000 THEN RETURN 'Specialist';
    ELSE RETURN 'Resident';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function: Award Points
CREATE OR REPLACE FUNCTION award_user_points(
    p_user_id UUID,
    p_amount INTEGER,
    p_reason TEXT
) RETURNS TABLE(new_total INTEGER, new_level TEXT) AS $$
DECLARE
    v_current_points INTEGER;
    v_new_points INTEGER;
    v_new_level TEXT;
BEGIN
    -- Get or create user points record
    INSERT INTO user_points (user_id, total_points)
    VALUES (p_user_id, 500)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Get current points
    SELECT total_points INTO v_current_points FROM user_points WHERE user_id = p_user_id;
    v_new_points := v_current_points + p_amount;
    v_new_level := calculate_user_level(v_new_points);
    
    -- Update points and level
    UPDATE user_points 
    SET total_points = v_new_points, level = v_new_level, updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Record transaction
    INSERT INTO point_transactions (user_id, amount, reason, balance_after)
    VALUES (p_user_id, p_amount, p_reason, v_new_points);
    
    RETURN QUERY SELECT v_new_points, v_new_level;
END;
$$ LANGUAGE plpgsql;

-- Function: Update post stats
CREATE OR REPLACE FUNCTION update_post_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE posts SET stats = jsonb_set(
            stats,
            CASE WHEN NEW.interaction_type = 'like' THEN '{likes}' ELSE '{saves}' END,
            to_jsonb(COALESCE((stats->>CASE WHEN NEW.interaction_type = 'like' THEN 'likes' ELSE 'saves' END)::int, 0) + 1)
        ) WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts SET stats = jsonb_set(
            stats,
            CASE WHEN OLD.interaction_type = 'like' THEN '{likes}' ELSE '{saves}' END,
            to_jsonb(GREATEST(COALESCE((stats->>CASE WHEN OLD.interaction_type = 'like' THEN 'likes' ELSE 'saves' END)::int, 0) - 1, 0))
        ) WHERE id = OLD.post_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_post_stats_trigger
AFTER INSERT OR DELETE ON post_interactions
FOR EACH ROW EXECUTE FUNCTION update_post_stats();

-- Function: Update comment count
CREATE OR REPLACE FUNCTION update_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE posts SET stats = jsonb_set(stats, '{comments}', to_jsonb(COALESCE((stats->>'comments')::int, 0) + 1))
        WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts SET stats = jsonb_set(stats, '{comments}', to_jsonb(GREATEST(COALESCE((stats->>'comments')::int, 0) - 1, 0)))
        WHERE id = OLD.post_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_comment_count_trigger
AFTER INSERT OR DELETE ON post_comments
FOR EACH ROW EXECUTE FUNCTION update_comment_count();

-- Generic updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_points_updated_at BEFORE UPDATE ON user_points
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_enrollments_updated_at BEFORE UPDATE ON course_enrollments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON post_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- INITIALIZATION COMPLETE
-- =====================================================
-- Next steps:
-- 1. Insert seed data if needed
-- 2. Configure Stripe webhook in dashboard
-- 3. Set up Storage buckets for file uploads
