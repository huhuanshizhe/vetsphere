# Intl Content Operations Handbook

Status: Active operator handbook
Audience: content ops, reviewers, AI operators, growth leads
Scope: apps/admin content module, apps/intl public content surfaces

## 1. Purpose

This handbook explains two things for the operating team:

1. how to decide which type of content page to create for a specific business goal
2. how to use the admin content workflow and AI generation chain to create, review, schedule, and publish those pages safely

This system is not a generic blog workflow. It is a structured veterinary knowledge graph with AI-assisted drafting and human-governed publishing.

## 2. Page Type Matrix

| Page type | Public route | Best used for | Typical business outcome | Recommended AI chain |
| --- | --- | --- | --- | --- |
| Specialty hub | `/[locale]/specialties/[slug]` | Build topical authority for a clinical specialty | Own the category, route traffic into procedures/courses/products | Brief -> Outline -> Draft -> Internal links -> Meta |
| Procedure page | `/[locale]/procedures/[slug]` | Capture search demand around one surgery/workflow | Bring high-intent clinicians into training + equipment journeys | Brief -> Outline -> Draft -> FAQ -> Meta |
| Solution page | `/[locale]/solutions/[slug]` | Explain capability-building or procurement pathways | Connect education + equipment + implementation | Brief -> Outline -> Draft -> Internal links |
| Compare page | `/[locale]/compare/[slug]` | Help teams choose between alternatives | Convert investigation traffic into consultation or course/product exploration | Brief -> Outline -> Draft -> Claim review -> Meta |
| Resource page | `/[locale]/resources/[slug]` | Deliver checklists, worksheets, and operational guides | Support conversions with practical takeaways and return visits | Brief -> Outline -> Draft -> FAQ |
| FAQ hub | `/[locale]/faq/[slug]` | Resolve repeated question clusters | Improve GEO coverage and answer intent fast | Brief -> FAQ extract -> Draft |
| Glossary term | `/[locale]/glossary/[slug]` | Define one term clearly and link deeper pages | Support semantic coverage and internal linking | Brief -> Draft -> Internal links |
| Case page | `/[locale]/cases/[slug]` | Show applied reasoning and evidence-backed case context | Build trust for advanced readers | Brief -> Outline -> Draft -> Claim review |

## 3. Which Page To Create

Use this routing rule before opening admin:

| If the main goal is... | Create this |
| --- | --- |
| define a whole specialty landscape | Specialty hub |
| explain one named surgery or clinical workflow | Procedure page |
| compare two treatment or equipment options | Compare page |
| give a clinic-ready checklist or worksheet | Resource page |
| connect training and equipment into one adoption story | Solution page |
| answer repeated objections or short questions | FAQ hub |
| clarify terminology used across multiple pages | Glossary term |
| document a source-driven example or scenario | Case page |

## 4. How Public Pages Are Generated

The public site is driven by the typed content platform, not by hard-coded marketing pages.

### 4.1 Route mapping

The content type determines the public route bucket:

| Content type | Route bucket |
| --- | --- |
| `specialty_hub` | `/specialties` |
| `procedure` | `/procedures` |
| `solution` | `/solutions` |
| `compare_page` | `/compare` |
| `resource` | `/resources` |
| `faq_hub` | `/faq` |
| `glossary_term` | `/glossary` |
| `case` | `/cases` |

### 4.2 Publish conditions

A page appears publicly only when all three conditions are true:

1. `content_records.workflow_state = published`
2. `content_site_views.publish_status = published`
3. `content_site_views.route_status = active`

### 4.3 Placement logic

Public placement is controlled by the content type and site view metadata:

1. `content_type` decides which public list and detail route the page belongs to.
2. `is_featured` elevates an item in the public list UI.
3. `display_order` controls ordering within the collection.
4. `primary_specialty`, `primary_procedure`, `target_audience`, and `search_intent` shape how operators should cluster adjacent pages.

This means operators do not need a developer to add a new public page path. They need the correct content type, slug, and publish state.

## 5. End-to-End Operator Workflow

