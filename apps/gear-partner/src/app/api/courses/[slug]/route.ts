/**
 * 课程详情 API
 * GET /api/courses/[slug] - 获取课程详情
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

    if (!slug) {
      return apiResponse(400, '缺少课程标识');
    }

    // 查询课程详情
    const { data: course, error } = await supabase
      .from('courses')
      .select(`
        *,
        course_chapters (
          id,
          title,
          description,
          duration_minutes,
          is_free_preview,
          display_order
        ),
        course_instructors (
          id,
          role,
          instructor:instructors (
            id,
            name,
            title,
            credentials,
            bio,
            avatar_url
          )
        )
      `)
      .or(`slug.eq.${slug},id.eq.${slug}`)
      .eq('status', 'published')
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return apiResponse(404, '课程不存在');
      }
      console.error('查询课程详情失败:', error);
      return apiResponse(500, '查询失败');
    }

    // 增加浏览量
    await supabase.rpc('increment_course_view', { course_id: course.id }).catch(() => {});

    // 处理章节排序
    const chapters = (course.course_chapters || []).sort(
      (a: any, b: any) => a.display_order - b.display_order
    );

    // 处理讲师
    const instructors = (course.course_instructors || []).map((ci: any) => ({
      role: ci.role,
      ...ci.instructor,
    }));

    return apiResponse(200, '查询成功', {
      ...course,
      course_chapters: chapters,
      course_instructors: undefined,
      instructors,
    });

  } catch (error) {
    console.error('课程详情API错误:', error);
    return apiResponse(500, '服务器内部错误');
  }
}
