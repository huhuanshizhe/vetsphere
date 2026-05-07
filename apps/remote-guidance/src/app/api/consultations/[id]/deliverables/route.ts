import { NextRequest } from 'next/server';
import { apiError, apiSuccess, getGuidanceActor } from '@/lib/server/guidance-api';
import { createConsultationDeliverable } from '@/lib/server/consultation-orders';

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: RouteProps) {
  const actor = await getGuidanceActor(request);
  if (!actor) {
    return apiError(401, '请先登录后再提交交付物。', null);
  }

  if (!actor.canAccessDoctorWorkspace) {
    return apiError(403, '当前账号没有医生工作台访问权限。', null);
  }

  const body = (await request.json()) as {
    summary?: string;
    content_markdown?: string;
    deliverable_type?: string;
  };

  const summary = String(body.summary || '').trim();
  const contentMarkdown = String(body.content_markdown || '').trim();

  if (!summary && !contentMarkdown) {
    return apiError(400, '请至少填写交付摘要或正文。', null);
  }

  try {
    const { id } = await params;
    const created = await createConsultationDeliverable(id, actor, {
      summary: summary || null,
      contentMarkdown: contentMarkdown || null,
      deliverableType: body.deliverable_type || 'structured_plan',
    });

    return apiSuccess(created, '咨询交付物已提交。', 201);
  } catch (error) {
    return apiError(500, error instanceof Error ? error.message : '提交咨询交付物失败。', null);
  }
}
