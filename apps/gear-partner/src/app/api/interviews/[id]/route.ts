/**
 * 访谈详情 API
 * GET /api/interviews/[id] - 获取访谈详情
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

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // 获取访谈详情
    const { data: interview, error } = await supabase
      .from('interviews')
      .select('*')
      .eq('id', id)
      .eq('status', 'published')
      .is('deleted_at', null)
      .single();

    if (error || !interview) {
      return apiResponse(404, '访谈不存在');
    }

    // 增加浏览量
    await supabase
      .from('interviews')
      .update({ view_count: (interview.view_count || 0) + 1 })
      .eq('id', id);

    // 获取问答内容
    const { data: questions } = await supabase
      .from('interview_questions')
      .select(`
        id,
        question,
        sort_order,
        interview_answers (
          id,
          answer,
          media_type,
          media_url
        )
      `)
      .eq('interview_id', id)
      .order('sort_order');

    // 获取相关访谈
    const { data: relatedInterviews } = await supabase
      .from('interviews')
      .select('id, title, interviewee_name, interviewee_avatar, cover_image_url')
      .eq('category', interview.category)
      .eq('status', 'published')
      .is('deleted_at', null)
      .neq('id', id)
      .limit(4);

    return apiResponse(200, '查询成功', {
      ...interview,
      view_count: (interview.view_count || 0) + 1,
      questions: questions || [],
      related_interviews: relatedInterviews || [],
    });

  } catch (error) {
    console.error('访谈详情API错误:', error);
    return apiResponse(500, '服务器内部错误');
  }
}
