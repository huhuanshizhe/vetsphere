import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Lazy-loaded dependencies
let _stripe: Stripe | null = null;
let _webhookSecret: string | null = null;

async function getStripe() {
  if (!_stripe) {
    const Stripe = (await import('stripe')).default;
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2023-10-16' as any,
    });
  }
  return _stripe;
}

function getWebhookSecret() {
  if (!_webhookSecret) {
    _webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
  }
  return _webhookSecret;
}

async function getSupabaseAdmin() {
  const { getSupabaseAdmin } = await import('@vetsphere/shared/lib/supabase-admin');
  return getSupabaseAdmin();
}

async function getEmailFunctions() {
  return await import('@vetsphere/shared/lib/email');
}

async function updateOrderAndEnrollments(orderId: string, status: 'Paid' | 'refunded') {
  const supabaseAdmin = await getSupabaseAdmin();
  // Update order status
  await supabaseAdmin
    .from('orders')
    .update({ status: status === 'Paid' ? 'paid' : 'refunded', payment_status: status === 'Paid' ? 'paid' : 'refunded' })
    .eq('id', orderId);

  // Update course enrollments payment status
  const paymentStatus = status === 'Paid' ? 'paid' : 'refunded';
  await supabaseAdmin
    .from('course_enrollments')
    .update({ payment_status: paymentStatus })
    .eq('order_id', orderId);

  // Increment current_enrollment for each course item when paid
  if (status === 'Paid') {
    // 从 order_items 表获取订单项
    const { data: orderItems } = await supabaseAdmin
      .from('order_items')
      .select('product_id, product_name')
      .eq('order_id', orderId);

    if (orderItems) {
      // 检查是否有课程产品
      for (const item of orderItems) {
        if (item.product_id) {
          // 检查是否是课程
          const { data: product } = await supabaseAdmin
            .from('products')
            .select('type')
            .eq('id', item.product_id)
            .single();
          
          if (product?.type === 'course') {
            await supabaseAdmin.rpc('increment_course_enrollment', { p_course_id: item.product_id });
          }
        }
      }
    }
  }

  console.log(`[Webhook] Order ${orderId} updated to ${status}`);
}

async function sendPaymentEmails(orderId: string, amount: number) {
  const supabaseAdmin = await getSupabaseAdmin();

  try {
    // Fetch order details with order_items
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .single();

    if (!order) {
      console.error('[Webhook] Order not found:', orderId);
      return;
    }

    // 正确的字段名称
    const customerEmail = order.email;  // 不是 customer_email
    const customerName = order.shipping_name || 'Customer';  // 不是 customer_name
    const orderItems = order.order_items || [];  // 不是 items

    console.log('[Webhook] Sending emails to:', customerEmail, 'for order:', orderId);

    // 使用本地化邮件 API
    const locale = order.locale || 'en';
    const orderUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://vetsphere.net'}/${locale}/user/orders/${order.order_no}`;

    // 发送订单确认邮件
    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://vetsphere.net'}/api/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'order_confirmation',
        to: customerEmail,
        locale: locale,
        data: {
          orderId: order.order_no,
          customerName: customerName,
          items: orderItems.map((item: any) => ({
            name: item.product_name,
            quantity: item.quantity,
            price: item.unit_price
          })),
          totalAmount: order.total_amount,
          orderUrl: orderUrl
        }
      })
    });

    // 发送支付成功邮件
    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://vetsphere.net'}/api/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'payment_received',
        to: customerEmail,
        locale: locale,
        data: {
          customerName: customerName,
          orderId: order.order_no,
          amount: amount,
          paymentMethod: 'Stripe',
          receiptUrl: orderUrl
        }
      })
    });

    console.log(`[Webhook] Emails sent for order ${orderId}`);
  } catch (error) {
    console.error('[Webhook] Email send error:', error);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabaseAdmin = await getSupabaseAdmin();
  const stripe = await getStripe();
  const webhookSecret = getWebhookSecret();

  try {
    // Require webhook secret in all environments
    if (!webhookSecret || webhookSecret === 'whsec_placeholder') {
      console.error('[Webhook] STRIPE_WEBHOOK_SECRET is not configured. Rejecting request.');
      return NextResponse.json(
        { error: 'Webhook endpoint is not configured.' },
        { status: 503 }
      );
    }

    // Production mode: Verify Stripe signature
    const rawBody = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Signature verification failed';
      console.error('[Webhook] Signature verification failed:', message);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Handle the event
    console.log(`[Webhook] Received event: ${event.type}`);

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const orderId = paymentIntent.metadata?.orderId;

        if (orderId) {
          // Idempotency check: skip if already processed
          const { data: existingOrder } = await supabaseAdmin.from('orders').select('status').eq('id', orderId).single();
          if (existingOrder?.status === 'Paid') {
            console.log(`[Webhook] Order ${orderId} already paid, skipping duplicate`);
            break;
          }

          await updateOrderAndEnrollments(orderId, 'Paid');
          // Send confirmation emails
          await sendPaymentEmails(orderId, paymentIntent.amount / 100);
          console.log(`[Webhook] Payment succeeded for order: ${orderId}`);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const orderId = paymentIntent.metadata?.orderId;
        console.log(`[Webhook] Payment failed for order: ${orderId}`);
        // Order stays in 'Pending' status
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const orderId = charge.metadata?.orderId;

        if (orderId) {
          await updateOrderAndEnrollments(orderId, 'refunded');
          console.log(`[Webhook] Refund processed for order: ${orderId}`);
        }
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error('[Webhook] Error:', error);
    const message = error instanceof Error ? error.message : 'Webhook processing failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}