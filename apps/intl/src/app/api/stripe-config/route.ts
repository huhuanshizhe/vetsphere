import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/stripe-config
 * Returns the Stripe publishable key to the client at runtime.
 * 
 * This is more reliable than relying on NEXT_PUBLIC_* vars being inlined at build time,
 * because Vercel env var changes require a rebuild to take effect in client code.
 * By fetching from this API, the client always gets the current value.
 */
export async function GET() {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  
  // Only return the key if it's valid (starts with pk_)
  const isValid = publishableKey && publishableKey.startsWith('pk_');
  
  if (!isValid) {
    return NextResponse.json({
      error: 'Stripe publishable key not configured',
      hint: 'Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in Vercel environment variables',
    }, { status: 503 });
  }
  
  return NextResponse.json({
    publishableKey,
    // Include some debug info (safe to expose)
    keyType: publishableKey.startsWith('pk_live_') ? 'live' : 'test',
  });
}