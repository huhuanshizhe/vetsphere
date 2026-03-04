-- ==========================================
-- VetSphere Migration 017: Dual-Site Architecture
-- 双站点(CN/INTL)架构 - overlay表、站点页面、字典可见性
-- 日期: 2026-03-04
-- ==========================================

BEGIN;

-- ============================================
-- SECTION 1: sites 站点主表
-- ============================================

CREATE TABLE IF NOT EXISTS public.sites (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  domain TEXT,
  default_locale TEXT NOT NULL DEFAULT 'zh-CN',
  currency TEXT NOT NULL DEFAULT 'CNY',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.sites (code, name, display_name, domain, default_locale, currency) VALUES
  ('cn',   'VetSphere China',         '中国站',   'vetsphere.cn',  'zh-CN', 'CNY'),
  ('intl', 'VetSphere International', '国际站',   'vetsphere.net', 'en',    'USD')
ON CONFLICT (code) DO NOTHING;

ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sites_public_read" ON public.sites FOR SELECT USING (true);
CREATE POLICY "sites_admin_all" ON public.sites FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'Admin')
);

-- ============================================
-- SECTION 2: Overlay Tables (课程/商品/讲师站点视图)
-- ============================================

-- 2.1 course_site_views 课程站点视图
CREATE TABLE IF NOT EXISTS public.course_site_views (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  site_code TEXT NOT NULL REFERENCES public.sites(code),
  is_enabled BOOLEAN DEFAULT true,
  publish_status TEXT DEFAULT 'draft' CHECK (publish_status IN ('draft', 'published', 'offline')),
  -- 覆盖字段
  title_override TEXT,
  slug_override TEXT,
  summary_override TEXT,
  hero_title_override TEXT,
  hero_subtitle_override TEXT,
  -- 站点定价
  pricing_mode TEXT DEFAULT 'inherit' CHECK (pricing_mode IN ('inherit', 'free', 'custom')),
  currency_code TEXT,
  -- 展示控制
  display_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  -- CTA & SEO
  cta_config_json JSONB DEFAULT '{}',
  seo_title TEXT,
  seo_description TEXT,
  display_config_json JSONB DEFAULT '{}',
  -- 发布
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (course_id, site_code)
);

CREATE INDEX IF NOT EXISTS idx_csv_course_id ON public.course_site_views(course_id);
CREATE INDEX IF NOT EXISTS idx_csv_site_code ON public.course_site_views(site_code);
CREATE INDEX IF NOT EXISTS idx_csv_publish ON public.course_site_views(site_code, publish_status);

-- 2.2 product_site_views 商品站点视图
CREATE TABLE IF NOT EXISTS public.product_site_views (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  site_code TEXT NOT NULL REFERENCES public.sites(code),
  is_enabled BOOLEAN DEFAULT true,
  publish_status TEXT DEFAULT 'draft' CHECK (publish_status IN ('draft', 'published', 'offline')),
  -- 覆盖字段
  display_name TEXT,
  slug_override TEXT,
  summary_override TEXT,
  -- 站点定价
  pricing_mode TEXT DEFAULT 'inherit' CHECK (pricing_mode IN ('inherit', 'free', 'custom')),
  display_price NUMERIC(12,2),
  currency_code TEXT,
  purchase_type TEXT,
  -- 展示控制
  display_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  display_tags_json JSONB DEFAULT '[]',
  recommendation_reason TEXT,
  -- CTA & SEO
  cta_config_json JSONB DEFAULT '{}',
  seo_title TEXT,
  seo_description TEXT,
  display_config_json JSONB DEFAULT '{}',
  -- 发布
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (product_id, site_code)
);

CREATE INDEX IF NOT EXISTS idx_psv_product_id ON public.product_site_views(product_id);
CREATE INDEX IF NOT EXISTS idx_psv_site_code ON public.product_site_views(site_code);
CREATE INDEX IF NOT EXISTS idx_psv_publish ON public.product_site_views(site_code, publish_status);

-- 2.3 instructor_site_views 讲师站点视图
CREATE TABLE IF NOT EXISTS public.instructor_site_views (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  instructor_id UUID NOT NULL REFERENCES public.instructors(id) ON DELETE CASCADE,
  site_code TEXT NOT NULL REFERENCES public.sites(code),
  display_name_override TEXT,
  title_override TEXT,
  bio_override TEXT,
  display_order INTEGER DEFAULT 0,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (instructor_id, site_code)
);

CREATE INDEX IF NOT EXISTS idx_isv_instructor_id ON public.instructor_site_views(instructor_id);
CREATE INDEX IF NOT EXISTS idx_isv_site_code ON public.instructor_site_views(site_code);

