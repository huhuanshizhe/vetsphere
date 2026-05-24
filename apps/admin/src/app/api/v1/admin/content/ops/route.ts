import { NextResponse } from 'next/server';
import { assertSiteAuthorized, withAdminAuth } from '@/lib/auth-middleware';
import { mapAdminContentListItem, type AdminContentListItem, type AdminContentSiteView } from '@/lib/content-admin';
import { getPublishReadinessFailures } from '@/lib/content-governance';
import type {
  ContentOpsBriefItem,
  ContentOpsEventItem,
  ContentOpsGenerationRunItem,
  ContentOpsResponse,
  ContentOpsReviewItem,
} from '@/lib/content-ops';
import { extractAccessToken } from '@/lib/request-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STALE_CONTENT_DAYS = 45;

type ContentOpsQueryRow = {
  id: string;
  content_type: AdminContentListItem['content_type'];
  canonical_slug: string;
  workflow_state: AdminContentListItem['workflow_state'];
  primary_specialty: string | null;
  primary_procedure: string | null;
  publish_priority: number | null;
  reviewer_id: string | null;
  updated_at: string;
  published_at: string | null;
  content_localizations?: Array<{
    locale: string;
    title: string;
    summary: string | null;
    opening_answer: string | null;
    body_markdown: string | null;
    references_json: unknown;
  }> | null;
  content_site_views?: AdminContentSiteView[] | null;
};

function normalizeArray<T>(value: T[] | T | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function pickLocalization(
  localizations: ContentOpsQueryRow['content_localizations'],
  locale: string,
) {
  const items = normalizeArray(localizations);
  return items.find((item) => item.locale === locale) || items.find((item) => item.locale === 'en') || items[0] || null;
}

function daysSinceUpdate(updatedAt: string) {
  const milliseconds = Date.now() - new Date(updatedAt).getTime();
  return Math.max(0, Math.floor(milliseconds / (1000 * 60 * 60 * 24)));
}

function mapOpsReviewItem(row: ContentOpsQueryRow, locale: string, siteCode: string): ContentOpsReviewItem {
  const listItem = mapAdminContentListItem(row, locale);
  const localizations = normalizeArray(row.content_localizations);
  const localization = pickLocalization(row.content_localizations, locale);
  const siteViews = normalizeArray(row.content_site_views);
  const siteView = siteViews.find((item) => item.site_code === siteCode) || siteViews[0] || null;

  return {
    ...listItem,
    publish_priority: row.publish_priority || 0,
    reviewer_id: row.reviewer_id,
    published_at: row.published_at,
    locale_count: localizations.length,
    available_locales: localizations.map((item) => item.locale),
    publish_readiness_failures: localization ? getPublishReadinessFailures(localization) : ['Missing content localization'],
    days_since_update: daysSinceUpdate(row.updated_at),
    site_view: siteView,
  };
}

function sortByPriority(items: ContentOpsReviewItem[]) {
  return [...items].sort((left, right) => {
    if (left.publish_priority !== right.publish_priority) {
      return right.publish_priority - left.publish_priority;
    }
    return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
  });
}

export const GET = withAdminAuth(async (req, { admin }) => {
  const supabase = getSupabaseAdmin(extractAccessToken(req));
  const locale = req.nextUrl.searchParams.get('locale') || 'en';
  const siteCode = req.nextUrl.searchParams.get('siteCode') || 'intl';
  const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get('limit') || 8), 1), 24);

  assertSiteAuthorized(admin, siteCode);

  const [contentResult, briefsResult, eventsResult, runsResult] = await Promise.all([
    supabase
      .from('content_records')
      .select(
        `
        id,
        content_type,
        canonical_slug,
        workflow_state,
        primary_specialty,
        primary_procedure,
        publish_priority,
        reviewer_id,
        updated_at,
        published_at,
        content_localizations(
          locale,
          title,
          summary,
          opening_answer,
          body_markdown,
          references_json
        ),
        content_site_views(
          id,
          site_code,
          publish_status,
          slug_override,
          seo_title_override,
          seo_description_override,
          is_featured,
          display_order,
          route_status,
          route_config_json,
          published_at
        )
      `,
      )
      .order('updated_at', { ascending: false })
      .limit(300),
    supabase
      .from('content_briefs')
      .select('id, content_id, site_code, locale, title, target_audience, search_intent, status, owner_id, updated_at, created_at')
      .eq('site_code', siteCode)
      .order('updated_at', { ascending: false })
      .limit(limit),
    supabase
      .from('content_workflow_events')
      .select('id, content_id, event_type, old_state, new_state, notes, payload_json, created_at')
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('content_generation_runs')
      .select('id, content_id, task_key, status, model_name, created_at, input_json')
      .order('created_at', { ascending: false })
      .limit(limit * 2),
  ]);

  if (contentResult.error) {
    return NextResponse.json({ error: contentResult.error.message }, { status: 500 });
  }
  if (briefsResult.error) {
    return NextResponse.json({ error: briefsResult.error.message }, { status: 500 });
  }
  if (eventsResult.error) {
    return NextResponse.json({ error: eventsResult.error.message }, { status: 500 });
  }
  if (runsResult.error) {
    return NextResponse.json({ error: runsResult.error.message }, { status: 500 });
  }

  const contentItems = (contentResult.data || []).map((row) => mapOpsReviewItem(row as ContentOpsQueryRow, locale, siteCode));
  const siteItems = contentItems.filter((item) => item.site_views.some((view) => view.site_code === siteCode));

  const summary = siteItems.reduce<ContentOpsResponse['summary']>(
    (acc, item) => {
      acc.total += 1;
      acc[item.workflow_state] += 1;
      if (item.days_since_update >= STALE_CONTENT_DAYS) acc.stale += 1;
      if (item.publish_readiness_failures.length === 0 && item.workflow_state !== 'published') {
        acc.ready_to_publish += 1;
      }
      return acc;
    },
    {
      total: 0,
      draft: 0,
      in_review: 0,
      approved: 0,
      scheduled: 0,
      published: 0,
      archived: 0,
      stale: 0,
      ready_to_publish: 0,
      briefs_total: (briefsResult.data || []).length,
      briefs_ready: (briefsResult.data || []).filter((item) => item.status === 'ready').length,
    },
  );

  const reviewQueue = sortByPriority(
    siteItems.filter((item) => ['in_review', 'approved', 'scheduled'].includes(item.workflow_state)),
  ).slice(0, limit);

  const freshness = [...siteItems]
    .filter((item) => item.days_since_update >= STALE_CONTENT_DAYS || item.workflow_state === 'published')
    .sort((left, right) => right.days_since_update - left.days_since_update)
    .slice(0, limit);

  const scheduled = sortByPriority(siteItems.filter((item) => item.workflow_state === 'scheduled')).slice(0, limit);

  const briefs = (briefsResult.data || []) as ContentOpsBriefItem[];
  const recentEvents = (eventsResult.data || []) as ContentOpsEventItem[];
  const recentGenerationRuns = ((runsResult.data || []) as ContentOpsGenerationRunItem[])
    .filter((item) => {
      const runSiteCode = typeof item.input_json?.siteCode === 'string' ? item.input_json.siteCode : null;
      return !runSiteCode || runSiteCode === siteCode;
    })
    .slice(0, limit);

  const response: ContentOpsResponse = {
    siteCode,
    locale,
    staleThresholdDays: STALE_CONTENT_DAYS,
    summary,
    reviewQueue,
    freshness,
    scheduled,
    briefs,
    recentEvents,
    recentGenerationRuns,
  };

  return NextResponse.json(response);
});