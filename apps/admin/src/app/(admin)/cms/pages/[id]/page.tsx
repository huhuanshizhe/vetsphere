'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { CmsItem, CmsPage, CmsSection } from '@/types/admin';
import {
  Button,
  Card,
  EmptyState,
  Input,
  LoadingState,
  Select,
  StatCard,
  StatusBadge,
} from '@/components/ui';

interface CmsSectionWithItems extends CmsSection {
  items: CmsItem[];
}

interface PageFormState {
  page_key: string;
  name: string;
  title: string;
  subtitle: string;
  description: string;
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
  status: CmsPage['status'];
}

interface CmsPageUpdatePayload {
  page_key: string;
  name: string;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  status: CmsPage['status'];
  updated_at: string;
  version: number;
  published_at?: string | null;
  published_by?: string | null;
}

const STATUS_OPTIONS = [
  { value: 'draft', label: '草稿' },
  { value: 'published', label: '已发布' },
  { value: 'offline', label: '已下线' },
];

function buildFormState(page: CmsPage): PageFormState {
  return {
    page_key: page.page_key || '',
    name: page.name || '',
    title: page.title || '',
    subtitle: page.subtitle || '',
    description: page.description || '',
    seo_title: page.seo_title || '',
    seo_description: page.seo_description || '',
    seo_keywords: page.seo_keywords || '',
    status: page.status,
  };
}

function formatDateTime(value?: string | null) {
  if (!value) return '未记录';
  return new Date(value).toLocaleString('zh-CN');
}

