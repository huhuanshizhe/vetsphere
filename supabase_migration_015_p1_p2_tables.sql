-- ==========================================
-- VetSphere Migration 015: P1/P2 Tables
-- 中国站P1/P2阶段扩展表结构
-- 日期: 2026-03-03
-- 说明: 社区、面试、AI、通知、数据分析等扩展表
-- ==========================================

BEGIN;

-- ============================================
-- SECTION 1: 社区系统
-- ============================================

-- 1.1 帖子表扩展
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT,
  content_html TEXT,
  cover_image_url TEXT,
  post_type TEXT DEFAULT 'article',              -- article, case, question, discussion
  category TEXT,
  tags JSONB DEFAULT '[]',
  status TEXT DEFAULT 'draft',                   -- draft, pending, published, hidden, deleted
  is_pinned BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  published_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES auth.users(id);
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_posts_status ON public.posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_author ON public.posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_type ON public.posts(post_type);
CREATE INDEX IF NOT EXISTS idx_posts_published ON public.posts(published_at DESC);

-- 1.2 帖子举报表
CREATE TABLE IF NOT EXISTS public.post_reports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  comment_id UUID,
  reporter_id UUID REFERENCES auth.users(id),
  report_type TEXT NOT NULL,                     -- spam, inappropriate, harassment, copyright, other
  reason TEXT,
  status TEXT DEFAULT 'pending',                 -- pending, reviewed, resolved, dismissed
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  action_taken TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_reports_status ON public.post_reports(status);
CREATE INDEX IF NOT EXISTS idx_post_reports_post ON public.post_reports(post_id);

