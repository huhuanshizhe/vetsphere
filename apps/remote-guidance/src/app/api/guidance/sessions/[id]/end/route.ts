// @ts-nocheck
import { NextRequest } from "next/server";
import {
  apiError,
  apiSuccess,
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
    return apiError(401, "请先登录后再结束会话。");
  }

  const { id } = await params;
  const access = await getSessionAccess(id, actor);

  if (!access) {
    return apiError(404, "未找到该远程指导会话。");
  }

  if (!canManageSession(actor, access.session)) {
    return apiError(403, "当前账号不能结束该会话。");
  }

  const { data: updated, error } = await supabaseAdmin
    .from("guidance_sessions")
    .update({
      status: "ended",
      room_status: "closed",
      actual_ended_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !updated) {
    return apiError(500, "结束远程指导会话失败。", error?.message);
  }

  await recordGuidanceEvent(id, "session_ended", actor, access.actorRole, {});

  return apiSuccess({ session: updated }, "远程指导会话已结束。");
}
