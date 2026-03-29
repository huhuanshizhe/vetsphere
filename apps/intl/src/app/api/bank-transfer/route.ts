import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * Bank transfer configuration
 * Supports multiple currencies through a single bank account
 */
const BANK_TRANSFER_CONFIG = {
  bankName: 'DBS BANK (HONG KONG) LIMITED',
  accountName: 'VETSPHERE LIMITED',
  accountNumber: '7982926244',
  accountType: 'Current',
  swiftBic: 'DHBKHKHH',
  swiftBic11Digits: 'DHBKHKHHXXX',
  bankCode: '016',
  branchNumber: '478',
  bankCountry: 'HONG KONG, CHINA',
  bankAddress: '11th Floor, The Center, 99 Queen\'s Road Central, Central, Hong Kong',
  supportedCurrencies: ['EUR', 'GBP', 'USD', 'JPY', 'CAD', 'AUD', 'CNH', 'HKD', 'SGD', 'SEK', 'CHF', 'DKK', 'NOK', 'NZD'],
  paymentReference: '[Buyer Name][Invoice/Contract Number]',
  instructions: 'Please include the above payment reference when making the transfer.',
};

/**
 * GET /api/bank-transfer - 获取银行转账配置信息
 * 根据货币返回银行账户信息
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const currency = (searchParams.get('currency') || 'USD').toUpperCase();

    // 检查是否支持请求的货币
    if (!BANK_TRANSFER_CONFIG.supportedCurrencies.includes(currency)) {
      return NextResponse.json({
        error: `Currency ${currency} is not supported for bank transfer`,
        supportedCurrencies: BANK_TRANSFER_CONFIG.supportedCurrencies,
      }, { status: 400 });
    }

    // 返回银行信息
    return NextResponse.json({
      bankName: BANK_TRANSFER_CONFIG.bankName,
      accountName: BANK_TRANSFER_CONFIG.accountName,
      accountNumber: BANK_TRANSFER_CONFIG.accountNumber,
      accountType: BANK_TRANSFER_CONFIG.accountType,
      swiftBic: BANK_TRANSFER_CONFIG.swiftBic,
      swiftBic11Digits: BANK_TRANSFER_CONFIG.swiftBic11Digits,
      bankCode: BANK_TRANSFER_CONFIG.bankCode,
      branchNumber: BANK_TRANSFER_CONFIG.branchNumber,
      bankCountry: BANK_TRANSFER_CONFIG.bankCountry,
      bankAddress: BANK_TRANSFER_CONFIG.bankAddress,
      currency,
      supportedCurrencies: BANK_TRANSFER_CONFIG.supportedCurrencies,
      paymentReference: BANK_TRANSFER_CONFIG.paymentReference,
      instructions: BANK_TRANSFER_CONFIG.instructions,
    });
  } catch (error) {
    console.error('Bank transfer API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/bank-transfer - 确认银行转账支付
 * 用户提交转账凭证
 */
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, transferDate, transferAmount, transferCurrency, referenceNumber, notes, attachmentUrl } = body;

    if (!orderId || !transferDate || !transferAmount) {
      return NextResponse.json({
        error: 'Missing required fields: orderId, transferDate, transferAmount'
      }, { status: 400 });
    }

    // 验证订单存在且属于用户
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, user_id, status, total_amount, currency')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.user_id && order.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (order.status === 'paid' || order.status === 'completed') {
      return NextResponse.json({ error: 'Order already paid' }, { status: 400 });
    }

    // 创建支付确认记录
    const { data: paymentRecord, error } = await supabaseAdmin
      .from('payment_records')
      .insert({
        order_id: orderId,
        payment_method: 'bank_transfer',
        status: 'pending_verification',
        amount: transferAmount,
        currency: transferCurrency || order.currency,
        metadata: {
          transfer_date: transferDate,
          reference_number: referenceNumber,
          notes,
          attachment_url: attachmentUrl,
          submitted_by: user.id,
          submitted_at: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create payment record:', error);
      return NextResponse.json({ error: 'Failed to submit transfer confirmation' }, { status: 500 });
    }

    // 更新订单状态为待验证
    await supabaseAdmin
      .from('orders')
      .update({
        status: 'pending_verification',
        payment_status: 'pending_verification',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    return NextResponse.json({
      success: true,
      message: 'Transfer confirmation submitted. We will verify your payment within 1-2 business days.',
      paymentRecordId: paymentRecord.id,
    });
  } catch (error) {
    console.error('Bank transfer confirmation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}