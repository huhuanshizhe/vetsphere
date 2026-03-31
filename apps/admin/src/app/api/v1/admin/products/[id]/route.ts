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
      .select(`
        *,
        images:product_images(id, url, type, sort_order),
        skus:product_skus(id, sku_code, attribute_combination, price, original_price, stock_quantity, weight, weight_unit, suggested_retail_price, selling_price, selling_price_usd, selling_price_jpy, selling_price_thb, image_url, barcode, is_active, sort_order, specs)
      `)
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

    // 过滤掉不应该发送到 products 表的字段
    const excludedFields = ['site_views', 'images', 'skus', 'variants'];
    const updateData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      if (!excludedFields.includes(key)) {
        updateData[key] = value;
      }
    }

    console.log('[Product PATCH] Updating with fields:', Object.keys(updateData));

    const { data, error } = await supabase
      .from('products')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Product PATCH] Update error:', error);
      throw error;
    }

    console.log('[Product PATCH] Success');
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to update product:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

// PUT /api/v1/admin/products/[id] - alias for PATCH
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return PATCH(req, { params });
}

// DELETE /api/v1/admin/products/[id] - soft delete product
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if product exists and is not already deleted
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('id, name, status')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !product) {
      return NextResponse.json({ error: '产品不存在或已删除' }, { status: 404 });
    }

    // Soft delete - set deleted_at, is_deleted, and status
    // The trigger will automatically disable site_views
    const { error: deleteError } = await supabase
      .from('products')
      .update({
        deleted_at: new Date().toISOString(),
        is_deleted: true,
        status: 'offline',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (deleteError) {
      console.error('[Product DELETE] Error:', deleteError);
      throw deleteError;
    }

    console.log(`[Product DELETE] Successfully deleted: ${product.name}`);
    return NextResponse.json({ success: true, message: `产品 "${product.name}" 已删除` });
  } catch (error) {
    console.error('Failed to delete product:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}

// POST /api/v1/admin/products/[id]/approve - approve product
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    
    if (action === 'approve') {
      const { data, error } = await supabase
        .from('products')
        .update({ 
          status: 'approved',
          rejection_reason: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }
    
    if (action === 'reject') {
      const body = await req.json();
      const { reason } = body;
      
      if (!reason) {
        return NextResponse.json({ error: '拒绝原因不能为空' }, { status: 400 });
      }
      
      const { data, error } = await supabase
        .from('products')
        .update({ 
          status: 'rejected',
          rejection_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }
    
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Failed to process product:', error);
    return NextResponse.json({ error: 'Failed to process product' }, { status: 500 });
  }
}
