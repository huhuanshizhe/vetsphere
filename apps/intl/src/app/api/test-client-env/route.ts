import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // 这个 API 返回构建时内联的环境变量
  const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  
  return NextResponse.json({
    stripePublishableKey: {
      exists: !!stripeKey,
      length: stripeKey?.length || 0,
      prefix: stripeKey?.substring(0, 15) || 'N/A',
      startsWithPk: stripeKey?.startsWith('pk_') || false,
    },
    message: stripeKey 
      ? '✅ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is properly configured' 
      : '❌ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is missing or empty',
  });
}
