/**
 * 医生注册申请 API
 * POST /api/doctor/register - 提交医生认证申请
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 统一响应格式
function apiResponse<T>(code: number, message: string, data?: T) {
  return NextResponse.json({
    code,
    message,
    data,
    timestamp: new Date().toISOString(),
  }, { status: code >= 200 && code < 300 ? 200 : code });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      user_id,
      full_name,
      phone,
      province,
      city,
      hospital_name,
      position,
      specialties,
      years_of_experience,
      license_image_url,
      supplementary_urls,
      credential_notes,
      nickname,
      email,
      bio,
    } = body;

    // 参数校验
    if (!user_id) {
      return apiResponse(400, '缺少用户ID');
    }
    if (!full_name || !phone || !hospital_name || !position) {
      return apiResponse(400, '请填写完整的基本信息');
    }

    // 检查是否已有申请
    const { data: existing } = await supabase
      .from('doctor_applications')
      .select('id, status')
      .eq('user_id', user_id)
      .in('status', ['pending_review', 'approved'])
      .maybeSingle();

    if (existing) {
      if (existing.status === 'approved') {
        return apiResponse(400, '您已通过认证，无需重复申请');
      }
      if (existing.status === 'pending_review') {
        return apiResponse(400, '您已有申请在审核中，请耐心等待');
      }
    }

    // 创建申请
    const { data: application, error } = await supabase
      .from('doctor_applications')
      .insert({
        user_id,
        full_name,
        phone,
        province: province || null,
        city: city || null,
        hospital_name,
        position,
        specialties: specialties || [],
        years_of_experience: years_of_experience || null,
        license_image_url: license_image_url || null,
        supplementary_urls: supplementary_urls || [],
        credential_notes: credential_notes || null,
        nickname: nickname || null,
        email: email || null,
        bio: bio || null,
        status: 'pending_review',
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('创建申请失败:', error);
      return apiResponse(500, '提交申请失败，请稍后重试');
    }

    // 更新用户待认证状态
    await supabase
      .from('profiles')
      .update({ is_doctor_pending: true })
      .eq('id', user_id);

    return apiResponse(200, '申请提交成功', {
      application_id: application.id,
      status: application.status,
    });

  } catch (error) {
    console.error('医生注册API错误:', error);
    return apiResponse(500, '服务器内部错误');
  }
}

// 获取当前用户的申请状态
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return apiResponse(400, '缺少用户ID');
    }

    const { data: application, error } = await supabase
      .from('doctor_applications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('查询申请失败:', error);
      return apiResponse(500, '查询失败');
    }

    if (!application) {
      return apiResponse(200, '暂无申请记录', { has_application: false });
    }

    return apiResponse(200, '查询成功', {
      has_application: true,
      application: {
        id: application.id,
        status: application.status,
        full_name: application.full_name,
        hospital_name: application.hospital_name,
        position: application.position,
        submitted_at: application.submitted_at,
        reviewed_at: application.reviewed_at,
        rejection_reason: application.rejection_reason,
      },
    });

  } catch (error) {
    console.error('查询申请状态错误:', error);
    return apiResponse(500, '服务器内部错误');
  }
}
