import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// 计算资料完成度
function calculateProfileCompletion(profile: any, identityType: string | null): number {
  let score = 0;
  let total = 0;
  
  // 基础字段
  const baseFields = [
    { field: 'display_name', weight: 20, required: true },
    { field: 'organization_name', weight: 15, required: true },
    { field: 'avatar_file_id', weight: 10, required: false },
    { field: 'city_code', weight: 5, required: false },
    { field: 'job_title', weight: 10, required: false },
    { field: 'experience_years', weight: 5, required: false },
    { field: 'interest_tags', weight: 10, required: false },
    { field: 'bio', weight: 5, required: false },
  ];
  
  baseFields.forEach(({ field, weight }) => {
    total += weight;
    const value = profile[field];
    if (value && (typeof value !== 'object' || (Array.isArray(value) && value.length > 0))) {
      score += weight;
    }
  });
  
  // 身份动态字段额外加分
  if (profile.identity_fields && Object.keys(profile.identity_fields).length > 0) {
    score += 20;
  }
  total += 20;
  
  return Math.min(100, Math.round((score / total) * 100));
}

// 判断是否需要认证
function isVerificationRequired(identityType: string | null): boolean {
  if (!identityType) return false;
  return ['veterinarian', 'assistant_doctor', 'nurse_care', 'student', 'researcher_teacher'].includes(identityType);
}

/**
 * GET /api/user/profile
 * 获取用户资料
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: '无效的认证令牌' }, { status: 401 });
    }
    
    // 获取资料
    const { data: profile } = await supabaseAdmin
      .from('cn_user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .eq('site_code', 'cn')
      .single();
    
    // 获取身份
    const { data: identity } = await supabaseAdmin
      .from('cn_user_identity_profiles')
      .select('identity_type, identity_group')
      .eq('user_id', user.id)
      .eq('site_code', 'cn')
      .single();
    
    if (!profile) {
      return NextResponse.json({
        profile: null,
        identity: identity ? {
          identityType: identity.identity_type,
          identityGroup: identity.identity_group,
        } : null,
        completionPercent: 0,
      });
    }
    
    return NextResponse.json({
      profile: {
        displayName: profile.display_name,
        realName: profile.real_name,
        avatarFileId: profile.avatar_file_id,
        gender: profile.gender,
        cityCode: profile.city_code,
        organizationName: profile.organization_name,
        jobTitle: profile.job_title,
        experienceYears: profile.experience_years,
        interestTags: profile.interest_tags || [],
        bio: profile.bio,
        identityFields: profile.identity_fields || {},
      },
      identity: identity ? {
        identityType: identity.identity_type,
        identityGroup: identity.identity_group,
      } : null,
      completionPercent: profile.profile_completion_percent || 0,
    });
    
  } catch (err) {
    console.error('GET /api/user/profile error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

/**
 * PUT /api/user/profile
 * 更新用户资料
 */
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: '无效的认证令牌' }, { status: 401 });
    }
    
    const body = await request.json();
    const {
      displayName,
      realName,
      avatarFileId,
      gender,
      cityCode,
      organizationName,
      jobTitle,
      experienceYears,
      interestTags,
      bio,
      identityFields,
    } = body;
    
    // 基础校验
    if (!displayName || displayName.trim() === '') {
      return NextResponse.json({ error: '请填写显示名称' }, { status: 400 });
    }
    
    if (displayName.length > 30) {
      return NextResponse.json({ error: '显示名称不能超过30个字符' }, { status: 400 });
    }
    
    // 获取身份信息
    const { data: identity } = await supabaseAdmin
      .from('cn_user_identity_profiles')
      .select('identity_type, identity_group')
      .eq('user_id', user.id)
      .eq('site_code', 'cn')
      .single();
    
    // 专业类用户需要填写机构名称
    if (identity && ['professional', 'student'].includes(identity.identity_group)) {
      if (!organizationName || organizationName.trim() === '') {
        return NextResponse.json({ error: '请填写所属机构名称' }, { status: 400 });
      }
    }
    
    // 构建更新数据
    const updateData: any = {
      display_name: displayName.trim(),
      updated_at: new Date().toISOString(),
    };
    
    if (realName !== undefined) updateData.real_name = realName?.trim() || null;
    if (avatarFileId !== undefined) updateData.avatar_file_id = avatarFileId || null;
    if (gender !== undefined) updateData.gender = gender || null;
    if (cityCode !== undefined) updateData.city_code = cityCode || null;
    if (organizationName !== undefined) updateData.organization_name = organizationName?.trim() || null;
    if (jobTitle !== undefined) updateData.job_title = jobTitle?.trim() || null;
    if (experienceYears !== undefined) updateData.experience_years = experienceYears;
    if (interestTags !== undefined) updateData.interest_tags = interestTags || [];
    if (bio !== undefined) updateData.bio = bio?.trim() || null;
    if (identityFields !== undefined) updateData.identity_fields = identityFields || {};
    
    // 计算完成度
    const completionPercent = calculateProfileCompletion(updateData, identity?.identity_type);
    updateData.profile_completion_percent = completionPercent;
    updateData.profile_completion_status = completionPercent >= 80 ? 'complete' : completionPercent >= 40 ? 'basic' : 'incomplete';
    
    // 检查是否已有资料记录
    const { data: existing } = await supabaseAdmin
      .from('cn_user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .eq('site_code', 'cn')
      .single();
    
    if (existing) {
      // 更新
      const { error: updateError } = await supabaseAdmin
        .from('cn_user_profiles')
        .update(updateData)
        .eq('id', existing.id);
      
      if (updateError) {
        console.error('Error updating profile:', updateError);
        return NextResponse.json({ error: '资料保存失败' }, { status: 500 });
      }
    } else {
      // 创建
      const { error: insertError } = await supabaseAdmin
        .from('cn_user_profiles')
        .insert({
          user_id: user.id,
          site_code: 'cn',
          ...updateData,
        });
      
      if (insertError) {
        console.error('Error inserting profile:', insertError);
        return NextResponse.json({ error: '资料保存失败' }, { status: 500 });
      }
    }
    
    // 判断是否需要认证
    const verificationRequired = isVerificationRequired(identity?.identity_type);
    
    // 计算下一步
    let nextStep = 'home';
    let redirectHint = 'go_home';
    
    if (verificationRequired) {
      nextStep = 'verification_apply';
      redirectHint = 'show_verification_prompt';
    }
    
    // 更新状态快照
    await supabaseAdmin
      .from('cn_user_state_snapshots')
      .upsert({
        user_id: user.id,
        site_code: 'cn',
        onboarding_status: 'completed',
        verification_required: verificationRequired,
        access_level: 'profiled_user',
        redirect_hint: redirectHint,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,site_code',
      });
    
    return NextResponse.json({
      success: true,
      completionPercent,
      completionStatus: updateData.profile_completion_status,
      nextStep,
      redirectHint,
      verificationRequired,
    });
    
  } catch (err) {
    console.error('PUT /api/user/profile error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
