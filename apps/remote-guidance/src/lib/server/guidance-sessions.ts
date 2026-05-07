import { createGuidanceCaseRecord } from '@/lib/server/case-records';
import {
  buildParticipantPermissions,
  createSessionNo,
  recordGuidanceEvent,
  supabaseAdmin,
  type GuidanceActor,
} from '@/lib/server/guidance-api';

type ExistingCaseRecordInput = {
  id: string;
  case_no?: string | null;
};

export type CreateGuidanceSessionInput = {
  caseTitle?: string | null;
  title: string;
  sessionType?: string | null;
  priority?: string | null;
  siteCode?: string | null;
  metadata?: Record<string, unknown> | null;
  surgeonUserId: string;
  assistantUserId?: string | null;
  requestedExpertUserId?: string | null;
  assignedExpertUserId?: string | null;
  moderatorUserId?: string | null;
  hospitalName?: string | null;
  departmentName?: string | null;
  operatingRoomName?: string | null;
  patientSpecies?: string | null;
  patientIdentifier?: string | null;
  procedureName?: string | null;
  clinicalSummary?: string | null;
  scheduledStartAt?: string | null;
  scheduledEndAt?: string | null;
  rtcProvider?: string | null;
  consentConfirmed?: boolean;
  confidentialityLevel?: string | null;
  existingCaseRecord?: ExistingCaseRecordInput | null;
  relatedConsultationId?: string | null;
};

export async function createGuidanceSession(
  actor: GuidanceActor,
  input: CreateGuidanceSessionInput,
) {
  const sessionNo = createSessionNo();
  const siteCode = input.siteCode || 'cn';
  const sessionType = input.sessionType || 'live_guidance';
  const priority = input.priority || 'routine';
  const confidentialityLevel = input.confidentialityLevel || 'restricted';
  const metadata =
    input.metadata && typeof input.metadata === 'object' && !Array.isArray(input.metadata)
      ? input.metadata
      : {};

  let caseRecord = input.existingCaseRecord;

  if (!caseRecord) {
    caseRecord = await createGuidanceCaseRecord(actor, {
      siteCode,
      caseTitle: input.caseTitle || null,
      title: input.title,
      sessionType,
      patientSpecies: input.patientSpecies || null,
      patientIdentifier: input.patientIdentifier || null,
      procedureName: input.procedureName || null,
      hospitalName: input.hospitalName || null,
      departmentName: input.departmentName || null,
      clinicalSummary: input.clinicalSummary || null,
      confidentialityLevel,
      consentConfirmed: Boolean(input.consentConfirmed),
      surgeonUserId: input.surgeonUserId,
      assistantUserId: input.assistantUserId || null,
      requestedExpertUserId: input.requestedExpertUserId || null,
      assignedExpertUserId: input.assignedExpertUserId || null,
      moderatorUserId: input.moderatorUserId || null,
      metadata,
    });
  }

  if (!caseRecord) {
    throw new Error('创建远程指导会话前未能解析病例主档。');
  }

  const { data: created, error } = await supabaseAdmin
    .from('guidance_sessions')
    .insert({
      session_no: sessionNo,
      site_code: siteCode,
      title: input.title,
      session_type: sessionType,
      status: 'requested',
      priority,
      surgeon_user_id: input.surgeonUserId,
      assistant_user_id: input.assistantUserId || null,
      requested_expert_user_id: input.requestedExpertUserId || null,
      assigned_expert_user_id: input.assignedExpertUserId || null,
      moderator_user_id: input.moderatorUserId || null,
      related_record_id: caseRecord.id,
      related_consultation_id: input.relatedConsultationId || null,
      hospital_name: input.hospitalName || null,
      department_name: input.departmentName || null,
      operating_room_name: input.operatingRoomName || null,
      patient_species: input.patientSpecies || null,
      patient_identifier: input.patientIdentifier || null,
      procedure_name: input.procedureName || null,
      clinical_summary: input.clinicalSummary || null,
      scheduled_start_at: input.scheduledStartAt || null,
      scheduled_end_at: input.scheduledEndAt || null,
      rtc_provider: input.rtcProvider || 'livekit',
      consent_confirmed: Boolean(input.consentConfirmed),
      confidentiality_level: confidentialityLevel,
      metadata: {
        ...metadata,
        case_id: caseRecord.id,
        case_no: caseRecord.case_no,
        related_consultation_id: input.relatedConsultationId || null,
      },
      created_by: actor.userId,
    })
    .select('*')
    .single();

  if (error || !created) {
    if (!input.existingCaseRecord) {
      await supabaseAdmin.from('case_records').delete().eq('id', caseRecord.id);
    }
    throw new Error(error?.message || '创建远程指导会话失败。');
  }

  const participants = [
    {
      session_id: created.id,
      user_id: input.surgeonUserId,
      participant_role: 'surgeon',
      invite_status: 'accepted',
      join_permission: true,
      ...buildParticipantPermissions('surgeon'),
    },
  ];

  if (input.assistantUserId) {
    participants.push({
      session_id: created.id,
      user_id: input.assistantUserId,
      participant_role: 'assistant',
      invite_status: 'accepted',
      join_permission: true,
      ...buildParticipantPermissions('assistant'),
    });
  }

  if (input.requestedExpertUserId) {
    participants.push({
      session_id: created.id,
      user_id: input.requestedExpertUserId,
      participant_role: 'expert',
      invite_status: 'pending',
      join_permission: true,
      ...buildParticipantPermissions('expert'),
    });
  }

  if (input.assignedExpertUserId) {
    participants.push({
      session_id: created.id,
      user_id: input.assignedExpertUserId,
      participant_role: 'expert',
      invite_status: 'accepted',
      join_permission: true,
      ...buildParticipantPermissions('expert'),
    });
  }

  if (participants.length > 0) {
    await supabaseAdmin.from('guidance_participants').upsert(participants, {
      onConflict: 'session_id,user_id',
    });
  }

  await recordGuidanceEvent(
    created.id,
    'session_requested',
    actor,
    actor.isAdmin ? 'admin' : 'surgeon',
    {
      title: created.title,
      priority: created.priority,
      session_no: created.session_no,
      case_id: caseRecord.id,
      case_no: caseRecord.case_no,
      related_consultation_id: input.relatedConsultationId || null,
    },
  );

  return {
    session: created,
    caseRecord,
  };
}
