-- ============================================
-- Migration 029: 统一医生认证系统（admin 重构配套）
-- 目标：cn_verification_requests 通用化，支持 INTL 站；旧 doctor_applications 标记 deprecated；自动给现有 admin grant super_admin。
-- ============================================
-- 设计原则：
--   1) 不重命名表（cn-app/intl-app 用户端依赖现有名字）
--   2) 通过扩展 site_code 约束 + 新增 INTL 类型枚举值，让同一张表跨站使用
--   3) 写入 ENUM/TEXT CHECK 用宽容方式，避免老数据迁移
-- ============================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. 扩展 cn_verification_requests.site_code 允许 'intl' 与 'global'
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'cn_verification_requests'
      AND constraint_name = 'cn_verification_requests_site_code_check'
  ) THEN
    ALTER TABLE cn_verification_requests
      DROP CONSTRAINT cn_verification_requests_site_code_check;
  END IF;
END $$;

ALTER TABLE cn_verification_requests
  ADD CONSTRAINT cn_verification_requests_site_code_check
  CHECK (site_code IN ('cn', 'intl', 'global'));

-- ----------------------------------------------------------------------------
-- 2. 扩展 verification_type 允许 INTL 类型
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'cn_verification_requests'
      AND constraint_name = 'cn_verification_requests_verification_type_check'
  ) THEN
    ALTER TABLE cn_verification_requests
      DROP CONSTRAINT cn_verification_requests_verification_type_check;
  END IF;
END $$;

ALTER TABLE cn_verification_requests
  ADD CONSTRAINT cn_verification_requests_verification_type_check
  CHECK (verification_type IN (
    -- CN 类型
    'veterinarian',         -- 执业兽医
    'assistant_doctor',     -- 助理医师
    'nurse_care',           -- 护理人员
    'student',              -- 学生
    'researcher_teacher',   -- 研究者/教师
    'industry_practitioner',-- 行业从业者
    -- INTL 类型（新增）
    'general_practitioner', -- 全科兽医
    'specialist',           -- 专科兽医
    'clinic_owner',         -- 诊所主理人
    'technician',           -- 兽医技术员（INTL 通用）
    -- 通用回退
    'other'
  ));

-- ----------------------------------------------------------------------------
-- 3. 标记旧表 deprecated（仅注释，不删表，留 1-3 月观察期）
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.doctor_applications') IS NOT NULL THEN
    EXECUTE 'COMMENT ON TABLE doctor_applications IS ''@deprecated 2026-04: 已统一到 cn_verification_requests，保留观察期''';
  END IF;
  IF to_regclass('public.doctor_audit_logs') IS NOT NULL THEN
    EXECUTE 'COMMENT ON TABLE doctor_audit_logs IS ''@deprecated 2026-04: 已统一到 cn_verification_audit_logs + admin_audit_logs''';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4. 自动给现有 admin grant super_admin 角色（避免 RBAC 落地后变无权限）
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  super_admin_role_id UUID;
BEGIN
  -- 确保 super_admin 角色存在
  IF to_regclass('public.admin_roles') IS NOT NULL THEN
    INSERT INTO admin_roles (code, name, description, is_system, is_active)
    VALUES ('super_admin', '超级管理员', '拥有所有权限', true, true)
    ON CONFLICT (code) DO UPDATE SET is_system = true, is_active = true
    RETURNING id INTO super_admin_role_id;

    -- 如果上一句因为 ON CONFLICT 没返回 id，单独查一下
    IF super_admin_role_id IS NULL THEN
      SELECT id INTO super_admin_role_id FROM admin_roles WHERE code = 'super_admin' LIMIT 1;
    END IF;

    -- 给所有 is_admin=true / role='Admin' 但 admin_role_id 为空的用户 grant super_admin
    IF super_admin_role_id IS NOT NULL THEN
      UPDATE profiles
      SET admin_role_id = super_admin_role_id
      WHERE admin_role_id IS NULL
        AND (is_admin = true OR (role IS NOT NULL AND lower(role) = 'admin'));
    END IF;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 5. 确保 super_admin 拥有所有 permissions（通过通配符或显式 grant）
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  super_admin_role_id UUID;
BEGIN
  IF to_regclass('public.admin_roles') IS NOT NULL
     AND to_regclass('public.permissions') IS NOT NULL
     AND to_regclass('public.role_permissions') IS NOT NULL THEN
    SELECT id INTO super_admin_role_id FROM admin_roles WHERE code = 'super_admin' LIMIT 1;

    IF super_admin_role_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT super_admin_role_id, p.id
      FROM permissions p
      WHERE NOT EXISTS (
        SELECT 1 FROM role_permissions rp
        WHERE rp.role_id = super_admin_role_id AND rp.permission_id = p.id
      );
    END IF;
  END IF;
END $$;

COMMIT;

-- ============================================
-- 回滚说明（如需）：
--   ALTER TABLE cn_verification_requests DROP CONSTRAINT cn_verification_requests_site_code_check;
--   ALTER TABLE cn_verification_requests ADD CONSTRAINT cn_verification_requests_site_code_check CHECK (site_code = 'cn');
-- ============================================
