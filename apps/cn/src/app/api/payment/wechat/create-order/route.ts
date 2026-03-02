import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

/**
 * 微信支付 API - 使用原生 crypto 实现 (V3 API)
 * 
 * 注意: 由于 wechatpay-node-v3 与 Turbopack 不兼容，这里使用原生实现
 * 完整实现需要配置 WECHAT_MCH_ID、WECHAT_SERIAL_NO、WECHAT_PRIVATE_KEY 等环境变量
 */

const WECHAT_API_BASE = 'https://api.mch.weixin.qq.com';

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

// 生成随机字符串
function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}

// 生成微信支付 V3 签名
function generateWechatSign(
  method: string,
  url: string,
  timestamp: string,
  nonce: string,
  body: string,
  privateKey: string
): string {
  const message = `${method}\n${url}\n${timestamp}\n${nonce}\n${body}\n`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(message);
  return sign.sign(privateKey, 'base64');
}

// 构建 Authorization 头
function buildAuthHeader(
  method: string,
  url: string,
  body: string,
  mchid: string,
  serialNo: string,
  privateKey: string
): string {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = generateNonce();
  const signature = generateWechatSign(method, url, timestamp, nonce, body, privateKey);
  
  return `WECHATPAY2-SHA256-RSA2048 mchid="${mchid}",nonce_str="${nonce}",timestamp="${timestamp}",serial_no="${serialNo}",signature="${signature}"`;
}

// Native 支付（扫码支付）
export async function POST(request: NextRequest) {
  try {
    // Verify user authentication
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, amount, description } = body;

    if (!orderId || !amount || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId, amount, description' },
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

    const mchid = process.env.WECHAT_MCH_ID || '';
    const appid = process.env.WECHAT_APP_ID || '';
    const serialNo = process.env.WECHAT_SERIAL_NO || '';
    const privateKey = process.env.WECHAT_PRIVATE_KEY || '';
    const notifyUrl = process.env.WECHAT_NOTIFY_URL || '';

    if (!mchid || !appid || !privateKey) {
      return NextResponse.json(
        { error: 'WeChat Pay not configured' },
        { status: 500 }
      );
    }

    const outTradeNo = `VS${orderId}_${Date.now()}`;
    const requestBody = JSON.stringify({
      appid,
      mchid,
      description,
      out_trade_no: outTradeNo,
      notify_url: notifyUrl,
      amount: {
        total: Math.round(amount * 100), // 微信支付金额单位是分
        currency: 'CNY',
      },
    });

    const apiUrl = '/v3/pay/transactions/native';
    const authorization = buildAuthHeader('POST', apiUrl, requestBody, mchid, serialNo, privateKey);

    const response = await fetch(`${WECHAT_API_BASE}${apiUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': authorization,
      },
      body: requestBody,
    });

    const result = await response.json();

    if (response.ok && result.code_url) {
      return NextResponse.json({
        success: true,
        codeUrl: result.code_url, // 用于生成二维码
        outTradeNo,
      });
    } else {
      throw new Error(result.message || 'Failed to create WeChat order');
    }
  } catch (error) {
    console.error('WeChat Native pay error:', error);
    return NextResponse.json(
      { error: 'Failed to create WeChat order', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// JSAPI 支付（公众号/小程序支付）
export async function PUT(request: NextRequest) {
  try {
    // Verify user authentication
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, amount, description, openid } = body;

    if (!orderId || !amount || !description || !openid) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId, amount, description, openid' },
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

    const mchid = process.env.WECHAT_MCH_ID || '';
    const appid = process.env.WECHAT_APP_ID || '';
    const serialNo = process.env.WECHAT_SERIAL_NO || '';
    const privateKey = process.env.WECHAT_PRIVATE_KEY || '';
    const notifyUrl = process.env.WECHAT_NOTIFY_URL || '';

    if (!mchid || !appid || !privateKey) {
      return NextResponse.json(
        { error: 'WeChat Pay not configured' },
        { status: 500 }
      );
    }

    const outTradeNo = `VS${orderId}_${Date.now()}`;
    const requestBody = JSON.stringify({
      appid,
      mchid,
      description,
      out_trade_no: outTradeNo,
      notify_url: notifyUrl,
      amount: {
        total: Math.round(amount * 100),
        currency: 'CNY',
      },
      payer: {
        openid,
      },
    });

    const apiUrl = '/v3/pay/transactions/jsapi';
    const authorization = buildAuthHeader('POST', apiUrl, requestBody, mchid, serialNo, privateKey);

    const response = await fetch(`${WECHAT_API_BASE}${apiUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': authorization,
      },
      body: requestBody,
    });

    const result = await response.json();

    if (response.ok && result.prepay_id) {
      // 生成前端调起支付所需的参数
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const nonceStr = generateNonce();
      const packageStr = `prepay_id=${result.prepay_id}`;
      
      const paySignMessage = `${appid}\n${timestamp}\n${nonceStr}\n${packageStr}\n`;
      const paySign = crypto.createSign('RSA-SHA256');
      paySign.update(paySignMessage);
      
      return NextResponse.json({
        success: true,
        payParams: {
          appId: appid,
          timeStamp: timestamp,
          nonceStr,
          package: packageStr,
          signType: 'RSA',
          paySign: paySign.sign(privateKey, 'base64'),
        },
        outTradeNo,
      });
    } else {
      throw new Error(result.message || 'Failed to create WeChat JSAPI order');
    }
  } catch (error) {
    console.error('WeChat JSAPI pay error:', error);
    return NextResponse.json(
      { error: 'Failed to create WeChat JSAPI order', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// H5 支付（手机浏览器支付）
export async function PATCH(request: NextRequest) {
  try {
    // Verify user authentication
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, amount, description, clientIp } = body;

    if (!orderId || !amount || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId, amount, description' },
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

    const mchid = process.env.WECHAT_MCH_ID || '';
    const appid = process.env.WECHAT_APP_ID || '';
    const serialNo = process.env.WECHAT_SERIAL_NO || '';
    const privateKey = process.env.WECHAT_PRIVATE_KEY || '';
    const notifyUrl = process.env.WECHAT_NOTIFY_URL || '';

    if (!mchid || !appid || !privateKey) {
      return NextResponse.json(
        { error: 'WeChat Pay not configured' },
        { status: 500 }
      );
    }

    const outTradeNo = `VS${orderId}_${Date.now()}`;
    const requestBody = JSON.stringify({
      appid,
      mchid,
      description,
      out_trade_no: outTradeNo,
      notify_url: notifyUrl,
      amount: {
        total: Math.round(amount * 100),
        currency: 'CNY',
      },
      scene_info: {
        payer_client_ip: clientIp || '127.0.0.1',
        h5_info: {
          type: 'Wap',
          app_name: 'VetSphere',
          app_url: process.env.NEXT_PUBLIC_APP_URL || 'https://vetsphere.cn',
        },
      },
    });

    const apiUrl = '/v3/pay/transactions/h5';
    const authorization = buildAuthHeader('POST', apiUrl, requestBody, mchid, serialNo, privateKey);

    const response = await fetch(`${WECHAT_API_BASE}${apiUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': authorization,
      },
      body: requestBody,
    });

    const result = await response.json();

    if (response.ok && result.h5_url) {
      return NextResponse.json({
        success: true,
        h5Url: result.h5_url,
        outTradeNo,
      });
    } else {
      throw new Error(result.message || 'Failed to create WeChat H5 order');
    }
  } catch (error) {
    console.error('WeChat H5 pay error:', error);
    return NextResponse.json(
      { error: 'Failed to create WeChat H5 order', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
