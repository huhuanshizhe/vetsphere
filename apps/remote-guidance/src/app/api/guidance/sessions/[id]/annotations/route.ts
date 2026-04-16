// @ts-nocheck
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
    return apiError(401, "请先登录后再查看标注。");
  }

  const { id } = await params;
  const access = await getSessionAccess(id, actor);

  if (!access) {
    return apiError(404, "未找到该远程指导会话。");
  }

  const { data: annotations, error } = await supabaseAdmin
    .from("guidance_annotations")
    .select("*")
    .eq("session_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    return apiError(500, "加载标注失败。", error.message);
  }

  return apiSuccess({ annotations: annotations || [] });
}

export async function POST(request: NextRequest, { params }: RouteProps) {
  const actor = await getGuidanceActor(request);
  if (!actor) {
    return apiError(401, "请先登录后再添加标注。");
  }

  const { id } = await params;
  const access = await getSessionAccess(id, actor);

  if (!access) {
    return apiError(404, "未找到该远程指导会话。");
  }

  const body = await request.json();
  const annotationType = body.annotation_type || "text_note";

  const { data: annotation, error } = await supabaseAdmin
    .from("guidance_annotations")
    .insert({
      session_id: id,
      recording_id: body.recording_id || null,
      annotation_type: annotationType,
      author_user_id: actor.userId,
      author_role: access.actorRole || "surgeon",
      timestamp_seconds: body.timestamp_seconds || null,
      image_path: body.image_path || null,
      title: body.title || null,
      content: body.content || null,
      severity: body.severity || null,
      metadata: body.metadata || {},
    })
    .select("*")
    .single();

  if (error || !annotation) {
    return apiError(500, "添加标注失败。", error?.message);
  }

  await recordGuidanceEvent(id, "annotation_added", actor, access.actorRole, {
    annotation_id: annotation.id,
    annotation_type: annotation.annotation_type,
  });

  return apiSuccess({ annotation }, "会话标注已创建。", 201);
}
