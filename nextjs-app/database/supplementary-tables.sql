-- VetSphere Supplementary Database Tables
-- Run this in Supabase SQL Editor after init-database.sql

-- =====================================================
-- 1. USER POINTS TABLE (Replace localStorage)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    total_points INTEGER DEFAULT 500,
    level TEXT DEFAULT 'Resident',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Points transaction history
CREATE TABLE IF NOT EXISTS point_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    reason TEXT NOT NULL,
    balance_after INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies for user_points
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own points" ON user_points FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage points" ON user_points FOR ALL USING (true);
CREATE POLICY "Users can view own transactions" ON point_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert transactions" ON point_transactions FOR INSERT WITH CHECK (true);

-- =====================================================
-- 2. POST INTERACTIONS TABLE (Likes, Saves)
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

CREATE POLICY "Users can view all interactions" ON post_interactions FOR SELECT USING (true);
CREATE POLICY "Users can manage own interactions" ON post_interactions FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- 3. POST COMMENTS TABLE
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

-- =====================================================
-- 4. COURSE ENROLLMENTS TABLE (if not exists)
-- =====================================================
CREATE TABLE IF NOT EXISTS course_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL,
    order_id TEXT,
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
CREATE POLICY "System can manage enrollments" ON course_enrollments FOR ALL USING (true);

-- =====================================================
-- 5. INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON user_points(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id ON point_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_post_interactions_post_id ON post_interactions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_interactions_user_id ON post_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_user_id ON course_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course_id ON course_enrollments(course_id);

-- =====================================================
-- 6. TRIGGER FOR UPDATED_AT
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_points_updated_at BEFORE UPDATE ON user_points
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_post_comments_updated_at BEFORE UPDATE ON post_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_enrollments_updated_at BEFORE UPDATE ON course_enrollments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. FUNCTION: Calculate User Level Based on Points
-- =====================================================
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

-- =====================================================
-- 8. FUNCTION: Award Points with Auto-Level Update
-- =====================================================
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
