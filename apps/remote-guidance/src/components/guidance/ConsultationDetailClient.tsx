'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { getAccessTokenSafe } from '@vetsphere/shared/services/supabase';
import { guidanceStatusLabels } from '@/lib/guidance-display';

type ConsultationOrder = {
  id: string;
  order_no: string;
  title: string;
  order_status: string;
  consultation_type: string;
  pricing_mode: string;
  desired_response_at?: string | null;
  delivery_due_at?: string | null;
  question_summary: string;
  currency_code?: string | null;
  requested_budget_amount?: number | null;
  quoted_price_amount?: number | null;
  metadata?: {
    case_no?: string;
  } | null;
};

type CaseRecord = {
  id: string;
  case_no: string;
  case_title: string;
  case_status: string;
  procedure_name?: string | null;
  hospital_name?: string | null;
  department_name?: string | null;
  patient_species?: string | null;
  patient_identifier?: string | null;
  clinical_summary?: string | null;
  confidentiality_level?: string | null;
  consent_confirmed?: boolean | null;
};

type ConsultationQuote = {
  id: string;
  quote_status: string;
  quoted_price_amount: number;
  currency_code?: string | null;
  billing_notes?: string | null;
  expires_at?: string | null;
  created_at: string;
};

type ConsultationDeliverable = {
  id: string;
  deliverable_type: string;
  deliverable_status: string;
  summary?: string | null;
  content_markdown?: string | null;
  submitted_at?: string | null;
  approved_at?: string | null;
  created_at: string;
};

type ConsultationFollowUpRequest = {
  id: string;
  question_summary?: string | null;
  question_markdown: string;
  request_status: string;
  replied_deliverable_id?: string | null;
  responded_at?: string | null;
  created_at: string;
};

type ConsultationDetail = {
  order: ConsultationOrder;
  caseRecord: CaseRecord | null;
  actorRole: string | null;
  permissions: {
    canManage: boolean;
    canQuote: boolean;
    canDeliver: boolean;
  };
  quotes: ConsultationQuote[];
  deliverables: ConsultationDeliverable[];
  followUpRequest: ConsultationFollowUpRequest | null;
  guidanceSessions: Array<{
    id: string;
    title: string;
    status: string;
    session_no: string;
    created_at: string;
    scheduled_start_at?: string | null;
  }>;
};

const statusLabelMap: Record<string, string> = {
  draft: '草稿',
  requested: '待处理',
  quoted: '已报价',
  paid: '已支付',
  in_progress: '专家处理中',
  delivered: '已交付',
  closed: '已关闭',
  cancelled: '已取消',
  refunded: '已退款',
};

const quoteStatusLabelMap: Record<string, string> = {
  pending: '待准备',
  offered: '已发送',
  accepted: '已接受',
  rejected: '已拒绝',
  expired: '已过期',
};

const deliverableStatusLabelMap: Record<string, string> = {
  pending: '待提交',
  submitted: '已提交',
  revised: '已修订',
  approved: '已确认',
};

const deliverableTypeLabelMap: Record<string, string> = {
  structured_plan: '结构化方案',
  follow_up_reply: '追问回复',
};

const followUpStatusLabelMap: Record<string, string> = {
  open: '待回复',
  answered: '已回复',
  closed: '已关闭',
  cancelled: '已取消',
};

const guidancePriorityLabelMap: Record<string, string> = {
  routine: '常规',
  urgent: '加急',
  critical: '危急',
};

