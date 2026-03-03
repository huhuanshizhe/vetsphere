/**
 * AI对话 API
 * POST /api/ai/chat - AI智能对话
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt_type, message, session_id } = body;

    if (!message) {
      return apiResponse(400, '请输入问题');
    }

    // 获取用户信息（可选）
    let userId: string | null = null;
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    // 获取对应的AI提示词模板
    const { data: promptTemplate } = await supabase
      .from('ai_prompts')
      .select('*')
      .eq('type', prompt_type || 'general')
      .eq('is_active', true)
      .single();

    const startTime = Date.now();

    // 这里集成实际的AI服务（如OpenAI、文心一言等）
    // 目前返回模拟响应
    const aiResponse = generateMockResponse(prompt_type, message, promptTemplate);

    const responseTime = Date.now() - startTime;
    const tokensUsed = Math.ceil(message.length / 4) + Math.ceil(aiResponse.length / 4);

    // 记录对话日志
    const logData: any = {
      user_id: userId,
      session_id: session_id || crypto.randomUUID(),
      prompt_type: prompt_type || 'general',
      user_input: message,
      ai_response: aiResponse,
      tokens_used: tokensUsed,
      response_time_ms: responseTime,
      model_version: 'gpt-4-simulation',
    };

    await supabase.from('ai_conversation_logs').insert(logData);

    return apiResponse(200, '回复成功', {
      response: aiResponse,
      session_id: logData.session_id,
      tokens_used: tokensUsed,
      prompt_type: prompt_type || 'general',
    });

  } catch (error) {
    console.error('AI对话API错误:', error);
    return apiResponse(500, '服务器内部错误');
  }
}

function generateMockResponse(promptType: string, message: string, template: any): string {
  // 模拟AI响应，实际项目中应调用真实的AI服务
  const responses: Record<string, string> = {
    diagnosis: `基于您描述的症状，可能的诊断方向包括：\n\n1. 初步评估：${message.slice(0, 50)}...\n2. 建议进行相关检查\n3. 请注意观察动物的精神状态、饮食和排泄情况\n\n免责声明：这只是初步建议，具体诊断请咨询执业兽医。`,
    education: `关于您的学习问题，这里有一些解答：\n\n${message}\n\n相关知识点：\n- 建议参考相关教材和文献\n- 可以查看我们平台的相关课程\n- 实践中要注意理论与实际结合`,
    consultation: `感谢您的咨询！\n\n针对您的问题"${message.slice(0, 30)}..."，我的建议是：\n\n1. 首先了解具体情况\n2. 根据实际情况制定方案\n3. 持续跟进和调整\n\n如有更多问题，随时可以继续咨询。`,
    general: `您好！感谢您的提问。\n\n关于"${message.slice(0, 30)}..."，我来为您解答：\n\n这是一个很好的问题，需要从多个角度来分析...\n\n希望以上回答对您有帮助！`,
  };

  return responses[promptType] || responses['general'];
}

// 获取对话历史
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return apiResponse(401, '请先登录');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return apiResponse(401, '认证失败');
    }

    let query = supabase
      .from('ai_conversation_logs')
      .select('id, prompt_type, user_input, ai_response, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }

    const { data: logs, error } = await query.limit(50);

    if (error) {
      console.error('查询对话历史失败:', error);
      return apiResponse(500, '查询失败');
    }

    return apiResponse(200, '查询成功', logs || []);

  } catch (error) {
    console.error('对话历史API错误:', error);
    return apiResponse(500, '服务器内部错误');
  }
}
