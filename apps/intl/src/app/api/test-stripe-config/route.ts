import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // 这个 API 返回客户端和服务端都能访问的环境变量信息
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  
  return NextResponse.json({
    hasPublishableKey: !!publishableKey,
    keyLength: publishableKey?.length || 0,
    keyPrefix: publishableKey?.substring(0, 15) || 'none',
    keyStartsWithPk: publishableKey?.startsWith('pk_') || false,
    message: publishableKey 
      ? 'Publishable key is configured' 
      : 'Publishable key is MISSING',
  });
}
