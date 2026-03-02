-- ==========================================
-- VetSphere 课程业务流程迁移脚本
-- 运行时间: 2026-03-01
-- 说明: 补充课程表缺失字段 + Admin RLS 策略
-- ==========================================

-- 1. 补充 courses 表缺失字段
-- ==========================================
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS title_zh TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS title_th TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS description_zh TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS description_th TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS max_enrollment INTEGER DEFAULT 30;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS current_enrollment INTEGER DEFAULT 0;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS enrollment_deadline DATE;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS target_audience TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS target_audience_zh TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS total_hours NUMERIC;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 2. Admin RLS 策略 (关键修复)
-- 现有策略 "Providers can manage own courses" 使用 auth.uid() = provider_id
-- 导致 Admin 无法审核/编辑他人的课程
-- ==========================================
CREATE POLICY "Admins can manage all courses" ON public.courses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin')
  );

-- 3. 索引优化
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_courses_status ON public.courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_provider ON public.courses(provider_id);

-- 4. 课程报名数自增函数 (供 Webhook 调用)
-- ==========================================
CREATE OR REPLACE FUNCTION increment_course_enrollment(p_course_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.courses
  SET current_enrollment = COALESCE(current_enrollment, 0) + 1
  WHERE id = p_course_id;
END;
$$;

-- ==========================================
-- 完成提示
-- ==========================================
-- 请在 Supabase Dashboard 的 SQL Editor 中运行此脚本
-- 或使用 supabase CLI: supabase db push
