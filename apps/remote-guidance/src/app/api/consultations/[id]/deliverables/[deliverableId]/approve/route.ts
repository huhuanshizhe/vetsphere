import { NextRequest } from 'next/server';
import { apiError, apiSuccess, getGuidanceActor } from '@/lib/server/guidance-api';
import { approveConsultationDeliverable } from '@/lib/server/consultation-orders';

type RouteProps = {
  params: Promise<{ id: string; deliverableId: string }>;
};

export async function POST(request: NextRequest, { params }: RouteProps) {
  const actor = await getGuidanceActor(request);
  if (!actor) {
    return apiError(401, '请先登录后再确认交付。', null);
  }

  if (!actor.canAccessDoctorWorkspace) {
    return apiError(403, '当前账号没有医生工作台访问权限。', null);
  }

  try {
    const { id, deliverableId } = await params;
    const approved = await approveConsultationDeliverable(id, deliverableId, actor);
    return apiSuccess(approved, '咨询交付已确认。', 201);
  } catch (error) {
    return apiError(500, error instanceof Error ? error.message : '确认咨询交付失败。', null);
  }
}
