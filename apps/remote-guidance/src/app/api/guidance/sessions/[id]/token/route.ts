import { NextRequest } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import {
  apiError,
  apiSuccess,
  auditGuidanceAccess,
  getGuidanceActor,
  getLiveKitApiKey,
  getLiveKitApiSecret,
  getLiveKitUrl,
  getPublishCapabilitiesByRole,
  getSessionAccess,
  isLiveKitConfigured,
  recordGuidanceEvent,
} from "@/lib/server/guidance-api";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: RouteProps) {
  const actor = await getGuidanceActor(request);
  if (!actor) {
    return apiError(401, "请先登录后再申请房间 token。");
  }

  const { id } = await params;
  const access = await getSessionAccess(id, actor);

  if (!access) {
    return apiError(404, "未找到该远程指导会话。");
  }

  if (!isLiveKitConfigured()) {
    return apiError(500, "LiveKit 环境变量未配置完整。");
  }

  if (!access.session.rtc_room_name) {
    return apiError(400, "当前会话尚未打开房间，请先执行打开房间。");
  }

  const grants = getPublishCapabilitiesByRole(access.actorRole);
  const participantName = actor.fullName || actor.email || actor.userId;
  const identity = `${actor.userId}:${access.actorRole || "participant"}`;

  const token = new AccessToken(getLiveKitApiKey(), getLiveKitApiSecret(), {
    identity,
    name: participantName,
    metadata: JSON.stringify({
      sessionId: id,
      userId: actor.userId,
      actorRole: access.actorRole,
    }),
  });

  token.addGrant({
    room: access.session.rtc_room_name,
    roomJoin: true,
    canPublish: grants.canPublish,
    canPublishData: grants.canPublishData,
    canSubscribe: grants.canSubscribe,
  });

  const jwt = await token.toJwt();

  await recordGuidanceEvent(id, "room_token_requested", actor, access.actorRole, {});
  await auditGuidanceAccess(request, id, actor, "view_live", {
    rtc_provider: access.session.rtc_provider,
    rtc_room_name: access.session.rtc_room_name,
  });

  return apiSuccess(
    {
      provider: access.session.rtc_provider,
      room_name: access.session.rtc_room_name,
      participant_identity: identity,
      participant_name: participantName,
      token: jwt,
      server_url: getLiveKitUrl(),
      integration_status: "ready",
      grants,
    },
    "RTC token 已签发，可直接进入 LiveKit 房间。"
  );
}
