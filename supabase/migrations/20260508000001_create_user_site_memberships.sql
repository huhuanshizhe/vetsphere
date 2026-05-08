BEGIN;

CREATE TABLE IF NOT EXISTS public.user_site_memberships (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_code TEXT NOT NULL REFERENCES public.sites(code),
  origin_site TEXT NOT NULL REFERENCES public.sites(code),
  created_via TEXT NOT NULL DEFAULT 'unknown',
  is_shadow_profile BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, site_code),
  CONSTRAINT user_site_memberships_site_code_check CHECK (site_code IN ('cn', 'intl')),
  CONSTRAINT user_site_memberships_origin_site_check CHECK (origin_site IN ('cn', 'intl'))
);

CREATE INDEX IF NOT EXISTS idx_user_site_memberships_user_id
  ON public.user_site_memberships(user_id);

CREATE INDEX IF NOT EXISTS idx_user_site_memberships_origin_site
  ON public.user_site_memberships(origin_site);

CREATE INDEX IF NOT EXISTS idx_user_site_memberships_active_site
  ON public.user_site_memberships(site_code, is_active);

CREATE OR REPLACE FUNCTION public.set_user_site_memberships_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_site_memberships_updated_at ON public.user_site_memberships;

CREATE TRIGGER trg_user_site_memberships_updated_at
BEFORE UPDATE ON public.user_site_memberships
FOR EACH ROW
EXECUTE FUNCTION public.set_user_site_memberships_updated_at();

ALTER TABLE public.user_site_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_site_memberships_select_own" ON public.user_site_memberships;
CREATE POLICY "user_site_memberships_select_own"
ON public.user_site_memberships
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_site_memberships_admin_all" ON public.user_site_memberships;
CREATE POLICY "user_site_memberships_admin_all"
ON public.user_site_memberships
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND COALESCE(is_admin, FALSE) = TRUE
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND COALESCE(is_admin, FALSE) = TRUE
  )
);

INSERT INTO public.user_site_memberships (
  user_id,
  site_code,
  origin_site,
  created_via,
  is_shadow_profile,
  is_active,
  metadata,
  created_at,
  updated_at
)
SELECT
  u.id,
  'cn',
  'cn',
  COALESCE(NULLIF(au.raw_user_meta_data ->> 'registered_via', ''), 'cn_users_backfill'),
  FALSE,
  TRUE,
  jsonb_strip_nulls(
    jsonb_build_object(
      'backfill_source', 'cn_users',
      'auth_site', au.raw_user_meta_data ->> 'site'
    )
  ),
  COALESCE(u.created_at, NOW()),
  COALESCE(u.updated_at, u.created_at, NOW())
FROM public.cn_users u
LEFT JOIN auth.users au ON au.id = u.id
ON CONFLICT (user_id, site_code) DO UPDATE SET
  origin_site = EXCLUDED.origin_site,
  created_via = EXCLUDED.created_via,
  is_shadow_profile = EXCLUDED.is_shadow_profile,
  is_active = EXCLUDED.is_active,
  metadata = EXCLUDED.metadata,
  updated_at = EXCLUDED.updated_at;

INSERT INTO public.user_site_memberships (
  user_id,
  site_code,
  origin_site,
  created_via,
  is_shadow_profile,
  is_active,
  metadata,
  created_at,
  updated_at
)
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
  COALESCE(
    NULLIF(au.raw_user_meta_data ->> 'registered_via', ''),
    CASE
      WHEN COALESCE(au.raw_user_meta_data ->> 'site', '') = 'cn' THEN 'cn_profile_backfill'
      ELSE 'intl_profile_backfill'
    END
  ),
  FALSE,
  CASE WHEN pf.deleted_at IS NULL THEN TRUE ELSE FALSE END,
  jsonb_strip_nulls(
    jsonb_build_object(
      'backfill_source', 'profiles',
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
ON CONFLICT (user_id, site_code) DO UPDATE SET
  origin_site = EXCLUDED.origin_site,
  created_via = EXCLUDED.created_via,
  is_shadow_profile = EXCLUDED.is_shadow_profile,
  is_active = EXCLUDED.is_active,
  metadata = EXCLUDED.metadata,
  updated_at = EXCLUDED.updated_at;

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
), latest_verification AS (
  SELECT DISTINCT ON (vr.user_id, vr.site_code)
    vr.user_id,
    vr.site_code,
    vr.status,
    vr.verification_type,
    vr.created_at
  FROM public.cn_verification_requests vr
  ORDER BY vr.user_id, vr.site_code, vr.created_at DESC
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
  lv.status AS verification_status,
  lv.verification_type,
  COALESCE(cu.registered_at, pf.created_at, rm.created_at) AS registered_at,
  COALESCE(cu.last_login_at, pf.last_login_at) AS last_login_at,
  COALESCE(cu.created_at, pf.created_at, rm.created_at) AS created_at,
  COALESCE(pf.updated_at, cu.updated_at, rm.updated_at) AS updated_at,
  COALESCE(pf.is_admin, FALSE) AS is_admin
FROM resolved_memberships rm
LEFT JOIN public.cn_users cu
  ON cu.id = rm.user_id
LEFT JOIN public.profiles pf
  ON pf.id = rm.user_id
LEFT JOIN public.cn_user_profiles cnp
  ON cnp.user_id = rm.user_id AND cnp.site_code = 'cn'
LEFT JOIN public.cn_user_identity_profiles cni
  ON cni.user_id = rm.user_id AND cni.site_code = 'cn'
LEFT JOIN latest_verification lv
  ON lv.user_id = rm.user_id AND lv.site_code = rm.site_code
WHERE COALESCE(pf.is_admin, FALSE) = FALSE;

COMMENT ON VIEW public.admin_user_directory_view IS '管理后台统一用户目录视图。优先读取 user_site_memberships，并对旧 cn_users/profiles 数据做兼容回退。';

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
  created_at
FROM public.admin_user_directory_view;

COMMENT ON VIEW public.unified_users_view IS '兼容视图：从 admin_user_directory_view 投影旧字段，供历史 admin 接口继续使用。';

COMMIT;