export default function ConsultationDetailClient({ consultationId }: { consultationId: string }) {
  const [detail, setDetail] = useState<ConsultationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [quoteForm, setQuoteForm] = useState({
    quoted_price_amount: '',
    currency_code: 'CNY',
    billing_notes: '',
    expires_at: '',
  });
  const [deliverableForm, setDeliverableForm] = useState({
    summary: '',
    content_markdown: '',
    deliverable_type: 'structured_plan',
  });
  const [followUpForm, setFollowUpForm] = useState({
    question_summary: '',
    question_markdown: '',
  });
  const [followUpReplyForm, setFollowUpReplyForm] = useState({
    summary: '',
    content_markdown: '',
  });
  const [upgradeForm, setUpgradeForm] = useState({
    title: '',
    priority: 'urgent',
    scheduled_start_at: '',
    scheduled_end_at: '',
  });

  async function fetchDetail() {
    setLoading(true);
    setError(null);

    try {
      const token = await getAccessTokenSafe();
      if (!token) {
        throw new Error('未获取到登录态，请先完成中国站登录。');
      }

      const response = await fetch(`/api/consultations/${consultationId}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || '加载咨询详情失败。');
      }

      setDetail(payload?.data || null);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : '加载咨询详情失败。');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchDetail();
  }, [consultationId]);

  const headerMeta = useMemo(() => {
    if (!detail) return [];

    return [
      detail.caseRecord?.case_no || detail.order.metadata?.case_no || '未绑定病例编号',
      detail.caseRecord?.procedure_name || '未填写术式',
      detail.caseRecord?.hospital_name || '未填写机构',
      detail.order.pricing_mode === 'subscription_overage' ? '订阅超额' : '固定价咨询包',
    ];
  }, [detail]);

  const linkedGuidanceSession = useMemo(() => {
    if (!detail) {
      return null;
    }

    return (
      detail.guidanceSessions.find(
        (session) => !['cancelled', 'ended', 'archived'].includes(session.status),
      ) ||
      detail.guidanceSessions[0] ||
      null
    );
  }, [detail]);

  const followUpReplyDeliverable = useMemo(() => {
    if (!detail?.followUpRequest?.replied_deliverable_id) {
      return null;
    }

    return (
      detail.deliverables.find(
        (deliverable) => deliverable.id === detail.followUpRequest?.replied_deliverable_id,
      ) || null
    );
  }, [detail]);

  async function runAction(path: string, body: Record<string, unknown>, successMessage: string) {
    setBusyAction(path);
    setActionError(null);
    setActionMessage(null);

    try {
      const token = await getAccessTokenSafe();
      if (!token) {
        throw new Error('未获取到登录态，请先完成中国站登录。');
      }

      const response = await fetch(path, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || '操作失败。');
      }

      setActionMessage(successMessage);
      await fetchDetail();
      return true;
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : '操作失败。');
      return false;
    } finally {
      setBusyAction(null);
    }
  }

  async function submitQuote() {
    await runAction(
      `/api/consultations/${consultationId}/quote`,
      quoteForm,
      '报价已提交，订单状态已推进到已报价。',
    );
  }

  async function submitDeliverable() {
    await runAction(
      `/api/consultations/${consultationId}/deliverables`,
      deliverableForm,
      '交付物已提交，订单状态已推进到已交付。',
    );
  }

  async function markPaid() {
    await runAction(
      `/api/consultations/${consultationId}/mark-paid`,
      {},
      '咨询订单已标记为已支付，可以进入专家交付阶段。',
    );
  }

  async function markClosed() {
    await runAction(`/api/consultations/${consultationId}/close`, {}, '咨询订单已关闭。');
  }

  async function markRefunded() {
    await runAction(`/api/consultations/${consultationId}/refund`, {}, '咨询订单已标记为退款。');
  }

  async function submitFollowUpRequest() {
    const succeeded = await runAction(
      `/api/consultations/${consultationId}/follow-ups`,
      followUpForm,
      '追问已提交，订单已重新进入处理中。',
    );

    if (succeeded) {
      setFollowUpForm({
        question_summary: '',
        question_markdown: '',
      });
    }
  }

  async function submitFollowUpReply() {
    if (!detail?.followUpRequest?.id) {
      return;
    }

    const succeeded = await runAction(
      `/api/consultations/${consultationId}/follow-ups/${detail.followUpRequest.id}/reply`,
      followUpReplyForm,
      '追问回复已提交，订单回到已交付。',
    );

    if (succeeded) {
      setFollowUpReplyForm({
        summary: '',
        content_markdown: '',
      });
    }
  }

  async function approveDeliverable(deliverableId: string, deliverableType: string) {
    await runAction(
      `/api/consultations/${consultationId}/deliverables/${deliverableId}/approve`,
      {},
      deliverableType === 'follow_up_reply'
        ? '追问回复已确认，咨询订单已关闭。'
        : '交付方案已确认，咨询订单已关闭。',
    );
  }

  function canApproveDeliverable(deliverable: ConsultationDeliverable) {
    if (!detail?.permissions.canManage) {
      return false;
    }

    if (!['submitted', 'revised'].includes(deliverable.deliverable_status)) {
      return false;
    }

    if (deliverable.deliverable_type === 'structured_plan') {
      return detail.order.order_status === 'delivered' && !detail.followUpRequest;
    }

    if (deliverable.deliverable_type === 'follow_up_reply') {
      return (
        detail.order.order_status === 'delivered' &&
        detail.followUpRequest?.request_status === 'answered' &&
        detail.followUpRequest?.replied_deliverable_id === deliverable.id
      );
    }

    return false;
  }

  async function upgradeToGuidance() {
    if (linkedGuidanceSession?.id) {
      window.location.href = `/guidance/${linkedGuidanceSession.id}/details`;
      return;
    }

    setBusyAction('upgrade-to-guidance');
    setActionError(null);
    setActionMessage(null);

    try {
      const token = await getAccessTokenSafe();
      if (!token) {
        throw new Error('未获取到登录态，请先完成中国站登录。');
      }

      const response = await fetch(`/api/consultations/${consultationId}/upgrade-to-guidance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: upgradeForm.title.trim() || undefined,
          priority: upgradeForm.priority,
          scheduled_start_at: upgradeForm.scheduled_start_at || undefined,
          scheduled_end_at: upgradeForm.scheduled_end_at || undefined,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || '升级到术中指导失败。');
      }

      const sessionId = payload?.data?.session?.id as string | undefined;
      if (sessionId) {
        window.location.href = `/guidance/${sessionId}/details`;
        return;
      }

      await fetchDetail();
      setActionMessage('已升级为术中指导会话。');
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : '升级到术中指导失败。');
    } finally {
      setBusyAction(null);
    }
  }

  if (loading) {
    return (
      <main className="guidance-shell">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-8 lg:px-8">
          <div className="guidance-card h-64 animate-pulse rounded-[2rem]" />
          <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
            <div className="guidance-card h-96 animate-pulse rounded-[2rem]" />
            <div className="guidance-card h-96 animate-pulse rounded-[2rem]" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !detail) {
    return (
      <main className="guidance-shell">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 py-8 lg:px-8">
          <section className="guidance-card rounded-[2rem] px-7 py-8">
            <h1 className="text-2xl font-semibold text-slate-950">咨询详情加载失败</h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {error || '当前咨询订单不存在或无权访问。'}
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => void fetchDetail()}
                className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
              >
                重新加载
              </button>
              <Link
                href="/consultations"
                className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700"
              >
                返回咨询列表
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="guidance-shell">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-8 lg:px-8">
        <section className="guidance-card overflow-hidden rounded-[2rem]">
          <div className="grid gap-8 px-7 py-8 lg:grid-cols-[1.4fr_0.6fr] lg:px-10">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="guidance-pill inline-flex bg-amber-50 text-amber-700">
                  {statusLabelMap[detail.order.order_status] || detail.order.order_status}
                </span>
                {detail.caseRecord?.case_no ? (
                  <span className="guidance-pill inline-flex bg-sky-50 text-sky-700">
                    {detail.caseRecord.case_no}
                  </span>
                ) : null}
                <span className="guidance-pill inline-flex bg-slate-100 text-slate-700">
                  角色：{detail.actorRole || '未知'}
                </span>
              </div>
              <div>
                <h1 className="font-serif text-4xl leading-tight text-slate-950">
                  {detail.order.title}
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
                  {detail.order.question_summary}
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-slate-500">
                {headerMeta.map((item) => (
                  <span key={item} className="rounded-full border border-slate-200 px-3 py-1">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-[1.5rem] bg-slate-950 px-6 py-6 text-white">
              <div className="text-sm text-slate-300">订单信息</div>
              <div className="mt-4 space-y-3 text-sm">
                <div>订单号：{detail.order.order_no}</div>
                <div>
                  目标金额：
                  {typeof detail.order.quoted_price_amount === 'number'
                    ? `${detail.order.currency_code || 'CNY'} ${detail.order.quoted_price_amount}`
                    : typeof detail.order.requested_budget_amount === 'number'
                      ? `${detail.order.currency_code || 'CNY'} ${detail.order.requested_budget_amount}`
                      : '待报价'}
                </div>
                <div>
                  期望回复：
                  {detail.order.desired_response_at
                    ? new Date(detail.order.desired_response_at).toLocaleString('zh-CN')
                    : '未填写'}
                </div>
                <div>
                  交付截止：
                  {detail.order.delivery_due_at
                    ? new Date(detail.order.delivery_due_at).toLocaleString('zh-CN')
                    : '未填写'}
                </div>
              </div>
            </div>
          </div>
        </section>

        {actionMessage || actionError ? (
          <section className="guidance-card rounded-[1.5rem] px-6 py-4">
            {actionMessage ? <div className="text-sm text-teal-700">{actionMessage}</div> : null}
            {actionError ? <div className="text-sm text-rose-700">{actionError}</div> : null}
          </section>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="flex flex-col gap-6">
            <section className="guidance-card rounded-[2rem] px-7 py-7">
              <h2 className="text-xl font-semibold text-slate-950">病例主档</h2>
              <div className="mt-5 grid gap-4 text-sm text-slate-600 md:grid-cols-2">
                <InfoRow label="病例标题" value={detail.caseRecord?.case_title || '未填写'} />
                <InfoRow label="病例状态" value={detail.caseRecord?.case_status || '未填写'} />
                <InfoRow label="术式" value={detail.caseRecord?.procedure_name || '未填写'} />
                <InfoRow label="机构" value={detail.caseRecord?.hospital_name || '未填写'} />
                <InfoRow label="科室" value={detail.caseRecord?.department_name || '未填写'} />
                <InfoRow label="物种" value={detail.caseRecord?.patient_species || '未填写'} />
                <InfoRow
                  label="患者标识"
                  value={detail.caseRecord?.patient_identifier || '未填写'}
                />
                <InfoRow
                  label="知情同意"
                  value={detail.caseRecord?.consent_confirmed ? '已确认' : '未确认'}
                />
              </div>
              <div className="mt-5 rounded-[1.5rem] bg-slate-50 px-5 py-4 text-sm leading-7 text-slate-600">
                {detail.caseRecord?.clinical_summary || '当前尚未填写结构化病例摘要。'}
              </div>
            </section>

            <section className="guidance-card rounded-[2rem] px-7 py-7">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold text-slate-950">关联术中指导</h2>
                {detail.permissions.canManage ? (
                  <button
                    type="button"
                    onClick={() => void upgradeToGuidance()}
                    disabled={busyAction === 'upgrade-to-guidance'}
                    className="rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busyAction === 'upgrade-to-guidance'
                      ? '正在创建指导会话...'
                      : linkedGuidanceSession
                        ? '打开现有术中指导'
                        : '升级到术中指导'}
                  </button>
                ) : null}
              </div>
              {detail.permissions.canManage && !linkedGuidanceSession ? (
                <div className="mt-5 grid gap-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-5 md:grid-cols-2">
                  <label className="grid gap-2 md:col-span-2">
                    <span className="text-sm font-medium text-slate-700">指导会话标题</span>
                    <input
                      value={upgradeForm.title}
                      onChange={(event) =>
                        setUpgradeForm((current) => ({ ...current, title: event.target.value }))
                      }
                      placeholder={`默认：术中指导 · ${detail.order.title}`}
                      className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-teal-500"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-slate-700">优先级</span>
                    <select
                      value={upgradeForm.priority}
                      onChange={(event) =>
                        setUpgradeForm((current) => ({ ...current, priority: event.target.value }))
                      }
                      className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-teal-500"
                    >
                      {Object.entries(guidancePriorityLabelMap).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="rounded-[1.15rem] border border-dashed border-slate-300 px-4 py-3 text-sm leading-7 text-slate-500">
                    创建后会沿用当前病例主档、专家归属和咨询摘要，只把这次升级补成真正可排期的
                    guidance 会话。
                  </div>
                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-slate-700">计划开始</span>
                    <input
                      type="datetime-local"
                      value={upgradeForm.scheduled_start_at}
                      onChange={(event) =>
                        setUpgradeForm((current) => ({
                          ...current,
                          scheduled_start_at: event.target.value,
                        }))
                      }
                      className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-teal-500"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-slate-700">计划结束</span>
                    <input
                      type="datetime-local"
                      value={upgradeForm.scheduled_end_at}
                      onChange={(event) =>
                        setUpgradeForm((current) => ({
                          ...current,
                          scheduled_end_at: event.target.value,
                        }))
                      }
                      className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-teal-500"
                    />
                  </label>
                </div>
              ) : null}
              {detail.permissions.canManage && linkedGuidanceSession ? (
                <div className="mt-5 rounded-[1.5rem] border border-teal-200 bg-teal-50 px-5 py-4 text-sm leading-7 text-teal-800">
                  当前咨询已经关联术中指导会话。入口按钮会直接打开现有会话，避免重复创建。
                </div>
              ) : null}
              {detail.guidanceSessions.length === 0 ? (
                <div className="mt-5 rounded-[1.5rem] border border-dashed border-slate-300 px-5 py-8 text-sm text-slate-500">
                  当前还没有基于该咨询升级出的术中指导会话。
                </div>
              ) : (
                <div className="mt-5 grid gap-4">
                  {detail.guidanceSessions.map((session) => (
                    <article
                      key={session.id}
                      className="rounded-[1.5rem] border border-slate-200 px-5 py-5"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="guidance-pill bg-teal-50 text-teal-700">
                              {guidanceStatusLabels[session.status] || session.status}
                            </span>
                            <span className="guidance-pill bg-slate-100 text-slate-700">
                              {session.session_no}
                            </span>
                          </div>
                          <div className="mt-3 text-lg font-semibold text-slate-950">
                            {session.title}
                          </div>
                          <div className="mt-2 text-sm text-slate-500">
                            排期：
                            {session.scheduled_start_at
                              ? new Date(session.scheduled_start_at).toLocaleString('zh-CN')
                              : '待排期'}
                          </div>
                        </div>
                        <Link
                          href={`/guidance/${session.id}/details`}
                          className="text-sm font-semibold text-teal-700"
                        >
                          查看指导详情
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="guidance-card rounded-[2rem] px-7 py-7">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold text-slate-950">追问窗口</h2>
                {detail.followUpRequest ? (
                  <span className="guidance-pill bg-amber-50 text-amber-700">
                    {followUpStatusLabelMap[detail.followUpRequest.request_status] ||
                      detail.followUpRequest.request_status}
                  </span>
                ) : null}
              </div>
              {!detail.followUpRequest ? (
                <div className="mt-5 rounded-[1.5rem] border border-dashed border-slate-300 px-5 py-8 text-sm leading-7 text-slate-500">
                  当前还没有发起追问窗口。首轮结构化交付完成后，请求方可以追加一次追问。
                </div>
              ) : (
                <div className="mt-5 grid gap-4">
                  <article className="rounded-[1.5rem] border border-slate-200 px-5 py-5">
                    <div className="text-sm text-slate-500">
                      发起时间：
                      {new Date(detail.followUpRequest.created_at).toLocaleString('zh-CN')}
                    </div>
                    {detail.followUpRequest.question_summary ? (
                      <div className="mt-3 text-base font-semibold text-slate-950">
                        {detail.followUpRequest.question_summary}
                      </div>
                    ) : null}
                    <div className="mt-3 whitespace-pre-wrap rounded-[1.25rem] bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
                      {detail.followUpRequest.question_markdown}
                    </div>
                    {followUpReplyDeliverable ? (
                      <div className="mt-4 rounded-[1.25rem] border border-teal-200 bg-teal-50 px-4 py-4 text-sm leading-7 text-teal-900">
                        <div className="font-semibold">专家已回复</div>
                        <div className="mt-2 text-xs text-teal-700">
                          回复时间：
                          {detail.followUpRequest.responded_at
                            ? new Date(detail.followUpRequest.responded_at).toLocaleString('zh-CN')
                            : '待补写'}
                        </div>
                        {followUpReplyDeliverable.summary ? (
                          <div className="mt-3 font-medium text-teal-950">
                            {followUpReplyDeliverable.summary}
                          </div>
                        ) : null}
                        {followUpReplyDeliverable.content_markdown ? (
                          <div className="mt-3 whitespace-pre-wrap rounded-[1rem] bg-white/80 px-4 py-4 text-slate-700">
                            {followUpReplyDeliverable.content_markdown}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                </div>
              )}
            </section>

            <section className="guidance-card rounded-[2rem] px-7 py-7">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold text-slate-950">报价记录</h2>
                <span className="text-sm text-slate-500">{detail.quotes.length} 条</span>
              </div>
              {detail.quotes.length === 0 ? (
                <div className="mt-5 rounded-[1.5rem] border border-dashed border-slate-300 px-5 py-8 text-sm text-slate-500">
                  当前还没有报价记录。
                </div>
              ) : (
                <div className="mt-5 grid gap-4">
                  {detail.quotes.map((quote) => (
                    <article
                      key={quote.id}
                      className="rounded-[1.5rem] border border-slate-200 px-5 py-5"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="guidance-pill bg-amber-50 text-amber-700">
                          {quoteStatusLabelMap[quote.quote_status] || quote.quote_status}
                        </span>
                        <span className="guidance-pill bg-slate-100 text-slate-700">
                          {(quote.currency_code || 'CNY') + ' ' + quote.quoted_price_amount}
                        </span>
                      </div>
                      <div className="mt-3 text-sm text-slate-500">
                        创建时间：{new Date(quote.created_at).toLocaleString('zh-CN')}
                      </div>
                      {quote.expires_at ? (
                        <div className="mt-2 text-sm text-slate-500">
                          有效期至：{new Date(quote.expires_at).toLocaleString('zh-CN')}
                        </div>
                      ) : null}
                      {quote.billing_notes ? (
                        <div className="mt-3 rounded-[1.25rem] bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                          {quote.billing_notes}
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="guidance-card rounded-[2rem] px-7 py-7">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold text-slate-950">交付记录</h2>
                <span className="text-sm text-slate-500">{detail.deliverables.length} 条</span>
              </div>
              {detail.deliverables.length === 0 ? (
                <div className="mt-5 rounded-[1.5rem] border border-dashed border-slate-300 px-5 py-8 text-sm text-slate-500">
                  当前还没有交付物。
                </div>
              ) : (
                <div className="mt-5 grid gap-4">
                  {detail.deliverables.map((deliverable) => (
                    <article
                      key={deliverable.id}
                      className="rounded-[1.5rem] border border-slate-200 px-5 py-5"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="guidance-pill bg-teal-50 text-teal-700">
                          {deliverableStatusLabelMap[deliverable.deliverable_status] ||
                            deliverable.deliverable_status}
                        </span>
                        <span className="guidance-pill bg-slate-100 text-slate-700">
                          {deliverableTypeLabelMap[deliverable.deliverable_type] ||
                            deliverable.deliverable_type}
                        </span>
                      </div>
                      {deliverable.summary ? (
                        <div className="mt-4 text-base font-semibold text-slate-900">
                          {deliverable.summary}
                        </div>
                      ) : null}
                      {deliverable.content_markdown ? (
                        <div className="mt-3 whitespace-pre-wrap rounded-[1.25rem] bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
                          {deliverable.content_markdown}
                        </div>
                      ) : null}
                      <div className="mt-3 text-sm text-slate-500">
                        提交时间：
                        {deliverable.submitted_at
                          ? new Date(deliverable.submitted_at).toLocaleString('zh-CN')
                          : new Date(deliverable.created_at).toLocaleString('zh-CN')}
                      </div>
                      {deliverable.approved_at ? (
                        <div className="mt-2 text-sm text-teal-700">
                          确认时间：{new Date(deliverable.approved_at).toLocaleString('zh-CN')}
                        </div>
                      ) : null}
                      {canApproveDeliverable(deliverable) ? (
                        <div className="mt-4">
                          <button
                            type="button"
                            onClick={() =>
                              void approveDeliverable(deliverable.id, deliverable.deliverable_type)
                            }
                            disabled={
                              busyAction ===
                              `/api/consultations/${consultationId}/deliverables/${deliverable.id}/approve`
                            }
                            className="rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {busyAction ===
                            `/api/consultations/${consultationId}/deliverables/${deliverable.id}/approve`
                              ? '正在确认交付...'
                              : deliverable.deliverable_type === 'follow_up_reply'
                                ? '确认追问回复'
                                : '确认交付方案'}
                          </button>
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </section>

          <section className="flex flex-col gap-6">
            {detail.permissions.canQuote ? (
              <section className="guidance-card rounded-[2rem] px-7 py-7">
                <h2 className="text-xl font-semibold text-slate-950">提交报价</h2>
                <div className="mt-5 grid gap-4">
                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-slate-700">报价金额</span>
                    <input
                      value={quoteForm.quoted_price_amount}
                      onChange={(event) =>
                        setQuoteForm((current) => ({
                          ...current,
                          quoted_price_amount: event.target.value,
                        }))
                      }
                      placeholder="例如：599"
                      className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-amber-500"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-slate-700">报价说明</span>
                    <textarea
                      rows={4}
                      value={quoteForm.billing_notes}
                      onChange={(event) =>
                        setQuoteForm((current) => ({
                          ...current,
                          billing_notes: event.target.value,
                        }))
                      }
                      placeholder="说明本次报价包含的交付范围、返修次数或时效承诺。"
                      className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3.5 text-sm leading-7 outline-none transition focus:border-amber-500"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => void submitQuote()}
                    disabled={busyAction === `/api/consultations/${consultationId}/quote`}
                    className="rounded-full bg-amber-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busyAction === `/api/consultations/${consultationId}/quote`
                      ? '正在提交报价...'
                      : '提交报价'}
                  </button>
                </div>
              </section>
            ) : null}

            {detail.permissions.canManage && detail.order.order_status === 'quoted' ? (
              <section className="guidance-card rounded-[2rem] px-7 py-7">
                <h2 className="text-xl font-semibold text-slate-950">支付确认</h2>
                <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600">
                  <p>当前为沙箱支付流。点击后会将最新报价视为已接受，并把订单推进到“已支付”。</p>
                  <button
                    type="button"
                    onClick={() => void markPaid()}
                    disabled={busyAction === `/api/consultations/${consultationId}/mark-paid`}
                    className="rounded-full bg-amber-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busyAction === `/api/consultations/${consultationId}/mark-paid`
                      ? '正在确认支付...'
                      : '确认报价并标记已支付'}
                  </button>
                </div>
              </section>
            ) : null}

            {detail.permissions.canManage &&
            ['delivered', 'closed'].includes(detail.order.order_status) ? (
              <section className="guidance-card rounded-[2rem] px-7 py-7">
                <h2 className="text-xl font-semibold text-slate-950">订单收口</h2>
                <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600">
                  <p>
                    这里是当前 consultation
                    的沙箱收口动作。关闭用于确认服务结束，退款用于模拟售后回退。
                  </p>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    {detail.order.order_status !== 'closed' ? (
                      <button
                        type="button"
                        onClick={() => void markClosed()}
                        disabled={busyAction === `/api/consultations/${consultationId}/close`}
                        className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {busyAction === `/api/consultations/${consultationId}/close`
                          ? '正在关闭订单...'
                          : '关闭咨询订单'}
                      </button>
                    ) : null}
                    {detail.order.order_status !== 'refunded' ? (
                      <button
                        type="button"
                        onClick={() => void markRefunded()}
                        disabled={busyAction === `/api/consultations/${consultationId}/refund`}
                        className="rounded-full bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {busyAction === `/api/consultations/${consultationId}/refund`
                          ? '正在标记退款...'
                          : '标记订单退款'}
                      </button>
                    ) : null}
                  </div>
                </div>
              </section>
            ) : null}

            {detail.permissions.canManage &&
            detail.order.order_status === 'delivered' &&
            !detail.followUpRequest ? (
              <section className="guidance-card rounded-[2rem] px-7 py-7">
                <h2 className="text-xl font-semibold text-slate-950">发起追问</h2>
                <div className="mt-5 grid gap-4">
                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-slate-700">追问摘要</span>
                    <input
                      value={followUpForm.question_summary}
                      onChange={(event) =>
                        setFollowUpForm((current) => ({
                          ...current,
                          question_summary: event.target.value,
                        }))
                      }
                      placeholder="例如：术后复查是否需要调整止痛方案"
                      className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-amber-500"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-slate-700">追问内容</span>
                    <textarea
                      rows={6}
                      value={followUpForm.question_markdown}
                      onChange={(event) =>
                        setFollowUpForm((current) => ({
                          ...current,
                          question_markdown: event.target.value,
                        }))
                      }
                      placeholder="请写明交付后仍未解答的点、最新检查结果，或希望专家进一步说明的具体问题。"
                      className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3.5 text-sm leading-7 outline-none transition focus:border-amber-500"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => void submitFollowUpRequest()}
                    disabled={busyAction === `/api/consultations/${consultationId}/follow-ups`}
                    className="rounded-full bg-amber-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busyAction === `/api/consultations/${consultationId}/follow-ups`
                      ? '正在提交追问...'
                      : '提交一次追问'}
                  </button>
                </div>
              </section>
            ) : null}

            {detail.permissions.canDeliver && detail.followUpRequest?.request_status === 'open' ? (
              <section className="guidance-card rounded-[2rem] px-7 py-7">
                <h2 className="text-xl font-semibold text-slate-950">回复追问</h2>
                <div className="mt-4 rounded-[1.5rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-7 text-amber-900">
                  当前有一条待回复追问。提交后会生成一条“追问回复”交付记录，并把订单状态恢复为已交付。
                </div>
                <div className="mt-5 grid gap-4">
                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-slate-700">回复摘要</span>
                    <input
                      value={followUpReplyForm.summary}
                      onChange={(event) =>
                        setFollowUpReplyForm((current) => ({
                          ...current,
                          summary: event.target.value,
                        }))
                      }
                      placeholder="例如：补充止痛方案与复查观察点"
                      className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-teal-500"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-slate-700">回复正文</span>
                    <textarea
                      rows={6}
                      value={followUpReplyForm.content_markdown}
                      onChange={(event) =>
                        setFollowUpReplyForm((current) => ({
                          ...current,
                          content_markdown: event.target.value,
                        }))
                      }
                      placeholder="请针对追问逐项补充建议、风险说明和下一步观察指标。"
                      className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3.5 text-sm leading-7 outline-none transition focus:border-teal-500"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => void submitFollowUpReply()}
                    disabled={
                      busyAction ===
                      `/api/consultations/${consultationId}/follow-ups/${detail.followUpRequest.id}/reply`
                    }
                    className="rounded-full bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busyAction ===
                    `/api/consultations/${consultationId}/follow-ups/${detail.followUpRequest.id}/reply`
                      ? '正在提交回复...'
                      : '提交追问回复'}
                  </button>
                </div>
              </section>
            ) : null}

            {detail.permissions.canDeliver ? (
              <section className="guidance-card rounded-[2rem] px-7 py-7">
                <h2 className="text-xl font-semibold text-slate-950">提交结构化交付</h2>
                {detail.followUpRequest?.request_status === 'open' ? (
                  <div className="mt-4 rounded-[1.5rem] border border-dashed border-slate-300 px-5 py-6 text-sm leading-7 text-slate-500">
                    当前存在待回复追问，请优先使用上方的“回复追问”面板，避免把追问回复误写成新的结构化方案。
                  </div>
                ) : ['paid', 'delivered'].includes(detail.order.order_status) ? (
                  <div className="mt-5 grid gap-4">
                    <label className="grid gap-2">
                      <span className="text-sm font-medium text-slate-700">交付摘要</span>
                      <input
                        value={deliverableForm.summary}
                        onChange={(event) =>
                          setDeliverableForm((current) => ({
                            ...current,
                            summary: event.target.value,
                          }))
                        }
                        placeholder="例如：脊柱减压手术方案与围术期风险建议"
                        className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-teal-500"
                      />
                    </label>
                    <label className="grid gap-2">
                      <span className="text-sm font-medium text-slate-700">交付正文</span>
                      <textarea
                        rows={8}
                        value={deliverableForm.content_markdown}
                        onChange={(event) =>
                          setDeliverableForm((current) => ({
                            ...current,
                            content_markdown: event.target.value,
                          }))
                        }
                        placeholder="请写入结构化方案、关键风险点、操作建议和追问建议。"
                        className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3.5 text-sm leading-7 outline-none transition focus:border-teal-500"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => void submitDeliverable()}
                      disabled={busyAction === `/api/consultations/${consultationId}/deliverables`}
                      className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {busyAction === `/api/consultations/${consultationId}/deliverables`
                        ? '正在提交交付物...'
                        : '提交交付物'}
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 rounded-[1.5rem] border border-dashed border-slate-300 px-5 py-6 text-sm leading-7 text-slate-500">
                    交付物需要在订单已支付后才能提交。当前状态为“
                    {statusLabelMap[detail.order.order_status] || detail.order.order_status}”。
                  </div>
                )}
              </section>
            ) : null}

            <section className="guidance-card rounded-[2rem] px-7 py-7">
              <h2 className="text-xl font-semibold text-slate-950">下一步</h2>
              <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                <p>
                  这条咨询订单现在已经具备病例主档、报价、交付、一次追问窗口以及升级到术中指导的完整骨架，后续主要是继续把支付网关和售后规则做实。
                </p>
                <div className="flex flex-col gap-3">
                  <Link
                    href="/consultations"
                    className="rounded-full border border-slate-300 px-5 py-3 text-center font-semibold text-slate-700"
                  >
                    返回咨询列表
                  </Link>
                  <Link
                    href="/guidance/new"
                    className="rounded-full border border-teal-300 bg-teal-50 px-5 py-3 text-center font-semibold text-teal-700"
                  >
                    发起术中指导
                  </Link>
                </div>
              </div>
            </section>
          </section>
        </div>
      </div>
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] bg-slate-50 px-4 py-4">
      <div className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="mt-2 text-sm font-medium text-slate-800">{value}</div>
    </div>
  );
}
