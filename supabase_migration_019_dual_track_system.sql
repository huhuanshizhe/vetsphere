-- ==========================================
-- VetSphere Migration 019: 双轨制系统重构
-- 普通用户中心 + 医生工作台 双轨架构
-- 日期: 2026-03-04
-- ==========================================

BEGIN;

-- ============================================
-- SECTION 1: 扩展 cn_user_identity_profiles 表
-- 新增 identity_group_v2 (4大类) 和 doctor_subtype
-- ============================================

-- 新增 identity_group_v2 列 - 4大粗分类
ALTER TABLE public.cn_user_identity_profiles
  ADD COLUMN IF NOT EXISTS identity_group_v2 TEXT CHECK (identity_group_v2 IN (
    'doctor', 'vet_related_staff', 'student_academic', 'other_related'
  ));

-- 新增 doctor_subtype 列 - 仅 doctor 组有值
ALTER TABLE public.cn_user_identity_profiles
  ADD COLUMN IF NOT EXISTS doctor_subtype TEXT CHECK (doctor_subtype IN (
    'veterinarian', 'assistant_doctor', 'rural_veterinarian'
  ));

-- 添加约束：非 doctor 组不应有 doctor_subtype
-- (使用 CHECK 约束实现)
ALTER TABLE public.cn_user_identity_profiles
  DROP CONSTRAINT IF EXISTS chk_doctor_subtype_consistency;
ALTER TABLE public.cn_user_identity_profiles
  ADD CONSTRAINT chk_doctor_subtype_consistency CHECK (
    (identity_group_v2 = 'doctor' AND doctor_subtype IS NOT NULL)
    OR (identity_group_v2 != 'doctor' AND doctor_subtype IS NULL)
    OR identity_group_v2 IS NULL
  );

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_cnuip_identity_group_v2 ON public.cn_user_identity_profiles(identity_group_v2);
CREATE INDEX IF NOT EXISTS idx_cnuip_doctor_subtype ON public.cn_user_identity_profiles(doctor_subtype);

-- ============================================
-- SECTION 2: 回填 cn_user_identity_profiles 存量数据
-- ============================================

-- veterinarian -> doctor + veterinarian
UPDATE public.cn_user_identity_profiles
SET identity_group_v2 = 'doctor', doctor_subtype = 'veterinarian'
WHERE identity_type = 'veterinarian' AND identity_group_v2 IS NULL;

-- assistant_doctor -> doctor + assistant_doctor
UPDATE public.cn_user_identity_profiles
SET identity_group_v2 = 'doctor', doctor_subtype = 'assistant_doctor'
WHERE identity_type = 'assistant_doctor' AND identity_group_v2 IS NULL;

-- rural_veterinarian -> doctor + rural_veterinarian
UPDATE public.cn_user_identity_profiles
SET identity_group_v2 = 'doctor', doctor_subtype = 'rural_veterinarian'
WHERE identity_type = 'rural_veterinarian' AND identity_group_v2 IS NULL;

-- nurse_care, researcher_teacher, pet_service_staff -> vet_related_staff
UPDATE public.cn_user_identity_profiles
SET identity_group_v2 = 'vet_related_staff', doctor_subtype = NULL
WHERE identity_type IN ('nurse_care', 'researcher_teacher', 'pet_service_staff')
  AND identity_group_v2 IS NULL;

-- student -> student_academic
UPDATE public.cn_user_identity_profiles
SET identity_group_v2 = 'student_academic', doctor_subtype = NULL
WHERE identity_type = 'student' AND identity_group_v2 IS NULL;

-- industry_practitioner, enthusiast, other -> other_related
UPDATE public.cn_user_identity_profiles
SET identity_group_v2 = 'other_related', doctor_subtype = NULL
WHERE identity_type IN ('industry_practitioner', 'enthusiast', 'other')
  AND identity_group_v2 IS NULL;

-- ============================================
-- SECTION 3: 扩展 cn_user_state_snapshots 表
-- ============================================

-- 新增 doctor_privilege_status 列
ALTER TABLE public.cn_user_state_snapshots
  ADD COLUMN IF NOT EXISTS doctor_privilege_status TEXT DEFAULT 'not_applicable' CHECK (doctor_privilege_status IN (
    'not_applicable', 'not_started', 'pending_review', 'approved', 'rejected'
  ));

