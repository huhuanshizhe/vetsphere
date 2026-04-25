import { NextRequest, NextResponse } from 'next/server';
import { parseSiteCode, siteCodeErrorResponse } from '@/lib/site-resolver';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth-middleware';
import { writeAuditLog } from '@/lib/audit';

const supabase = getSupabaseAdmin();

// GET /api/v1/admin/site-pages?site_code=cn
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;
  try {
    const siteCode = parseSiteCode(req);
    let query = supabase.from('site_pages').select('*');
    if (siteCode) query = query.eq('site_code', siteCode);
    query = query.order('updated_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Failed to fetch site pages:', error);
    return NextResponse.json({ error: 'Failed to fetch site pages' }, { status: 500 });
  }
}

// POST /api/v1/admin/site-pages
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;
  try {
    const body = await req.json();
    const { data, error } = await supabase
      .from('site_pages')
      .insert(body)
      .select()
      .single();

    if (error) throw error;

    writeAuditLog(req, auth.admin, {
      module: 'cms',
      action: 'create',
      targetType: 'site_page',
      targetId: (data as { id?: string } | null)?.id ?? null,
      targetName: (data as { title?: string; slug?: string } | null)?.title
        || (data as { title?: string; slug?: string } | null)?.slug
        || null,
      newValue: body,
      changesSummary: '创建站点页面',
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    try { return siteCodeErrorResponse(error); } catch {}
    console.error('Failed to create site page:', error);
    return NextResponse.json({ error: 'Failed to create site page' }, { status: 500 });
  }
}
