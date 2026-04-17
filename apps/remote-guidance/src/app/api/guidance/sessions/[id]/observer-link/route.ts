// @ts-nocheck
import { NextRequest } from "next/server";
import {
  apiError,
  apiSuccess,
  getGuidanceActor,
  getSessionAccess,
  getGuidancePublicUrl,
  recordGuidanceEvent,
  supabaseAdmin,
} from "@/lib/server/guidance-api";
import { createGuidanceInviteToken } from "@/lib/server/guidance-invite";

type RouteProps = {
  params: Promise<{ id: string }>;
};

// 一键生成观察员链接（无需房间已打开）
export async function POST(request: NextRequest, { params }: RouteProps) {
  const actor = await getGuidanceActor(request);
  if (!actor) {
    return apiError(401, "请先登录。");
  }

  const { id } = await params;
  const access = await getSessionAccess(id, actor);
  
  if (!access) {
    return apiError(404, "未找到该会话。");
  }

  // 只有会话参与者可以生成观察员链接
  if (!access.actorRole) {
    return apiError(403, "您不是该会话的参与者，无法生成观察员链接。");
  }

  const body = await request.json();
  const role = body.role === "expert" ? "expert" : "observer";

  // 生成邀请令牌
  const inviteToken = createGuidanceInviteToken({
    sessionId: id,
    role,
    roomName: access.session.rtc_room_name || `guidance-${id.replace(/-/g, "").slice(0, 18)}`,
  });

  // 构建链接
  const origin = getGuidancePublicUrl(request.nextUrl.origin);
  const joinUrl = `${origin}/join/${inviteToken}`;

  // 保存链接记录（可选，用于追踪）
  try {
    await supabaseAdmin.from("guidance_invite_links").insert({
      session_id: id,
      token: inviteToken,
      role,
      created_by: actor.userId,
      expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    // 如果表不存在，忽略错误继续
    console.log("Invite link record skipped:", error);
  }

  await recordGuidanceEvent(id, "participant_invited", actor, access.actorRole, {
    invite_role: role,
    invite_token: inviteToken,
  });

  return apiSuccess({
    join_url: joinUrl,
    invite_token: inviteToken,
    role,
    expires_in_seconds: 12 * 60 * 60,
  }, `${role === "expert" ? "专家" : "观察员"}链接已生成。`);
}

// 获取现有链接列表
export async function GET(request: NextRequest, { params }: RouteProps) {
  const actor = await getGuidanceActor(request);
  if (!actor) {
    return apiError(401, "请先登录。");
  }

  const { id } = await params;
  const access = await getSessionAccess(id, actor);
  
  if (!access) {
    return apiError(404, "未找到该会话。");
  }

  try {
    const { data: links, error } = await supabaseAdmin
      .from("guidance_invite_links")
      .select("*")
      .eq("session_id", id)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (error) {
      return apiSuccess({ links: [] });
    }

    const origin = getGuidancePublicUrl(request.nextUrl.origin);
    const linksWithUrl = (links || []).map(link => ({
      ...link,
      join_url: `${origin}/join/${link.token}`,
    }));

    return apiSuccess({ links: linksWithUrl });
  } catch (error) {
    return apiSuccess({ links: [] });
  }
}