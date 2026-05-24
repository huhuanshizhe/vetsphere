-- VetSphere Migration 031: Intl content growth platform + admin RAG authoring

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- SECTION 1: AI task templates
-- ============================================

CREATE TABLE IF NOT EXISTS public.ai_task_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  prompt_template TEXT NOT NULL,
  model_provider TEXT,
  model_name TEXT,
  category TEXT,
  max_tokens INTEGER DEFAULT 4096,
  temperature NUMERIC(3,2) DEFAULT 0.70,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_task_templates_category
  ON public.ai_task_templates(category);

INSERT INTO public.ai_task_templates (
  task_key,
  name,
  description,
  prompt_template,
  category,
  max_tokens,
  temperature,
  is_active
) VALUES
  (
    'content_brief_planner',
    '内容 Brief 规划',
    '根据主题、受众和内部证据生成结构化内容 brief',
    'You are a veterinary content strategist. Build a structured content brief from the provided topic, audience, and evidence. Return JSON with sections: angle, target_queries, audience, outline, evidence_priorities, internal_links, risks.',
    'content',
    3000,
    0.40,
    true
  ),
  (
    'content_outline_generator',
    '内容大纲生成',
    '根据 brief 和 RAG 证据生成页面大纲',
    'You are a veterinary medical content planner. Produce a sectioned outline that is machine-readable, evidence-backed, and optimized for SEO and GEO. Return JSON with ordered sections.',
    'content',
    3000,
    0.50,
    true
  ),
  (
    'content_draft_generator',
    '内容初稿生成',
    '根据 brief、大纲和内部证据生成初稿',
    'You are a veterinary domain writer. Generate a high-trust draft grounded only in provided evidence. Include clear headings, opening answer, references, and conversion-aware internal linking suggestions. Return JSON with title, summary, opening_answer, body_markdown, faq_json, references_json.',
    'content',
    5000,
    0.55,
    true
  ),
  (
    'content_section_expander',
    '内容段落扩写',
    '围绕单个 section 和证据生成扩写内容',
    'Expand a single content section using only the supplied evidence. Keep the tone factual, structured, and concise. Return JSON with section_title and section_markdown.',
    'content',
    2500,
    0.45,
    true
  ),
  (
    'content_faq_extractor',
    'FAQ 抽取',
    '从资料和草稿中抽取 FAQ',
    'Extract the most relevant veterinary professional FAQs from the supplied evidence. Return JSON array with question and answer.',
    'content',
    2200,
    0.35,
    true
  ),
  (
    'content_glossary_extractor',
    '术语词条抽取',
    '从资料中抽取术语与定义',
    'Extract glossary candidates from the supplied evidence. Return JSON array with term, definition, synonyms, and related_topics.',
    'content',
    2200,
    0.30,
    true
  ),
  (
    'content_meta_generator',
    'SEO 元信息生成',
    '生成 SEO title 和 description',
    'Generate concise, high-CTR SEO title and meta description for a veterinary specialist audience using only the supplied draft and evidence. Return JSON.',
    'content',
    1200,
    0.30,
    true
  ),
  (
    'content_internal_link_suggester',
    '内链建议生成',
    '根据现有业务实体生成内链建议',
    'Suggest internal links to courses, products, instructors, and related content using the supplied entities and draft. Return JSON array.',
    'content',
    1500,
    0.25,
    true
  ),
  (
    'content_locale_adapter',
    '本地化改写',
    '将英文源内容改写为目标 locale 的专业版本',
    'Adapt the supplied source content for the target locale. Preserve meaning, professional tone, and SEO structure. Do not perform literal translation only. Return JSON with localized fields.',
    'content',
    4000,
    0.45,
    true
  ),
  (
    'content_claim_reviewer',
    '内容事实审阅',
    '核对草稿是否脱离证据、是否存在高风险表述',
    'Review the supplied draft against the supplied evidence. Return JSON with unsupported_claims, missing_evidence, risk_flags, and revision_recommendations.',
    'content',
    2500,
    0.20,
    true
  ),
  (
    'content_publish_readiness_checker',
    '发布就绪检查',
    '检查发布前所需内容要素是否齐全',
    'Check whether the supplied content is ready to publish for SEO, GEO, and editorial governance. Return JSON with checks, failures, warnings, and a final readiness boolean.',
    'content',
    1800,
    0.15,
    true
  )
