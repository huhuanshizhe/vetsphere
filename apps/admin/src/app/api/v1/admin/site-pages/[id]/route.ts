import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth-middleware';
import { writeAuditLog } from '@/lib/audit';

const supabase = getSupabaseAdmin();

// GET /api/v1/admin/site-pages/[id] - with sections
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;
  try {
    const { id } = await params;
    const { data: page, error } = await supabase
      .from('site_pages')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    const { data: sections } = await supabase
      .from('site_page_sections')
      .select(`
        *,
        items:site_page_section_items(*)
      `)
      .eq('site_page_id', id)
      .order('display_order', { ascending: true });

    return NextResponse.json({ ...page, sections: sections || [] });
  } catch (error) {
    console.error('Failed to fetch site page:', error);
    return NextResponse.json({ error: 'Failed to fetch site page' }, { status: 500 });
  }
}

// PATCH /api/v1/admin/site-pages/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;
  try {
    const { id } = await params;
    const body = await req.json();
    const { data, error } = await supabase
      .from('site_pages')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    writeAuditLog(req, auth.admin, {
      module: 'cms',
      action: 'update',
      targetType: 'site_page',
      targetId: id,
      targetName: (data as { title?: string; slug?: string } | null)?.title
        || (data as { title?: string; slug?: string } | null)?.slug
        || null,
      newValue: body,
      changesSummary: `更新站点页面字段：${Object.keys(body).join(', ')}`,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to update site page:', error);
    return NextResponse.json({ error: 'Failed to update site page' }, { status: 500 });
  }
}

// DELETE /api/v1/admin/site-pages/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;
  try {
    const { id } = await params;
    const { error } = await supabase
      .from('site_pages')
      .delete()
      .eq('id', id);

    if (error) throw error;

    writeAuditLog(req, auth.admin, {
      module: 'cms',
      action: 'delete',
      targetType: 'site_page',
      targetId: id,
      changesSummary: '删除站点页面',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete site page:', error);
    return NextResponse.json({ error: 'Failed to delete site page' }, { status: 500 });
  }
}
