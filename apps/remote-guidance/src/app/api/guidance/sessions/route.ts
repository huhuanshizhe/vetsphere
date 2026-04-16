import { NextRequest } from "next/server";
import {
  apiError,
  apiSuccess,
  buildParticipantPermissions,
  createSessionNo,
  getGuidanceActor,
  recordGuidanceEvent,
  supabaseAdmin,
} from "@/lib/server/guidance-api";

export async function GET(request: NextRequest) {
  const actor = await getGuidanceActor(request);
  if (!actor) {
    return apiError(401, "请先登录后再访问远程指导。");
  }

  if (!actor.canAccessRemoteGuidance) {
    return apiError(403, "当前账号没有远程指导访问权限。");
  }

  const participantRes = await supabaseAdmin
    .from("guidance_participants")
    .select("session_id")
    .eq("user_id", actor.userId);

  const participantIds = [...new Set((participantRes.data || []).map((item) => item.session_id))];

  const directRes = await supabaseAdmin
    .from("guidance_sessions")
    .select("*")
    .or(
      [
        `surgeon_user_id.eq.${actor.userId}`,
        `assistant_user_id.eq.${actor.userId}`,
        `requested_expert_user_id.eq.${actor.userId}`,
        `assigned_expert_user_id.eq.${actor.userId}`,
        `moderator_user_id.eq.${actor.userId}`,
        `created_by.eq.${actor.userId}`,
      ].join(",")
    )
    .order("created_at", { ascending: false });

  const participantSessionRes =
    participantIds.length > 0
      ? await supabaseAdmin
          .from("guidance_sessions")
          .select("*")
          .in("id", participantIds)
          .order("created_at", { ascending: false })
      : { data: [], error: null };

  if (directRes.error || participantSessionRes.error) {
    return apiError(500, "加载远程指导会话失败。", {
      directError: directRes.error?.message,
      participantError: participantSessionRes.error?.message,
    });
  }

  const sessionMap = new Map<string, any>();
  for (const session of [...(directRes.data || []), ...(participantSessionRes.data || [])]) {
    sessionMap.set(session.id, session);
  }

  const sessions = [...sessionMap.values()].sort((left, right) => {
    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
  });

  return apiSuccess({ sessions }, "远程指导会话加载成功。");
}

export async function POST(request: NextRequest) {
  const actor = await getGuidanceActor(request);
  if (!actor) {
    return apiError(401, "请先登录后再发起远程指导。");
  }

  if (!actor.canAccessRemoteGuidance) {
    return apiError(403, "当前账号没有发起远程指导的权限。");
  }

  const body = await request.json();
  const title = String(body.title || "").trim();
  const sessionType = body.session_type || "live_guidance";
  const priority = body.priority || "routine";

  if (!title) {
    return apiError(400, "请填写会话标题。");
  }

  const surgeonUserId = actor.isAdmin && body.surgeon_user_id ? body.surgeon_user_id : actor.userId;
  const sessionNo = createSessionNo();

  const insertPayload = {
    session_no: sessionNo,
    site_code: "cn",
    title,
    session_type: sessionType,
    status: "requested",
    priority,
    surgeon_user_id: surgeonUserId,
    assistant_user_id: body.assistant_user_id || null,
    requested_expert_user_id: body.requested_expert_user_id || null,
    assigned_expert_user_id: body.assigned_expert_user_id || null,
    moderator_user_id: body.moderator_user_id || null,
    hospital_name: body.hospital_name || actor.cnProfile?.organization_name || null,
    department_name: body.department_name || null,
    operating_room_name: body.operating_room_name || null,
    patient_species: body.patient_species || null,
    patient_identifier: body.patient_identifier || null,
    procedure_name: body.procedure_name || null,
    clinical_summary: body.clinical_summary || null,
    scheduled_start_at: body.scheduled_start_at || null,
    scheduled_end_at: body.scheduled_end_at || null,
    rtc_provider: body.rtc_provider || "livekit",
    consent_confirmed: Boolean(body.consent_confirmed),
    confidentiality_level: body.confidentiality_level || "restricted",
    metadata: body.metadata || {},
    created_by: actor.userId,
  };

  const { data: created, error } = await supabaseAdmin
    .from("guidance_sessions")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error || !created) {
    return apiError(500, "创建远程指导会话失败。", error?.message);
  }

  const participants = [
    {
      session_id: created.id,
      user_id: surgeonUserId,
      participant_role: "surgeon",
      invite_status: "accepted",
      join_permission: true,
      ...buildParticipantPermissions("surgeon"),
    },
  ];

  if (body.assistant_user_id) {
    participants.push({
      session_id: created.id,
      user_id: body.assistant_user_id,
      participant_role: "assistant",
      invite_status: "accepted",
      join_permission: true,
      ...buildParticipantPermissions("assistant"),
    });
  }

  if (body.requested_expert_user_id) {
    participants.push({
      session_id: created.id,
      user_id: body.requested_expert_user_id,
      participant_role: "expert",
      invite_status: "pending",
      join_permission: true,
      ...buildParticipantPermissions("expert"),
    });
  }

  if (body.assigned_expert_user_id) {
    participants.push({
      session_id: created.id,
      user_id: body.assigned_expert_user_id,
      participant_role: "expert",
      invite_status: "accepted",
      join_permission: true,
      ...buildParticipantPermissions("expert"),
    });
  }

  if (participants.length > 0) {
    await supabaseAdmin.from("guidance_participants").upsert(participants, {
      onConflict: "session_id,user_id",
    });
  }

  await recordGuidanceEvent(created.id, "session_requested", actor, "surgeon", {
    title: created.title,
    priority: created.priority,
    session_no: created.session_no,
  });

  return apiSuccess({ session: created }, "远程指导会话创建成功。", 201);
}
