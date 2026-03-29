import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Lazy-loaded dependencies - nothing is initialized at module load time
let _stripe: Stripe | null = null;
let _getSupabaseAdmin: (() => any) | null = null;

async function getStripe() {
  if (!_stripe) {
    const Stripe = (await import('stripe')).default;
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2023-10-16' as any,
    });
  }
  return _stripe;
}

async function getSupabaseAdmin() {
  if (!_getSupabaseAdmin) {
    const module = await import('@vetsphere/shared/lib/supabase-admin');
    _getSupabaseAdmin = module.getSupabaseAdmin;
  }
  return _getSupabaseAdmin();
}

// Verify user authentication from Bearer token
async function verifyAuth(request: NextRequest): Promise<{ userId: string } | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  const supabaseAdmin = await getSupabaseAdmin();
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  return { userId: user.id };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const stripe = await getStripe();
    const supabaseAdmin = await getSupabaseAdmin();

    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_placeholder') {
      return NextResponse.json(
        { error: 'Stripe not configured. Please add real STRIPE_SECRET_KEY to .env.local' },
        { status: 503 }
      );
    }

    // Verify user authentication
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { orderId, amount, currency } = await request.json();

    // Validate required fields
    if (!orderId || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId and amount' },
        { status: 400 }
      );
    }

    // Verify order exists, amount matches, and belongs to the authenticated user
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, total_amount, status, user_id')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Verify order ownership
    if (order.user_id && order.user_id !== auth.userId) {
      return NextResponse.json(
        { error: 'Order does not belong to authenticated user' },
        { status: 403 }
      );
    }

    // Verify amount matches order total (allow small floating point differences)
    const orderAmount = order.total_amount;
    if (Math.abs(orderAmount - amount) > 0.01) {
      return NextResponse.json(
        { error: 'Amount mismatch. Expected: ' + orderAmount + ', Received: ' + amount },
        { status: 400 }
      );
    }

    // Check order hasn't already been paid
    if (order.status === 'Paid' || order.status === 'Completed') {
      return NextResponse.json(
        { error: 'Order already paid' },
        { status: 400 }
      );
    }

    // Create Stripe PaymentIntent
    const amountInCents = Math.round(amount * 100);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: currency ? currency.toLowerCase() : 'usd',
      metadata: {
        orderId,
        userId: auth.userId,
        source: 'vetsphere'
      },
      automatic_payment_methods: { enabled: true },
    });

    return NextResponse.json({
      status: 'success',
      clientSecret: paymentIntent.client_secret,
      id: paymentIntent.id,
    });
  } catch (error: unknown) {
    console.error('Stripe PaymentIntent Error:', error);
    const message = error instanceof Error ? error.message : 'Payment initialization failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}