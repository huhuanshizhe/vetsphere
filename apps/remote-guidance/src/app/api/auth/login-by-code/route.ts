import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { getSupabaseAdmin } from '@/lib/server/guidance-api';

const SMS_MAX_ERRORS = 5;
const DEMO_MOBILE = process.env.DEMO_TEST_MOBILE || '13800000000';

/**
 * 为每个用户派生确定性的稳定密码。
 * 使用 SUPABASE_SERVICE_ROLE_KEY 的前 32 字节作为 HMAC key，userId 作为消息。
 * 同一用户始终得到相同密码，避免每次登录都重置密码导致 session 失效。
 */
function deriveStablePassword(userId: string): string {
  const secret = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').slice(0, 32);
  return 'VS_' + createHmac('sha256', secret).update(userId).digest('hex').slice(0, 40);
}

function isValidMobile(mobile: string) {
  return /^1[3-9]\d{9}$/.test(mobile);
}

async function ensureDemoDoctorAccount(userId: string, mobile: string) {
  if (mobile !== DEMO_MOBILE) {
    return;
  }

  const supabaseAdmin = getSupabaseAdmin();
  const now = new Date().toISOString();

  await Promise.all([
    supabaseAdmin.from('cn_user_identity_profiles').upsert(
      {
        user_id: userId,
        site_code: 'cn',
        identity_type: 'veterinarian',
        identity_group: 'professional',
        identity_group_v2: 'doctor',
        doctor_subtype: 'veterinarian',
        identity_selected_at: now,
        identity_selection_source: 'profile_edit',
        updated_at: now,
      },
      { onConflict: 'user_id,site_code' },
    ),
    supabaseAdmin.from('cn_user_profiles').upsert(
      {
        user_id: userId,
        site_code: 'cn',
        display_name: '医生测试账号',
        real_name: '医生测试账号',
        organization_name: 'VetSphere Demo Clinic',
        job_title: '执业兽医师',
        profile_completion_percent: 100,
        profile_completion_status: 'complete',
        updated_at: now,
      },
      { onConflict: 'user_id,site_code' },
    ),
    supabaseAdmin.from('profiles').upsert({
      id: userId,
      role: 'Doctor',
      full_name: '医生测试账号',
      updated_at: now,
    }),
  ]);

  await supabaseAdmin.from('cn_verification_requests').insert({
    user_id: userId,
    site_code: 'cn',
    verification_type: 'veterinarian',
    status: 'approved',
    real_name: '医生测试账号',
    organization_name: 'VetSphere Demo Clinic',
    position_title: '执业兽医师',
    specialty_tags: ['demo'],
    agree_verification_statement: true,
    submitted_at: now,
    reviewed_at: now,
    approved_level: 'demo_doctor',
    updated_at: now,
  });

  await supabaseAdmin.from('cn_user_state_snapshots').upsert(
    {
      user_id: userId,
      site_code: 'cn',
      onboarding_status: 'completed',
      identity_type: 'veterinarian',
      identity_group: 'professional',
      identity_group_v2: 'doctor',
      doctor_subtype: 'veterinarian',
      identity_verified_flag: true,
      verification_status: 'approved',
      verification_required: true,
      verification_reject_reason: null,
      access_level: 'verified_professional',
      permission_flags: {
        can_access_user_center: true,
        can_purchase_courses: true,
        can_purchase_products: true,
        can_manage_orders: true,
        can_access_growth_system: true,
        can_access_doctor_workspace: true,
        can_access_medical_features: true,
        can_access_professional_courses: true,
        can_view_restricted_product_info: true,
      },
      redirect_hint: 'go_home',
      doctor_privilege_status: 'approved',
      updated_at: now,
    },
    { onConflict: 'user_id,site_code' },
  );
}

