// @ts-nocheck
import { NextRequest } from "next/server";
import { RoomServiceClient } from "livekit-server-sdk";
import {
  apiError,
  apiSuccess,
  canManageSession,
  createRoomName,
  getGuidanceActor,
  getLiveKitApiKey,
  getLiveKitApiSecret,
  getGuidancePublicUrl,
  getLiveKitHostForServer,
  getSessionAccess,
  isLiveKitConfigured,
  recordGuidanceEvent,
  supabaseAdmin,
} from "@/lib/server/guidance-api";
import { createGuidanceInviteToken } from "@/lib/server/guidance-invite";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: RouteProps) {
  const actor = await getGuidanceActor(request);
  if (!actor) {
    return apiError(401, "请先登录后再生成应急入会链接。");
  }

  const { id } = await params;
  const access = await getSessionAccess(id, actor);
  if (!access) {
    return apiError(404, "未找到该远程指导会话。");
  }

  if (!canManageSession(actor, access.session)) {
    return apiError(403, "当前账号不能为该会话生成应急入会链接。");
  }

  if (!isLiveKitConfigured()) {
    return apiError(500, "LiveKit 环境变量未配置完整。");
  }

  const body = await request.json();
  const requestedRole = body.role === "observer" || body.role === "assistant" ? body.role : "expert";
  const roomName = access.session.rtc_room_name || createRoomName(id);

  const roomService = new RoomServiceClient(
    getLiveKitHostForServer(),
    getLiveKitApiKey(),
    getLiveKitApiSecret()
  );

  try {
    await roomService.createRoom({
      name: roomName,
      emptyTimeout: 60 * 10,
      maxParticipants: 12,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (!errorMessage.toLowerCase().includes("already exists")) {
      return apiError(502, "LiveKit 房间创建失败。", errorMessage);
    }
  }

  const nextStatus = ["requested", "triaged", "expert_assigned", "scheduled"].includes(access.session.status)
    ? "ready"
    : access.session.status;

  const { data: updatedSession, error: updateError } = await supabaseAdmin
    .from("guidance_sessions")
    .update({
      rtc_provider: "livekit",
      rtc_room_name: roomName,
      room_status: "open",
      status: nextStatus,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (updateError || !updatedSession) {
    return apiError(500, "更新会话房间状态失败。", updateError?.message);
  }

  const inviteToken = createGuidanceInviteToken({
    sessionId: id,
    role: requestedRole,
    roomName,
  });

  const origin = getGuidancePublicUrl(request.nextUrl.origin);
  const joinUrl = `${origin}/join/${inviteToken}`;

  await recordGuidanceEvent(id, "room_opened", actor, access.actorRole, {
    rtc_provider: "livekit",
    rtc_room_name: roomName,
    emergency_link_for: requestedRole,
  });

  return apiSuccess({
    role: requestedRole,
    room_name: roomName,
    join_url: joinUrl,
    invite_token: inviteToken,
    session: updatedSession,
    expires_in_seconds: 60 * 60 * 12,
  }, "应急入会链接已生成。");
}
