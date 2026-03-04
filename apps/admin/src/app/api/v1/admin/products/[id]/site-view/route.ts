import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSiteCode, siteCodeErrorResponse } from '@/lib/site-resolver';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// POST - initialize site view
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const siteCode = requireSiteCode(req);

    const { data, error } = await supabase
      .from('product_site_views')
      .upsert({
        product_id: id,
        site_code: siteCode,
        is_enabled: true,
        publish_status: 'draft',
      }, { onConflict: 'product_id,site_code' })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    try { return siteCodeErrorResponse(error); } catch {}
    console.error('Failed to init product site view:', error);
    return NextResponse.json({ error: 'Failed to initialize site view' }, { status: 500 });
  }
}

// PATCH - update site view
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const siteCode = requireSiteCode(req);
    const body = await req.json();

    const { data, error } = await supabase
      .from('product_site_views')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('product_id', id)
      .eq('site_code', siteCode)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    try { return siteCodeErrorResponse(error); } catch {}
    console.error('Failed to update product site view:', error);
    return NextResponse.json({ error: 'Failed to update site view' }, { status: 500 });
  }
}
