import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// 有效的身份类型
const VALID_IDENTITY_TYPES = [
  'veterinarian',
  'assistant_doctor',
  'nurse_care',
  'student',
  'researcher_teacher',
  'pet_service_staff',
  'industry_practitioner',
  'enthusiast',
  'other',
];

// 身份类型到分组的映射
function mapIdentityTypeToGroup(identityType: string): string {
  const mapping: Record<string, string> = {
    veterinarian: 'professional',
    assistant_doctor: 'professional',
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

// 判断是否需要认证
function isVerificationRequired(identityType: string): boolean {
  return ['veterinarian', 'assistant_doctor', 'nurse_care', 'student', 'researcher_teacher'].includes(identityType);
}

/**
 * POST /api/user/identity
 * 保存用户身份选择
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
    const { identityType, source = 'first_login' } = body;
    
    // 参数校验
    if (!identityType) {
      return NextResponse.json({ error: '请选择身份类型' }, { status: 400 });
    }
    
    if (!VALID_IDENTITY_TYPES.includes(identityType)) {
      return NextResponse.json({ error: '无效的身份类型' }, { status: 400 });
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
    
    if (existing) {
      // 更新现有记录
      const { error: updateError } = await supabaseAdmin
        .from('cn_user_identity_profiles')
        .update({
          identity_type: identityType,
          identity_group: identityGroup,
          identity_selected_at: new Date().toISOString(),
          identity_selection_source: source,
        })
        .eq('id', existing.id);
      
      if (updateError) {
        console.error('Error updating identity:', updateError);
        return NextResponse.json({ error: '身份保存失败' }, { status: 500 });
      }
    } else {
      // 创建新记录
      const { error: insertError } = await supabaseAdmin
        .from('cn_user_identity_profiles')
        .insert({
          user_id: user.id,
          site_code: 'cn',
          identity_type: identityType,
          identity_group: identityGroup,
          identity_selected_at: new Date().toISOString(),
          identity_selection_source: source,
        });
      
      if (insertError) {
        console.error('Error inserting identity:', insertError);
        return NextResponse.json({ error: '身份保存失败' }, { status: 500 });
      }
    }
    
    // 状态快照会通过数据库触发器自动更新
    // 但为了确保实时性，这里手动更新一次
    await supabaseAdmin
      .from('cn_user_state_snapshots')
      .upsert({
        user_id: user.id,
        site_code: 'cn',
        identity_type: identityType,
        identity_group: identityGroup,
        onboarding_status: 'profile_pending',
        verification_required: verificationRequired,
        redirect_hint: 'go_profile_complete',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,site_code',
      });
    
    return NextResponse.json({
      success: true,
      identity: {
        identityType,
        identityGroup,
        verificationRequired,
      },
      nextStep: 'profile_complete',
      redirectHint: 'go_profile_complete',
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
