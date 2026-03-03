-- ==========================================
-- VetSphere Migration 014: Admin System & P0 Tables
-- 中国站Admin后台核心表结构
-- 日期: 2026-03-03
-- 说明: 包含用户权限、医生档案、CMS、成长体系、字典、路由占位等P0表
-- ==========================================

BEGIN;

-- ============================================
-- SECTION 0: 依赖表（如不存在则创建）
-- ============================================

-- 0.1 医生申请表（被 doctor_profiles 引用）
CREATE TABLE IF NOT EXISTS public.doctor_applications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected')),
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  province TEXT,
  city TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  hospital_name TEXT NOT NULL DEFAULT '',
  position TEXT NOT NULL DEFAULT '',
  specialties JSONB NOT NULL DEFAULT '[]',
  years_of_experience INTEGER,
  license_image_url TEXT,
  supplementary_urls JSONB DEFAULT '[]',
  credential_notes TEXT,
  nickname TEXT,
  email TEXT,
  bio TEXT,
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doctor_applications_status ON public.doctor_applications(status);
CREATE INDEX IF NOT EXISTS idx_doctor_applications_user_id ON public.doctor_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_doctor_applications_submitted ON public.doctor_applications(submitted_at DESC);

-- 0.2 采购线索表（被多处引用）
CREATE TABLE IF NOT EXISTS public.purchase_leads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  lead_type TEXT NOT NULL DEFAULT 'inquiry' CHECK (lead_type IN ('inquiry', 'configuration_advice', 'solution_request')),
  source_page TEXT,
  source_product_id UUID,
  source_course_id UUID,
  contact_name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  email TEXT,
  clinic_name TEXT,
  clinic_stage_code TEXT,
  budget_range TEXT,
  requirement_text TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'quoted', 'negotiating', 'converted', 'closed')),
  assigned_admin_user_id UUID,
  assigned_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_leads_status ON public.purchase_leads(status);
CREATE INDEX IF NOT EXISTS idx_purchase_leads_created ON public.purchase_leads(created_at DESC);

