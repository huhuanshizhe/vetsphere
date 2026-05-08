import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { safeUpsertUserSiteMembership, upsertBaseProfile } from '@vetsphere/shared/services/user-site-provenance';

export async function POST(req: NextRequest) {
  try {
    const { email, password, role } = await req.json();
    const finalRole = role || 'CourseProvider';
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
    const now = new Date().toISOString();
    const userName = email.split('@')[0];

    // Force CourseProvider role for edu-partner registrations
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { 
        role: finalRole,
        name: userName
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
        siteCode: 'intl',
        originSite: 'intl',
        createdVia: 'edu_partner_register',
        createdAt: now,
        updatedAt: now,
        metadata: { app: 'edu-partner', role: finalRole },
      });
    } catch (bootstrapError) {
      console.error('[Edu Register] Failed to bootstrap user directory:', bootstrapError);
      await adminClient.auth.admin.deleteUser(data.user.id).catch(() => undefined);
      return NextResponse.json({ error: 'User bootstrap failed' }, { status: 500 });
    }

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
