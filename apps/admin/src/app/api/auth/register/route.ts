import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth-middleware';
import { safeUpsertUserSiteMembership, upsertBaseProfile } from '@vetsphere/shared/services/user-site-provenance';

export async function POST(req: NextRequest) {
  // 仅管理员可创建用户
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;

  try {
    const { email, password, role, fullName, license, clinic, company, discipline } = await req.json();
    const finalRole = role || 'Doctor';
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const adminClient = getSupabaseAdmin();
    const userName = fullName || email.split('@')[0];
    const now = new Date().toISOString();

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
      if (finalRole !== 'Admin') {
        await safeUpsertUserSiteMembership(adminClient, {
          userId: data.user.id,
          siteCode: 'intl',
          originSite: 'intl',
          createdVia: 'admin_panel_register',
          createdAt: now,
          updatedAt: now,
          metadata: { app: 'admin', role: finalRole },
        });
      }
    } catch (bootstrapError) {
      console.error('[Admin Register] Failed to bootstrap user directory:', bootstrapError);
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
