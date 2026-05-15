import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { finalizeCourseOrderPayment } from '@/lib/course-order-payment';

export const dynamic = 'force-dynamic';

async function getStripe() {
  const Stripe = (await import('stripe')).default;
  return new Stripe(process.env.STRIPE_SECRET_KEY || '');
}

async function getSupabaseAdmin() {
  const { getSupabaseAdmin } = await import('@vetsphere/shared/lib/supabase-admin');
  return getSupabaseAdmin();
}

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseAdmin();
  const stripe = await getStripe();
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const orderId = paymentIntent.metadata?.orderId;

      if (orderId) {
        const result = await finalizeCourseOrderPayment(supabase, {
          orderId,
          paymentStatus: 'paid',
          orderUpdate: {
            payment_method: 'stripe',
            payment_id: paymentIntent.id,
            paid_amount: paymentIntent.amount / 100,
            paid_at: new Date().toISOString(),
          },
        });

        if (!result.changed) {
          console.log(`[Stripe Webhook] Order ${orderId} already paid, skipping duplicate`);
          break;
        }

        console.log(`Order ${orderId} paid via Stripe, payment_intent: ${paymentIntent.id}`);
      }
      break;
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const orderId = paymentIntent.metadata?.orderId;

      if (orderId) {
        await supabase
          .from('orders')
          .update({ status: 'PaymentFailed' })
          .eq('id', orderId);

        console.log(`Order ${orderId} payment failed`);
      }
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}