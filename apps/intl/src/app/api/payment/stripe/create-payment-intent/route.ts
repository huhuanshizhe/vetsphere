import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { rateLimiters } from '@vetsphere/shared/lib/rate-limit';

export const dynamic = 'force-dynamic';

// CORS headers - restrict to known origins
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_SITE_URL || 'https://vetsphere.net',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

async function getStripe(secretKey: string) {
  const Stripe = (await import('stripe')).default;
  return new Stripe(secretKey, { apiVersion: '2023-10-16' as any });
}

async function getSupabaseAdmin() {
  const { getSupabaseAdmin } = await import('@vetsphere/shared/lib/supabase-admin');
  return getSupabaseAdmin();
}

/**
 * POST /api/payment/stripe/create-payment-intent
 * 创建 PaymentIntent，返回 clientSecret 用于嵌入式支付
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = rateLimiters.payment(request);
    if (rateLimitResult) return rateLimitResult;

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey || secretKey.includes('placeholder')) {
      return NextResponse.json(
        { error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY.' },
        { 
          status: 503,
          headers: corsHeaders
        }
      );
    }

    const stripe = await getStripe(secretKey);
    const supabaseAdmin = await getSupabaseAdmin();

    const body = await request.json();
    const { orderId, amount, currency = 'usd' } = body;

    // 验证订单存在
    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { 
        status: 400,
        headers: corsHeaders
      });
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, status, total_amount')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { 
        status: 404,
        headers: corsHeaders
      });
    }

    if (order.status === 'paid' || order.status === 'completed') {
      return NextResponse.json({ error: 'Order already paid' }, { 
        status: 400,
        headers: corsHeaders
      });
    }

    // Validate amount matches database
    if (Math.abs(Number(order.total_amount) - Number(amount)) > 0.01) {
      return NextResponse.json({ error: 'Amount does not match order total' }, {
        status: 400,
        headers: corsHeaders
      });
    }

    // 创建 PaymentIntent — use DB amount, not frontend
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(Number(order.total_amount) * 100), // 转换为分
      currency: currency.toLowerCase(),
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        orderId: orderId || '',
      },
    });

    // 记录支付请求
    if (orderId) {
      await supabaseAdmin.from('payment_records').insert({
        order_id: orderId,
        payment_method: 'stripe',
        status: 'pending',
        amount: amount,
        currency: currency.toUpperCase(),
        transaction_id: paymentIntent.id,
        metadata: { stripe_payment_intent_id: paymentIntent.id },
      });
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    }, {
      headers: corsHeaders
    });
  } catch (error: any) {
    console.error('Stripe PaymentIntent Error:', error);
    return NextResponse.json({ error: error.message }, { 
      status: 500,
      headers: corsHeaders
    });
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { 
    status: 204,
    headers: corsHeaders
  });
}
