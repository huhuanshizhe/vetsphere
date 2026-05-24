# Intl Content Growth, Admin CMS, and Agentic RAG Spec

Status: Draft for implementation
Scope: apps/intl, apps/admin, packages/shared, Supabase
Primary rollout site: intl

## 1. Background

The intl site now has a materially stronger technical SEO baseline:

- canonical, robots, sitemap, and locale signals are corrected
- key search pages now render meaningful HTML on first response
- product and course detail pages have stable canonical routes

The next bottleneck is not technical crawlability. The next bottleneck is domain authority, topical depth, and GEO readiness.

VetSphere is not a generic content site. It is a domain platform that combines:

- veterinary surgery education
- clinical equipment and procurement
- instructor expertise and institution credibility
- clinic capability-building pathways

The content system must therefore support both SEO and business conversion, while also producing machine-readable, evidence-backed content that can be cited by search summaries and LLM systems.

## 2. Product Goal

Build a unified intl content growth system that:

1. expands the public site from a small set of landing pages into a structured specialty/procedure/case/solution knowledge graph
2. gives admin a real content operating system instead of ad hoc page editing
3. enables agent-assisted content production through internal RAG plus large models
4. preserves human review as the publishing authority for all medical and commercial content

## 3. Success Criteria

### 3.1 Business and SEO outcomes

- intl can publish specialty hubs, procedure pages, case pages, solution pages, FAQ hubs, glossary terms, comparison pages, and resource pages
- every content page is internally connected to relevant courses, products, instructors, and related content
- content pages are indexable, locally rendered, and structured for both classic SEO and GEO
- content program produces stable growth in indexed long-tail pages and non-brand search entrances

### 3.2 Admin outcomes

- editors can create, review, localize, schedule, publish, archive, and refresh content in admin
- reviewers can verify sources, claims, and publish readiness inside admin
- route rollout is controlled through route registry and publish status, not by hard-coded hidden pages

### 3.3 AI outcomes

- admin can ingest internal knowledge sources and uploaded reference files into a managed knowledge base
- editors can generate briefs, outlines, drafts, FAQ blocks, glossary entries, metadata, internal links, and locale adaptations through agentic workflows
- every generation run stores prompt version, evidence set, model, operator, status, and outputs
- no AI-generated content can be published without human review

## 4. Core Product Decisions

### 4.1 Use one unified content platform, not one table per page type

Do not create isolated feature silos like `procedure_pages`, `case_pages`, `faq_pages`, and `resource_pages` as separate first-class CRUD systems.

Instead, create one generalized content platform with:

- a typed content record
- localized content payloads
- site-specific publish views
- structured content blocks
- typed relations to courses, products, instructors, and other content

This keeps admin workflows, AI generation, routing, and analytics consistent.

### 4.2 Roll out on intl first, but keep site-aware data structures

Even if phase 1 is intl-only, tables and admin workflows should keep `site_code` or site-view support because CN and future sites may reuse the system.

### 4.3 Human-reviewed AI only

AI may draft, expand, summarize, suggest, localize, and refresh content.
AI may not directly publish medical, educational, or procurement content.

### 4.4 Internal evidence first

The first RAG layer should prioritize VetSphere-owned sources:

- published and draft courses
- products and product documentation
- instructors and credentials
- uploaded PDFs, images, and source notes
- existing content pages
- FAQ, glossary, and case library assets

External web retrieval can be added later, but phase 1 should not depend on it.

## 5. Public Content Program

### 5.1 Content types and URL model

| Content type | URL pattern | Primary role | Main relations | Suggested schema |
| --- | --- | --- | --- | --- |
| Specialty hub | `/[locale]/specialties/[slug]` | Topical hub for a clinical specialty | procedures, courses, products, instructors, FAQs | CollectionPage, BreadcrumbList |
| Procedure page | `/[locale]/procedures/[slug]` | Search-intent page for a surgery or workflow | specialty, courses, products, cases, FAQs | Article, FAQPage, BreadcrumbList |
| Case page | `/[locale]/cases/[slug]` | Evidence and applied learning page | procedure, courses, products, instructors | Article, BreadcrumbList |
| Solution page | `/[locale]/solutions/[slug]` | Clinic and procurement oriented page | products, courses, specialty, FAQ | Article, BreadcrumbList |
| FAQ hub | `/[locale]/faq/[slug]` | Structured question cluster | specialty, procedure, solution | FAQPage, BreadcrumbList |
| Glossary term | `/[locale]/glossary/[slug]` | Definition entity page | procedures, specialty, products | DefinedTerm, BreadcrumbList |
| Compare page | `/[locale]/compare/[slug]` | Decision page for alternatives | procedures, products, courses | Article, BreadcrumbList |
| Resource page | `/[locale]/resources/[slug]` | Checklist, worksheet, or guide | specialty, procedure, solution | Article, BreadcrumbList |

