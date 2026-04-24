import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth-middleware';

const supabase = getSupabaseAdmin();

// POST /api/v1/admin/courses/[id]/site-view
// 创建或更新课程的站点视图（绕过RLS，使用service role）
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;
  try {
    const { id } = await params;
    const body = await req.json();
    const { site_code, publish_status = 'published' } = body;

    if (!site_code) {
      return NextResponse.json(
        { error: 'site_code is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('course_site_views')
      .upsert({
        course_id: id,
        site_code,
        is_enabled: true,
        publish_status,
        published_at: publish_status === 'published' ? new Date().toISOString() : null,
      }, { onConflict: 'course_id,site_code' })
      .select()
      .single();

    if (error) {
      console.error('Failed to upsert course site view:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to create/update course site view:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/v1/admin/courses/[id]/site-view?site_code=cn
// 删除课程的站点视图
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;
  try {
    const { id } = await params;
    const siteCode = req.nextUrl.searchParams.get('site_code');

    if (!siteCode) {
      return NextResponse.json(
        { error: 'site_code is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('course_site_views')
      .delete()
      .eq('course_id', id)
      .eq('site_code', siteCode);

    if (error) {
      console.error('Failed to delete course site view:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete course site view:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
