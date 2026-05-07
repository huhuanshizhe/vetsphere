import { NextRequest } from 'next/server';
import { apiError, apiSuccess, getGuidanceActor } from '@/lib/server/guidance-api';
import { createConsultationFollowUpReply } from '@/lib/server/consultation-orders';

type RouteProps = {
  params: Promise<{ id: string; followUpId: string }>;
};

export async function POST(request: NextRequest, { params }: RouteProps) {
  const actor = await getGuidanceActor(request);
  if (!actor) {
    return apiError(401, '请先登录后再回复追问。', null);
  }

  if (!actor.canAccessDoctorWorkspace) {
    return apiError(403, '当前账号没有医生工作台访问权限。', null);
  }

  const body = (await request.json()) as {
    summary?: string;
    content_markdown?: string;
  };

  const summary = String(body.summary || '').trim();
  const contentMarkdown = String(body.content_markdown || '').trim();

  if (!summary && !contentMarkdown) {
    return apiError(400, '请至少填写追问回复摘要或正文。', null);
  }

  try {
    const { id, followUpId } = await params;
    const created = await createConsultationFollowUpReply(id, followUpId, actor, {
      summary: summary || null,
      contentMarkdown: contentMarkdown || summary,
    });

    return apiSuccess(created, '追问回复已提交。', 201);
  } catch (error) {
    return apiError(500, error instanceof Error ? error.message : '提交追问回复失败。', null);
  }
}
