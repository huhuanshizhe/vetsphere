// @ts-nocheck
import { NextRequest } from "next/server";
import { RoomServiceClient } from "livekit-server-sdk";
import {
  apiError,
  apiSuccess,
  canOperateRoom,
  createRoomName,
  getGuidanceActor,
  getLiveKitApiKey,
  getLiveKitApiSecret,
  getLiveKitHostForServer,
  getSessionAccess,
  isLiveKitConfigured,
  recordGuidanceEvent,
  supabaseAdmin,
} from "@/lib/server/guidance-api";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: RouteProps) {
  const actor = await getGuidanceActor(request);
  if (!actor) {
    return apiError(401, "请先登录后再打开房间。");
  }

  const { id } = await params;
  const access = await getSessionAccess(id, actor);

  if (!access) {
    return apiError(404, "未找到该远程指导会话。");
  }

  if (!canOperateRoom(access.actorRole, actor, access.session)) {
    return apiError(403, "当前账号不能打开该会话房间。");
  }

  if (!isLiveKitConfigured()) {
    return apiError(500, "LiveKit 环境变量未配置完整。");
  }

  const roomName = access.session.rtc_room_name || createRoomName(id);
  const provider = access.session.rtc_provider || "livekit";
  
  // 状态更新逻辑 - 使用简化状态
  const currentStatus = access.session.status;
  const currentStateV2 = access.session.session_state_v2;
  
  // 如果房间已打开，直接返回
  if (access.session.rtc_room_name && access.session.room_status === "open") {
    return apiSuccess(
      { session: access.session, room: { provider, room_name: roomName } }, 
      "房间已打开，可直接进入。"
    );
  }

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

  // 更新状态：房间打开后状态变为 waiting（等待入房）
  const newStateV2 = currentStateV2 === 'cancelled' || currentStateV2 === 'ended' 
    ? currentStateV2 
    : 'waiting';
  
  const nextStatus = ["requested", "triaged", "expert_assigned", "scheduled"].includes(currentStatus)
    ? "ready"
    : currentStatus;

  const { data: updated, error } = await supabaseAdmin
    .from("guidance_sessions")
    .update({
      rtc_provider: provider,
      rtc_room_name: roomName,
      room_status: "open",
      status: nextStatus,
      session_state_v2: newStateV2,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !updated) {
    return apiError(500, "打开远程指导房间失败。", error?.message);
  }

  await recordGuidanceEvent(id, "room_opened", actor, access.actorRole, {
    rtc_provider: provider,
    rtc_room_name: roomName,
  });

  return apiSuccess({ session: updated, room: { provider, room_name: roomName } }, "远程指导房间已打开。");
}
