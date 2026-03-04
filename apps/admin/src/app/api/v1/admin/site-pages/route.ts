import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parseSiteCode, siteCodeErrorResponse } from '@/lib/site-resolver';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/v1/admin/site-pages?site_code=cn
export async function GET(req: NextRequest) {
  try {
    const siteCode = parseSiteCode(req);
    let query = supabase.from('site_pages').select('*');
    if (siteCode) query = query.eq('site_code', siteCode);
    query = query.order('updated_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Failed to fetch site pages:', error);
    return NextResponse.json({ error: 'Failed to fetch site pages' }, { status: 500 });
  }
}

// POST /api/v1/admin/site-pages
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { data, error } = await supabase
      .from('site_pages')
      .insert(body)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    try { return siteCodeErrorResponse(error); } catch {}
    console.error('Failed to create site page:', error);
    return NextResponse.json({ error: 'Failed to create site page' }, { status: 500 });
  }
}
