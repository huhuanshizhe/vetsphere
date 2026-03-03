/**
 * 课程列表 API
 * GET /api/courses - 获取课程列表（支持筛选、分页）
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
    
    // 分页参数
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('page_size') || '20');
    
    // 筛选参数
    const format = searchParams.get('format');           // video, live, article, series
    const level = searchParams.get('level');             // beginner, intermediate, advanced
    const growthTrack = searchParams.get('growth_track'); // 成长方向slug
    const specialty = searchParams.get('specialty');     // 专科
    const isFree = searchParams.get('is_free');          // true/false
    const isFeatured = searchParams.get('is_featured');  // true/false
    const keyword = searchParams.get('keyword');         // 关键词搜索
    
    // 排序参数
    const sortBy = searchParams.get('sort_by') || 'created_at'; // created_at, enrollment_count, avg_rating
    const sortOrder = searchParams.get('sort_order') || 'desc';

    // 构建查询
    let query = supabase
      .from('courses')
      .select(`
        id,
        slug,
        title,
        subtitle,
        format,
        level,
        duration_minutes,
        price_cny,
        original_price_cny,
        cover_image_url,
        is_featured,
        is_free,
        enrollment_count,
        avg_rating,
        rating_count,
        status,
        published_at,
        created_at,
        growth_tracks,
        specialties,
        instructor_names
      `, { count: 'exact' })
      .eq('status', 'published')
      .is('deleted_at', null);

    // 应用筛选
    if (format) {
      query = query.eq('format', format);
    }
    if (level) {
      query = query.eq('level', level);
    }
    if (growthTrack) {
      query = query.contains('growth_tracks', [growthTrack]);
    }
    if (specialty) {
      query = query.contains('specialties', [specialty]);
    }
    if (isFree === 'true') {
      query = query.or('is_free.eq.true,price_cny.is.null,price_cny.eq.0');
    }
    if (isFeatured === 'true') {
      query = query.eq('is_featured', true);
    }
    if (keyword) {
      query = query.or(`title.ilike.%${keyword}%,subtitle.ilike.%${keyword}%`);
    }

    // 应用排序
    const ascending = sortOrder === 'asc';
    query = query.order(sortBy, { ascending });

    // 应用分页
    const from = (page - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);

    const { data: courses, count, error } = await query;

    if (error) {
      console.error('查询课程列表失败:', error);
      return apiResponse(500, '查询失败');
    }

    return apiResponse(200, '查询成功', {
      items: courses || [],
      pagination: {
        page,
        page_size: pageSize,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / pageSize),
      },
    });

  } catch (error) {
    console.error('课程列表API错误:', error);
    return apiResponse(500, '服务器内部错误');
  }
}
