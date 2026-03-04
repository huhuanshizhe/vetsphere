import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/v1/admin/site-pages/[id]/sections
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { data, error } = await supabase
      .from('site_page_sections')
      .select(`*, items:site_page_section_items(*)`)
      .eq('site_page_id', id)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Failed to fetch sections:', error);
    return NextResponse.json({ error: 'Failed to fetch sections' }, { status: 500 });
  }
}

// POST /api/v1/admin/site-pages/[id]/sections
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { data, error } = await supabase
      .from('site_page_sections')
      .insert({ ...body, site_page_id: id })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Failed to create section:', error);
    return NextResponse.json({ error: 'Failed to create section' }, { status: 500 });
  }
}

// PATCH /api/v1/admin/site-pages/[id]/sections - batch update
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { sections } = await req.json();

    if (!Array.isArray(sections)) {
      return NextResponse.json({ error: 'sections must be an array' }, { status: 400 });
    }

    const results = [];
    for (const section of sections) {
      const { id: sectionId, ...updates } = section;
      if (sectionId) {
        const { data, error } = await supabase
          .from('site_page_sections')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', sectionId)
          .eq('site_page_id', id)
          .select()
          .single();
        if (error) throw error;
        results.push(data);
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Failed to update sections:', error);
    return NextResponse.json({ error: 'Failed to update sections' }, { status: 500 });
  }
}
