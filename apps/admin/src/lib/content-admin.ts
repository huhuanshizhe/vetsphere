import {
  CONTENT_TYPE_ROUTE_SEGMENTS,
  type ContentType,
  type ContentRouteStatus,
  type ContentWorkflowState,
  type IntlContentBlock,
  type IntlContentLocalization,
  type IntlContentRelation,
} from '@vetsphere/shared/services/content-platform';

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  specialty_hub: '专科中心',
  procedure: '术式页面',
  case: '病例库',
  solution: '解决方案',
  faq_hub: 'FAQ 专题',
  glossary_term: '术语词条',
  compare_page: '对比页',
  resource: '资源页',
  news: '新闻页',
};

export const CONTENT_TYPE_OPTIONS = Object.entries(CONTENT_TYPE_LABELS).map(([value, label]) => ({
  value: value as ContentType,
  label,
}));

export const CONTENT_ADMIN_SITE_CODE = 'intl';

export type SitePublishStatus = 'draft' | 'published' | 'archived';

export interface AdminContentSiteView {
  id?: string;
  site_code: string;
  publish_status: SitePublishStatus;
  slug_override: string | null;
  seo_title_override: string | null;
  seo_description_override: string | null;
  is_featured: boolean;
  display_order: number;
  route_status: ContentRouteStatus;
  route_config_json?: Record<string, unknown>;
  published_at?: string | null;
}

export interface AdminContentEditorRecord {
  id: string;
  content_type: ContentType;
  canonical_slug: string;
  workflow_state: ContentWorkflowState;
  source_language: string;
  primary_specialty: string | null;
  primary_procedure: string | null;
  target_audience: string | null;
  search_intent: string | null;
  owner_team: string | null;
  publish_priority: number;
  localizations: IntlContentLocalization[];
  site_views: AdminContentSiteView[];
  blocks: IntlContentBlock[];
  relations: IntlContentRelation[];
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface AdminContentListItem {
  id: string;
  content_type: ContentType;
  content_type_label: string;
  canonical_slug: string;
  title: string;
  summary: string | null;
  workflow_state: ContentWorkflowState;
  primary_specialty: string | null;
  primary_procedure: string | null;
  updated_at: string;
  site_views: AdminContentSiteView[];
}

function normalizeArray<T>(value: T[] | T | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export function createContentSlug(input: string, fallbackPrefix = 'content'): string {
  const normalized = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (normalized) return normalized;
  return `${fallbackPrefix}-${Date.now().toString(36)}`;
}

export function buildDefaultLocalization(locale = 'en', title = ''): IntlContentLocalization {
  return {
    locale,
    title,
    subtitle: null,
    summary: null,
    hero_title: null,
    hero_subtitle: null,
    seo_title: null,
    seo_description: null,
    body_markdown: null,
    body_json: {},
    opening_answer: null,
    references_json: [],
    faq_json: [],
  };
}

export function buildDefaultSiteView(siteCode = 'intl'): AdminContentSiteView {
  return {
    site_code: siteCode,
    publish_status: 'draft',
    slug_override: null,
    seo_title_override: null,
    seo_description_override: null,
    is_featured: false,
    display_order: 0,
    route_status: 'active',
    route_config_json: {},
    published_at: null,
  };
}

function pickLocalization(localizations: IntlContentLocalization[], locale = 'en') {
  return (
    localizations.find((item) => item.locale === locale) ||
    localizations.find((item) => item.locale === 'en') ||
    localizations[0] ||
    buildDefaultLocalization(locale)
  );
}

export function mapAdminContentRecord(row: any, locale = 'en'): AdminContentEditorRecord {
  const localizations = normalizeArray(row.content_localizations);
  const siteViews = normalizeArray(row.content_site_views);
  const blocks = normalizeArray(row.content_blocks);
  const relations = normalizeArray(row.content_relations);

  return {
    id: row.id,
    content_type: row.content_type,
    canonical_slug: row.canonical_slug,
    workflow_state: row.workflow_state,
    source_language: row.source_language || 'en',
    primary_specialty: row.primary_specialty || null,
    primary_procedure: row.primary_procedure || null,
    target_audience: row.target_audience || null,
    search_intent: row.search_intent || null,
    owner_team: row.owner_team || null,
    publish_priority: row.publish_priority || 0,
    localizations,
    site_views: siteViews,
    blocks: blocks.sort((left, right) => (left.display_order || 0) - (right.display_order || 0)),
    relations: relations.sort(
      (left, right) => (left.display_order || 0) - (right.display_order || 0),
    ),
    created_at: row.created_at,
    updated_at: row.updated_at,
    published_at: row.published_at || null,
  };
}

export function mapAdminContentListItem(row: any, locale = 'en'): AdminContentListItem {
  const localizations = normalizeArray(row.content_localizations);
  const siteViews = normalizeArray(row.content_site_views);
  const localization = pickLocalization(localizations, locale);

  return {
    id: row.id,
    content_type: row.content_type,
    content_type_label: CONTENT_TYPE_LABELS[row.content_type as ContentType],
    canonical_slug: row.canonical_slug,
    title: localization.title || row.canonical_slug,
    summary: localization.summary || null,
    workflow_state: row.workflow_state,
    primary_specialty: row.primary_specialty || null,
    primary_procedure: row.primary_procedure || null,
    updated_at: row.updated_at,
    site_views: siteViews,
  };
}

export function getContentRoutePath(
  locale: string,
  contentType: ContentType,
  slug: string,
): string {
  return `/${locale}/${CONTENT_TYPE_ROUTE_SEGMENTS[contentType]}/${slug}`;
}
