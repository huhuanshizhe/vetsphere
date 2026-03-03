/**
 * 访谈列表 API
 * GET /api/interviews - 获取访谈列表
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
    const category = searchParams.get('category');
    const isFeatured = searchParams.get('is_featured');
    const keyword = searchParams.get('keyword');

    let query = supabase
      .from('interviews')
      .select(`
        id,
        title,
        excerpt,
        interviewee_name,
        interviewee_title,
        interviewee_avatar,
        category,
        cover_image_url,
        is_featured,
        view_count,
        published_at,
        created_at
      `, { count: 'exact' })
      .eq('status', 'published')
      .is('deleted_at', null);

    if (category) {
      query = query.eq('category', category);
    }
    if (isFeatured === 'true') {
      query = query.eq('is_featured', true);
    }
    if (keyword) {
      query = query.or(`title.ilike.%${keyword}%,interviewee_name.ilike.%${keyword}%`);
    }

    query = query.order('is_featured', { ascending: false });
    query = query.order('published_at', { ascending: false });

    const from = (page - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);

    const { data: interviews, count, error } = await query;

    if (error) {
      console.error('查询访谈列表失败:', error);
      return apiResponse(500, '查询失败');
    }

    return apiResponse(200, '查询成功', {
      items: interviews || [],
      pagination: {
        page,
        page_size: pageSize,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / pageSize),
      },
    });

  } catch (error) {
    console.error('访谈列表API错误:', error);
    return apiResponse(500, '服务器内部错误');
  }
}
