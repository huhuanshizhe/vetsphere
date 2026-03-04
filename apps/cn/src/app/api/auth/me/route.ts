import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/auth/me
 * 
 * 获取当前用户完整状态 - 这是前端状态分流的核心接口
 * 
 * 返回结构:
 * - user: 基础用户信息
 * - identity: 身份信息
 * - onboarding: 引导状态
 * - verification: 认证状态
 * - access: 权限信息
 * - redirectHint: 前端跳转提示
 */
export async function GET(request: NextRequest) {
  try {
    // 从请求头获取用户 token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        isLoggedIn: false,
        access: {
          level: 'guest',
          permissionFlags: {
            can_access_growth_system: false,
            can_access_professional_courses: false,
            can_submit_professional_application: false,
            can_view_restricted_product_info: false,
          },
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
        access: {
          level: 'guest',
          permissionFlags: {
            can_access_growth_system: false,
            can_access_professional_courses: false,
            can_submit_professional_application: false,
            can_view_restricted_product_info: false,
          },
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
        user: {
          id: authUser.id,
          mobile: cnUser.mobile,
          status: cnUser.status,
        },
        access: {
          level: 'guest',
          permissionFlags: {},
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
    
    if (!stateError && stateData) {
      userState = stateData;
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
      
      // 计算onboarding状态
      let onboardingStatus = 'not_started';
      if (!identity) {
        onboardingStatus = 'identity_pending';
      } else if (!profile || !profile.display_name) {
        onboardingStatus = 'profile_pending';
      } else {
        onboardingStatus = 'completed';
      }
      
      // 判断是否需要认证
      const verificationRequired = identity && ['veterinarian', 'assistant_doctor', 'nurse_care', 'student', 'researcher_teacher'].includes(identity.identity_type);
      
      // 获取认证状态
      const verificationStatus = verification?.status || 'not_started';
      
      // 计算access_level
      let accessLevel = 'registered_basic';
      if (onboardingStatus === 'completed') {
        if (verificationStatus === 'approved') {
          accessLevel = 'verified_professional';
        } else if (['submitted', 'under_review'].includes(verificationStatus)) {
          accessLevel = 'verification_pending';
        } else {
          accessLevel = 'profiled_user';
        }
      }
      
      // 计算redirect_hint
      let redirectHint = 'go_home';
      if (onboardingStatus === 'identity_pending') {
        redirectHint = 'go_identity_select';
      } else if (onboardingStatus === 'profile_pending') {
        redirectHint = 'go_profile_complete';
      } else if (verificationStatus === 'rejected') {
        redirectHint = 'show_rejection_prompt';
      } else if (verificationRequired && ['not_started', 'draft'].includes(verificationStatus)) {
        redirectHint = 'show_verification_prompt';
      } else if (['submitted', 'under_review'].includes(verificationStatus)) {
        redirectHint = 'show_verification_pending';
      }
      
      // 计算权限标记
      const permissionFlags = {
        can_access_growth_system: accessLevel !== 'guest' && accessLevel !== 'registered_basic',
        can_access_professional_courses: accessLevel === 'verified_professional',
        can_submit_professional_application: accessLevel === 'profiled_user' && verificationRequired,
        can_view_restricted_product_info: accessLevel === 'verified_professional',
      };
      
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
        onboarding_status: onboardingStatus,
        verification_status: verificationStatus,
        verification_required: verificationRequired,
        verification_reject_reason: verification?.reject_reason,
        identity_verified_flag: verificationStatus === 'approved',
        access_level: accessLevel,
        permission_flags: permissionFlags,
        redirect_hint: redirectHint,
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
          verification_status: userState.verification_status,
          verification_required: userState.verification_required,
          verification_reject_reason: userState.verification_reject_reason,
          identity_verified_flag: userState.identity_verified_flag,
          access_level: userState.access_level,
          permission_flags: userState.permission_flags,
          redirect_hint: userState.redirect_hint,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,site_code',
        });
    }
    
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
      access: {
        level: userState.access_level,
        permissionFlags: userState.permission_flags || {},
      },
      redirectHint: userState.redirect_hint,
    });
    
  } catch (err) {
    console.error('GET /api/auth/me error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
