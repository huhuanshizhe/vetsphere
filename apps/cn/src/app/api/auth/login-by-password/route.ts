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
    
    const state = userState || {
      user_id: cnUser.id,
      mobile,
      user_status: 'active',
      onboarding_status: 'not_started',
      verification_status: 'not_started',
      access_level: 'registered_basic',
      redirect_hint: 'go_home',
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
        identityVerifiedFlag: state.identity_verified_flag,
      },
      onboarding: {
        status: state.onboarding_status,
        profileCompletionPercent: state.profile_completion_percent || 0,
      },
      verification: {
        required: state.verification_required || false,
        status: state.verification_status,
        rejectReason: state.verification_reject_reason,
      },
      access: {
        level: state.access_level,
        permissionFlags: state.permission_flags || {},
      },
      redirectHint: state.redirect_hint,
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
