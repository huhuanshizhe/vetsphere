'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  EmptyState,
  LoadingState,
  StatCard,
  StatusBadge,
  TableContainer,
  ToastContainer,
  useToast,
} from '@/components/ui';
import { useSite } from '@/context/SiteContext';
import { getContentRoutePath } from '@/lib/content-admin';
import type { ContentOpsBriefItem, ContentOpsEventItem, ContentOpsGenerationRunItem, ContentOpsResponse, ContentOpsReviewItem } from '@/lib/content-ops';
import { apiFetch, getErrorMessage } from '@/lib/api-client';
import { CalendarDays, ClipboardCheck, Library, RefreshCw, Sparkles } from 'lucide-react';

function formatDateTime(value: string | null | undefined) {
  if (!value) return '未记录';
  return new Date(value).toLocaleString('zh-CN');
}

function getFreshnessLabel(days: number) {
  if (days <= 1) return '最近 24 小时内更新';
  return `${days} 天未更新`;
}

function getBriefStatusBadge(status: ContentOpsBriefItem['status']) {
  if (status === 'ready') return 'approved';
  return status;
}

function ContentOpsHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link href="/content">
          <Button variant="secondary" icon={<Library className="h-4 w-4" />}>
            内容库
          </Button>
        </Link>
        <Link href="/content/review">
          <Button variant="secondary" icon={<ClipboardCheck className="h-4 w-4" />}>
            审核队列
          </Button>
        </Link>
        <Link href="/content/calendar">
          <Button variant="secondary" icon={<CalendarDays className="h-4 w-4" />}>
            排期与 Brief
          </Button>
        </Link>
        <Link href="/ai/studio">
          <Button icon={<Sparkles className="h-4 w-4" />}>AI 工作台</Button>
        </Link>
      </div>
    </div>
  );
}

function ContentOpsState({
  loading,
  data,
  errorTitle,
}: {
  loading: boolean;
  data: ContentOpsResponse | null;
  errorTitle: string;
}) {
  if (loading) {
    return <LoadingState text="加载内容运营数据..." />;
  }

  if (!data) {
    return (
      <EmptyState
        icon="📊"
        title={errorTitle}
        description="内容运营接口没有返回数据，请刷新重试。"
      />
    );
  }

  return null;
}

function ContentTitleCell({ item, locale }: { item: ContentOpsReviewItem; locale: string }) {
  const previewPath = getContentRoutePath(locale, item.content_type, item.site_view?.slug_override || item.canonical_slug);
  const canPreview = item.site_view?.publish_status === 'published' && item.site_view.route_status === 'active';

  return (
    <div>
      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
      <p className="mt-1 text-xs text-slate-500">{item.content_type_label}</p>
      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
        <span>/{item.canonical_slug}</span>
        {item.primary_specialty && <span>{item.primary_specialty}</span>}
        {item.primary_procedure && <span>{item.primary_procedure}</span>}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Link href={`/content/${item.id}`} className="text-xs font-medium text-emerald-600 hover:text-emerald-700">
          编辑内容
        </Link>
        {canPreview && (
          <Link href={previewPath} target="_blank" className="text-xs font-medium text-slate-500 hover:text-slate-700">
            查看公开页
          </Link>
        )}
      </div>
    </div>
  );
}

function ReadinessCell({ item }: { item: ContentOpsReviewItem }) {
  if (item.publish_readiness_failures.length === 0) {
    return <p className="text-sm font-medium text-emerald-600">已满足发布前置</p>;
  }

  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-red-600">缺少 {item.publish_readiness_failures.length} 项</p>
      {item.publish_readiness_failures.slice(0, 2).map((failure) => (
        <p key={failure} className="text-xs text-slate-500">
          {failure}
        </p>
      ))}
    </div>
  );
}

