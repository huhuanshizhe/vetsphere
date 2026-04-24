import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth-middleware';

export async function POST(req: NextRequest) {
  // 仅管理员可创建用户
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;

  try {
    const { email, password, role, fullName, license, clinic, company, discipline } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const adminClient = getSupabaseAdmin();

    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { 
        role: role || 'Doctor',
        name: fullName || email.split('@')[0],
        license: license || null,
        clinic: clinic || null,
        company: company || null,
        discipline: discipline || null
      }
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
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
