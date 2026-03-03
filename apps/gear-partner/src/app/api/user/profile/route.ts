/**
 * 用户信息 API
 * GET /api/user/profile - 获取当前用户信息
 * PUT /api/user/profile - 更新用户信息
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return apiResponse(400, '缺少用户ID');
    }

    // 查询用户信息
    const { data: profile, error } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        avatar_url,
        phone,
        is_doctor,
        is_doctor_pending,
        is_admin,
        created_at,
        updated_at
      `)
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return apiResponse(404, '用户不存在');
      }
      console.error('查询用户信息失败:', error);
      return apiResponse(500, '查询失败');
    }

    // 如果是医生，查询医生详细信息
    let doctorProfile = null;
    if (profile.is_doctor) {
      const { data } = await supabase
        .from('doctor_profiles')
        .select(`
          real_name,
          nickname,
          phone,
          province,
          city,
          clinic_name,
          job_title,
          specialties,
          years_of_experience,
          bio,
          verification_status,
          verified_at
        `)
        .eq('user_id', userId)
        .single();
      
      doctorProfile = data;
    }

    return apiResponse(200, '查询成功', {
      profile,
      doctor_profile: doctorProfile,
    });

  } catch (error) {
    console.error('用户信息API错误:', error);
    return apiResponse(500, '服务器内部错误');
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, full_name, avatar_url, phone } = body;

    if (!user_id) {
      return apiResponse(400, '缺少用户ID');
    }

    // 更新用户基本信息
    const { data: profile, error } = await supabase
      .from('profiles')
      .update({
        full_name: full_name || undefined,
        avatar_url: avatar_url || undefined,
        phone: phone || undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user_id)
      .select()
      .single();

    if (error) {
      console.error('更新用户信息失败:', error);
      return apiResponse(500, '更新失败');
    }

    return apiResponse(200, '更新成功', { profile });

  } catch (error) {
    console.error('更新用户信息API错误:', error);
    return apiResponse(500, '服务器内部错误');
  }
}
