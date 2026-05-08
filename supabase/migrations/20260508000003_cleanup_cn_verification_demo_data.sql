BEGIN;

DO $$
DECLARE
  target_user_id uuid;
  keep_request_id uuid := '6ec19616-8ed5-40e4-830d-05c99bcf0658';
  deleted_request_count integer := 0;
BEGIN
  SELECT id
    INTO target_user_id
  FROM public.cn_users
  WHERE mobile = '13800000000';

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Cleanup target user not found for mobile 13800000000';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.cn_verification_requests
    WHERE id = keep_request_id
      AND user_id = target_user_id
      AND site_code = 'cn'
  ) THEN
    RAISE EXCEPTION 'Keep verification request % not found for target user %', keep_request_id, target_user_id;
  END IF;

  DELETE FROM public.cn_verification_audit_logs
  WHERE verification_request_id IN (
    'e0e9d952-a728-4d7c-81fa-c2128427dc34',
    'ca443f1a-acf8-47bf-a57f-b26a4e2e94a1',
    'cdef99b1-2fed-4733-a997-626a16438ea1',
    '76021a53-1bb1-4d62-aed3-565cb6a47cbc',
    'ca0e7939-b542-4ea9-a0d8-7d6da23604b8',
    '57c11de4-82d6-4f47-966f-f2da4ceac27b',
    'af283c24-cb45-44d6-aa43-e771fee060f9'
  );

  DELETE FROM public.cn_verification_documents
  WHERE verification_request_id IN (
    'e0e9d952-a728-4d7c-81fa-c2128427dc34',
    'ca443f1a-acf8-47bf-a57f-b26a4e2e94a1',
    'cdef99b1-2fed-4733-a997-626a16438ea1',
    '76021a53-1bb1-4d62-aed3-565cb6a47cbc',
    'ca0e7939-b542-4ea9-a0d8-7d6da23604b8',
    '57c11de4-82d6-4f47-966f-f2da4ceac27b',
    'af283c24-cb45-44d6-aa43-e771fee060f9'
  );

  DELETE FROM public.cn_verification_requests
  WHERE id IN (
    'e0e9d952-a728-4d7c-81fa-c2128427dc34',
    'ca443f1a-acf8-47bf-a57f-b26a4e2e94a1',
    'cdef99b1-2fed-4733-a997-626a16438ea1',
    '76021a53-1bb1-4d62-aed3-565cb6a47cbc',
    'ca0e7939-b542-4ea9-a0d8-7d6da23604b8',
    '57c11de4-82d6-4f47-966f-f2da4ceac27b',
    'af283c24-cb45-44d6-aa43-e771fee060f9'
  )
    AND user_id = target_user_id
    AND site_code = 'cn';

  GET DIAGNOSTICS deleted_request_count = ROW_COUNT;

  UPDATE public.cn_verification_requests
  SET real_name = '王主任',
      organization_name = '大聪明诊所',
      position_title = '主治医师',
      status = 'approved',
      approved_level = 'professional_verified',
      reject_reason = NULL,
      reviewed_at = COALESCE(reviewed_at, NOW()),
      updated_at = NOW()
  WHERE id = keep_request_id;

  UPDATE public.cn_user_profiles
  SET display_name = '王主任',
      real_name = '王主任',
      organization_name = '大聪明诊所',
      job_title = '主治医师',
      updated_at = NOW()
  WHERE user_id = target_user_id
    AND site_code = 'cn';

  UPDATE public.cn_user_state_snapshots
  SET identity_verified_flag = TRUE,
      verification_status = 'approved',
      verification_reject_reason = NULL,
      access_level = 'verified_professional',
      redirect_hint = 'go_home',
      doctor_privilege_status = 'approved',
      permission_flags = jsonb_build_object(
        'can_access_user_center', true,
        'can_purchase_courses', true,
        'can_purchase_products', true,
        'can_manage_orders', true,
        'can_access_growth_system', true,
        'can_access_doctor_workspace', true,
        'can_access_medical_features', true,
        'can_access_professional_courses', true,
        'can_view_restricted_product_info', true,
        'can_submit_professional_application', false
      ),
      updated_at = NOW()
  WHERE user_id = target_user_id
    AND site_code = 'cn';

  UPDATE public.user_site_memberships
  SET is_active = TRUE,
      is_shadow_profile = FALSE,
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
        'cleanup_migration', '20260508000003_cleanup_cn_verification_demo_data',
        'preserved_verification_request_id', keep_request_id
      ),
      updated_at = NOW()
  WHERE user_id = target_user_id
    AND site_code = 'cn';

  UPDATE auth.users
  SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
        'site', 'cn',
        'mobile', '13800000000',
        'display_name', '王主任',
        'real_name', '王主任'
      ),
      updated_at = NOW()
  WHERE id = target_user_id;

  RAISE NOTICE 'Cleaned up % duplicate demo verification requests for user %', deleted_request_count, target_user_id;
END
$$;

COMMIT;