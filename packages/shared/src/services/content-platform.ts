import { supabase } from './supabase';

export const CONTENT_TYPE_ROUTE_SEGMENTS = {
  specialty_hub: 'specialties',
  procedure: 'procedures',
  case: 'cases',
  solution: 'solutions',
  faq_hub: 'faq',
  glossary_term: 'glossary',
  compare_page: 'compare',
  resource: 'resources',
} as const;

export type ContentType = keyof typeof CONTENT_TYPE_ROUTE_SEGMENTS;
export type ContentWorkflowState =
  | 'draft'
  | 'in_review'
  | 'approved'
  | 'scheduled'
  | 'published'
  | 'archived';
export type ContentPublishStatus = 'draft' | 'published' | 'archived';
export type ContentRouteStatus = 'active' | 'coming_soon' | 'hidden' | 'redirect';

export interface IntlContentLocalization {
  locale: string;
  title: string;
  subtitle: string | null;
  summary: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  seo_title: string | null;
  seo_description: string | null;
  body_markdown: string | null;
  body_json: Record<string, unknown> | null;
  opening_answer: string | null;
  references_json: unknown[];
  faq_json: unknown[];
}

export interface IntlContentBlock {
  id: string;
  locale: string;
  block_key: string;
  block_type: string;
  display_order: number;
  data_json: Record<string, unknown> | null;
}

export interface IntlContentRelation {
  id: string;
  relation_type: string;
  target_type: 'course' | 'product' | 'instructor' | 'content';
  target_id: string;
  display_order: number;
  notes: string | null;
}

export interface IntlPublishedContent {
  id: string;
  content_type: ContentType;
  slug: string;
  canonical_slug: string;
  locale: string;
  site_code: string;
  title: string;
  subtitle: string | null;
  summary: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  seo_title: string | null;
  seo_description: string | null;
  body_markdown: string | null;
  body_json: Record<string, unknown> | null;
  opening_answer: string | null;
  references: unknown[];
  faqs: unknown[];
  route_status: ContentRouteStatus;
  publish_status: ContentPublishStatus;
  is_featured: boolean;
  display_order: number;
  primary_specialty: string | null;
  primary_procedure: string | null;
  target_audience: string | null;
  search_intent: string | null;
  workflow_state: ContentWorkflowState;
  published_at: string | null;
  updated_at: string;
  blocks: IntlContentBlock[];
  relations: IntlContentRelation[];
}

export interface IntlPublishedContentListResult {
  items: IntlPublishedContent[];
  total: number;
}

interface ContentSiteViewRow {
  id: string;
  site_code: string;
  publish_status: ContentPublishStatus;
  slug_override: string | null;
  seo_title_override: string | null;
  seo_description_override: string | null;
  is_featured: boolean | null;
  display_order: number | null;
  route_status: ContentRouteStatus | null;
  published_at: string | null;
  content_records: ContentRecordRow | ContentRecordRow[] | null;
}

interface ContentRecordRow {
  id: string;
  content_type: ContentType;
  canonical_slug: string;
  workflow_state: ContentWorkflowState;
  source_language: string | null;
  primary_specialty: string | null;
  primary_procedure: string | null;
  target_audience: string | null;
  search_intent: string | null;
  updated_at: string;
  published_at: string | null;
  content_localizations?: IntlContentLocalization[] | null;
  content_blocks?: IntlContentBlock[] | null;
  content_relations?: IntlContentRelation[] | null;
}

