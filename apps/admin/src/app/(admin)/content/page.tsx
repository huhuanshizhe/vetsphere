'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  EmptyState,
  Input,
  LoadingState,
  Pagination,
  Select,
  StatCard,
  StatusBadge,
  TableContainer,
  ToastContainer,
  useToast,
} from '@/components/ui';
import { apiFetch, getErrorMessage } from '@/lib/api-client';
import { CONTENT_ADMIN_SITE_CODE } from '@/lib/content-admin';
import { BookOpen, FileEdit, Library, Search, Sparkles } from 'lucide-react';

interface ContentSiteView {
  site_code: string;
  publish_status: 'draft' | 'published' | 'archived';
  route_status: 'active' | 'coming_soon' | 'hidden' | 'redirect';
  slug_override: string | null;
}

interface ContentListItem {
  id: string;
  content_type: string;
  content_type_label: string;
  canonical_slug: string;
  title: string;
  summary: string | null;
  workflow_state: string;
  primary_specialty: string | null;
  primary_procedure: string | null;
  updated_at: string;
  site_views: ContentSiteView[];
}

const PAGE_SIZE = 12;

const CONTENT_TYPE_OPTIONS = [
  { value: '', label: '全部类型' },
  { value: 'specialty_hub', label: '专科中心' },
  { value: 'procedure', label: '术式页面' },
  { value: 'case', label: '病例库' },
  { value: 'solution', label: '解决方案' },
  { value: 'faq_hub', label: 'FAQ 专题' },
  { value: 'glossary_term', label: '术语词条' },
  { value: 'compare_page', label: '对比页' },
  { value: 'resource', label: '资源页' },
  { value: 'news', label: '新闻页' },
];

const WORKFLOW_OPTIONS = [
  { value: '', label: '全部工作流状态' },
  { value: 'draft', label: '草稿' },
  { value: 'in_review', label: '待审核' },
  { value: 'approved', label: '已通过' },
  { value: 'scheduled', label: '已排期' },
  { value: 'published', label: '已发布' },
  { value: 'archived', label: '已归档' },
];

