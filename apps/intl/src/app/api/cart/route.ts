import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * GET /api/cart - Get user's shopping cart
 * Requires authentication
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get site code from header or default to 'intl'
    const siteCode = request.headers.get('x-site-code') || 'intl';

    // Get or create cart
    const { data: cart, error: cartError } = await supabaseAdmin
      .from('shopping_cart')
      .select(`
        id,
        created_at,
        updated_at,
        shopping_cart_items (
          id,
          product_id,
          sku_id,
          quantity,
          created_at,
          updated_at,
          products (
            id,
            name,
            slug,
            price_usd,
            images
          ),
          product_skus (
            id,
            sku_code,
            price_usd,
            stock_quantity,
            images
          )
        )
      `)
      .eq('user_id', user.id)
      .eq('site_code', siteCode)
      .single();

    if (cartError && cartError.code !== 'PGRST116') {
      console.error('Error fetching cart:', cartError);
      return NextResponse.json({ error: 'Failed to fetch cart' }, { status: 500 });
    }

    // Return empty cart if none exists
    if (!cart) {
      return NextResponse.json({
        cart: {
          id: null,
          items: [],
          itemCount: 0,
        },
      });
    }

    // Format response
    const items = cart.shopping_cart_items?.map((item: any) => ({
      id: item.id,
      productId: item.product_id,
      skuId: item.sku_id,
      quantity: item.quantity,
      product: item.products ? {
        id: item.products.id,
        name: item.products.name,
        slug: item.products.slug,
        price: item.products.price_usd,
        image: item.products.images?.[0] || null,
      } : null,
      sku: item.product_skus ? {
        id: item.product_skus.id,
        code: item.product_skus.sku_code,
        price: item.product_skus.price_usd,
        stock: item.product_skus.stock_quantity,
        image: item.product_skus.images?.[0] || null,
      } : null,
    })) || [];

    return NextResponse.json({
      cart: {
        id: cart.id,
        items,
        itemCount: items.length,
        createdAt: cart.created_at,
        updatedAt: cart.updated_at,
      },
    });

  } catch (error) {
    console.error('Cart API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/cart - Add item to cart
 * Body: { productId, skuId?, quantity }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { productId, skuId, quantity = 1 } = body;

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    if (quantity < 1) {
      return NextResponse.json({ error: 'Quantity must be at least 1' }, { status: 400 });
    }

    const siteCode = request.headers.get('x-site-code') || 'intl';

    // Get or create cart
    let { data: cart, error: cartError } = await supabaseAdmin
      .from('shopping_cart')
      .select('id')
      .eq('user_id', user.id)
      .eq('site_code', siteCode)
      .single();

    if (cartError && cartError.code === 'PGRST116') {
      // Cart doesn't exist, create it
      const { data: newCart, error: createError } = await supabaseAdmin
        .from('shopping_cart')
        .insert({
          user_id: user.id,
          site_code: siteCode,
        })
        .select('id')
        .single();

      if (createError) {
        console.error('Error creating cart:', createError);
        return NextResponse.json({ error: 'Failed to create cart' }, { status: 500 });
      }
      cart = newCart;
    } else if (cartError) {
      console.error('Error fetching cart:', cartError);
      return NextResponse.json({ error: 'Failed to fetch cart' }, { status: 500 });
    }

    // Ensure cart exists
    if (!cart) {
      return NextResponse.json({ error: 'Failed to create or retrieve cart' }, { status: 500 });
    }

    // Check if item already exists in cart
    let query = supabaseAdmin
      .from('shopping_cart_items')
      .select('id, quantity')
      .eq('cart_id', cart.id)
      .eq('product_id', productId);

    if (skuId) {
      query = query.eq('sku_id', skuId);
    } else {
      query = query.is('sku_id', null);
    }

    const { data: existingItem, error: itemError } = await query.single();

    if (existingItem) {
      // Update quantity
      const { error: updateError } = await supabaseAdmin
        .from('shopping_cart_items')
        .update({
          quantity: existingItem.quantity + quantity,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingItem.id);

      if (updateError) {
        console.error('Error updating cart item:', updateError);
        return NextResponse.json({ error: 'Failed to update cart item' }, { status: 500 });
      }
    } else {
      // Add new item
      const { error: insertError } = await supabaseAdmin
        .from('shopping_cart_items')
        .insert({
          cart_id: cart.id,
          product_id: productId,
          sku_id: skuId || null,
          quantity,
        });

      if (insertError) {
        console.error('Error adding cart item:', insertError);
        return NextResponse.json({ error: 'Failed to add item to cart' }, { status: 500 });
      }
    }

    // Update cart timestamp
    await supabaseAdmin
      .from('shopping_cart')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', cart.id);

    return NextResponse.json({ success: true, message: 'Item added to cart' });

  } catch (error) {
    console.error('Cart API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/cart - Update cart item quantity
 * Body: { itemId, quantity }
 */
export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { itemId, quantity } = body;

    if (!itemId) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    if (quantity < 1) {
      // If quantity is 0 or less, delete the item
      const { error: deleteError } = await supabaseAdmin
        .from('shopping_cart_items')
        .delete()
        .eq('id', itemId);

      if (deleteError) {
        console.error('Error deleting cart item:', deleteError);
        return NextResponse.json({ error: 'Failed to remove item' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Item removed from cart' });
    }

    // Update quantity
    const { error: updateError } = await supabaseAdmin
      .from('shopping_cart_items')
      .update({
        quantity,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId);

    if (updateError) {
      console.error('Error updating cart item:', updateError);
      return NextResponse.json({ error: 'Failed to update cart item' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Cart updated' });

  } catch (error) {
    console.error('Cart API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/cart - Clear cart or remove item
 * Query params: ?itemId=xxx (optional, clears entire cart if not provided)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');
    const siteCode = request.headers.get('x-site-code') || 'intl';

    if (itemId) {
      // Remove specific item
      const { error: deleteError } = await supabaseAdmin
        .from('shopping_cart_items')
        .delete()
        .eq('id', itemId);

      if (deleteError) {
        console.error('Error removing cart item:', deleteError);
        return NextResponse.json({ error: 'Failed to remove item' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Item removed from cart' });
    }

    // Clear entire cart
    const { data: cart, error: cartError } = await supabaseAdmin
      .from('shopping_cart')
      .select('id')
      .eq('user_id', user.id)
      .eq('site_code', siteCode)
      .single();

    if (cartError || !cart) {
      return NextResponse.json({ success: true, message: 'Cart is already empty' });
    }

    // Delete all items
    const { error: deleteError } = await supabaseAdmin
      .from('shopping_cart_items')
      .delete()
      .eq('cart_id', cart.id);

    if (deleteError) {
      console.error('Error clearing cart:', deleteError);
      return NextResponse.json({ error: 'Failed to clear cart' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Cart cleared' });

  } catch (error) {
    console.error('Cart API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}