### 5.2 Initial wave for intl

Wave 1 should launch a small but coherent graph, not a large random set.

Recommended first launch pack:

- 4 specialty hubs
  - orthopedics
  - neurosurgery
  - soft-tissue
  - ophthalmology
- 6 procedure pages
  - tplo
  - tta
  - fracture-fixation
  - external-fixation
  - patellar-luxation
  - hemilaminectomy
- 2 solution pages
  - orthopedic-capability-building
  - training-plus-equipment-startup-pathway
- 1 FAQ hub
  - veterinary-orthopedic-surgery-faq
- 1 compare page
  - tplo-vs-tta
- 1 resource page
  - orthopedic-pre-op-checklist

Case pages should start in wave 2 because they require the tightest source review.

### 5.3 GEO authoring requirements

Every content page in this system must include:

- an opening answer block that resolves the page's primary question fast
- clear section headings with predictable semantics
- named reviewer or responsible expert entity
- `last_updated_at` and visible content freshness markers
- a references or evidence section for internal source traceability
- machine-friendly lists, comparison tables, FAQ blocks, and definition blocks
- strong internal links to courses, products, instructors, and adjacent content

## 6. Content Model and Data Design

### 6.1 Core content tables

#### `content_records`

One row per canonical content entity.

Suggested fields:

- `id`
- `content_type` (`specialty_hub`, `procedure`, `case`, `solution`, `faq_hub`, `glossary_term`, `compare_page`, `resource`)
- `canonical_slug`
- `workflow_state` (`draft`, `in_review`, `approved`, `scheduled`, `published`, `archived`)
- `source_language`
- `primary_specialty`
- `primary_procedure`
- `target_audience`
- `search_intent`
- `author_id`
- `reviewer_id`
- `owner_team`
- `publish_priority`
- `created_at`, `updated_at`, `published_at`

#### `content_localizations`

One row per `content_id + locale`.

Suggested fields:

- `content_id`
- `locale`
- `title`
- `subtitle`
- `summary`
- `hero_title`
- `hero_subtitle`
- `seo_title`
- `seo_description`
- `body_markdown`
- `body_json`
- `opening_answer`
- `references_json`
- `faq_json`
- `is_source_locale`
- `quality_score`
- `created_at`, `updated_at`

#### `content_site_views`

Site-layer publishing overlay, following the existing course/product site-view pattern.

Suggested fields:

- `id`
- `content_id`
- `site_code`
- `publish_status` (`draft`, `published`, `archived`)
- `slug_override`
- `seo_title_override`
- `seo_description_override`
- `is_featured`
- `display_order`
- `route_status` (`active`, `coming_soon`, `hidden`, `redirect`)
- `route_config_json`
- `published_at`
- `created_at`, `updated_at`

#### `content_blocks`

Structured page composition blocks.

Suggested fields:

- `id`
- `content_id`
- `locale`
- `block_key`
- `block_type` (`hero`, `overview`, `indications`, `steps`, `risks`, `equipment_list`, `faq`, `compare_table`, `checklist`, `cta`, `references`)
- `display_order`
- `data_json`

#### `content_relations`

Typed graph edges between content and business entities.

Suggested fields:

- `id`
- `content_id`
- `relation_type` (`related_course`, `related_product`, `related_instructor`, `related_content`, `primary_course`, `primary_product`, `recommended_product`, `case_for_procedure`)
- `target_type` (`course`, `product`, `instructor`, `content`)
- `target_id`
- `display_order`
- `notes`

#### `content_taxonomy_terms`