export default function ContentLibraryPage() {
  const activeSiteCode = CONTENT_ADMIN_SITE_CODE;
  const { toasts, removeToast, success, error } = useToast();

  const [items, setItems] = useState<ContentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [contentType, setContentType] = useState('');
  const [workflowState, setWorkflowState] = useState('');
  const [page, setPage] = useState(1);
  const [actionId, setActionId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('locale', 'en');
      params.set('siteCode', activeSiteCode);
      if (keyword) params.set('q', keyword);
      if (contentType) params.set('contentType', contentType);
      if (workflowState) params.set('workflowState', workflowState);

      const data = await apiFetch<{ items: ContentListItem[] }>(
        `/api/v1/admin/content?${params.toString()}`,
      );
      setItems(data.items || []);
    } catch (loadError) {
      error(`加载内容库失败：${getErrorMessage(loadError)}`);
    } finally {
      setLoading(false);
    }
  }, [activeSiteCode, contentType, error, keyword, workflowState]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    setPage(1);
  }, [keyword, contentType, workflowState]);

  const stats = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        acc.total += 1;
        if (item.workflow_state === 'published') acc.published += 1;
        if (item.workflow_state === 'in_review') acc.inReview += 1;
        if (item.workflow_state === 'draft') acc.draft += 1;
        return acc;
      },
      { total: 0, published: 0, inReview: 0, draft: 0 },
    );
  }, [items]);

  const pagedItems = useMemo(() => {
    const from = (page - 1) * PAGE_SIZE;
    return items.slice(from, from + PAGE_SIZE);
  }, [items, page]);

  async function runAction(
    contentId: string,
    endpoint: 'publish' | 'archive' | 'duplicate',
    successMessage: string,
  ) {
    setActionId(contentId + endpoint);
    try {
      await apiFetch(`/api/v1/admin/content/${contentId}/${endpoint}`, {
        method: 'POST',
        body: JSON.stringify({ siteCode: activeSiteCode }),
      });
      success(successMessage);
      await loadData();
    } catch (actionError) {
      error(getErrorMessage(actionError));
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">国际站内容库</h1>
          <p className="mt-1 text-sm text-slate-500">
            统一管理专科中心、术式页、案例、解决方案、FAQ、术语与资源页面。
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/content/dashboard">
            <Button variant="secondary">内容面板</Button>
          </Link>
          <Link href="/content/handbook">
            <Button variant="secondary" icon={<BookOpen className="h-4 w-4" />}>
              运营手册
            </Button>
          </Link>
          <Link href="/content/review">
            <Button variant="secondary">审核队列</Button>
          </Link>
          <Link href="/content/calendar">
            <Button variant="secondary">排期与 Brief</Button>
          </Link>
          <Link href="/content/knowledge">
            <Button variant="secondary" icon={<Library className="h-4 w-4" />}>
              知识库
            </Button>
          </Link>
          <Link href="/ai/studio">
            <Button variant="secondary" icon={<Sparkles className="h-4 w-4" />}>
              AI 工作台
            </Button>
          </Link>
          <Link href="/content/new">
            <Button icon={<FileEdit className="h-4 w-4" />}>新建内容</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="总内容数"
          value={stats.total}
          icon={<FileEdit className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          label="草稿"
          value={stats.draft}
          icon={<FileEdit className="h-5 w-5" />}
          color="slate"
        />
        <StatCard
          label="待审核"
          value={stats.inReview}
          icon={<Search className="h-5 w-5" />}
          color="amber"
        />
        <StatCard
          label="已发布"
          value={stats.published}
          icon={<Sparkles className="h-5 w-5" />}
          color="emerald"
        />
      </div>

      <Card>
        <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr_0.8fr_auto]">
          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜索标题、slug、专科或术式..."
          />
          <Select
            value={contentType}
            onChange={(event) => setContentType(event.target.value)}
            options={CONTENT_TYPE_OPTIONS}
          />
          <Select
            value={workflowState}
            onChange={(event) => setWorkflowState(event.target.value)}
            options={WORKFLOW_OPTIONS}
          />
          <Button variant="secondary" onClick={() => void loadData()}>
            刷新
          </Button>
        </div>
      </Card>

      <Card padding="none">
        {loading ? (
          <LoadingState text="加载内容库..." />
        ) : items.length === 0 ? (
          <EmptyState
            icon="🗂️"
            title="内容库还是空的"
            description="先创建一条内容记录，或从知识库和 AI 工作台开始搭建证据与初稿。"
            action={
              <Link href="/content/new">
                <Button>创建第一条内容</Button>
              </Link>
            }
          />
        ) : (
          <div className="p-4 sm:p-5">
            <TableContainer>
              <table className="w-full min-w-[980px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      标题 / 类型
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Slug
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      状态
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      站点视图
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      更新时间
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagedItems.map((item) => (
                    <tr key={item.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-4 py-3 align-top">
                        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.content_type_label}</p>
                        {(item.primary_specialty || item.primary_procedure) && (
                          <p className="mt-1 text-xs text-slate-400">
                            {[item.primary_specialty, item.primary_procedure]
                              .filter(Boolean)
                              .join(' / ')}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top text-sm text-slate-600">
                        /{item.canonical_slug}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <StatusBadge status={item.workflow_state} />
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-col gap-1">
                          {item.site_views.map((siteView) => (
                            <div
                              key={`${item.id}-${siteView.site_code}`}
                              className="flex items-center gap-2 text-xs text-slate-500"
                            >
                              <span className="font-semibold uppercase text-slate-700">
                                {siteView.site_code}
                              </span>
                              <StatusBadge status={siteView.publish_status} size="sm" />
                              <StatusBadge status={siteView.route_status} size="sm" />
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top text-sm text-slate-500">
                        {new Date(item.updated_at).toLocaleString('zh-CN')}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex justify-end gap-2">
                          <Link href={`/content/${item.id}`}>
                            <Button size="sm" variant="secondary">
                              编辑
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="ghost"
                            loading={actionId === item.id + 'duplicate'}
                            onClick={() => void runAction(item.id, 'duplicate', '已复制内容草稿')}
                          >
                            复制
                          </Button>
                          <Button
                            size="sm"
                            loading={actionId === item.id + 'publish'}
                            onClick={() => void runAction(item.id, 'publish', '内容已发布')}
                          >
                            发布
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            loading={actionId === item.id + 'archive'}
                            onClick={() => void runAction(item.id, 'archive', '内容已归档')}
                          >
                            归档
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableContainer>
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={items.length}
              onPageChange={setPage}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
