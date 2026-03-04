import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/v1/admin/site-pages/[id] - with sections
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { data: page, error } = await supabase
      .from('site_pages')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    const { data: sections } = await supabase
      .from('site_page_sections')
      .select(`
        *,
        items:site_page_section_items(*)
      `)
      .eq('site_page_id', id)
      .order('display_order', { ascending: true });

    return NextResponse.json({ ...page, sections: sections || [] });
  } catch (error) {
    console.error('Failed to fetch site page:', error);
    return NextResponse.json({ error: 'Failed to fetch site page' }, { status: 500 });
  }
}

// PATCH /api/v1/admin/site-pages/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { data, error } = await supabase
      .from('site_pages')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to update site page:', error);
    return NextResponse.json({ error: 'Failed to update site page' }, { status: 500 });
  }
}

// DELETE /api/v1/admin/site-pages/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { error } = await supabase
      .from('site_pages')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete site page:', error);
    return NextResponse.json({ error: 'Failed to delete site page' }, { status: 500 });
  }
}
