import { NextRequest } from 'next/server';
import { apiError, apiSuccess, getGuidanceActor, supabaseAdmin } from '@/lib/server/guidance-api';
import { getConsultationAccess } from '@/lib/server/consultation-orders';
import { createGuidanceSession } from '@/lib/server/guidance-sessions';

type RouteProps = {
  params: Promise<{ id: string }>;
};

type UpgradeBody = {
  title?: string;
  priority?: string;
  scheduled_start_at?: string;
  scheduled_end_at?: string;
};

type ExistingGuidanceSessionSummary = {
  id: string;
  status?: string | null;
  session_no?: string | null;
};

export async function POST(request: NextRequest, { params }: RouteProps) {
  const actor = await getGuidanceActor(request);
  if (!actor) {
    return apiError(401, '请先登录后再升级到术中指导。', null);
  }

  if (!actor.canAccessRemoteGuidance) {
    return apiError(403, '当前账号没有远程指导访问权限。', null);
  }

  const { id } = await params;
  const access = await getConsultationAccess(id, actor);
  if (!access) {
    return apiError(404, '未找到该咨询订单，或当前账号无权访问。', null);
  }

  if (!access.canManage && !actor.isAdmin) {
    return apiError(403, '当前账号不能将该咨询升级为术中指导。', null);
  }

  const { data: existingSessions } = await supabaseAdmin
    .from('guidance_sessions')
    .select('*')
    .eq('related_consultation_id', access.order.id)
    .order('created_at', { ascending: false })
    .limit(5);

  const reusableSession = ((existingSessions || []) as ExistingGuidanceSessionSummary[]).find(
    (session) => !['cancelled', 'ended', 'archived'].includes(String(session.status || '')),
  );

  const preservedPreGuidanceStatus =
    typeof access.order.metadata?.pre_guidance_order_status === 'string'
      ? access.order.metadata.pre_guidance_order_status
      : access.order.order_status;

  if (reusableSession) {
    await supabaseAdmin
      .from('consultation_orders')
      .update({
        metadata: {
          ...(access.order.metadata || {}),
          pre_guidance_order_status: preservedPreGuidanceStatus,
          upgraded_guidance_session_id: reusableSession.id,
          upgraded_guidance_session_no: reusableSession.session_no,
        },
      })
      .eq('id', access.order.id);

    return apiSuccess(
      {
        session: reusableSession,
        caseRecord: null,
        reused: true,
      },
      '当前咨询已存在关联的术中指导会话，已返回现有会话。',
      200,
    );
  }

  const body = (await request.json()) as UpgradeBody;
  const { data: caseRecord } = await supabaseAdmin
    .from('case_records')
    .select('*')
    .eq('id', access.order.case_id)
    .maybeSingle();

  if (!caseRecord) {
    return apiError(500, '当前咨询缺少对应病例主档。', null);
  }

  try {
    const created = await createGuidanceSession(actor, {
      title: String(body.title || '').trim() || `术中指导 · ${access.order.title}`,
      sessionType: 'live_guidance',
      priority: body.priority || 'urgent',
      siteCode: access.order.site_code,
      surgeonUserId: access.order.requester_user_id,
      requestedExpertUserId: access.order.requested_expert_user_id || null,
      assignedExpertUserId: access.order.assigned_expert_user_id || null,
      hospitalName: caseRecord.hospital_name || null,
      departmentName: caseRecord.department_name || null,
      patientSpecies: caseRecord.patient_species || null,
      patientIdentifier: caseRecord.patient_identifier || null,
      procedureName: caseRecord.procedure_name || null,
      clinicalSummary: access.order.question_summary || caseRecord.clinical_summary || null,
      scheduledStartAt: body.scheduled_start_at || null,
      scheduledEndAt: body.scheduled_end_at || null,
      consentConfirmed: Boolean(caseRecord.consent_confirmed),
      confidentialityLevel:
        caseRecord.confidentiality_level || access.order.confidentiality_level || 'restricted',
      existingCaseRecord: {
        id: caseRecord.id,
        case_no: caseRecord.case_no,
      },
      relatedConsultationId: access.order.id,
      metadata: {
        created_via: 'consultation_upgrade',
        consultation_order_id: access.order.id,
        consultation_order_no: access.order.order_no,
        consultation_type: access.order.consultation_type,
      },
    });

    await supabaseAdmin
      .from('consultation_orders')
      .update({
        order_status: ['requested', 'quoted', 'paid'].includes(access.order.order_status)
          ? 'in_progress'
          : access.order.order_status,
        metadata: {
          ...(access.order.metadata || {}),
          pre_guidance_order_status: preservedPreGuidanceStatus,
          guidance_upgrade_requested_at: new Date().toISOString(),
          upgraded_guidance_session_id: created.session.id,
          upgraded_guidance_session_no: created.session.session_no,
        },
      })
      .eq('id', access.order.id);

    return apiSuccess(created, '已升级为术中指导会话。', 201);
  } catch (error) {
    return apiError(500, error instanceof Error ? error.message : '升级为术中指导失败。', null);
  }
}
