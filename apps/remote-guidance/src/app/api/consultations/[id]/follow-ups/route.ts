import { NextRequest } from 'next/server';
import { apiError, apiSuccess, getGuidanceActor } from '@/lib/server/guidance-api';
import { createConsultationFollowUpRequest } from '@/lib/server/consultation-orders';

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: RouteProps) {
  const actor = await getGuidanceActor(request);
  if (!actor) {
    return apiError(401, '请先登录后再发起追问。', null);
  }

  if (!actor.canAccessDoctorWorkspace) {
    return apiError(403, '当前账号没有医生工作台访问权限。', null);
  }

  const body = (await request.json()) as {
    question_summary?: string;
    question_markdown?: string;
  };

  const questionSummary = String(body.question_summary || '').trim();
  const questionMarkdown = String(body.question_markdown || '').trim();

  if (!questionMarkdown) {
    return apiError(400, '请填写追问内容。', null);
  }

  try {
    const { id } = await params;
    const created = await createConsultationFollowUpRequest(id, actor, {
      questionSummary: questionSummary || null,
      questionMarkdown,
    });

    return apiSuccess(created, '追问窗口已发起。', 201);
  } catch (error) {
    return apiError(500, error instanceof Error ? error.message : '发起追问失败。', null);
  }
}
