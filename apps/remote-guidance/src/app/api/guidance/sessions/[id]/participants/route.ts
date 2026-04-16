// @ts-nocheck
import { NextRequest } from "next/server";
import {
  apiError,
  apiSuccess,
  buildParticipantPermissions,
  canManageSession,
  getGuidanceActor,
  getSessionAccess,
  recordGuidanceEvent,
  supabaseAdmin,
} from "@/lib/server/guidance-api";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: RouteProps) {
  const actor = await getGuidanceActor(request);
  if (!actor) {
    return apiError(401, "请先登录后再邀请参与者。");
  }

  const { id } = await params;
  const access = await getSessionAccess(id, actor);

  if (!access) {
    return apiError(404, "未找到该远程指导会话。");
  }

  if (!canManageSession(actor, access.session)) {
    return apiError(403, "当前账号不能管理该会话参与者。");
  }

  const body = await request.json();
  const userId = body.user_id;
  const participantRole = body.participant_role || "observer";

  if (!userId) {
    return apiError(400, "缺少参与者 user_id。");
  }

  const { data: participant, error } = await supabaseAdmin
    .from("guidance_participants")
    .upsert(
      {
        session_id: id,
        user_id: userId,
        participant_role: participantRole,
        invite_status: body.invite_status || "pending",
        join_permission: body.join_permission ?? true,
        ...buildParticipantPermissions(participantRole),
        ...(body.permissions || {}),
      },
      {
        onConflict: "session_id,user_id",
      }
    )
    .select("*")
    .single();

  if (error || !participant) {
    return apiError(500, "邀请参与者失败。", error?.message);
  }

  await recordGuidanceEvent(id, "participant_invited", actor, access.actorRole, {
    participant_id: participant.id,
    user_id: participant.user_id,
    participant_role: participant.participant_role,
  });

  return apiSuccess({ participant }, "会话参与者已更新。", 201);
}
