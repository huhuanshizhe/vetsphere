import { NextRequest } from 'next/server';
import { createConsultationOrder } from '@/lib/server/consultation-orders';
import { apiError, apiSuccess, getGuidanceActor, supabaseAdmin } from '@/lib/server/guidance-api';

type ConsultationOrderRecord = {
  id: string;
  created_at: string;
  title: string;
  order_no: string;
  order_status: string;
  [key: string]: unknown;
};

type CreateConsultationBody = {
  case_title?: string;
  title?: string;
  consultation_type?: string;
  pricing_mode?: string;
  patient_species?: string;
  patient_identifier?: string;
  procedure_name?: string;
  hospital_name?: string;
  department_name?: string;
  question_summary?: string;
  desired_response_at?: string;
  requested_budget_amount?: string | number;
  quoted_price_amount?: string | number;
  currency_code?: string;
  confidentiality_level?: string;
  consent_confirmed?: boolean;
  requested_expert_user_id?: string;
  assigned_expert_user_id?: string;
  metadata?: Record<string, unknown>;
};

function toNullableNumber(value: string | number | undefined) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const normalized = value.trim();
    if (!normalized) {
      return null;
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export async function GET(request: NextRequest) {
  const actor = await getGuidanceActor(request);
  if (!actor) {
    return apiError(401, '请先登录后再访问付费咨询。', null);
  }

  if (!actor.canAccessDoctorWorkspace) {
    return apiError(403, '当前账号没有医生工作台访问权限。', null);
  }

  const query = actor.isAdmin
    ? supabaseAdmin.from('consultation_orders').select('*')
    : supabaseAdmin
        .from('consultation_orders')
        .select('*')
        .or(
          [
            `requester_user_id.eq.${actor.userId}`,
            `requested_expert_user_id.eq.${actor.userId}`,
            `assigned_expert_user_id.eq.${actor.userId}`,
            `created_by.eq.${actor.userId}`,
          ].join(','),
        );

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    return apiError(500, '加载付费咨询订单失败。', error.message);
  }

  const orders = ((data || []) as ConsultationOrderRecord[]).sort((left, right) => {
    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
  });

  return apiSuccess({ orders }, '付费咨询订单加载成功。');
}

export async function POST(request: NextRequest) {
  const actor = await getGuidanceActor(request);
  if (!actor) {
    return apiError(401, '请先登录后再发起付费咨询。', null);
  }

  if (!actor.canAccessDoctorWorkspace) {
    return apiError(403, '当前账号没有医生工作台访问权限。', null);
  }

  const body = (await request.json()) as CreateConsultationBody;
  const title = String(body.title || '').trim();
  const questionSummary = String(body.question_summary || '').trim();

  if (!title) {
    return apiError(400, '请填写咨询标题。', null);
  }

  if (!questionSummary) {
    return apiError(400, '请填写问题描述。', null);
  }

  try {
    const created = await createConsultationOrder(actor, {
      siteCode: 'cn',
      caseTitle: body.case_title || null,
      title,
      consultationType: body.consultation_type || 'case_plan',
      pricingMode: body.pricing_mode || 'fixed_package',
      patientSpecies: body.patient_species || null,
      patientIdentifier: body.patient_identifier || null,
      procedureName: body.procedure_name || null,
      hospitalName: body.hospital_name || actor.cnProfile?.organization_name || null,
      departmentName: body.department_name || null,
      questionSummary,
      desiredResponseAt: body.desired_response_at || null,
      requestedBudgetAmount: toNullableNumber(body.requested_budget_amount),
      quotedPriceAmount: toNullableNumber(body.quoted_price_amount),
      currencyCode: body.currency_code || 'CNY',
      confidentialityLevel: body.confidentiality_level || 'restricted',
      consentConfirmed: Boolean(body.consent_confirmed),
      requestedExpertUserId: body.requested_expert_user_id || null,
      assignedExpertUserId: body.assigned_expert_user_id || null,
      metadata: body.metadata || {},
    });

    return apiSuccess(
      {
        order: created.consultationOrder,
        caseRecord: created.caseRecord,
        quote: created.consultationQuote,
      },
      '付费咨询创建成功。',
      201,
    );
  } catch (error) {
    return apiError(500, error instanceof Error ? error.message : '创建付费咨询失败。', null);
  }
}
