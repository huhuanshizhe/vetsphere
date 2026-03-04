import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parseViewMode, parseSiteCode, requireSiteCode, siteCodeErrorResponse } from '@/lib/site-resolver';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/v1/admin/courses?view=base|site&site_code=cn|intl
export async function GET(req: NextRequest) {
  try {
    const view = parseViewMode(req);

    if (view === 'site') {
      const siteCode = requireSiteCode(req);
      const { data, error } = await supabase
        .from('course_site_views')
        .select(`
          *,
          course:courses(id, title, slug, status, format, level, cover_image_url, instructor_names)
        `)
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
    const courseIds = (data || []).map(c => c.id);
    let siteViews: Record<string, any[]> = {};

    if (courseIds.length > 0) {
      const { data: views } = await supabase
        .from('course_site_views')
        .select('course_id, site_code, publish_status, is_enabled')
        .in('course_id', courseIds);

      (views || []).forEach(v => {
        if (!siteViews[v.course_id]) siteViews[v.course_id] = [];
        siteViews[v.course_id].push(v);
      });
    }

    const enriched = (data || []).map(c => ({
      ...c,
      site_views: siteViews[c.id] || [],
    }));

    return NextResponse.json({ view: 'base', data: enriched });
  } catch (error) {
    try { return siteCodeErrorResponse(error); } catch {}
    console.error('Failed to fetch courses:', error);
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
  }
}
