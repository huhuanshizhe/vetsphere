import { NextRequest, NextResponse } from 'next/server';

import crypto from 'crypto';


async function getSupabaseAdmin() {
  const { getSupabaseAdmin } = await import('@vetsphere/shared/lib/supabase-admin');
  return getSupabaseAdmin();
}

export const dynamic = 'force-dynamic';
/**
 * Verify Airwallex webhook signature
 * @see https://www.airwallex.com/docs/api#/Webhooks/Verify_signatures
 */
function verifyWebhookSignature(
  request: NextRequest,
  body: string
): boolean {
  const webhookSecret = process.env.AIRWALLEX_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.warn('[Airwallex Webhook] AIRWALLEX_WEBHOOK_SECRET not configured, skipping verification');
    return true; // Skip verification in development
  }

  const signature = request.headers.get('x-signature');
  
  if (!signature) {
    console.error('[Airwallex Webhook] Missing signature header');
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );

    return isValid;
  } catch (error) {
    console.error('[Airwallex Webhook] Signature verification error:', error);
    return false;
  }
}

/**
 * Handle payment intent succeeded
 */
async function handlePaymentIntentSucceeded(event: any) {
  const supabaseAdmin = await getSupabaseAdmin();
  const data = event.data;
  const paymentIntentId = data.object.id;
  const amount = data.object.amount;
  const currency = data.object.currency;
  
  console.log('[Airwallex Webhook] Payment intent succeeded:', { paymentIntentId, amount, currency });

  // Find payment record by transaction_id
  const { data: paymentRecord, error: findError } = await supabaseAdmin
    .from('payment_records')
    .select('*, orders(*)')
    .eq('transaction_id', paymentIntentId)
    .single();

  if (findError || !paymentRecord) {
    console.error('[Airwallex Webhook] Payment record not found:', findError);
    return;
  }

  // Update payment record
  await supabaseAdmin
    .from('payment_records')
    .update({
      status: 'completed',
      paid_at: new Date().toISOString(),
      metadata: {
        ...paymentRecord.metadata,
        webhook_event: event,
        amount,
        currency,
      },
    })
    .eq('id', paymentRecord.id);

  // Update order status
  if (paymentRecord.order_id) {
    await supabaseAdmin
      .from('orders')
      .update({
        status: 'paid',
        payment_status: 'paid',
        paid_at: new Date().toISOString(),
        transaction_id: paymentIntentId,
      })
      .eq('id', paymentRecord.order_id);
    
    console.log('[Airwallex Webhook] Order updated:', paymentRecord.order_id);
  }
}

/**
 * Handle payment intent failed
 */
async function handlePaymentIntentFailed(event: any) {
  const supabaseAdmin = await getSupabaseAdmin();
  const data = event.data;
  const paymentIntentId = data.object.id;
  const errorMessage = data.object.last_payment_error?.message || 'Payment failed';
  
  console.log('[Airwallex Webhook] Payment intent failed:', { paymentIntentId, errorMessage });

  // Find payment record
  const { data: paymentRecord, error: findError } = await supabaseAdmin
    .from('payment_records')
    .select('*, orders(*)')
    .eq('transaction_id', paymentIntentId)
    .single();

  if (findError || !paymentRecord) {
    console.error('[Airwallex Webhook] Payment record not found');
    return;
  }

  // Update payment record
  await supabaseAdmin
    .from('payment_records')
    .update({
      status: 'failed',
      metadata: {
        ...paymentRecord.metadata,
        error: errorMessage,
        webhook_event: event,
      },
    })
    .eq('id', paymentRecord.id);

  // Update order status
  if (paymentRecord.order_id) {
    await supabaseAdmin
      .from('orders')
      .update({
        status: 'payment_failed',
        payment_status: 'failed',
      })
      .eq('id', paymentRecord.order_id);
  }
}

/**
 * Handle refund succeeded
 */
async function handleRefundSucceeded(event: any) {
  const supabaseAdmin = await getSupabaseAdmin();
  const data = event.data;
  const refundId = data.object.id;
  const paymentIntentId = data.object.payment_intent_id;
  
  console.log('[Airwallex Webhook] Refund succeeded:', { refundId, paymentIntentId });

  // Find payment record
  const { data: paymentRecord, error: findError } = await supabaseAdmin
    .from('payment_records')
    .select('*, orders(*)')
    .eq('transaction_id', paymentIntentId)
    .single();

  if (findError || !paymentRecord) {
    console.error('[Airwallex Webhook] Payment record not found for refund');
    return;
  }

  // Update payment record
  await supabaseAdmin
    .from('payment_records')
    .update({
      status: 'refunded',
      metadata: {
        ...paymentRecord.metadata,
        refund_id: refundId,
        refund_event: event,
      },
    })
    .eq('id', paymentRecord.id);

  // Update order status
  if (paymentRecord.order_id) {
    await supabaseAdmin
      .from('orders')
      .update({
        status: 'refunded',
        payment_status: 'refunded',
      })
      .eq('id', paymentRecord.order_id);
  }
}

/**
 * POST /api/payment/airwallex/webhook
 * Handle Airwallex webhook events
 * @see https://www.airwallex.com/docs/api#/Webhooks/Event_types
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const event = JSON.parse(body);

    // Verify webhook signature
    const isValid = verifyWebhookSignature(request, body);
    if (!isValid) {
      console.error('[Airwallex Webhook] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    console.log('[Airwallex Webhook] Received event:', event.type);

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event);
        break;

      case 'charge.refunded':
      case 'refund.succeeded':
        await handleRefundSucceeded(event);
        break;

      case 'payment_intent.created':
        console.log('[Airwallex Webhook] Payment intent created:', event.data.object.id);
        break;

      case 'payment_intent.cancelled':
        console.log('[Airwallex Webhook] Payment intent cancelled:', event.data.object.id);
        break;

      default:
        console.log('[Airwallex Webhook] Unhandled event type:', event.type);
    }

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('[Airwallex Webhook] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}