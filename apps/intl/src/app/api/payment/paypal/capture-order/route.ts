import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * 获取PayPal Access Token
 */
async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const isProduction = process.env.PAYPAL_MODE === 'live';

  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials not configured');
  }

  const baseUrl = isProduction
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

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
 * POST /api/payment/paypal/capture-order
 * 捕获PayPal支付
 */
export async function POST(request: NextRequest) {
  try {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

    if (!clientId || !clientSecret || clientId.includes('placeholder')) {
      return NextResponse.json(
        { error: 'PayPal is not configured' },
        { status: 503 }
      );
    }

    const isProduction = process.env.PAYPAL_MODE === 'live';
    const baseUrl = isProduction
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';

    const body = await request.json();
    const { paypalOrderId, orderId } = body;

    if (!paypalOrderId) {
      return NextResponse.json({ error: 'PayPal order ID is required' }, { status: 400 });
    }

    // 获取Access Token
    const accessToken = await getPayPalAccessToken();

    // 捕获支付
    const response = await fetch(`${baseUrl}/v2/checkout/orders/${paypalOrderId}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('PayPal capture error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to capture PayPal payment' },
        { status: 500 }
      );
    }

    const data = await response.json();

    // 检查支付状态
    if (data.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: `Payment not completed. Status: ${data.status}` },
        { status: 400 }
      );
    }

    // 获取交易信息
    const purchaseUnit = data.purchase_units?.[0];
    const capture = purchaseUnit?.payments?.captures?.[0];
    const transactionId = capture?.id;
    const amount = capture?.amount?.value;
    const currency = capture?.amount?.currency_code;

    // 更新支付记录
    const { error: updatePaymentError } = await supabaseAdmin
      .from('payment_records')
      .update({
        status: 'completed',
        transaction_id: transactionId,
        paid_at: new Date().toISOString(),
        metadata: {
          paypal_order_id: paypalOrderId,
          capture_data: data,
        },
      })
      .eq('transaction_id', paypalOrderId);

    if (updatePaymentError) {
      console.error('Failed to update payment record:', updatePaymentError);
    }

    // 更新订单状态
    if (orderId) {
      const { error: updateOrderError } = await supabaseAdmin
        .from('orders')
        .update({
          status: 'paid',
          payment_status: 'paid',
          paid_at: new Date().toISOString(),
          transaction_id: transactionId,
        })
        .eq('id', orderId);

      if (updateOrderError) {
        console.error('Failed to update order:', updateOrderError);
      }

      // 发送确认邮件（可选）
      // await sendOrderConfirmationEmail(orderId);
    }

    return NextResponse.json({
      success: true,
      transactionId,
      amount,
      currency,
      status: data.status,
    });
  } catch (error: any) {
    console.error('PayPal capture error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to capture PayPal payment' },
      { status: 500 }
    );
  }
}