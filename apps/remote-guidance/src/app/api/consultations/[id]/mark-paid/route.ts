import { NextRequest } from 'next/server';
import { apiError, apiSuccess, getGuidanceActor } from '@/lib/server/guidance-api';
import { markConsultationOrderPaid } from '@/lib/server/consultation-orders';

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: RouteProps) {
  const actor = await getGuidanceActor(request);
  if (!actor) {
    return apiError(401, '请先登录后再确认支付。', null);
  }

  if (!actor.canAccessDoctorWorkspace) {
    return apiError(403, '当前账号没有医生工作台访问权限。', null);
  }

  try {
    const { id } = await params;
    const order = await markConsultationOrderPaid(id, actor);
    return apiSuccess({ order }, '咨询订单已标记为已支付。', 201);
  } catch (error) {
    return apiError(500, error instanceof Error ? error.message : '确认支付失败。', null);
  }
}
