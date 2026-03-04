/**
 * 路由状态 API
 * GET /api/routes/status - 检查路由状态（用于前端判断是否显示占位页）
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
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');
    const siteCode = searchParams.get('site_code') || 'cn';

    if (!path) {
      return apiResponse(400, '缺少路径参数');
    }

    // 查询路由状态
    const { data: route, error } = await supabase
      .from('route_registry')
      .select(`
        id,
        path,
        name,
        route_status,
        redirect_target,
        placeholder_template_id,
        requires_auth,
        requires_doctor,
        coming_soon_templates (
          id,
          code,
          title,
          subtitle,
          description,
          primary_button_text,
          primary_button_link,
          secondary_button_text,
          secondary_button_link
        )
      `)
      .eq('path', path)
      .eq('site_code', siteCode)
      .maybeSingle();

    if (error) {
      console.error('查询路由状态失败:', error);
      return apiResponse(500, '查询失败');
    }

    // 未注册的路由默认为活跃状态
    if (!route) {
      return apiResponse(200, '查询成功', {
        path,
        route_status: 'active',
        is_accessible: true,
        requires_auth: false,
        requires_doctor: false,
      });
    }

    // 构建响应
    const response: any = {
      path: route.path,
      name: route.name,
      route_status: route.route_status,
      is_accessible: route.route_status === 'active',
      requires_auth: route.requires_auth,
      requires_doctor: route.requires_doctor,
    };

    // 如果是重定向
    if (route.route_status === 'redirect' && route.redirect_target) {
      response.redirect_target = route.redirect_target;
    }

    // 如果是占位页
    if (route.route_status === 'coming_soon' && route.coming_soon_templates) {
      response.placeholder = route.coming_soon_templates;
    }

    return apiResponse(200, '查询成功', response);

  } catch (error) {
    console.error('路由状态API错误:', error);
    return apiResponse(500, '服务器内部错误');
  }
}