-- ============================================
-- SECTION 3: Site Pages 站点页面系统
-- ============================================

CREATE TABLE IF NOT EXISTS public.site_pages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  site_code TEXT NOT NULL REFERENCES public.sites(code),
  page_key TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  seo_title TEXT,
  seo_description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (site_code, page_key)
);

CREATE INDEX IF NOT EXISTS idx_site_pages_code ON public.site_pages(site_code);
CREATE INDEX IF NOT EXISTS idx_site_pages_status ON public.site_pages(site_code, status);

CREATE TABLE IF NOT EXISTS public.site_page_sections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  site_page_id UUID NOT NULL REFERENCES public.site_pages(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  section_type TEXT NOT NULL DEFAULT 'content',
  title TEXT,
  subtitle TEXT,
  body_text TEXT,
  config_json JSONB DEFAULT '{}',
  display_order INTEGER DEFAULT 0,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sps_page_id ON public.site_page_sections(site_page_id);

CREATE TABLE IF NOT EXISTS public.site_page_section_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES public.site_page_sections(id) ON DELETE CASCADE,
  item_key TEXT,
  title TEXT,
  description TEXT,
  content_json JSONB DEFAULT '{}',
  image_url TEXT,
  link_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spsi_section_id ON public.site_page_section_items(section_id);

-- ============================================
-- SECTION 4: clinic_programs 诊所项目 (INTL)
-- ============================================

CREATE TABLE IF NOT EXISTS public.clinic_programs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  site_code TEXT NOT NULL DEFAULT 'intl' REFERENCES public.sites(code),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  tagline TEXT,
  target_clinic_type TEXT,
  included_training_scope TEXT,
  included_equipment_scope TEXT,
  support_level TEXT,
  expected_outcome TEXT,
  display_order INTEGER DEFAULT 0,
  publish_status TEXT DEFAULT 'draft' CHECK (publish_status IN ('draft', 'published', 'offline')),
  seo_title TEXT,
  seo_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cp_site_code ON public.clinic_programs(site_code);
CREATE INDEX IF NOT EXISTS idx_cp_publish ON public.clinic_programs(publish_status);

-- ============================================
-- SECTION 5: dictionary_item_site_visibility
-- ============================================

CREATE TABLE IF NOT EXISTS public.dictionary_item_site_visibility (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  dictionary_item_id UUID NOT NULL,
  site_code TEXT NOT NULL REFERENCES public.sites(code),
  is_enabled BOOLEAN DEFAULT true,
  label_override TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (dictionary_item_id, site_code)
);

CREATE INDEX IF NOT EXISTS idx_disv_item ON public.dictionary_item_site_visibility(dictionary_item_id);
CREATE INDEX IF NOT EXISTS idx_disv_site ON public.dictionary_item_site_visibility(site_code);

-- ============================================
-- SECTION 6: 已有表添加 site_code 字段
-- ============================================

-- 安全地为已有表添加 site_code 字段（表不存在或列已存在则跳过）
DO $$
DECLARE
  tbl_rec RECORD;
  tbl_name TEXT;
  default_val TEXT;
  idx_name TEXT;
  -- 需要添加 site_code 的表列表: [表名, 默认值, 索引名]
  tables TEXT[][] := ARRAY[
    ['growth_tracks',           '''cn''', 'idx_gt_site'],
    ['growth_track_courses',    '''cn''', 'idx_gtc_site'],
    ['route_registry',          '''cn''', 'idx_rr_site'],
    ['coming_soon_templates',   '''cn''', 'idx_cst_site'],
    ['purchase_leads',          '''cn''', 'idx_pl_site'],
    ['notifications',           '''cn''', 'idx_notif_site'],
    ['notification_templates',  '''cn''', 'idx_nt_site'],
    ['posts',                   '''cn''', 'idx_posts_site'],
    ['post_reports',            '''cn''', 'idx_pr_site'],
    ['doctor_applications',     '''cn''', 'idx_da_site'],
    ['doctor_profiles',         '''cn''', 'idx_dp_site'],
    ['course_product_relations','''cn''', 'idx_cpr_site'],
    ['admin_audit_logs',        'NULL',   'idx_aal_site']
  ];
  i INT;
BEGIN
  FOR i IN 1..array_length(tables, 1) LOOP
    tbl_name    := tables[i][1];
    default_val := tables[i][2];
    idx_name    := tables[i][3];

    -- 检查表是否存在
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl_name
    ) THEN
      RAISE NOTICE 'Table public.% does not exist, skipping site_code column', tbl_name;
      CONTINUE;
    END IF;

    -- 检查列是否已存在
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = tbl_name AND column_name = 'site_code'
    ) THEN
      RAISE NOTICE 'Column site_code already exists on public.%, skipping', tbl_name;
    ELSE
      IF default_val = 'NULL' THEN
        EXECUTE format(
          'ALTER TABLE public.%I ADD COLUMN site_code TEXT REFERENCES public.sites(code)',
          tbl_name
        );
      ELSE
        EXECUTE format(
          'ALTER TABLE public.%I ADD COLUMN site_code TEXT DEFAULT %s REFERENCES public.sites(code)',
          tbl_name, default_val
        );
      END IF;
      RAISE NOTICE 'Added site_code to public.%', tbl_name;
    END IF;

    -- 创建索引
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.%I(site_code)',
      idx_name, tbl_name
    );
  END LOOP;
