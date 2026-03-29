import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Verify user authentication from Bearer token
async function verifyAuth(request: NextRequest): Promise<{ userId: string; role: string } | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  
  // Get user role
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  
  return { userId: user.id, role: profile?.role || 'Doctor' };
}

// POST /api/refunds - Create refund request
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { orderId, amount, reason, items } = await request.json();

    if (!orderId || !amount || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId, amount, reason' },
        { status: 400 }
      );
    }

    // Verify order exists and belongs to user
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.user_id !== auth.userId) {
      return NextResponse.json({ error: 'Order does not belong to you' }, { status: 403 });
    }

    // Verify order is paid
    if (order.status !== 'Paid' && order.status !== 'Completed' && order.status !== 'PartialRefund') {
      return NextResponse.json({ error: 'Order is not eligible for refund' }, { status: 400 });
    }

    // Verify refund amount doesn't exceed remaining refundable amount
    const refundableAmount = order.total_amount - (order.refunded_amount || 0);
    if (amount > refundableAmount) {
      return NextResponse.json(
        { error: `Maximum refundable amount is ${refundableAmount}` },
        { status: 400 }
      );
    }

    // Check for existing pending refund
    const { data: existingRefund } = await supabaseAdmin
      .from('refunds')
      .select('id')
      .eq('order_id', orderId)
      .eq('status', 'pending')
      .single();

    if (existingRefund) {
      return NextResponse.json(
        { error: 'A pending refund request already exists for this order' },
        { status: 400 }
      );
    }

    // Create refund request
    const { data: refund, error: refundError } = await supabaseAdmin
      .from('refunds')
      .insert({
        order_id: orderId,
        user_id: auth.userId,
        amount,
        currency: order.currency || 'CNY',
        reason,
        original_payment_method: order.payment_method,
        original_payment_id: order.payment_id,
        refund_items: items || [],
        status: 'pending'
      })
      .select()
      .single();

    if (refundError) {
      console.error('Failed to create refund:', refundError);
      return NextResponse.json({ error: 'Failed to create refund request' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      refund: {
        id: refund.id,
        orderId: refund.order_id,
        amount: refund.amount,
        status: refund.status,
        createdAt: refund.created_at
      }
    });

  } catch (error) {
    console.error('Refund API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/refunds - List refunds
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const status = searchParams.get('status');

    let query = supabaseAdmin
      .from('refunds')
      .select(`
        *,
        orders (
          id,
          customer_name,
          customer_email,
          total_amount,
          order_items (
            id,
            product_name,
            product_sku,
            quantity,
            unit_price,
            total_price
          )
        )
      `)
      .order('created_at', { ascending: false });

    // Admin sees all, users see only their own
    if (auth.role !== 'Admin') {
      query = query.eq('user_id', auth.userId);
    }

    if (orderId) {
      query = query.eq('order_id', orderId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: refunds, error } = await query;

    if (error) {
      console.error('Failed to fetch refunds:', error);
      return NextResponse.json({ error: 'Failed to fetch refunds' }, { status: 500 });
    }

    return NextResponse.json({ refunds });

  } catch (error) {
    console.error('Refund API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