function ReviewQueueTable({
  items,
  locale,
  emptyTitle,
  emptyDescription,
}: {
  items: ContentOpsReviewItem[];
  locale: string;
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (items.length === 0) {
    return <EmptyState icon="✅" title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <TableContainer>
      <table className="w-full min-w-[980px]">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">内容</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">工作流</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">站点发布</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">发布就绪性</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">本地化</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">新鲜度</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item) => (
            <tr key={item.id} className="align-top hover:bg-slate-50">
              <td className="px-4 py-3">
                <ContentTitleCell item={item} locale={locale} />
              </td>
              <td className="px-4 py-3">
                <div className="space-y-2">
                  <StatusBadge status={item.workflow_state} />
                  <p className="text-xs text-slate-500">优先级 {item.publish_priority}</p>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="space-y-2">
                  <StatusBadge status={item.site_view?.publish_status || 'draft'} />
                  <p className="text-xs text-slate-500">路由：{item.site_view?.route_status || 'active'}</p>
                </div>
              </td>
              <td className="px-4 py-3">
                <ReadinessCell item={item} />
              </td>
              <td className="px-4 py-3">
                <div className="space-y-1">
                  <p className="text-sm text-slate-700">{item.locale_count} 个 locale</p>
                  <p className="text-xs text-slate-500">{item.available_locales.join(' / ')}</p>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="space-y-1">
                  <p className="text-sm text-slate-700">{getFreshnessLabel(item.days_since_update)}</p>
                  <p className="text-xs text-slate-500">{formatDateTime(item.updated_at)}</p>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableContainer>
  );
}

function BriefsTable({ briefs }: { briefs: ContentOpsBriefItem[] }) {
  if (briefs.length === 0) {
    return <EmptyState icon="📝" title="当前没有 brief" description="可以从 AI 工作台或内容规划流程开始创建 brief。" />;
  }

  return (
    <TableContainer>
      <table className="w-full min-w-[760px]">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Brief</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">状态</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">受众 / 意图</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">最近更新</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {briefs.map((brief) => (
            <tr key={brief.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{brief.title}</p>
                  <p className="mt-1 text-xs text-slate-500">Locale: {brief.locale.toUpperCase()} · Site: {brief.site_code}</p>
                  {brief.content_id && (
                    <Link href={`/content/${brief.content_id}`} className="mt-2 inline-block text-xs font-medium text-emerald-600 hover:text-emerald-700">
                      打开内容记录
                    </Link>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={getBriefStatusBadge(brief.status)} />
              </td>
              <td className="px-4 py-3">
                <div className="space-y-1 text-sm text-slate-700">
                  <p>{brief.target_audience || '未填写受众'}</p>
                  <p className="text-xs text-slate-500">{brief.search_intent || '未填写搜索意图'}</p>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-slate-600">{formatDateTime(brief.updated_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableContainer>
  );
}

function EventsFeed({ items }: { items: ContentOpsEventItem[] }) {
  if (items.length === 0) {
    return <EmptyState icon="🪵" title="还没有工作流记录" description="发布、归档、审核动作会出现在这里。" />;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">{item.event_type}</p>
              <p className="mt-1 text-xs text-slate-500">内容 ID: {item.content_id}</p>
            </div>
            <StatusBadge status={item.new_state || item.old_state || 'draft'} size="sm" />
          </div>
          {(item.old_state || item.new_state) && (
            <p className="mt-2 text-xs text-slate-500">
              {item.old_state || 'unknown'} → {item.new_state || 'unknown'}
            </p>
          )}
          {item.notes && <p className="mt-2 text-sm text-slate-600">{item.notes}</p>}
          <p className="mt-2 text-xs text-slate-400">{formatDateTime(item.created_at)}</p>
        </div>
      ))}
    </div>
  );
}

function GenerationRunFeed({ items }: { items: ContentOpsGenerationRunItem[] }) {
  if (items.length === 0) {
    return <EmptyState icon="🤖" title="还没有 AI 运行记录" description="AI brief、draft 和 FAQ 生成会在这里显示。" />;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">{item.task_key}</p>
              <p className="mt-1 text-xs text-slate-500">模型：{item.model_name || '未记录'} · 内容 ID: {item.content_id || '未绑定'}</p>
            </div>
            <StatusBadge status={item.status} size="sm" />
          </div>
          <p className="mt-2 text-xs text-slate-400">{formatDateTime(item.created_at)}</p>
        </div>
      ))}
    </div>
  );
}

