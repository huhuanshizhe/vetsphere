import { NextRequest, NextResponse } from 'next/server';
import { assertSiteAuthorized, withAdminAuth } from '@/lib/auth-middleware';
import { writeAuditLog } from '@/lib/audit';
import { mapAdminContentRecord } from '@/lib/content-admin';
import { extractAccessToken } from '@/lib/request-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = withAdminAuth<{ id: string }>(async (req, { params }) => {
  const supabase = getSupabaseAdmin(extractAccessToken(req));
  const locale = req.nextUrl.searchParams.get('locale') || 'en';

  const { data, error } = await supabase
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
        faq_json,
        is_source_locale,
        quality_score
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
    `,
    )
    .eq('id', params?.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Content not found' }, { status: 404 });
  }

  return NextResponse.json({ item: mapAdminContentRecord(data, locale) });
});

export const PATCH = withAdminAuth<{ id: string }>(async (req, { admin, params }) => {
  const supabase = getSupabaseAdmin(extractAccessToken(req));
  const body = await req.json();
  const contentId = params?.id;

  if (Array.isArray(body.site_views)) {
    for (const siteView of body.site_views) {
      if (siteView?.site_code) {
        assertSiteAuthorized(admin, siteView.site_code);
      }
    }
  }

  const { error: updateError } = await supabase
    .from('content_records')
    .update({
      content_type: body.content_type,
      canonical_slug: body.canonical_slug,
      workflow_state: body.workflow_state,
      source_language: body.source_language || 'en',
      primary_specialty: body.primary_specialty || null,
      primary_procedure: body.primary_procedure || null,
      target_audience: body.target_audience || null,
      search_intent: body.search_intent || null,
      owner_team: body.owner_team || null,
      publish_priority: Number(body.publish_priority || 0),
      updated_at: new Date().toISOString(),
    })
    .eq('id', contentId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await supabase.from('content_localizations').delete().eq('content_id', contentId);
  await supabase.from('content_site_views').delete().eq('content_id', contentId);
  await supabase.from('content_blocks').delete().eq('content_id', contentId);
  await supabase.from('content_relations').delete().eq('content_id', contentId);

  if (Array.isArray(body.localizations) && body.localizations.length > 0) {
    const { error: localizationError } = await supabase.from('content_localizations').insert(
      body.localizations.map((item: any) => ({
        content_id: contentId,
        locale: item.locale,
        title: item.title,
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
        is_source_locale: Boolean(item.is_source_locale),
        quality_score: item.quality_score || null,
      })),
    );

    if (localizationError) {
      return NextResponse.json({ error: localizationError.message }, { status: 500 });
    }
  }

  if (Array.isArray(body.site_views) && body.site_views.length > 0) {
    const { error: siteViewError } = await supabase.from('content_site_views').insert(
      body.site_views.map((item: any) => ({
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

  if (Array.isArray(body.blocks) && body.blocks.length > 0) {
    const { error: blockError } = await supabase.from('content_blocks').insert(
      body.blocks.map((item: any) => ({
        content_id: contentId,
        locale: item.locale,
        block_key: item.block_key,
        block_type: item.block_type,
        display_order: Number(item.display_order || 0),
        data_json: item.data_json || {},
      })),
    );

    if (blockError) {
      return NextResponse.json({ error: blockError.message }, { status: 500 });
    }
  }

  if (Array.isArray(body.relations) && body.relations.length > 0) {
    const { error: relationError } = await supabase.from('content_relations').insert(
      body.relations.map((item: any) => ({
        content_id: contentId,
        relation_type: item.relation_type,
        target_type: item.target_type,
        target_id: item.target_id,
        display_order: Number(item.display_order || 0),
        notes: item.notes || null,
      })),
    );

    if (relationError) {
      return NextResponse.json({ error: relationError.message }, { status: 500 });
    }
  }

  writeAuditLog(req, admin, {
    module: 'cms',
    action: 'update',
    targetType: 'content_record',
    targetId: contentId,
    targetName: body.localizations?.[0]?.title || body.canonical_slug || null,
    newValue: {
      workflowState: body.workflow_state,
      contentType: body.content_type,
      canonicalSlug: body.canonical_slug,
    },
    changesSummary: `更新内容：${body.localizations?.[0]?.title || body.canonical_slug || contentId}`,
  });

  return NextResponse.json({ success: true });
});