-- 0.3 课程表（如不存在则创建基本结构）
CREATE TABLE IF NOT EXISTS public.courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 为courses表添加可能缺失的列
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS subtitle TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS format TEXT DEFAULT 'video';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS level TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS price_cny DECIMAL(10,2);
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS original_price_cny DECIMAL(10,2);
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT false;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS enrollment_count INTEGER DEFAULT 0;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS avg_rating DECIMAL(3,2);
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS growth_tracks JSONB DEFAULT '[]';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS specialties JSONB DEFAULT '[]';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS instructor_names JSONB DEFAULT '[]';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 0.4 商品表（如不存在则创建基本结构）
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 为products表添加可能缺失的列
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS subtitle TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'equipment';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS scene_code TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price_min DECIMAL(10,2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price_max DECIMAL(10,2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- courses和products索引（在列添加后创建）
CREATE INDEX IF NOT EXISTS idx_courses_status ON public.courses(status);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_products_scene ON public.products(scene_code);

-- ============================================
-- SECTION 1: 用户与权限系统
-- ============================================

-- 1.1 管理角色表
CREATE TABLE IF NOT EXISTS public.admin_roles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,                    -- 角色编码: super_admin, content_admin, doctor_reviewer...
  name TEXT NOT NULL,                           -- 角色名称
  description TEXT,                             -- 角色说明
  is_system BOOLEAN DEFAULT false,              -- 是否系统内置角色(不可删除)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_roles_code ON public.admin_roles(code);
CREATE INDEX IF NOT EXISTS idx_admin_roles_active ON public.admin_roles(is_active) WHERE is_active = true;

-- 1.2 权限定义表
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,                    -- 权限编码: doctor_verify.view, course.publish...
  name TEXT NOT NULL,                           -- 权限名称
  module TEXT NOT NULL,                         -- 所属模块: doctor_verify, course, product, cms...
  action TEXT NOT NULL,                         -- 动作类型: view, create, edit, delete, publish, approve
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_permissions_module ON public.permissions(module);
CREATE INDEX IF NOT EXISTS idx_permissions_code ON public.permissions(code);

-- 1.3 角色-权限关联表
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  role_id UUID NOT NULL REFERENCES public.admin_roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON public.role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON public.role_permissions(permission_id);

-- 1.4 扩展 profiles 表增加管理员字段
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS admin_role_id UUID REFERENCES public.admin_roles(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin) WHERE is_admin = true;
CREATE INDEX IF NOT EXISTS idx_profiles_admin_role ON public.profiles(admin_role_id) WHERE admin_role_id IS NOT NULL;

-- ============================================
-- SECTION 2: 医生档案扩展（审核通过后）
-- ============================================

-- 2.1 医生扩展档案表
CREATE TABLE IF NOT EXISTS public.doctor_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.doctor_applications(id),
  
  -- 基本信息
  real_name TEXT NOT NULL,
  nickname TEXT,
  avatar_url TEXT,
  phone TEXT,
  email TEXT,
  
  -- 执业信息
  province TEXT,
  city TEXT,
  clinic_name TEXT,
  job_title TEXT,
  specialties JSONB DEFAULT '[]',
  years_of_experience INTEGER,
  bio TEXT,
  
  -- 认证信息
  verification_status TEXT DEFAULT 'verified',    -- verified, suspended
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),
  
  -- 状态
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_doctor_user UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_doctor_profiles_user ON public.doctor_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_doctor_profiles_city ON public.doctor_profiles(city);
CREATE INDEX IF NOT EXISTS idx_doctor_profiles_active ON public.doctor_profiles(is_active) WHERE is_active = true;

-- 2.2 医生资质证书记录表
CREATE TABLE IF NOT EXISTS public.doctor_certifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  doctor_id UUID NOT NULL REFERENCES public.doctor_profiles(id) ON DELETE CASCADE,
  
  cert_type TEXT NOT NULL,                        -- license, certificate, employment_proof, namecard, other
  cert_name TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT,
  is_primary BOOLEAN DEFAULT false,
  
  -- 审核信息
  status TEXT DEFAULT 'approved',                 -- pending, approved, rejected
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doctor_certs_doctor ON public.doctor_certifications(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_certs_type ON public.doctor_certifications(cert_type);

-- 2.3 医生审核日志表
CREATE TABLE IF NOT EXISTS public.doctor_audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES public.doctor_applications(id) ON DELETE CASCADE,
  
  action TEXT NOT NULL,                           -- submit, approve, reject, request_supplement
  old_status TEXT,
  new_status TEXT,
  reason TEXT,
  notes TEXT,
  
  performed_by UUID REFERENCES auth.users(id),
  performed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doctor_audit_application ON public.doctor_audit_logs(application_id);
CREATE INDEX IF NOT EXISTS idx_doctor_audit_action ON public.doctor_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_doctor_audit_time ON public.doctor_audit_logs(performed_at DESC);

-- ============================================
-- SECTION 3: CMS 页面管理
-- ============================================

-- 3.1 CMS 页面表
CREATE TABLE IF NOT EXISTS public.cms_pages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  page_key TEXT UNIQUE NOT NULL,                  -- home, growth_system, clinical_tools, career_development...
  
  -- 基本信息
  name TEXT NOT NULL,
  title TEXT,
  subtitle TEXT,
  description TEXT,
  
  -- SEO
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT,
  
  -- 状态
  status TEXT DEFAULT 'draft',                    -- draft, published, offline
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES auth.users(id),
  
  -- 版本控制
  version INTEGER DEFAULT 1,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cms_pages_key ON public.cms_pages(page_key);
CREATE INDEX IF NOT EXISTS idx_cms_pages_status ON public.cms_pages(status);

-- 3.2 CMS 页面区块表
CREATE TABLE IF NOT EXISTS public.cms_sections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  page_id UUID NOT NULL REFERENCES public.cms_pages(id) ON DELETE CASCADE,
  
  section_key TEXT NOT NULL,                      -- hero, feature_cards, cta_banner...
  section_type TEXT NOT NULL,                     -- hero, card_grid, text_block, cta, image_text...
  
  -- 内容
  title TEXT,
  subtitle TEXT,
  description TEXT,
  content JSONB DEFAULT '{}',                     -- 灵活内容字段
  
  -- CTA
  cta_text TEXT,
  cta_link TEXT,
  cta_style TEXT,                                 -- primary, secondary, outline
  
  -- 显示控制
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  
  -- 样式配置
  style_config JSONB DEFAULT '{}',                -- 背景色、间距等
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(page_id, section_key)
);

CREATE INDEX IF NOT EXISTS idx_cms_sections_page ON public.cms_sections(page_id);
CREATE INDEX IF NOT EXISTS idx_cms_sections_order ON public.cms_sections(page_id, display_order);

-- 3.3 CMS 区块子项表
CREATE TABLE IF NOT EXISTS public.cms_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES public.cms_sections(id) ON DELETE CASCADE,
  
  item_key TEXT,
  item_type TEXT,                                 -- card, list_item, feature, testimonial...
  
  -- 内容
  title TEXT,
  subtitle TEXT,
  description TEXT,
  content JSONB DEFAULT '{}',
  
  -- 媒体
  image_url TEXT,
  icon TEXT,
  
  -- 链接
  link_url TEXT,
  link_text TEXT,
  link_target TEXT DEFAULT '_self',
  
  -- 显示控制
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cms_items_section ON public.cms_items(section_id);
CREATE INDEX IF NOT EXISTS idx_cms_items_order ON public.cms_items(section_id, display_order);

-- ============================================
-- SECTION 4: 成长体系配置
-- ============================================

-- 4.1 成长方向表
CREATE TABLE IF NOT EXISTS public.growth_tracks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,                      -- general-practice, orthopedics, clinic-operations...
  
  -- 基本信息
  name TEXT NOT NULL,
  group_name TEXT NOT NULL,                       -- 入门与基础, 专科成长, 事业发展
  group_order INTEGER DEFAULT 0,
  
  -- 描述
  tagline TEXT,                                   -- 一句话定位
  description TEXT,
  target_audience TEXT,                           -- 适合人群
  
  -- 路径配置
  recommended_start TEXT,                         -- 推荐起点
  path_stages JSONB DEFAULT '[]',                 -- 路径阶段标签
  is_multi_stage BOOLEAN DEFAULT false,
  
  -- 课程中心映射
  default_stage TEXT,                             -- 默认一级阶段筛选
  default_specialty TEXT,                         -- 默认专科筛选
  sort_strategy TEXT DEFAULT 'recommended',       -- 排序策略
  filter_config JSONB DEFAULT '{}',               -- 完整筛选配置
  
  -- 显示配置
  icon TEXT,
  color TEXT,                                     -- 主题色
  
  -- 状态控制
  is_active BOOLEAN DEFAULT true,
  is_ready BOOLEAN DEFAULT false,                 -- 是否有有效课程
  fallback_action TEXT DEFAULT 'hide',            -- hide, coming_soon, browse_all
  
  display_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_growth_tracks_slug ON public.growth_tracks(slug);
CREATE INDEX IF NOT EXISTS idx_growth_tracks_group ON public.growth_tracks(group_name);
CREATE INDEX IF NOT EXISTS idx_growth_tracks_active ON public.growth_tracks(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_growth_tracks_order ON public.growth_tracks(group_order, display_order);

-- 4.2 成长方向-课程关联表
CREATE TABLE IF NOT EXISTS public.growth_track_courses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  track_id UUID NOT NULL REFERENCES public.growth_tracks(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  
  is_featured BOOLEAN DEFAULT false,              -- 是否为代表课程
  display_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(track_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_gtc_track ON public.growth_track_courses(track_id);
CREATE INDEX IF NOT EXISTS idx_gtc_course ON public.growth_track_courses(course_id);
CREATE INDEX IF NOT EXISTS idx_gtc_featured ON public.growth_track_courses(track_id, is_featured) WHERE is_featured = true;

-- ============================================
-- SECTION 5: 课程系统扩展
-- ============================================

-- 5.1 讲师表
CREATE TABLE IF NOT EXISTS public.instructors (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- 基本信息
  name TEXT NOT NULL,
  title TEXT,                                     -- DVM, DECVS...
  credentials JSONB DEFAULT '[]',                 -- 资质列表
  
  -- 详情
  bio TEXT,
  avatar_url TEXT,
  
  -- 联系方式(内部)
  email TEXT,
  phone TEXT,
  
  -- 状态
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_instructors_active ON public.instructors(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_instructors_name ON public.instructors(name);

-- 5.2 课程-讲师关联表
CREATE TABLE IF NOT EXISTS public.course_instructors (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES public.instructors(id) ON DELETE CASCADE,
  
  role TEXT DEFAULT 'instructor',                 -- instructor, assistant, guest
  display_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(course_id, instructor_id)
);

CREATE INDEX IF NOT EXISTS idx_ci_course ON public.course_instructors(course_id);
CREATE INDEX IF NOT EXISTS idx_ci_instructor ON public.course_instructors(instructor_id);

-- 5.3 扩展 courses 表
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS audit_status TEXT DEFAULT 'draft';       -- draft, pending, approved, rejected
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS is_charity BOOLEAN DEFAULT false;        -- 公益课标记
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS decision_summary JSONB DEFAULT '{}';     -- 课程决策摘要
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS highlights JSONB DEFAULT '[]';           -- 课程亮点
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_courses_slug ON public.courses(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_courses_audit ON public.courses(audit_status);
CREATE INDEX IF NOT EXISTS idx_courses_charity ON public.courses(is_charity) WHERE is_charity = true;

-- ============================================
-- SECTION 6: 商城系统扩展
-- ============================================

-- 6.1 一级采购场景表
CREATE TABLE IF NOT EXISTS public.scene_categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,                      -- startup-essentials, upgrade-expansion...
  
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scene_categories_slug ON public.scene_categories(slug);
CREATE INDEX IF NOT EXISTS idx_scene_categories_order ON public.scene_categories(display_order);

-- 6.2 商品图片表
CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  
  image_url TEXT NOT NULL,
  alt_text TEXT,
  is_primary BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_images_product ON public.product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_primary ON public.product_images(product_id, is_primary) WHERE is_primary = true;

-- 6.3 商品标签表
CREATE TABLE IF NOT EXISTS public.product_tags (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  tag_type TEXT,                                  -- feature, audience, scenario
  
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_tags_slug ON public.product_tags(slug);
CREATE INDEX IF NOT EXISTS idx_product_tags_type ON public.product_tags(tag_type);

-- 6.4 商品-标签关联表
CREATE TABLE IF NOT EXISTS public.product_tag_relations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.product_tags(id) ON DELETE CASCADE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(product_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_ptr_product ON public.product_tag_relations(product_id);
CREATE INDEX IF NOT EXISTS idx_ptr_tag ON public.product_tag_relations(tag_id);

-- 6.5 扩展 products 表
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS scene_category_id UUID REFERENCES public.scene_categories(id);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS audit_status TEXT DEFAULT 'draft';      -- draft, pending, approved, rejected
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';            -- draft, published, offline
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS decision_summary JSONB DEFAULT '{}';    -- 商品决策摘要
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS doctor_stage_fit JSONB DEFAULT '[]';    -- 适合医生阶段
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS clinic_stage_fit JSONB DEFAULT '[]';    -- 适合诊所阶段
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_scene ON public.products(scene_category_id);
CREATE INDEX IF NOT EXISTS idx_products_audit_status ON public.products(audit_status);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);

-- ============================================
-- SECTION 7: 路由与占位页
-- ============================================

-- 7.1 路由注册表
CREATE TABLE IF NOT EXISTS public.route_registry (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  path TEXT UNIQUE NOT NULL,                      -- /zh/growth-system, /zh/courses...
  
  name TEXT NOT NULL,
  module TEXT NOT NULL,                           -- growth_system, courses, shop, doctor...
  description TEXT,
  
  -- 状态控制
  route_status TEXT DEFAULT 'active',             -- active, coming_soon, hidden, redirect
  redirect_target TEXT,                           -- 重定向目标路径
  placeholder_template_id UUID,                   -- 关联占位模板
  
  -- 元信息
  requires_auth BOOLEAN DEFAULT false,
  requires_doctor BOOLEAN DEFAULT false,
  requires_admin BOOLEAN DEFAULT false,
  
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_route_registry_path ON public.route_registry(path);
CREATE INDEX IF NOT EXISTS idx_route_registry_module ON public.route_registry(module);
CREATE INDEX IF NOT EXISTS idx_route_registry_status ON public.route_registry(route_status);

-- 7.2 占位页模板表
CREATE TABLE IF NOT EXISTS public.coming_soon_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,                      -- default, course_module, shop_category...
  
  name TEXT NOT NULL,
  
  -- 内容
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  
  -- 按钮
  primary_button_text TEXT,
  primary_button_link TEXT,
  secondary_button_text TEXT,
  secondary_button_link TEXT,
  
  -- 适用范围
  applicable_modules JSONB DEFAULT '[]',
  
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coming_soon_code ON public.coming_soon_templates(code);

-- 更新路由表外键
ALTER TABLE public.route_registry 
  ADD CONSTRAINT fk_route_placeholder 
  FOREIGN KEY (placeholder_template_id) 
  REFERENCES public.coming_soon_templates(id) 
  ON DELETE SET NULL;

-- ============================================
-- SECTION 8: 字典系统
-- ============================================

-- 8.1 字典分组表
CREATE TABLE IF NOT EXISTS public.dictionaries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,                      -- course_stage, specialty, delivery_mode...
  
  name TEXT NOT NULL,
  description TEXT,
  
  is_system BOOLEAN DEFAULT false,                -- 系统字典不可删除
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dictionaries_code ON public.dictionaries(code);

-- 8.2 字典项表
CREATE TABLE IF NOT EXISTS public.dictionary_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  dict_id UUID NOT NULL REFERENCES public.dictionaries(id) ON DELETE CASCADE,
  
  code TEXT NOT NULL,                             -- 项编码
  label TEXT NOT NULL,                            -- 显示文本
  label_en TEXT,                                  -- 英文标签
  
  value TEXT,                                     -- 项值(可选)
  description TEXT,
  
  parent_id UUID REFERENCES public.dictionary_items(id),  -- 支持层级
  
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  
  extra_data JSONB DEFAULT '{}',                  -- 扩展数据
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(dict_id, code)
);

CREATE INDEX IF NOT EXISTS idx_dict_items_dict ON public.dictionary_items(dict_id);
CREATE INDEX IF NOT EXISTS idx_dict_items_code ON public.dictionary_items(dict_id, code);
CREATE INDEX IF NOT EXISTS idx_dict_items_parent ON public.dictionary_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_dict_items_order ON public.dictionary_items(dict_id, display_order);

-- ============================================
-- SECTION 9: 媒体文件管理
-- ============================================

CREATE TABLE IF NOT EXISTS public.media_files (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- 文件信息
  file_name TEXT NOT NULL,
  original_name TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT,                                 -- image, video, document, other
  mime_type TEXT,
  file_size INTEGER,
  
  -- 分类
  category TEXT,                                  -- course, product, doctor, cms, avatar...
  
  -- 关联(可选)
  entity_type TEXT,                               -- course, product, doctor_application...
  entity_id TEXT,
  
  -- 元信息
  alt_text TEXT,
  description TEXT,
  
  -- 上传者
  uploaded_by UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_files_category ON public.media_files(category);
CREATE INDEX IF NOT EXISTS idx_media_files_entity ON public.media_files(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_media_files_uploader ON public.media_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_media_files_type ON public.media_files(file_type);

-- ============================================
-- SECTION 10: 管理员操作日志
-- ============================================

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- 操作者
  admin_user_id UUID NOT NULL REFERENCES auth.users(id),
  admin_name TEXT,
  
  -- 操作信息
  module TEXT NOT NULL,                           -- doctor_verify, course, product, cms...
  action TEXT NOT NULL,                           -- create, update, delete, publish, approve, reject...
  
  -- 目标
  target_type TEXT,                               -- doctor_application, course, product...
  target_id TEXT,
  target_name TEXT,
  
  -- 变更详情
  old_value JSONB,
  new_value JSONB,
  changes_summary TEXT,
  
  -- 元信息
  ip_address TEXT,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_user ON public.admin_audit_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_module ON public.admin_audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_admin_audit_action ON public.admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_target ON public.admin_audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_time ON public.admin_audit_logs(created_at DESC);

-- ============================================
-- SECTION 11: RLS 策略
-- ============================================

-- 11.1 admin_roles RLS
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view roles" ON public.admin_roles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Super admins can manage roles" ON public.admin_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      JOIN public.admin_roles r ON p.admin_role_id = r.id 
      WHERE p.id = auth.uid() AND r.code = 'super_admin'
    )
  );

-- 11.2 permissions RLS
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view permissions" ON public.permissions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 11.3 role_permissions RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view role permissions" ON public.role_permissions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Super admins can manage role permissions" ON public.role_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      JOIN public.admin_roles r ON p.admin_role_id = r.id 
      WHERE p.id = auth.uid() AND r.code = 'super_admin'
    )
  );

-- 11.4 doctor_profiles RLS
ALTER TABLE public.doctor_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own doctor profile" ON public.doctor_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage doctor profiles" ON public.doctor_profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 11.5 doctor_certifications RLS
ALTER TABLE public.doctor_certifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors can view own certifications" ON public.doctor_certifications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.doctor_profiles WHERE id = doctor_id AND user_id = auth.uid())
  );

CREATE POLICY "Admins can manage certifications" ON public.doctor_certifications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 11.6 doctor_audit_logs RLS
ALTER TABLE public.doctor_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs" ON public.doctor_audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can create audit logs" ON public.doctor_audit_logs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 11.7 cms_pages RLS
ALTER TABLE public.cms_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published pages" ON public.cms_pages
  FOR SELECT USING (status = 'published');

CREATE POLICY "Admins can manage cms pages" ON public.cms_pages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 11.8 cms_sections RLS
ALTER TABLE public.cms_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active sections" ON public.cms_sections
  FOR SELECT USING (
    is_active = true AND 
    EXISTS (SELECT 1 FROM public.cms_pages WHERE id = page_id AND status = 'published')
  );

CREATE POLICY "Admins can manage cms sections" ON public.cms_sections
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 11.9 cms_items RLS
ALTER TABLE public.cms_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active items" ON public.cms_items
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage cms items" ON public.cms_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 11.10 growth_tracks RLS
ALTER TABLE public.growth_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active growth tracks" ON public.growth_tracks
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage growth tracks" ON public.growth_tracks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 11.11 growth_track_courses RLS
ALTER TABLE public.growth_track_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view track courses" ON public.growth_track_courses
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage track courses" ON public.growth_track_courses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 11.12 instructors RLS
ALTER TABLE public.instructors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active instructors" ON public.instructors
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage instructors" ON public.instructors
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 11.13 course_instructors RLS
ALTER TABLE public.course_instructors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view course instructors" ON public.course_instructors
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage course instructors" ON public.course_instructors
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 11.14 scene_categories RLS
ALTER TABLE public.scene_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active scenes" ON public.scene_categories
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage scenes" ON public.scene_categories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 11.15 product_images RLS
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view product images" ON public.product_images
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage product images" ON public.product_images
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 11.16 product_tags RLS
ALTER TABLE public.product_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active tags" ON public.product_tags
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage tags" ON public.product_tags
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 11.17 product_tag_relations RLS
ALTER TABLE public.product_tag_relations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tag relations" ON public.product_tag_relations
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage tag relations" ON public.product_tag_relations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 11.18 route_registry RLS
ALTER TABLE public.route_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view routes" ON public.route_registry
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage routes" ON public.route_registry
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 11.19 coming_soon_templates RLS
ALTER TABLE public.coming_soon_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active templates" ON public.coming_soon_templates
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage templates" ON public.coming_soon_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 11.20 dictionaries RLS
ALTER TABLE public.dictionaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active dictionaries" ON public.dictionaries
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage dictionaries" ON public.dictionaries
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 11.21 dictionary_items RLS
ALTER TABLE public.dictionary_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active items" ON public.dictionary_items
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage dictionary items" ON public.dictionary_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 11.22 media_files RLS
ALTER TABLE public.media_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view media" ON public.media_files
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can upload" ON public.media_files
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage all media" ON public.media_files
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 11.23 admin_audit_logs RLS
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs" ON public.admin_audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "System can insert audit logs" ON public.admin_audit_logs
  FOR INSERT WITH CHECK (true);

-- ============================================
-- SECTION 12: 触发器
-- ============================================

-- 12.1 通用 updated_at 触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 12.2 为所有需要的表添加 updated_at 触发器
DO $$
DECLARE
  tables TEXT[] := ARRAY[
    'admin_roles', 'doctor_profiles', 'doctor_certifications',
    'cms_pages', 'cms_sections', 'cms_items',
    'growth_tracks', 'instructors',
    'scene_categories', 'route_registry', 'coming_soon_templates',
    'dictionaries', 'dictionary_items'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trigger_update_%I_updated_at ON public.%I;
      CREATE TRIGGER trigger_update_%I_updated_at
        BEFORE UPDATE ON public.%I
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    ', t, t, t, t);
  END LOOP;
END $$;

-- ============================================
-- SECTION 13: 初始数据
-- ============================================

-- 13.1 初始化角色
INSERT INTO public.admin_roles (code, name, description, is_system) VALUES
  ('super_admin', '超级管理员', '拥有所有权限', true),
  ('content_admin', '内容管理员', '管理CMS、课程、商品内容', true),
  ('doctor_reviewer', '医生审核员', '审核医生注册申请', true),
  ('course_manager', '课程管理员', '管理课程发布', true),
  ('product_manager', '商品管理员', '管理商品发布', true),
  ('lead_handler', '线索处理员', '处理采购线索', true),
  ('community_moderator', '社区管理员', '管理社区内容', true),
  ('data_viewer', '数据查看员', '只读查看数据', true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- 13.2 初始化权限
INSERT INTO public.permissions (code, name, module, action, display_order) VALUES
  -- 医生审核
  ('doctor_verify.view', '查看医生审核', 'doctor_verify', 'view', 1),
  ('doctor_verify.approve', '审核通过医生', 'doctor_verify', 'approve', 2),
  ('doctor_verify.reject', '审核拒绝医生', 'doctor_verify', 'reject', 3),
  
  -- CMS
  ('cms.view', '查看CMS内容', 'cms', 'view', 10),
  ('cms.edit', '编辑CMS内容', 'cms', 'edit', 11),
  ('cms.publish', '发布CMS页面', 'cms', 'publish', 12),
  
  -- 成长体系
  ('growth.view', '查看成长体系', 'growth', 'view', 20),
  ('growth.edit', '编辑成长体系', 'growth', 'edit', 21),
  
  -- 课程
  ('course.view', '查看课程', 'course', 'view', 30),
  ('course.create', '创建课程', 'course', 'create', 31),
  ('course.edit', '编辑课程', 'course', 'edit', 32),
  ('course.publish', '发布课程', 'course', 'publish', 33),
  ('course.offline', '下线课程', 'course', 'offline', 34),
  
  -- 商品
  ('product.view', '查看商品', 'product', 'view', 40),
  ('product.create', '创建商品', 'product', 'create', 41),
  ('product.edit', '编辑商品', 'product', 'edit', 42),
  ('product.publish', '发布商品', 'product', 'publish', 43),
  ('product.offline', '下线商品', 'product', 'offline', 44),
  
  -- 线索
  ('lead.view', '查看采购线索', 'lead', 'view', 50),
  ('lead.assign', '分配线索', 'lead', 'assign', 51),
  ('lead.update', '更新线索状态', 'lead', 'update', 52),
  
  -- 社区
  ('community.view', '查看社区内容', 'community', 'view', 60),
  ('community.moderate', '审核社区内容', 'community', 'moderate', 61),
  
  -- AI
  ('ai.view', '查看AI配置', 'ai', 'view', 70),
  ('ai.edit', 'AI配置', 'ai', 'edit', 71),
  
  -- 路由
  ('route.view', '查看路由配置', 'route', 'view', 80),
  ('route.edit', '编辑路由配置', 'route', 'edit', 81),
  
  -- 系统
  ('system.view', '查看系统设置', 'system', 'view', 90),
  ('system.edit', '编辑系统设置', 'system', 'edit', 91),
  
  -- 用户权限
  ('user.view', '查看用户', 'user', 'view', 100),
  ('user.create', '创建管理员', 'user', 'create', 101),
  ('user.edit', '编辑管理员', 'user', 'edit', 102),
  ('role.view', '查看角色', 'role', 'view', 110),
  ('role.edit', '编辑角色', 'role', 'edit', 111)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  module = EXCLUDED.module,
  action = EXCLUDED.action;

-- 13.3 为超级管理员分配所有权限
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.admin_roles r
CROSS JOIN public.permissions p
WHERE r.code = 'super_admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 13.4 初始化字典
INSERT INTO public.dictionaries (code, name, description, is_system) VALUES
  ('course_stage', '课程一级阶段', '课程中心一级阶段筛选', true),
  ('specialty', '专科方向', '专科方向筛选', true),
  ('delivery_mode', '授课形式', '课程授课形式', true),
  ('learning_goal', '学习目标', '课程学习目标', true),
  ('difficulty_level', '难度等级', '课程难度等级', true),
  ('target_audience', '适合人群', '课程/商品适合人群', true),
  ('pricing_type', '价格类型', '课程价格类型', true),
  ('doctor_position', '医生职位', '医生职位/身份', true),
  ('product_scene', '商品使用场景', '商品使用场景', true),
  ('purchase_mode', '采购方式', '商品采购方式', true),
  ('ticket_level', '客单级别', '商品客单价级别', true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- 13.5 初始化字典项 - 课程一级阶段
INSERT INTO public.dictionary_items (dict_id, code, label, label_en, display_order)
SELECT d.id, items.code, items.label, items.label_en, items.display_order
FROM public.dictionaries d
CROSS JOIN (VALUES
  ('foundation', '基础入门', 'Foundation', 1),
  ('clinical_skills', '临床技能', 'Clinical Skills', 2),
  ('specialty_deep', '专科深化', 'Specialty Deep Dive', 3),
  ('master_advanced', '大师进阶', 'Master Advanced', 4),
  ('business_ops', '经营管理', 'Business & Operations', 5)
) AS items(code, label, label_en, display_order)
WHERE d.code = 'course_stage'
ON CONFLICT (dict_id, code) DO UPDATE SET
  label = EXCLUDED.label,
  label_en = EXCLUDED.label_en;

-- 13.6 初始化字典项 - 专科方向
INSERT INTO public.dictionary_items (dict_id, code, label, label_en, display_order)
SELECT d.id, items.code, items.label, items.label_en, items.display_order
FROM public.dictionaries d
CROSS JOIN (VALUES
  ('general', '全科', 'General Practice', 1),
  ('orthopedics', '骨科', 'Orthopedics', 2),
  ('soft_tissue', '软组织外科', 'Soft Tissue Surgery', 3),
  ('ophthalmology', '眼科', 'Ophthalmology', 4),
  ('ultrasound', '超声', 'Ultrasound', 5),
  ('dentistry', '牙科', 'Dentistry', 6),
  ('cardiology', '心脏科', 'Cardiology', 7),
  ('dermatology', '皮肤科', 'Dermatology', 8),
  ('neurology', '神经科', 'Neurology', 9),
  ('oncology', '肿瘤科', 'Oncology', 10),
  ('emergency', '急诊', 'Emergency', 11),
  ('anesthesia', '麻醉', 'Anesthesia', 12),
  ('exotic', '异宠', 'Exotic', 13)
) AS items(code, label, label_en, display_order)
WHERE d.code = 'specialty'
ON CONFLICT (dict_id, code) DO UPDATE SET
  label = EXCLUDED.label,
  label_en = EXCLUDED.label_en;

-- 13.7 初始化占位页模板
INSERT INTO public.coming_soon_templates (code, name, title, subtitle, description, primary_button_text, primary_button_link, applicable_modules) VALUES
  ('default', '默认模板', '功能开发中', '敬请期待', '我们正在努力开发此功能，请稍后再来。', '返回首页', '/zh', '[]'),
  ('course_module', '课程模块', '课程模块开发中', '精彩内容即将上线', '我们正在准备更多优质课程内容，敬请期待。', '浏览全部课程', '/zh/courses', '["courses"]'),
  ('shop_category', '商城分类', '商品分类筹备中', '更多好物即将上架', '我们正在精选更多优质产品，敬请期待。', '浏览全部商品', '/zh/shop', '["shop"]'),
  ('growth_track', '成长方向', '成长方向筹备中', '学习路径规划中', '我们正在规划此方向的学习路径，敬请期待。', '查看成长体系', '/zh/growth-system', '["growth"]')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  title = EXCLUDED.title,
  subtitle = EXCLUDED.subtitle;

-- 13.8 初始化成长方向
INSERT INTO public.growth_tracks (slug, name, group_name, group_order, tagline, target_audience, is_active, is_ready, display_order) VALUES
  ('general-practice', '全科基础', '入门与基础', 1, '扎实基础，全面成长', '刚入行或希望夯实基础的兽医', true, true, 1),
  ('orthopedics', '骨科进阶', '专科成长', 2, '骨科技术精进之路', '希望深耕骨科领域的兽医', true, true, 2),
  ('soft-tissue', '软组织外科', '专科成长', 2, '软组织手术专精', '希望提升软组织手术能力的兽医', true, true, 3),
  ('ophthalmology', '眼科专精', '专科成长', 2, '眼科诊疗专家之路', '对眼科感兴趣的兽医', true, true, 4),
  ('ultrasound', '超声诊断', '专科成长', 2, '影像诊断能力提升', '希望掌握超声诊断的兽医', true, true, 5),
  ('certification', '考证入行', '入门与基础', 1, '执业资格备考指南', '准备执业资格考试的学员', true, false, 6),
  ('clinic-operations', '诊所经营', '事业发展', 3, '诊所管理与经营', '诊所管理者或创业者', true, false, 7)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  group_name = EXCLUDED.group_name,
  tagline = EXCLUDED.tagline;

-- 13.9 初始化一级采购场景
INSERT INTO public.scene_categories (slug, name, description, icon, display_order) VALUES
  ('startup-essentials', '创业必备', '新诊所开业必需的基础设备', '🏥', 1),
  ('upgrade-expansion', '升级扩容', '现有诊所设备升级换代', '📈', 2),
  ('specialty-setup', '专科建设', '建立专科诊疗能力', '🎯', 3),
  ('course-equipment', '课程同款', 'VetSphere课程推荐设备', '🎓', 4),
  ('daily-supplies', '日常耗材', '临床日常消耗品', '📦', 5),
  ('solution-package', '方案采购', '整体解决方案', '💼', 6)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

COMMIT;

-- ============================================
-- VERIFICATION
-- ============================================
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN (
    'admin_roles', 'permissions', 'role_permissions',
    'doctor_profiles', 'doctor_certifications', 'doctor_audit_logs',
    'cms_pages', 'cms_sections', 'cms_items',
    'growth_tracks', 'growth_track_courses',
    'instructors', 'course_instructors',
    'scene_categories', 'product_images', 'product_tags', 'product_tag_relations',
    'route_registry', 'coming_soon_templates',
    'dictionaries', 'dictionary_items',
    'media_files', 'admin_audit_logs'
  );
  
  RAISE NOTICE '=== Migration 014 完成: 创建/更新 % 张P0表 ===', table_count;
END $$;
