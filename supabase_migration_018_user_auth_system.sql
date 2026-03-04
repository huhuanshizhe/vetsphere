-- ==========================================
-- VetSphere Migration 018: CN站用户认证体系
-- 完整用户注册/身份/认证系统 - 支持多身份、专业认证、权限分级
-- 日期: 2026-03-04
-- ==========================================

BEGIN;

-- ============================================
-- SECTION 1: 枚举类型定义
-- ============================================

-- 身份类型枚举
DO $$ BEGIN
  CREATE TYPE public.identity_type_enum AS ENUM (
    'veterinarian',        -- 宠物医生/执业兽医
    'assistant_doctor',    -- 助理医生/医疗助理
    'nurse_care',          -- 护理人员
    'student',             -- 动物医学院校学生
    'researcher_teacher',  -- 研究/教学人员
    'pet_service_staff',   -- 宠物店护理/行业服务人员
    'industry_practitioner', -- 其他相关从业者
    'enthusiast',          -- 爱好者/关注者
    'other'                -- 其他
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 身份分组枚举
DO $$ BEGIN
  CREATE TYPE public.identity_group_enum AS ENUM (
    'professional',        -- 专业类(医生/助理/护理)
    'student',             -- 学生类
    'industry_related',    -- 行业相关(研究/服务/从业者)
    'general'              -- 普通用户(爱好者/其他)
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 引导状态枚举
DO $$ BEGIN
  CREATE TYPE public.onboarding_status_enum AS ENUM (
    'not_started',         -- 未开始
    'identity_pending',    -- 待选择身份
    'profile_pending',     -- 待完善资料
    'completed',           -- 已完成
    'skipped_temp'         -- 临时跳过
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 认证状态枚举
DO $$ BEGIN
  CREATE TYPE public.verification_status_enum AS ENUM (
    'not_started',         -- 未开始
    'draft',               -- 草稿
    'submitted',           -- 已提交
    'under_review',        -- 审核中
    'approved',            -- 已通过
    'rejected',            -- 已驳回
    'expired',             -- 已过期
    'cancelled'            -- 已取消
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 权限等级枚举
DO $$ BEGIN
  CREATE TYPE public.access_level_enum AS ENUM (
    'guest',               -- 游客
    'registered_basic',    -- 已注册未建档
    'profiled_user',       -- 已建档未认证
    'verification_pending', -- 认证待审核
    'verified_professional' -- 已认证专业用户
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 用户状态枚举
DO $$ BEGIN
  CREATE TYPE public.user_status_enum AS ENUM (
    'active',              -- 正常
    'disabled',            -- 禁用
    'banned'               -- 封禁
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- SECTION 2: cn_users 中国站账号主表
-- 与auth.users关联，存储中国站特有账号信息
-- ============================================

CREATE TABLE IF NOT EXISTS public.cn_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  mobile TEXT UNIQUE,
  mobile_verified BOOLEAN DEFAULT false,
  password_hash TEXT,                          -- 可为空(验证码注册用户)
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'banned')),
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  last_login_ip TEXT,
  login_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cn_users_mobile ON public.cn_users(mobile);
CREATE INDEX IF NOT EXISTS idx_cn_users_status ON public.cn_users(status);

ALTER TABLE public.cn_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cn_users_select_own" ON public.cn_users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "cn_users_update_own" ON public.cn_users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "cn_users_admin_all" ON public.cn_users
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin')
  );

-- ============================================
-- SECTION 3: cn_user_profiles 中国站用户资料表
-- ============================================

CREATE TABLE IF NOT EXISTS public.cn_user_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_code TEXT DEFAULT 'cn' REFERENCES public.sites(code),
  
  -- 基础资料
  display_name TEXT,
  real_name TEXT,
  avatar_file_id TEXT,
  gender TEXT CHECK (gender IN ('male', 'female', 'unknown', 'prefer_not_to_say')),
  city_code TEXT,
  
  -- 职业信息
  organization_name TEXT,                      -- 医院/学校/机构/公司名称
  job_title TEXT,                              -- 岗位
  experience_years INTEGER CHECK (experience_years >= 0 AND experience_years <= 60),
  
  -- 兴趣与标签
  interest_tags JSONB DEFAULT '[]',            -- ["内科","外科","影像"]
  bio TEXT,
  
  -- 身份动态字段(JSON存储，按identity_type解析)
  identity_fields JSONB DEFAULT '{}',
  
  -- 完成度
  profile_completion_percent INTEGER DEFAULT 0 CHECK (profile_completion_percent >= 0 AND profile_completion_percent <= 100),
  profile_completion_status TEXT DEFAULT 'incomplete' CHECK (profile_completion_status IN ('incomplete', 'basic', 'complete')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE (user_id, site_code)
);

CREATE INDEX IF NOT EXISTS idx_cnup_user_id ON public.cn_user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_cnup_site_code ON public.cn_user_profiles(site_code);

ALTER TABLE public.cn_user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cnup_select_own" ON public.cn_user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "cnup_insert_own" ON public.cn_user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cnup_update_own" ON public.cn_user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "cnup_admin_all" ON public.cn_user_profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin')
  );

-- ============================================
-- SECTION 4: cn_user_identity_profiles 身份选择表
-- ============================================

CREATE TABLE IF NOT EXISTS public.cn_user_identity_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_code TEXT DEFAULT 'cn' REFERENCES public.sites(code),
  
  -- 身份信息
  identity_type TEXT NOT NULL CHECK (identity_type IN (
    'veterinarian', 'assistant_doctor', 'nurse_care', 'student',
    'researcher_teacher', 'pet_service_staff', 'industry_practitioner',
    'enthusiast', 'other'
  )),
  identity_group TEXT CHECK (identity_group IN (
    'professional', 'student', 'industry_related', 'general'
  )),
  
  -- 选择元数据
  identity_selected_at TIMESTAMPTZ DEFAULT NOW(),
  identity_selection_source TEXT DEFAULT 'first_login' CHECK (
    identity_selection_source IN ('first_login', 'profile_edit', 'forced_gate')
  ),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE (user_id, site_code)
);

CREATE INDEX IF NOT EXISTS idx_cnuip_user_id ON public.cn_user_identity_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_cnuip_identity_type ON public.cn_user_identity_profiles(identity_type);
CREATE INDEX IF NOT EXISTS idx_cnuip_identity_group ON public.cn_user_identity_profiles(identity_group);

ALTER TABLE public.cn_user_identity_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cnuip_select_own" ON public.cn_user_identity_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "cnuip_insert_own" ON public.cn_user_identity_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cnuip_update_own" ON public.cn_user_identity_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "cnuip_admin_all" ON public.cn_user_identity_profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin')
  );

