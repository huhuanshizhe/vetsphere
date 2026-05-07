'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@vetsphere/shared/context/AuthContext';
import { getAccessTokenSafe } from '@vetsphere/shared/services/supabase';
import { useGuidanceSessionBridge } from '@/components/guidance/GuidanceSessionBridge';

type ConsultationOrder = {
  id: string;
  order_no: string;
  title: string;
  order_status: string;
  pricing_mode: string;
  desired_response_at?: string | null;
  requested_budget_amount?: number | null;
  quoted_price_amount?: number | null;
  currency_code?: string | null;
  metadata?: {
    case_no?: string;
  } | null;
};

const statusLabelMap: Record<string, string> = {
  draft: '草稿',
  requested: '待处理',
  quoted: '待支付',
  paid: '已支付',
  in_progress: '专家处理中',
  delivered: '已交付',
  closed: '已关闭',
  cancelled: '已取消',
  refunded: '已退款',
};

const pricingModeLabelMap: Record<string, string> = {
  fixed_package: '固定价咨询包',
  subscription_overage: '订阅超额',
};

export default function ConsultationDashboard() {
  const { loading, isAuthenticated, canAccessDoctorWorkspace, doctorPrivilegeStatus, user } =
    useAuth();
  const { isSyncing } = useGuidanceSessionBridge();
  const [hasHydrated, setHasHydrated] = useState(false);
  const [orders, setOrders] = useState<ConsultationOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (!hasHydrated || loading || isSyncing || !isAuthenticated || !canAccessDoctorWorkspace) {
      return;
    }

    let cancelled = false;

    async function loadOrders() {
      setOrdersLoading(true);
      setFetchError(null);

      try {
        const token = await getAccessTokenSafe();
        if (!token) {
          throw new Error('当前没有有效医生会话。');
        }

        const response = await fetch('/api/consultations', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.message || '加载付费咨询失败。');
        }

        if (!cancelled) {
          setOrders(payload?.data?.orders || []);
        }
      } catch (error) {
        if (!cancelled) {
          setFetchError(error instanceof Error ? error.message : '加载付费咨询失败。');
        }
      } finally {
        if (!cancelled) {
          setOrdersLoading(false);
        }
      }
    }

    void loadOrders();

    return () => {
      cancelled = true;
    };
  }, [hasHydrated, loading, isSyncing, isAuthenticated, canAccessDoctorWorkspace]);

  const showSyncState = !hasHydrated || loading || isSyncing;

  return (
    <main className="guidance-shell">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-8 lg:px-8">
        <section className="guidance-card overflow-hidden rounded-[2rem]">
          <div className="grid gap-8 px-6 py-8 lg:grid-cols-[1.7fr_0.9fr] lg:px-10">
            <div className="space-y-5">
              <span className="guidance-pill inline-flex bg-amber-50 text-amber-700">
                Paid Consultation
              </span>
              <div className="space-y-3">
                <h1 className="max-w-3xl font-serif text-4xl leading-tight text-slate-950 lg:text-5xl">
                  付费病例专家咨询
                </h1>
                <p className="max-w-3xl text-base leading-7 text-slate-600">
                  先完成病例方案判断，再决定是否升级到术中实时指导。病例主档、咨询订单和后续指导会在同一条
                  Case 链路上沉淀。
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/consultations/new"
                  className="rounded-full bg-amber-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-600"
                >
                  发起付费咨询
                </Link>
                <Link
                  href="/guidance/new"
                  className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
                >
                  直接发起术中指导
                </Link>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-[1.5rem] bg-slate-950 px-5 py-5 text-white">
                <div className="text-sm text-slate-300">当前登录</div>
                <div className="mt-3 text-xl font-semibold">{user?.name || '未登录'}</div>
                <div className="mt-2 text-sm text-slate-300">医生状态：{doctorPrivilegeStatus}</div>
              </div>
              <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-5 py-5 text-amber-950">
                <div className="text-sm font-semibold">当前阶段</div>
                <div className="mt-2 text-sm leading-6">
                  已打通咨询订单创建与列表链路，后续继续补报价、支付、交付报告与升级到术中指导。
                </div>
              </div>
            </div>
          </div>
        </section>

        {showSyncState ? (
          <section className="guidance-card rounded-[1.75rem] px-6 py-8">
            <h2 className="text-xl font-semibold text-slate-950">正在同步登录状态</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              需要先从主站继承医生身份，确保咨询订单和病例主档统一挂到同一账户。
            </p>
          </section>
        ) : (
          <section className="guidance-card rounded-[1.75rem] px-6 py-6">
            <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-slate-950">我的咨询订单</h2>
                <p className="mt-2 text-sm text-slate-500">
                  当前先展示咨询申请主单，后续再补报价、支付、交付详情和专家工作台。
                </p>
              </div>
              <Link href="/consultations/new" className="text-sm font-semibold text-amber-700">
                发起新咨询
              </Link>
            </div>

            {ordersLoading ? (
              <div className="grid gap-4 py-6">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="h-28 animate-pulse rounded-[1.5rem] bg-slate-100" />
                ))}
              </div>
            ) : fetchError ? (
              <div className="mt-6 rounded-[1.5rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
                {fetchError}
              </div>
            ) : orders.length === 0 ? (
              <div className="mt-6 rounded-[1.5rem] border border-dashed border-slate-300 px-6 py-10 text-sm leading-6 text-slate-500">
                当前还没有咨询订单。点击“发起付费咨询”创建第一条病例方案请求。
              </div>
            ) : (
              <div className="mt-6 grid gap-4">
                {orders.map((order) => (
                  <article
                    key={order.id}
                    className="rounded-[1.5rem] border border-slate-200 bg-white px-5 py-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="guidance-pill bg-amber-50 text-amber-700">
                            {statusLabelMap[order.order_status] || order.order_status}
                          </span>
                          <span className="guidance-pill bg-slate-100 text-slate-700">
                            {pricingModeLabelMap[order.pricing_mode] || order.pricing_mode}
                          </span>
                          {order.metadata?.case_no ? (
                            <span className="guidance-pill bg-sky-50 text-sky-700">
                              {order.metadata.case_no}
                            </span>
                          ) : null}
                        </div>
                        <h3 className="text-xl font-semibold text-slate-950">
                          <Link
                            href={`/consultations/${order.id}`}
                            className="transition hover:text-amber-700"
                          >
                            {order.title}
                          </Link>
                        </h3>
                        <p className="text-sm text-slate-500">订单号：{order.order_no}</p>
                      </div>
                      <div className="flex flex-col gap-2 text-sm text-slate-500 lg:items-end">
                        <div>
                          期望回复：
                          {order.desired_response_at
                            ? new Date(order.desired_response_at).toLocaleString('zh-CN')
                            : '未填写'}
                        </div>
                        <div>
                          金额：
                          {typeof order.quoted_price_amount === 'number'
                            ? `${order.currency_code || 'CNY'} ${order.quoted_price_amount}`
                            : typeof order.requested_budget_amount === 'number'
                              ? `${order.currency_code || 'CNY'} ${order.requested_budget_amount}`
                              : '待报价'}
                        </div>
                        <Link
                          href={`/consultations/${order.id}`}
                          className="font-semibold text-amber-700"
                        >
                          查看详情
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
