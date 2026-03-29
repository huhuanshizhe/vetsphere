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
    .update({ status: status === 'Paid' ? 'Paid' : 'Pending' })
    .eq('id', orderId);

  // Update course enrollments payment status
  const paymentStatus = status === 'Paid' ? 'paid' : 'refunded';
  await supabaseAdmin
    .from('course_enrollments')
    .update({ payment_status: paymentStatus })
    .eq('order_id', orderId);

  // Increment current_enrollment for each course item when paid
  if (status === 'Paid') {
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('items')
      .eq('id', orderId)
      .single();

    const courseItems = (order?.items || []).filter((item: any) => item.type === 'course');
    for (const item of courseItems) {
      await supabaseAdmin.rpc('increment_course_enrollment', { p_course_id: item.id });
    }
  }

  console.log(`[Webhook] Order ${orderId} updated to ${status}`);
}

async function sendPaymentEmails(orderId: string, amount: number) {
  const supabaseAdmin = await getSupabaseAdmin();
  const { sendPaymentReceivedEmail, sendOrderConfirmation, sendCourseEnrollmentEmail } = await getEmailFunctions();

  try {
    // Fetch order details
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (!order) return;

    const customerEmail = order.customer_email;
    const customerName = order.customer_name || 'Customer';

    // Send payment received email
    await sendPaymentReceivedEmail(customerEmail, {
      customerName,
      orderId,
      amount,
      paymentMethod: 'Stripe'
    });

    // Send order confirmation email
    const items = order.items || [];
    await sendOrderConfirmation(customerEmail, {
      orderId,
      customerName,
      items: items.map((item: any) => ({
        name: item.name,
        quantity: item.quantity || 1,
        price: item.price
      })),
      totalAmount: order.total_amount,
      orderUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://vetsphere.pro'}/user?tab=orders`
    });

    // Send course enrollment emails for course items
    const courseItems = items.filter((item: any) => item.type === 'course');
    for (const course of courseItems) {
      await sendCourseEnrollmentEmail(customerEmail, {
        studentName: customerName,
        courseTitle: course.name,
        startDate: course.startDate || 'TBD',
        location: course.location || 'Online',
        courseUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://vetsphere.pro'}/courses/${course.id}`
      });
    }

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