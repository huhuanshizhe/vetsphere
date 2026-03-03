-- Migration 013: Doctor Applications System
-- 医生申请认证系统 - 支持多步骤注册、审核流程

-- ============================================
-- 1. 创建 doctor_applications 表
-- ============================================

CREATE TABLE IF NOT EXISTS public.doctor_applications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 状态: draft(草稿) | pending_review(待审核) | approved(已通过) | rejected(已拒绝)
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected')),
  
  -- 基本信息
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  province TEXT,
  city TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  
  -- 执业信息
  hospital_name TEXT NOT NULL DEFAULT '',
  position TEXT NOT NULL DEFAULT '',
  specialties JSONB NOT NULL DEFAULT '[]',
  years_of_experience INTEGER,
  
  -- 资质材料
  license_image_url TEXT,
  supplementary_urls JSONB DEFAULT '[]',
  credential_notes TEXT,
  
  -- 可选信息
  nickname TEXT,
  email TEXT,
  bio TEXT,
  
  -- 审核信息
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  
  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 每个用户只能有一个申请记录
  CONSTRAINT unique_user_application UNIQUE (user_id)
);

-- ============================================
-- 2. 创建索引
-- ============================================

CREATE INDEX IF NOT EXISTS idx_doctor_applications_status 
  ON public.doctor_applications(status);

CREATE INDEX IF NOT EXISTS idx_doctor_applications_submitted 
  ON public.doctor_applications(submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_doctor_applications_user_id 
  ON public.doctor_applications(user_id);

-- ============================================
-- 3. 启用 RLS
-- ============================================

ALTER TABLE public.doctor_applications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. RLS 策略
-- ============================================

-- 用户查看自己的申请
CREATE POLICY "doctor_applications_select_own" ON public.doctor_applications
  FOR SELECT USING (auth.uid() = user_id);

-- 用户创建自己的申请
CREATE POLICY "doctor_applications_insert_own" ON public.doctor_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 用户更新草稿或被拒申请 (只能修改自己的)
CREATE POLICY "doctor_applications_update_own" ON public.doctor_applications
  FOR UPDATE USING (
    auth.uid() = user_id 
    AND status IN ('draft', 'rejected')
  );

-- 管理员完全访问 (通过 profiles 表检查 role)
CREATE POLICY "doctor_applications_admin_all" ON public.doctor_applications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'Admin'
    )
  );

-- ============================================
-- 5. 创建 updated_at 触发器
-- ============================================

CREATE OR REPLACE FUNCTION update_doctor_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_doctor_applications_updated_at
  BEFORE UPDATE ON public.doctor_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_doctor_applications_updated_at();

-- ============================================
-- 6. Storage Bucket for Credentials (需要在Supabase Dashboard手动创建)
-- Bucket name: doctor-credentials
-- 允许: 已认证用户上传自己的文件
-- 管理员可查看所有文件
-- ============================================

-- 注意: Storage bucket 需要通过 Supabase Dashboard 或 CLI 创建:
-- supabase storage create doctor-credentials --public=false

-- Storage RLS 策略建议:
-- 1. 用户可上传到自己的目录: {user_id}/license.jpg
-- 2. 用户可读取自己的文件
-- 3. 管理员可读取所有文件

-- ============================================
-- 7. 同步函数: 审核通过后更新 profiles 表
-- ============================================

CREATE OR REPLACE FUNCTION sync_approved_doctor_to_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- 当申请状态变为 approved 时，同步信息到 profiles 表
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    UPDATE public.profiles
    SET 
      full_name = NEW.full_name,
      avatar_url = COALESCE(NEW.avatar_url, profiles.avatar_url),
      role = 'Doctor',
      updated_at = NOW()
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_sync_approved_doctor
  AFTER UPDATE ON public.doctor_applications
  FOR EACH ROW
  EXECUTE FUNCTION sync_approved_doctor_to_profile();

-- ============================================
-- 完成
-- ============================================

COMMENT ON TABLE public.doctor_applications IS '医生入驻申请表 - 存储医生注册申请信息和审核状态';
COMMENT ON COLUMN public.doctor_applications.status IS '申请状态: draft(草稿), pending_review(待审核), approved(已通过), rejected(已拒绝)';
COMMENT ON COLUMN public.doctor_applications.specialties IS '专科方向 JSON 数组, 如 ["全科", "外科", "内科"]';
