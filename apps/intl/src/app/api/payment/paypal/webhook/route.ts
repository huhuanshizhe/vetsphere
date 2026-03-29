import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * Verify PayPal webhook signature
 * @see https://developer.paypal.com/api/rest/webhooks/rest/#verify-webhook-signature
 */
async function verifyWebhookSignature(
  request: NextRequest,
  body: string
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  
  if (!webhookId) {
    console.warn('[PayPal Webhook] PAYPAL_WEBHOOK_ID not configured, skipping verification');
    return true; // Skip verification in development
  }

  const headers = request.headers;
  const transmissionId = headers.get('paypal-transmission-id');
  const transmissionTime = headers.get('paypal-transmission-time');
  const certUrl = headers.get('paypal-cert-url');
  const authAlgo = headers.get('paypal-auth-algo');
  const transmissionSig = headers.get('paypal-transmission-sig');

  if (!transmissionId || !transmissionTime || !certUrl || !transmissionSig) {
    console.error('[PayPal Webhook] Missing required headers');
    return false;
  }

  try {
    // Fetch the certificate
    const certResponse = await fetch(certUrl);
    if (!certResponse.ok) {
      console.error('[PayPal Webhook] Failed to fetch certificate');
      return false;
    }
    const cert = await certResponse.text();

    // Create the signature verification string
    const expectedSig = `${transmissionId}|${transmissionTime}|${webhookId}|${crypto.createHash('sha256').update(body).digest('hex')}`;

    // Verify the signature
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(expectedSig);
    
    const isValid = verifier.verify(cert, transmissionSig, 'base64');
    return isValid;
  } catch (error) {
    console.error('[PayPal Webhook] Signature verification error:', error);
    return false;
  }
}

/**
 * Handle payment capture completed
 */
async function handlePaymentCaptureCompleted(event: any) {
  const resource = event.resource;
  const transactionId = resource.id;
  const paypalOrderId = resource.supplementary_data?.related_ids?.order_id;
  
  console.log('[PayPal Webhook] Payment captured:', { transactionId, paypalOrderId });

  // Find the order by transaction_id or paypal_order_id
  const { data: paymentRecord, error: findError } = await supabaseAdmin
    .from('payment_records')
    .select('*, orders(*)')
    .or(`transaction_id.eq.${paypalOrderId},metadata->paypal_order_id.eq.${paypalOrderId}`)
    .single();

  if (findError || !paymentRecord) {
    console.error('[PayPal Webhook] Payment record not found:', findError);
    return;
  }

  // Update payment record
  await supabaseAdmin
    .from('payment_records')
    .update({
      status: 'completed',
      transaction_id: transactionId,
      paid_at: new Date().toISOString(),
      metadata: {
        ...paymentRecord.metadata,
        webhook_event: event,
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
        transaction_id: transactionId,
      })
      .eq('id', paymentRecord.order_id);
    
    console.log('[PayPal Webhook] Order updated:', paymentRecord.order_id);
  }
}

/**
 * Handle refund completed
 */
async function handleRefundCompleted(event: any) {
  const resource = event.resource;
  const refundId = resource.id;
  const originalCaptureId = resource.links?.find((l: any) => l.rel === 'up')?.href?.split('/').pop();
  
  console.log('[PayPal Webhook] Refund completed:', { refundId, originalCaptureId });

  // Find payment record by transaction_id
  const { data: paymentRecord, error: findError } = await supabaseAdmin
    .from('payment_records')
    .select('*, orders(*)')
    .eq('transaction_id', originalCaptureId)
    .single();

  if (findError || !paymentRecord) {
    console.error('[PayPal Webhook] Payment record not found for refund');
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
    
    console.log('[PayPal Webhook] Order marked as refunded:', paymentRecord.order_id);
  }
}

/**
 * Handle payment denied/failed
 */
async function handlePaymentDenied(event: any) {
  const resource = event.resource;
  const paypalOrderId = resource.id;
  
  console.log('[PayPal Webhook] Payment denied:', { paypalOrderId });

  // Find payment record
  const { data: paymentRecord, error: findError } = await supabaseAdmin
    .from('payment_records')
    .select('*, orders(*)')
    .or(`transaction_id.eq.${paypalOrderId},metadata->paypal_order_id.eq.${paypalOrderId}`)
    .single();

  if (findError || !paymentRecord) {
    console.error('[PayPal Webhook] Payment record not found');
    return;
  }

  // Update payment record
  await supabaseAdmin
    .from('payment_records')
    .update({
      status: 'failed',
      metadata: {
        ...paymentRecord.metadata,
        denial_event: event,
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
 * POST /api/payment/paypal/webhook
 * Handle PayPal webhook events
 * @see https://developer.paypal.com/api/rest/webhooks/event-names/
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const event = JSON.parse(body);

    // Verify webhook signature
    const isValid = await verifyWebhookSignature(request, body);
    if (!isValid) {
      console.error('[PayPal Webhook] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    console.log('[PayPal Webhook] Received event:', event.event_type);

    // Handle different event types
    switch (event.event_type) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        await handlePaymentCaptureCompleted(event);
        break;

      case 'PAYMENT.CAPTURE.DENIED':
      case 'PAYMENT.CAPTURE.REFUNDED':
        await handlePaymentDenied(event);
        break;

      case 'PAYMENT.REFUND.COMPLETED':
        await handleRefundCompleted(event);
        break;

      case 'CHECKOUT.ORDER.APPROVED':
        // Order approved by buyer, waiting for capture
        console.log('[PayPal Webhook] Order approved:', event.resource.id);
        break;

      case 'CHECKOUT.ORDER.COMPLETED':
        // Order completed
        console.log('[PayPal Webhook] Order completed:', event.resource.id);
        break;

      default:
        console.log('[PayPal Webhook] Unhandled event type:', event.event_type);
    }

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('[PayPal Webhook] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}