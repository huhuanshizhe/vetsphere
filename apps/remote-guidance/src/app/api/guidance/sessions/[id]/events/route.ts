import { NextRequest } from "next/server";
import {
  apiError,
  apiSuccess,
  getGuidanceActor,
  getSessionAccess,
  recordGuidanceEvent,
  supabaseAdmin,
} from "@/lib/server/guidance-api";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: RouteProps) {
  const actor = await getGuidanceActor(request);
  if (!actor) {
    return apiError(401, "请先登录后再查看事件记录。");
  }

  const { id } = await params;
  const access = await getSessionAccess(id, actor);

  if (!access) {
    return apiError(404, "未找到该远程指导会话。");
  }

  const { data: events, error } = await supabaseAdmin
    .from("guidance_events")
    .select("*")
    .eq("session_id", id)
    .order("event_at", { ascending: false });

  if (error) {
    return apiError(500, "加载事件记录失败。", error.message);
  }

  return apiSuccess({ events: events || [] });
}

export async function POST(request: NextRequest, { params }: RouteProps) {
  const actor = await getGuidanceActor(request);
  if (!actor) {
    return apiError(401, "请先登录后再写入事件。");
  }

  const { id } = await params;
  const access = await getSessionAccess(id, actor);

  if (!access) {
    return apiError(404, "未找到该远程指导会话。");
  }

  const body = await request.json();
  const eventType = body.event_type;

  if (!eventType) {
    return apiError(400, "缺少 event_type。");
  }

  await recordGuidanceEvent(id, eventType, actor, access.actorRole, body.payload || {});

  return apiSuccess({ ok: true }, "事件已记录。", 201);
}
