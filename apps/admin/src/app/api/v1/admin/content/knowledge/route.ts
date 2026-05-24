import { NextResponse } from 'next/server';
import { assertSiteAuthorized, withAdminAuth } from '@/lib/auth-middleware';
import { writeAuditLog } from '@/lib/audit';
import { importKnowledgeAsset } from '@/lib/content-rag';
import { extractAccessToken } from '@/lib/request-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = withAdminAuth(async (req, { admin }) => {
  const supabase = getSupabaseAdmin(extractAccessToken(req));
  const siteCode = req.nextUrl.searchParams.get('siteCode') || 'intl';
  const search = (req.nextUrl.searchParams.get('q') || '').trim();
  const sourceType = req.nextUrl.searchParams.get('sourceType') || '';

  assertSiteAuthorized(admin, siteCode);

  let query = supabase
    .from('knowledge_assets')
    .select(
      'id, source_type, source_id, site_code, locale, title, status, source_url, metadata_json, created_at, updated_at',
      { count: 'exact' },
    )
    .eq('site_code', siteCode)
    .order('created_at', { ascending: false })
    .limit(200);

  if (sourceType) {
    query = query.eq('source_type', sourceType);
  }
  if (search) {
    query = query.or(`title.ilike.%${search}%,source_type.ilike.%${search}%`);
  }

  const { data, count, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data || [], total: count || 0 });
});

export const POST = withAdminAuth(async (req, { admin }) => {
  const supabase = getSupabaseAdmin(extractAccessToken(req));
  const body = await req.json();
  const siteCode = typeof body.siteCode === 'string' ? body.siteCode : 'intl';

  assertSiteAuthorized(admin, siteCode);

  try {
    const result = await importKnowledgeAsset(supabase, {
      sourceType: body.sourceType || 'manual_note',
      title: body.title || '',
      rawText: body.rawText || '',
      siteCode,
      locale: body.locale || 'en',
      sourceId: body.sourceId || null,
      sourceUrl: body.sourceUrl || null,
      metadata: body.metadata || {},
      createdBy: admin.id,
    });

    writeAuditLog(req, admin, {
      module: 'cms',
      action: 'create',
      targetType: 'knowledge_asset',
      targetId: result.assetId,
      targetName: body.title || result.assetId,
      changesSummary: `导入知识资产：${body.title || result.assetId}`,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to import knowledge asset' },
      { status: 400 },
    );
  }
});