import { NextRequest, NextResponse } from 'next/server';
import {
  parseViewMode,
  parseSiteCode,
  requireSiteCode,
  siteCodeErrorResponse,
} from '@/lib/site-resolver';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth-middleware';
import { writeAuditLog } from '@/lib/audit';

const supabase = getSupabaseAdmin();

type SupportedLanguage = 'zh' | 'en' | 'th' | 'ja';

function generateCourseId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `c-${timestamp}-${random}`;
}

function generateSlug(title: string, fallback: string): string {
  const normalized = title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

  return normalized || fallback.toLowerCase();
}

function normalizeSourceLanguage(value: unknown): SupportedLanguage {
  if (value === 'zh' || value === 'en' || value === 'th' || value === 'ja') {
    return value;
  }

  return 'zh';
}

function toNullIfEmpty<T>(value: T | '' | undefined): T | null {
  return value === '' || value === undefined ? null : value;
}

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed.replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/[,，/\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeCoursePayload(body: Record<string, any>) {
  const sourceLanguage = normalizeSourceLanguage(body.publishLanguage || body.publish_language);
  const status = body.status === 'published' ? 'published' : 'draft';
  const courseId =
    typeof body.id === 'string' && body.id.trim() ? body.id.trim() : generateCourseId();
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const subtitle = typeof body.subtitle === 'string' ? body.subtitle.trim() : null;
  const coverImageUrl =
    typeof body.coverImageUrl === 'string'
      ? body.coverImageUrl.trim()
      : typeof body.cover_image_url === 'string'
        ? body.cover_image_url.trim()
        : typeof body.imageUrl === 'string'
          ? body.imageUrl.trim()
          : typeof body.image_url === 'string'
            ? body.image_url.trim()
            : '';
  const price = toNumberOrNull(body.price);
  const currency =
    typeof body.currency === 'string' && body.currency.trim()
      ? body.currency.trim().toUpperCase()
      : 'CNY';
  const specialtyList = normalizeStringArray(body.specialties ?? body.specialty);
  const instructorNames = normalizeStringArray(body.instructorNames ?? body.instructor_names);
  const location =
    body.location && typeof body.location === 'object'
      ? body.location
      : { venue: typeof body.location === 'string' ? body.location.trim() : '' };
  const agenda = Array.isArray(body.agenda) ? body.agenda : [];
  const teachingLanguages = normalizeStringArray(body.teachingLanguages ?? body.teaching_languages);

  const payload: Record<string, any> = {
    id: courseId,
    title,
    slug:
      typeof body.slug === 'string' && body.slug.trim()
        ? body.slug.trim()
        : generateSlug(title, courseId),
    subtitle,
    description,
    specialty: specialtyList[0] || null,
    specialties: specialtyList,
    level: typeof body.level === 'string' && body.level.trim() ? body.level.trim() : null,
    format: typeof body.format === 'string' && body.format.trim() ? body.format.trim() : 'offline',
    price,
    currency,
    image_url: coverImageUrl || null,
    cover_image_url: coverImageUrl || null,
    start_date: toNullIfEmpty(body.startDate ?? body.start_date),
    end_date: toNullIfEmpty(body.endDate ?? body.end_date),
    location,
    instructor:
      body.instructor && typeof body.instructor === 'object'
        ? body.instructor
        : { name: instructorNames[0] || '' },
    instructor_names: instructorNames,
    agenda,
    target_audience:
      typeof body.targetAudience === 'string'
        ? body.targetAudience.trim()
        : typeof body.target_audience === 'string'
          ? body.target_audience.trim()
          : null,
    publish_language: sourceLanguage,
    teaching_languages: teachingLanguages,
    services: body.services && typeof body.services === 'object' ? body.services : {},
    translations_complete: Boolean(
      body.translationsComplete ?? body.translations_complete ?? false,
    ),
    translated_at: toNullIfEmpty(body.translatedAt ?? body.translated_at),
    status,
    published_at: status === 'published' ? new Date().toISOString() : null,
    is_free: price === 0,
  };

  if (currency === 'CNY') payload.price_cny = price;
  if (currency === 'USD') payload.price_usd = price;
  if (currency === 'JPY') payload.price_jpy = price;
  if (currency === 'THB') payload.price_thb = price;

  return {
    payload,
    siteCode:
      typeof body.siteCode === 'string' && body.siteCode.trim()
        ? body.siteCode.trim().toLowerCase()
        : typeof body.site_code === 'string' && body.site_code.trim()
          ? body.site_code.trim().toLowerCase()
          : null,
    publishStatus: status,
  };
}

// GET /api/v1/admin/courses?view=base|site&site_code=cn|intl
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;
  try {
    const view = parseViewMode(req);

    if (view === 'site') {
      const siteCode = requireSiteCode(req);
      const { data, error } = await supabase
        .from('course_site_views')
        .select(
          `
          *,
          course:courses(id, title, slug, status, format, level, cover_image_url, instructor_names)
        `,
        )
        .eq('site_code', siteCode)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return NextResponse.json({ view: 'site', site_code: siteCode, data: data || [] });
    }

    // Base view
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .is('deleted_at', null)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    // Attach site view status summary
    const courseIds = (data || []).map((c) => c.id);
    const siteViews: Record<string, any[]> = {};

    if (courseIds.length > 0) {
      const { data: views } = await supabase
        .from('course_site_views')
        .select('course_id, site_code, publish_status, is_enabled')
        .in('course_id', courseIds);

      (views || []).forEach((v) => {
        if (!siteViews[v.course_id]) siteViews[v.course_id] = [];
        siteViews[v.course_id].push(v);
      });
    }

    const enriched = (data || []).map((c) => ({
      ...c,
      site_views: siteViews[c.id] || [],
    }));

    return NextResponse.json({ view: 'base', data: enriched });
  } catch (error) {
    try {
      return siteCodeErrorResponse(error);
    } catch (_siteCodeError) {
      void _siteCodeError;
    }
    console.error('Failed to fetch courses:', error);
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
  }
}

// POST /api/v1/admin/courses - create base course and optional site view
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;

  try {
    const body = await req.json();
    const { payload, siteCode, publishStatus } = normalizeCoursePayload(body);

    if (!payload.title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const { data, error } = await supabase.from('courses').insert(payload).select('*').single();

    if (error) throw error;

    let siteView: Record<string, any> | null = null;

    if (siteCode) {
      const { data: siteViewData, error: siteViewError } = await supabase
        .from('course_site_views')
        .upsert(
          {
            course_id: payload.id,
            site_code: siteCode,
            is_enabled: true,
            publish_status: publishStatus,
            published_at: publishStatus === 'published' ? new Date().toISOString() : null,
          },
          { onConflict: 'course_id,site_code' },
        )
        .select('*')
        .single();

      if (siteViewError) throw siteViewError;
      siteView = siteViewData;
    }

    writeAuditLog(req, auth.admin, {
      module: 'course',
      action: 'create',
      targetType: 'course',
      targetId: payload.id,
      targetName: payload.title,
      newValue: payload,
      changesSummary: siteCode
        ? `创建课程并同步站点视图：${payload.title} -> ${siteCode}`
        : `创建课程：${payload.title}`,
    });

    return NextResponse.json({ data, siteView }, { status: 201 });
  } catch (error) {
    console.error('Failed to create course:', error);
    return NextResponse.json({ error: 'Failed to create course' }, { status: 500 });
  }
}
