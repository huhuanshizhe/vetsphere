import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * POST /api/v1/orders
 * 
 * Create order from cart
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
    const { 
      shipping_address, 
      billing_address, 
      notes,
      payment_method 
    } = body;

    if (!shipping_address) {
      return NextResponse.json(
        { success: false, error: 'Shipping address required' },
        { status: 400 }
      );
    }

    // Get cart
    const { data: cart } = await supabase
      .from('shopping_cart')
      .select('*')
      .eq('user_id', user.id)
      .eq('site_code', 'intl')
      .single();

    if (!cart) {
      return NextResponse.json(
        { success: false, error: 'Cart not found' },
        { status: 404 }
      );
    }

    // Get cart items
    const { data: cartItems } = await supabase
      .from('shopping_cart_items')
      .select(`
        *,
        product:products (
          id,
          supplier_id,
          price_min,
          has_price
        )
      `)
      .eq('cart_id', cart.id);

    if (!cartItems || cartItems.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Cart is empty' },
        { status: 400 }
      );
    }

    // Calculate total and group by supplier
    let totalAmount = 0;
    const supplierOrders: Record<string, any[]> = {};

    for (const item of cartItems) {
      const price = item.product?.price_min || 0;
      const itemTotal = price * item.quantity;
      totalAmount += itemTotal;

      const supplierId = item.product?.supplier_id || 'unknown';
      if (!supplierOrders[supplierId]) {
        supplierOrders[supplierId] = [];
      }
      supplierOrders[supplierId].push({
        ...item,
        item_total: itemTotal
      });
    }

    // Create orders (one per supplier)
    const createdOrders = [];

    for (const [supplierId, items] of Object.entries(supplierOrders)) {
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      
      const orderData = {
        id: crypto.randomUUID(),
        order_number: orderNumber,
        user_id: user.id,
        supplier_id: supplierId === 'unknown' ? null : supplierId,
        status: 'pending_payment',
        total_amount: items.reduce((sum, item) => sum + item.item_total, 0),
        currency: 'USD',
        items_count: items.reduce((sum, item) => sum + item.quantity, 0),
        shipping_address: JSON.stringify(shipping_address),
        billing_address: billing_address ? JSON.stringify(billing_address) : null,
        notes: notes || null,
        payment_method: payment_method || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = items.map(item => ({
        id: crypto.randomUUID(),
        order_id: order.id,
        product_id: item.product_id,
        sku_id: item.sku_id,
        quantity: item.quantity,
        unit_price: item.product?.price_min || 0,
        total_price: item.item_total,
        created_at: new Date().toISOString()
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      createdOrders.push(order);
    }

    // Clear cart
    await supabase
      .from('shopping_cart_items')
      .delete()
      .eq('cart_id', cart.id);

    return NextResponse.json({
      success: true,
      data: {
        orders: createdOrders,
        total: totalAmount
      },
      message: 'Order created successfully'
    });

  } catch (error) {
    console.error('Failed to create order:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create order',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}