async function buildLoginPayload(
  userId: string,
  mobile: string,
  session: { access_token: string; refresh_token: string; expires_at?: number | null },
) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data: cnUser } = await supabaseAdmin
    .from('cn_users')
    .select('mobile, status')
    .eq('id', userId)
    .maybeSingle();

  const { data: userState } = await supabaseAdmin
    .from('v_cn_user_full_state')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  const { data: latestVerification } = await supabaseAdmin
    .from('cn_verification_requests')
    .select('status, reject_reason')
    .eq('user_id', userId)
    .eq('site_code', 'cn')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const realVerificationStatus = latestVerification?.status || 'not_started';
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
    permission_flags: {},
  };

  const identityGroupV2 = state.identity_group_v2;
  let realDoctorPrivilegeStatus = 'not_applicable';
  if (identityGroupV2 === 'doctor') {
    if (realVerificationStatus === 'approved') realDoctorPrivilegeStatus = 'approved';
    else if (['submitted', 'under_review'].includes(realVerificationStatus))
      realDoctorPrivilegeStatus = 'pending_review';
    else if (realVerificationStatus === 'rejected') realDoctorPrivilegeStatus = 'rejected';
    else realDoctorPrivilegeStatus = 'not_started';
  }

  const isDoctorApproved = identityGroupV2 === 'doctor' && realDoctorPrivilegeStatus === 'approved';
  const rawPermissionFlags = state.permission_flags || {};
  const canAccessDoctorWorkspace =
    Boolean(rawPermissionFlags.can_access_doctor_workspace) || isDoctorApproved;

  const permissions = {
    can_access_user_center: true,
    can_purchase_courses: true,
    can_purchase_products: true,
    can_manage_orders: true,
    can_access_growth_system: true,
    can_access_doctor_workspace: canAccessDoctorWorkspace,
    can_access_medical_features:
      Boolean(rawPermissionFlags.can_access_medical_features) || canAccessDoctorWorkspace,
    can_access_professional_courses:
      Boolean(rawPermissionFlags.can_access_professional_courses) || canAccessDoctorWorkspace,
    can_view_restricted_product_info:
      Boolean(rawPermissionFlags.can_view_restricted_product_info) || canAccessDoctorWorkspace,
  };

  return {
    success: true,
    user: {
      id: userId,
      mobile,
      status: cnUser?.status || state.user_status,
      displayName: state.display_name,
      avatarUrl: state.avatar_file_id,
    },
    identity: {
      identityType: state.identity_type,
      identityGroup: state.identity_group,
      identityGroupV2,
      doctorSubtype: state.doctor_subtype,
      identityVerifiedFlag: state.identity_verified_flag,
    },
    verification: {
      required: state.verification_required || false,
      status: realVerificationStatus,
      rejectReason: latestVerification?.reject_reason || state.verification_reject_reason,
    },
    doctorAccess: {
      status: realDoctorPrivilegeStatus,
      rejectReason:
        realDoctorPrivilegeStatus === 'rejected'
          ? latestVerification?.reject_reason || state.verification_reject_reason
          : null,
    },
    permissions,
    redirectHint: canAccessDoctorWorkspace ? 'go_home' : 'go_doctor_verification',
    session: {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at,
    },
  };
}