-- 新增 identity_group_v2 列（快照冗余存储，方便查询）
ALTER TABLE public.cn_user_state_snapshots
  ADD COLUMN IF NOT EXISTS identity_group_v2 TEXT CHECK (identity_group_v2 IN (
    'doctor', 'vet_related_staff', 'student_academic', 'other_related'
  ));

-- 新增 doctor_subtype 列
ALTER TABLE public.cn_user_state_snapshots
  ADD COLUMN IF NOT EXISTS doctor_subtype TEXT CHECK (doctor_subtype IN (
    'veterinarian', 'assistant_doctor', 'rural_veterinarian'
  ));

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_cnuss_doctor_privilege ON public.cn_user_state_snapshots(doctor_privilege_status);
CREATE INDEX IF NOT EXISTS idx_cnuss_identity_group_v2 ON public.cn_user_state_snapshots(identity_group_v2);

-- ============================================
-- SECTION 4: 回填 cn_user_state_snapshots 存量数据
-- ============================================

-- 从 identity_profiles 同步 identity_group_v2 和 doctor_subtype
UPDATE public.cn_user_state_snapshots s
SET
  identity_group_v2 = i.identity_group_v2,
  doctor_subtype = i.doctor_subtype
FROM public.cn_user_identity_profiles i
WHERE s.user_id = i.user_id AND i.site_code = 'cn' AND s.site_code = 'cn';

-- 推导 doctor_privilege_status
-- 非 doctor 组 -> not_applicable
UPDATE public.cn_user_state_snapshots
SET doctor_privilege_status = 'not_applicable'
WHERE identity_group_v2 IS NOT NULL AND identity_group_v2 != 'doctor';

-- doctor 组: 根据 verification_status 推导
UPDATE public.cn_user_state_snapshots
SET doctor_privilege_status = 'approved'
WHERE identity_group_v2 = 'doctor' AND verification_status = 'approved';

UPDATE public.cn_user_state_snapshots
SET doctor_privilege_status = 'pending_review'
WHERE identity_group_v2 = 'doctor' AND verification_status IN ('submitted', 'under_review');

UPDATE public.cn_user_state_snapshots
SET doctor_privilege_status = 'rejected'
WHERE identity_group_v2 = 'doctor' AND verification_status = 'rejected';

UPDATE public.cn_user_state_snapshots
SET doctor_privilege_status = 'not_started'
WHERE identity_group_v2 = 'doctor' AND verification_status IN ('not_started', 'draft');

-- 没有身份的用户保持 not_applicable
UPDATE public.cn_user_state_snapshots
SET doctor_privilege_status = 'not_applicable'
WHERE identity_group_v2 IS NULL;

-- ============================================
-- SECTION 5: 更新映射函数
-- ============================================

