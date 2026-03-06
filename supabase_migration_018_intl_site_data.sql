-- ==========================================
-- VetSphere Migration 018: INTL 站点数据填充
-- 为国际站首页添加课程、商品、诊所项目数据
-- 日期: 2026-03-05
-- ==========================================

BEGIN;

-- ============================================
-- 1. 为已有课程创建 INTL 站点视图（全部4门课程）
-- ============================================

INSERT INTO public.course_site_views (
  course_id, site_code, is_enabled, publish_status, published_at,
  is_featured, display_order
)
SELECT 
  id, 
  'intl', 
  true, 
  'published', 
  NOW(),
  true,  -- 全部标记为 featured，首页展示
  ROW_NUMBER() OVER (ORDER BY id)
FROM public.courses
WHERE status = 'published' 
  AND (deleted_at IS NULL AND is_deleted IS NOT TRUE)
ON CONFLICT (course_id, site_code) DO UPDATE SET
  is_enabled = true,
  publish_status = 'published',
  published_at = COALESCE(public.course_site_views.published_at, NOW()),
  is_featured = true;

-- ============================================
-- 2. 为已有商品创建 INTL 站点视图（全部商品）
-- ============================================

INSERT INTO public.product_site_views (
  product_id, site_code, is_enabled, publish_status, published_at,
  is_featured, display_order, currency_code, purchase_type
)
SELECT 
  id,
  'intl',
  true,
  'published',
  NOW(),
  true,  -- 全部标记为 featured
  ROW_NUMBER() OVER (ORDER BY id),
  'USD',
  CASE 
    WHEN id IN ('p5', 'p7') THEN 'quote'   -- 大型设备走询价
    ELSE 'direct'
  END
FROM public.products
WHERE status = 'published'
  AND (deleted_at IS NULL AND is_deleted IS NOT TRUE)
ON CONFLICT (product_id, site_code) DO UPDATE SET
  is_enabled = true,
  publish_status = 'published',
  published_at = COALESCE(public.product_site_views.published_at, NOW()),
  is_featured = true,
  currency_code = 'USD';

-- ============================================
-- 3. 创建 INTL 诊所项目示例数据
-- ============================================

INSERT INTO public.clinic_programs (
  site_code, name, slug, tagline, 
  target_clinic_type, support_level,
  included_training_scope, included_equipment_scope,
  expected_outcome, display_order, publish_status
) VALUES
(
  'intl',
  'Starter Clinic Package',
  'starter-clinic',
  'Essential training and equipment for new or expanding small animal clinics.',
  'Small Animal General Practice',
  'Standard',
  'Basic ultrasound + soft tissue surgery fundamentals',
  'Core imaging and surgical instrument starter set',
  'Operational readiness for basic soft tissue and diagnostic imaging services',
  1,
  'published'
),
(
  'intl',
  'Orthopedic Surgery Center',
  'ortho-center',
  'Build a referral-level orthopedic surgery capability with expert training and precision equipment.',
  'Referral / Specialty Hospital',
  'Premium',
  'TPLO workshop + joint surgery advanced + arthroscopy training',
  'TPLO saw system, locking plate inventory, arthroscopy tower',
  'Ability to perform TPLO, fracture repair, and arthroscopic procedures independently',
  2,
  'published'
),
(
  'intl',
  'Ophthalmology Suite Setup',
  'eye-suite',
  'Complete ophthalmology service line from training to fully equipped surgical suite.',
  'Specialty / University Hospital',
  'Premium',
  'VOSC ophthalmology certification + phaco training',
  'Phacoemulsification system, micro-ophthalmic instruments, slit lamp',
  'Full cataract surgery and ocular surface procedure capability',
  3,
  'published'
)
ON CONFLICT DO NOTHING;

COMMIT;