-- ============================================
-- SECTION 5: cn_verification_requests 专业认证申请表
-- ============================================

CREATE TABLE IF NOT EXISTS public.cn_verification_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_code TEXT DEFAULT 'cn' REFERENCES public.sites(code),
  
  -- 认证类型(与身份对应)
  verification_type TEXT NOT NULL CHECK (verification_type IN (
    'veterinarian', 'assistant_doctor', 'nurse_care', 'student', 'researcher_teacher'
  )),
  
  -- 状态
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'submitted', 'under_review', 'approved', 'rejected', 'expired', 'cancelled'
  )),
  
  -- 基本认证信息
  real_name TEXT NOT NULL DEFAULT '',
  organization_name TEXT NOT NULL DEFAULT '',
  position_title TEXT NOT NULL DEFAULT '',
  specialty_tags JSONB DEFAULT '[]',
  verification_note TEXT,
  
  -- 身份专属字段(JSON存储)
  type_specific_fields JSONB DEFAULT '{}',
  
  -- 声明
  agree_verification_statement BOOLEAN DEFAULT false,
  
  -- 提交与审核
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  reject_reason TEXT,
  approved_level TEXT,
  
  -- 快照(提交时的完整数据副本)
  snapshot_json JSONB,
  
  -- 版本控制(支持驳回后重提)
  version INTEGER DEFAULT 1,
  parent_request_id UUID REFERENCES public.cn_verification_requests(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cnvr_user_id ON public.cn_verification_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_cnvr_status ON public.cn_verification_requests(status);
CREATE INDEX IF NOT EXISTS idx_cnvr_verification_type ON public.cn_verification_requests(verification_type);
CREATE INDEX IF NOT EXISTS idx_cnvr_submitted_at ON public.cn_verification_requests(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_cnvr_site_status ON public.cn_verification_requests(site_code, status);

ALTER TABLE public.cn_verification_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cnvr_select_own" ON public.cn_verification_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "cnvr_insert_own" ON public.cn_verification_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cnvr_update_own_draft" ON public.cn_verification_requests
  FOR UPDATE USING (
    auth.uid() = user_id AND status IN ('draft', 'rejected')
  );

CREATE POLICY "cnvr_admin_all" ON public.cn_verification_requests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin')
  );

-- ============================================
-- SECTION 6: cn_verification_documents 认证材料表
-- ============================================

CREATE TABLE IF NOT EXISTS public.cn_verification_documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  verification_request_id UUID NOT NULL REFERENCES public.cn_verification_requests(id) ON DELETE CASCADE,
  
  -- 文件信息
  file_id TEXT NOT NULL,                       -- 关联media_files或storage
  file_url TEXT,
  file_name TEXT,
  file_type TEXT,                              -- image/pdf
  file_size INTEGER,
  
  -- 材料类型
  doc_type TEXT CHECK (doc_type IN (
    'license', 'work_badge', 'employment_proof', 'hospital_certificate',
    'student_id', 'school_proof', 'institution_proof', 'profile_page', 'other'
  )),
  doc_type_desc TEXT,                          -- 用户描述材料类型
  
  -- 排序
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cnvd_request_id ON public.cn_verification_documents(verification_request_id);

ALTER TABLE public.cn_verification_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cnvd_select_own" ON public.cn_verification_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.cn_verification_requests vr
      WHERE vr.id = verification_request_id AND vr.user_id = auth.uid()
    )
  );