-- 新增: identity_type 到 identity_group_v2 的映射
CREATE OR REPLACE FUNCTION public.map_identity_type_to_group_v2(p_identity_type TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE p_identity_type
    WHEN 'veterinarian' THEN 'doctor'
    WHEN 'assistant_doctor' THEN 'doctor'
    WHEN 'rural_veterinarian' THEN 'doctor'
    WHEN 'nurse_care' THEN 'vet_related_staff'
    WHEN 'researcher_teacher' THEN 'vet_related_staff'
    WHEN 'pet_service_staff' THEN 'vet_related_staff'
    WHEN 'student' THEN 'student_academic'
    WHEN 'industry_practitioner' THEN 'other_related'
    WHEN 'enthusiast' THEN 'other_related'
    WHEN 'other' THEN 'other_related'
    ELSE 'other_related'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 新增: identity_type 到 doctor_subtype 的映射
CREATE OR REPLACE FUNCTION public.map_identity_type_to_doctor_subtype(p_identity_type TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE p_identity_type
    WHEN 'veterinarian' THEN 'veterinarian'
    WHEN 'assistant_doctor' THEN 'assistant_doctor'
    WHEN 'rural_veterinarian' THEN 'rural_veterinarian'
    ELSE NULL
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 更新: is_verification_required 只针对3种医生
CREATE OR REPLACE FUNCTION public.is_verification_required(p_identity_type TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN p_identity_type IN ('veterinarian', 'assistant_doctor', 'rural_veterinarian');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 更新: 计算权限标记 - 加入双轨权限
CREATE OR REPLACE FUNCTION public.calculate_permission_flags(
  p_access_level TEXT,
  p_identity_group TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_flags JSONB;
BEGIN
  -- 基础权限：所有登录用户都可以访问用户中心
  v_flags := jsonb_build_object(
    'can_access_growth_system', p_access_level NOT IN ('guest'),
    'can_access_professional_courses', p_access_level = 'verified_professional',
    'can_submit_professional_application', false,
    'can_view_restricted_product_info', p_access_level = 'verified_professional',
    'can_access_user_center', p_access_level NOT IN ('guest'),
    'can_purchase_courses', p_access_level NOT IN ('guest'),
    'can_purchase_products', p_access_level NOT IN ('guest'),
    'can_manage_orders', p_access_level NOT IN ('guest'),
    'can_access_doctor_workspace', p_access_level = 'verified_professional',
    'can_access_medical_features', p_access_level = 'verified_professional'
  );

  RETURN v_flags;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- SECTION 6: 更新触发器 - identity 写入时自动填充 v2 字段
-- ============================================

CREATE OR REPLACE FUNCTION public.trigger_set_identity_group()
RETURNS TRIGGER AS $$
BEGIN
  NEW.identity_group := public.map_identity_type_to_group(NEW.identity_type);
  NEW.identity_group_v2 := public.map_identity_type_to_group_v2(NEW.identity_type);
  NEW.doctor_subtype := public.map_identity_type_to_doctor_subtype(NEW.identity_type);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SECTION 7: 更新视图 v_cn_user_full_state
-- 必须先删除再重建，因为列结构有变化
-- ============================================

DROP VIEW IF EXISTS public.v_cn_user_full_state CASCADE;

CREATE VIEW public.v_cn_user_full_state AS
SELECT 
  u.id AS user_id,
  u.mobile,
  u.status AS user_status,
  u.last_login_at,
  
  -- 资料
  p.display_name,
  p.avatar_file_id,
  p.real_name,
  p.organization_name,
  p.profile_completion_percent,
  
  -- 身份 (旧字段保留)
  i.identity_type,
  i.identity_group,
  
  -- 身份 (新V2字段)
  i.identity_group_v2,
  i.doctor_subtype,
  
  -- 状态快照
  s.onboarding_status,
  s.verification_status,
  s.verification_required,
  s.verification_reject_reason,
  s.identity_verified_flag,
  s.access_level,
  s.permission_flags,
  s.redirect_hint,
  
  -- 双轨新字段
  s.doctor_privilege_status
  
FROM public.cn_users u
LEFT JOIN public.cn_user_profiles p ON u.id = p.user_id AND p.site_code = 'cn'
LEFT JOIN public.cn_user_identity_profiles i ON u.id = i.user_id AND i.site_code = 'cn'
LEFT JOIN public.cn_user_state_snapshots s ON u.id = s.user_id AND s.site_code = 'cn';

-- ============================================
-- SECTION 8: 更新状态快照触发器
-- 在快照自动更新时同步 v2 字段和 doctor_privilege_status
-- ============================================

CREATE OR REPLACE FUNCTION public.trigger_update_user_state_snapshot()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_site_code TEXT := 'cn';
  v_onboarding_status TEXT := 'not_started';
  v_identity_type TEXT;
  v_identity_group TEXT;
  v_identity_group_v2 TEXT;
  v_doctor_subtype TEXT;
  v_verification_status TEXT := 'not_started';
  v_verification_required BOOLEAN := false;
  v_verification_reject_reason TEXT;
  v_access_level TEXT;
  v_redirect_hint TEXT;
  v_permission_flags JSONB;
  v_doctor_privilege_status TEXT := 'not_applicable';
BEGIN
  -- 获取用户ID
  IF TG_TABLE_NAME = 'cn_user_profiles' THEN
    v_user_id := COALESCE(NEW.user_id, OLD.user_id);
  ELSIF TG_TABLE_NAME = 'cn_user_identity_profiles' THEN
    v_user_id := COALESCE(NEW.user_id, OLD.user_id);
  ELSIF TG_TABLE_NAME = 'cn_verification_requests' THEN
    v_user_id := COALESCE(NEW.user_id, OLD.user_id);
  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  IF v_user_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- 获取身份信息（含v2字段）
  SELECT identity_type, identity_group, identity_group_v2, doctor_subtype
  INTO v_identity_type, v_identity_group, v_identity_group_v2, v_doctor_subtype
  FROM public.cn_user_identity_profiles
  WHERE user_id = v_user_id AND site_code = v_site_code;
  
  -- 计算引导状态
  IF v_identity_type IS NULL THEN
    v_onboarding_status := 'identity_pending';
  ELSE
    IF EXISTS (
      SELECT 1 FROM public.cn_user_profiles
      WHERE user_id = v_user_id AND site_code = v_site_code
      AND display_name IS NOT NULL AND display_name != ''
    ) THEN
      v_onboarding_status := 'completed';
    ELSE
      v_onboarding_status := 'profile_pending';
    END IF;
  END IF;
  
  -- 判断是否需要认证（仅3种医生）
  v_verification_required := public.is_verification_required(v_identity_type);
  
  -- 获取最新认证状态
  SELECT status, reject_reason
  INTO v_verification_status, v_verification_reject_reason
  FROM public.cn_verification_requests
  WHERE user_id = v_user_id AND site_code = v_site_code
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_verification_status IS NULL THEN
    v_verification_status := 'not_started';
  END IF;
  
  -- 计算 doctor_privilege_status
  IF v_identity_group_v2 = 'doctor' THEN
    CASE v_verification_status
      WHEN 'approved' THEN v_doctor_privilege_status := 'approved';
      WHEN 'submitted' THEN v_doctor_privilege_status := 'pending_review';
      WHEN 'under_review' THEN v_doctor_privilege_status := 'pending_review';
      WHEN 'rejected' THEN v_doctor_privilege_status := 'rejected';
      ELSE v_doctor_privilege_status := 'not_started';
    END CASE;
  ELSE
    v_doctor_privilege_status := 'not_applicable';
  END IF;
  
  -- 计算权限等级
  v_access_level := public.calculate_access_level(v_onboarding_status, v_verification_status, v_verification_required);
  
  -- 计算跳转提示
  v_redirect_hint := public.calculate_redirect_hint(v_onboarding_status, v_verification_status, v_verification_required);
  
  -- 计算权限标记
  v_permission_flags := public.calculate_permission_flags(v_access_level, v_identity_group);
  
  -- 更新或插入状态快照
  INSERT INTO public.cn_user_state_snapshots (
    user_id, site_code, onboarding_status, identity_type, identity_group,
    identity_group_v2, doctor_subtype,
    identity_verified_flag, verification_status, verification_required,
    verification_reject_reason, access_level, permission_flags, redirect_hint,
    doctor_privilege_status
  ) VALUES (
    v_user_id, v_site_code, v_onboarding_status, v_identity_type, v_identity_group,
    v_identity_group_v2, v_doctor_subtype,
    (v_verification_status = 'approved'), v_verification_status, v_verification_required,
    v_verification_reject_reason, v_access_level, v_permission_flags, v_redirect_hint,
    v_doctor_privilege_status
  )
  ON CONFLICT (user_id, site_code) DO UPDATE SET
    onboarding_status = EXCLUDED.onboarding_status,
    identity_type = EXCLUDED.identity_type,
    identity_group = EXCLUDED.identity_group,
    identity_group_v2 = EXCLUDED.identity_group_v2,
    doctor_subtype = EXCLUDED.doctor_subtype,
    identity_verified_flag = EXCLUDED.identity_verified_flag,
    verification_status = EXCLUDED.verification_status,
    verification_required = EXCLUDED.verification_required,
    verification_reject_reason = EXCLUDED.verification_reject_reason,
    access_level = EXCLUDED.access_level,
    permission_flags = EXCLUDED.permission_flags,
    redirect_hint = EXCLUDED.redirect_hint,
    doctor_privilege_status = EXCLUDED.doctor_privilege_status,
    updated_at = NOW();
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 完成
-- ============================================

COMMIT;

COMMENT ON FUNCTION public.map_identity_type_to_group_v2 IS '身份类型到V2四大分组的映射函数';
COMMENT ON FUNCTION public.map_identity_type_to_doctor_subtype IS '身份类型到医生子类型的映射函数';
