import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth-middleware';
import { writeAuditLog } from '@/lib/audit';
import { createContentSlug } from '@/lib/content-admin';
import { extractAccessToken } from '@/lib/request-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const POST = withAdminAuth<{ id: string }>(async (req, { admin, params }) => {
  const supabase = getSupabaseAdmin(extractAccessToken(req));
  const contentId = params?.id;

  const { data: source, error: sourceError } = await supabase
    .from('content_records')
    .select(
      `
      *,
      content_localizations(*),
      content_site_views(*),
      content_blocks(*),
      content_relations(*)
    `,
    )
    .eq('id', contentId)
    .maybeSingle();

  if (sourceError) {
    return NextResponse.json({ error: sourceError.message }, { status: 500 });
  }
  if (!source) {
    return NextResponse.json({ error: 'Content not found' }, { status: 404 });
  }

  const canonicalSlug = createContentSlug(`${source.canonical_slug}-copy`, source.content_type.replace(/_/g, '-'));
  const now = new Date().toISOString();

  const { data: created, error: createError } = await supabase
    .from('content_records')
    .insert({
      content_type: source.content_type,
      canonical_slug: canonicalSlug,
      workflow_state: 'draft',
      source_language: source.source_language,
      primary_specialty: source.primary_specialty,
      primary_procedure: source.primary_procedure,
      target_audience: source.target_audience,
      search_intent: source.search_intent,
      owner_team: source.owner_team,
      publish_priority: source.publish_priority,
      author_id: admin.id,
      updated_at: now,
    })
    .select('id')
    .single();

  if (createError || !created) {
    return NextResponse.json({ error: createError?.message || 'Failed to duplicate content' }, { status: 500 });
  }

  const newId = created.id;

  if (Array.isArray(source.content_localizations) && source.content_localizations.length > 0) {
    await supabase.from('content_localizations').insert(
      source.content_localizations.map((item: any, index: number) => ({
        content_id: newId,
        locale: item.locale,
        title: index === 0 ? `${item.title} (Copy)` : item.title,
        subtitle: item.subtitle,
        summary: item.summary,
        hero_title: item.hero_title,
        hero_subtitle: item.hero_subtitle,
        seo_title: item.seo_title,
        seo_description: item.seo_description,
        body_markdown: item.body_markdown,
        body_json: item.body_json || {},
        opening_answer: item.opening_answer,
        references_json: item.references_json || [],
        faq_json: item.faq_json || [],
        is_source_locale: Boolean(item.is_source_locale),
        quality_score: item.quality_score || null,
      })),
    );
  }

  if (Array.isArray(source.content_site_views) && source.content_site_views.length > 0) {
    await supabase.from('content_site_views').insert(
      source.content_site_views.map((item: any) => ({
        content_id: newId,
        site_code: item.site_code,
        publish_status: 'draft',
        slug_override: item.slug_override ? `${item.slug_override}-copy` : null,
        seo_title_override: item.seo_title_override,
        seo_description_override: item.seo_description_override,
        is_featured: false,
        display_order: item.display_order || 0,
        route_status: 'active',
        route_config_json: item.route_config_json || {},
      })),
    );
  }

  if (Array.isArray(source.content_blocks) && source.content_blocks.length > 0) {
    await supabase.from('content_blocks').insert(
      source.content_blocks.map((item: any) => ({
        content_id: newId,
        locale: item.locale,
        block_key: item.block_key,
        block_type: item.block_type,
        display_order: item.display_order || 0,
        data_json: item.data_json || {},
      })),
    );
  }

  if (Array.isArray(source.content_relations) && source.content_relations.length > 0) {
    await supabase.from('content_relations').insert(
      source.content_relations.map((item: any) => ({
        content_id: newId,
        relation_type: item.relation_type,
        target_type: item.target_type,
        target_id: item.target_id,
        display_order: item.display_order || 0,
        notes: item.notes || null,
      })),
    );
  }

  writeAuditLog(req, admin, {
    module: 'cms',
    action: 'create',
    targetType: 'content_record',
    targetId: newId,
    changesSummary: `复制内容：${contentId} -> ${newId}`,
  });

  return NextResponse.json({ id: newId, canonicalSlug: canonicalSlug });
});