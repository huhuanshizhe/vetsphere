import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function getSupabaseAdmin() {
  const { getSupabaseAdmin } = await import('@vetsphere/shared/lib/supabase-admin');
  return getSupabaseAdmin();
}

/**
 * 生成订单号
 * 格式: VS-YYYYMMDD-XXXXX
 */
function generateOrderNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `VS-${dateStr}-${random}`;
}

/**
 * GET /api/orders - 获取用户订单列表
 */
export async function GET(request: NextRequest) {
  const supabaseAdmin = await getSupabaseAdmin();
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('orders')
      .select('*, order_items(*)', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: orders, error, count } = await query;

    if (error) {
      console.error('Failed to fetch orders:', error);
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }

    return NextResponse.json({
      orders,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Orders API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/orders - 创建新订单
 */
export async function POST(request: NextRequest) {
  const supabaseAdmin = await getSupabaseAdmin();
  try {
    // 验证用户身份（支持游客订单）
    let userId: string | null = null;
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      userId = user?.id || null;
    }

    const body = await request.json();
    const { items, formData, currency, subtotal, shippingFee, total, locale } = body;

    // 验证必填字段
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Order items are required' }, { status: 400 });
    }
    if (!formData?.email || !formData?.name || !formData?.addressLine1 || !formData?.city || !formData?.country) {
      return NextResponse.json({ error: 'Missing required shipping information' }, { status: 400 });
    }

    // 生成订单号
    const orderNumber = generateOrderNumber();

    // 计算订单总重量
    const totalWeight = items.reduce((sum: number, item: any) => {
      return sum + (item.weight || 0) * item.quantity;
    }, 0);

    // 创建订单
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        order_no: orderNumber,
        user_id: userId,
        status: 'pending',
        payment_status: 'pending',
        // 金额信息
        subtotal: subtotal,
        shipping_fee: shippingFee,
        tax: 0,
        total_amount: total,
        currency: currency || 'USD',
        // 联系信息
        email: formData.email,
        phone: formData.phone,
        // 收货地址
        shipping_name: formData.name,
        shipping_company: formData.company,
        shipping_country: formData.country,
        shipping_state: formData.state,
        shipping_city: formData.city,
        shipping_address_line1: formData.addressLine1,
        shipping_address_line2: formData.addressLine2,
        shipping_postal_code: formData.postalCode,
        // B2B信息
        company_name: formData.companyName,
        po_number: formData.poNumber,
        tax_id: formData.taxId,
        // 配送和支付
        shipping_method: formData.shippingMethod,
        payment_method: formData.paymentMethod,
        // 其他信息
        notes: formData.notes,
        total_weight: totalWeight,
        locale: locale || 'en',
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error('Failed to create order:', orderError);
      console.error('Order data attempted:', JSON.stringify({
        order_no: orderNumber,
        user_id: userId,
        email: formData.email,
        total: total,
        items_count: items.length
      }, null, 2));
      return NextResponse.json({ error: 'Failed to create order', details: orderError?.message }, { status: 500 });
    }

    // 创建订单项
    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      product_id: item.productId || null,
      product_name: item.name,
      product_sku: item.skuCode || '',
      product_image: item.imageUrl || '',
      unit_price: item.price,
      quantity: item.quantity,
      total_price: item.price * item.quantity,
    }));

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Failed to create order items:', itemsError);
      // 尝试回滚订单
      await supabaseAdmin.from('orders').delete().eq('id', order.id);
      return NextResponse.json({ error: 'Failed to create order items' }, { status: 500 });
    }

    // 如果是银行转账，记录支付信息
    if (formData.paymentMethod === 'bank_transfer') {
      await supabaseAdmin.from('payment_records').insert({
        order_id: order.id,
        payment_method: 'bank_transfer',
        status: 'pending',
        amount: total,
        currency: currency || 'USD',
      });
    }

    // 更新用户统计（如果是登录用户）
    if (userId) {
      try {
        await supabaseAdmin.rpc('update_user_order_stats', { user_id: userId });
      } catch { /* ignore errors */ }
    }

    // Send localized order confirmation email (non-blocking)
    const orderUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://vetsphere.net'}/${locale || 'en'}/orders/${order.order_no}`;

    fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'}/${locale || 'en'}/api/email/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'order_confirmation',
        to: formData.email,
        locale: locale || 'en',
        data: {
          orderId: order.order_no,
          customerName: formData.name,
          items: items.map(item => ({
            name: item.product_name || item.name,
            quantity: item.quantity,
            price: parseFloat(item.price) || item.price
          })),
          totalAmount: total,
          orderUrl: orderUrl
        }
      })
    }).catch(err => {
      console.error('[Orders] Failed to send order confirmation email:', err);
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.order_no,
    });
  } catch (error) {
    console.error('Order creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}