function normalizeArray<T>(value: T[] | T | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function pickLocalization(
  localizations: IntlContentLocalization[] | null | undefined,
  locale: string,
): IntlContentLocalization | null {
  const items = localizations || [];
  return items.find((item) => item.locale === locale) || items.find((item) => item.locale === 'en') || items[0] || null;
}

function mapContentSiteViewRow(row: ContentSiteViewRow, locale: string): IntlPublishedContent | null {
  const content = normalizeArray(row.content_records)[0];
  if (!content) return null;

  const localization = pickLocalization(content.content_localizations, locale);
  if (!localization) return null;

  return {
    id: content.id,
    content_type: content.content_type,
    slug: row.slug_override || content.canonical_slug,
    canonical_slug: content.canonical_slug,
    locale: localization.locale,
    site_code: row.site_code,
    title: localization.title,
    subtitle: localization.subtitle,
    summary: localization.summary,
    hero_title: localization.hero_title,
    hero_subtitle: localization.hero_subtitle,
    seo_title: row.seo_title_override || localization.seo_title,
    seo_description: row.seo_description_override || localization.seo_description,
    body_markdown: localization.body_markdown,
    body_json: localization.body_json,
    opening_answer: localization.opening_answer,
    references: localization.references_json || [],
    faqs: localization.faq_json || [],
    route_status: row.route_status || 'active',
    publish_status: row.publish_status,
    is_featured: row.is_featured ?? false,
    display_order: row.display_order ?? 0,
    primary_specialty: content.primary_specialty,
    primary_procedure: content.primary_procedure,
    target_audience: content.target_audience,
    search_intent: content.search_intent,
    workflow_state: content.workflow_state,
    published_at: row.published_at || content.published_at,
    updated_at: content.updated_at,
    blocks: normalizeArray(content.content_blocks).filter((block) => block.locale === localization.locale),
    relations: normalizeArray(content.content_relations).sort(
      (left, right) => (left.display_order || 0) - (right.display_order || 0),
    ),
  };
}

export function getContentRouteSegment(contentType: ContentType): string {
  return CONTENT_TYPE_ROUTE_SEGMENTS[contentType];
}

export function buildIntlContentPath(locale: string, contentType: ContentType, slug: string): string {
  return `/${locale}/${getContentRouteSegment(contentType)}/${slug}`;
}

export async function getPublishedIntlContentList(options?: {
  siteCode?: string;
  locale?: string;
  contentType?: ContentType;
  limit?: number;
  offset?: number;
}): Promise<IntlPublishedContentListResult> {
  const locale = options?.locale || 'en';
  const siteCode = options?.siteCode || 'intl';

  let query = supabase
    .from('content_site_views')
    .select(
      `
      id,
      site_code,
      publish_status,
      slug_override,
      seo_title_override,
      seo_description_override,
      is_featured,
      display_order,
      route_status,
      published_at,
      content_records!inner(
        id,
        content_type,
        canonical_slug,
        workflow_state,
        source_language,
        primary_specialty,
        primary_procedure,
        target_audience,
        search_intent,
        updated_at,
        published_at,
        content_localizations(
          locale,
          title,
          subtitle,
          summary,
          hero_title,
          hero_subtitle,
          seo_title,
          seo_description,
          body_markdown,
          body_json,
          opening_answer,
          references_json,
          faq_json
        ),
        content_blocks(
          id,
          locale,
          block_key,
          block_type,
          display_order,
          data_json
        ),
        content_relations(
          id,
          relation_type,
          target_type,
          target_id,
          display_order,
          notes
        )
      )
    `,
      { count: 'exact' },
    )
    .eq('site_code', siteCode)
    .eq('publish_status', 'published')
    .eq('route_status', 'active')
    .order('display_order', { ascending: true })
    .order('published_at', { ascending: false });

  if (options?.contentType) {
    query = query.eq('content_records.content_type', options.contentType);
  }

  if (typeof options?.offset === 'number' && typeof options?.limit === 'number') {
    query = query.range(options.offset, options.offset + options.limit - 1);
  }

  const { data, count, error } = await query;
  if (error) {
    throw new Error(error.message || 'Failed to load content list');
  }

  return {
    items: normalizeArray(data as ContentSiteViewRow[]).map((row) => mapContentSiteViewRow(row, locale)).filter(Boolean) as IntlPublishedContent[],
    total: count || 0,
  };
}

export async function getPublishedIntlContentBySlug(options: {
  siteCode?: string;
  locale: string;
  contentType: ContentType;
  slug: string;
}): Promise<IntlPublishedContent | null> {
  const siteCode = options.siteCode || 'intl';
  const selectClause = `
      id,
      site_code,
      publish_status,
      slug_override,
      seo_title_override,
      seo_description_override,
      is_featured,
      display_order,
      route_status,
      published_at,
      content_records!inner(
        id,
        content_type,
        canonical_slug,
        workflow_state,
        source_language,
        primary_specialty,
        primary_procedure,
        target_audience,
        search_intent,
        updated_at,
        published_at,
        content_localizations(
          locale,
          title,
          subtitle,
          summary,
          hero_title,
          hero_subtitle,
          seo_title,
          seo_description,
          body_markdown,
          body_json,
          opening_answer,
          references_json,
          faq_json
        ),
        content_blocks(
          id,
          locale,
          block_key,
          block_type,
          display_order,
          data_json
        ),
        content_relations(
          id,
          relation_type,
          target_type,
          target_id,
          display_order,
          notes
        )
      )
    `;

  async function loadSiteViewByFilter(filterColumn: 'slug_override' | 'content_records.canonical_slug') {
    return supabase
      .from('content_site_views')
      .select(selectClause)
      .eq('site_code', siteCode)
      .eq('publish_status', 'published')
      .eq('route_status', 'active')
      .eq('content_records.content_type', options.contentType)
      .eq(filterColumn, options.slug)
      .limit(1)
      .maybeSingle();
  }

  const slugOverrideResult = await loadSiteViewByFilter('slug_override');
  if (slugOverrideResult.error) {
    throw new Error(slugOverrideResult.error.message || 'Failed to load content detail');
  }
  if (slugOverrideResult.data) {
    return mapContentSiteViewRow(slugOverrideResult.data as ContentSiteViewRow, options.locale);
  }

  const canonicalResult = await loadSiteViewByFilter('content_records.canonical_slug');
  if (canonicalResult.error) {
    throw new Error(canonicalResult.error.message || 'Failed to load content detail');
  }
  if (!canonicalResult.data) {
    return null;
  }

  return mapContentSiteViewRow(canonicalResult.data as ContentSiteViewRow, options.locale);
}