import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Verify user authentication from Bearer token
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

    // Verify user authentication
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16' as any,
    });

    const { items, orderId, returnUrl } = await request.json();

    // Verify order exists and belongs to the authenticated user
    if (orderId) {
      const { data: order } = await supabaseAdmin
        .from('orders')
        .select('id, user_id, status')
        .eq('id', orderId)
        .single();

      if (order?.user_id && order.user_id !== auth.userId) {
        return NextResponse.json({ error: 'Order does not belong to authenticated user' }, { status: 403 });
      }
      if (order?.status === 'Paid' || order?.status === 'Completed') {
        return NextResponse.json({ error: 'Order already paid' }, { status: 400 });
      }
    }

    const lineItems = items.map((item: any) => ({
      price_data: {
        currency: 'cny',
        product_data: {
          name: item.name,
          images: item.imageUrl ? [item.imageUrl] : [],
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'alipay'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${returnUrl}?success=true&orderId=${orderId}`,
      cancel_url: `${returnUrl}?canceled=true`,
      client_reference_id: orderId,
      metadata: { userId: auth.userId },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe Checkout Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
