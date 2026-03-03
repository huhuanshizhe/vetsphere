/**
 * 讲师列表 API
 * GET /api/instructors - 获取讲师列表
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
    
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('page_size') || '20');
    const keyword = searchParams.get('keyword');

    // 构建查询
    let query = supabase
      .from('instructors')
      .select(`
        id,
        name,
        title,
        credentials,
        bio,
        avatar_url,
        display_order
      `, { count: 'exact' })
      .eq('is_active', true)
      .order('display_order')
      .order('name');

    if (keyword) {
      query = query.or(`name.ilike.%${keyword}%,title.ilike.%${keyword}%`);
    }

    // 分页
    const from = (page - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);

    const { data: instructors, count, error } = await query;

    if (error) {
      console.error('查询讲师列表失败:', error);
      return apiResponse(500, '查询失败');
    }

    return apiResponse(200, '查询成功', {
      items: instructors || [],
      pagination: {
        page,
        page_size: pageSize,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / pageSize),
      },
    });

  } catch (error) {
    console.error('讲师列表API错误:', error);
    return apiResponse(500, '服务器内部错误');
  }
}
