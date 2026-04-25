-- ============================================
-- Migration 030: 统一用户视图（admin 跨站点用户列表用）
-- 目标：UNION cn_users (CN 手机注册) + profiles (INTL 邮箱注册)，规范化字段
-- ============================================
-- 用法：admin /users 页面在 site=global 时查询此 view
--       site=cn 时直查 cn_users，site=intl 时直查 profiles WHERE NOT is_admin
-- ============================================

BEGIN;

CREATE OR REPLACE VIEW unified_users_view AS
-- CN 站用户（cn_users）
SELECT
  u.id                                          AS user_id,
  'cn'::text                                    AS source_site,
  u.mobile                                      AS contact,    -- 手机号
  NULL::text                                    AS email,
  COALESCE(p.real_name, p.display_name)         AS display_name,
  p.avatar_file_id::text                        AS avatar_url,
  u.status                                      AS account_status,
  u.registered_at                               AS registered_at,
  u.last_login_at                               AS last_login_at,
  -- 当前认证状态（取最新一条 verification_request）
  (
    SELECT vr.status
    FROM cn_verification_requests vr
    WHERE vr.user_id = u.id
    ORDER BY vr.created_at DESC
    LIMIT 1
  )                                             AS verification_status,
  (
    SELECT vr.verification_type
    FROM cn_verification_requests vr
    WHERE vr.user_id = u.id
    ORDER BY vr.created_at DESC
    LIMIT 1
  )                                             AS verification_type,
  false                                         AS is_admin,
  u.created_at                                  AS created_at
FROM cn_users u
LEFT JOIN cn_user_profiles p
  ON p.user_id = u.id AND p.site_code = 'cn'

UNION ALL

-- INTL/通用用户（profiles 中非管理员）
SELECT
  pf.id                                         AS user_id,
  'intl'::text                                  AS source_site,
  NULL::text                                    AS contact,
  pf.email                                      AS email,
  pf.full_name                                  AS display_name,
  pf.avatar_url                                 AS avatar_url,
  CASE WHEN pf.deleted_at IS NOT NULL THEN 'deleted'
       ELSE 'active' END                        AS account_status,
  pf.created_at                                 AS registered_at,
  pf.last_login_at                              AS last_login_at,
  (
    SELECT vr.status
    FROM cn_verification_requests vr
    WHERE vr.user_id = pf.id
    ORDER BY vr.created_at DESC
    LIMIT 1
  )                                             AS verification_status,
  (
    SELECT vr.verification_type
    FROM cn_verification_requests vr
    WHERE vr.user_id = pf.id
    ORDER BY vr.created_at DESC
    LIMIT 1
  )                                             AS verification_type,
  COALESCE(pf.is_admin, false)                  AS is_admin,
  pf.created_at                                 AS created_at
FROM profiles pf
WHERE
  -- 排除已经在 cn_users 表中的用户（避免重复）
  pf.id NOT IN (SELECT id FROM cn_users)
  -- 排除管理员（管理员在 /system/roles/admins 单独管理）
  AND COALESCE(pf.is_admin, false) = false;

COMMENT ON VIEW unified_users_view IS '管理后台跨站点用户列表视图。CN 手机用户来自 cn_users，INTL 邮箱用户来自 profiles（排除管理员）。';

COMMIT;
