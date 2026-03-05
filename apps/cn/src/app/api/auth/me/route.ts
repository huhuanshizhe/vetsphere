import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// identity_type -> identity_group_v2
function mapToGroupV2(identityType: string | null): string | null {
  if (!identityType) return null;
  const map: Record<string, string> = {
    veterinarian: 'doctor', assistant_doctor: 'doctor', rural_veterinarian: 'doctor',
    nurse_care: 'vet_related_staff', researcher_teacher: 'vet_related_staff', pet_service_staff: 'vet_related_staff',
    student: 'student_academic',
    industry_practitioner: 'other_related', enthusiast: 'other_related', other: 'other_related',
  };
  return map[identityType] || 'other_related';
}

// identity_type -> doctor_subtype
function mapToDoctorSubtype(identityType: string | null): string | null {
  if (!identityType) return null;
  if (['veterinarian', 'assistant_doctor', 'rural_veterinarian'].includes(identityType)) return identityType;
  return null;
}

// identity_group_v2 中文显示名
function getIdentityLabel(identityGroupV2: string | null, doctorSubtype: string | null): string {
  if (identityGroupV2 === 'doctor') {
    const subtypeLabels: Record<string, string> = {
      veterinarian: '执业兽医师', assistant_doctor: '助理兽医师', rural_veterinarian: '乡村兽医',
    };
    return doctorSubtype ? subtypeLabels[doctorSubtype] || '执业兽医' : '执业兽医';
  }
  const groupLabels: Record<string, string> = {
    vet_related_staff: '兽医相关从业人员', student_academic: '兽医相关专业学生/教研人员', other_related: '其他相关人员',
  };
  return identityGroupV2 ? groupLabels[identityGroupV2] || '用户' : '用户';
}

// 构建双轨权限
function buildPermissions(identityGroupV2: string | null, doctorPrivilegeStatus: string) {
  const isLoggedIn = true;
  const isDoctorApproved = identityGroupV2 === 'doctor' && doctorPrivilegeStatus === 'approved';
  return {
    can_access_user_center: isLoggedIn,
    can_purchase_courses: isLoggedIn,
    can_purchase_products: isLoggedIn,
    can_manage_orders: isLoggedIn,
    can_access_growth_system: isLoggedIn,
    can_access_doctor_workspace: isDoctorApproved,
    can_access_medical_features: isDoctorApproved,
    can_access_professional_courses: isDoctorApproved,
    can_view_restricted_product_info: isDoctorApproved,
  };
}

/**
 * GET /api/auth/me
 * 
 * 获取当前用户完整状态 - 双轨制核心接口
 * 
 * 返回结构:
 * - user: 基础用户信息
 * - identity: 身份信息（含V2分组）
 * - onboarding: 引导状态
 * - verification: 认证状态（旧字段，兼容）
 * - doctorAccess: 医生工作台权限状态
 * - permissions: 双轨权限标记
 * - access: 旧权限信息（兼容）
 * - redirectHint: 前端跳转提示
 */
