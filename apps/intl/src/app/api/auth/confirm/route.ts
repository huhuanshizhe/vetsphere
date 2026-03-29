import { getSupabaseAdmin } from "@vetsphere/shared";
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tvxrgbntiksskywsroax.supabase.co';

    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Find user by email - paginate to handle large user lists
    let user = null;
    let page = 1;
    const perPage = 100;
    while (!user) {
      const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers({ page, perPage });
      if (listError) {
        return NextResponse.json({ error: listError.message }, { status: 500 });
      }
      if (users.length === 0) break;
      user = users.find(u => u.email === email);
      if (!user && users.length < perPage) break; // last page
      page++;
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Auto-confirm the user's email
    const { error: updateError } = await adminClient.auth.admin.updateUserById(user.id, {
      email_confirm: true
    });

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
