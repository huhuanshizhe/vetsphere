/**
 * 成长方向详情 API
 * GET /api/growth/tracks/[slug] - 获取成长方向详情及相关课程
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);

    if (!slug) {
      return apiResponse(400, '缺少方向标识');
    }

    // 课程筛选参数
    const stage = searchParams.get('stage');       // 阶段筛选
    const specialty = searchParams.get('specialty'); // 专科筛选
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('page_size') || '12');

    // 查询成长方向
    const { data: track, error: trackError } = await supabase
      .from('growth_tracks')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (trackError) {
      if (trackError.code === 'PGRST116') {
        return apiResponse(404, '成长方向不存在');
      }
      console.error('查询成长方向失败:', trackError);
      return apiResponse(500, '查询失败');
    }

    // 如果方向未就绪，返回fallback信息
    if (!track.is_ready) {
      return apiResponse(200, '查询成功', {
        track,
        is_ready: false,
        fallback_action: track.fallback_action,
        courses: [],
        pagination: { page: 1, page_size: pageSize, total: 0, total_pages: 0 },
      });
    }

    // 查询关联课程
    let coursesQuery = supabase
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
        specialties
      `, { count: 'exact' })
      .contains('growth_tracks', [slug])
      .eq('status', 'published')
      .is('deleted_at', null);

    // 应用阶段/专科筛选
    if (stage) {
      coursesQuery = coursesQuery.eq('level', stage);
    }
    if (specialty) {
      coursesQuery = coursesQuery.contains('specialties', [specialty]);
    }

    // 应用排序策略
    if (track.sort_strategy === 'popularity') {
      coursesQuery = coursesQuery.order('enrollment_count', { ascending: false });
    } else if (track.sort_strategy === 'rating') {
      coursesQuery = coursesQuery.order('avg_rating', { ascending: false });
    } else {
      coursesQuery = coursesQuery.order('created_at', { ascending: false });
    }

    // 分页
    const from = (page - 1) * pageSize;
    coursesQuery = coursesQuery.range(from, from + pageSize - 1);

    const { data: courses, count, error: coursesError } = await coursesQuery;

    if (coursesError) {
      console.error('查询课程失败:', coursesError);
      return apiResponse(500, '查询课程失败');
    }

    return apiResponse(200, '查询成功', {
      track,
      is_ready: true,
      courses: courses || [],
      pagination: {
        page,
        page_size: pageSize,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / pageSize),
      },
    });

  } catch (error) {
    console.error('成长方向详情API错误:', error);
    return apiResponse(500, '服务器内部错误');
  }
}
