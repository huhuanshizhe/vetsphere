/**
 * 采购线索 API
 * POST /api/leads - 提交采购咨询/需求
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
      lead_type,         // inquiry, configuration_advice, solution_request
      source_page,       // 来源页面URL
      source_product_id, // 来源商品ID（如有）
      source_course_id,  // 来源课程ID（如有）
      contact_name,      // 联系人姓名
      mobile,            // 手机号
      email,             // 邮箱（可选）
      clinic_name,       // 诊所名称（可选）
      clinic_stage_code, // 诊所阶段（可选）
      budget_range,      // 预算范围（可选）
      requirement_text,  // 需求描述
      site_code,         // 站点代码（可选，默认cn）
    } = body;

    // 参数校验
    if (!contact_name || !mobile) {
      return apiResponse(400, '请填写联系人和手机号');
    }
    if (!lead_type) {
      return apiResponse(400, '请选择咨询类型');
    }

    // 手机号格式校验
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(mobile)) {
      return apiResponse(400, '请输入正确的手机号');
    }

    // 创建线索
    const { data: lead, error } = await supabase
      .from('purchase_leads')
      .insert({
        lead_type,
        source_page: source_page || null,
        source_product_id: source_product_id || null,
        source_course_id: source_course_id || null,
        contact_name,
        mobile,
        email: email || null,
        clinic_name: clinic_name || null,
        clinic_stage_code: clinic_stage_code || null,
        budget_range: budget_range || null,
        requirement_text: requirement_text || null,
        site_code: site_code || 'cn',
        status: 'new',
      })
      .select()
      .single();

    if (error) {
      console.error('创建线索失败:', error);
      return apiResponse(500, '提交失败，请稍后重试');
    }

    return apiResponse(200, '提交成功，我们将尽快与您联系', {
      lead_id: lead.id,
    });

  } catch (error) {
    console.error('采购线索API错误:', error);
    return apiResponse(500, '服务器内部错误');
  }
}
