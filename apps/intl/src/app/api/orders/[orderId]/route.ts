import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from "@vetsphere/shared";
import { sendEmail, orderShippedEmailTemplate, generateTrackingUrl } from '@vetsphere/shared/services/email';

const supabaseAdmin = getSupabaseAdmin();

interface RouteParams {
  params: Promise<{ orderId: string }>;
}

/**
 * GET /api/orders/[orderId] - 获取订单详情
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { orderId } = await params;

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // 获取订单详情
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        order_items(*),
        payment_records(*)
      `)
      .eq('id', orderId)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // 验证用户权限（可选，允许游客查看自己的订单）
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ') && order.user_id) {
      const token = authHeader.substring(7);
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user && user.id !== order.user_id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error('Order detail API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/orders/[orderId] - 更新订单
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { orderId } = await params;

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

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

    // 获取订单
    const { data: existingOrder, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('user_id, status, email, shipping_name, locale, order_number')
      .eq('id', orderId)
      .single();

    if (fetchError || !existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // 验证权限
    if (existingOrder.user_id && existingOrder.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { status, notes, tracking_number, carrier } = body;

    // 构建更新对象
    const updates: any = { updated_at: new Date().toISOString() };
    if (status) updates.status = status;
    if (notes !== undefined) updates.notes = notes;
    if (tracking_number) updates.tracking_number = tracking_number;
    if (carrier) updates.carrier = carrier;

    // 更新订单
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .update(updates)
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      console.error('Failed to update order:', error);
      return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
    }

    // Send shipping notification email if status changed to 'shipped'
    if (status === 'shipped' && existingOrder.status !== 'shipped') {
      const trackingUrl = generateTrackingUrl(carrier, tracking_number);

      const shippingEmail = orderShippedEmailTemplate(
        existingOrder.shipping_name,
        existingOrder.order_number,
        {
          carrier: carrier || 'Standard Shipping',
          trackingNumber: tracking_number || 'N/A',
          trackingUrl,
          estimatedDelivery: '5-10 business days',
        },
        existingOrder.locale || 'en'
      );

      sendEmail({
        to: existingOrder.email,
        subject: shippingEmail.subject,
        html: shippingEmail.html,
      }).catch(err => {
        console.error('[Orders] Failed to send shipping email:', err);
      });
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error('Order update API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/orders/[orderId] - 取消订单
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { orderId } = await params;

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

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

    // 获取订单
    const { data: existingOrder, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('user_id, status')
      .eq('id', orderId)
      .single();

    if (fetchError || !existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // 验证权限
    if (existingOrder.user_id && existingOrder.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 检查是否可以取消
    if (existingOrder.status === 'shipped' || existingOrder.status === 'delivered' || existingOrder.status === 'completed') {
      return NextResponse.json({ error: 'Cannot cancel order in current status' }, { status: 400 });
    }

    // 更新订单状态为已取消
    const { error } = await supabaseAdmin
      .from('orders')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (error) {
      console.error('Failed to cancel order:', error);
      return NextResponse.json({ error: 'Failed to cancel order' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Order cancelled' });
  } catch (error) {
    console.error('Order cancel API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
