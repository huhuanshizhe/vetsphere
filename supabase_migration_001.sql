-- ==========================================
-- VetSphere 数据库补充迁移脚本
-- 运行时间: 2026-02-28
-- 说明: 补充核心业务功能所需的表
-- ==========================================

-- 1. USER_PROFILES (用户详细资料)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  display_name TEXT,
  avatar_url TEXT,
  hospital TEXT,
  specialty TEXT,
  bio TEXT,
  phone TEXT,
  role TEXT DEFAULT 'Doctor',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all profiles" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. USER_POINTS (用户积分)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.user_points (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
  total_points INTEGER DEFAULT 500,
  level TEXT DEFAULT 'Resident',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own points" ON user_points FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage points" ON user_points FOR ALL USING (true);

-- 3. POINT_TRANSACTIONS (积分交易记录)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.point_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  balance_after INTEGER,
  reference_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own transactions" ON point_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert transactions" ON point_transactions FOR INSERT WITH CHECK (true);

-- 4. COURSE_ENROLLMENTS (课程报名)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  course_id TEXT NOT NULL,
  order_id TEXT,
  payment_status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'refunded'
  enrollment_date TIMESTAMPTZ DEFAULT NOW(),
  completion_status TEXT DEFAULT 'enrolled', -- 'enrolled', 'in_progress', 'completed', 'dropped'
  certificate_issued BOOLEAN DEFAULT FALSE,
  certificate_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);

ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own enrollments" ON course_enrollments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create enrollments" ON course_enrollments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "System can update enrollments" ON course_enrollments FOR UPDATE USING (true);

-- 5. POST_INTERACTIONS (帖子互动: 点赞/收藏)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.post_interactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  interaction_type TEXT NOT NULL, -- 'like', 'save'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id, interaction_type)
);

ALTER TABLE public.post_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view interactions count" ON post_interactions FOR SELECT USING (true);
CREATE POLICY "Users can manage own interactions" ON post_interactions FOR ALL USING (auth.uid() = user_id);

-- 6. POST_COMMENTS (帖子评论)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.post_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  author_name TEXT,
  author_avatar TEXT,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES post_comments(id), -- 支持嵌套回复
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view comments" ON post_comments FOR SELECT USING (true);
CREATE POLICY "Users can create comments" ON post_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON post_comments FOR DELETE USING (auth.uid() = user_id);

-- ==========================================
-- FUNCTIONS (存储过程)
-- ==========================================

-- 积分奖励函数
CREATE OR REPLACE FUNCTION award_user_points(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT
)
RETURNS TABLE(new_total INTEGER, new_level TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_points INTEGER;
  v_new_total INTEGER;
  v_new_level TEXT;
BEGIN
  -- 获取或初始化用户积分
  INSERT INTO user_points (user_id, total_points, level)
  VALUES (p_user_id, 500, 'Resident')
  ON CONFLICT (user_id) DO NOTHING;
  
  -- 更新积分
  UPDATE user_points
  SET total_points = total_points + p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING total_points INTO v_new_total;
  
  -- 计算等级
  v_new_level := CASE
    WHEN v_new_total >= 10000 THEN 'Master'
    WHEN v_new_total >= 5000 THEN 'Expert'
    WHEN v_new_total >= 2000 THEN 'Senior'
    WHEN v_new_total >= 1000 THEN 'Specialist'
    ELSE 'Resident'
  END;
  
  -- 更新等级
  UPDATE user_points
  SET level = v_new_level
  WHERE user_id = p_user_id;
  
  -- 记录交易
  INSERT INTO point_transactions (user_id, amount, reason, balance_after)
  VALUES (p_user_id, p_amount, p_reason, v_new_total);
  
  RETURN QUERY SELECT v_new_total, v_new_level;
END;
$$;

-- ==========================================
-- INDEXES (索引优化)
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_course_enrollments_user ON course_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course ON course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_user ON point_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_post_interactions_post ON post_interactions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id);

-- ==========================================
-- 完成提示
-- ==========================================
-- 请在 Supabase Dashboard 的 SQL Editor 中运行此脚本
-- 或使用 supabase CLI: supabase db push
