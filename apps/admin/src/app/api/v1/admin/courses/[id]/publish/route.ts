import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-middleware';
import { writeAuditLog } from '@/lib/audit';
import {
  formatCoursePublishIssues,
  validateCoursePublishReadiness,
} from '@/lib/course-publish-validation';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

function extractAccessToken(req: NextRequest): string | undefined {
  const authorization = req.headers.get('authorization')?.trim();
  if (!authorization || !authorization.toLowerCase().startsWith('bearer ')) {
    return undefined;
  }

  const token = authorization.slice(7).trim();
  return token || undefined;
}

function normalizeSiteCodes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => String(item).trim().toLowerCase())
    .filter(Boolean)
    .filter((item, index, array) => array.indexOf(item) === index);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;

  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const siteCodes = normalizeSiteCodes(body.siteCodes ?? body.sites ?? body.selectedSites);

    if (siteCodes.length === 0) {
      return NextResponse.json({ error: '请至少选择一个发布站点' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin(extractAccessToken(req));
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', id)
      .single();

    if (courseError) throw courseError;
    if (!course) {
      return NextResponse.json({ error: '课程不存在' }, { status: 404 });
    }

    const validation = validateCoursePublishReadiness(course);
    if (!validation.canPublish) {
      return NextResponse.json(
        {
          error: `课程未满足发布条件：${formatCoursePublishIssues(validation.issues)}`,
          issues: validation.issues,
        },
        { status: 400 },
      );
    }

    const publishedAt = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('courses')
      .update({
        status: 'published',
        published_at: publishedAt,
        offline_reason: null,
        offline_at: null,
      })
      .eq('id', id);

    if (updateError) throw updateError;

    const siteViewResults = await Promise.all(
      siteCodes.map((siteCode) =>
        supabase.from('course_site_views').upsert(
          {
            course_id: id,
            site_code: siteCode,
            is_enabled: true,
            publish_status: 'published',
            published_at: publishedAt,
          },
          { onConflict: 'course_id,site_code' },
        ),
      ),
    );

    const siteViewError = siteViewResults.find((result) => result.error);
    if (siteViewError?.error) {
      throw siteViewError.error;
    }

    writeAuditLog(req, auth.admin, {
      module: 'course',
      action: 'publish',
      targetType: 'course',
      targetId: id,
      targetName: (course as { title?: string }).title ?? null,
      newValue: {
        siteCodes,
        publishedAt,
      },
      changesSummary: `发布课程：${(course as { title?: string }).title ?? id} -> ${siteCodes.join(', ')}`,
    });

    return NextResponse.json({ success: true, siteCodes, publishedAt });
  } catch (error) {
    console.error('Failed to publish course:', error);
    return NextResponse.json({ error: '发布课程失败' }, { status: 500 });
  }
}