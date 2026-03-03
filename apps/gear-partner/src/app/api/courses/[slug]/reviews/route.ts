/**
 * 课程评论 API
 * GET /api/courses/[slug]/reviews - 获取课程评论
 * POST /api/courses/[slug]/reviews - 提交课程评论
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

type RouteParams = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('page_size') || '10');
    const sortBy = searchParams.get('sort_by') || 'created_at'; // created_at, rating, helpful_count

    // 获取课程ID
    const { data: course } = await supabase
      .from('courses')
      .select('id')
      .eq('slug', slug)
      .single();

    if (!course) {
      return apiResponse(404, '课程不存在');
    }

    let query = supabase
      .from('course_reviews')
      .select(`
        id,
        rating,
        content,
        is_featured,
        helpful_count,
        created_at,
        profiles:user_id (id, full_name, avatar_url)
      `, { count: 'exact' })
      .eq('course_id', course.id)
      .eq('status', 'approved')
      .is('deleted_at', null);

    // 精选评论优先
    query = query.order('is_featured', { ascending: false });
    
    if (sortBy === 'rating') {
      query = query.order('rating', { ascending: false });
    } else if (sortBy === 'helpful_count') {
      query = query.order('helpful_count', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const from = (page - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);

    const { data: reviews, count, error } = await query;

    if (error) {
      console.error('查询评论失败:', error);
      return apiResponse(500, '查询失败');
    }

    const mappedReviews = (reviews || []).map((r: any) => ({
      ...r,
      user: r.profiles,
      profiles: undefined,
    }));

    // 获取评分统计
    const { data: ratingStats } = await supabase
      .from('course_reviews')
      .select('rating')
      .eq('course_id', course.id)
      .eq('status', 'approved')
      .is('deleted_at', null);

    const stats = {
      total: ratingStats?.length || 0,
      average: 0,
      distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as Record<number, number>,
    };

    if (ratingStats && ratingStats.length > 0) {
      const sum = ratingStats.reduce((acc, r) => acc + r.rating, 0);
      stats.average = Math.round((sum / ratingStats.length) * 10) / 10;
      ratingStats.forEach(r => {
        stats.distribution[r.rating as keyof typeof stats.distribution]++;
      });
    }

    return apiResponse(200, '查询成功', {
      items: mappedReviews,
      stats,
      pagination: {
        page,
        page_size: pageSize,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / pageSize),
      },
    });

  } catch (error) {
    console.error('课程评论API错误:', error);
    return apiResponse(500, '服务器内部错误');
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return apiResponse(401, '请先登录');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return apiResponse(401, '认证失败');
    }

    const body = await request.json();
    const { rating, content } = body;

    if (!rating || rating < 1 || rating > 5) {
      return apiResponse(400, '评分必须在1-5之间');
    }
    if (!content || content.length < 10) {
      return apiResponse(400, '评论内容至少10个字符');
    }

    // 获取课程
    const { data: course } = await supabase
      .from('courses')
      .select('id')
      .eq('slug', slug)
      .single();

    if (!course) {
      return apiResponse(404, '课程不存在');
    }

    // 检查是否已评论
    const { data: existingReview } = await supabase
      .from('course_reviews')
      .select('id')
      .eq('course_id', course.id)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single();

    if (existingReview) {
      return apiResponse(400, '您已经评论过此课程');
    }

    // 检查是否购买/学习过课程
    const { data: progress } = await supabase
      .from('learning_progress')
      .select('id, progress_percent')
      .eq('course_id', course.id)
      .eq('user_id', user.id)
      .single();

    if (!progress || progress.progress_percent < 30) {
      return apiResponse(400, '学习进度需达到30%才能评论');
    }

    const { data: review, error } = await supabase
      .from('course_reviews')
      .insert({
        course_id: course.id,
        user_id: user.id,
        rating,
        content,
        status: 'pending',
        helpful_count: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('创建评论失败:', error);
      return apiResponse(500, '提交失败');
    }

    return apiResponse(200, '评论已提交，等待审核', review);

  } catch (error) {
    console.error('提交评论API错误:', error);
    return apiResponse(500, '服务器内部错误');
  }
}
