import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parseViewMode, requireSiteCode, siteCodeErrorResponse } from '@/lib/site-resolver';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/v1/admin/products?view=base|site&site_code=cn|intl
export async function GET(req: NextRequest) {
  try {
    const view = parseViewMode(req);

    if (view === 'site') {
      const siteCode = requireSiteCode(req);
      const { data, error } = await supabase
        .from('product_site_views')
        .select(`
          *,
          product:products(id, name, slug, status, product_type, brand, cover_image_url, price_min, price_max)
        `)
        .eq('site_code', siteCode)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return NextResponse.json({ view: 'site', site_code: siteCode, data: data || [] });
    }

    // Base view
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .is('deleted_at', null)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    const productIds = (data || []).map(p => p.id);
    let siteViews: Record<string, any[]> = {};

    if (productIds.length > 0) {
      const { data: views } = await supabase
        .from('product_site_views')
        .select('product_id, site_code, publish_status, is_enabled')
        .in('product_id', productIds);

      (views || []).forEach(v => {
        if (!siteViews[v.product_id]) siteViews[v.product_id] = [];
        siteViews[v.product_id].push(v);
      });
    }

    const enriched = (data || []).map(p => ({
      ...p,
      site_views: siteViews[p.id] || [],
    }));

    return NextResponse.json({ view: 'base', data: enriched });
  } catch (error) {
    try { return siteCodeErrorResponse(error); } catch {}
    console.error('Failed to fetch products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
