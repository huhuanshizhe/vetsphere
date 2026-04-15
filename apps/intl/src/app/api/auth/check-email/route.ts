import { NextRequest, NextResponse } from 'next/server';
import { rateLimiters } from '@vetsphere/shared/lib/rate-limit';

async function getSupabaseAdmin() {
  const { getSupabaseAdmin } = await import('@vetsphere/shared/lib/supabase-admin');
  return getSupabaseAdmin();
}

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Rate limit to prevent email enumeration
    const rateLimitResult = rateLimiters.api(req);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    const { email } = await req.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const adminClient = await getSupabaseAdmin();

    // Find user by email - paginate through user list
    let found = false;
    let page = 1;
    const perPage = 100;
    while (!found) {
      const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers({ page, perPage });
      if (listError) {
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
      }
      if (users.length === 0) break;
      found = users.some(u => u.email?.toLowerCase() === email.toLowerCase());
      if (!found && users.length < perPage) break;
      page++;
    }

    return NextResponse.json({ exists: found });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
