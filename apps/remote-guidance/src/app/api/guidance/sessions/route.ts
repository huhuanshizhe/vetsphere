import { NextRequest } from 'next/server';
import { apiError, apiSuccess, getGuidanceActor, supabaseAdmin } from '@/lib/server/guidance-api';
import { createGuidanceSession } from '@/lib/server/guidance-sessions';

type GuidanceSessionRecord = {
  id: string;
  created_at: string;
  title: string;
  priority: string;
  session_no: string;
  [key: string]: unknown;
};

type GuidanceParticipantSessionRef = {
  session_id: string;
};

type CreateGuidanceSessionBody = {
  case_title?: string;
  title?: string;
  session_type?: string;
  priority?: string;
  site_code?: string;
  metadata?: Record<string, unknown>;
  surgeon_user_id?: string;
  assistant_user_id?: string;
  requested_expert_user_id?: string;
  assigned_expert_user_id?: string;
  moderator_user_id?: string;
  hospital_name?: string;
  department_name?: string;
  operating_room_name?: string;
  patient_species?: string;
  patient_identifier?: string;
  procedure_name?: string;
  clinical_summary?: string;
  scheduled_start_at?: string;
  scheduled_end_at?: string;
  rtc_provider?: string;
  consent_confirmed?: boolean;
  confidentiality_level?: string;
};

export async function GET(request: NextRequest) {
  const actor = await getGuidanceActor(request);
  if (!actor) {
    return apiError(401, '请先登录后再访问远程指导。');
  }

  if (!actor.canAccessRemoteGuidance) {
    return apiError(403, '当前账号没有远程指导访问权限。');
  }

  const participantRes = await supabaseAdmin
    .from('guidance_participants')
    .select('session_id')
    .eq('user_id', actor.userId);

  const participantIds = [
    ...new Set(
      ((participantRes.data || []) as GuidanceParticipantSessionRef[]).map(
        (item) => item.session_id,
      ),
    ),
  ];

  const directRes = await supabaseAdmin
    .from('guidance_sessions')
    .select('*')
    .or(
      [
        `surgeon_user_id.eq.${actor.userId}`,
        `assistant_user_id.eq.${actor.userId}`,
        `requested_expert_user_id.eq.${actor.userId}`,
        `assigned_expert_user_id.eq.${actor.userId}`,
        `moderator_user_id.eq.${actor.userId}`,
        `created_by.eq.${actor.userId}`,
      ].join(','),
    )
    .order('created_at', { ascending: false });

  const participantSessionRes =
    participantIds.length > 0
      ? await supabaseAdmin
          .from('guidance_sessions')
          .select('*')
          .in('id', participantIds)
          .order('created_at', { ascending: false })
      : { data: [], error: null };

  if (directRes.error || participantSessionRes.error) {
    return apiError(500, '加载远程指导会话失败。', {
      directError: directRes.error?.message,
      participantError: participantSessionRes.error?.message,
    });
  }

  const sessionMap = new Map<string, GuidanceSessionRecord>();
  for (const session of [
    ...((directRes.data || []) as GuidanceSessionRecord[]),
    ...((participantSessionRes.data || []) as GuidanceSessionRecord[]),
  ]) {
    sessionMap.set(session.id, session);
  }

  const sessions = [...sessionMap.values()].sort((left, right) => {
    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
  });

  return apiSuccess({ sessions }, '远程指导会话加载成功。');
}

export async function POST(request: NextRequest) {
  const actor = await getGuidanceActor(request);
  if (!actor) {
    return apiError(401, '请先登录后再发起远程指导。');
  }

  if (!actor.canAccessRemoteGuidance) {
    return apiError(403, '当前账号没有发起远程指导的权限。');
  }

  const body = (await request.json()) as CreateGuidanceSessionBody;
  const title = String(body.title || '').trim();
  const sessionType = body.session_type || 'live_guidance';
  const priority = body.priority || 'routine';
  const siteCode = body.site_code || 'cn';
  const metadata =
    body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
      ? body.metadata
      : {};

  if (!title) {
    return apiError(400, '请填写会话标题。');
  }

  const surgeonUserId = actor.isAdmin && body.surgeon_user_id ? body.surgeon_user_id : actor.userId;
  const hospitalName = body.hospital_name || actor.cnProfile?.organization_name || null;
  const departmentName = body.department_name || null;
  const patientSpecies = body.patient_species || null;
  const patientIdentifier = body.patient_identifier || null;
  const procedureName = body.procedure_name || null;
  const clinicalSummary = body.clinical_summary || null;
  const confidentialityLevel = body.confidentiality_level || 'restricted';

  try {
    const created = await createGuidanceSession(actor, {
      siteCode,
      caseTitle: body.case_title || null,
      title,
      sessionType,
      priority,
      metadata,
      surgeonUserId,
      assistantUserId: body.assistant_user_id || null,
      requestedExpertUserId: body.requested_expert_user_id || null,
      assignedExpertUserId: body.assigned_expert_user_id || null,
      moderatorUserId: body.moderator_user_id || null,
      patientSpecies,
      patientIdentifier,
      procedureName,
      hospitalName,
      departmentName,
      operatingRoomName: body.operating_room_name || null,
      clinicalSummary,
      scheduledStartAt: body.scheduled_start_at || null,
      scheduledEndAt: body.scheduled_end_at || null,
      rtcProvider: body.rtc_provider || 'livekit',
      confidentialityLevel,
      consentConfirmed: Boolean(body.consent_confirmed),
    });

    return apiSuccess(created, '远程指导会话创建成功。', 201);
  } catch (error) {
    return apiError(500, error instanceof Error ? error.message : '创建远程指导会话失败。');
  }
}
