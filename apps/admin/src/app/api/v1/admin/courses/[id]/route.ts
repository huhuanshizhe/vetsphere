import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parseViewMode, parseSiteCode, siteCodeErrorResponse } from '@/lib/site-resolver';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// DB snake_case -> frontend camelCase mapping
// Only map fields that actually exist in the DB row to avoid phantom defaults
function mapCourseFromDB(c: Record<string, any>): Record<string, any> {
  const mapped: Record<string, any> = { ...c };

  const snakeToCamel: [string, string][] = [
    ['start_date', 'startDate'],
    ['end_date', 'endDate'],
    ['image_url', 'imageUrl'],
    ['max_enrollment', 'maxCapacity'],
    ['current_enrollment', 'enrolledCount'],
    ['enrollment_deadline', 'enrollmentDeadline'],
    ['total_hours', 'totalHours'],
    ['publish_language', 'publishLanguage'],
    ['teaching_languages', 'teachingLanguages'],
    ['preview_video_url', 'previewVideoUrl'],
    ['translations_complete', 'translationsComplete'],
    ['translated_at', 'translatedAt'],
    ['rejection_reason', 'rejectionReason'],
    ['target_audience', 'targetAudience'],
    ['target_audience_zh', 'targetAudience_zh'],
  ];

  for (const [snake, camel] of snakeToCamel) {
    if (snake in c) {
      mapped[camel] = c[snake];
    }
  }

  return mapped;
}

// Frontend camelCase -> DB snake_case mapping
function mapCourseForDB(body: Record<string, any>): Record<string, any> {
  const payload: Record<string, any> = {};

  // Convert empty strings to null for date/numeric fields
  const toNullIfEmpty = (v: any) => (v === '' || v === undefined) ? null : v;

  // Direct pass-through fields (same name in DB and frontend)
  const directFields = [
    'title', 'specialty', 'level', 'price', 'currency', 'format',
    'description', 'status', 'instructor', 'location', 'agenda', 'services',
    'title_en', 'title_zh', 'title_th', 'title_ja',
    'description_en', 'description_zh', 'description_th', 'description_ja',
    'price_cny', 'price_usd', 'price_jpy', 'price_thb',
    'target_audience', 'target_audience_zh',
    'translations_complete', 'translated_at',
  ];
  for (const f of directFields) {
    if (body[f] !== undefined) payload[f] = body[f];
  }

  // camelCase -> snake_case mappings
  const camelToSnake: Record<string, string> = {
    startDate: 'start_date',
    endDate: 'end_date',
    imageUrl: 'image_url',
    maxCapacity: 'max_enrollment',
    enrollmentDeadline: 'enrollment_deadline',
    totalHours: 'total_hours',
    publishLanguage: 'publish_language',
    teachingLanguages: 'teaching_languages',
    previewVideoUrl: 'preview_video_url',
    translationsComplete: 'translations_complete',
    translatedAt: 'translated_at',
    rejectionReason: 'rejection_reason',
    targetAudience: 'target_audience',
    targetAudience_zh: 'target_audience_zh',
    enrolledCount: 'current_enrollment',
  };
  for (const [camel, snake] of Object.entries(camelToSnake)) {
    if (body[camel] !== undefined) payload[snake] = body[camel];
  }

  // Sanitize date fields: empty strings -> null (PostgreSQL rejects '' for date columns)
  const dateFields = ['start_date', 'end_date', 'enrollment_deadline', 'translated_at'];
  for (const f of dateFields) {
    if (f in payload) payload[f] = toNullIfEmpty(payload[f]);
  }

  // Sanitize numeric fields: empty strings -> null
  const numericFields = ['total_hours', 'price', 'max_enrollment', 'current_enrollment', 'price_cny', 'price_usd', 'price_jpy', 'price_thb'];
  for (const f of numericFields) {
    if (f in payload && payload[f] === '') payload[f] = null;
  }

  return payload;
}

// GET /api/v1/admin/courses/[id]?view=base|site&site_code=cn
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const view = parseViewMode(req);

    if (view === 'site') {
      const siteCode = parseSiteCode(req) || 'cn';
      const { data, error } = await supabase
        .from('course_site_views')
        .select(`*, course:courses(*)`)
        .eq('course_id', id)
        .eq('site_code', siteCode)
        .single();

      if (error && error.code === 'PGRST116') {
        return NextResponse.json({ view: 'site', site_code: siteCode, data: null, initialized: false });
      }
      if (error) throw error;
      return NextResponse.json({ view: 'site', site_code: siteCode, data, initialized: true });
    }

    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    // Get all site views for this course
    const { data: siteViews } = await supabase
      .from('course_site_views')
      .select('*')
      .eq('course_id', id);

    // Map snake_case DB columns to camelCase for frontend
    const mapped = mapCourseFromDB(data);
    return NextResponse.json({ view: 'base', data: { ...mapped, site_views: siteViews || [] } });
  } catch (error) {
    try { return siteCodeErrorResponse(error); } catch {}
    console.error('Failed to fetch course:', error);
    return NextResponse.json({ error: 'Failed to fetch course' }, { status: 500 });
  }
}

// PATCH /api/v1/admin/courses/[id] - update base course
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    
    // Map camelCase frontend fields to snake_case DB columns
    const dbPayload = mapCourseForDB(body);
    
    const { data, error } = await supabase
      .from('courses')
      .update(dbPayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to update course:', error);
    return NextResponse.json({ error: 'Failed to update course' }, { status: 500 });
  }
}