export default function CmsPageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const pageId = params.id as string;

  const [page, setPage] = useState<CmsPage | null>(null);
  const [sections, setSections] = useState<CmsSectionWithItems[]>([]);
  const [form, setForm] = useState<PageFormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (pageId) {
      void loadPage();
    }
  }, [pageId]);

  async function loadPage() {
    setLoading(true);
    setError('');
    setNotice('');

    try {
      const { data: pageData, error: pageError } = await supabase
        .from('cms_pages')
        .select('*')
        .eq('id', pageId)
        .maybeSingle();

      if (pageError) throw pageError;
      if (!pageData) {
        setError('该 CMS 页面不存在，或已被删除。');
        setPage(null);
        setSections([]);
        setForm(null);
        return;
      }

      const { data: sectionRows, error: sectionError } = await supabase
        .from('cms_sections')
        .select('*')
        .eq('page_id', pageId)
        .order('display_order', { ascending: true });

      if (sectionError) throw sectionError;

      const sectionIds = (sectionRows || []).map((section) => section.id);
      let itemRows: CmsItem[] = [];

      if (sectionIds.length > 0) {
        const { data: cmsItems, error: itemError } = await supabase
          .from('cms_items')
          .select('*')
          .in('section_id', sectionIds)
          .order('display_order', { ascending: true });

        if (itemError) throw itemError;
        itemRows = (cmsItems || []) as CmsItem[];
      }

      const itemsBySection = itemRows.reduce<Record<string, CmsItem[]>>((accumulator, item) => {
        if (!accumulator[item.section_id]) {
          accumulator[item.section_id] = [];
        }
        accumulator[item.section_id].push(item);
        return accumulator;
      }, {});

      const nextSections = ((sectionRows || []) as CmsSection[]).map((section) => ({
        ...section,
        items: itemsBySection[section.id] || [],
      }));

      setPage(pageData as CmsPage);
      setSections(nextSections);
      setForm(buildFormState(pageData as CmsPage));
    } catch (loadError) {
      console.error('加载 CMS 页面详情失败:', loadError);
      setError('加载 CMS 页面详情失败，请刷新重试。');
      setPage(null);
      setSections([]);
      setForm(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!page || !form) return;
    if (!form.page_key.trim() || !form.name.trim()) {
      setError('页面标识和页面名称不能为空。');
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');

    try {
      const now = new Date().toISOString();
      const { data: authData } = await supabase.auth.getUser();
      const nextVersion = (page.version || 1) + 1;

      const updateData: CmsPageUpdatePayload = {
        page_key: form.page_key.trim(),
        name: form.name.trim(),
        title: form.title.trim() || null,
        subtitle: form.subtitle.trim() || null,
        description: form.description.trim() || null,
        seo_title: form.seo_title.trim() || null,
        seo_description: form.seo_description.trim() || null,
        seo_keywords: form.seo_keywords.trim() || null,
        status: form.status,
        updated_at: now,
        version: nextVersion,
      };

      if (form.status === 'published' && page.status !== 'published') {
        updateData.published_at = now;
        updateData.published_by = authData.user?.id ?? null;
      }

      const { error: updateError } = await supabase
        .from('cms_pages')
        .update(updateData)
        .eq('id', page.id);

      if (updateError) throw updateError;

      await supabase.from('admin_audit_logs').insert({
        admin_user_id: authData.user?.id,
        module: 'cms',
        action: form.status === 'published' && page.status !== 'published' ? 'publish' : 'update',
        target_type: 'cms_page',
        target_id: page.id,
        target_name: form.name.trim(),
        changes_summary: `更新CMS页面: ${form.name.trim()}`,
      });

      setNotice('保存成功');
      await loadPage();
    } catch (saveError) {
      console.error('保存 CMS 页面失败:', saveError);
      setError('保存失败，请重试。');
    } finally {
      setSaving(false);
    }
  }

  const stats = useMemo(() => {
    const activeSections = sections.filter((section) => section.is_active).length;
    const itemCount = sections.reduce((sum, section) => sum + section.items.length, 0);
    return {
      sectionCount: sections.length,
      activeSections,
      itemCount,
    };
  }, [sections]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">CMS 页面详情</h1>
          <p className="mt-1 text-sm text-slate-500">正在加载页面配置...</p>
        </div>
        <Card>
          <LoadingState text="加载 CMS 页面详情..." />
        </Card>
      </div>
    );
  }

  if (error && !page) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">CMS 页面详情</h1>
            <p className="mt-1 text-sm text-slate-500">
              修复后的详情页已经存在，但这条数据本身没有找到。
            </p>
          </div>
          <Button variant="secondary" onClick={() => router.push('/cms/pages')}>
            返回页面管理
          </Button>
        </div>
        <Card>
          <EmptyState
            title="页面不存在"
            description={error}
            action={
              <Button variant="secondary" onClick={() => router.push('/cms/pages')}>
                返回列表
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  if (!page || !form) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">CMS 页面详情</h1>
          <p className="mt-1 text-sm text-slate-500">
            修复 `/cms/pages/:id` 详情路由后，这里可查看并维护页面基础字段。
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => router.push('/cms/pages')}>
            返回页面管理
          </Button>
          <Button onClick={() => void handleSave()} loading={saving}>
            保存页面
          </Button>
        </div>
      </div>

      {notice && (
        <Card>
          <p className="text-sm font-medium text-emerald-700">{notice}</p>
        </Card>
      )}
      {error && (
        <Card>
          <p className="text-sm font-medium text-red-600">{error}</p>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard
          label="当前状态"
          value={
            page.status === 'draft' ? '草稿' : page.status === 'published' ? '已发布' : '已下线'
          }
        />
        <StatCard label="版本号" value={`v${page.version || 1}`} />
        <StatCard label="区块数" value={stats.sectionCount} />
        <StatCard label="子项数" value={stats.itemCount} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-6">
          <Card>
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="页面标识"
                value={form.page_key}
                onChange={(event) =>
                  setForm((current) =>
                    current ? { ...current, page_key: event.target.value } : current,
                  )
                }
                placeholder="homepage"
              />
              <Input
                label="页面名称"
                value={form.name}
                onChange={(event) =>
                  setForm((current) =>
                    current ? { ...current, name: event.target.value } : current,
                  )
                }
                placeholder="首页"
              />
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Input
                label="页面标题"
                value={form.title}
                onChange={(event) =>
                  setForm((current) =>
                    current ? { ...current, title: event.target.value } : current,
                  )
                }
                placeholder="浏览器标题"
              />
              <Select
                label="状态"
                value={form.status}
                onChange={(event) =>
                  setForm((current) =>
                    current
                      ? { ...current, status: event.target.value as CmsPage['status'] }
                      : current,
                  )
                }
                options={STATUS_OPTIONS}
              />
            </div>
            <div className="mt-4 space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">副标题</label>
              <textarea
                value={form.subtitle}
                onChange={(event) =>
                  setForm((current) =>
                    current ? { ...current, subtitle: event.target.value } : current,
                  )
                }
                rows={3}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="mt-4 space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">描述</label>
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((current) =>
                    current ? { ...current, description: event.target.value } : current,
                  )
                }
                rows={5}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-slate-900">SEO 设置</h2>
            <div className="mt-4 grid gap-4">
              <Input
                label="SEO 标题"
                value={form.seo_title}
                onChange={(event) =>
                  setForm((current) =>
                    current ? { ...current, seo_title: event.target.value } : current,
                  )
                }
                placeholder="SEO title"
              />
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">SEO 描述</label>
                <textarea
                  value={form.seo_description}
                  onChange={(event) =>
                    setForm((current) =>
                      current ? { ...current, seo_description: event.target.value } : current,
                    )
                  }
                  rows={4}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <Input
                label="SEO 关键词"
                value={form.seo_keywords}
                onChange={(event) =>
                  setForm((current) =>
                    current ? { ...current, seo_keywords: event.target.value } : current,
                  )
                }
                placeholder="keyword-1, keyword-2"
              />
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">区块概览</h2>
                <p className="mt-1 text-sm text-slate-500">
                  先把 404 补上，这里提供页面区块与子项的结构检查。
                </p>
              </div>
              <StatusBadge
                status={
                  stats.activeSections === stats.sectionCount && stats.sectionCount > 0
                    ? 'active'
                    : 'draft'
                }
              />
            </div>

            <div className="mt-4 space-y-3">
              {sections.length === 0 ? (
                <EmptyState
                  icon="🧱"
                  title="当前没有区块"
                  description="这条 CMS 页面还没有挂接任何 section。"
                />
              ) : (
                sections.map((section) => (
                  <div key={section.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">
                            {section.title || section.section_key}
                          </p>
                          <code className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                            {section.section_key}
                          </code>
                          <code className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                            {section.section_type}
                          </code>
                        </div>
                        {section.description && (
                          <p className="mt-2 text-sm text-slate-500">{section.description}</p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={section.is_active ? 'active' : 'hidden'} size="sm" />
                        <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                          排序 {section.display_order}
                        </span>
                        <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                          {section.items.length} 个子项
                        </span>
                      </div>
                    </div>
                    {(section.cta_text || section.cta_link) && (
                      <div className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
                        CTA: {section.cta_text || '未命名'}{' '}
                        {section.cta_link ? `-> ${section.cta_link}` : ''}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="text-lg font-semibold text-slate-900">页面元信息</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">页面 ID</dt>
                <dd className="max-w-[65%] break-all text-right font-mono text-slate-900">
                  {page.id}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">状态</dt>
                <dd>
                  <StatusBadge status={page.status} size="sm" />
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">发布时间</dt>
                <dd className="text-right text-slate-900">{formatDateTime(page.published_at)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">创建时间</dt>
                <dd className="text-right text-slate-900">{formatDateTime(page.created_at)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">更新时间</dt>
                <dd className="text-right text-slate-900">{formatDateTime(page.updated_at)}</dd>
              </div>
            </dl>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-slate-900">当前修复说明</h2>
            <div className="mt-4 space-y-2 text-sm leading-6 text-slate-600">
              <p>
                之前列表页把“编辑”跳到了 `/cms/pages/:id`，但代码里没有这条动态路由，所以线上只能
                404。
              </p>
              <p>
                这次先补了详情页入口与基础编辑，区块编辑仍保持为结构概览，不扩散到整套 CMS
                编辑器重构。
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
