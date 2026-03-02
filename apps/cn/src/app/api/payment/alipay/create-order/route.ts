import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

/**
 * 支付宝支付 API - 使用原生 crypto 实现
 * 
 * 注意: 由于 alipay-sdk 与 Turbopack 不兼容，这里使用原生实现
 * 完整实现需要填入 ALIPAY_APP_ID、ALIPAY_PRIVATE_KEY 等环境变量
 */

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

// 生成支付宝签名
function generateAlipaySign(params: Record<string, string>, privateKey: string): string {
  // 按字母顺序排序参数
  const sortedKeys = Object.keys(params).sort();
  const signStr = sortedKeys
    .filter(key => params[key] !== undefined && params[key] !== '')
    .map(key => `${key}=${params[key]}`)
    .join('&');
  
  // 使用 RSA2 (SHA256WithRSA) 签名
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signStr, 'utf8');
  return sign.sign(privateKey, 'base64');
}

// 构建支付宝请求参数
function buildAlipayParams(bizContent: object, method: string): Record<string, string> {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  
  return {
    app_id: process.env.ALIPAY_APP_ID || '',
    method: method,
    format: 'JSON',
    charset: 'utf-8',
    sign_type: 'RSA2',
    timestamp: timestamp,
    version: '1.0',
    notify_url: process.env.ALIPAY_NOTIFY_URL || '',
    biz_content: JSON.stringify(bizContent),
  };
}

// 电脑网站支付
export async function POST(request: NextRequest) {
  try {
    // Verify user authentication
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, amount, subject, description } = body;

    if (!orderId || !amount || !subject) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId, amount, subject' },
        { status: 400 }
      );
    }

    // Verify order exists and belongs to the authenticated user
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

    const outTradeNo = `VS${orderId}_${Date.now()}`;
    const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/zh/checkout?status=success&orderId=${orderId}`;

    const bizContent = {
      out_trade_no: outTradeNo,
      product_code: 'FAST_INSTANT_TRADE_PAY',
      total_amount: amount.toFixed(2),
      subject: subject,
      body: description || subject,
    };

    const params = buildAlipayParams(bizContent, 'alipay.trade.page.pay');
    params.return_url = returnUrl;

    // 生成签名
    const privateKey = process.env.ALIPAY_PRIVATE_KEY || '';
    if (!privateKey) {
      return NextResponse.json(
        { error: 'Alipay private key not configured' },
        { status: 500 }
      );
    }

    params.sign = generateAlipaySign(params, privateKey);

    // 构建支付 URL
    const gateway = process.env.ALIPAY_GATEWAY || 'https://openapi.alipay.com/gateway.do';
    const queryString = Object.entries(params)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');

    return NextResponse.json({
      success: true,
      paymentUrl: `${gateway}?${queryString}`,
      outTradeNo,
    });
  } catch (error) {
    console.error('Alipay create order error:', error);
    return NextResponse.json(
      { error: 'Failed to create Alipay order', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// 手机网站支付
export async function PUT(request: NextRequest) {
  try {
    // Verify user authentication
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, amount, subject, description } = body;

    if (!orderId || !amount || !subject) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId, amount, subject' },
        { status: 400 }
      );
    }

    // Verify order exists and belongs to the authenticated user
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

    const outTradeNo = `VS${orderId}_${Date.now()}`;
    const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/zh/checkout?status=success&orderId=${orderId}`;
    const quitUrl = `${process.env.NEXT_PUBLIC_APP_URL}/zh/checkout`;

    const bizContent = {
      out_trade_no: outTradeNo,
      product_code: 'QUICK_WAP_WAY',
      total_amount: amount.toFixed(2),
      subject: subject,
      body: description || subject,
      quit_url: quitUrl,
    };

    const params = buildAlipayParams(bizContent, 'alipay.trade.wap.pay');
    params.return_url = returnUrl;

    const privateKey = process.env.ALIPAY_PRIVATE_KEY || '';
    if (!privateKey) {
      return NextResponse.json(
        { error: 'Alipay private key not configured' },
        { status: 500 }
      );
    }

    params.sign = generateAlipaySign(params, privateKey);

    const gateway = process.env.ALIPAY_GATEWAY || 'https://openapi.alipay.com/gateway.do';
    const queryString = Object.entries(params)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');

    return NextResponse.json({
      success: true,
      paymentUrl: `${gateway}?${queryString}`,
      outTradeNo,
    });
  } catch (error) {
    console.error('Alipay wap pay error:', error);
    return NextResponse.json(
      { error: 'Failed to create Alipay wap order', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
