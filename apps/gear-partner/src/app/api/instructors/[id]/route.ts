/**
 * 讲师详情 API
 * GET /api/instructors/[id] - 获取讲师详情及其课程
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return apiResponse(400, '缺少讲师ID');
    }

    // 查询讲师详情
    const { data: instructor, error } = await supabase
      .from('instructors')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return apiResponse(404, '讲师不存在');
      }
      console.error('查询讲师详情失败:', error);
      return apiResponse(500, '查询失败');
    }

    // 查询讲师的课程
    const { data: courseRelations } = await supabase
      .from('course_instructors')
      .select(`
        role,
        course:courses (
          id,
          slug,
          title,
          subtitle,
          cover_image_url,
          price_cny,
          is_free,
          format,
          level,
          enrollment_count,
          avg_rating,
          status
        )
      `)
      .eq('instructor_id', id);

    // 过滤已发布的课程
    const courses = (courseRelations || [])
      .filter((r: any) => r.course?.status === 'published')
      .map((r: any) => ({
        role: r.role,
        ...r.course,
      }));

    return apiResponse(200, '查询成功', {
      instructor,
      courses,
      course_count: courses.length,
    });

  } catch (error) {
    console.error('讲师详情API错误:', error);
    return apiResponse(500, '服务器内部错误');
  }
}
