import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * GET /api/v1/cart
 * 
 * Get current user's shopping cart
 */
export async function GET(req: NextRequest) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const siteCode = req.nextUrl.searchParams.get('site_code') || 'intl';

    // Get cart
    const { data: cart } = await supabase
      .from('shopping_cart')
      .select('*')
      .eq('user_id', user.id)
      .eq('site_code', siteCode)
      .single();

    if (!cart) {
      return NextResponse.json({
        success: true,
        data: {
          id: null,
          items: [],
          total: 0
        }
      });
    }

    // Get cart items with product details
    const { data: items } = await supabase
      .from('shopping_cart_items')
      .select(`
        *,
        product:products (
          id,
          name,
          brand,
          price_min,
          price_max,
          has_price,
          cover_image_url,
          sku
        )
      `)
      .eq('cart_id', cart.id);

    // Calculate total
    const total = (items || []).reduce((sum, item) => {
      const price = item.product?.price_min || 0;
      return sum + (price * item.quantity);
    }, 0);

    return NextResponse.json({
      success: true,
      data: {
        id: cart.id,
        items: items || [],
        total,
        currency: 'USD'
      }
    });

  } catch (error) {
    console.error('Failed to fetch cart:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch cart',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/cart/items
 * 
 * Add item to cart
 */
export async function POST(req: NextRequest) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { product_id, sku_id, quantity } = body;

    if (!product_id || !quantity) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const siteCode = 'intl';

    // Get or create cart
    let { data: cart } = await supabase
      .from('shopping_cart')
      .select('*')
      .eq('user_id', user.id)
      .eq('site_code', siteCode)
      .single();

    if (!cart) {
      const { data: newCart } = await supabase
        .from('shopping_cart')
        .insert({
          user_id: user.id,
          site_code: siteCode
        })
        .select()
        .single();
      
      cart = newCart;
    }

    // Check if item already exists
    const { data: existingItem } = await supabase
      .from('shopping_cart_items')
      .select('*')
      .eq('cart_id', cart.id)
      .eq('product_id', product_id)
      .eq('sku_id', sku_id || null)
      .single();

    if (existingItem) {
      // Update quantity
      const { error } = await supabase
        .from('shopping_cart_items')
        .update({
          quantity: existingItem.quantity + quantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingItem.id);

      if (error) throw error;
    } else {
      // Add new item
      const { error } = await supabase
        .from('shopping_cart_items')
        .insert({
          cart_id: cart.id,
          product_id,
          sku_id: sku_id || null,
          quantity
        });

      if (error) throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Item added to cart'
    });

  } catch (error) {
    console.error('Failed to add item to cart:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to add item to cart',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

/**
 * PUT /api/v1/cart/items/[id]
 * 
 * Update cart item quantity
 */
export async function PUT(req: NextRequest) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { item_id, quantity } = body;

    if (!item_id || quantity === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('shopping_cart_items')
      .update({
        quantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', item_id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Cart updated'
    });

  } catch (error) {
    console.error('Failed to update cart:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update cart',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/cart/items/[id]
 * 
 * Remove item from cart
 */
export async function DELETE(req: NextRequest) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const item_id = searchParams.get('item_id');

    if (!item_id) {
      return NextResponse.json(
        { success: false, error: 'Item ID required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('shopping_cart_items')
      .delete()
      .eq('id', item_id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Item removed from cart'
    });

  } catch (error) {
    console.error('Failed to remove item from cart:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to remove item from cart',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}