System taxonomy for specialty, procedure family, audience, business stage, geo market, and content goals.

#### `content_term_relations`

Join table from content to taxonomy terms.

### 6.2 Editorial workflow and AI tables

#### `content_briefs`

Stores target keyword group, audience, angle, linked courses/products, source requirements, and content brief status.

#### `content_workflow_events`

Audit trail for state transitions, review decisions, publish actions, and AI generation handoffs.

#### `content_generation_runs`

Stores every AI generation operation.

Suggested fields:

- `id`
- `content_id`
- `brief_id`
- `task_key`
- `run_type` (`brief`, `outline`, `draft`, `expand_section`, `faq_extract`, `glossary_extract`, `meta_generate`, `localize`, `refresh`, `review`)
- `model_provider`
- `model_name`
- `prompt_version`
- `input_json`
- `output_json`
- `status`
- `operator_id`
- `created_at`

#### `generation_citations`

Maps generation runs to the exact retrieved chunks or source assets used during output creation.

### 6.3 RAG knowledge base tables

#### `knowledge_assets`

The top-level ingested asset record.

Suggested source types:

- course
- product
- instructor
- content
- pdf
- image
- note
- faq
- glossary

Suggested fields:

- `id`
- `source_type`
- `source_id`
- `site_code`
- `locale`
- `title`
- `status`
- `metadata_json`
- `raw_text`
- `source_url`
- `created_at`, `updated_at`

#### `knowledge_chunks`

Chunked retrieval units derived from `knowledge_assets`.

Suggested fields:

- `id`
- `asset_id`
- `chunk_index`
- `chunk_text`
- `embedding vector`
- `token_count`
- `specialty`
- `procedure`
- `entity_type`
- `entity_id`
- `site_code`
- `locale`
- `metadata_json`

Implementation note: use Supabase `pgvector` if available. If not, keep the same table contract and use an external vector store behind a repository layer.

### 6.4 Reuse existing platform pieces

The new system should explicitly reuse and extend these existing capabilities:

- `route_registry` for route activation and rollout control
- `ai_prompts` for prompt registry and prompt versioning
- `ai_task_templates` for admin-managed task presets
- existing `courses`, `course_site_views`, `products`, `product_site_views`, and `instructors` as relation targets
- existing audit logging and permission infrastructure
- existing site switch context in admin

Existing `site_pages` should be treated as legacy lightweight custom pages. New SEO/GEO content should not be built on `site_pages`.

## 7. Admin Information Architecture

### 7.1 Navigation changes

Add a new content operations group in admin.

Suggested routes:

- `/content/dashboard`
- `/content/library`
- `/content/specialties`
- `/content/procedures`
- `/content/cases`
- `/content/solutions`
- `/content/faq`
- `/content/glossary`
- `/content/compare`
- `/content/resources`
- `/content/review`
- `/content/calendar`
- `/content/knowledge`
- `/content/ai-studio`

### 7.2 Module definitions

| Module | Route | Purpose | Key actions |
| --- | --- | --- | --- |
| Content dashboard | `/content/dashboard` | Production health, funnel, and gaps | view status, track backlog, monitor freshness |
| Content library | `/content/library` | Unified list of all content records | search, filter, duplicate, archive |
| Specialty centers | `/content/specialties` | Manage specialty hubs | create, edit, publish, relate |
| Procedures | `/content/procedures` | Manage procedure pages | create, edit, publish, relate |
| Cases | `/content/cases` | Manage case library | create, source review, publish |
| Solutions | `/content/solutions` | Manage clinic and procurement pages | create, edit, publish |
| FAQ and glossary | `/content/faq`, `/content/glossary` | Manage structured answer content | create, merge, publish |
| Compare | `/content/compare` | Manage comparison pages | create, edit, publish |
| Resources | `/content/resources` | Manage checklist and guide pages | create, edit, publish |
| Review queue | `/content/review` | Review and approval workflow | approve, reject, request changes |
| Calendar and briefs | `/content/calendar` | Plan future content and assign work | create brief, assign owner, schedule |
| Knowledge base | `/content/knowledge` | Manage RAG ingestion assets | upload, sync, chunk, re-index |
| AI studio | `/content/ai-studio` | Run agentic authoring workflows | generate brief, outline, draft, localization |

