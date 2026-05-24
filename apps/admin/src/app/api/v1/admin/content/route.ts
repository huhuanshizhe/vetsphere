import { NextRequest, NextResponse } from 'next/server';
import { assertSiteAuthorized, withAdminAuth } from '@/lib/auth-middleware';
import { writeAuditLog } from '@/lib/audit';
import {
  buildDefaultLocalization,
  buildDefaultSiteView,
  createContentSlug,
  mapAdminContentListItem,
} from '@/lib/content-admin';
import { extractAccessToken } from '@/lib/request-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = withAdminAuth(async (req, { admin }) => {
  const supabase = getSupabaseAdmin(extractAccessToken(req));
  const locale = req.nextUrl.searchParams.get('locale') || 'en';
  const siteCode = req.nextUrl.searchParams.get('siteCode') || '';
  const contentType = req.nextUrl.searchParams.get('contentType') || '';
  const workflowState = req.nextUrl.searchParams.get('workflowState') || '';
  const search = (req.nextUrl.searchParams.get('q') || '').trim().toLowerCase();

  if (siteCode) {
    assertSiteAuthorized(admin, siteCode);
  }

  let query = supabase
    .from('content_records')
    .select(
      `
      id,
      content_type,
      canonical_slug,
      workflow_state,
      source_language,
      primary_specialty,
      primary_procedure,
      target_audience,
      search_intent,
      owner_team,
      publish_priority,
      created_at,
      updated_at,
      published_at,
      content_localizations(
        locale,
        title,
        summary
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
        published_at
      )
    `,
    )
    .order('updated_at', { ascending: false })
    .limit(300);

  if (contentType) {
    query = query.eq('content_type', contentType);
  }
  if (workflowState) {
    query = query.eq('workflow_state', workflowState);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let items = (data || []).map((row) => mapAdminContentListItem(row, locale));

  if (siteCode) {
    items = items.filter((item) => item.site_views.some((view) => view.site_code === siteCode));
  }

  if (search) {
    items = items.filter((item) => {
      const haystack = [item.title, item.summary, item.canonical_slug, item.primary_specialty, item.primary_procedure]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(search);
    });
  }

  return NextResponse.json({ items, total: items.length });
});

export const POST = withAdminAuth(async (req, { admin }) => {
  const supabase = getSupabaseAdmin(extractAccessToken(req));
  const body = await req.json();

  const contentType = body.contentType as string;
  const sourceLanguage = typeof body.sourceLanguage === 'string' ? body.sourceLanguage : 'en';
  const localizations = Array.isArray(body.localizations) && body.localizations.length > 0
    ? body.localizations
    : [buildDefaultLocalization(sourceLanguage, typeof body.title === 'string' ? body.title : '')];
  const siteViews = Array.isArray(body.siteViews) && body.siteViews.length > 0
    ? body.siteViews
    : [buildDefaultSiteView(typeof body.siteCode === 'string' ? body.siteCode : 'intl')];

  if (!contentType) {
    return NextResponse.json({ error: 'contentType is required' }, { status: 400 });
  }

  for (const siteView of siteViews) {
    if (siteView?.site_code) {
      assertSiteAuthorized(admin, siteView.site_code);
    }
  }

  const canonicalSlug =
    (typeof body.canonicalSlug === 'string' && body.canonicalSlug.trim()) ||
    createContentSlug(localizations[0]?.title || '', contentType.replace(/_/g, '-'));

  const { data: createdRecord, error: createError } = await supabase
    .from('content_records')
    .insert({
      content_type: contentType,
      canonical_slug: canonicalSlug,
      workflow_state: body.workflowState || 'draft',
      source_language: sourceLanguage,
      primary_specialty: body.primarySpecialty || null,
      primary_procedure: body.primaryProcedure || null,
      target_audience: body.targetAudience || null,
      search_intent: body.searchIntent || null,
      owner_team: body.ownerTeam || null,
      publish_priority: Number(body.publishPriority || 0),
      author_id: admin.id,
    })
    .select('id')
    .single();

  if (createError || !createdRecord) {
    return NextResponse.json({ error: createError?.message || 'Failed to create content record' }, { status: 500 });
  }

  const contentId = createdRecord.id;

  if (localizations.length > 0) {
    const { error: localizationError } = await supabase.from('content_localizations').insert(
      localizations.map((item: any, index: number) => ({
        content_id: contentId,
        locale: item.locale || (index === 0 ? sourceLanguage : 'en'),
        title: item.title || canonicalSlug,
        subtitle: item.subtitle || null,
        summary: item.summary || null,
        hero_title: item.hero_title || null,
        hero_subtitle: item.hero_subtitle || null,
        seo_title: item.seo_title || null,
        seo_description: item.seo_description || null,
        body_markdown: item.body_markdown || null,
        body_json: item.body_json || {},
        opening_answer: item.opening_answer || null,
        references_json: item.references_json || [],
        faq_json: item.faq_json || [],
        is_source_locale: Boolean(item.is_source_locale ?? index === 0),
      })),
    );

    if (localizationError) {
      return NextResponse.json({ error: localizationError.message }, { status: 500 });
    }
  }

  if (siteViews.length > 0) {
    const { error: siteViewError } = await supabase.from('content_site_views').insert(
      siteViews.map((item: any) => ({
        content_id: contentId,
        site_code: item.site_code,
        publish_status: item.publish_status || 'draft',
        slug_override: item.slug_override || null,
        seo_title_override: item.seo_title_override || null,
        seo_description_override: item.seo_description_override || null,
        is_featured: Boolean(item.is_featured),
        display_order: Number(item.display_order || 0),
        route_status: item.route_status || 'active',
        route_config_json: item.route_config_json || {},
        published_at: item.published_at || null,
      })),
    );

    if (siteViewError) {
      return NextResponse.json({ error: siteViewError.message }, { status: 500 });
    }
  }

  writeAuditLog(req, admin, {
    module: 'cms',
    action: 'create',
    targetType: 'content_record',
    targetId: contentId,
    targetName: localizations[0]?.title || canonicalSlug,
    newValue: {
      contentType,
      canonicalSlug,
      siteViews,
    },
    changesSummary: `创建内容草稿：${localizations[0]?.title || canonicalSlug}`,
  });

  return NextResponse.json({
    id: contentId,
    canonicalSlug,
    contentType,
  });
});