function useContentOpsData() {
  const { currentSite } = useSite();
  const activeSiteCode = currentSite === 'global' ? 'intl' : currentSite;
  const { toasts, removeToast, error } = useToast();
  const [data, setData] = useState<ContentOpsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    setLoading((current) => current && !data);
    setRefreshing(true);
    try {
      const next = await apiFetch<ContentOpsResponse>(`/api/v1/admin/content/ops?siteCode=${activeSiteCode}&locale=en&limit=10`);
      setData(next);
    } catch (loadError) {
      error(`加载内容运营数据失败：${getErrorMessage(loadError)}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeSiteCode, data, error]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return {
    activeSiteCode,
    data,
    loading,
    refreshing,
    loadData,
    toasts,
    removeToast,
  };
}

export function ContentDashboardView() {
  const { data, loading, refreshing, loadData, toasts, removeToast } = useContentOpsData();
  if (loading) {
    return (
      <div className="space-y-6">
        <ToastContainer toasts={toasts} removeToast={removeToast} />
        <ContentOpsHeader title="内容运营面板" description="查看内容库存、待审队列、保鲜风险和 AI 生产动态。" />
        <LoadingState text="加载内容运营数据..." />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <ToastContainer toasts={toasts} removeToast={removeToast} />
        <ContentOpsHeader title="内容运营面板" description="查看内容库存、待审队列、保鲜风险和 AI 生产动态。" />
        <EmptyState
          icon="📊"
          title="内容运营面板暂时不可用"
          description="内容运营接口没有返回数据，请刷新重试。"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <ContentOpsHeader title="内容运营面板" description="查看内容库存、待审队列、保鲜风险和 AI 生产动态。" />

      <div className="flex justify-end">
        <Button variant="secondary" icon={<RefreshCw className="h-4 w-4" />} loading={refreshing} onClick={() => void loadData()}>
          刷新
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-6">
        <StatCard label="总内容数" value={data.summary.total} color="blue" />
        <StatCard label="已发布" value={data.summary.published} color="emerald" />
        <StatCard label="待审核" value={data.summary.in_review} color="amber" />
        <StatCard label="可发布" value={data.summary.ready_to_publish} color="emerald" />
        <StatCard label={`陈旧内容 (${data.staleThresholdDays} 天+)`} value={data.summary.stale} color="rose" />
        <StatCard label="Ready Brief" value={data.summary.briefs_ready} color="slate" />
      </div>

      <div className="grid gap-6 2xl:grid-cols-2">
        <Card padding="none">
          <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
            <h2 className="text-lg font-semibold text-slate-900">待审与待发布队列</h2>
            <p className="mt-1 text-sm text-slate-500">优先展示已进入审核流、已通过或已排期的内容。</p>
          </div>
          <div className="p-4 sm:p-5">
            <ReviewQueueTable
              items={data.reviewQueue}
              locale={data.locale}
              emptyTitle="当前没有待审内容"
              emptyDescription="当内容进入 in_review、approved 或 scheduled 状态后，会出现在这里。"
            />
          </div>
        </Card>

        <Card padding="none">
          <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
            <h2 className="text-lg font-semibold text-slate-900">内容保鲜风险</h2>
            <p className="mt-1 text-sm text-slate-500">优先关注长期未更新但仍在线的公开页。</p>
          </div>
          <div className="p-4 sm:p-5">
            <ReviewQueueTable
              items={data.freshness}
              locale={data.locale}
              emptyTitle="当前没有需要刷新提醒的内容"
              emptyDescription="已发布内容会随着时间进入保鲜监控。"
            />
          </div>
        </Card>
      </div>

      <div className="grid gap-6 2xl:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold text-slate-900">最近工作流事件</h2>
          <p className="mt-1 text-sm text-slate-500">帮助运营和审核角色回溯最近的状态变更。</p>
          <div className="mt-4">
            <EventsFeed items={data.recentEvents} />
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-slate-900">最近 AI 生成记录</h2>
          <p className="mt-1 text-sm text-slate-500">核查内容生成是否持续、有审计可追踪。</p>
          <div className="mt-4">
            <GenerationRunFeed items={data.recentGenerationRuns} />
          </div>
        </Card>
      </div>
    </div>
  );
}

export function ContentReviewQueueView() {
  const { data, loading, refreshing, loadData, toasts, removeToast } = useContentOpsData();
  const stats = useMemo(() => {
    if (!data) {
      return { approved: 0, scheduled: 0 };
    }
    return {
      approved: data.reviewQueue.filter((item) => item.workflow_state === 'approved').length,
      scheduled: data.reviewQueue.filter((item) => item.workflow_state === 'scheduled').length,
    };
  }, [data]);

  if (loading) {
    return (
      <div className="space-y-6">
        <ToastContainer toasts={toasts} removeToast={removeToast} />
        <ContentOpsHeader title="审核队列" description="集中处理待审内容、发布前置缺口和公开页风险。" />
        <LoadingState text="加载内容运营数据..." />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <ToastContainer toasts={toasts} removeToast={removeToast} />
        <ContentOpsHeader title="审核队列" description="集中处理待审内容、发布前置缺口和公开页风险。" />
        <EmptyState
          icon="📊"
          title="审核队列暂时不可用"
          description="内容运营接口没有返回数据，请刷新重试。"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <ContentOpsHeader title="审核队列" description="集中处理待审内容、发布前置缺口和公开页风险。" />

      <div className="flex justify-end">
        <Button variant="secondary" icon={<RefreshCw className="h-4 w-4" />} loading={refreshing} onClick={() => void loadData()}>
          刷新
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="队列总数" value={data.reviewQueue.length} color="blue" />
        <StatCard label="待审核" value={data.summary.in_review} color="amber" />
        <StatCard label="已通过待发" value={stats.approved} color="emerald" />
        <StatCard label="已排期" value={stats.scheduled} color="slate" />
      </div>

      <Card padding="none">
        <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
          <h2 className="text-lg font-semibold text-slate-900">审核与发布执行表</h2>
          <p className="mt-1 text-sm text-slate-500">这里会同时暴露工作流状态与 publish readiness，避免内容“通过了但发不出去”。</p>
        </div>
        <div className="p-4 sm:p-5">
          <ReviewQueueTable
            items={data.reviewQueue}
            locale={data.locale}
            emptyTitle="审核队列为空"
            emptyDescription="可以先从内容库将草稿推进到 in_review，或用 AI 工作台生成初稿后再送审。"
          />
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-slate-900">最近审核动作</h2>
        <p className="mt-1 text-sm text-slate-500">用于检查最近是否存在卡在中间状态的内容。</p>
        <div className="mt-4">
          <EventsFeed items={data.recentEvents} />
        </div>
      </Card>
    </div>
  );
}

export function ContentCalendarView() {
  const { data, loading, refreshing, loadData, toasts, removeToast } = useContentOpsData();

  if (loading) {
    return (
      <div className="space-y-6">
        <ToastContainer toasts={toasts} removeToast={removeToast} />
        <ContentOpsHeader title="排期与 Brief" description="把已排期内容和 AI brief 资产放到同一张执行面板里。" />
        <LoadingState text="加载内容运营数据..." />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <ToastContainer toasts={toasts} removeToast={removeToast} />
        <ContentOpsHeader title="排期与 Brief" description="把已排期内容和 AI brief 资产放到同一张执行面板里。" />
        <EmptyState
          icon="📊"
          title="排期与 Brief 面板暂时不可用"
          description="内容运营接口没有返回数据，请刷新重试。"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <ContentOpsHeader title="排期与 Brief" description="把已排期内容和 AI brief 资产放到同一张执行面板里。" />

      <div className="flex justify-end">
        <Button variant="secondary" icon={<RefreshCw className="h-4 w-4" />} loading={refreshing} onClick={() => void loadData()}>
          刷新
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="已排期内容" value={data.scheduled.length} color="blue" />
        <StatCard label="Brief 总数" value={data.summary.briefs_total} color="slate" />
        <StatCard label="Ready Brief" value={data.summary.briefs_ready} color="emerald" />
        <StatCard label="待保鲜" value={data.summary.stale} color="rose" />
      </div>

      <Card padding="none">
        <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
          <h2 className="text-lg font-semibold text-slate-900">已排期内容</h2>
          <p className="mt-1 text-sm text-slate-500">当前以工作流状态为 scheduled 的内容会进入这个执行面板。</p>
        </div>
        <div className="p-4 sm:p-5">
          <ReviewQueueTable
            items={data.scheduled}
            locale={data.locale}
            emptyTitle="目前没有已排期内容"
            emptyDescription="将内容状态推进到 scheduled 后，就会出现在这里。"
          />
        </div>
      </Card>

      <Card padding="none">
        <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
          <h2 className="text-lg font-semibold text-slate-900">Brief 池</h2>
          <p className="mt-1 text-sm text-slate-500">跟踪 brief 的准备度，避免生成链路和人工编辑链路脱节。</p>
        </div>
        <div className="p-4 sm:p-5">
          <BriefsTable briefs={data.briefs} />
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-slate-900">最近 AI 生产动态</h2>
        <p className="mt-1 text-sm text-slate-500">帮助判断 brief 是否正在转化成实际可编辑草稿。</p>
        <div className="mt-4">
          <GenerationRunFeed items={data.recentGenerationRuns} />
        </div>
      </Card>
    </div>
  );
}