### 5.1 Planning

Use `/content/calendar` when work starts from a topic idea or campaign need.

1. Create a Brief.
2. Fill target audience, search intent, and primary angle.
3. If the page already maps to an existing content record, bind the content ID.
4. Use the Brief pool actions to jump into AI generation.

### 5.2 AI drafting

Use `/ai/studio` for structured generation, not free chat.

Recommended task order:

1. `content_brief_planner`
2. `content_outline_generator`
3. `content_draft_generator`
4. `content_faq_extractor` when the page should carry FAQs
5. `content_internal_link_suggester`
6. `content_meta_generator`
7. `content_claim_reviewer` before final review
8. `content_publish_readiness_checker` before publish

### 5.3 Editing

Use `/content` to refine the page after AI output.

Editorial priorities:

1. opening answer resolves the primary question fast
2. summary is clear and business-relevant
3. body headings are readable and structured for scanning
4. references are traceable and human-auditable
5. FAQ block is clean and non-redundant
6. SEO title and description match intent without keyword stuffing

### 5.4 Review queue

Use `/content/review` to execute workflow decisions.

Available actions:

1. approve
2. request changes
3. reject and archive
4. schedule

Recommended rule:

1. approve only when the content is factually safe and structurally ready
2. request changes when the topic is right but the page still has editorial or evidence gaps
3. reject and archive only when the page should not remain in the active program

### 5.5 Scheduling and publish

Use `/content/calendar` to move ready content into execution.

1. pages with publish readiness satisfied show up in the schedule candidate list
2. once scheduled, they become visible in the scheduled panel and review queue as scheduled items
3. publish only after final readiness checks pass

## 6. Recommended AI Recipes By Page Type

### 6.1 Specialty hub

Prompt emphasis:

1. capability map
2. procedure clusters
3. training pathway
4. equipment readiness
5. FAQ cluster

### 6.2 Procedure page

Prompt emphasis:

1. indications and decision framing
2. training progression
3. equipment implications
4. workflow guardrails
5. adjacent comparisons and FAQs

### 6.3 Compare page

Prompt emphasis:

1. decision criteria
2. clinic fit by capability level
3. equipment and training tradeoffs
4. high-trust framing without unsupported claims

### 6.4 Resource page

Prompt emphasis:

1. checklist structure
2. implementation steps
3. handoff and team readiness
4. printable or skimmable formatting

## 7. Quality Checklist Before Publish

Every content page should pass this checklist:

1. The title is specific and commercially relevant.
2. The opening answer resolves the query in one short block.
3. The body uses strong section headings.
4. References are present and understandable.
5. The page links naturally into the rest of the knowledge graph.
6. No unsupported medical or procurement claims remain.
7. The page state, site view, and route status all point to publishable values.

## 8. Recommended First-Wave Production Mix

For the current intl program, operators should prioritize a coherent graph instead of random page creation.

Recommended backbone:

1. specialty hubs for orthopedics, neurosurgery, soft tissue, and ophthalmology
2. procedure pages for TPLO, TTA, fracture fixation, external fixation, patellar luxation, and hemilaminectomy
3. compare pages for high-intent alternatives like TPLO vs TTA
4. resource pages for clinic-ready planning assets like pre-op checklists
5. solution pages that connect capability building with equipment readiness and training adoption

## 9. Troubleshooting

### 9.1 The page is in admin but not public

Check all of the following:

1. workflow state is `published`
2. site publish status is `published`
3. route status is `active`
4. the correct content type is selected
5. the page has a valid slug

### 9.2 The AI output is weak or generic

Usually the issue is upstream.

Check:

1. brief specificity
2. target audience clarity
3. search intent clarity
4. primary angle quality
5. whether the knowledge base has enough source material

### 9.3 The page type feels wrong

Do not force one page type to do another page type's job.

Examples:

1. a checklist should be a resource page, not a specialty hub
2. a decision matrix should be a compare page, not a procedure page
3. a whole-specialty authority page should be a specialty hub, not a solution page