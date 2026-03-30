import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  return NextResponse.json({
    hasSecretKey: !!stripeSecretKey,
    secretKeyPrefix: stripeSecretKey ? stripeSecretKey.substring(0, 10) + '...' : null,
    secretKeyLength: stripeSecretKey ? stripeSecretKey.length : 0,
    hasPublishableKey: !!stripePublishableKey,
    publishableKeyPrefix: stripePublishableKey ? stripePublishableKey.substring(0, 20) + '...' : null,
    publishableKeyLength: stripePublishableKey ? stripePublishableKey.length : 0,
  });
}