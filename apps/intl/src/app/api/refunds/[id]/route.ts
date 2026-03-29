import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from "@vetsphere/shared";
import Stripe from 'stripe';
import { sendRefundStatusEmail } from '@vetsphere/shared/lib/email';

const supabaseAdmin = getSupabaseAdmin();

// Verify admin authentication
async function verifyAdmin(request: NextRequest): Promise<{ userId: string } | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  
  if (profile?.role !== 'Admin') return null;
  return { userId: user.id };
}

// GET /api/refunds/[id] - Get single refund
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if admin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    const isAdmin = profile?.role === 'Admin';

    const { id } = await params;

    const { data: refund, error } = await supabaseAdmin
      .from('refunds')
      .select(`
        *,
        orders (*)
      `)
      .eq('id', id)
      .single();

    if (error || !refund) {
      return NextResponse.json({ error: 'Refund not found' }, { status: 404 });
    }

    // Non-admin users can only see their own refunds
    if (!isAdmin && refund.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ refund });
  } catch (error) {
    console.error('Refund API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/refunds/[id] - Update refund status (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const { action, rejectionReason } = await request.json();

    if (!action || !['approve', 'reject', 'process'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be: approve, reject, or process' },
        { status: 400 }
      );
    }

    // Get current refund
    const { data: refund, error: refundError } = await supabaseAdmin
      .from('refunds')
      .select('*, orders(*)')
      .eq('id', id)
      .single();

    if (refundError || !refund) {
      return NextResponse.json({ error: 'Refund not found' }, { status: 404 });
    }

    let updateData: any = {
      updated_at: new Date().toISOString()
    };

    switch (action) {
      case 'approve':
        if (refund.status !== 'pending') {
          return NextResponse.json({ error: 'Can only approve pending refunds' }, { status: 400 });
        }
        updateData.status = 'approved';
        updateData.processed_by = admin.userId;
        updateData.processed_at = new Date().toISOString();
        break;

      case 'reject':
        if (refund.status !== 'pending') {
          return NextResponse.json({ error: 'Can only reject pending refunds' }, { status: 400 });
        }
        if (!rejectionReason) {
          return NextResponse.json({ error: 'Rejection reason required' }, { status: 400 });
        }
        updateData.status = 'rejected';
        updateData.rejection_reason = rejectionReason;
        updateData.processed_by = admin.userId;
        updateData.processed_at = new Date().toISOString();
        break;

      case 'process':
        if (refund.status !== 'approved') {
          return NextResponse.json({ error: 'Can only process approved refunds' }, { status: 400 });
        }
        
        // Process refund with payment provider
        const processResult = await processRefundWithProvider(refund);
        if (!processResult.success) {
          updateData.status = 'failed';
          updateData.rejection_reason = processResult.error;
        } else {
          updateData.status = 'completed';
          updateData.refund_payment_id = processResult.refundId;
        }
        break;
    }

    const { error: updateError } = await supabaseAdmin
      .from('refunds')
      .update(updateData)
      .eq('id', id);

    if (updateError) {
      console.error('Failed to update refund:', updateError);
      return NextResponse.json({ error: 'Failed to update refund' }, { status: 500 });
    }

    // Send email notification for status changes
    if (['approved', 'rejected', 'completed'].includes(updateData.status)) {
      const order = refund.orders;
      if (order?.customer_email) {
        sendRefundStatusEmail(order.customer_email, {
          customerName: order.customer_name || 'Customer',
          orderId: refund.order_id,
          refundId: id,
          amount: refund.amount,
          status: updateData.status,
          reason: updateData.rejection_reason
        }).catch(err => console.error('[Refund] Email send error:', err));
      }
    }

    return NextResponse.json({
      success: true,
      status: updateData.status
    });

  } catch (error) {
    console.error('Refund API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Process refund with the original payment provider
async function processRefundWithProvider(refund: any): Promise<{ success: boolean; refundId?: string; error?: string }> {
  const paymentMethod = refund.original_payment_method;
  const paymentId = refund.original_payment_id;
  const amount = refund.amount;

  if (!paymentMethod || !paymentId) {
    return { success: false, error: 'Missing payment information' };
  }

  try {
    switch (paymentMethod) {
      case 'stripe': {
        const stripeKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeKey) {
          return { success: false, error: 'Stripe not configured' };
        }
        
        const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' as any });
        
        // Refund the payment intent
        const refundResult = await stripe.refunds.create({
          payment_intent: paymentId,
          amount: Math.round(amount * 100), // Convert to cents
          reason: 'requested_by_customer'
        });
        
        return { success: true, refundId: refundResult.id };
      }

      case 'alipay':
      case 'wechat':
        // For Alipay and WeChat, manual processing is typically required
        // Return success and mark as processed - actual refund happens manually
        console.log(`[Refund] ${paymentMethod} refund requires manual processing: ${paymentId}`);
        return { 
          success: true, 
          refundId: `manual-${Date.now()}` 
        };

      default:
        return { success: false, error: `Unknown payment method: ${paymentMethod}` };
    }
  } catch (error) {
    console.error('Payment provider refund error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Refund processing failed' 
    };
  }
}