END $$;

-- ============================================
-- SECTION 7: 数据迁移 - 为已有课程/商品生成 CN 站点视图
-- ============================================

-- 为已发布课程创建 CN 站点视图
INSERT INTO public.course_site_views (course_id, site_code, is_enabled, publish_status, published_at)
SELECT id, 'cn', true, 'published', NOW()
FROM public.courses
WHERE status = 'published' AND (deleted_at IS NULL AND is_deleted IS NOT TRUE)
ON CONFLICT (course_id, site_code) DO NOTHING;

-- 为已发布商品创建 CN 站点视图
INSERT INTO public.product_site_views (product_id, site_code, is_enabled, publish_status, published_at)
SELECT id, 'cn', true, 'published', NOW()
FROM public.products
WHERE status = 'published' AND (deleted_at IS NULL AND is_deleted IS NOT TRUE)
ON CONFLICT (product_id, site_code) DO NOTHING;

-- 为活跃讲师创建 CN 站点视图
INSERT INTO public.instructor_site_views (instructor_id, site_code, is_enabled)
SELECT id, 'cn', true
FROM public.instructors
WHERE is_active = true
ON CONFLICT (instructor_id, site_code) DO NOTHING;

-- ============================================
-- SECTION 8: RLS Policies for new tables
-- ============================================

-- course_site_views
ALTER TABLE public.course_site_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "csv_public_published" ON public.course_site_views
  FOR SELECT USING (publish_status = 'published' AND is_enabled = true);
CREATE POLICY "csv_admin_all" ON public.course_site_views
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'Admin')
  );

-- product_site_views
ALTER TABLE public.product_site_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "psv_public_published" ON public.product_site_views
  FOR SELECT USING (publish_status = 'published' AND is_enabled = true);
CREATE POLICY "psv_admin_all" ON public.product_site_views
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'Admin')
  );

-- instructor_site_views
ALTER TABLE public.instructor_site_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "isv_public_enabled" ON public.instructor_site_views
  FOR SELECT USING (is_enabled = true);
CREATE POLICY "isv_admin_all" ON public.instructor_site_views
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'Admin')
  );

-- site_pages
ALTER TABLE public.site_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sp_public_published" ON public.site_pages
  FOR SELECT USING (status = 'published');
CREATE POLICY "sp_admin_all" ON public.site_pages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'Admin')
  );

-- site_page_sections
ALTER TABLE public.site_page_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sps_public_read" ON public.site_page_sections
  FOR SELECT USING (is_enabled = true);
CREATE POLICY "sps_admin_all" ON public.site_page_sections
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'Admin')
  );

-- site_page_section_items
ALTER TABLE public.site_page_section_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spsi_public_read" ON public.site_page_section_items
  FOR SELECT USING (is_enabled = true);
CREATE POLICY "spsi_admin_all" ON public.site_page_section_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'Admin')
  );

-- clinic_programs
ALTER TABLE public.clinic_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cp_public_published" ON public.clinic_programs
  FOR SELECT USING (publish_status = 'published');
CREATE POLICY "cp_admin_all" ON public.clinic_programs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'Admin')
  );

-- dictionary_item_site_visibility
ALTER TABLE public.dictionary_item_site_visibility ENABLE ROW LEVEL SECURITY;
CREATE POLICY "disv_public_read" ON public.dictionary_item_site_visibility
  FOR SELECT USING (is_enabled = true);
CREATE POLICY "disv_admin_all" ON public.dictionary_item_site_visibility
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'Admin')
  );

-- ============================================
-- SECTION 9: updated_at 触发器
-- ============================================

CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ 
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'sites',
    'course_site_views', 'product_site_views', 'instructor_site_views',
    'site_pages', 'site_page_sections', 'site_page_section_items',
    'clinic_programs', 'dictionary_item_site_visibility'
  ]) LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS set_updated_at ON public.%I; CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();',
      tbl, tbl
    );
  END LOOP;
END $$;

COMMIT;