export async function GET(request: NextRequest) {
  try {
    // 从请求头获取用户 token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        isLoggedIn: false,
        permissions: {
          can_access_user_center: false, can_purchase_courses: false,
          can_purchase_products: false, can_manage_orders: false,
          can_access_growth_system: false, can_access_doctor_workspace: false,
          can_access_medical_features: false, can_access_professional_courses: false,
          can_view_restricted_product_info: false,
        },
        redirectHint: 'go_login',
      });
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // 验证用户
    const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authUser) {
      return NextResponse.json({
        isLoggedIn: false,
        permissions: {
          can_access_user_center: false, can_purchase_courses: false,
          can_purchase_products: false, can_manage_orders: false,
          can_access_growth_system: false, can_access_doctor_workspace: false,
          can_access_medical_features: false, can_access_professional_courses: false,
          can_view_restricted_product_info: false,
        },
        redirectHint: 'go_login',
      });
    }
    
    // 获取CN用户信息
    const { data: cnUser } = await supabaseAdmin
      .from('cn_users')
      .select('*')
      .eq('id', authUser.id)
      .single();
    
    // 检查账号状态
    if (cnUser && (cnUser.status === 'disabled' || cnUser.status === 'banned')) {
      return NextResponse.json({
        isLoggedIn: true,
        user: { id: authUser.id, mobile: cnUser.mobile, status: cnUser.status },
        permissions: {
          can_access_user_center: false, can_purchase_courses: false,
          can_purchase_products: false, can_manage_orders: false,
          can_access_growth_system: false, can_access_doctor_workspace: false,
          can_access_medical_features: false, can_access_professional_courses: false,
          can_view_restricted_product_info: false,
        },
        redirectHint: 'go_account_status',
        accountStatusReason: cnUser.status === 'banned' ? '账号已被封禁' : '账号已被禁用',
      });
    }
    
    // 获取用户完整状态（通过视图）
    let userState: any = null;
    const { data: stateData, error: stateError } = await supabaseAdmin
      .from('v_cn_user_full_state')
      .select('*')
      .eq('user_id', authUser.id)
      .single();
    
    // 始终查询真实的认证请求状态（不依赖快照/触发器）
    const { data: latestVerification } = await supabaseAdmin
      .from('cn_verification_requests')
      .select('status, reject_reason')
      .eq('user_id', authUser.id)
      .eq('site_code', 'cn')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    const realVerificationStatus = latestVerification?.status || 'not_started';
    
    if (!stateError && stateData) {
      // 视图成功返回，但用真实的认证状态覆盖快照中可能过时的值
      const identityGroupV2FromView = stateData.identity_group_v2 || mapToGroupV2(stateData.identity_type);
      
      let realDoctorPrivilegeStatus = 'not_applicable';
      if (identityGroupV2FromView === 'doctor') {
        if (realVerificationStatus === 'approved') realDoctorPrivilegeStatus = 'approved';
        else if (['submitted', 'under_review'].includes(realVerificationStatus)) realDoctorPrivilegeStatus = 'pending_review';
        else if (realVerificationStatus === 'rejected') realDoctorPrivilegeStatus = 'rejected';
        else realDoctorPrivilegeStatus = 'not_started';
      }
      
      // 计算真实的 redirect_hint - 仅阻塞性条件
      let realRedirectHint = 'go_home';
      if (stateData.onboarding_status === 'identity_pending' && !stateData.identity_type) {
        realRedirectHint = 'go_identity_select';
      }
      
      userState = {
        ...stateData,
        verification_status: realVerificationStatus,
        verification_reject_reason: latestVerification?.reject_reason || stateData.verification_reject_reason,
        doctor_privilege_status: realDoctorPrivilegeStatus,
        redirect_hint: realRedirectHint,
        identity_verified_flag: realVerificationStatus === 'approved',
      };
    } else {
      // 视图不存在或查询失败，手动聚合状态
      const [profileRes, identityRes, verificationRes, snapshotRes] = await Promise.all([
        supabaseAdmin.from('cn_user_profiles').select('*').eq('user_id', authUser.id).eq('site_code', 'cn').single(),
        supabaseAdmin.from('cn_user_identity_profiles').select('*').eq('user_id', authUser.id).eq('site_code', 'cn').single(),
        supabaseAdmin.from('cn_verification_requests').select('*').eq('user_id', authUser.id).eq('site_code', 'cn').order('created_at', { ascending: false }).limit(1).single(),
        supabaseAdmin.from('cn_user_state_snapshots').select('*').eq('user_id', authUser.id).eq('site_code', 'cn').single(),
      ]);
      
      const profile = profileRes.data;
      const identity = identityRes.data;
      const verification = verificationRes.data;
      const snapshot = snapshotRes.data;
      
      // 计算onboarding状态 - 身份选择是可选的
      let onboardingStatus = 'completed';
      if (snapshot?.onboarding_status === 'identity_pending') {
        onboardingStatus = 'identity_pending';
      } else if (snapshot?.onboarding_status === 'profile_pending') {
        onboardingStatus = 'profile_pending';
      }
      
      // 仅3种医生需要认证
      const verificationRequired = identity && ['veterinarian', 'assistant_doctor', 'rural_veterinarian'].includes(identity.identity_type);
      const verificationStatus = verification?.status || 'not_started';
      
      // 计算V2字段
      const identityGroupV2 = identity ? mapToGroupV2(identity.identity_type) : null;
      const doctorSubtype = identity ? mapToDoctorSubtype(identity.identity_type) : null;
      
      // 计算 doctor_privilege_status
      let doctorPrivilegeStatus = 'not_applicable';
      if (identityGroupV2 === 'doctor') {
        if (verificationStatus === 'approved') doctorPrivilegeStatus = 'approved';
        else if (['submitted', 'under_review'].includes(verificationStatus)) doctorPrivilegeStatus = 'pending_review';
        else if (verificationStatus === 'rejected') doctorPrivilegeStatus = 'rejected';
        else doctorPrivilegeStatus = 'not_started';
      }
      
      // 计算access_level
      let accessLevel = 'registered_basic';
      if (onboardingStatus === 'completed') {
        if (verificationStatus === 'approved') accessLevel = 'verified_professional';
        else if (['submitted', 'under_review'].includes(verificationStatus)) accessLevel = 'verification_pending';
        else accessLevel = 'profiled_user';
      }
      
      // 计算redirect_hint - 仅阻塞性条件才特殊跳转
      let redirectHint = 'go_home';
      
      if (snapshot?.redirect_hint === 'go_identity_select' && onboardingStatus === 'identity_pending' && !identity) {
        redirectHint = 'go_identity_select';
      }
      // 认证状态（pending/rejected）不再作为阻塞式跳转 - 用户可通过入口主动查看
      
      userState = {
        user_id: authUser.id,
        mobile: cnUser?.mobile || authUser.phone,
        user_status: cnUser?.status || 'active',
        display_name: profile?.display_name,
        avatar_file_id: profile?.avatar_file_id,
        real_name: profile?.real_name,
        organization_name: profile?.organization_name,
        profile_completion_percent: profile?.profile_completion_percent || 0,
        identity_type: identity?.identity_type,
        identity_group: identity?.identity_group,
        identity_group_v2: identityGroupV2,
        doctor_subtype: doctorSubtype,
        onboarding_status: onboardingStatus,
        verification_status: verificationStatus,
        verification_required: verificationRequired,
        verification_reject_reason: verification?.reject_reason,
        identity_verified_flag: verificationStatus === 'approved',
        access_level: accessLevel,
        permission_flags: buildPermissions(identityGroupV2, doctorPrivilegeStatus),
        redirect_hint: redirectHint,
        doctor_privilege_status: doctorPrivilegeStatus,
      };
      
      // 更新或创建状态快照
      await supabaseAdmin
        .from('cn_user_state_snapshots')
        .upsert({
          user_id: authUser.id,
          site_code: 'cn',
          onboarding_status: userState.onboarding_status,
          identity_type: userState.identity_type,
          identity_group: userState.identity_group,
          identity_group_v2: userState.identity_group_v2,
          doctor_subtype: userState.doctor_subtype,
          verification_status: userState.verification_status,
          verification_required: userState.verification_required,
          verification_reject_reason: userState.verification_reject_reason,
          identity_verified_flag: userState.identity_verified_flag,
          access_level: userState.access_level,
          permission_flags: userState.permission_flags,
          redirect_hint: userState.redirect_hint,
          doctor_privilege_status: userState.doctor_privilege_status,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,site_code',
        });
    }
    
    // 计算V2派生字段（视图路径也需要）
    const identityGroupV2 = userState.identity_group_v2 || mapToGroupV2(userState.identity_type);
    const doctorSubtype = userState.doctor_subtype || mapToDoctorSubtype(userState.identity_type);
    const doctorPrivilegeStatus = userState.doctor_privilege_status || 'not_applicable';
    const identityLabel = getIdentityLabel(identityGroupV2, doctorSubtype);
    const permissions = buildPermissions(identityGroupV2, doctorPrivilegeStatus);
    
    // 构建响应
    return NextResponse.json({
      isLoggedIn: true,
      user: {
        id: userState.user_id,
        mobile: userState.mobile,
        status: userState.user_status,
        displayName: userState.display_name,
        avatarUrl: userState.avatar_file_id,
        realName: userState.real_name,
        organizationName: userState.organization_name,
      },
      identity: {
        identityType: userState.identity_type,
        identityGroup: userState.identity_group,
        identityGroupV2: identityGroupV2,
        doctorSubtype: doctorSubtype,
        identityLabel: identityLabel,
        identityVerifiedFlag: userState.identity_verified_flag,
      },
      onboarding: {
        status: userState.onboarding_status,
        profileCompletionPercent: userState.profile_completion_percent || 0,
      },
      verification: {
        required: userState.verification_required || false,
        status: userState.verification_status,
        rejectReason: userState.verification_reject_reason,
      },
      // 新增: 医生工作台权限
      doctorAccess: {
        status: doctorPrivilegeStatus,
        rejectReason: doctorPrivilegeStatus === 'rejected' ? userState.verification_reject_reason : null,
      },
      // 新增: 双轨权限标记
      permissions,
      // 旧字段保留兼容
      access: {
        level: userState.access_level,
        permissionFlags: userState.permission_flags || permissions,
      },
      redirectHint: userState.redirect_hint,
    });
    
  } catch (err) {
    console.error('GET /api/auth/me error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
