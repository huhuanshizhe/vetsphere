BEGIN;

CREATE OR REPLACE VIEW public.admin_latest_verification_view AS
SELECT DISTINCT ON (vr.user_id, vr.site_code)
  vr.id AS verification_request_id,
  vr.user_id,
  vr.site_code,
  vr.status AS verification_status,
  vr.verification_type,
  vr.real_name AS verification_real_name,
  vr.organization_name AS verification_organization_name,
  vr.position_title AS verification_position_title,
  vr.specialty_tags AS verification_specialty_tags,
  vr.approved_level AS verification_approved_level,
  vr.submitted_at AS verification_submitted_at,
  vr.reviewed_at AS verification_reviewed_at,
  vr.reject_reason AS verification_reject_reason,
  vr.created_at AS verification_created_at
FROM public.cn_verification_requests vr
ORDER BY vr.user_id, vr.site_code, vr.created_at DESC, vr.id DESC;

COMMENT ON VIEW public.admin_latest_verification_view IS '按 user_id + site_code 归一后的最新认证记录视图，供用户目录、已认证医生名册与审核工作台复用。';

CREATE OR REPLACE VIEW public.admin_user_directory_view AS
WITH resolved_memberships AS (
  SELECT
    m.user_id,
    m.site_code,
    m.origin_site,
    m.created_via,
    m.is_shadow_profile,
    m.is_active,
    m.metadata,
    m.created_at,
    m.updated_at
  FROM public.user_site_memberships m
  WHERE m.is_active = TRUE

  UNION ALL

  SELECT
    u.id,
    'cn',
    'cn',
    'legacy_cn_inference',
    FALSE,
    TRUE,
    '{}'::jsonb,
    COALESCE(u.created_at, NOW()),
    COALESCE(u.updated_at, u.created_at, NOW())
  FROM public.cn_users u
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.user_site_memberships m
    WHERE m.user_id = u.id AND m.site_code = 'cn'
  )

  UNION ALL

  SELECT
    pf.id,
    CASE
      WHEN COALESCE(au.raw_user_meta_data ->> 'site', '') = 'cn' THEN 'cn'
      ELSE 'intl'
    END,
    CASE
      WHEN COALESCE(au.raw_user_meta_data ->> 'site', '') = 'cn' THEN 'cn'
      ELSE 'intl'
    END,
    'legacy_profile_inference',
    FALSE,
    CASE WHEN pf.deleted_at IS NULL THEN TRUE ELSE FALSE END,
    jsonb_strip_nulls(
      jsonb_build_object(
        'backfill_source', 'profiles_fallback',
        'profile_role', pf.role,
        'auth_site', au.raw_user_meta_data ->> 'site'
      )
    ),
    COALESCE(pf.created_at, NOW()),
    COALESCE(pf.updated_at, pf.created_at, NOW())
  FROM public.profiles pf
  LEFT JOIN auth.users au ON au.id = pf.id
  WHERE COALESCE(pf.is_admin, FALSE) = FALSE
    AND NOT EXISTS (
      SELECT 1
      FROM public.cn_users cu
      WHERE cu.id = pf.id
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.user_site_memberships m
      WHERE m.user_id = pf.id
        AND m.site_code = CASE
          WHEN COALESCE(au.raw_user_meta_data ->> 'site', '') = 'cn' THEN 'cn'
          ELSE 'intl'
        END
    )
)
SELECT
  rm.user_id,
  rm.site_code,
  rm.site_code AS source_site,
  rm.origin_site,
  rm.created_via,
  rm.is_shadow_profile,
  CASE
    WHEN rm.site_code = 'cn' AND cu.mobile IS NOT NULL THEN cu.mobile
    WHEN rm.site_code = 'cn' THEN pf.email
    ELSE COALESCE(pf.email, cu.mobile)
  END AS contact,
  pf.email,
  CASE
    WHEN rm.site_code = 'cn' THEN COALESCE(cnp.real_name, cnp.display_name, pf.full_name)
    ELSE COALESCE(pf.full_name, cnp.real_name, cnp.display_name)
  END AS display_name,
  CASE
    WHEN rm.site_code = 'cn' THEN COALESCE(cnp.real_name, cnp.display_name, pf.full_name)
    ELSE pf.full_name
  END AS full_name,
  CASE
    WHEN rm.site_code = 'cn' THEN COALESCE(cnp.avatar_file_id::text, pf.avatar_url)
    ELSE pf.avatar_url
  END AS avatar_url,
  CASE
    WHEN rm.site_code = 'cn' AND cu.id IS NOT NULL THEN cu.status
    WHEN pf.deleted_at IS NOT NULL THEN 'deleted'
    ELSE 'active'
  END AS account_status,
  CASE WHEN rm.site_code = 'cn' THEN cni.identity_type ELSE NULL::text END AS identity_type,
  CASE WHEN rm.site_code = 'cn' THEN cni.identity_group ELSE NULL::text END AS identity_group,
  av.verification_status,
  av.verification_type,
  COALESCE(cu.registered_at, pf.created_at, rm.created_at) AS registered_at,
  COALESCE(cu.last_login_at, pf.last_login_at) AS last_login_at,
  COALESCE(cu.created_at, pf.created_at, rm.created_at) AS created_at,
  COALESCE(pf.updated_at, cu.updated_at, rm.updated_at) AS updated_at,
  COALESCE(pf.is_admin, FALSE) AS is_admin,
  av.verification_request_id,
  av.verification_real_name,
  av.verification_organization_name,
  av.verification_position_title,
  av.verification_specialty_tags,
  av.verification_approved_level,
  av.verification_submitted_at,
  av.verification_reviewed_at,
  av.verification_reject_reason
