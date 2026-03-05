import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const SMS_MAX_ERRORS = 5;

// 验证手机号格式
function isValidMobile(mobile: string): boolean {
  return /^1[3-9]\d{9}$/.test(mobile);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mobile, code, agreeTerms } = body;
    
    // 参数校验
    if (!mobile || !code) {
      return NextResponse.json({ error: '请输入手机号和验证码' }, { status: 400 });
    }
    
    if (!isValidMobile(mobile)) {
      return NextResponse.json({ error: '请输入正确的手机号' }, { status: 400 });
    }
    
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: '验证码格式不正确' }, { status: 400 });
    }
    
    if (!agreeTerms) {
      return NextResponse.json({ error: '请先阅读并同意用户协议和隐私政策' }, { status: 400 });
    }
    
    // 查找最新的有效验证码
    const { data: smsRecord, error: smsError } = await supabaseAdmin
      .from('sms_verification_codes')
      .select('*')
      .eq('mobile', mobile)
      .eq('purpose', 'login')
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (smsError || !smsRecord) {
      return NextResponse.json({ error: '验证码无效或已过期' }, { status: 400 });
    }
    
    // 检查错误次数
    if (smsRecord.error_count >= SMS_MAX_ERRORS) {
      return NextResponse.json({ error: '验证码错误次数过多，请重新获取' }, { status: 400 });
    }
    
    // 验证验证码
    if (smsRecord.code !== code) {
      // 增加错误计数
      await supabaseAdmin
        .from('sms_verification_codes')
        .update({ error_count: smsRecord.error_count + 1 })
        .eq('id', smsRecord.id);
      
      return NextResponse.json({ error: '验证码错误' }, { status: 400 });
    }
    
    // 标记验证码已使用
    await supabaseAdmin
      .from('sms_verification_codes')
      .update({ is_used: true, used_at: new Date().toISOString() })
      .eq('id', smsRecord.id);
    
    // 获取客户端IP
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown';
    
    // 检查用户是否已存在（通过cn_users表）
    const { data: existingCnUser } = await supabaseAdmin
      .from('cn_users')
      .select('id, status')
      .eq('mobile', mobile)
      .single();
    
    let userId: string;
    let isNewUser = false;
    let session: any;
    
    if (existingCnUser) {
      // 已有用户 - 检查状态
      if (existingCnUser.status === 'disabled' || existingCnUser.status === 'banned') {
        return NextResponse.json(
          { error: '账号已被限制使用，请联系客服', accountStatus: existingCnUser.status },
          { status: 403 }
        );
      }
      
      userId = existingCnUser.id;
      
      // 生成登录会话
      // 使用Supabase的signInWithPassword或自定义token
      // 这里我们使用admin API生成会话
      const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: `${mobile}@vetsphere.cn`, // 使用手机号生成虚拟邮箱
      });
      
      if (sessionError) {
        console.error('Error generating session:', sessionError);
        // 回退方案：直接用admin获取用户
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (userData?.user) {
          // 更新登录信息
          await supabaseAdmin
            .from('cn_users')
            .update({
              last_login_at: new Date().toISOString(),
              last_login_ip: ipAddress,
              login_count: (existingCnUser as any).login_count + 1 || 1,
            })
            .eq('id', userId);
        }
      }
      
      // 更新登录信息
      await supabaseAdmin
        .from('cn_users')
        .update({
          last_login_at: new Date().toISOString(),
          last_login_ip: ipAddress,
          mobile_verified: true,
        })
        .eq('id', userId);
      
    } else {
      // 新用户 - 创建账号
      isNewUser = true;
      
      // 使用虚拟邮箱创建Supabase用户
      const virtualEmail = `${mobile}@vetsphere.cn`;
      const tempPassword = `VS_${mobile}_${Date.now()}`; // 临时密码，用户可后续设置
      
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: virtualEmail,
        password: tempPassword,
        email_confirm: true,
        phone: mobile,
        phone_confirm: true,
        user_metadata: {
          mobile,
          registered_via: 'sms_code',
          site: 'cn',
        },
      });
      
      if (createError) {
        console.error('Error creating user:', createError);
        return NextResponse.json({ error: '注册失败，请稍后重试' }, { status: 500 });
      }
      
      userId = newUser.user.id;
      
      // 创建cn_users记录
      const { error: cnUserError } = await supabaseAdmin
        .from('cn_users')
        .insert({
          id: userId,
          mobile,
          mobile_verified: true,
          status: 'active',
          registered_at: new Date().toISOString(),
          last_login_at: new Date().toISOString(),
          last_login_ip: ipAddress,
          login_count: 1,
        });
      
      if (cnUserError) {
        console.error('Error creating cn_user:', cnUserError);
        // 不阻止登录，后续可修复
      }
      
      // 创建初始状态快照 - 新用户直接可用，无需强制身份选择
      await supabaseAdmin
        .from('cn_user_state_snapshots')
        .insert({
          user_id: userId,
          site_code: 'cn',
          onboarding_status: 'completed',
          verification_status: 'not_started',
          access_level: 'registered_basic',
          redirect_hint: 'go_home',
        });
      
      // 创建profiles记录（兼容现有系统）
      await supabaseAdmin
        .from('profiles')
        .upsert({
          id: userId,
          role: 'User',
          created_at: new Date().toISOString(),
        });
    }
    
    // 使用admin API直接为用户创建session token
    // 注意：这是一个简化实现，生产环境可能需要更安全的方案
    const { data: signInData, error: signInError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: `${mobile}@vetsphere.cn`,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      },
    });
    
    // 获取用户完整状态
    const { data: userState } = await supabaseAdmin
      .from('v_cn_user_full_state')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    // 始终查询真实的认证请求状态（不依赖快照/触发器）
    const { data: latestVerification } = await supabaseAdmin
      .from('cn_verification_requests')
      .select('status, reject_reason')
      .eq('user_id', userId)
      .eq('site_code', 'cn')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    const realVerificationStatus = latestVerification?.status || 'not_started';
    
    // 如果视图查询失败，返回基础状态
    const state = userState || {
      user_id: userId,
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
    
    // 用真实的认证状态覆盖快照中可能过时的值
    const identityGroupV2 = state.identity_group_v2;
    let realDoctorPrivilegeStatus = 'not_applicable';
    if (identityGroupV2 === 'doctor') {
      if (realVerificationStatus === 'approved') realDoctorPrivilegeStatus = 'approved';
      else if (['submitted', 'under_review'].includes(realVerificationStatus)) realDoctorPrivilegeStatus = 'pending_review';
      else if (realVerificationStatus === 'rejected') realDoctorPrivilegeStatus = 'rejected';
      else realDoctorPrivilegeStatus = 'not_started';
    }
    
    // 计算跳转提示 - 仅阻塞性条件才特殊跳转，其余一律首页
    let finalRedirectHint = 'go_home';
    if (!isNewUser) {
      if (state.redirect_hint === 'go_account_status') {
        finalRedirectHint = 'go_account_status';
      } else if (state.onboarding_status === 'identity_pending' && !state.identity_type) {
        finalRedirectHint = 'go_identity_select';
      }
    }
    
    // 计算双轨权限
    const doctorPrivilegeStatus = realDoctorPrivilegeStatus;
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
      isNewUser,
      user: {
        id: userId,
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
        status: isNewUser ? 'completed' : (state.onboarding_status || 'completed'),
        profileCompletionPercent: state.profile_completion_percent || 0,
      },
      verification: {
        required: state.verification_required || false,
        status: realVerificationStatus,
        rejectReason: latestVerification?.reject_reason || state.verification_reject_reason,
      },
      doctorAccess: {
        status: doctorPrivilegeStatus,
        rejectReason: doctorPrivilegeStatus === 'rejected' ? (latestVerification?.reject_reason || state.verification_reject_reason) : null,
      },
      permissions,
      access: {
        level: state.access_level,
        permissionFlags: state.permission_flags || permissions,
      },
      redirectHint: finalRedirectHint,
      // 返回用于前端登录的凭证
      // 注意：实际生产环境应该使用更安全的session管理
      authToken: signInData?.properties?.hashed_token,
    });
    
  } catch (err) {
    console.error('register-or-login-by-code error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
