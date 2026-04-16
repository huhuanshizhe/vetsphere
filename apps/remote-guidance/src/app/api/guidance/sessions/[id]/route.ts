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

export async function GET(request: NextRequest, { params }: RouteProps) {
  const actor = await getGuidanceActor(request);
  if (!actor) {
    return apiError(401, "请先登录后再查看会话详情。");
  }

  const { id } = await params;
  const access = await getSessionAccess(id, actor);

  if (!access) {
    return apiError(404, "未找到该远程指导会话，或当前账号无权访问。");
  }

  const [participantsRes, devicesRes, recordingsRes, recentEventsRes] = await Promise.all([
    supabaseAdmin.from("guidance_participants").select("*").eq("session_id", id).order("created_at", { ascending: true }),
    supabaseAdmin.from("guidance_devices").select("*").eq("session_id", id).order("created_at", { ascending: false }),
    supabaseAdmin.from("guidance_recordings").select("*").eq("session_id", id).order("created_at", { ascending: false }),
    supabaseAdmin.from("guidance_events").select("*").eq("session_id", id).order("event_at", { ascending: false }).limit(20),
  ]);

  return apiSuccess({
    session: access.session,
    participant: access.participant,
    actorRole: access.actorRole,
    participants: participantsRes.data || [],
    devices: devicesRes.data || [],
    recordings: recordingsRes.data || [],
    recentEvents: recentEventsRes.data || [],
  });
}

export async function PATCH(request: NextRequest, { params }: RouteProps) {
  const actor = await getGuidanceActor(request);
  if (!actor) {
    return apiError(401, "请先登录后再更新会话。");
  }

  const { id } = await params;
  const access = await getSessionAccess(id, actor);

  if (!access) {
    return apiError(404, "未找到该远程指导会话。");
  }

  if (!canManageSession(actor, access.session)) {
    return apiError(403, "当前账号不能修改该会话。");
  }

  const body = await request.json();
  const updatePayload: Record<string, unknown> = {};
  const assignableFields = [
    "title",
    "session_type",
    "priority",
    "status",
    "assistant_user_id",
    "requested_expert_user_id",
    "assigned_expert_user_id",
    "moderator_user_id",
    "hospital_name",
    "department_name",
    "operating_room_name",
    "patient_species",
    "patient_identifier",
    "procedure_name",
    "clinical_summary",
    "scheduled_start_at",
    "scheduled_end_at",
    "consent_confirmed",
    "confidentiality_level",
    "metadata",
  ];

  for (const field of assignableFields) {
    if (field in body) {
      updatePayload[field] = body[field];
    }
  }

  if (Object.keys(updatePayload).length === 0) {
    return apiError(400, "没有可更新的字段。");
  }

  const { data: updated, error } = await supabaseAdmin
    .from("guidance_sessions")
    .update(updatePayload)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !updated) {
    return apiError(500, "更新会话失败。", error?.message);
  }

  await recordGuidanceEvent(id, "session_updated", actor, access.actorRole, {
    updated_fields: Object.keys(updatePayload),
  });

  return apiSuccess({ session: updated }, "远程指导会话已更新。");
}
