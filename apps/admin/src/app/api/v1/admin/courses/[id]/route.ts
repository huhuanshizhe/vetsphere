import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parseViewMode, parseSiteCode, siteCodeErrorResponse } from '@/lib/site-resolver';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// DB snake_case -> frontend camelCase mapping
function mapCourseFromDB(c: Record<string, any>): Record<string, any> {
  return {
    ...c,
    // Map snake_case columns to camelCase
    startDate: c.start_date ?? null,
    endDate: c.end_date ?? null,
    imageUrl: c.image_url ?? null,
    maxCapacity: c.max_enrollment ?? 30,
    enrolledCount: c.current_enrollment ?? 0,
    enrollmentDeadline: c.enrollment_deadline ?? null,
    totalHours: c.total_hours ?? null,
    publishLanguage: c.publish_language ?? 'zh',
    teachingLanguages: c.teaching_languages ?? [],
    previewVideoUrl: c.preview_video_url ?? null,
    translationsComplete: c.translations_complete ?? false,
    translatedAt: c.translated_at ?? null,
    rejectionReason: c.rejection_reason ?? null,
    targetAudience: c.target_audience ?? null,
    targetAudience_zh: c.target_audience_zh ?? null,
  };
}

// Frontend camelCase -> DB snake_case mapping
function mapCourseForDB(body: Record<string, any>): Record<string, any> {
  const payload: Record<string, any> = {};

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
      .update({ ...dbPayload, updated_at: new Date().toISOString() })
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
