import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// 有效的身份类型
const VALID_IDENTITY_TYPES = [
  'veterinarian',
  'assistant_doctor',
  'rural_veterinarian',
  'nurse_care',
  'student',
  'researcher_teacher',
  'pet_service_staff',
  'industry_practitioner',
  'enthusiast',
  'other',
];

// 有效的 V2 粗分类
const VALID_IDENTITY_GROUPS_V2 = ['doctor', 'vet_related_staff', 'student_academic', 'other_related'];

// 有效的医生子类型
const VALID_DOCTOR_SUBTYPES = ['veterinarian', 'assistant_doctor', 'rural_veterinarian'];

// 身份类型到分组的映射 (旧)
function mapIdentityTypeToGroup(identityType: string): string {
  const mapping: Record<string, string> = {
    veterinarian: 'professional',
    assistant_doctor: 'professional',
    rural_veterinarian: 'professional',
    nurse_care: 'professional',
    student: 'student',
    researcher_teacher: 'industry_related',
    pet_service_staff: 'industry_related',
    industry_practitioner: 'industry_related',
    enthusiast: 'general',
    other: 'general',
  };
  return mapping[identityType] || 'general';
}

// identity_type -> identity_group_v2
function mapToGroupV2(identityType: string): string {
  const map: Record<string, string> = {
    veterinarian: 'doctor', assistant_doctor: 'doctor', rural_veterinarian: 'doctor',
    nurse_care: 'vet_related_staff', researcher_teacher: 'vet_related_staff', pet_service_staff: 'vet_related_staff',
    student: 'student_academic',
    industry_practitioner: 'other_related', enthusiast: 'other_related', other: 'other_related',
  };
  return map[identityType] || 'other_related';
}

// identity_type -> doctor_subtype
function mapToDoctorSubtype(identityType: string): string | null {
  if (['veterinarian', 'assistant_doctor', 'rural_veterinarian'].includes(identityType)) return identityType;
  return null;
}

// 判断是否需要认证
function isVerificationRequired(identityType: string): boolean {
  // 只有3种医生身份需要认证（用于医生工作台）
  return ['veterinarian', 'assistant_doctor', 'rural_veterinarian'].includes(identityType);
}

// V2粗分类 -> 默认 identity_type（从粗分类选择时使用）
function groupV2ToDefaultIdentityType(groupV2: string, doctorSubtype?: string): string | null {
  if (groupV2 === 'doctor' && doctorSubtype) return doctorSubtype;
  const defaults: Record<string, string> = {
    vet_related_staff: 'pet_service_staff',
    student_academic: 'student',
    other_related: 'other',
  };
  return defaults[groupV2] || null;
}

/**
 * POST /api/user/identity
 * 保存用户身份选择
 * 支持两种模式：
 * 1. 旧模式: { identityType } - 直接指定10种之一
 * 2. 新模式: { identityGroupV2, doctorSubtype? } - 使用4粗分类
 */
