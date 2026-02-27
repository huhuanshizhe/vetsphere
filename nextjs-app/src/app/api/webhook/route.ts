import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as any,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

// Server-side Supabase client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function updateOrderAndEnrollments(orderId: string, status: 'Paid' | 'refunded') {
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

  console.log(`[Webhook] Order ${orderId} updated to ${status}`);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check if webhook is configured
    if (!webhookSecret || webhookSecret === 'whsec_placeholder') {
      // In development/test mode, just log and accept
      const body = await request.json();
      console.log('[Webhook] Test mode - received:', body.type || 'unknown event');
      
      // Handle test events
      if (body.type === 'payment_intent.succeeded' && body.data?.object?.metadata?.orderId) {
        await updateOrderAndEnrollments(body.data.object.metadata.orderId, 'Paid');
      }
      
      return NextResponse.json({ received: true, mode: 'test' });
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
          await updateOrderAndEnrollments(orderId, 'Paid');
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
