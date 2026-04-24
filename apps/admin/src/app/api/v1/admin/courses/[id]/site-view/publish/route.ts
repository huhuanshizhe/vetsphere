import { NextRequest, NextResponse } from 'next/server';
import { requireSiteCode, siteCodeErrorResponse } from '@/lib/site-resolver';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth-middleware';
import { writeAuditLog } from '@/lib/audit';

// POST /api/v1/admin/courses/[id]/site-view/publish?site_code=cn
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;
  const supabase = getSupabaseAdmin();
  try {
    const { id } = await params;
    const siteCode = requireSiteCode(req);

    const { data, error } = await supabase
      .from('course_site_views')
      .update({ publish_status: 'published', published_at: new Date().toISOString() })
      .eq('course_id', id)
      .eq('site_code', siteCode)
      .select()
      .single();

    if (error) throw error;

    writeAuditLog(req, auth.admin, {
      module: 'course',
      action: 'publish',
      targetType: 'course_site_view',
      targetId: id,
      newValue: { site_code: siteCode, publish_status: 'published' },
      changesSummary: `发布课程至 ${siteCode} 站`,
    });

    return NextResponse.json(data);
  } catch (error) {
    try { return siteCodeErrorResponse(error); } catch {}
    console.error('Failed to publish course site view:', error);
    return NextResponse.json({ error: 'Failed to publish' }, { status: 500 });
  }
}
