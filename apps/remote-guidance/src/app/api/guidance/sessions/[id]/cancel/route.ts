import { NextRequest } from 'next/server';
import { syncConsultationOrderFromGuidanceSession } from '@/lib/server/consultation-orders';
import {
  apiError,
  apiSuccess,
  canManageSession,
  getGuidanceActor,
  getSessionAccess,
  recordGuidanceEvent,
  supabaseAdmin,
} from '@/lib/server/guidance-api';

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: RouteProps) {
  const actor = await getGuidanceActor(request);
  if (!actor) {
    return apiError(401, '请先登录后再取消会话。');
  }

  const { id } = await params;
  const access = await getSessionAccess(id, actor);

  if (!access) {
    return apiError(404, '未找到该远程指导会话。');
  }

  if (!canManageSession(actor, access.session)) {
    return apiError(403, '当前账号不能取消该会话。');
  }

  const { data: updated, error } = await supabaseAdmin
    .from('guidance_sessions')
    .update({
      status: 'cancelled',
      room_status: access.session.room_status === 'active' ? 'closing' : access.session.room_status,
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error || !updated) {
    return apiError(500, '取消远程指导会话失败。', error?.message);
  }

  await syncConsultationOrderFromGuidanceSession({
    consultationOrderId: updated.related_consultation_id,
    guidanceSessionId: updated.id,
    guidanceSessionNo: updated.session_no,
    guidanceStatus: 'cancelled',
  });

  await recordGuidanceEvent(id, 'session_cancelled', actor, access.actorRole, {});

  return apiSuccess({ session: updated }, '远程指导会话已取消。');
}
