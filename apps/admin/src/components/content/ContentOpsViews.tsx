'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  EmptyState,
  Input,
  LoadingState,
  Select,
  StatCard,
  StatusBadge,
  TableContainer,
  ToastContainer,
  useToast,
} from '@/components/ui';
import { CONTENT_ADMIN_SITE_CODE, getContentRoutePath } from '@/lib/content-admin';
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

const BRIEF_STATUS_OPTIONS = [
  { value: 'draft', label: '草稿' },
  { value: 'ready', label: 'Ready' },
  { value: 'archived', label: '已归档' },
];

interface BriefFormState {
  title: string;
  contentId: string;
  targetAudience: string;
  searchIntent: string;
  primaryAngle: string;
  status: ContentOpsBriefItem['status'];
}

function createEmptyBriefForm(): BriefFormState {
  return {
    title: '',
    contentId: '',
    targetAudience: '',
    searchIntent: '',
    primaryAngle: '',
    status: 'draft',
  };
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

function ScheduleCandidatesTable({
  items,
  locale,
  schedulingId,
  onSchedule,
}: {
  items: ContentOpsReviewItem[];
  locale: string;
  schedulingId: string | null;
  onSchedule: (contentId: string) => Promise<void>;
}) {
  if (items.length === 0) {
    return <EmptyState icon="🗓️" title="当前没有可加入排期的内容" description="满足发布前置的内容会优先出现在这里。" />;
  }

  return (
    <TableContainer>
      <table className="w-full min-w-[920px]">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">内容</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">当前工作流</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">发布就绪性</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">最近更新</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">操作</th>
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
                <ReadinessCell item={item} />
              </td>
              <td className="px-4 py-3">
                <div className="space-y-1">
                  <p className="text-sm text-slate-700">{getFreshnessLabel(item.days_since_update)}</p>
                  <p className="text-xs text-slate-500">{formatDateTime(item.updated_at)}</p>
                </div>
              </td>
              <td className="px-4 py-3">
                <Button size="sm" loading={schedulingId === item.id} onClick={() => void onSchedule(item.id)}>
                  加入排期
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableContainer>
  );
}

function BriefsTable({
  briefs,
  onEdit,
}: {
  briefs: ContentOpsBriefItem[];
  onEdit: (brief: ContentOpsBriefItem) => void;
}) {
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
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">操作</th>
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
                  {brief.primary_angle && <p className="text-xs text-slate-400">角度：{brief.primary_angle}</p>}
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-slate-600">{formatDateTime(brief.updated_at)}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <Button variant="ghost" size="sm" onClick={() => onEdit(brief)}>
                    编辑 brief
                  </Button>
                  <Link href={`/ai/studio?taskKey=content_brief_planner&query=${encodeURIComponent(brief.title)}`}>
                    <Button variant="secondary" size="sm">AI 补全</Button>
                  </Link>
                </div>
              </td>
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
  const activeSiteCode = CONTENT_ADMIN_SITE_CODE;
  const { toasts, removeToast, success, error } = useToast();
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
    success,
    error,
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
  const { activeSiteCode, data, loading, refreshing, loadData, toasts, removeToast, success, error } = useContentOpsData();
  const [briefForm, setBriefForm] = useState<BriefFormState>(() => createEmptyBriefForm());
  const [editingBriefId, setEditingBriefId] = useState<string | null>(null);
  const [savingBrief, setSavingBrief] = useState(false);
  const [schedulingId, setSchedulingId] = useState<string | null>(null);

  const resetBriefForm = useCallback(() => {
    setEditingBriefId(null);
    setBriefForm(createEmptyBriefForm());
  }, []);

  const handleEditBrief = useCallback((brief: ContentOpsBriefItem) => {
    setEditingBriefId(brief.id);
    setBriefForm({
      title: brief.title,
      contentId: brief.content_id || '',
      targetAudience: brief.target_audience || '',
      searchIntent: brief.search_intent || '',
      primaryAngle: brief.primary_angle || '',
      status: brief.status,
    });
  }, []);

  async function handleSaveBrief() {
    if (!data) return;
    if (!briefForm.title.trim()) {
      error('请先填写 brief 标题');
      return;
    }

    setSavingBrief(true);
    try {
      const payload = {
        siteCode: activeSiteCode,
        locale: data.locale,
        title: briefForm.title.trim(),
        contentId: briefForm.contentId.trim() || null,
        targetAudience: briefForm.targetAudience.trim() || null,
        searchIntent: briefForm.searchIntent.trim() || null,
        primaryAngle: briefForm.primaryAngle.trim() || null,
        status: briefForm.status,
      };

      if (editingBriefId) {
        await apiFetch(`/api/v1/admin/content/briefs/${editingBriefId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/api/v1/admin/content/briefs', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      success(editingBriefId ? 'Brief 已更新' : 'Brief 已创建');
      resetBriefForm();
      await loadData();
    } catch (saveError) {
      error(`保存 brief 失败：${getErrorMessage(saveError)}`);
    } finally {
      setSavingBrief(false);
    }
  }

  async function handleSchedule(contentId: string) {
    setSchedulingId(contentId);
    try {
      await apiFetch(`/api/v1/admin/content/${contentId}/schedule`, {
        method: 'POST',
        body: JSON.stringify({ siteCode: activeSiteCode }),
      });
      success('内容已加入排期');
      await loadData();
    } catch (scheduleError) {
      error(`加入排期失败：${getErrorMessage(scheduleError)}`);
    } finally {
      setSchedulingId(null);
    }
  }

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

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card padding="none">
          <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
            <h2 className="text-lg font-semibold text-slate-900">待加入排期</h2>
            <p className="mt-1 text-sm text-slate-500">优先暴露已满足发布前置、但还没有进入 scheduled 的内容。</p>
          </div>
          <div className="p-4 sm:p-5">
            <ScheduleCandidatesTable
              items={data.scheduleCandidates}
              locale={data.locale}
              schedulingId={schedulingId}
              onSchedule={handleSchedule}
            />
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">创建 / 编辑 Brief</h2>
              <p className="mt-1 text-sm text-slate-500">默认把负责人记为当前管理员，可先绑定内容，再继续进入 AI 工作台。</p>
            </div>
            {editingBriefId && (
              <Button variant="ghost" size="sm" onClick={resetBriefForm}>
                取消编辑
              </Button>
            )}
          </div>

          <div className="mt-4 space-y-4">
            <Input
              label="Brief 标题"
              value={briefForm.title}
              onChange={(event) => setBriefForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="例如：TPLO training page refresh brief"
            />

            <div className="grid gap-4 lg:grid-cols-2">
              <Input
                label="绑定内容 ID"
                value={briefForm.contentId}
                onChange={(event) => setBriefForm((current) => ({ ...current, contentId: event.target.value }))}
                placeholder="可选，绑定现有内容"
              />
              <Select
                label="Brief 状态"
                value={briefForm.status}
                onChange={(event) => setBriefForm((current) => ({ ...current, status: event.target.value as ContentOpsBriefItem['status'] }))}
                options={BRIEF_STATUS_OPTIONS}
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Input
                label="目标受众"
                value={briefForm.targetAudience}
                onChange={(event) => setBriefForm((current) => ({ ...current, targetAudience: event.target.value }))}
                placeholder="例如：转诊骨科诊所"
              />
              <Input
                label="搜索意图"
                value={briefForm.searchIntent}
                onChange={(event) => setBriefForm((current) => ({ ...current, searchIntent: event.target.value }))}
                placeholder="例如：commercial investigation"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">主要角度</label>
              <textarea
                value={briefForm.primaryAngle}
                onChange={(event) => setBriefForm((current) => ({ ...current, primaryAngle: event.target.value }))}
                rows={4}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="例如：强调术前评估、器械准备和围手术期协同。"
              />
            </div>

            <p className="text-xs text-slate-500">保存后就可以在 AI 工作台继续生成 brief、outline 或 draft。</p>

            <div className="flex flex-wrap justify-end gap-3">
              {briefForm.title.trim() && (
                <Link href={`/ai/studio?taskKey=content_brief_planner&query=${encodeURIComponent(briefForm.title.trim())}`}>
                  <Button variant="secondary">在 AI 工作台继续</Button>
                </Link>
              )}
              {editingBriefId && (
                <Button variant="ghost" onClick={resetBriefForm}>
                  取消
                </Button>
              )}
              <Button loading={savingBrief} onClick={() => void handleSaveBrief()}>
                {editingBriefId ? '更新 Brief' : '创建 Brief'}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 2xl:grid-cols-2">
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
            <BriefsTable briefs={data.briefs} onEdit={handleEditBrief} />
          </div>
        </Card>
      </div>

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