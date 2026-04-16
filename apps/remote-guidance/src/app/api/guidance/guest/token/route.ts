import crypto from "crypto";
import { NextRequest } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import {
  apiError,
  apiSuccess,
  getLiveKitApiKey,
  getLiveKitApiSecret,
  getLiveKitUrl,
  getPublishCapabilitiesByRole,
  isLiveKitConfigured,
  supabaseAdmin,
} from "@/lib/server/guidance-api";
import { parseGuidanceInviteToken } from "@/lib/server/guidance-invite";

export async function POST(request: NextRequest) {
  if (!isLiveKitConfigured()) {
    return apiError(500, "LiveKit 环境变量未配置完整。");
  }

  const body = await request.json();
  const inviteToken = String(body.inviteToken || "");
  const guestName = String(body.guestName || "").trim();

  if (!inviteToken) {
    return apiError(400, "缺少 inviteToken。");
  }

  const invite = parseGuidanceInviteToken(inviteToken);
  if (!invite) {
    return apiError(401, "入会链接已失效或签名不正确。");
  }

  const { data: session } = await supabaseAdmin
    .from("guidance_sessions")
    .select("*")
    .eq("id", invite.sessionId)
    .maybeSingle();

  if (!session) {
    return apiError(404, "未找到对应的远程指导会话。");
  }

  if (["cancelled", "archived"].includes(session.status)) {
    return apiError(403, "该会话当前不可进入。");
  }

  if (!session.rtc_room_name) {
    return apiError(400, "该会话尚未打开房间，请联系术者重新生成入会链接。");
  }

  const participantName = guestName || (invite.role === "expert" ? "Remote Expert" : "Guest Viewer");
  const identity = `guest:${invite.role}:${crypto.randomUUID()}`;
  const grants = getPublishCapabilitiesByRole(invite.role);

  const token = new AccessToken(getLiveKitApiKey(), getLiveKitApiSecret(), {
    identity,
    name: participantName,
    metadata: JSON.stringify({
      sessionId: invite.sessionId,
      actorRole: invite.role,
      guest: true,
    }),
  });

  token.addGrant({
    room: session.rtc_room_name,
    roomJoin: true,
    canPublish: grants.canPublish,
    canPublishData: grants.canPublishData,
    canSubscribe: grants.canSubscribe,
  });

  const jwt = await token.toJwt();

  await supabaseAdmin.from("guidance_events").insert({
    session_id: invite.sessionId,
    event_type: "participant_joined",
    actor_user_id: null,
    actor_role: invite.role,
    payload: {
      guest: true,
      guest_identity: identity,
      guest_name: participantName,
      room_name: session.rtc_room_name,
    },
  });

  return apiSuccess({
    token: jwt,
    server_url: getLiveKitUrl(),
    room_name: session.rtc_room_name,
    participant_identity: identity,
    participant_name: participantName,
    role: invite.role,
    session_title: session.title,
  }, "访客入会凭证已签发。");
}