export async function POST(request: NextRequest) {
  try {
    // 验证用户
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
    const { identityType: rawIdentityType, identityGroupV2: rawGroupV2, doctorSubtype: rawSubtype, source = 'first_login' } = body;
    
    let identityType: string;
    let identityGroupV2: string;
    let doctorSubtype: string | null;

    if (rawGroupV2 && VALID_IDENTITY_GROUPS_V2.includes(rawGroupV2)) {
      // 新模式: V2粗分类
      identityGroupV2 = rawGroupV2;
      if (rawGroupV2 === 'doctor') {
        if (!rawSubtype || !VALID_DOCTOR_SUBTYPES.includes(rawSubtype)) {
          return NextResponse.json({ error: '请选择医生子类型' }, { status: 400 });
        }
        doctorSubtype = rawSubtype;
        identityType = rawSubtype; // doctor_subtype 就是 identity_type
      } else {
        doctorSubtype = null;
        identityType = groupV2ToDefaultIdentityType(rawGroupV2) || 'other';
      }
    } else if (rawIdentityType && VALID_IDENTITY_TYPES.includes(rawIdentityType)) {
      // 旧模式: 直接指定 identityType，自动推导 V2 字段
      identityType = rawIdentityType;
      identityGroupV2 = mapToGroupV2(identityType);
      doctorSubtype = mapToDoctorSubtype(identityType);
    } else {
      return NextResponse.json({ error: '请选择身份类型' }, { status: 400 });
    }
    
    const identityGroup = mapIdentityTypeToGroup(identityType);
    const verificationRequired = isVerificationRequired(identityType);
    
    // 检查是否已有身份记录
    const { data: existing } = await supabaseAdmin
      .from('cn_user_identity_profiles')
      .select('id')
      .eq('user_id', user.id)
      .eq('site_code', 'cn')
      .single();
    
    const identityData = {
      identity_type: identityType,
      identity_group: identityGroup,
      identity_group_v2: identityGroupV2,
      doctor_subtype: doctorSubtype,
      identity_selected_at: new Date().toISOString(),
      identity_selection_source: source,
    };

    if (existing) {
      const { error: updateError } = await supabaseAdmin
        .from('cn_user_identity_profiles')
        .update(identityData)
        .eq('id', existing.id);
      
      if (updateError) {
        console.error('Error updating identity:', updateError);
        return NextResponse.json({ error: '身份保存失败' }, { status: 500 });
      }
    } else {
      const { error: insertError } = await supabaseAdmin
        .from('cn_user_identity_profiles')
        .insert({
          user_id: user.id,
          site_code: 'cn',
          ...identityData,
        });
      
      if (insertError) {
        console.error('Error inserting identity:', insertError);
        return NextResponse.json({ error: '身份保存失败' }, { status: 500 });
      }
    }
    
    // 手动更新状态快照
    const { data: currentSnapshot } = await supabaseAdmin
      .from('cn_user_state_snapshots')
      .select('onboarding_status')
      .eq('user_id', user.id)
      .eq('site_code', 'cn')
      .single();
    
    const onboardingStatus = (currentSnapshot?.onboarding_status === 'completed') 
      ? 'completed' 
      : 'profile_pending';
    const redirectHint = (currentSnapshot?.onboarding_status === 'completed')
      ? 'go_home'
      : 'go_profile_complete';
    
    // doctor_privilege_status: doctor -> not_started, 其他 -> not_applicable
    const doctorPrivilegeStatus = identityGroupV2 === 'doctor' ? 'not_started' : 'not_applicable';
    
    await supabaseAdmin
      .from('cn_user_state_snapshots')
      .upsert({
        user_id: user.id,
        site_code: 'cn',
        identity_type: identityType,
        identity_group: identityGroup,
        identity_group_v2: identityGroupV2,
        doctor_subtype: doctorSubtype,
        onboarding_status: onboardingStatus,
        verification_required: verificationRequired,
        doctor_privilege_status: doctorPrivilegeStatus,
        redirect_hint: redirectHint,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,site_code',
      });
    
    return NextResponse.json({
      success: true,
      identity: {
        identityType,
        identityGroup,
        identityGroupV2,
        doctorSubtype,
        verificationRequired,
      },
      nextStep: verificationRequired ? 'verification_apply' : 'profile_complete',
      redirectHint: verificationRequired ? 'go_verification_apply' : redirectHint,
    });
    
  } catch (err) {
    console.error('POST /api/user/identity error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

/**
 * GET /api/user/identity
 * 获取用户身份信息
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
    
    const { data: identity } = await supabaseAdmin
      .from('cn_user_identity_profiles')
      .select('*')
      .eq('user_id', user.id)
      .eq('site_code', 'cn')
      .single();
    
    if (!identity) {
      return NextResponse.json({
        identity: null,
        hasIdentity: false,
      });
    }
    
    return NextResponse.json({
      identity: {
        identityType: identity.identity_type,
        identityGroup: identity.identity_group,
        identityGroupV2: identity.identity_group_v2,
        doctorSubtype: identity.doctor_subtype,
        identitySelectedAt: identity.identity_selected_at,
        identitySelectionSource: identity.identity_selection_source,
        verificationRequired: isVerificationRequired(identity.identity_type),
      },
      hasIdentity: true,
    });
    
  } catch (err) {
    console.error('GET /api/user/identity error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