-- 1.3 内容审核表
CREATE TABLE IF NOT EXISTS public.content_moderation (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  content_type TEXT NOT NULL,                    -- post, comment, profile, course_review
  content_id UUID NOT NULL,
  content_snapshot JSONB,
  status TEXT DEFAULT 'pending',                 -- pending, approved, rejected, flagged
  risk_level TEXT DEFAULT 'low',                 -- low, medium, high
  ai_score DECIMAL(5,4),
  ai_flags JSONB DEFAULT '[]',
  moderator_id UUID REFERENCES auth.users(id),
  moderated_at TIMESTAMPTZ,
  moderation_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_moderation_status ON public.content_moderation(status);
CREATE INDEX IF NOT EXISTS idx_content_moderation_type ON public.content_moderation(content_type);

-- ============================================
-- SECTION 2: 面试系统
-- ============================================

-- 2.1 面试记录表
CREATE TABLE IF NOT EXISTS public.interviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  interview_type TEXT NOT NULL,                  -- mock, practice, assessment
  position_type TEXT,                            -- intern, junior, senior, specialist
  specialty TEXT,
  total_questions INTEGER DEFAULT 0,
  answered_questions INTEGER DEFAULT 0,
  score DECIMAL(5,2),
  duration_seconds INTEGER,
  status TEXT DEFAULT 'in_progress',             -- in_progress, completed, abandoned
  feedback JSONB,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interviews_user ON public.interviews(user_id);
CREATE INDEX IF NOT EXISTS idx_interviews_status ON public.interviews(status);

-- 2.2 面试问题库
CREATE TABLE IF NOT EXISTS public.interview_questions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  category TEXT NOT NULL,                        -- clinical, behavioral, technical
  subcategory TEXT,
  specialty TEXT,
  difficulty TEXT DEFAULT 'medium',              -- easy, medium, hard
  question_text TEXT NOT NULL,
  question_type TEXT DEFAULT 'open',             -- open, choice, scenario
  options JSONB,                                 -- 选择题选项
  reference_answer TEXT,
  scoring_rubric JSONB,
  tags JSONB DEFAULT '[]',
  usage_count INTEGER DEFAULT 0,
  avg_score DECIMAL(5,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interview_questions_category ON public.interview_questions(category);
CREATE INDEX IF NOT EXISTS idx_interview_questions_specialty ON public.interview_questions(specialty);
CREATE INDEX IF NOT EXISTS idx_interview_questions_difficulty ON public.interview_questions(difficulty);

-- 2.3 面试答题记录
CREATE TABLE IF NOT EXISTS public.interview_answers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.interview_questions(id),
  answer_text TEXT,
  selected_option TEXT,
  audio_url TEXT,
  score DECIMAL(5,2),
  ai_feedback TEXT,
  time_spent_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interview_answers_interview ON public.interview_answers(interview_id);

-- ============================================
-- SECTION 3: AI系统
-- ============================================

-- 3.1 AI对话日志
CREATE TABLE IF NOT EXISTS public.ai_conversation_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  conversation_type TEXT,                        -- chat, diagnosis, learning, interview
  context_type TEXT,
  context_id TEXT,
  messages JSONB DEFAULT '[]',
  model_used TEXT,
  total_tokens INTEGER DEFAULT 0,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  response_time_ms INTEGER,
  status TEXT DEFAULT 'completed',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_logs_user ON public.ai_conversation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_type ON public.ai_conversation_logs(conversation_type);
CREATE INDEX IF NOT EXISTS idx_ai_logs_created ON public.ai_conversation_logs(created_at DESC);

-- 3.2 AI提示词模板
CREATE TABLE IF NOT EXISTS public.ai_prompts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  prompt_type TEXT NOT NULL,                     -- system, user, few_shot
  category TEXT,
  prompt_template TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  model_config JSONB,
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_prompts_code ON public.ai_prompts(code);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_category ON public.ai_prompts(category);

-- ============================================
-- SECTION 4: 通知系统
-- ============================================

-- 4.1 通知表
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,               -- system, order, course, community, promotion
  title TEXT NOT NULL,
  content TEXT,
  link_url TEXT,
  link_type TEXT,
  link_id TEXT,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  is_pushed BOOLEAN DEFAULT false,
  pushed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(notification_type);

-- 4.2 通知模板
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  title_template TEXT NOT NULL,
  content_template TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  channels JSONB DEFAULT '["in_app"]',           -- in_app, email, sms, push
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_templates_code ON public.notification_templates(code);

-- ============================================
-- SECTION 5: 数据分析
-- ============================================

-- 5.1 页面访问记录
CREATE TABLE IF NOT EXISTS public.page_views (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  page_path TEXT NOT NULL,
  page_title TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  ip_address TEXT,
  country TEXT,
  city TEXT,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_page_views_user ON public.page_views(user_id);
CREATE INDEX IF NOT EXISTS idx_page_views_path ON public.page_views(page_path);
CREATE INDEX IF NOT EXISTS idx_page_views_created ON public.page_views(created_at DESC);

-- 5.2 用户行为记录
CREATE TABLE IF NOT EXISTS public.user_activities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  activity_type TEXT NOT NULL,                   -- click, scroll, form_submit, purchase, enroll
  target_type TEXT,
  target_id TEXT,
  target_name TEXT,
  properties JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_activities_user ON public.user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_type ON public.user_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activities_created ON public.user_activities(created_at DESC);

-- 5.3 数据统计快照（日/周/月汇总）
CREATE TABLE IF NOT EXISTS public.stats_snapshots (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  snapshot_type TEXT NOT NULL,                   -- daily, weekly, monthly
  snapshot_date DATE NOT NULL,
  metric_category TEXT NOT NULL,                 -- users, courses, products, orders, community
  metrics JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(snapshot_type, snapshot_date, metric_category)
);

CREATE INDEX IF NOT EXISTS idx_stats_snapshots_date ON public.stats_snapshots(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_stats_snapshots_type ON public.stats_snapshots(snapshot_type, metric_category);

-- ============================================
-- SECTION 6: 课程扩展
-- ============================================

-- 6.1 课程章节表
CREATE TABLE IF NOT EXISTS public.course_chapters (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  course_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER,
  video_url TEXT,
  is_free_preview BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_course_chapters_course ON public.course_chapters(course_id);

-- 6.2 课程评价表
CREATE TABLE IF NOT EXISTS public.course_reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  course_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'published',               -- pending, published, hidden
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_course_reviews_course ON public.course_reviews(course_id);
CREATE INDEX IF NOT EXISTS idx_course_reviews_rating ON public.course_reviews(rating);

-- 6.3 学习进度表
CREATE TABLE IF NOT EXISTS public.learning_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL,
  chapter_id UUID REFERENCES public.course_chapters(id),
  progress_percent DECIMAL(5,2) DEFAULT 0,
  last_position_seconds INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  total_watch_seconds INTEGER DEFAULT 0,
  last_watched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, course_id, chapter_id)
);

CREATE INDEX IF NOT EXISTS idx_learning_progress_user ON public.learning_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_progress_course ON public.learning_progress(course_id);

-- ============================================
-- SECTION 7: 订单扩展
-- ============================================

-- 7.1 订单表扩展
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_no TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  order_type TEXT DEFAULT 'course',              -- course, product, membership
  status TEXT DEFAULT 'pending',
  total_amount DECIMAL(10,2) NOT NULL,
  paid_amount DECIMAL(10,2),
  discount_amount DECIMAL(10,2) DEFAULT 0,
  payment_method TEXT,
  payment_channel TEXT,
  paid_at TIMESTAMPTZ,
  refund_status TEXT,
  refunded_amount DECIMAL(10,2),
  refunded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_no TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'course';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS refund_status TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS refunded_amount DECIMAL(10,2);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON public.orders(created_at DESC);

-- 7.2 订单明细表
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,                       -- course, product
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  item_image TEXT,
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  discount_price DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);

-- ============================================
-- SECTION 8: 功能开关与配置
-- ============================================

-- 8.1 功能开关表
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_enabled BOOLEAN DEFAULT false,
  enabled_for JSONB DEFAULT '{"all": false}',    -- {"all": true} or {"users": [...], "roles": [...]}
  config JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feature_flags_code ON public.feature_flags(code);

-- 8.2 系统配置表
CREATE TABLE IF NOT EXISTS public.system_configs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  config_key TEXT UNIQUE NOT NULL,
  config_value JSONB NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_configs_key ON public.system_configs(config_key);

-- ============================================
-- SECTION 9: RLS策略
-- ============================================

-- 启用RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_moderation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- 帖子策略
DROP POLICY IF EXISTS "posts_select_published" ON public.posts;
CREATE POLICY "posts_select_published" ON public.posts
  FOR SELECT USING (status = 'published' OR author_id = auth.uid());

DROP POLICY IF EXISTS "posts_insert_own" ON public.posts;
CREATE POLICY "posts_insert_own" ON public.posts
  FOR INSERT WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "posts_update_own" ON public.posts;
CREATE POLICY "posts_update_own" ON public.posts
  FOR UPDATE USING (author_id = auth.uid());

-- 面试策略
DROP POLICY IF EXISTS "interviews_own" ON public.interviews;
CREATE POLICY "interviews_own" ON public.interviews
  FOR ALL USING (user_id = auth.uid());

-- 通知策略
DROP POLICY IF EXISTS "notifications_own" ON public.notifications;
CREATE POLICY "notifications_own" ON public.notifications
  FOR ALL USING (user_id = auth.uid());

-- AI日志策略
DROP POLICY IF EXISTS "ai_logs_own" ON public.ai_conversation_logs;
CREATE POLICY "ai_logs_own" ON public.ai_conversation_logs
  FOR ALL USING (user_id = auth.uid());

-- 学习进度策略
DROP POLICY IF EXISTS "learning_progress_own" ON public.learning_progress;
CREATE POLICY "learning_progress_own" ON public.learning_progress
  FOR ALL USING (user_id = auth.uid());

-- 订单策略
DROP POLICY IF EXISTS "orders_own" ON public.orders;
CREATE POLICY "orders_own" ON public.orders
  FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "order_items_own" ON public.order_items;
CREATE POLICY "order_items_own" ON public.order_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
  );

-- 课程评价策略
DROP POLICY IF EXISTS "course_reviews_select" ON public.course_reviews;
CREATE POLICY "course_reviews_select" ON public.course_reviews
  FOR SELECT USING (status = 'published' OR user_id = auth.uid());

DROP POLICY IF EXISTS "course_reviews_insert" ON public.course_reviews;
CREATE POLICY "course_reviews_insert" ON public.course_reviews
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================
-- SECTION 10: 初始数据
-- ============================================

-- 通知模板
INSERT INTO public.notification_templates (code, name, notification_type, title_template, content_template, variables, channels) VALUES
('order_paid', '订单支付成功', 'order', '订单支付成功', '您的订单 {{order_no}} 已支付成功，金额 ¥{{amount}}', '["order_no", "amount"]', '["in_app", "email"]'),
('course_enrolled', '课程报名成功', 'course', '报名成功', '您已成功报名课程《{{course_title}}》，开始学习吧！', '["course_title"]', '["in_app"]'),
('doctor_approved', '医生认证通过', 'system', '认证通过', '恭喜您，您的医生身份认证已通过审核！', '[]', '["in_app", "sms"]'),
('doctor_rejected', '医生认证被拒', 'system', '认证未通过', '很抱歉，您的医生身份认证未通过，原因：{{reason}}', '["reason"]', '["in_app", "sms"]'),
('new_comment', '收到新评论', 'community', '收到新评论', '{{commenter}} 评论了您的帖子《{{post_title}}》', '["commenter", "post_title"]', '["in_app"]')
ON CONFLICT (code) DO UPDATE SET
  title_template = EXCLUDED.title_template,
  content_template = EXCLUDED.content_template;

-- AI提示词模板
INSERT INTO public.ai_prompts (code, name, prompt_type, category, prompt_template, variables) VALUES
('interview_feedback', '面试反馈生成', 'system', 'interview', 
'你是一位资深兽医面试官，请根据以下面试答案给出专业反馈：\n问题：{{question}}\n答案：{{answer}}\n请从专业性、完整性、表达清晰度三个维度评分并给出改进建议。', 
'["question", "answer"]'),
('diagnosis_assistant', '诊断助手', 'system', 'clinical',
'你是一位经验丰富的兽医诊断专家。请根据以下症状描述，提供可能的诊断方向和建议检查项目：\n动物类型：{{animal_type}}\n症状描述：{{symptoms}}\n注意：这只是参考建议，最终诊断需要临床检查确认。',
'["animal_type", "symptoms"]'),
('learning_summary', '学习总结', 'system', 'learning',
'请根据以下课程内容，生成一份简洁的学习总结，包含关键知识点和实践要点：\n课程标题：{{course_title}}\n章节内容：{{chapter_content}}',
'["course_title", "chapter_content"]')
ON CONFLICT (code) DO UPDATE SET
  prompt_template = EXCLUDED.prompt_template;

-- 功能开关
INSERT INTO public.feature_flags (code, name, description, is_enabled) VALUES
('ai_interview', 'AI模拟面试', 'AI驱动的模拟面试功能', true),
('ai_diagnosis', 'AI诊断助手', 'AI辅助诊断建议功能', false),
('community_posts', '社区发帖', '用户社区发帖功能', true),
('course_reviews', '课程评价', '课程评价功能', true),
('push_notifications', '推送通知', '移动端推送通知', false)
ON CONFLICT (code) DO UPDATE SET
  is_enabled = EXCLUDED.is_enabled;

COMMIT;

-- ==========================================
-- 完成
-- ==========================================
