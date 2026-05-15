import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth-middleware';
import { normalizeCourseSiteViewPayload } from '@/lib/course-site-view';

const supabase = getSupabaseAdmin();

function resolveSiteCode(req: NextRequest, body: Record<string, unknown>): string | null {
  const querySiteCode = req.nextUrl.searchParams.get('site_code')?.trim().toLowerCase();
  if (querySiteCode) {
    return querySiteCode;
  }

  const bodySiteCode = typeof body.site_code === 'string' ? body.site_code.trim().toLowerCase() : '';
  return bodySiteCode || null;
}

async function upsertCourseSiteView(courseId: string, rawBody: Record<string, unknown>) {
  const normalized = normalizeCourseSiteViewPayload(rawBody);
  if (normalized.error) {
    return { error: normalized.error, status: 400 as const, data: null };
  }

  const { data, error } = await supabase
    .from('course_site_views')
    .upsert(
      {
        course_id: courseId,
        ...normalized.payload,
      },
      { onConflict: 'course_id,site_code' },
    )
    .select()
    .single();

  if (error) {
    return { error: error.message, status: 500 as const, data: null };
  }

  return { data, error: null, status: 200 as const };
}

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
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const siteCode = resolveSiteCode(req, body);

    if (!siteCode) {
      return NextResponse.json(
        { error: 'site_code is required' },
        { status: 400 }
      );
    }

    const result = await upsertCourseSiteView(id, { ...body, site_code: siteCode });

    if (result.error || !result.data) {
      return NextResponse.json(
        { error: result.error || 'Failed to upsert course site view' },
        { status: result.status }
      );
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    console.error('Failed to create/update course site view:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;
  try {
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const siteCode = resolveSiteCode(req, body);

    if (!siteCode) {
      return NextResponse.json({ error: 'site_code is required' }, { status: 400 });
    }

    const result = await upsertCourseSiteView(id, { ...body, site_code: siteCode });
    if (result.error || !result.data) {
      return NextResponse.json(
        { error: result.error || 'Failed to update course site view' },
        { status: result.status },
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Failed to update course site view:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
