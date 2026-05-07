import type { GuidanceActor } from '@/lib/server/guidance-api';
import { getSupabaseAdmin } from '@/lib/server/guidance-api';

export type CaseAccessRole =
  | 'owner'
  | 'surgeon'
  | 'assistant'
  | 'expert'
  | 'moderator'
  | 'admin'
  | 'viewer';

type CaseParticipantInput = {
  userId: string;
  role: CaseAccessRole;
};

type CreateCaseRecordInput = {
  siteCode?: string | null;
  caseTitle?: string | null;
  caseStatus?: string | null;
  originType: 'guidance' | 'consultation' | 'community';
  patientSpecies?: string | null;
  patientIdentifier?: string | null;
  procedureName?: string | null;
  hospitalName?: string | null;
  departmentName?: string | null;
  clinicalSummary?: string | null;
  confidentialityLevel?: string | null;
  consentConfirmed?: boolean;
  ownerUserId: string;
  participants?: CaseParticipantInput[];
  metadata?: Record<string, unknown> | null;
};

export type CreateGuidanceCaseInput = {
  siteCode?: string | null;
  caseTitle?: string | null;
  title?: string | null;
  sessionType?: string | null;
  patientSpecies?: string | null;
  patientIdentifier?: string | null;
  procedureName?: string | null;
  hospitalName?: string | null;
  departmentName?: string | null;
  clinicalSummary?: string | null;
  confidentialityLevel?: string | null;
  consentConfirmed?: boolean;
  surgeonUserId: string;
  assistantUserId?: string | null;
  requestedExpertUserId?: string | null;
  assignedExpertUserId?: string | null;
  moderatorUserId?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type CreateConsultationCaseInput = {
  siteCode?: string | null;
  caseTitle?: string | null;
  title?: string | null;
  consultationType?: string | null;
  patientSpecies?: string | null;
  patientIdentifier?: string | null;
  procedureName?: string | null;
  hospitalName?: string | null;
  departmentName?: string | null;
  questionSummary?: string | null;
  confidentialityLevel?: string | null;
  consentConfirmed?: boolean;
  requesterUserId: string;
  requestedExpertUserId?: string | null;
  assignedExpertUserId?: string | null;
  metadata?: Record<string, unknown> | null;
};

const CASE_ROLE_PRIORITY: Record<CaseAccessRole, number> = {
  viewer: 0,
  assistant: 1,
  expert: 2,
  moderator: 3,
  surgeon: 4,
  owner: 5,
  admin: 6,
};

const CASE_PERMISSION_TEMPLATE: Record<
  CaseAccessRole,
  { can_view: boolean; can_edit: boolean; can_manage_participants: boolean; can_export: boolean }
> = {
  owner: { can_view: true, can_edit: true, can_manage_participants: true, can_export: true },
  surgeon: { can_view: true, can_edit: true, can_manage_participants: true, can_export: true },
  assistant: { can_view: true, can_edit: true, can_manage_participants: false, can_export: false },
  expert: { can_view: true, can_edit: true, can_manage_participants: false, can_export: true },
  moderator: { can_view: true, can_edit: false, can_manage_participants: true, can_export: true },
  admin: { can_view: true, can_edit: true, can_manage_participants: true, can_export: true },
  viewer: { can_view: true, can_edit: false, can_manage_participants: false, can_export: false },
};

function createCaseNo() {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CASE-${datePart}-${randomPart}`;
}

function addPolicy(
  policyMap: Map<string, { user_id: string; access_role: CaseAccessRole }>,
  userId: string | null | undefined,
  role: CaseAccessRole,
) {
  if (!userId) {
    return;
  }

  const existing = policyMap.get(userId);
  if (!existing || CASE_ROLE_PRIORITY[role] > CASE_ROLE_PRIORITY[existing.access_role]) {
    policyMap.set(userId, { user_id: userId, access_role: role });
  }
}

function buildCaseTitle(
  explicitTitle: string | null | undefined,
  fallbackTitle: string | null | undefined,
  fragments: Array<string | null | undefined>,
) {
  const normalizedExplicitTitle = String(explicitTitle || '').trim();
  if (normalizedExplicitTitle) {
    return normalizedExplicitTitle;
  }

  const normalizedFallbackTitle = String(fallbackTitle || '').trim();
  if (normalizedFallbackTitle) {
    return normalizedFallbackTitle;
  }

  const normalizedFragments = fragments.map((value) => String(value || '').trim()).filter(Boolean);
  if (normalizedFragments.length > 0) {
    return normalizedFragments.join(' · ');
  }

  return '未命名病例';
}

export async function createCaseRecord(actor: GuidanceActor, input: CreateCaseRecordInput) {
  const supabaseAdmin = getSupabaseAdmin();
  const caseNo = createCaseNo();

  const { data: createdCase, error: caseError } = await supabaseAdmin
    .from('case_records')
    .insert({
      case_no: caseNo,
      site_code: input.siteCode || 'cn',
      case_title: input.caseTitle || '未命名病例',
      case_status: input.caseStatus || 'intake',
      origin_type: input.originType,
      patient_species: input.patientSpecies || null,
      patient_identifier: input.patientIdentifier || null,
      procedure_name: input.procedureName || null,
      hospital_name: input.hospitalName || null,
      department_name: input.departmentName || null,
      clinical_summary: input.clinicalSummary || null,
      confidentiality_level: input.confidentialityLevel || 'restricted',
      consent_confirmed: Boolean(input.consentConfirmed),
      metadata: input.metadata || {},
      owner_user_id: input.ownerUserId,
      created_by: actor.userId,
    })
    .select('*')
    .single();

  if (caseError || !createdCase) {
    throw new Error(caseError?.message || '创建病例主档失败。');
  }

  const policyMap = new Map<string, { user_id: string; access_role: CaseAccessRole }>();
  addPolicy(policyMap, input.ownerUserId, 'owner');

  for (const participant of input.participants || []) {
    addPolicy(policyMap, participant.userId, participant.role);
  }

  if (actor.isAdmin) {
    addPolicy(policyMap, actor.userId, 'admin');
  }

  const accessPolicies = [...policyMap.values()].map((entry) => ({
    case_id: createdCase.id,
    user_id: entry.user_id,
    access_role: entry.access_role,
    ...CASE_PERMISSION_TEMPLATE[entry.access_role],
    metadata: {
      seeded_from: `${input.originType}_case_create`,
    },
    created_by: actor.userId,
  }));

  if (accessPolicies.length > 0) {
    const { error: policyError } = await supabaseAdmin
      .from('case_access_policies')
      .upsert(accessPolicies, {
        onConflict: 'case_id,user_id',
      });

    if (policyError) {
      await supabaseAdmin.from('case_records').delete().eq('id', createdCase.id);
      throw new Error(policyError.message || '创建病例权限策略失败。');
    }
  }

  return createdCase;
}

export async function createGuidanceCaseRecord(
  actor: GuidanceActor,
  input: CreateGuidanceCaseInput,
) {
  return createCaseRecord(actor, {
    siteCode: input.siteCode,
    caseTitle: buildCaseTitle(input.caseTitle, input.title, [
      input.procedureName,
      input.patientSpecies,
      input.patientIdentifier,
    ]),
    caseStatus: input.sessionType === 'live_guidance' ? 'scheduled_for_guidance' : 'intake',
    originType: 'guidance',
    patientSpecies: input.patientSpecies,
    patientIdentifier: input.patientIdentifier,
    procedureName: input.procedureName,
    hospitalName: input.hospitalName,
    departmentName: input.departmentName,
    clinicalSummary: input.clinicalSummary,
    confidentialityLevel: input.confidentialityLevel,
    consentConfirmed: input.consentConfirmed,
    ownerUserId: input.surgeonUserId,
    participants: [
      input.assistantUserId ? { userId: input.assistantUserId, role: 'assistant' } : null,
      input.requestedExpertUserId ? { userId: input.requestedExpertUserId, role: 'expert' } : null,
      input.assignedExpertUserId ? { userId: input.assignedExpertUserId, role: 'expert' } : null,
      input.moderatorUserId ? { userId: input.moderatorUserId, role: 'moderator' } : null,
    ].filter(Boolean) as CaseParticipantInput[],
    metadata: {
      ...(input.metadata || {}),
      source_session_type: input.sessionType || 'live_guidance',
      created_via: 'guidance_session_request',
    },
  });
}

export async function createConsultationCaseRecord(
  actor: GuidanceActor,
  input: CreateConsultationCaseInput,
) {
  return createCaseRecord(actor, {
    siteCode: input.siteCode,
    caseTitle: buildCaseTitle(input.caseTitle, input.title, [
      input.procedureName,
      input.patientSpecies,
      input.patientIdentifier,
    ]),
    caseStatus: 'consulting',
    originType: 'consultation',
    patientSpecies: input.patientSpecies,
    patientIdentifier: input.patientIdentifier,
    procedureName: input.procedureName,
    hospitalName: input.hospitalName,
    departmentName: input.departmentName,
    clinicalSummary: input.questionSummary,
    confidentialityLevel: input.confidentialityLevel,
    consentConfirmed: input.consentConfirmed,
    ownerUserId: input.requesterUserId,
    participants: [
      input.requestedExpertUserId ? { userId: input.requestedExpertUserId, role: 'expert' } : null,
      input.assignedExpertUserId ? { userId: input.assignedExpertUserId, role: 'expert' } : null,
    ].filter(Boolean) as CaseParticipantInput[],
    metadata: {
      ...(input.metadata || {}),
      source_consultation_type: input.consultationType || 'case_plan',
      created_via: 'consultation_order_request',
    },
  });
}