export async function POST(request: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin();

  try {
    const body = await request.json();
    const mobile = String(body?.mobile || '').trim();
    const code = String(body?.code || '').trim();

    if (!mobile || !code) {
      return NextResponse.json({ error: '请输入手机号和验证码。' }, { status: 400 });
    }

    if (!isValidMobile(mobile)) {
      return NextResponse.json({ error: '请输入正确的手机号。' }, { status: 400 });
    }

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: '验证码格式不正确。' }, { status: 400 });
    }

    const { data: smsRecord, error: smsError } = await supabaseAdmin
      .from('sms_verification_codes')
      .select('*')
      .eq('mobile', mobile)
      .eq('purpose', 'login')
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (smsError || !smsRecord) {
      return NextResponse.json({ error: '验证码无效或已过期。' }, { status: 400 });
    }

    if ((smsRecord.error_count || 0) >= SMS_MAX_ERRORS) {
      return NextResponse.json({ error: '验证码错误次数过多，请重新获取。' }, { status: 400 });
    }

    if (smsRecord.code !== code) {
      await supabaseAdmin
        .from('sms_verification_codes')
        .update({ error_count: (smsRecord.error_count || 0) + 1 })
        .eq('id', smsRecord.id);

      return NextResponse.json({ error: '验证码错误。' }, { status: 400 });
    }

    await supabaseAdmin
      .from('sms_verification_codes')
      .update({ is_used: true, used_at: new Date().toISOString() })
      .eq('id', smsRecord.id);

    const forwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown';
    const virtualEmail = `${mobile}@vetsphere.cn`;

    const { data: existingCnUser } = await supabaseAdmin
      .from('cn_users')
      .select('id, status, login_count')
      .eq('mobile', mobile)
      .maybeSingle();

    let userId = '';
    if (existingCnUser) {
      if (['disabled', 'banned'].includes(existingCnUser.status)) {
        return NextResponse.json(
          { error: '账号已被限制使用，请联系管理员。', accountStatus: existingCnUser.status },
          { status: 403 },
        );
      }

      userId = existingCnUser.id;

      // 仅更新非密码字段（email/phone confirm、metadata），不重置密码，
      // 避免 updateUserById 使所有现有 session 的 refresh token 失效。
      const { error: updateAuthUserError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        email: virtualEmail,
        phone: mobile,
        email_confirm: true,
        phone_confirm: true,
        user_metadata: {
          mobile,
          registered_via: 'sms_code',
          site: 'cn',
        },
      });

      if (updateAuthUserError) {
        console.error('guidance login-by-code update auth user error:', updateAuthUserError);
        return NextResponse.json({ error: '同步登录账号失败，请稍后重试。' }, { status: 500 });
      }

      await supabaseAdmin
        .from('cn_users')
        .update({
          last_login_at: new Date().toISOString(),
          last_login_ip: ipAddress,
          mobile_verified: true,
          login_count: (existingCnUser.login_count || 0) + 1,
        })
        .eq('id', userId);
    } else {
      // 新用户：使用确定性 stable 密码创建（此时还没有 userId，先占位后再派生）
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: virtualEmail,
        // 新用户创建时暂用随机密码，后续立刻用 stable 密码覆盖
        password: `VS_INIT_${Date.now()}`,
        email_confirm: true,
        phone: mobile,
        phone_confirm: true,
        user_metadata: {
          mobile,
          registered_via: 'sms_code',
          site: 'cn',
        },
      });

      if (createError || !newUser?.user) {
        console.error('guidance login-by-code create user error:', createError);
        return NextResponse.json({ error: '注册失败，请稍后重试。' }, { status: 500 });
      }

      userId = newUser.user.id;

      // 立刻将密码设置为 stable 密码（只有新用户首次，不影响已有 session）
      const stablePassword = deriveStablePassword(userId);
      await supabaseAdmin.auth.admin.updateUserById(userId, { password: stablePassword });

      await supabaseAdmin.from('cn_users').insert({
        id: userId,
        mobile,
        mobile_verified: true,
        status: 'active',
        registered_at: new Date().toISOString(),
        last_login_at: new Date().toISOString(),
        last_login_ip: ipAddress,
        login_count: 1,
      });

      await supabaseAdmin.from('cn_user_state_snapshots').insert({
        user_id: userId,
        site_code: 'cn',
        onboarding_status: 'completed',
        verification_status: 'not_started',
        access_level: 'registered_basic',
        redirect_hint: 'go_home',
      });

      await supabaseAdmin.from('profiles').upsert({
        id: userId,
        role: 'User',
        created_at: new Date().toISOString(),
      });
    }

    await ensureDemoDoctorAccount(userId, mobile);

    // 使用 stable 密码登录，不再每次重置密码，避免使现有 session 失效
    const stablePassword = deriveStablePassword(userId);
    let signInResult = await supabaseAdmin.auth.signInWithPassword({
      email: virtualEmail,
      password: stablePassword,
    });

    // 如果 stable 密码不匹配（历史遗留旧密码），重置一次再登录
    if (signInResult.error) {
      console.warn(
        'guidance login-by-code: stable password mismatch, resetting password once',
        signInResult.error.message,
      );
      await supabaseAdmin.auth.admin.updateUserById(userId, { password: stablePassword });
      signInResult = await supabaseAdmin.auth.signInWithPassword({
        email: virtualEmail,
        password: stablePassword,
      });
    }

    const signInData = signInResult.data;
    const signInError = signInResult.error;

    if (signInError || !signInData?.session) {
      console.error('guidance login-by-code sign-in error:', signInError);
      return NextResponse.json({ error: '验证码校验成功，但登录会话创建失败。' }, { status: 500 });
    }

    const payload = await buildLoginPayload(userId, mobile, signInData.session);
    return NextResponse.json(payload);
  } catch (error) {
    console.error('guidance login-by-code error:', error);
    return NextResponse.json({ error: '服务器错误，请稍后重试。' }, { status: 500 });
  }
}