ON CONFLICT (task_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  prompt_template = EXCLUDED.prompt_template,
  category = EXCLUDED.category,
  max_tokens = EXCLUDED.max_tokens,
  temperature = EXCLUDED.temperature,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- ============================================
-- SECTION 2: Unified content platform
-- ============================================

CREATE TABLE IF NOT EXISTS public.content_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_type TEXT NOT NULL,
  canonical_slug TEXT NOT NULL,
  workflow_state TEXT DEFAULT 'draft' NOT NULL,
  source_language TEXT DEFAULT 'en' NOT NULL,
  primary_specialty TEXT,
  primary_procedure TEXT,
  target_audience TEXT,
  search_intent TEXT,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_team TEXT,
  publish_priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  CONSTRAINT content_records_type_chk CHECK (
    content_type IN (
      'specialty_hub',
      'procedure',
      'case',
      'solution',
      'faq_hub',
      'glossary_term',
      'compare_page',
      'resource'
    )
  ),
  CONSTRAINT content_records_workflow_chk CHECK (
    workflow_state IN ('draft', 'in_review', 'approved', 'scheduled', 'published', 'archived')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_content_records_type_slug
  ON public.content_records(content_type, canonical_slug);
CREATE INDEX IF NOT EXISTS idx_content_records_workflow
  ON public.content_records(workflow_state);
CREATE INDEX IF NOT EXISTS idx_content_records_specialty
  ON public.content_records(primary_specialty);

CREATE TABLE IF NOT EXISTS public.content_localizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID NOT NULL REFERENCES public.content_records(id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  summary TEXT,
  hero_title TEXT,
  hero_subtitle TEXT,
  seo_title TEXT,
  seo_description TEXT,
  body_markdown TEXT,
  body_json JSONB DEFAULT '{}'::jsonb,
  opening_answer TEXT,
  references_json JSONB DEFAULT '[]'::jsonb,
  faq_json JSONB DEFAULT '[]'::jsonb,
  is_source_locale BOOLEAN DEFAULT false,
  quality_score NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT content_localizations_unique UNIQUE (content_id, locale)
);

CREATE INDEX IF NOT EXISTS idx_content_localizations_locale
  ON public.content_localizations(locale);

CREATE TABLE IF NOT EXISTS public.content_site_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID NOT NULL REFERENCES public.content_records(id) ON DELETE CASCADE,
  site_code TEXT NOT NULL,
  publish_status TEXT DEFAULT 'draft' NOT NULL,
  slug_override TEXT,
  seo_title_override TEXT,
  seo_description_override TEXT,
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  route_status TEXT DEFAULT 'active' NOT NULL,
  route_config_json JSONB DEFAULT '{}'::jsonb,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT content_site_views_unique UNIQUE (content_id, site_code),
  CONSTRAINT content_site_views_publish_chk CHECK (publish_status IN ('draft', 'published', 'archived')),
  CONSTRAINT content_site_views_route_chk CHECK (route_status IN ('active', 'coming_soon', 'hidden', 'redirect'))
);

CREATE INDEX IF NOT EXISTS idx_content_site_views_site_status
  ON public.content_site_views(site_code, publish_status, route_status);

CREATE TABLE IF NOT EXISTS public.content_blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID NOT NULL REFERENCES public.content_records(id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  block_key TEXT NOT NULL,
  block_type TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  data_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_blocks_content_locale
  ON public.content_blocks(content_id, locale, display_order);

CREATE TABLE IF NOT EXISTS public.content_relations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID NOT NULL REFERENCES public.content_records(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT content_relations_target_chk CHECK (target_type IN ('course', 'product', 'instructor', 'content'))
);

CREATE INDEX IF NOT EXISTS idx_content_relations_content
  ON public.content_relations(content_id, display_order);
CREATE INDEX IF NOT EXISTS idx_content_relations_target
  ON public.content_relations(target_type, target_id);

CREATE TABLE IF NOT EXISTS public.content_taxonomy_terms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  taxonomy_key TEXT NOT NULL,
  term_code TEXT NOT NULL,
  label TEXT NOT NULL,
  locale TEXT DEFAULT 'en' NOT NULL,
  description TEXT,
  metadata_json JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT content_taxonomy_terms_unique UNIQUE (taxonomy_key, term_code, locale)
);

CREATE INDEX IF NOT EXISTS idx_content_taxonomy_terms_key
  ON public.content_taxonomy_terms(taxonomy_key, locale, display_order);

CREATE TABLE IF NOT EXISTS public.content_term_relations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID NOT NULL REFERENCES public.content_records(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES public.content_taxonomy_terms(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT content_term_relations_unique UNIQUE (content_id, term_id)
);

-- ============================================
-- SECTION 3: Editorial workflow
-- ============================================

CREATE TABLE IF NOT EXISTS public.content_briefs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID REFERENCES public.content_records(id) ON DELETE SET NULL,
  site_code TEXT DEFAULT 'intl' NOT NULL,
  locale TEXT DEFAULT 'en' NOT NULL,
  title TEXT NOT NULL,
  target_queries JSONB DEFAULT '[]'::jsonb,
  target_audience TEXT,
  search_intent TEXT,
  primary_angle TEXT,
  linked_entity_ids JSONB DEFAULT '[]'::jsonb,
  source_requirements JSONB DEFAULT '[]'::jsonb,
  brief_json JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'draft' NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT content_briefs_status_chk CHECK (status IN ('draft', 'ready', 'archived'))
);

CREATE INDEX IF NOT EXISTS idx_content_briefs_status
  ON public.content_briefs(site_code, locale, status);

CREATE TABLE IF NOT EXISTS public.content_workflow_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID NOT NULL REFERENCES public.content_records(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  old_state TEXT,
  new_state TEXT,
  payload_json JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_workflow_events_content
  ON public.content_workflow_events(content_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.content_generation_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID REFERENCES public.content_records(id) ON DELETE SET NULL,
  brief_id UUID REFERENCES public.content_briefs(id) ON DELETE SET NULL,
  task_key TEXT NOT NULL,
  run_type TEXT NOT NULL,
  model_provider TEXT,
  model_name TEXT,
  prompt_version TEXT,
  input_json JSONB DEFAULT '{}'::jsonb,
  output_json JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending' NOT NULL,
  operator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT content_generation_runs_status_chk CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_content_generation_runs_content
  ON public.content_generation_runs(content_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_generation_runs_task
  ON public.content_generation_runs(task_key, created_at DESC);

CREATE TABLE IF NOT EXISTS public.generation_citations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  generation_run_id UUID NOT NULL REFERENCES public.content_generation_runs(id) ON DELETE CASCADE,
  asset_id UUID,
  chunk_id UUID,
  citation_text TEXT,
  metadata_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generation_citations_run
  ON public.generation_citations(generation_run_id);

-- ============================================
-- SECTION 4: Knowledge base and retrieval
-- ============================================

CREATE TABLE IF NOT EXISTS public.knowledge_assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_type TEXT NOT NULL,
  source_id TEXT,
  site_code TEXT DEFAULT 'intl' NOT NULL,
  locale TEXT DEFAULT 'en' NOT NULL,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'ready' NOT NULL,
  metadata_json JSONB DEFAULT '{}'::jsonb,
  raw_text TEXT,
  source_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT knowledge_assets_status_chk CHECK (status IN ('draft', 'processing', 'ready', 'archived'))
);

CREATE INDEX IF NOT EXISTS idx_knowledge_assets_scope
  ON public.knowledge_assets(site_code, locale, source_type, status);

CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.knowledge_assets(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,
  token_count INTEGER DEFAULT 0,
  site_code TEXT DEFAULT 'intl' NOT NULL,
  locale TEXT DEFAULT 'en' NOT NULL,
  specialty TEXT,
  procedure TEXT,
  entity_type TEXT,
  entity_id TEXT,
  metadata_json JSONB DEFAULT '{}'::jsonb,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT knowledge_chunks_unique UNIQUE (asset_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_scope
  ON public.knowledge_chunks(site_code, locale, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_specialty
  ON public.knowledge_chunks(specialty, procedure);

-- ============================================
-- SECTION 5: RLS
-- ============================================

ALTER TABLE public.ai_task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_localizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_site_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_taxonomy_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_term_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_workflow_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_generation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage ai task templates" ON public.ai_task_templates;
CREATE POLICY "Admins can manage ai task templates" ON public.ai_task_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "Admins can manage content records" ON public.content_records;
CREATE POLICY "Admins can manage content records" ON public.content_records
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "Public can view published content records" ON public.content_records;
CREATE POLICY "Public can view published content records" ON public.content_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.content_site_views csv
      WHERE csv.content_id = content_records.id
        AND csv.publish_status = 'published'
    )
  );

DROP POLICY IF EXISTS "Admins can manage content localizations" ON public.content_localizations;
CREATE POLICY "Admins can manage content localizations" ON public.content_localizations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "Public can view published content localizations" ON public.content_localizations;
CREATE POLICY "Public can view published content localizations" ON public.content_localizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.content_site_views csv
      WHERE csv.content_id = content_localizations.content_id
        AND csv.publish_status = 'published'
    )
  );

DROP POLICY IF EXISTS "Admins can manage content site views" ON public.content_site_views;
CREATE POLICY "Admins can manage content site views" ON public.content_site_views
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "Public can view published content site views" ON public.content_site_views;
CREATE POLICY "Public can view published content site views" ON public.content_site_views
  FOR SELECT USING (publish_status = 'published');

DROP POLICY IF EXISTS "Admins can manage content blocks" ON public.content_blocks;
CREATE POLICY "Admins can manage content blocks" ON public.content_blocks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "Public can view published content blocks" ON public.content_blocks;
CREATE POLICY "Public can view published content blocks" ON public.content_blocks
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.content_site_views csv
      WHERE csv.content_id = content_blocks.content_id
        AND csv.publish_status = 'published'
    )
  );

