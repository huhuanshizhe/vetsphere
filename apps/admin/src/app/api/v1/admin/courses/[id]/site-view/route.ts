import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSiteCode, siteCodeErrorResponse } from '@/lib/site-resolver';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// POST /api/v1/admin/courses/[id]/site-view - initialize site view
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const siteCode = requireSiteCode(req);

    const { data, error } = await supabase
      .from('course_site_views')
      .upsert({
        course_id: id,
        site_code: siteCode,
        is_enabled: true,
        publish_status: 'draft',
      }, { onConflict: 'course_id,site_code' })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    try { return siteCodeErrorResponse(error); } catch {}
    console.error('Failed to init course site view:', error);
    return NextResponse.json({ error: 'Failed to initialize site view' }, { status: 500 });
  }
}

// PATCH /api/v1/admin/courses/[id]/site-view?site_code=cn - update site view
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const siteCode = requireSiteCode(req);
    const body = await req.json();

    const { data, error } = await supabase
      .from('course_site_views')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('course_id', id)
      .eq('site_code', siteCode)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    try { return siteCodeErrorResponse(error); } catch {}
    console.error('Failed to update course site view:', error);
    return NextResponse.json({ error: 'Failed to update site view' }, { status: 500 });
  }
}
