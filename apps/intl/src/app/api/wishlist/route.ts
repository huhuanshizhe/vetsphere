import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * GET /api/wishlist - 获取用户收藏列表
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: wishlist, error } = await supabaseAdmin
      .from('wishlist')
      .select(`
        *,
        product:products(id, name, brand, image_url, display_price, selling_price_usd, selling_price_jpy, selling_price_thb, slug)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch wishlist:', error);
      return NextResponse.json({ error: 'Failed to fetch wishlist' }, { status: 500 });
    }

    return NextResponse.json({ wishlist });
  } catch (error) {
    console.error('Wishlist API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/wishlist - 添加到收藏夹
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { productId, productType } = body;

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    // Check if product exists
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('id, name')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Check if already in wishlist
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('wishlist')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_id', productId)
      .maybeSingle();

    if (checkError) {
      console.error('Failed to check wishlist:', checkError);
    } else if (existing) {
      return NextResponse.json({ error: 'Product already in wishlist' }, { status: 400 });
    }

    // Add to wishlist
    const { data: wishlist, error: insertError } = await supabaseAdmin
      .from('wishlist')
      .insert({
        user_id: user.id,
        product_id: productId,
        product_type: productType || 'product',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to add to wishlist:', insertError);
      return NextResponse.json({ error: 'Failed to add to wishlist' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      wishlist: {
        ...wishlist,
        product,
      },
    });
  } catch (error) {
    console.error('Wishlist API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/wishlist - 从收藏夹移除
 */
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { productId } = body;

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('wishlist')
      .delete()
      .eq('user_id', user.id)
      .eq('product_id', productId);

    if (error) {
      console.error('Failed to remove from wishlist:', error);
      return NextResponse.json({ error: 'Failed to remove from wishlist' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Removed from wishlist' });
  } catch (error) {
    console.error('Wishlist API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
