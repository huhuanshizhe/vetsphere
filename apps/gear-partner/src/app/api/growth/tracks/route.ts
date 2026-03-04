/**
 * 成长方向列表 API
 * GET /api/growth/tracks - 获取成长方向列表
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
    
    // 是否只返回已就绪的方向
    const readyOnly = searchParams.get('ready_only') === 'true';
    // 分组筛选
    const groupName = searchParams.get('group');
    // 站点代码
    const siteCode = searchParams.get('site_code') || 'cn';

    // 构建查询
    let query = supabase
      .from('growth_tracks')
      .select(`
        id,
        slug,
        name,
        group_name,
        group_order,
        tagline,
        description,
        target_audience,
        recommended_start,
        path_stages,
        is_multi_stage,
        default_stage,
        default_specialty,
        sort_strategy,
        filter_config,
        icon,
        color,
        is_active,
        is_ready,
        fallback_action,
        display_order,
        course_count,
        featured_courses,
        created_at
      `)
      .eq('is_active', true)
      .eq('site_code', siteCode)
      .order('group_order')
      .order('display_order');

    if (readyOnly) {
      query = query.eq('is_ready', true);
    }
    if (groupName) {
      query = query.eq('group_name', groupName);
    }

    const { data: tracks, error } = await query;

    if (error) {
      console.error('查询成长方向失败:', error);
      return apiResponse(500, '查询失败');
    }

    // 按分组组织数据
    const groups: Record<string, any[]> = {};
    (tracks || []).forEach(track => {
      const group = track.group_name || '其他';
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(track);
    });

    // 转换为数组格式
    const groupedTracks = Object.entries(groups).map(([name, items]) => ({
      group_name: name,
      group_order: items[0]?.group_order || 0,
      tracks: items,
    })).sort((a, b) => a.group_order - b.group_order);

    return apiResponse(200, '查询成功', {
      tracks: tracks || [],
      grouped: groupedTracks,
      total: tracks?.length || 0,
    });

  } catch (error) {
    console.error('成长方向API错误:', error);
    return apiResponse(500, '服务器内部错误');
  }
}
