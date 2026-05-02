import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function getSupabaseAdmin() {
  const { getSupabaseAdmin } = await import('@vetsphere/shared/lib/supabase-admin');
  return getSupabaseAdmin();
}

const ADMIN_PERMISSIONS = {
  can_access_user_center: true,
  can_purchase_courses: true,
  can_purchase_products: true,
  can_manage_orders: true,
  can_access_growth_system: true,
  can_access_doctor_workspace: true,
  can_access_medical_features: true,
  can_access_professional_courses: true,
  can_view_restricted_product_info: true,
};

export async function GET(request: NextRequest) {
  const supabaseAdmin = await getSupabaseAdmin();

  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ isLoggedIn: false }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return NextResponse.json({ isLoggedIn: false }, { status: 401 });
    }

    const displayName =
      user.user_metadata?.name || user.email?.split('@')[0] || 'Admin';

    return NextResponse.json({
      isLoggedIn: true,
      user: {
        id: user.id,
        email: user.email,
        displayName,
        avatarUrl: user.user_metadata?.avatar_url || null,
        mobile: user.user_metadata?.phone || null,
      },
      identity: {
        identityGroupV2: 'admin',
        doctorSubtype: null,
        identityLabel: '管理员',
      },
      permissions: ADMIN_PERMISSIONS,
      doctorAccess: {
        status: 'not_applicable',
        subtype: null,
      },
    });
  } catch (error) {
    console.error('Admin auth me API error:', error);
    return NextResponse.json(
      { isLoggedIn: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}