CREATE POLICY "cnvd_insert_own" ON public.cn_verification_documents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cn_verification_requests vr
      WHERE vr.id = verification_request_id AND vr.user_id = auth.uid()
    )
  );

CREATE POLICY "cnvd_delete_own" ON public.cn_verification_documents
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.cn_verification_requests vr
      WHERE vr.id = verification_request_id AND vr.user_id = auth.uid()
      AND vr.status IN ('draft', 'rejected')
    )
  );

CREATE POLICY "cnvd_admin_all" ON public.cn_verification_documents
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin')
  );

-- ============================================
-- SECTION 7: cn_user_state_snapshots 用户状态快照表
-- 聚合用户当前状态，减少多表联查
-- ============================================

CREATE TABLE IF NOT EXISTS public.cn_user_state_snapshots (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_code TEXT DEFAULT 'cn' REFERENCES public.sites(code),
  
  -- 引导状态
  onboarding_status TEXT DEFAULT 'not_started' CHECK (onboarding_status IN (
    'not_started', 'identity_pending', 'profile_pending', 'completed', 'skipped_temp'
  )),
  
  -- 身份状态
  identity_type TEXT,
  identity_group TEXT,
  identity_verified_flag BOOLEAN DEFAULT false,
  
  -- 认证状态
  verification_status TEXT DEFAULT 'not_started' CHECK (verification_status IN (
    'not_started', 'draft', 'submitted', 'under_review', 'approved', 'rejected', 'expired', 'cancelled'
  )),
  verification_required BOOLEAN DEFAULT false,
  verification_reject_reason TEXT,
  
  -- 权限等级
  access_level TEXT DEFAULT 'guest' CHECK (access_level IN (
    'guest', 'registered_basic', 'profiled_user', 'verification_pending', 'verified_professional'
  )),
  
  -- 权限标记
  permission_flags JSONB DEFAULT '{
    "can_access_growth_system": false,
    "can_access_professional_courses": false,
    "can_submit_professional_application": false,
    "can_view_restricted_product_info": false
  }',
  
  -- 跳转提示(前端使用)
  redirect_hint TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE (user_id, site_code)
);

CREATE INDEX IF NOT EXISTS idx_cnuss_user_id ON public.cn_user_state_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_cnuss_access_level ON public.cn_user_state_snapshots(access_level);
CREATE INDEX IF NOT EXISTS idx_cnuss_onboarding ON public.cn_user_state_snapshots(onboarding_status);

ALTER TABLE public.cn_user_state_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cnuss_select_own" ON public.cn_user_state_snapshots
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "cnuss_admin_all" ON public.cn_user_state_snapshots
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin')
  );

-- ============================================
-- SECTION 8: sms_verification_codes 短信验证码表
-- ============================================

CREATE TABLE IF NOT EXISTS public.sms_verification_codes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  mobile TEXT NOT NULL,
  code TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('register', 'login', 'reset_password', 'bind_mobile')),
  
  -- 频控
  ip_address TEXT,
  device_id TEXT,
  
  -- 状态
  is_used BOOLEAN DEFAULT false,
  used_at TIMESTAMPTZ,
  
  -- 有效期
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- 错误计数
  error_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_svc_mobile ON public.sms_verification_codes(mobile);
