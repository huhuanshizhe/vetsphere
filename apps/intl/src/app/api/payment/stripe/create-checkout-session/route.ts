import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Verify user authentication from Bearer token (optional for guest checkout)
async function verifyAuth(request: NextRequest): Promise<{ userId: string } | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  return { userId: user.id };
}

export async function POST(request: NextRequest) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey || secretKey.includes('placeholder')) {
      return NextResponse.json(
        { error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY.' },
        { status: 503 }
      );
    }

    const stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16' as any,
    });

    const body = await request.json();
    const { items, orderId, amount, currency, returnUrl } = body;

    // Verify order exists (optional user authentication for guest checkout)
    const auth = await verifyAuth(request);
    if (orderId) {
      const { data: order } = await supabaseAdmin
        .from('orders')
        .select('id, user_id, status, total')
        .eq('id', orderId)
        .single();

      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      // 如果订单属于用户，验证身份
      if (order.user_id && auth && order.user_id !== auth.userId) {
        return NextResponse.json({ error: 'Order does not belong to authenticated user' }, { status: 403 });
      }
      if (order.status === 'paid' || order.status === 'completed') {
        return NextResponse.json({ error: 'Order already paid' }, { status: 400 });
      }
    }

    // 支持两种方式：传入items或amount
    let lineItems;
    if (items && Array.isArray(items)) {
      lineItems = items.map((item: any) => ({
        price_data: {
          currency: currency || 'usd',
          product_data: {
            name: item.name,
            images: item.imageUrl ? [item.imageUrl] : [],
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      }));
    } else if (amount) {
      // 使用订单金额创建单个line item
      lineItems = [{
        price_data: {
          currency: currency || 'usd',
          product_data: {
            name: 'VetSphere Order',
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      }];
    } else {
      return NextResponse.json({ error: 'Either items or amount is required' }, { status: 400 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const successUrl = returnUrl || `${siteUrl}/checkout/success`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${successUrl}?success=true&orderId=${orderId || ''}`,
      cancel_url: `${siteUrl}/checkout?canceled=true`,
      client_reference_id: orderId,
      metadata: { orderId: orderId || '', userId: auth?.userId || '' },
    });

    // 记录支付请求
    if (orderId) {
      await supabaseAdmin.from('payment_records').insert({
        order_id: orderId,
        payment_method: 'stripe',
        status: 'pending',
        amount: amount || items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0),
        currency: currency || 'USD',
        transaction_id: session.id,
        metadata: { stripe_session_id: session.id },
      });
    }

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error: any) {
    console.error('Stripe Checkout Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
