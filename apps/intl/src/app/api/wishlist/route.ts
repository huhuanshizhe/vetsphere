import { NextRequest, NextResponse } from 'next/server';



async function getSupabaseAdmin() {
  const { getSupabaseAdmin } = await import('@vetsphere/shared/lib/supabase-admin');
  return getSupabaseAdmin();
}

export const dynamic = 'force-dynamic';
/**
 * GET /api/wishlist - 获取用户收藏列表
 */
export async function GET(request: NextRequest) {
  const supabaseAdmin = await getSupabaseAdmin();
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

    // Get wishlist items
    const { data: wishlistBasic, error: basicError } = await supabaseAdmin
      .from('wishlist')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (basicError) {
      console.error('[Wishlist] Basic query error:', basicError);
      return NextResponse.json({ error: 'Failed to fetch wishlist', details: basicError.message }, { status: 500 });
    }

    console.log('[Wishlist] Found', wishlistBasic?.length || 0, 'items for user', user.id);

    // If no items, return empty
    if (!wishlistBasic || wishlistBasic.length === 0) {
      return NextResponse.json({ wishlist: [] });
    }

    // Get product IDs
    const productIds = wishlistBasic.map(item => item.product_id);

    // Query products table directly (intl_products doesn't exist)
    // Include multilingual fields for international site
    let products: any[] = [];
    const { data: productsData, error: productsError } = await supabaseAdmin
      .from('products')
      .select(`
        id,
        name,
        name_en,
        name_ja,
        name_th,
        brand,
        brand_en,
        brand_ja,
        brand_th,
        image_url,
        cover_image_url,
        slug,
        slug_en,
        slug_ja,
        slug_th,
        description,
        description_en,
        description_ja,
        description_th,
        price,
        price_min,
        price_max,
        price_range_min,
        price_range_max,
        total_stock,
        stock_status,
        stock_quantity,
        currency,
        has_price,
        pricing_mode,
        has_variants
      `)
      .in('id', productIds);

    if (productsError) {
      console.log('[Wishlist] Products query error:', productsError?.message);
    }

    // Get SKU data for products with variants
    const { data: skuData } = await supabaseAdmin
      .from('product_skus')
      .select('product_id, sku_code, price, selling_price_usd, selling_price_jpy, selling_price_thb, stock_quantity, is_active')
      .in('product_id', productIds)
      .eq('is_active', true);

    // Aggregate SKU prices by product
    const skuPriceMap = new Map<string, { 
      minUsd: number; 
      maxUsd: number;
      minJpy: number;
      maxJpy: number;
      minThb: number;
      maxThb: number;
      totalStock: number;
    }>();

    if (skuData) {
      skuData.forEach(sku => {
        const existing = skuPriceMap.get(sku.product_id) || {
          minUsd: Infinity, maxUsd: 0,
          minJpy: Infinity, maxJpy: 0,
          minThb: Infinity, maxThb: 0,
          totalStock: 0
        };

        // USD prices
        const usdPrice = sku.selling_price_usd ?? sku.price;
        if (usdPrice && usdPrice > 0) {
          existing.minUsd = Math.min(existing.minUsd, usdPrice);
          existing.maxUsd = Math.max(existing.maxUsd, usdPrice);
        }

        // JPY prices
        if (sku.selling_price_jpy && sku.selling_price_jpy > 0) {
          existing.minJpy = Math.min(existing.minJpy, sku.selling_price_jpy);
          existing.maxJpy = Math.max(existing.maxJpy, sku.selling_price_jpy);
        }

        // THB prices
        if (sku.selling_price_thb && sku.selling_price_thb > 0) {
          existing.minThb = Math.min(existing.minThb, sku.selling_price_thb);
          existing.maxThb = Math.max(existing.maxThb, sku.selling_price_thb);
        }

        // Stock
        existing.totalStock += sku.stock_quantity || 0;

        skuPriceMap.set(sku.product_id, existing);
      });
    }

    if (productsData) {
      products = productsData.map(p => {
        const skuPrices = skuPriceMap.get(p.id);
        
        // Determine price range - prefer SKU aggregated prices
        let finalPriceMin: number | null = null;
        let finalPriceMax: number | null = null;
        let skuPriceUsdMin: number | null = null;
        let skuPriceUsdMax: number | null = null;
        let skuPriceJpyMin: number | null = null;
        let skuPriceJpyMax: number | null = null;
        let skuPriceThbMin: number | null = null;
        let skuPriceThbMax: number | null = null;

        if (skuPrices && skuPrices.minUsd !== Infinity) {
          skuPriceUsdMin = skuPrices.minUsd;
          skuPriceUsdMax = skuPrices.maxUsd;
          skuPriceJpyMin = skuPrices.minJpy === Infinity ? null : skuPrices.minJpy;
          skuPriceJpyMax = skuPrices.maxJpy === 0 ? null : skuPrices.maxJpy;
          skuPriceThbMin = skuPrices.minThb === Infinity ? null : skuPrices.minThb;
          skuPriceThbMax = skuPrices.maxThb === 0 ? null : skuPrices.maxThb;
          
          finalPriceMin = skuPriceUsdMin;
          finalPriceMax = skuPriceUsdMax;
        } else if (p.price_range_min && p.price_range_max) {
          // Use pre-calculated price range from products table
          finalPriceMin = p.price_range_min;
          finalPriceMax = p.price_range_max;
        } else if (p.price_min && p.price_max) {
          // Use price_min/price_max
          finalPriceMin = p.price_min;
          finalPriceMax = p.price_max;
        } else {
          // Fallback to single price
          finalPriceMin = p.price;
          finalPriceMax = p.price;
        }

        return {
          id: p.id,
          product_id: p.id,
          // Use localized name if available
          display_name: p.name_en || p.name,
          name: p.name,
          name_en: p.name_en,
          name_ja: p.name_ja,
          name_th: p.name_th,
          // Use localized brand if available
          brand: p.brand_en || p.brand,
          brand_en: p.brand_en,
          brand_ja: p.brand_ja,
          brand_th: p.brand_th,
          // Use cover_image_url or fallback to image_url
          cover_image_url: p.cover_image_url || p.image_url,
          image_url: p.image_url,
          // Use localized slug if available
          slug: p.slug_en || p.slug,
          slug_en: p.slug_en,
          slug_ja: p.slug_ja,
          slug_th: p.slug_th,
          // Description
          summary: p.description_en || p.description,
          description: p.description,
          description_en: p.description_en,
          description_ja: p.description_ja,
          description_th: p.description_th,
          // Price fields - use SKU aggregated prices when available
          display_price: finalPriceMin,
          price: p.price,
          price_min: finalPriceMin,
          price_max: finalPriceMax,
          // SKU aggregated prices for multi-currency
          sku_price_usd_min: skuPriceUsdMin,
          sku_price_usd_max: skuPriceUsdMax,
          sku_price_jpy_min: skuPriceJpyMin,
          sku_price_jpy_max: skuPriceJpyMax,
          sku_price_thb_min: skuPriceThbMin,
          sku_price_thb_max: skuPriceThbMax,
          // Stock - use SKU total or product stock
          stock_status: p.stock_status,
          stock_quantity: skuPrices?.totalStock ?? p.total_stock ?? p.stock_quantity ?? 0,
          // Currency and pricing mode
          currency: p.currency,
          has_price: p.has_price,
          pricing_mode: p.pricing_mode,
          has_variants: p.has_variants,
        };
      });
      console.log('[Wishlist] Found', products.length, 'products from products table with SKU prices');
    }

    // Merge product data into wishlist items
    const productMap = new Map(products.map(p => [p.id, p]));
    const wishlistWithProducts = wishlistBasic.map(item => ({
      ...item,
      product: productMap.get(item.product_id) || null
    }));

    return NextResponse.json({ wishlist: wishlistWithProducts });
  } catch (error: any) {
    console.error('[Wishlist] API error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

/**
 * POST /api/wishlist - 添加到收藏夹
 */
export async function POST(request: NextRequest) {
  const supabaseAdmin = await getSupabaseAdmin();
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      console.error('[Wishlist] Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { productId, productType } = body;

    console.log('[Wishlist] POST request:', { productId, productType, userId: user.id });

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    // Check if product exists in products table
    let product: any = null;

    // Query products table directly with multilingual fields
    const { data: productData, error: productError } = await supabaseAdmin
      .from('products')
      .select(`
        id,
        name,
        name_en,
        name_ja,
        name_th,
        brand,
        brand_en,
        brand_ja,
        brand_th,
        image_url,
        cover_image_url,
        slug,
        slug_en,
        slug_ja,
        slug_th,
        description,
        description_en,
        description_ja,
        description_th,
        price,
        price_min,
        price_max,
        stock_status,
        stock_quantity,
        currency,
        has_price,
        pricing_mode
      `)
      .eq('id', productId)
      .maybeSingle();

    if (productError) {
      console.log('[Wishlist] Product lookup error:', productError?.message);
    }

    if (productData) {
      product = {
        id: productData.id,
        product_id: productData.id,
        // Use localized name if available
        display_name: productData.name_en || productData.name,
        name: productData.name,
        name_en: productData.name_en,
        name_ja: productData.name_ja,
        name_th: productData.name_th,
        // Use localized brand if available
        brand: productData.brand_en || productData.brand,
        brand_en: productData.brand_en,
        brand_ja: productData.brand_ja,
        brand_th: productData.brand_th,
        // Use cover_image_url or fallback to image_url
        cover_image_url: productData.cover_image_url || productData.image_url,
        image_url: productData.image_url,
        // Use localized slug if available
        slug: productData.slug_en || productData.slug,
        slug_en: productData.slug_en,
        slug_ja: productData.slug_ja,
        slug_th: productData.slug_th,
        // Description
        summary: productData.description_en || productData.description,
        description: productData.description,
        description_en: productData.description_en,
        description_ja: productData.description_ja,
        description_th: productData.description_th,
        // Price fields
        display_price: productData.price,
        price: productData.price,
        price_min: productData.price_min,
        price_max: productData.price_max,
        // Stock
        stock_status: productData.stock_status,
        stock_quantity: productData.stock_quantity,
        // Currency and pricing mode
        currency: productData.currency,
        has_price: productData.has_price,
        pricing_mode: productData.pricing_mode,
      };
      console.log('[Wishlist] Found product in products table:', product?.name);
    }

    console.log('[Wishlist] Product lookup result:', { productFound: !!product, productName: product?.name, price: product?.display_price });

    // Even if product not found in products table, still allow adding to wishlist
    // The product might be from intl_products or other source

    // Check if already in wishlist
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('wishlist')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_id', productId)
      .maybeSingle();

    if (checkError) {
      console.error('[Wishlist] Check existing error:', checkError);
    } else if (existing) {
      console.log('[Wishlist] Product already in wishlist');
      return NextResponse.json({ error: 'Product already in wishlist', alreadyExists: true }, { status: 400 });
    }

    // Add to wishlist
    const { data: wishlistItem, error: insertError } = await supabaseAdmin
      .from('wishlist')
      .insert({
        user_id: user.id,
        product_id: productId,
        product_type: productType || 'product',
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Wishlist] Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to add to wishlist: ' + insertError.message }, { status: 500 });
    }

    console.log('[Wishlist] Successfully added:', wishlistItem);

    return NextResponse.json({
      success: true,
      wishlist: {
        ...wishlistItem,
        product: product || { 
          id: productId, 
          name: 'Unknown Product',
          display_name: 'Unknown Product',
          brand: '',
          summary: '',
          cover_image_url: null,
          image_url: null,
        },
      },
    });
  } catch (error: any) {
    console.error('[Wishlist] API error:', error);
    return NextResponse.json({ error: 'Internal server error: ' + error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/wishlist - 从收藏夹移除
 */
export async function DELETE(request: NextRequest) {
  const supabaseAdmin = await getSupabaseAdmin();
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
