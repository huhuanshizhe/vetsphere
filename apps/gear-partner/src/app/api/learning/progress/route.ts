/**
 * 学习进度 API
 * GET /api/learning/progress - 获取学习进度
 * POST /api/learning/progress - 更新学习进度
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
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return apiResponse(401, '请先登录');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return apiResponse(401, '认证失败');
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('course_id');
    const status = searchParams.get('status'); // in_progress, completed

    let query = supabase
      .from('learning_progress')
      .select(`
        *,
        courses:course_id (
          id, slug, title, cover_image_url, duration_minutes
        )
      `)
      .eq('user_id', user.id);

    if (courseId) {
      query = query.eq('course_id', courseId);
    }
    if (status === 'completed') {
      query = query.not('completed_at', 'is', null);
    } else if (status === 'in_progress') {
      query = query.is('completed_at', null).gt('progress_percent', 0);
    }

    query = query.order('last_study_at', { ascending: false });

    const { data: progress, error } = await query;

    if (error) {
      console.error('查询学习进度失败:', error);
      return apiResponse(500, '查询失败');
    }

    const mappedProgress = (progress || []).map((p: any) => ({
      ...p,
      course: p.courses,
      courses: undefined,
    }));

    // 统计数据
    const totalCourses = progress?.length || 0;
    const completedCourses = progress?.filter((p: any) => p.completed_at)?.length || 0;
    const totalStudyTime = progress?.reduce((sum: number, p: any) => {
      return sum + (p.progress_percent / 100) * (p.courses?.duration_minutes || 0);
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
    const { course_id, chapter_id, progress_percent, completed_chapters, total_chapters } = body;

    if (!course_id) {
      return apiResponse(400, '缺少课程ID');
    }

    // 查找现有进度记录
    const { data: existingProgress } = await supabase
      .from('learning_progress')
      .select('id, progress_percent')
      .eq('user_id', user.id)
      .eq('course_id', course_id)
      .single();

    const now = new Date().toISOString();
    const isCompleted = progress_percent >= 100;

    if (existingProgress) {
      // 更新现有记录
      const updateData: any = {
        last_study_at: now,
        progress_percent: Math.max(existingProgress.progress_percent, progress_percent || 0),
      };
      
      if (chapter_id) updateData.chapter_id = chapter_id;
      if (completed_chapters !== undefined) updateData.completed_chapters = completed_chapters;
      if (total_chapters !== undefined) updateData.total_chapters = total_chapters;
      if (isCompleted && !existingProgress.completed_at) {
        updateData.completed_at = now;
      }

      const { data: updated, error } = await supabase
        .from('learning_progress')
        .update(updateData)
        .eq('id', existingProgress.id)
        .select()
        .single();

      if (error) {
        console.error('更新学习进度失败:', error);
        return apiResponse(500, '更新失败');
      }

      return apiResponse(200, '进度已更新', updated);
    } else {
      // 创建新记录
      const { data: created, error } = await supabase
        .from('learning_progress')
        .insert({
          user_id: user.id,
          course_id,
          chapter_id,
          progress_percent: progress_percent || 0,
          completed_chapters: completed_chapters || 0,
          total_chapters: total_chapters || 0,
          last_study_at: now,
          completed_at: isCompleted ? now : null,
        })
        .select()
        .single();

      if (error) {
        console.error('创建学习进度失败:', error);
        return apiResponse(500, '创建失败');
      }

      // 更新课程报名人数
      await supabase.rpc('increment_enrollment_count', { course_id_param: course_id });

      return apiResponse(200, '进度已创建', created);
    }

  } catch (error) {
    console.error('更新学习进度API错误:', error);
    return apiResponse(500, '服务器内部错误');
  }
}
