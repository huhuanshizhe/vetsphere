import { NextRequest, NextResponse } from 'next/server';




async function getSupabaseAdmin() {
  const { getSupabaseAdmin } = await import('@vetsphere/shared/lib/supabase-admin');
  return getSupabaseAdmin();
}

export const dynamic = 'force-dynamic';
/**
 * 获取PayPal Access Token
 */
async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const isProduction = process.env.PAYPAL_MODE === 'live';

  console.log('[PayPal] Client ID:', clientId ? clientId.substring(0, 10) + '...' : 'NOT SET');
  console.log('[PayPal] Client Secret:', clientSecret ? 'SET' : 'NOT SET');
  console.log('[PayPal] Mode:', isProduction ? 'production' : 'sandbox');

  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials not configured');
  }

  const baseUrl = isProduction
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

  console.log('[PayPal] Base URL:', baseUrl);

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get PayPal access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * POST /api/payment/paypal/create-order
 * 创建PayPal订单
 */
export async function POST(request: NextRequest) {
  const supabaseAdmin = await getSupabaseAdmin();
  try {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

    if (!clientId || !clientSecret || clientId.includes('placeholder')) {
      return NextResponse.json(
        { error: 'PayPal is not configured. Please set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.' },
        { status: 503 }
      );
    }

    const isProduction = process.env.PAYPAL_MODE === 'live';
    const baseUrl = isProduction
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';

    const body = await request.json();
    const { orderId, amount, currency = 'USD', items } = body;

    // 验证订单存在
    if (orderId) {
      const { data: order, error } = await supabaseAdmin
        .from('orders')
        .select('id, status, total_amount')
        .eq('id', orderId)
        .single();

      if (error || !order) {
        return NextResponse.json({ error: 'Order not found', details: error?.message }, { status: 404 });
      }

      if (order.status !== 'pending') {
        return NextResponse.json({ error: 'Order is not in pending status' }, { status: 400 });
      }
    }

    // 获取Access Token
    const accessToken = await getPayPalAccessToken();

    // 创建PayPal订单
    const paypalOrder = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: orderId || `order_${Date.now()}`,
          description: 'VetSphere Order',
          amount: {
            currency_code: currency.toUpperCase(),
            value: amount.toFixed(2),
          },
        },
      ],
      application_context: {
        brand_name: 'VetSphere',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
        return_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/checkout/success`,
        cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/checkout/cancel`,
      },
    };

    const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(paypalOrder),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('PayPal create order error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to create PayPal order' },
        { status: 500 }
      );
    }

    const data = await response.json();

    // 找到approval URL
    const approvalLink = data.links?.find((link: any) => link.rel === 'approve');
    const approvalUrl = approvalLink?.href;

    // 记录支付请求
    await supabaseAdmin.from('payment_records').insert({
      order_id: orderId,
      payment_method: 'paypal',
      status: 'pending',
      amount: amount,
      currency: currency,
      transaction_id: data.id,
      metadata: { paypal_order_id: data.id },
    });

    // 更新订单的PayPal订单ID
    if (orderId) {
      await supabaseAdmin
        .from('orders')
        .update({ metadata: { paypal_order_id: data.id } })
        .eq('id', orderId);
    }

    return NextResponse.json({
      paypalOrderId: data.id,
      approvalUrl,
      status: data.status,
    });
  } catch (error: any) {
    console.error('PayPal create order error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create PayPal order' },
      { status: 500 }
    );
  }
}