CREATE INDEX IF NOT EXISTS idx_svc_mobile_purpose ON public.sms_verification_codes(mobile, purpose);
CREATE INDEX IF NOT EXISTS idx_svc_expires ON public.sms_verification_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_svc_ip ON public.sms_verification_codes(ip_address);

-- 清理过期验证码(可定时执行)
-- DELETE FROM public.sms_verification_codes WHERE expires_at < NOW() - INTERVAL '1 day';

-- ============================================
-- SECTION 9: 触发器 - updated_at 自动更新
-- ============================================

DO $$ 
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'cn_users',
    'cn_user_profiles',
    'cn_user_identity_profiles',
    'cn_verification_requests',
    'cn_user_state_snapshots'
  ]) LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS set_updated_at ON public.%I; 
       CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I 
       FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();',
      tbl, tbl
    );
  END LOOP;
END $$;

-- ============================================
-- SECTION 10: 函数 - 身份类型到分组映射
-- ============================================

CREATE OR REPLACE FUNCTION public.map_identity_type_to_group(p_identity_type TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE p_identity_type
    WHEN 'veterinarian' THEN 'professional'
    WHEN 'assistant_doctor' THEN 'professional'
    WHEN 'nurse_care' THEN 'professional'
    WHEN 'student' THEN 'student'
    WHEN 'researcher_teacher' THEN 'industry_related'
    WHEN 'pet_service_staff' THEN 'industry_related'
    WHEN 'industry_practitioner' THEN 'industry_related'
    WHEN 'enthusiast' THEN 'general'
    WHEN 'other' THEN 'general'
    ELSE 'general'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- SECTION 11: 函数 - 判断身份是否需要认证
-- ============================================

CREATE OR REPLACE FUNCTION public.is_verification_required(p_identity_type TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN p_identity_type IN (
    'veterinarian', 'assistant_doctor', 'nurse_care', 'student', 'researcher_teacher'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- SECTION 12: 函数 - 计算权限等级
-- ============================================

CREATE OR REPLACE FUNCTION public.calculate_access_level(
  p_onboarding_status TEXT,
  p_verification_status TEXT,
  p_verification_required BOOLEAN
)
RETURNS TEXT AS $$
BEGIN
  -- 未完成引导
  IF p_onboarding_status IN ('not_started', 'identity_pending', 'profile_pending', 'skipped_temp') THEN
    RETURN 'registered_basic';
  END IF;
  
  -- 已完成引导，检查认证状态
  IF p_onboarding_status = 'completed' THEN
    -- 已通过认证
    IF p_verification_status = 'approved' THEN
      RETURN 'verified_professional';
    END IF;
    
    -- 认证待审核
    IF p_verification_status IN ('submitted', 'under_review') THEN
      RETURN 'verification_pending';
    END IF;
    
    -- 需要认证但未认证
    IF p_verification_required AND p_verification_status IN ('not_started', 'draft', 'rejected') THEN
      RETURN 'profiled_user';
    END IF;
    
    -- 不需要认证或普通用户
    RETURN 'profiled_user';
  END IF;
  
  RETURN 'registered_basic';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- SECTION 13: 函数 - 计算跳转提示
-- ============================================

CREATE OR REPLACE FUNCTION public.calculate_redirect_hint(
  p_onboarding_status TEXT,
  p_verification_status TEXT,
  p_verification_required BOOLEAN
)
RETURNS TEXT AS $$
BEGIN
  -- 身份待选择
  IF p_onboarding_status = 'identity_pending' THEN
    RETURN 'go_identity_select';
  END IF;
  
  -- 资料待完善
  IF p_onboarding_status = 'profile_pending' THEN
    RETURN 'go_profile_complete';
  END IF;
  
  -- 已完成引导
  IF p_onboarding_status = 'completed' THEN
    -- 认证被驳回
    IF p_verification_status = 'rejected' THEN
      RETURN 'show_rejection_prompt';
    END IF;
    
    -- 需要认证但未开始
    IF p_verification_required AND p_verification_status IN ('not_started', 'draft') THEN
      RETURN 'show_verification_prompt';
    END IF;
    
    -- 认证审核中
    IF p_verification_status IN ('submitted', 'under_review') THEN
      RETURN 'show_verification_pending';
    END IF;
  END IF;
  
  RETURN 'go_home';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- SECTION 14: 函数 - 计算权限标记
-- ============================================

CREATE OR REPLACE FUNCTION public.calculate_permission_flags(
  p_access_level TEXT,
  p_identity_group TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_flags JSONB;
BEGIN
  v_flags := jsonb_build_object(
    'can_access_growth_system', false,
    'can_access_professional_courses', false,
    'can_submit_professional_application', false,
    'can_view_restricted_product_info', false
  );
  
  -- guest - 无权限
  IF p_access_level = 'guest' THEN
    RETURN v_flags;
  END IF;
  
  -- registered_basic - 基础权限
  IF p_access_level = 'registered_basic' THEN
    RETURN v_flags;
  END IF;
  
  -- profiled_user - 可访问部分功能
  IF p_access_level = 'profiled_user' THEN
    v_flags := v_flags || jsonb_build_object(
      'can_access_growth_system', true,
      'can_submit_professional_application', p_identity_group IN ('professional', 'student', 'industry_related')
    );
    RETURN v_flags;
  END IF;
  
  -- verification_pending - 等待认证
  IF p_access_level = 'verification_pending' THEN
    v_flags := v_flags || jsonb_build_object(
      'can_access_growth_system', true,
      'can_submit_professional_application', false
    );
    RETURN v_flags;
  END IF;
  
  -- verified_professional - 完整权限
  IF p_access_level = 'verified_professional' THEN
    v_flags := jsonb_build_object(
      'can_access_growth_system', true,
      'can_access_professional_courses', true,
      'can_submit_professional_application', false,
      'can_view_restricted_product_info', true
    );
    RETURN v_flags;
  END IF;
  
  RETURN v_flags;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- SECTION 15: 触发器 - 身份选择后自动设置分组
-- ============================================

CREATE OR REPLACE FUNCTION public.trigger_set_identity_group()
RETURNS TRIGGER AS $$
BEGIN
  NEW.identity_group := public.map_identity_type_to_group(NEW.identity_type);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_identity_group ON public.cn_user_identity_profiles;
CREATE TRIGGER set_identity_group
  BEFORE INSERT OR UPDATE ON public.cn_user_identity_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_identity_group();

-- ============================================
-- SECTION 16: 触发器 - 状态快照自动更新
-- ============================================

CREATE OR REPLACE FUNCTION public.trigger_update_user_state_snapshot()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_site_code TEXT := 'cn';
  v_onboarding_status TEXT := 'not_started';
  v_identity_type TEXT;
  v_identity_group TEXT;
  v_verification_status TEXT := 'not_started';
  v_verification_required BOOLEAN := false;
  v_verification_reject_reason TEXT;
  v_access_level TEXT;
  v_redirect_hint TEXT;
  v_permission_flags JSONB;
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
  
  -- 获取身份信息
  SELECT identity_type, identity_group
  INTO v_identity_type, v_identity_group
  FROM public.cn_user_identity_profiles
  WHERE user_id = v_user_id AND site_code = v_site_code;
  
  -- 计算引导状态
  IF v_identity_type IS NULL THEN
    v_onboarding_status := 'identity_pending';
  ELSE
    -- 检查资料是否完善
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
  
  -- 判断是否需要认证
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
  
  -- 计算权限等级
  v_access_level := public.calculate_access_level(v_onboarding_status, v_verification_status, v_verification_required);
  
  -- 计算跳转提示
  v_redirect_hint := public.calculate_redirect_hint(v_onboarding_status, v_verification_status, v_verification_required);
  
  -- 计算权限标记
  v_permission_flags := public.calculate_permission_flags(v_access_level, v_identity_group);
  
  -- 更新或插入状态快照
  INSERT INTO public.cn_user_state_snapshots (
    user_id, site_code, onboarding_status, identity_type, identity_group,
    identity_verified_flag, verification_status, verification_required,
    verification_reject_reason, access_level, permission_flags, redirect_hint
  ) VALUES (
    v_user_id, v_site_code, v_onboarding_status, v_identity_type, v_identity_group,
    (v_verification_status = 'approved'), v_verification_status, v_verification_required,
    v_verification_reject_reason, v_access_level, v_permission_flags, v_redirect_hint
  )
  ON CONFLICT (user_id, site_code) DO UPDATE SET
    onboarding_status = EXCLUDED.onboarding_status,
    identity_type = EXCLUDED.identity_type,
    identity_group = EXCLUDED.identity_group,
    identity_verified_flag = EXCLUDED.identity_verified_flag,
    verification_status = EXCLUDED.verification_status,
    verification_required = EXCLUDED.verification_required,
    verification_reject_reason = EXCLUDED.verification_reject_reason,
    access_level = EXCLUDED.access_level,
    permission_flags = EXCLUDED.permission_flags,
    redirect_hint = EXCLUDED.redirect_hint,
    updated_at = NOW();
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 在相关表上创建触发器
DROP TRIGGER IF EXISTS update_state_snapshot ON public.cn_user_profiles;
CREATE TRIGGER update_state_snapshot
  AFTER INSERT OR UPDATE ON public.cn_user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_user_state_snapshot();

DROP TRIGGER IF EXISTS update_state_snapshot ON public.cn_user_identity_profiles;
CREATE TRIGGER update_state_snapshot
  AFTER INSERT OR UPDATE ON public.cn_user_identity_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_user_state_snapshot();

DROP TRIGGER IF EXISTS update_state_snapshot ON public.cn_verification_requests;
CREATE TRIGGER update_state_snapshot
  AFTER INSERT OR UPDATE ON public.cn_verification_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_user_state_snapshot();

-- ============================================
-- SECTION 17: 视图 - 用户完整状态(GET /api/auth/me 使用)
-- ============================================

CREATE OR REPLACE VIEW public.v_cn_user_full_state AS
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
  
  -- 身份
  i.identity_type,
  i.identity_group,
  
  -- 状态快照
  s.onboarding_status,
  s.verification_status,
  s.verification_required,
  s.verification_reject_reason,
  s.identity_verified_flag,
  s.access_level,
  s.permission_flags,
  s.redirect_hint
  
FROM public.cn_users u
LEFT JOIN public.cn_user_profiles p ON u.id = p.user_id AND p.site_code = 'cn'
LEFT JOIN public.cn_user_identity_profiles i ON u.id = i.user_id AND i.site_code = 'cn'
LEFT JOIN public.cn_user_state_snapshots s ON u.id = s.user_id AND s.site_code = 'cn';

-- ============================================
-- SECTION 18: Admin审核日志表
-- ============================================

CREATE TABLE IF NOT EXISTS public.cn_verification_audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  verification_request_id UUID NOT NULL REFERENCES public.cn_verification_requests(id) ON DELETE CASCADE,
  
  -- 审核信息
  action TEXT NOT NULL CHECK (action IN ('submit', 'start_review', 'approve', 'reject', 'request_resubmit')),
  admin_user_id UUID REFERENCES auth.users(id),
  admin_name TEXT,
  
  -- 详情
  from_status TEXT,
  to_status TEXT,
  reject_reason TEXT,
  review_note TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cnval_request ON public.cn_verification_audit_logs(verification_request_id);
CREATE INDEX IF NOT EXISTS idx_cnval_admin ON public.cn_verification_audit_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_cnval_created ON public.cn_verification_audit_logs(created_at DESC);

ALTER TABLE public.cn_verification_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cnval_admin_all" ON public.cn_verification_audit_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin')
  );

-- ============================================
-- 完成
-- ============================================

COMMIT;

-- ============================================
-- 注释
-- ============================================

COMMENT ON TABLE public.cn_users IS '中国站用户账号主表 - 存储手机号、密码、登录信息';
COMMENT ON TABLE public.cn_user_profiles IS '中国站用户资料表 - 基础信息、职业信息、兴趣标签';
COMMENT ON TABLE public.cn_user_identity_profiles IS '中国站用户身份表 - 身份类型、分组';
COMMENT ON TABLE public.cn_verification_requests IS '中国站专业认证申请表 - 认证类型、状态、审核信息';
COMMENT ON TABLE public.cn_verification_documents IS '中国站认证材料表 - 文件信息、材料类型';
COMMENT ON TABLE public.cn_user_state_snapshots IS '中国站用户状态快照表 - 聚合状态供前端使用';
COMMENT ON TABLE public.sms_verification_codes IS '短信验证码表 - 验证码、频控、有效期';
COMMENT ON TABLE public.cn_verification_audit_logs IS '中国站认证审核日志表 - 审核动作记录';

COMMENT ON FUNCTION public.map_identity_type_to_group IS '身份类型到分组的映射函数';
COMMENT ON FUNCTION public.is_verification_required IS '判断身份是否需要专业认证';
COMMENT ON FUNCTION public.calculate_access_level IS '计算用户权限等级';
COMMENT ON FUNCTION public.calculate_redirect_hint IS '计算前端跳转提示';
COMMENT ON FUNCTION public.calculate_permission_flags IS '计算权限标记';
COMMENT ON VIEW public.v_cn_user_full_state IS '用户完整状态视图 - 供GET /api/auth/me使用';