DROP POLICY IF EXISTS "Admins can manage content relations" ON public.content_relations;
CREATE POLICY "Admins can manage content relations" ON public.content_relations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "Public can view published content relations" ON public.content_relations;
CREATE POLICY "Public can view published content relations" ON public.content_relations
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.content_site_views csv
      WHERE csv.content_id = content_relations.content_id
        AND csv.publish_status = 'published'
    )
  );

DROP POLICY IF EXISTS "Admins can manage taxonomy terms" ON public.content_taxonomy_terms;
CREATE POLICY "Admins can manage taxonomy terms" ON public.content_taxonomy_terms
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "Public can view active taxonomy terms" ON public.content_taxonomy_terms;
CREATE POLICY "Public can view active taxonomy terms" ON public.content_taxonomy_terms
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage content term relations" ON public.content_term_relations;
CREATE POLICY "Admins can manage content term relations" ON public.content_term_relations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "Public can view published content term relations" ON public.content_term_relations;
CREATE POLICY "Public can view published content term relations" ON public.content_term_relations
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.content_site_views csv
      WHERE csv.content_id = content_term_relations.content_id
        AND csv.publish_status = 'published'
    )
  );

DROP POLICY IF EXISTS "Admins can manage content briefs" ON public.content_briefs;
CREATE POLICY "Admins can manage content briefs" ON public.content_briefs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "Admins can manage content workflow events" ON public.content_workflow_events;
CREATE POLICY "Admins can manage content workflow events" ON public.content_workflow_events
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "Admins can manage content generation runs" ON public.content_generation_runs;
CREATE POLICY "Admins can manage content generation runs" ON public.content_generation_runs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "Admins can manage generation citations" ON public.generation_citations;
CREATE POLICY "Admins can manage generation citations" ON public.generation_citations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "Admins can manage knowledge assets" ON public.knowledge_assets;
CREATE POLICY "Admins can manage knowledge assets" ON public.knowledge_assets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "Admins can manage knowledge chunks" ON public.knowledge_chunks;
CREATE POLICY "Admins can manage knowledge chunks" ON public.knowledge_chunks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

COMMIT;