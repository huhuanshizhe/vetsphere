import { NextRequest, NextResponse } from 'next/server';
import { requireSiteCode, siteCodeErrorResponse } from '@/lib/site-resolver';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth-middleware';
import { writeAuditLog } from '@/lib/audit';

// POST /api/v1/admin/courses/[id]/site-view/offline?site_code=cn
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
      .update({ publish_status: 'offline' })
      .eq('course_id', id)
      .eq('site_code', siteCode)
      .select()
      .single();

    if (error) throw error;

    writeAuditLog(req, auth.admin, {
      module: 'course',
      action: 'offline',
      targetType: 'course_site_view',
      targetId: id,
      newValue: { site_code: siteCode, publish_status: 'offline' },
      changesSummary: `下线课程（${siteCode} 站）`,
    });

    return NextResponse.json(data);
  } catch (error) {
    try { return siteCodeErrorResponse(error); } catch {}
    console.error('Failed to offline course site view:', error);
    return NextResponse.json({ error: 'Failed to offline' }, { status: 500 });
  }
}