FROM resolved_memberships rm
LEFT JOIN public.cn_users cu
  ON cu.id = rm.user_id
LEFT JOIN public.profiles pf
  ON pf.id = rm.user_id
LEFT JOIN public.cn_user_profiles cnp
  ON cnp.user_id = rm.user_id AND cnp.site_code = 'cn'
LEFT JOIN public.cn_user_identity_profiles cni
  ON cni.user_id = rm.user_id AND cni.site_code = 'cn'
LEFT JOIN public.admin_latest_verification_view av
  ON av.user_id = rm.user_id AND av.site_code = rm.site_code
WHERE COALESCE(pf.is_admin, FALSE) = FALSE;

COMMENT ON VIEW public.admin_user_directory_view IS '管理后台统一用户目录视图。优先读取 user_site_memberships，并对旧 cn_users/profiles 数据做兼容回退，同时投影最新认证元数据。';

CREATE OR REPLACE VIEW public.unified_users_view AS
SELECT
  user_id,
  source_site,
  contact,
  email,
  display_name,
  avatar_url,
  account_status,
  registered_at,
  last_login_at,
  verification_status,
  verification_type,
  is_admin,
  created_at,
  verification_request_id,
  verification_real_name,
  verification_organization_name,
  verification_position_title,
  verification_specialty_tags,
  verification_approved_level,
  verification_submitted_at,
  verification_reviewed_at,
  verification_reject_reason
FROM public.admin_user_directory_view;

COMMENT ON VIEW public.unified_users_view IS '兼容视图：从 admin_user_directory_view 投影旧字段，并附带最新认证元数据，供历史 admin 接口继续使用。';

CREATE OR REPLACE VIEW public.admin_verification_workbench_view AS
SELECT
  vr.id AS verification_request_id,
  vr.user_id,
  vr.site_code,
  vr.status,
  vr.verification_type,
  vr.real_name,
  vr.organization_name,
  vr.position_title,
  vr.specialty_tags,
  vr.verification_note,
  vr.submitted_at,
  vr.reviewed_at,
  vr.reviewed_by,
  vr.reject_reason,
  vr.approved_level,
  vr.created_at,
  vr.updated_at,
  CASE
    WHEN vr.site_code = 'cn' AND cu.mobile IS NOT NULL THEN cu.mobile
    WHEN vr.site_code = 'cn' THEN pf.email
    ELSE COALESCE(pf.email, cu.mobile)
  END AS contact,
  pf.email,
  CASE
    WHEN vr.site_code = 'cn' THEN cu.mobile
    ELSE NULL::text
  END AS mobile,
  CASE
    WHEN vr.site_code = 'cn' THEN COALESCE(cnp.real_name, cnp.display_name, pf.full_name, vr.real_name)
    ELSE COALESCE(pf.full_name, vr.real_name, cnp.real_name, cnp.display_name)
  END AS display_name,
  CASE
    WHEN vr.site_code = 'cn' THEN COALESCE(cnp.avatar_file_id::text, pf.avatar_url)
    ELSE pf.avatar_url
  END AS avatar_url,
  CASE WHEN vr.site_code = 'cn' THEN cni.identity_type ELSE NULL::text END AS identity_type,
  CASE WHEN vr.site_code = 'cn' THEN cni.identity_group ELSE NULL::text END AS identity_group,
  av.verification_request_id AS latest_verification_request_id,
  av.verification_status AS latest_verification_status,
  av.verification_type AS latest_verification_type,
  av.verification_real_name AS latest_verification_real_name,
  av.verification_organization_name AS latest_verification_organization_name,
  av.verification_position_title AS latest_verification_position_title,
  av.verification_approved_level AS latest_verification_approved_level,
  av.verification_submitted_at AS latest_verification_submitted_at,
  av.verification_reviewed_at AS latest_verification_reviewed_at,
  CASE WHEN aud.user_id IS NOT NULL THEN TRUE ELSE FALSE END AS has_directory_user,
  CASE WHEN av.verification_request_id = vr.id THEN TRUE ELSE FALSE END AS is_latest_verification,
  CASE
    WHEN aud.user_id IS NULL THEN 'missing_directory_user'
    WHEN vr.id <> av.verification_request_id
      AND vr.status = 'approved'
      AND COALESCE(av.verification_status, '') <> 'approved' THEN 'latest_status_not_approved'
    WHEN vr.id <> av.verification_request_id
      AND vr.status = 'approved'
      AND av.verification_status = 'approved' THEN 'historical_approved_superseded'
    ELSE NULL::text
  END AS integrity_issue_code
FROM public.cn_verification_requests vr
LEFT JOIN public.cn_users cu
  ON cu.id = vr.user_id
LEFT JOIN public.profiles pf
  ON pf.id = vr.user_id
LEFT JOIN public.cn_user_profiles cnp
  ON cnp.user_id = vr.user_id AND cnp.site_code = 'cn'
LEFT JOIN public.cn_user_identity_profiles cni
  ON cni.user_id = vr.user_id AND cni.site_code = 'cn'
LEFT JOIN public.admin_latest_verification_view av
  ON av.user_id = vr.user_id AND av.site_code = vr.site_code
LEFT JOIN public.admin_user_directory_view aud
  ON aud.user_id = vr.user_id AND aud.site_code = vr.site_code;

COMMENT ON VIEW public.admin_verification_workbench_view IS '管理后台医生认证工作台视图。保留原始申请记录，并标记目录缺失、历史 approved 被覆盖等异常。';

COMMIT;