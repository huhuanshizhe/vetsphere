import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseAdmin } from "@vetsphere/shared";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: NextRequest) {
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
        // Idempotency check: Skip if order already paid
        const { data: existingOrder } = await supabase
          .from('orders')
          .select('status')
          .eq('id', orderId)
          .single();

        if (existingOrder?.status === 'Paid' || existingOrder?.status === 'Completed') {
          console.log(`[Stripe Webhook] Order ${orderId} already paid, skipping duplicate`);
          break;
        }

        // Update order status
        const { error } = await supabase
          .from('orders')
          .update({
            status: 'Paid',
            payment_method: 'stripe',
            payment_id: paymentIntent.id,
            paid_amount: paymentIntent.amount / 100,
            paid_at: new Date().toISOString(),
          })
          .eq('id', orderId);

        if (error) {
          console.error('Failed to update order:', error);
        }

        // Update course enrollments payment status
        const { error: enrollmentError } = await supabase
          .from('course_enrollments')
          .update({ payment_status: 'paid' })
          .eq('order_id', orderId);

        if (enrollmentError) {
          console.error('Failed to update enrollments:', enrollmentError);
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
