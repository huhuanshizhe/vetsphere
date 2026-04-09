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

// POST /api/v1/admin/products - Create a new product
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Generate product ID
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    const productId = `prod_${timestamp}_${random}`;

    // Generate slug from name
    const slug = body.name
      ? body.name.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').substring(0, 100)
      : `product-${timestamp}`;

    const productData = {
      id: productId,
      name: body.name || '',
      name_en: body.name_en || body.name || '',
      brand: body.brand || '',
      brand_en: body.brand_en || body.brand || '',
      description: body.description || '',
      description_en: body.description_en || body.description || '',
      rich_description: body.rich_description || '',
      rich_description_en: body.rich_description_en || body.rich_description || '',
      category_id: body.category_id || null,
      slug: slug,
      slug_en: slug,
      status: body.status || 'draft',
      has_price: body.has_price ?? true,
      min_order_quantity: body.min_order_quantity || 1,
      weight: body.weight || 0,
      specifications: body.specifications || {},
      faq: body.faq || null,
      supplier_id: null, // Admin-created products have no supplier
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('products')
      .insert(productData)
      .select()
      .single();

    if (error) {
      console.error('[Product POST] Insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.log('[Product POST] Created product:', data.id);
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Product POST] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create product' },
      { status: 500 }
    );
  }
}