### 7.3 Editor experience

Every content edit page should use a governed step flow similar to the course editor.

Suggested steps:

1. brief
2. structure
3. body and blocks
4. relations and CTA
5. SEO and GEO
6. localization
7. review and publish

The publish action should only appear in the final review step after readiness checks pass.

### 7.4 Permissions

Reuse existing permission style and add the minimum new surface.

Recommended module keys:

- `cms` for content operations
- `ai` for AI studio and prompt control
- `route` for route rollout

Recommended additional actions if more granularity is needed:

- `review`
- `generate`
- `schedule`

## 8. Agentic RAG + LLM Authoring System

### 8.1 Supported creation tasks

The system must support these tasks from admin:

- generate content brief
- generate page outline
- generate first draft
- expand a single section
- extract FAQ candidates from source material
- extract glossary candidates from source material
- generate SEO title and description
- suggest internal links
- generate locale adaptation draft
- refresh an outdated page using new sources
- run publish-readiness review

### 8.2 Recommended task keys

Use admin-managed task templates for these first-class tasks:

- `content_brief_planner`
- `content_outline_generator`
- `content_draft_generator`
- `content_section_expander`
- `content_faq_extractor`
- `content_glossary_extractor`
- `content_meta_generator`
- `content_internal_link_suggester`
- `content_locale_adapter`
- `content_claim_reviewer`
- `content_publish_readiness_checker`

### 8.3 Retrieval workflow

Every generation request should follow a constrained retrieval pipeline:

1. build a structured query from content type, specialty, procedure, audience, site, and locale
2. retrieve internal chunks with metadata filtering
3. rerank by source trust and topical match
4. pass retrieved evidence into the drafting task
5. store evidence references with the generation run

Filtering dimensions must include:

- site code
- locale
- content type
- specialty
- procedure
- entity type
- published or draft status

### 8.4 Model orchestration

Do not implement one undifferentiated chat box as the main creation experience.

Use a task-oriented chain:

1. planner agent: turns a request into a content brief
2. retrieval agent: collects and normalizes evidence
3. draft agent: produces structured content JSON or markdown
4. review agent: checks claims, missing sections, and citation coverage
5. localization agent: rewrites for locale, not just literal translation

### 8.5 Safety and quality rules

The AI system must not:

- invent clinical claims that are not supported by provided evidence
- invent instructor credentials or institutional relationships
- present uncertain procurement claims as guaranteed facts
- auto-publish without human approval

The AI system must:

- mark unsupported sections with low-confidence warnings
- attach evidence references to every generated section when possible
- preserve a human-editable draft format
- expose prompt version, model, and evidence set in admin

## 9. Frontend Rendering Requirements

### 9.1 Public route behavior

All content pages must be rendered as server components or otherwise produce full meaningful HTML on first response.

Each route must support:

- canonical URL
- locale alternates
- stable breadcrumbs
- content-type-aware metadata
- structured data
- optional noindex control through site view

### 9.2 Shared rendering components

Add shared rendering primitives instead of bespoke pages for every content type.

Suggested shared components:

- `IntlContentLayout`
- `ContentHero`
- `ContentAnswerBlock`
- `ContentSectionRenderer`
- `ContentRelationRail`
- `ContentReferenceList`
- `ContentFaqBlock`
- `ContentCompareTable`
- `ContentChecklistBlock`
- `ContentReviewerBadge`

## 10. API Surface

### 10.1 Admin CRUD APIs

Suggested endpoints:

- `GET /api/v1/admin/content`
- `POST /api/v1/admin/content`
- `GET /api/v1/admin/content/[id]`
- `PATCH /api/v1/admin/content/[id]`
- `POST /api/v1/admin/content/[id]/publish`
- `POST /api/v1/admin/content/[id]/archive`
- `POST /api/v1/admin/content/[id]/duplicate`
- `POST /api/v1/admin/content/[id]/relations`

### 10.2 AI and RAG APIs

Suggested endpoints:

