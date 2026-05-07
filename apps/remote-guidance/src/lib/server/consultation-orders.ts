import type { GuidanceActor } from '@/lib/server/guidance-api';
import { createConsultationCaseRecord } from '@/lib/server/case-records';
import { getSupabaseAdmin } from '@/lib/server/guidance-api';

type CreateConsultationOrderInput = {
  siteCode?: string | null;
  caseTitle?: string | null;
  title: string;
  consultationType?: string | null;
  pricingMode?: string | null;
  patientSpecies?: string | null;
  patientIdentifier?: string | null;
  procedureName?: string | null;
  hospitalName?: string | null;
  departmentName?: string | null;
  questionSummary: string;
  desiredResponseAt?: string | null;
  requestedBudgetAmount?: number | null;
  quotedPriceAmount?: number | null;
  currencyCode?: string | null;
  confidentialityLevel?: string | null;
  consentConfirmed?: boolean;
  requestedExpertUserId?: string | null;
  assignedExpertUserId?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type ConsultationOrderRecord = {
  id: string;
  order_no: string;
  site_code: string;
  case_id: string;
  title: string;
  consultation_type: string;
  order_status: string;
  pricing_mode: string;
  requester_user_id: string;
  requested_expert_user_id?: string | null;
  assigned_expert_user_id?: string | null;
  currency_code?: string | null;
  requested_budget_amount?: number | null;
  quoted_price_amount?: number | null;
  paid_amount?: number | null;
  desired_response_at?: string | null;
  delivery_due_at?: string | null;
  question_summary: string;
  confidentiality_level?: string | null;
  metadata?: Record<string, unknown> | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
};

export type ConsultationQuoteRecord = {
  id: string;
  consultation_order_id: string;
  quote_status: string;
  quoted_price_amount: number;
  currency_code?: string | null;
  platform_fee_amount?: number | null;
  expert_payout_amount?: number | null;
  billing_notes?: string | null;
  expires_at?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
};

export type ConsultationDeliverableRecord = {
  id: string;
  consultation_order_id: string;
  deliverable_type: string;
  deliverable_status: string;
  summary?: string | null;
  content_markdown?: string | null;
  submitted_by?: string | null;
  submitted_at?: string | null;
  approved_at?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type ConsultationFollowUpRequestRecord = {
  id: string;
  consultation_order_id: string;
  requester_user_id?: string | null;
  question_summary?: string | null;
  question_markdown: string;
  request_status: string;
  replied_deliverable_id?: string | null;
  responded_at?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type ConsultationGuidanceSessionRef = {
  id: string;
  title: string;
  status: string;
  session_no: string;
  created_at: string;
  scheduled_start_at?: string | null;
};

function createConsultationOrderNo() {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CONS-${datePart}-${randomPart}`;
}

async function getConsultationFollowUpRequestByOrderId(orderId: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('consultation_follow_up_requests')
    .select('*')
    .eq('consultation_order_id', orderId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || '读取咨询追问窗口失败。');
  }

  return (data || null) as ConsultationFollowUpRequestRecord | null;
}

export async function getConsultationAccess(orderId: string, actor: GuidanceActor) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data: order, error } = await supabaseAdmin
    .from('consultation_orders')
    .select('*')
    .eq('id', orderId)
    .maybeSingle();

  if (error || !order) {
    return null;
  }

  if (actor.isAdmin) {
    return {
      order: order as ConsultationOrderRecord,
      actorRole: 'admin',
      canManage: true,
      canQuote: true,
      canDeliver: true,
    };
  }

  const normalizedOrder = order as ConsultationOrderRecord;
  const directRoleMap: Array<[string | undefined | null, string]> = [
    [normalizedOrder.requester_user_id, 'requester'],
    [normalizedOrder.requested_expert_user_id || null, 'expert'],
    [normalizedOrder.assigned_expert_user_id || null, 'expert'],
    [normalizedOrder.created_by || null, 'requester'],
  ];

  for (const [userId, role] of directRoleMap) {
    if (userId && userId === actor.userId) {
      return {
        order: normalizedOrder,
        actorRole: role,
        canManage: role === 'requester',
        canQuote: role === 'expert',
        canDeliver: role === 'expert',
      };
    }
  }

  const { data: policy } = await supabaseAdmin
    .from('case_access_policies')
    .select('id, access_role, can_view, can_edit')
    .eq('case_id', normalizedOrder.case_id)
    .eq('user_id', actor.userId)
    .maybeSingle();

  if (!policy || policy.can_view === false) {
    return null;
  }

  const actorRole = String(policy.access_role || 'viewer');
  const canEdit = Boolean(policy.can_edit);

  return {
    order: normalizedOrder,
    actorRole,
    canManage: canEdit,
    canQuote: canEdit && ['expert', 'admin'].includes(actorRole),
    canDeliver: canEdit && ['expert', 'admin'].includes(actorRole),
  };
}

export async function getConsultationDetail(orderId: string, actor: GuidanceActor) {
  const access = await getConsultationAccess(orderId, actor);
  if (!access) {
    return null;
  }

  const supabaseAdmin = getSupabaseAdmin();
  const [caseRes, quoteRes, deliverablesRes, guidanceSessionsRes, followUpRequestRes] =
    await Promise.all([
      supabaseAdmin.from('case_records').select('*').eq('id', access.order.case_id).maybeSingle(),
      supabaseAdmin
        .from('consultation_quotes')
        .select('*')
        .eq('consultation_order_id', orderId)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('consultation_deliverables')
        .select('*')
        .eq('consultation_order_id', orderId)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('guidance_sessions')
        .select('id, title, status, session_no, created_at, scheduled_start_at')
        .eq('related_consultation_id', orderId)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('consultation_follow_up_requests')
        .select('*')
        .eq('consultation_order_id', orderId)
        .maybeSingle(),
    ]);

  return {
    order: access.order,
    caseRecord: caseRes.data,
    actorRole: access.actorRole,
    permissions: {
      canManage: access.canManage,
      canQuote: access.canQuote,
      canDeliver: access.canDeliver,
    },
    quotes: (quoteRes.data || []) as ConsultationQuoteRecord[],
    deliverables: (deliverablesRes.data || []) as ConsultationDeliverableRecord[],
    guidanceSessions: (guidanceSessionsRes.data || []) as ConsultationGuidanceSessionRef[],
    followUpRequest: (followUpRequestRes.data || null) as ConsultationFollowUpRequestRecord | null,
  };
}

type CreateConsultationQuoteInput = {
  quotedPriceAmount: number;
  currencyCode?: string | null;
  billingNotes?: string | null;
  expiresAt?: string | null;
  platformFeeAmount?: number | null;
  expertPayoutAmount?: number | null;
};

export async function createConsultationQuote(
  orderId: string,
  actor: GuidanceActor,
  input: CreateConsultationQuoteInput,
) {
  const access = await getConsultationAccess(orderId, actor);
  if (!access) {
    throw new Error('未找到该咨询订单，或当前账号无权访问。');
  }

  if (!access.canQuote) {
    throw new Error('当前账号不能为该咨询订单报价。');
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data: quote, error: quoteError } = await supabaseAdmin
    .from('consultation_quotes')
    .insert({
      consultation_order_id: orderId,
      quote_status: 'offered',
      quoted_price_amount: input.quotedPriceAmount,
      currency_code: input.currencyCode || access.order.currency_code || 'CNY',
      platform_fee_amount: input.platformFeeAmount ?? null,
      expert_payout_amount: input.expertPayoutAmount ?? null,
      billing_notes: input.billingNotes || null,
      expires_at: input.expiresAt || null,
      created_by: actor.userId,
    })
    .select('*')
    .single();

  if (quoteError || !quote) {
    throw new Error(quoteError?.message || '创建咨询报价失败。');
  }

  const { data: updatedOrder, error: orderError } = await supabaseAdmin
    .from('consultation_orders')
    .update({
      order_status: 'quoted',
      quoted_price_amount: input.quotedPriceAmount,
      currency_code: input.currencyCode || access.order.currency_code || 'CNY',
      assigned_expert_user_id: access.order.assigned_expert_user_id || actor.userId,
    })
    .eq('id', orderId)
    .select('*')
    .single();

  if (orderError || !updatedOrder) {
    throw new Error(orderError?.message || '更新咨询订单报价状态失败。');
  }

  return {
    order: updatedOrder as ConsultationOrderRecord,
    quote: quote as ConsultationQuoteRecord,
  };
}

type CreateConsultationDeliverableInput = {
  summary?: string | null;
  contentMarkdown?: string | null;
  deliverableType?: string | null;
};

export async function createConsultationDeliverable(
  orderId: string,
  actor: GuidanceActor,
  input: CreateConsultationDeliverableInput,
) {
  const access = await getConsultationAccess(orderId, actor);
  if (!access) {
    throw new Error('未找到该咨询订单，或当前账号无权访问。');
  }

  if (!access.canDeliver) {
    throw new Error('当前账号不能提交该咨询订单交付物。');
  }

  if (!['paid', 'in_progress', 'delivered'].includes(access.order.order_status)) {
    throw new Error('当前咨询订单尚未支付，暂时不能提交交付物。');
  }

  const supabaseAdmin = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { data: deliverable, error: deliverableError } = await supabaseAdmin
    .from('consultation_deliverables')
    .insert({
      consultation_order_id: orderId,
      deliverable_type: input.deliverableType || 'structured_plan',
      deliverable_status: 'submitted',
      summary: input.summary || null,
      content_markdown: input.contentMarkdown || null,
      submitted_by: actor.userId,
      submitted_at: now,
      metadata: {
        submitted_via: 'consultation_detail',
      },
    })
    .select('*')
    .single();

  if (deliverableError || !deliverable) {
    throw new Error(deliverableError?.message || '提交咨询交付物失败。');
  }

  const { data: updatedOrder, error: orderError } = await supabaseAdmin
    .from('consultation_orders')
    .update({
      order_status: 'delivered',
      assigned_expert_user_id: access.order.assigned_expert_user_id || actor.userId,
    })
    .eq('id', orderId)
    .select('*')
    .single();

  if (orderError || !updatedOrder) {
    throw new Error(orderError?.message || '更新咨询订单交付状态失败。');
  }

  return {
    order: updatedOrder as ConsultationOrderRecord,
    deliverable: deliverable as ConsultationDeliverableRecord,
  };
}

type CreateConsultationFollowUpRequestInput = {
  questionSummary?: string | null;
  questionMarkdown: string;
};

export async function createConsultationFollowUpRequest(
  orderId: string,
  actor: GuidanceActor,
  input: CreateConsultationFollowUpRequestInput,
) {
  const access = await getConsultationAccess(orderId, actor);
  if (!access) {
    throw new Error('未找到该咨询订单，或当前账号无权访问。');
  }

  if (!access.canManage && !actor.isAdmin) {
    throw new Error('当前账号不能发起该咨询订单的追问窗口。');
  }

  if (access.order.order_status !== 'delivered') {
    throw new Error('只有在专家首轮交付后，才能发起一次追问窗口。');
  }

  const existingFollowUpRequest = await getConsultationFollowUpRequestByOrderId(orderId);
  if (existingFollowUpRequest) {
    throw new Error('当前咨询订单的一次追问窗口已使用，不能重复发起。');
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data: sourceDeliverable, error: sourceDeliverableError } = await supabaseAdmin
    .from('consultation_deliverables')
    .select('id')
    .eq('consultation_order_id', orderId)
    .eq('deliverable_type', 'structured_plan')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (sourceDeliverableError) {
    throw new Error(sourceDeliverableError.message || '读取原始咨询交付物失败。');
  }

  if (!sourceDeliverable) {
    throw new Error('当前咨询订单还没有结构化方案交付，暂时不能发起追问。');
  }

  const now = new Date().toISOString();
  const { data: followUpRequest, error: followUpError } = await supabaseAdmin
    .from('consultation_follow_up_requests')
    .insert({
      consultation_order_id: orderId,
      requester_user_id: access.order.requester_user_id,
      question_summary: input.questionSummary || null,
      question_markdown: input.questionMarkdown,
      request_status: 'open',
      metadata: {
        created_via: 'consultation_detail',
        source_deliverable_id: sourceDeliverable.id,
      },
    })
    .select('*')
    .single();

  if (followUpError || !followUpRequest) {
    throw new Error(followUpError?.message || '创建咨询追问窗口失败。');
  }

  const { data: updatedOrder, error: orderError } = await supabaseAdmin
    .from('consultation_orders')
    .update({
      order_status: 'in_progress',
      metadata: {
        ...(access.order.metadata || {}),
        has_follow_up_window: true,
        follow_up_requested_at: now,
        follow_up_request_id: followUpRequest.id,
        follow_up_source_deliverable_id: sourceDeliverable.id,
      },
    })
    .eq('id', orderId)
    .select('*')
    .single();

  if (orderError || !updatedOrder) {
    throw new Error(orderError?.message || '更新咨询订单追问状态失败。');
  }

  return {
    order: updatedOrder as ConsultationOrderRecord,
    followUpRequest: followUpRequest as ConsultationFollowUpRequestRecord,
  };
}

type CreateConsultationFollowUpReplyInput = {
  summary?: string | null;
  contentMarkdown: string;
};

export async function createConsultationFollowUpReply(
  orderId: string,
  followUpRequestId: string,
  actor: GuidanceActor,
  input: CreateConsultationFollowUpReplyInput,
) {
  const access = await getConsultationAccess(orderId, actor);
  if (!access) {
    throw new Error('未找到该咨询订单，或当前账号无权访问。');
  }

  if (!access.canDeliver) {
    throw new Error('当前账号不能回复该咨询订单的追问。');
  }

  if (!['in_progress', 'delivered'].includes(access.order.order_status)) {
    throw new Error('当前咨询订单不在可回复追问的阶段。');
  }

  const followUpRequest = await getConsultationFollowUpRequestByOrderId(orderId);
  if (!followUpRequest || followUpRequest.id !== followUpRequestId) {
    throw new Error('未找到该追问窗口，或它不属于当前咨询订单。');
  }

  if (followUpRequest.request_status !== 'open') {
    throw new Error('当前追问窗口已经回复或关闭，不能再次提交回复。');
  }

  const supabaseAdmin = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { data: deliverable, error: deliverableError } = await supabaseAdmin
    .from('consultation_deliverables')
    .insert({
      consultation_order_id: orderId,
      deliverable_type: 'follow_up_reply',
      deliverable_status: 'submitted',
      summary: input.summary || null,
      content_markdown: input.contentMarkdown,
      submitted_by: actor.userId,
      submitted_at: now,
      metadata: {
        submitted_via: 'consultation_follow_up_reply',
        follow_up_request_id: followUpRequestId,
      },
    })
    .select('*')
    .single();

  if (deliverableError || !deliverable) {
    throw new Error(deliverableError?.message || '提交追问回复失败。');
  }

  const { data: updatedFollowUpRequest, error: followUpUpdateError } = await supabaseAdmin
    .from('consultation_follow_up_requests')
    .update({
      request_status: 'answered',
      replied_deliverable_id: deliverable.id,
      responded_at: now,
      metadata: {
        ...(followUpRequest.metadata || {}),
        answered_by_user_id: actor.userId,
        reply_deliverable_id: deliverable.id,
      },
    })
    .eq('id', followUpRequestId)
    .select('*')
    .single();

  if (followUpUpdateError || !updatedFollowUpRequest) {
    throw new Error(followUpUpdateError?.message || '更新追问窗口回复状态失败。');
  }

  const { data: updatedOrder, error: orderError } = await supabaseAdmin
    .from('consultation_orders')
    .update({
      order_status: 'delivered',
      assigned_expert_user_id: access.order.assigned_expert_user_id || actor.userId,
      metadata: {
        ...(access.order.metadata || {}),
        follow_up_replied_at: now,
        follow_up_reply_deliverable_id: deliverable.id,
      },
    })
    .eq('id', orderId)
    .select('*')
    .single();

  if (orderError || !updatedOrder) {
    throw new Error(orderError?.message || '更新咨询订单追问回复状态失败。');
  }

  return {
    order: updatedOrder as ConsultationOrderRecord,
    deliverable: deliverable as ConsultationDeliverableRecord,
    followUpRequest: updatedFollowUpRequest as ConsultationFollowUpRequestRecord,
  };
}

export async function approveConsultationDeliverable(
  orderId: string,
  deliverableId: string,
  actor: GuidanceActor,
) {
  const access = await getConsultationAccess(orderId, actor);
  if (!access) {
    throw new Error('未找到该咨询订单，或当前账号无权访问。');
  }

  if (!access.canManage && !actor.isAdmin) {
    throw new Error('当前账号不能确认该咨询订单的交付结果。');
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data: deliverable, error: deliverableError } = await supabaseAdmin
    .from('consultation_deliverables')
    .select('*')
    .eq('id', deliverableId)
    .eq('consultation_order_id', orderId)
    .maybeSingle();

  if (deliverableError || !deliverable) {
    throw new Error(deliverableError?.message || '未找到待确认的咨询交付物。');
  }

  const normalizedDeliverable = deliverable as ConsultationDeliverableRecord;
  if (normalizedDeliverable.deliverable_status === 'approved') {
    return {
      order: access.order,
      deliverable: normalizedDeliverable,
      followUpRequest: await getConsultationFollowUpRequestByOrderId(orderId),
    };
  }

  if (!['submitted', 'revised'].includes(normalizedDeliverable.deliverable_status)) {
    throw new Error('当前交付物还不在可确认状态。');
  }

  const followUpRequest = await getConsultationFollowUpRequestByOrderId(orderId);
  let updatedFollowUpRequest: ConsultationFollowUpRequestRecord | null = followUpRequest;

  if (normalizedDeliverable.deliverable_type === 'structured_plan' && followUpRequest) {
    throw new Error('当前咨询订单已进入追问阶段，请确认追问回复或使用关闭动作收口。');
  }

  if (normalizedDeliverable.deliverable_type === 'follow_up_reply') {
    if (!followUpRequest || followUpRequest.replied_deliverable_id !== normalizedDeliverable.id) {
      throw new Error('当前追问回复与咨询追问窗口不匹配，不能确认。');
    }

    if (followUpRequest.request_status !== 'answered') {
      throw new Error('当前追问窗口还不在待确认状态。');
    }
  }

  const approvedAt = new Date().toISOString();
  const { data: updatedDeliverable, error: updateDeliverableError } = await supabaseAdmin
    .from('consultation_deliverables')
    .update({
      deliverable_status: 'approved',
      approved_at: approvedAt,
      metadata: {
        ...(normalizedDeliverable.metadata || {}),
        approved_by_user_id: actor.userId,
        approved_at: approvedAt,
      },
    })
    .eq('id', normalizedDeliverable.id)
    .select('*')
    .single();

  if (updateDeliverableError || !updatedDeliverable) {
    throw new Error(updateDeliverableError?.message || '确认咨询交付物失败。');
  }

  if (followUpRequest && normalizedDeliverable.deliverable_type === 'follow_up_reply') {
    const { data: closedFollowUpRequest, error: closeFollowUpError } = await supabaseAdmin
      .from('consultation_follow_up_requests')
      .update({
        request_status: 'closed',
        metadata: {
          ...(followUpRequest.metadata || {}),
          requester_confirmed_at: approvedAt,
          requester_confirmed_by_user_id: actor.userId,
        },
      })
      .eq('id', followUpRequest.id)
      .select('*')
      .single();

    if (closeFollowUpError || !closedFollowUpRequest) {
      throw new Error(closeFollowUpError?.message || '关闭追问窗口失败。');
    }

    updatedFollowUpRequest = closedFollowUpRequest as ConsultationFollowUpRequestRecord;
  }

  const { data: updatedOrder, error: orderError } = await supabaseAdmin
    .from('consultation_orders')
    .update({
      order_status: 'closed',
      metadata: {
        ...(access.order.metadata || {}),
        requester_approved_deliverable_id: normalizedDeliverable.id,
        requester_approved_deliverable_type: normalizedDeliverable.deliverable_type,
        requester_approved_at: approvedAt,
        closed_via_approval: true,
      },
    })
    .eq('id', orderId)
    .select('*')
    .single();

  if (orderError || !updatedOrder) {
    throw new Error(orderError?.message || '更新咨询订单确认状态失败。');
  }

  return {
    order: updatedOrder as ConsultationOrderRecord,
    deliverable: updatedDeliverable as ConsultationDeliverableRecord,
    followUpRequest: updatedFollowUpRequest,
  };
}

export async function markConsultationOrderPaid(orderId: string, actor: GuidanceActor) {
  const access = await getConsultationAccess(orderId, actor);
  if (!access) {
    throw new Error('未找到该咨询订单，或当前账号无权访问。');
  }

  if (!access.canManage && !actor.isAdmin) {
    throw new Error('当前账号不能确认该咨询订单已支付。');
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data: latestQuote } = await supabaseAdmin
    .from('consultation_quotes')
    .select('*')
    .eq('consultation_order_id', orderId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const payableAmount =
    latestQuote?.quoted_price_amount ?? access.order.quoted_price_amount ?? null;
  if (typeof payableAmount !== 'number' || !Number.isFinite(payableAmount)) {
    throw new Error('当前咨询订单还没有有效报价，不能标记支付。');
  }

  if (latestQuote) {
    await supabaseAdmin
      .from('consultation_quotes')
      .update({ quote_status: 'accepted' })
      .eq('id', latestQuote.id);
  }

  const { data: updatedOrder, error: orderError } = await supabaseAdmin
    .from('consultation_orders')
    .update({
      order_status: 'paid',
      paid_amount: payableAmount,
      quoted_price_amount: payableAmount,
      metadata: {
        ...(access.order.metadata || {}),
        sandbox_payment_marked_at: new Date().toISOString(),
      },
    })
    .eq('id', orderId)
    .select('*')
    .single();

  if (orderError || !updatedOrder) {
    throw new Error(orderError?.message || '标记咨询订单已支付失败。');
  }

  return updatedOrder as ConsultationOrderRecord;
}

export async function markConsultationOrderClosed(orderId: string, actor: GuidanceActor) {
  const access = await getConsultationAccess(orderId, actor);
  if (!access) {
    throw new Error('未找到该咨询订单，或当前账号无权访问。');
  }

  if (!access.canManage && !actor.isAdmin) {
    throw new Error('当前账号不能关闭该咨询订单。');
  }

  if (access.order.order_status === 'closed') {
    return access.order;
  }

  if (['cancelled', 'refunded'].includes(access.order.order_status)) {
    throw new Error('当前咨询订单已终止，不能再关闭。');
  }

  const followUpRequest = await getConsultationFollowUpRequestByOrderId(orderId);
  if (followUpRequest?.request_status === 'open') {
    throw new Error('当前咨询订单还有待回复的追问，不能直接关闭。');
  }

  if (!['delivered', 'closed'].includes(access.order.order_status)) {
    throw new Error('当前咨询订单还未进入可关闭阶段。');
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data: updatedOrder, error: orderError } = await supabaseAdmin
    .from('consultation_orders')
    .update({
      order_status: 'closed',
      metadata: {
        ...(access.order.metadata || {}),
        closed_manually_at: new Date().toISOString(),
      },
    })
    .eq('id', orderId)
    .select('*')
    .single();

  if (orderError || !updatedOrder) {
    throw new Error(orderError?.message || '关闭咨询订单失败。');
  }

  return updatedOrder as ConsultationOrderRecord;
}

export async function markConsultationOrderRefunded(orderId: string, actor: GuidanceActor) {
  const access = await getConsultationAccess(orderId, actor);
  if (!access) {
    throw new Error('未找到该咨询订单，或当前账号无权访问。');
  }

  if (!access.canManage && !actor.isAdmin) {
    throw new Error('当前账号不能发起该咨询订单退款。');
  }

  if (access.order.order_status === 'refunded') {
    return access.order;
  }

  if (['requested', 'quoted', 'cancelled'].includes(access.order.order_status)) {
    throw new Error('当前咨询订单尚未形成可退款金额，不能标记退款。');
  }

  const followUpRequest = await getConsultationFollowUpRequestByOrderId(orderId);
  if (followUpRequest?.request_status === 'open') {
    throw new Error('当前咨询订单还有待回复的追问，不能直接退款。');
  }

  const refundableAmount =
    access.order.paid_amount ??
    access.order.quoted_price_amount ??
    access.order.requested_budget_amount ??
    null;
  if (typeof refundableAmount !== 'number' || !Number.isFinite(refundableAmount)) {
    throw new Error('当前咨询订单没有可退款金额记录。');
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data: updatedOrder, error: orderError } = await supabaseAdmin
    .from('consultation_orders')
    .update({
      order_status: 'refunded',
      metadata: {
        ...(access.order.metadata || {}),
        sandbox_refund_marked_at: new Date().toISOString(),
        sandbox_refunded_amount: refundableAmount,
        refunded_from_status: access.order.order_status,
      },
    })
    .eq('id', orderId)
    .select('*')
    .single();

  if (orderError || !updatedOrder) {
    throw new Error(orderError?.message || '标记咨询订单退款失败。');
  }

  return updatedOrder as ConsultationOrderRecord;
}

type SyncConsultationFromGuidanceInput = {
  consultationOrderId?: string | null;
  guidanceSessionId: string;
  guidanceSessionNo?: string | null;
  guidanceStatus: 'ended' | 'cancelled';
};

function restoreConsultationStatusAfterGuidance(order: ConsultationOrderRecord) {
  const previousStatus = order.metadata?.pre_guidance_order_status;
  if (typeof previousStatus === 'string' && previousStatus.length > 0) {
    return previousStatus;
  }

  if (typeof order.paid_amount === 'number' && Number.isFinite(order.paid_amount)) {
    return 'paid';
  }

  if (typeof order.quoted_price_amount === 'number' && Number.isFinite(order.quoted_price_amount)) {
    return 'quoted';
  }

  return 'requested';
}

export async function syncConsultationOrderFromGuidanceSession(
  input: SyncConsultationFromGuidanceInput,
) {
  if (!input.consultationOrderId) {
    return null;
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data: order, error: orderError } = await supabaseAdmin
    .from('consultation_orders')
    .select('*')
    .eq('id', input.consultationOrderId)
    .maybeSingle();

  if (orderError || !order) {
    throw new Error(orderError?.message || '未找到关联咨询订单，无法同步状态。');
  }

  const normalizedOrder = order as ConsultationOrderRecord;
  let nextStatus = normalizedOrder.order_status;

  if (input.guidanceStatus === 'ended') {
    if (!['cancelled', 'refunded', 'closed'].includes(normalizedOrder.order_status)) {
      nextStatus = 'closed';
    }
  } else if (normalizedOrder.order_status === 'in_progress') {
    nextStatus = restoreConsultationStatusAfterGuidance(normalizedOrder);
  }

  const syncedAt = new Date().toISOString();
  const nextMetadata: Record<string, unknown> = {
    ...(normalizedOrder.metadata || {}),
    last_guidance_session_id: input.guidanceSessionId,
    last_guidance_session_no: input.guidanceSessionNo || null,
    last_guidance_status: input.guidanceStatus,
    last_guidance_status_synced_at: syncedAt,
  };

  if (input.guidanceStatus === 'ended') {
    nextMetadata.guidance_completed_at = syncedAt;
  }

  if (input.guidanceStatus === 'cancelled') {
    nextMetadata.guidance_cancelled_at = syncedAt;
  }

  const { data: updatedOrder, error: updateError } = await supabaseAdmin
    .from('consultation_orders')
    .update({
      order_status: nextStatus,
      metadata: nextMetadata,
    })
    .eq('id', input.consultationOrderId)
    .select('*')
    .single();

  if (updateError || !updatedOrder) {
    throw new Error(updateError?.message || '同步咨询订单状态失败。');
  }

  return updatedOrder as ConsultationOrderRecord;
}

export async function createConsultationOrder(
  actor: GuidanceActor,
  input: CreateConsultationOrderInput,
) {
  const supabaseAdmin = getSupabaseAdmin();

  const caseRecord = await createConsultationCaseRecord(actor, {
    siteCode: input.siteCode,
    caseTitle: input.caseTitle,
    title: input.title,
    consultationType: input.consultationType,
    patientSpecies: input.patientSpecies,
    patientIdentifier: input.patientIdentifier,
    procedureName: input.procedureName,
    hospitalName: input.hospitalName,
    departmentName: input.departmentName,
    questionSummary: input.questionSummary,
    confidentialityLevel: input.confidentialityLevel,
    consentConfirmed: input.consentConfirmed,
    requesterUserId: actor.userId,
    requestedExpertUserId: input.requestedExpertUserId,
    assignedExpertUserId: input.assignedExpertUserId,
    metadata: input.metadata,
  });

  const orderNo = createConsultationOrderNo();

  const { data: consultationOrder, error: orderError } = await supabaseAdmin
    .from('consultation_orders')
    .insert({
      order_no: orderNo,
      site_code: input.siteCode || 'cn',
      case_id: caseRecord.id,
      title: input.title,
      consultation_type: input.consultationType || 'case_plan',
      order_status: 'requested',
      pricing_mode: input.pricingMode || 'fixed_package',
      requester_user_id: actor.userId,
      requested_expert_user_id: input.requestedExpertUserId || null,
      assigned_expert_user_id: input.assignedExpertUserId || null,
      currency_code: input.currencyCode || 'CNY',
      requested_budget_amount: input.requestedBudgetAmount ?? null,
      quoted_price_amount: input.quotedPriceAmount ?? null,
      desired_response_at: input.desiredResponseAt || null,
      question_summary: input.questionSummary,
      confidentiality_level: input.confidentialityLevel || 'restricted',
      metadata: {
        ...(input.metadata || {}),
        case_id: caseRecord.id,
        case_no: caseRecord.case_no,
      },
      created_by: actor.userId,
    })
    .select('*')
    .single();

  if (orderError || !consultationOrder) {
    await supabaseAdmin.from('case_records').delete().eq('id', caseRecord.id);
    throw new Error(orderError?.message || '创建付费咨询订单失败。');
  }

  let consultationQuote = null;
  if (typeof input.quotedPriceAmount === 'number' && Number.isFinite(input.quotedPriceAmount)) {
    const { data: createdQuote, error: quoteError } = await supabaseAdmin
      .from('consultation_quotes')
      .insert({
        consultation_order_id: consultationOrder.id,
        quote_status: input.assignedExpertUserId ? 'offered' : 'pending',
        quoted_price_amount: input.quotedPriceAmount,
        currency_code: input.currencyCode || 'CNY',
        created_by: actor.userId,
      })
      .select('*')
      .single();

    if (quoteError) {
      await supabaseAdmin.from('consultation_orders').delete().eq('id', consultationOrder.id);
      await supabaseAdmin.from('case_records').delete().eq('id', caseRecord.id);
      throw new Error(quoteError.message || '创建咨询报价失败。');
    }

    consultationQuote = createdQuote;
  }

  return {
    caseRecord,
    consultationOrder,
    consultationQuote,
  };
}
