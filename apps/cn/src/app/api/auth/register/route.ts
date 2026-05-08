import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { sendWelcomeEmail } from '@vetsphere/shared/lib/email';
import { safeUpsertUserSiteMembership, upsertBaseProfile } from '@vetsphere/shared/services/user-site-provenance';

export async function POST(req: NextRequest) {
  try {
    const { email, password, role, fullName, license, clinic, company, discipline } = await req.json();
    const finalRole = role || 'Doctor';
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tvxrgbntiksskywsroax.supabase.co';

    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const userName = fullName || email.split('@')[0];
  const now = new Date().toISOString();

    // Create user via admin API: bypasses rate limits and auto-confirms email
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { 
        role: finalRole,
        name: userName,
        license: license || null,
        clinic: clinic || null,
        company: company || null,
        discipline: discipline || null
      }
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    try {
      await upsertBaseProfile(adminClient, {
        userId: data.user.id,
        email,
        fullName: userName,
        role: finalRole,
        createdAt: now,
        updatedAt: now,
      });
      await safeUpsertUserSiteMembership(adminClient, {
        userId: data.user.id,
        siteCode: 'cn',
        originSite: 'cn',
        createdVia: 'cn_email_register',
        createdAt: now,
        updatedAt: now,
        metadata: { app: 'cn', role: finalRole },
      });
    } catch (bootstrapError) {
      console.error('[CN Register] Failed to bootstrap user directory:', bootstrapError);
      await adminClient.auth.admin.deleteUser(data.user.id).catch(() => undefined);
      return NextResponse.json({ error: 'User bootstrap failed' }, { status: 500 });
    }

    // Send welcome email (non-blocking)
    sendWelcomeEmail(email, userName).catch(err => {
      console.error('[Register] Failed to send welcome email:', err);
    });

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        role: data.user.user_metadata?.role,
        name: data.user.user_metadata?.name
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