- `POST /api/admin/content/briefs/generate`
- `POST /api/admin/content/outlines/generate`
- `POST /api/admin/content/drafts/generate`
- `POST /api/admin/content/sections/generate`
- `POST /api/admin/content/localize`
- `POST /api/admin/content/review`
- `POST /api/admin/rag/assets/import`
- `POST /api/admin/rag/assets/reindex`
- `GET /api/admin/rag/assets`
- `POST /api/admin/rag/retrieve`

All admin endpoints must follow the same authenticated request pattern already used in products and courses.

## 11. Phased Delivery Plan

### Phase 0: Spec and alignment

Deliverables:

- this spec
- agreed URL map
- agreed content type definitions
- agreed admin IA
- agreed AI guardrails

Exit criteria:

- product, content, and engineering agree to build one unified content platform

### Phase 1: Foundation and schema

Deliverables:

- Supabase migrations for core content and RAG tables
- admin navigation updates
- content library list page
- content edit workflow shell
- route registry extension for new content routes
- shared frontend route scaffolding for public content pages

Must-have acceptance criteria:

- admin can create draft records for every supported content type
- public content routes can resolve and render published content records
- content records support locale-aware content and site-view publish state

### Phase 2: Launch the first public content graph

Deliverables:

- specialty hubs
- procedure pages
- solution pages
- FAQ hub
- compare page
- resource page
- relation rails to courses, products, and instructors

Must-have acceptance criteria:

- every launch page has metadata, schema, breadcrumbs, reviewer label, and relation links
- all launch pages render meaningful first-response HTML
- route rollout is controlled in admin

### Phase 3: Admin AI studio and RAG knowledge base

Deliverables:

- knowledge asset ingestion
- chunking and embedding pipeline
- retrieval service with filters
- AI studio with brief, outline, draft, and localization tasks
- generation run history and evidence tracking

Must-have acceptance criteria:

- editor can generate a draft from internal sources without leaving admin
- every generation run stores task key, model, prompt version, and evidence references
- human can revise generated content before publish

### Phase 4: Scale, governance, and GEO optimization

Deliverables:

- review queue and clinician reviewer workflow
- freshness monitoring and refresh suggestions
- locale adaptation workflow for th and ja
- content analytics for indexability, traffic, and generation quality

Must-have acceptance criteria:

- stale or low-quality pages are visible in admin dashboard
- localization is tracked as adaptation status, not just translation status
- AI generation quality can be measured and audited

## 12. Implementation Order

Recommended build order:

1. schema and route scaffolding
2. content library and typed edit workflow
3. public rendering for specialty, procedure, and solution pages
4. relation system to courses, products, and instructors
5. knowledge asset ingestion and chunking
6. AI studio generation tasks
7. review queue and localization workflow

Do not start with a general chat assistant. Start with structured content workflows tied to a concrete content record.

## 13. Analytics and KPI Plan

Track these metrics by page type and by locale:

- indexed page count
- impressions and clicks
- non-brand query growth
- assisted conversion to course or product views
- quote request assists
- internal link coverage
- content freshness age
- AI draft acceptance rate
- average number of human edits after generation
- citation coverage per generated draft

## 14. Risks

### Risk 1: Overbuilding the CMS before launching content

Mitigation: phase 2 must launch a small but real content pack before expanding the authoring system.

### Risk 2: AI-generated low-trust clinical content

Mitigation: require internal evidence, reviewer signoff, and visible content ownership.

### Risk 3: Fragmented admin experience

Mitigation: use one content library plus typed views, not seven separate disconnected mini-products.

### Risk 4: Thin localization

Mitigation: make locale adaptation a distinct workflow with local SEO fields, not a raw machine translation field.

## 15. Explicit Non-Goals for Phase 1

Phase 1 should not include:

- open-web retrieval for AI authoring
- autonomous publishing without review
- a generic public blog disconnected from VetSphere specialties
- consumer pet-owner content strategy
- one-off page builders for each content type

## 16. Recommendation Summary

The correct next step is to build a unified content operating system for intl, not just add more landing pages.

The architecture should combine:

- a typed content graph
- site-aware publishing overlays
- admin governance workflows
- an internal RAG layer
- task-oriented LLM authoring

If implemented in this order, VetSphere can move from a technically fixed intl site to a genuinely authoritative specialty knowledge platform that serves SEO, GEO, and conversion at the same time.