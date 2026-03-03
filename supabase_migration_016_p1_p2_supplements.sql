-- ==========================================
-- VetSphere Migration 016: P1/P2 Supplements
-- 中国站P1/P2阶段补充表结构和函数
-- 日期: 2026-03-03
-- 说明: 专家访谈、会员、优惠券、辅助函数
-- ==========================================

BEGIN;

-- ============================================
-- SECTION 1: 专家访谈系统 (区别于面试系统)
-- ============================================

-- 1.1 专家访谈表
CREATE TABLE IF NOT EXISTS public.expert_interviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  excerpt TEXT,
  content TEXT,
  content_html TEXT,
  cover_image_url TEXT,
  interviewee_name TEXT NOT NULL,
  interviewee_title TEXT,
  interviewee_company TEXT,
  interviewee_avatar TEXT,
  interviewee_bio TEXT,
  category TEXT,                                  -- expert, founder, industry, technology
  tags JSONB DEFAULT '[]',
  status TEXT DEFAULT 'draft',                    -- draft, pending, published
  is_featured BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  published_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expert_interviews_status ON public.expert_interviews(status);
CREATE INDEX IF NOT EXISTS idx_expert_interviews_category ON public.expert_interviews(category);
CREATE INDEX IF NOT EXISTS idx_expert_interviews_published ON public.expert_interviews(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_expert_interviews_featured ON public.expert_interviews(is_featured) WHERE is_featured = true;

-- 1.2 访谈问答表
CREATE TABLE IF NOT EXISTS public.interview_qa (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  interview_id UUID REFERENCES public.expert_interviews(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  answer_html TEXT,
  media_type TEXT,                                -- text, video, audio
  media_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interview_qa_interview ON public.interview_qa(interview_id);

-- ============================================
-- SECTION 2: 会员系统
-- ============================================

-- 2.1 会员记录表
CREATE TABLE IF NOT EXISTS public.memberships (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL,                        -- monthly, quarterly, yearly, lifetime
  status TEXT DEFAULT 'pending',                  -- pending, active, expired, cancelled
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,                           -- NULL for lifetime
  auto_renew BOOLEAN DEFAULT true,
  payment_method TEXT,
  payment_amount DECIMAL(10,2),
  payment_currency TEXT DEFAULT 'CNY',
  order_id UUID,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memberships_user ON public.memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_status ON public.memberships(status);
CREATE INDEX IF NOT EXISTS idx_memberships_end_date ON public.memberships(end_date);

-- 2.2 会员权益表
CREATE TABLE IF NOT EXISTS public.membership_benefits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  plan_type TEXT NOT NULL,
  benefit_key TEXT NOT NULL,
  benefit_name TEXT NOT NULL,
  benefit_description TEXT,
  benefit_value JSONB,                            -- 权益值，如折扣比例、次数限制等
  is_enabled BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_membership_benefits_unique ON public.membership_benefits(plan_type, benefit_key);

-- ============================================
-- SECTION 3: 优惠券系统
-- ============================================

-- 3.1 优惠券表
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,                             -- fixed, percentage
  value DECIMAL(10,2) NOT NULL,                   -- 金额或百分比
  min_amount DECIMAL(10,2),                       -- 最低消费
  max_discount DECIMAL(10,2),                     -- 最高减免（百分比券用）
  usage_limit INTEGER,                            -- 总使用次数限制
  used_count INTEGER DEFAULT 0,
  per_user_limit INTEGER DEFAULT 1,               -- 每人限用次数
  applicable_products JSONB,                      -- 适用商品ID列表
  applicable_categories JSONB,                    -- 适用分类
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT true,                 -- 是否公开展示
  created_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON public.coupons(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_coupons_dates ON public.coupons(start_at, end_at);

-- 3.2 优惠券使用记录表
CREATE TABLE IF NOT EXISTS public.coupon_usages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  coupon_id UUID REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID,
  discount_amount DECIMAL(10,2),
  used_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupon_usages_coupon ON public.coupon_usages(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_user ON public.coupon_usages(user_id);

-- ============================================
-- SECTION 4: 辅助函数
-- ============================================

-- 4.1 课程报名人数增加函数
CREATE OR REPLACE FUNCTION increment_enrollment_count(course_id_param UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.courses
  SET enrollment_count = COALESCE(enrollment_count, 0) + 1
  WHERE id = course_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.2 帖子互动计数更新函数
CREATE OR REPLACE FUNCTION update_post_counts(
  post_id_param UUID,
  count_type TEXT,
  delta INTEGER DEFAULT 1
)
RETURNS void AS $$
BEGIN
  CASE count_type
    WHEN 'view' THEN
      UPDATE public.posts SET view_count = COALESCE(view_count, 0) + delta WHERE id = post_id_param;
    WHEN 'like' THEN
      UPDATE public.posts SET like_count = COALESCE(like_count, 0) + delta WHERE id = post_id_param;
    WHEN 'comment' THEN
      UPDATE public.posts SET comment_count = COALESCE(comment_count, 0) + delta WHERE id = post_id_param;
    WHEN 'share' THEN
      UPDATE public.posts SET share_count = COALESCE(share_count, 0) + delta WHERE id = post_id_param;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.3 优惠券使用计数更新触发器
CREATE OR REPLACE FUNCTION update_coupon_used_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.coupons
  SET used_count = COALESCE(used_count, 0) + 1
  WHERE id = NEW.coupon_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_coupon_usage ON public.coupon_usages;
CREATE TRIGGER trigger_coupon_usage
  AFTER INSERT ON public.coupon_usages
  FOR EACH ROW
  EXECUTE FUNCTION update_coupon_used_count();

-- 4.4 会员到期自动更新状态函数（可由定时任务调用）
CREATE OR REPLACE FUNCTION expire_memberships()
RETURNS INTEGER AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  UPDATE public.memberships
  SET status = 'expired',
      updated_at = NOW()
  WHERE status = 'active'
    AND end_date IS NOT NULL
    AND end_date < NOW();
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SECTION 5: RLS 策略
-- ============================================

-- 5.1 专家访谈 RLS
ALTER TABLE public.expert_interviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "expert_interviews_public_read" ON public.expert_interviews;
DROP POLICY IF EXISTS "expert_interviews_admin_all" ON public.expert_interviews;

CREATE POLICY "expert_interviews_public_read" ON public.expert_interviews
  FOR SELECT USING (status = 'published' AND deleted_at IS NULL);

CREATE POLICY "expert_interviews_admin_all" ON public.expert_interviews
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 5.2 会员 RLS
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "memberships_user_read" ON public.memberships;
DROP POLICY IF EXISTS "memberships_admin_all" ON public.memberships;

CREATE POLICY "memberships_user_read" ON public.memberships
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "memberships_admin_all" ON public.memberships
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 5.3 优惠券 RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coupons_public_read" ON public.coupons;
DROP POLICY IF EXISTS "coupons_admin_all" ON public.coupons;

CREATE POLICY "coupons_public_read" ON public.coupons
  FOR SELECT USING (is_active = true AND is_public = true AND deleted_at IS NULL);

CREATE POLICY "coupons_admin_all" ON public.coupons
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 5.4 优惠券使用记录 RLS
ALTER TABLE public.coupon_usages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coupon_usages_user_read" ON public.coupon_usages;
DROP POLICY IF EXISTS "coupon_usages_admin_all" ON public.coupon_usages;

CREATE POLICY "coupon_usages_user_read" ON public.coupon_usages
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "coupon_usages_admin_all" ON public.coupon_usages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ============================================
-- SECTION 6: 初始数据
-- ============================================

-- 6.1 会员权益初始数据
INSERT INTO public.membership_benefits (plan_type, benefit_key, benefit_name, benefit_description, benefit_value, sort_order)
VALUES
  ('monthly', 'free_courses', '免费课程', '全站课程免费学习', '{"enabled": true}', 1),
  ('monthly', 'ai_unlimited', 'AI助手', 'AI助手无限使用', '{"enabled": true}', 2),
  ('monthly', 'priority_support', '优先支持', '客服优先响应', '{"enabled": true}', 3),
  ('quarterly', 'free_courses', '免费课程', '全站课程免费学习', '{"enabled": true}', 1),
  ('quarterly', 'ai_unlimited', 'AI助手', 'AI助手无限使用', '{"enabled": true}', 2),
  ('quarterly', 'priority_support', '优先支持', '客服优先响应', '{"enabled": true}', 3),
  ('quarterly', 'course_discount', '课程折扣', '付费课程9折', '{"discount": 0.9}', 4),
  ('yearly', 'free_courses', '免费课程', '全站课程免费学习', '{"enabled": true}', 1),
  ('yearly', 'ai_unlimited', 'AI助手', 'AI助手无限使用', '{"enabled": true}', 2),
  ('yearly', 'priority_support', '优先支持', '客服优先响应', '{"enabled": true}', 3),
  ('yearly', 'course_discount', '课程折扣', '付费课程8折', '{"discount": 0.8}', 4),
  ('yearly', 'exclusive_content', '专属内容', '会员专属学习资料', '{"enabled": true}', 5),
  ('lifetime', 'free_courses', '免费课程', '全站课程永久免费', '{"enabled": true}', 1),
  ('lifetime', 'ai_unlimited', 'AI助手', 'AI助手永久无限使用', '{"enabled": true}', 2),
  ('lifetime', 'priority_support', '优先支持', '终身优先客服支持', '{"enabled": true}', 3),
  ('lifetime', 'course_discount', '课程折扣', '付费课程7折', '{"discount": 0.7}', 4),
  ('lifetime', 'exclusive_content', '专属内容', '会员专属学习资料', '{"enabled": true}', 5),
  ('lifetime', 'vip_events', 'VIP活动', '线下VIP活动优先参与', '{"enabled": true}', 6)
ON CONFLICT (plan_type, benefit_key) DO NOTHING;

-- 6.2 示例优惠券
INSERT INTO public.coupons (code, name, type, value, min_amount, usage_limit, per_user_limit, is_active, is_public)
VALUES
  ('WELCOME10', '新用户立减10元', 'fixed', 10, 50, 1000, 1, true, true),
  ('VIP20OFF', 'VIP专享8折', 'percentage', 20, 100, NULL, 3, true, false),
  ('SPRING2026', '春季特惠满100减20', 'fixed', 20, 100, 500, 1, true, true)
ON CONFLICT (code) DO NOTHING;

COMMIT;

-- 执行说明：
-- 在 Supabase SQL Editor 中执行此脚本
-- 或使用 supabase db push 命令
