-- ==========================================
-- VetSphere Migration 020: 课程状态模型重构
-- 3 种状态: pending(待审核) / published(已上架) / offline(已下架)
-- 自动下架过期课程
-- 日期: 2026-03-05
-- ==========================================

BEGIN;

-- ============================================
-- 1. 添加下架跟踪字段
-- ============================================

ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS offline_reason TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS offline_at TIMESTAMPTZ;

COMMENT ON COLUMN public.courses.offline_reason IS '下架原因: expired(过期自动下架) | manual(管理员手动下架)';
COMMENT ON COLUMN public.courses.offline_at IS '下架时间';

-- ============================================
-- 2. 标准化所有状态值为小写 + 清理旧的 rejected 状态
-- ============================================

-- 先统一所有 PascalCase 为 lowercase
UPDATE public.courses SET status = LOWER(status) WHERE status != LOWER(status);

-- 将 rejected → pending
UPDATE public.courses
SET status = 'pending', rejection_reason = NULL
WHERE status = 'rejected';

-- ============================================
-- 3. 自动下架过期课程函数
--    将 end_date < CURRENT_DATE 且 status = 'published' 的课程标记为 offline
--    同时删除对应 course_site_views 记录
-- ============================================

CREATE OR REPLACE FUNCTION public.auto_offline_expired_courses()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  -- 删除已过期课程的站点视图
  DELETE FROM public.course_site_views
  WHERE course_id IN (
    SELECT id FROM public.courses
    WHERE status = 'published'
      AND end_date IS NOT NULL
      AND end_date < CURRENT_DATE
  );

  -- 更新课程状态为 offline
  UPDATE public.courses
  SET
    status = 'offline',
    offline_reason = 'expired',
    offline_at = NOW(),
    updated_at = NOW()
  WHERE status = 'published'
    AND end_date IS NOT NULL
    AND end_date < CURRENT_DATE;

  GET DIAGNOSTICS affected_count = ROW_COUNT;

  RETURN affected_count;
END;
$$;

COMMENT ON FUNCTION public.auto_offline_expired_courses() IS '自动下架过期课程，每日定时调用';

-- ============================================
-- 4. 如果有 pg_cron 扩展，设置每日凌晨 2:00 执行
--    如果没有 pg_cron，可在 admin 中手动触发或忽略此段
-- ============================================

-- 注意: pg_cron 需要在 Supabase Dashboard > Database > Extensions 中启用
-- 执行前请确认 pg_cron 已启用，否则注释掉以下两行

-- SELECT cron.schedule(
--   'auto-offline-expired-courses',
--   '0 2 * * *',
--   'SELECT public.auto_offline_expired_courses()'
-- );

COMMIT;
