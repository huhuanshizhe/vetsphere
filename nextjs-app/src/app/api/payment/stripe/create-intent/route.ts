import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as any,
});

// Server-side Supabase client with service role for validation
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_placeholder') {
      return NextResponse.json(
        { error: 'Stripe not configured. Please add real STRIPE_SECRET_KEY to .env.local' },
        { status: 503 }
      );
    }

    const { orderId, amount, currency } = await request.json();

    // Validate required fields
    if (!orderId || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId and amount' },
        { status: 400 }
      );
    }

    // Verify order exists and amount matches
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, total_amount, status')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
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
      currency: currency ? currency.toLowerCase() : 'cny',
      metadata: { 
        orderId,
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
