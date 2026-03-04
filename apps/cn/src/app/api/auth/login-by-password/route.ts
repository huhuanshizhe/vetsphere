import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// 验证手机号格式
function isValidMobile(mobile: string): boolean {
  return /^1[3-9]\d{9}$/.test(mobile);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mobile, password } = body;
    
    // 参数校验
    if (!mobile || !password) {
      return NextResponse.json({ error: '请输入手机号和密码' }, { status: 400 });
    }
    
    if (!isValidMobile(mobile)) {
      return NextResponse.json({ error: '请输入正确的手机号' }, { status: 400 });
    }
    
    // 查找用户
    const { data: cnUser, error: userError } = await supabaseAdmin
      .from('cn_users')
      .select('id, mobile, password_hash, status')
      .eq('mobile', mobile)
      .single();
    
    if (userError || !cnUser) {
      return NextResponse.json({ error: '手机号或密码错误' }, { status: 401 });
    }
    
    // 检查账号状态
    if (cnUser.status === 'disabled' || cnUser.status === 'banned') {
      return NextResponse.json(
        { error: '账号已被限制使用，请联系客服', accountStatus: cnUser.status },
        { status: 403 }
      );
    }
    
    // 检查是否设置了密码
    if (!cnUser.password_hash) {
      return NextResponse.json(
        { error: '您尚未设置密码，请使用验证码登录后设置密码' },
        { status: 400 }
      );
    }
    
    // 使用Supabase Auth验证密码
    const virtualEmail = `${mobile}@vetsphere.cn`;
    const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: virtualEmail,
      password,
    });
    
    if (signInError) {
      return NextResponse.json({ error: '手机号或密码错误' }, { status: 401 });
    }
    
    // 获取客户端IP
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown';
    
    // 更新登录信息
    await supabaseAdmin
      .from('cn_users')
      .update({
        last_login_at: new Date().toISOString(),
        last_login_ip: ipAddress,
        login_count: (cnUser as any).login_count + 1 || 1,
      })
      .eq('id', cnUser.id);
    
    // 获取用户完整状态
    const { data: userState } = await supabaseAdmin
      .from('v_cn_user_full_state')
      .select('*')
      .eq('user_id', cnUser.id)
      .single();
    
    // 默认状态 - 身份选择是可选的，老用户也默认跳转首页
    const state = userState || {
      user_id: cnUser.id,
      mobile,
      user_status: 'active',
      onboarding_status: 'completed',
      verification_status: 'not_started',
      access_level: 'registered_basic',
      redirect_hint: 'go_home',
      identity_group_v2: null,
      doctor_subtype: null,
      doctor_privilege_status: 'not_applicable',
    };
    
    // 强制老用户跳转首页，除非有特殊状态需要处理
    let finalRedirectHint = 'go_home';
    if (state.redirect_hint === 'go_account_status') {
      finalRedirectHint = 'go_account_status';
    } else if (state.redirect_hint === 'show_rejection_prompt') {
      finalRedirectHint = 'show_rejection_prompt';
    } else if (state.redirect_hint === 'show_verification_pending') {
      finalRedirectHint = 'show_verification_pending';
    }
    
    // 计算双轨权限
    const identityGroupV2 = state.identity_group_v2;
    const doctorPrivilegeStatus = state.doctor_privilege_status || 'not_applicable';
    const isDoctorApproved = identityGroupV2 === 'doctor' && doctorPrivilegeStatus === 'approved';
    const permissions = {
      can_access_user_center: true,
      can_purchase_courses: true,
      can_purchase_products: true,
      can_manage_orders: true,
      can_access_growth_system: true,
      can_access_doctor_workspace: isDoctorApproved,
      can_access_medical_features: isDoctorApproved,
      can_access_professional_courses: isDoctorApproved,
      can_view_restricted_product_info: isDoctorApproved,
    };
    
    return NextResponse.json({
      success: true,
      user: {
        id: cnUser.id,
        mobile,
        status: state.user_status,
        displayName: state.display_name,
        avatarUrl: state.avatar_file_id,
      },
      identity: {
        identityType: state.identity_type,
        identityGroup: state.identity_group,
        identityGroupV2: identityGroupV2,
        doctorSubtype: state.doctor_subtype,
        identityVerifiedFlag: state.identity_verified_flag,
      },
      onboarding: {
        status: 'completed', // 老用户不再需要 onboarding
        profileCompletionPercent: state.profile_completion_percent || 0,
      },
      verification: {
        required: state.verification_required || false,
        status: state.verification_status,
        rejectReason: state.verification_reject_reason,
      },
      doctorAccess: {
        status: doctorPrivilegeStatus,
        rejectReason: doctorPrivilegeStatus === 'rejected' ? state.verification_reject_reason : null,
      },
      permissions,
      access: {
        level: state.access_level,
        permissionFlags: state.permission_flags || permissions,
      },
      redirectHint: finalRedirectHint,
      session: {
        accessToken: signInData.session?.access_token,
        refreshToken: signInData.session?.refresh_token,
        expiresAt: signInData.session?.expires_at,
      },
    });
    
  } catch (err) {
    console.error('login-by-password error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
