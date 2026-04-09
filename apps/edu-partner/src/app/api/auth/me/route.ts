import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ isLoggedIn: false }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tvxrgbntiksskywsroax.supabase.co';
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    const supabase = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false }
    });

    // Get user from token
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return NextResponse.json({ isLoggedIn: false }, { status: 401 });
    }

    return NextResponse.json({
      isLoggedIn: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.user_metadata?.name || user.email?.split('@')[0],
      },
      identity: {
        identityGroupV2: user.user_metadata?.role || 'CourseProvider',
      },
      permissions: {
        can_access_user_center: true,
        can_purchase_courses: false,
        can_purchase_products: false,
        can_manage_orders: true,
        can_access_growth_system: false,
        can_access_doctor_workspace: false,
        can_access_medical_features: false,
        can_access_professional_courses: true,
        can_view_restricted_product_info: false,
      },
      doctorAccess: {
        status: 'not_applicable',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}