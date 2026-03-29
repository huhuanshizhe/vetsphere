import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, hasServiceRoleKey } from "@vetsphere/shared";

const supabaseAdmin = getSupabaseAdmin();

/**
 * GET /api/auth/me - Get current user info and permissions
 * Used by AuthContext to fetch full user state including dual-track permissions
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ isLoggedIn: false }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ isLoggedIn: false }, { status: 401 });
    }

    // Get user profile from profiles table (may fail without service role key)
    let profile = null;
    let identity = null;
    
    if (hasServiceRoleKey()) {
      // Only query these tables with service role key (bypasses RLS)
      const { data: profileData } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      profile = profileData;

      const { data: identityData } = await supabaseAdmin
        .from('user_identities')
        .select('*')
        .eq('user_id', user.id)
        .single();
      identity = identityData;
    }

    // Calculate permissions based on identity
    const permissions = {
      can_access_user_center: true,
      can_purchase_courses: true,
      can_purchase_products: true,
      can_manage_orders: true,
      can_access_growth_system: !!identity && identity.identity_group_v2 === 'doctor',
      can_access_doctor_workspace: !!identity && identity.doctor_privilege_status === 'approved',
      can_access_medical_features: !!identity && identity.doctor_privilege_status === 'approved',
      can_access_professional_courses: !!identity && identity.identity_group_v2 === 'doctor',
      can_view_restricted_product_info: !!identity && identity.doctor_privilege_status === 'approved',
    };

    // Doctor access status
    const doctorAccess = identity ? {
      status: identity.doctor_privilege_status || 'not_applicable',
      subtype: identity.doctor_subtype || null,
    } : null;

    return NextResponse.json({
      isLoggedIn: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: profile?.display_name || user.user_metadata?.name || user.email?.split('@')[0],
        avatarUrl: profile?.avatar_url || user.user_metadata?.avatar_url,
        mobile: profile?.mobile || user.user_metadata?.phone,
      },
      identity: identity ? {
        identityGroupV2: identity.identity_group_v2,
        doctorSubtype: identity.doctor_subtype,
        identityLabel: identity.identity_label,
      } : null,
      permissions,
      doctorAccess,
    });

  } catch (error) {
    console.error('Auth me API error:', error);
    return NextResponse.json({ isLoggedIn: false, error: 'Internal server error' }, { status: 500 });
  }
}