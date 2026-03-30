import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';

export const dynamic = 'force-dynamic';

async function getStripe(secretKey: string) {
  const Stripe = (await import('stripe')).default;
  return new Stripe(secretKey, { apiVersion: '2023-10-16' as any });
}

/**
 * GET /api/debug-stripe-response
 * Creates a test PaymentIntent and returns debug info about the client_secret format
 */
export async function GET(request: NextRequest) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    
    if (!secretKey || secretKey.includes('placeholder')) {
      return NextResponse.json({ error: 'STRIPE_SECRET_KEY not configured' }, { status: 503 });
    }
    
    if (!publishableKey || !publishableKey.startsWith('pk_')) {
      return NextResponse.json({ error: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY not configured' }, { status: 503 });
    }
    
    const stripe = await getStripe(secretKey);
    
    // Create a test PaymentIntent with minimal amount
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 100, // $1.00
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        test: 'true',
        purpose: 'debug_embedded_checkout',
      },
    });
    
    // Return debug information
    return NextResponse.json({
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      clientSecretLength: paymentIntent.client_secret?.length || 0,
      clientSecretStartsWithPi: paymentIntent.client_secret?.startsWith('pi_'),
      clientSecretIncludesSecret: paymentIntent.client_secret?.includes('_secret_'),
      clientSecretParts: paymentIntent.client_secret?.split('_'),
      publishableKey,
      publishableKeyStartsWithPk: publishableKey.startsWith('pk_'),
      keyType: publishableKey.startsWith('pk_live_') ? 'live' : 'test',
      message: 'If clientSecret does not contain "_secret_", Embedded Checkout will not work!',
    });
  } catch (error: any) {
    console.error('Debug API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}