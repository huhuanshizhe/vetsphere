import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parseViewMode, parseSiteCode, siteCodeErrorResponse } from '@/lib/site-resolver';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/v1/admin/products/[id]?view=base|site&site_code=cn
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
        .from('product_site_views')
        .select(`*, product:products(*)`)
        .eq('product_id', id)
        .eq('site_code', siteCode)
        .single();

      if (error && error.code === 'PGRST116') {
        return NextResponse.json({ view: 'site', site_code: siteCode, data: null, initialized: false });
      }
      if (error) throw error;
      return NextResponse.json({ view: 'site', site_code: siteCode, data, initialized: true });
    }

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    const { data: siteViews } = await supabase
      .from('product_site_views')
      .select('*')
      .eq('product_id', id);

    return NextResponse.json({ view: 'base', data: { ...data, site_views: siteViews || [] } });
  } catch (error) {
    try { return siteCodeErrorResponse(error); } catch {}
    console.error('Failed to fetch product:', error);
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}

// PATCH /api/v1/admin/products/[id] - update base product
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { data, error } = await supabase
      .from('products')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to update product:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}
