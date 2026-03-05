/**
 * 学习进度 API
 * GET /api/learning/progress - 获取学习进度
 * POST /api/learning/progress - 更新/创建学习进度
 *
 * 使用 Service Role Key 绕过 RLS（API route 已在服务端验证用户身份）
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

/** 从 Authorization header 中提取用户信息 */
async function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return apiResponse(401, '请先登录');

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('course_id');
    const status = searchParams.get('status');

    let query = supabase
      .from('learning_progress')
      .select('*')
      .eq('user_id', user.id);

    if (courseId) {
      query = query.eq('course_id', courseId);
    }
    if (status === 'completed') {
      query = query.not('completed_at', 'is', null);
    } else if (status === 'in_progress') {
      query = query.is('completed_at', null).gt('progress_percent', 0);
    }

    query = query.order('last_watched_at', { ascending: false, nullsFirst: false });

    const { data: progress, error } = await query;

    if (error) {
      console.error('查询学习进度失败:', error);
      return apiResponse(500, '查询失败: ' + error.message);
    }

    // 获取关联的课程信息
    const courseIds = [...new Set((progress || []).map((p: any) => p.course_id))];
    let coursesMap: Record<string, any> = {};

    if (courseIds.length > 0) {
      const { data: courses } = await supabase
        .from('courses')
        .select('id, slug, title, cover_image_url, duration_minutes')
        .in('id', courseIds);

      if (courses) {
        coursesMap = Object.fromEntries(courses.map((c: any) => [c.id, c]));
      }
    }

    const mappedProgress = (progress || []).map((p: any) => ({
      ...p,
      course: coursesMap[p.course_id] || null,
      last_study_at: p.last_watched_at,
    }));

    const totalCourses = progress?.length || 0;
    const completedCourses = progress?.filter((p: any) => p.completed_at || p.is_completed)?.length || 0;
    const totalStudyTime = progress?.reduce((sum: number, p: any) => {
      const course = coursesMap[p.course_id];
      return sum + (p.progress_percent / 100) * (course?.duration_minutes || 0);
    }, 0) || 0;

    return apiResponse(200, '查询成功', {
      items: mappedProgress,
      stats: {
        total_courses: totalCourses,
        completed_courses: completedCourses,
        total_study_time_minutes: Math.round(totalStudyTime),
      },
    });

  } catch (error) {
    console.error('学习进度API错误:', error);
    return apiResponse(500, '服务器内部错误');
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return apiResponse(401, '请先登录');

    const body = await request.json();
    const { course_id, chapter_id, progress_percent } = body;

    if (!course_id) {
      return apiResponse(400, '缺少课程ID');
    }

    const now = new Date().toISOString();
    const progressValue = progress_percent || 0;
    const isCompleted = progressValue >= 100;

    // 查找现有进度记录
    const { data: existingRows, error: queryError } = await supabase
      .from('learning_progress')
      .select('id, progress_percent, completed_at, is_completed')
      .eq('user_id', user.id)
      .eq('course_id', course_id)
      .is('chapter_id', null)
      .order('created_at', { ascending: false })
      .limit(1);

    if (queryError) {
      console.error('查询现有进度失败:', queryError);
      return apiResponse(500, '查询失败: ' + queryError.message);
    }

    const existingProgress = existingRows?.[0] || null;

    if (existingProgress) {
      const updateData: any = {
        last_watched_at: now,
        updated_at: now,
        progress_percent: Math.max(Number(existingProgress.progress_percent) || 0, progressValue),
      };
      
      if (isCompleted && !existingProgress.completed_at) {
        updateData.completed_at = now;
        updateData.is_completed = true;
      }

      const { data: updated, error } = await supabase
        .from('learning_progress')
        .update(updateData)
        .eq('id', existingProgress.id)
        .select()
        .single();

      if (error) {
        console.error('更新学习进度失败:', error);
        return apiResponse(500, '更新失败: ' + error.message);
      }

      return apiResponse(200, '进度已更新', updated);
    } else {
      const { data: created, error } = await supabase
        .from('learning_progress')
        .insert({
          user_id: user.id,
          course_id,
          chapter_id: chapter_id || null,
          progress_percent: progressValue,
          is_completed: isCompleted,
          last_watched_at: now,
          completed_at: isCompleted ? now : null,
        })
        .select()
        .single();

      if (error) {
        console.error('创建学习进度失败:', error);
        return apiResponse(500, '创建失败: ' + error.message);
      }

      return apiResponse(200, '进度已创建', created);
    }

  } catch (error) {
    console.error('更新学习进度API错误:', error);
    return apiResponse(500, '服务器内部错误');
  }
}
