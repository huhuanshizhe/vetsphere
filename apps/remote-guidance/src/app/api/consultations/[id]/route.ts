import { NextRequest } from 'next/server';
import { apiError, apiSuccess, getGuidanceActor } from '@/lib/server/guidance-api';
import { getConsultationDetail } from '@/lib/server/consultation-orders';

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: RouteProps) {
  const actor = await getGuidanceActor(request);
  if (!actor) {
    return apiError(401, '请先登录后再查看咨询详情。', null);
  }

  if (!actor.canAccessDoctorWorkspace) {
    return apiError(403, '当前账号没有医生工作台访问权限。', null);
  }

  const { id } = await params;
  const detail = await getConsultationDetail(id, actor);

  if (!detail) {
    return apiError(404, '未找到该咨询订单，或当前账号无权访问。', null);
  }

  return apiSuccess(detail, '咨询详情加载成功。');
}
