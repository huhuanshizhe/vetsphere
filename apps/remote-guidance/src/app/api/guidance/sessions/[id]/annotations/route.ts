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
  
  // 区分两种标注类型：
  // 1. 传统文字标注 (annotation_type: text_note, timeline_marker, risk_flag, snapshot)
  // 2. 实时位置标注 (annotation_type: line, arrow, text, circle, rectangle, instrument)
  
  const isPositionAnnotation = ['line', 'arrow', 'text', 'circle', 'rectangle', 'instrument'].includes(body.annotation_type);
  
  if (isPositionAnnotation) {
    // 实时位置标注 - 只有专家和管理员可以添加
    if (!["expert", "moderator", "admin"].includes(access.actorRole)) {
      return apiError(403, "只有专家和管理员可以添加实时标注。");
    }
    
    const annotationId = body.id || `ann-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    
    const { data: annotation, error } = await supabaseAdmin
      .from("guidance_annotations")
      .insert({
        id: annotationId,
        session_id: id,
        created_by: actor.userId,
        created_by_role: access.actorRole,
        annotation_type: body.annotation_type,
        position_x: body.x,
        position_y: body.y,
        end_x: body.endX ?? null,
        end_y: body.endY ?? null,
        text_content: body.text ?? null,
        radius: body.radius ?? null,
        width: body.width ?? null,
        height: body.height ?? null,
        instrument_type: body.instrumentType ?? null,
        color: body.color || "#FF4444",
        stroke_width: body.strokeWidth ?? 3,
        duration_ms: body.duration ?? 0,
        visible: true,
        created_at: new Date().toISOString(),
      })
      .select("*")
      .single();
    
    if (error || !annotation) {
      return apiError(500, "保存标注失败。", error?.message);
    }
    
    await recordGuidanceEvent(id, "annotation_added", actor, access.actorRole, {
      annotation_id: annotationId,
      annotation_type: body.annotation_type,
    });
    
    return apiSuccess({ annotation }, "实时标注已保存。", 201);
  } else {
    // 传统文字标注
    const { data: annotation, error } = await supabaseAdmin
      .from("guidance_annotations")
      .insert({
        session_id: id,
        recording_id: body.recording_id || null,
        annotation_type: body.annotation_type || "text_note",
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
}

export async function DELETE(request: NextRequest, { params }: RouteProps) {
  const actor = await getGuidanceActor(request);
  if (!actor) {
    return apiError(401, "请先登录。");
  }

  const { id } = await params;
  const access = await getSessionAccess(id, actor);

  if (!access) {
    return apiError(404, "未找到该会话。");
  }

  const body = await request.json();
  const annotationId = body.annotationId;

  if (!annotationId) {
    return apiError(400, "请提供标注ID。");
  }

  // 删除标注（设置 visible = false）
  const { error } = await supabaseAdmin
    .from("guidance_annotations")
    .update({ visible: false })
    .eq("id", annotationId)
    .eq("session_id", id);

  if (error) {
    return apiError(500, "删除标注失败。", error.message);
  }

  await recordGuidanceEvent(id, "annotation_deleted", actor, access.actorRole, {
    annotation_id: annotationId,
  });

  return apiSuccess({}, "标注已删除。");
}