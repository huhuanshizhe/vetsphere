'use client';

import Link from 'next/link';
import { use, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Input,
  LoadingState,
  Select,
  StatusBadge,
  ToastContainer,
  useToast,
} from '@/components/ui';
import { useSite } from '@/context/SiteContext';
import { apiFetch, getErrorMessage } from '@/lib/api-client';

interface LocalizationDraft {
  locale: string;
  title: string;
  subtitle?: string | null;
  summary?: string | null;
  hero_title?: string | null;
  hero_subtitle?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  body_markdown?: string | null;
  body_json?: Record<string, unknown> | null;
  opening_answer?: string | null;
  references_json?: unknown[];
  faq_json?: unknown[];
  is_source_locale?: boolean;
}

interface SiteViewDraft {
  site_code: string;
  publish_status: 'draft' | 'published' | 'archived';
  slug_override?: string | null;
  seo_title_override?: string | null;
  seo_description_override?: string | null;
  is_featured?: boolean;
  display_order?: number;
  route_status: 'active' | 'coming_soon' | 'hidden' | 'redirect';
  route_config_json?: Record<string, unknown>;
  published_at?: string | null;
}

interface ContentRecord {
  id: string;
  content_type: string;
  canonical_slug: string;
  workflow_state: string;
  source_language: string;
  primary_specialty: string | null;
  primary_procedure: string | null;
  target_audience: string | null;
  search_intent: string | null;
  owner_team: string | null;
  publish_priority: number;
  localizations: LocalizationDraft[];
  site_views: SiteViewDraft[];
  blocks: Array<Record<string, unknown>>;
  relations: Array<Record<string, unknown>>;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

const CONTENT_TYPE_OPTIONS = [
  { value: 'specialty_hub', label: '专科中心' },
  { value: 'procedure', label: '术式页面' },
  { value: 'case', label: '病例库' },
  { value: 'solution', label: '解决方案' },
  { value: 'faq_hub', label: 'FAQ 专题' },
  { value: 'glossary_term', label: '术语词条' },
  { value: 'compare_page', label: '对比页' },
  { value: 'resource', label: '资源页' },
];

const WORKFLOW_OPTIONS = [
  { value: 'draft', label: '草稿' },
  { value: 'in_review', label: '待审核' },
  { value: 'approved', label: '已通过' },
  { value: 'scheduled', label: '已排期' },
  { value: 'published', label: '已发布' },
  { value: 'archived', label: '已归档' },
];

const LOCALE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'ja', label: 'Japanese' },
  { value: 'th', label: 'Thai' },
  { value: 'zh', label: 'Chinese' },
];

const ROUTE_SEGMENTS: Record<string, string> = {
  specialty_hub: 'specialties',
  procedure: 'procedures',
  case: 'cases',
  solution: 'solutions',
  faq_hub: 'faq',
  glossary_term: 'glossary',
  compare_page: 'compare',
  resource: 'resources',
};

function createEmptyLocalization(locale: string): LocalizationDraft {
  return {
    locale,
    title: '',
    subtitle: '',
    summary: '',
    hero_title: '',
    hero_subtitle: '',
    seo_title: '',
    seo_description: '',
    body_markdown: '',
    body_json: {},
    opening_answer: '',
    references_json: [],
    faq_json: [],
  };
}

export default function ContentEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { currentSite } = useSite();
  const activeSiteCode = currentSite === 'global' ? 'intl' : currentSite;
  const { toasts, removeToast, success, error } = useToast();

  const [item, setItem] = useState<ContentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeLocale, setActiveLocale] = useState('en');
  const [newLocale, setNewLocale] = useState('ja');

  const loadItem = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ item: ContentRecord }>(`/api/v1/admin/content/${id}?locale=${activeLocale}`);
      setItem(data.item);
      setActiveLocale((current) => {
        if (data.item.localizations.some((localization) => localization.locale === current)) {
          return current;
        }
        return data.item.localizations[0]?.locale || data.item.source_language || 'en';
      });
    } catch (loadError) {
      error(`加载内容失败：${getErrorMessage(loadError)}`);
    } finally {
      setLoading(false);
    }
  }, [activeLocale, error, id]);

  useEffect(() => {
    void loadItem();
  }, [loadItem]);

  const activeLocalization = useMemo(() => {
    return item?.localizations.find((localization) => localization.locale === activeLocale) || item?.localizations[0] || null;
  }, [activeLocale, item?.localizations]);

  const activeSiteView = useMemo(() => {
    if (!item) return null;
    return (
      item.site_views.find((siteView) => siteView.site_code === activeSiteCode) ||
      item.site_views[0] ||
      {
        site_code: activeSiteCode,
        publish_status: 'draft',
        route_status: 'active',
        slug_override: null,
        seo_title_override: null,
        seo_description_override: null,
        is_featured: false,
        display_order: 0,
      }
    );
  }, [activeSiteCode, item]);

  function updateItemField(field: keyof ContentRecord, value: unknown) {
    setItem((current) => (current ? { ...current, [field]: value } : current));
  }

  function updateLocalizationField(field: keyof LocalizationDraft, value: unknown) {
    setItem((current) => {
      if (!current) return current;
      return {
        ...current,
        localizations: current.localizations.map((localization) =>
          localization.locale === activeLocale ? { ...localization, [field]: value } : localization,
        ),
      };
    });
  }

  function updateSiteViewField(field: keyof SiteViewDraft, value: unknown) {
    setItem((current) => {
      if (!current) return current;
      const exists = current.site_views.some((siteView) => siteView.site_code === activeSiteCode);
      const nextSiteViews = exists
        ? current.site_views.map((siteView) =>
            siteView.site_code === activeSiteCode ? { ...siteView, [field]: value } : siteView,
          )
        : [...current.site_views, { site_code: activeSiteCode, publish_status: 'draft', route_status: 'active', [field]: value } as SiteViewDraft];
      return {
        ...current,
        site_views: nextSiteViews,
      };
    });
  }

  function addLocale() {
    setItem((current) => {
      if (!current || current.localizations.some((localization) => localization.locale === newLocale)) {
        return current;
      }
      return {
        ...current,
        localizations: [...current.localizations, createEmptyLocalization(newLocale)],
      };
    });
    setActiveLocale(newLocale);
  }

  async function handleSave() {
    if (!item) return;
    setSaving(true);
    try {
      await apiFetch(`/api/v1/admin/content/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify(item),
      });
      success('内容已保存');
      await loadItem();
    } catch (saveError) {
      error(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  async function runAction(endpoint: 'publish' | 'archive' | 'duplicate') {
    if (!item) return;
    setActionLoading(endpoint);
    try {
      const data = await apiFetch<{ id?: string }>(`/api/v1/admin/content/${item.id}/${endpoint}`, {
        method: 'POST',
        body: JSON.stringify({ siteCode: activeSiteCode }),
      });
      success(endpoint === 'publish' ? '内容已发布' : endpoint === 'archive' ? '内容已归档' : '已复制内容');
      if (endpoint === 'duplicate' && data.id) {
        window.location.href = `/content/${data.id}`;
        return;
      }
      await loadItem();
    } catch (actionError) {
      error(getErrorMessage(actionError));
    } finally {
      setActionLoading(null);
    }
  }

  const previewPath = item
    ? `/${activeLocalization?.locale || 'en'}/${ROUTE_SEGMENTS[item.content_type]}/${activeSiteView?.slug_override || item.canonical_slug}`
    : '';

  if (loading || !item || !activeLocalization || !activeSiteView) {
    return <LoadingState text="加载内容编辑器..." />;
  }

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{activeLocalization.title || '未命名内容'}</h1>
            <StatusBadge status={item.workflow_state} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            ID: {item.id} · 最后更新 {new Date(item.updated_at).toLocaleString('zh-CN')}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/ai/studio">
            <Button variant="secondary">AI 工作台</Button>
          </Link>
          <Button variant="secondary" loading={actionLoading === 'duplicate'} onClick={() => void runAction('duplicate')}>
            复制
          </Button>
          <Button variant="secondary" loading={actionLoading === 'archive'} onClick={() => void runAction('archive')}>
            归档
          </Button>
          <Button loading={actionLoading === 'publish'} onClick={() => void runAction('publish')}>
            发布
          </Button>
          <Button loading={saving} onClick={() => void handleSave()}>
            保存
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <Card>
            <div className="grid gap-4 md:grid-cols-2">
              <Select label="内容类型" value={item.content_type} onChange={(event) => updateItemField('content_type', event.target.value)} options={CONTENT_TYPE_OPTIONS} />
              <Select label="工作流状态" value={item.workflow_state} onChange={(event) => updateItemField('workflow_state', event.target.value)} options={WORKFLOW_OPTIONS} />
              <Input label="Canonical Slug" value={item.canonical_slug} onChange={(event) => updateItemField('canonical_slug', event.target.value)} />
              <Input label="源语言" value={item.source_language} onChange={(event) => updateItemField('source_language', event.target.value)} />
              <Input label="主专科" value={item.primary_specialty || ''} onChange={(event) => updateItemField('primary_specialty', event.target.value)} />
              <Input label="主术式" value={item.primary_procedure || ''} onChange={(event) => updateItemField('primary_procedure', event.target.value)} />
              <Input label="目标受众" value={item.target_audience || ''} onChange={(event) => updateItemField('target_audience', event.target.value)} />
              <Input label="搜索意图" value={item.search_intent || ''} onChange={(event) => updateItemField('search_intent', event.target.value)} />
            </div>
          </Card>

          <Card>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">本地化内容</h2>
                <p className="mt-1 text-sm text-slate-500">每个 locale 独立维护标题、摘要、正文和 SEO 元信息。</p>
              </div>
              <div className="flex gap-3">
                <Select value={newLocale} onChange={(event) => setNewLocale(event.target.value)} options={LOCALE_OPTIONS.filter((option) => !item.localizations.some((localization) => localization.locale === option.value))} />
                <Button variant="secondary" onClick={addLocale}>新增语言</Button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {item.localizations.map((localization) => (
                <button
                  key={localization.locale}
                  onClick={() => setActiveLocale(localization.locale)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium ${activeLocale === localization.locale ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'}`}
                >
                  {localization.locale.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="mt-5 space-y-4">
              <Input label="标题" value={activeLocalization.title || ''} onChange={(event) => updateLocalizationField('title', event.target.value)} />
              <Input label="副标题" value={activeLocalization.subtitle || ''} onChange={(event) => updateLocalizationField('subtitle', event.target.value)} />
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Hero Title" value={activeLocalization.hero_title || ''} onChange={(event) => updateLocalizationField('hero_title', event.target.value)} />
                <Input label="Hero Subtitle" value={activeLocalization.hero_subtitle || ''} onChange={(event) => updateLocalizationField('hero_subtitle', event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">摘要</label>
                <textarea
                  value={activeLocalization.summary || ''}
                  onChange={(event) => updateLocalizationField('summary', event.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Opening Answer</label>
                <textarea
                  value={activeLocalization.opening_answer || ''}
                  onChange={(event) => updateLocalizationField('opening_answer', event.target.value)}
                  rows={4}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">正文 Markdown</label>
                <textarea
                  value={activeLocalization.body_markdown || ''}
                  onChange={(event) => updateLocalizationField('body_markdown', event.target.value)}
                  rows={16}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="SEO Title" value={activeLocalization.seo_title || ''} onChange={(event) => updateLocalizationField('seo_title', event.target.value)} />
                <Input label="SEO Description" value={activeLocalization.seo_description || ''} onChange={(event) => updateLocalizationField('seo_description', event.target.value)} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  FAQ 数量：{Array.isArray(activeLocalization.faq_json) ? activeLocalization.faq_json.length : 0}
                </p>
                <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  参考证据：{Array.isArray(activeLocalization.references_json) ? activeLocalization.references_json.length : 0}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="text-lg font-semibold text-slate-900">站点视图</h2>
            <p className="mt-1 text-sm text-slate-500">控制 intl 站点上的发布状态、路由状态和 SEO 覆盖字段。</p>

            <div className="mt-5 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="站点代码" value={activeSiteView.site_code} onChange={(event) => updateSiteViewField('site_code', event.target.value)} />
                <Input label="预览路径" value={previewPath} readOnly />
                <Select
                  label="发布状态"
                  value={activeSiteView.publish_status}
                  onChange={(event) => updateSiteViewField('publish_status', event.target.value)}
                  options={[
                    { value: 'draft', label: '草稿' },
                    { value: 'published', label: '已发布' },
                    { value: 'archived', label: '已归档' },
                  ]}
                />
                <Select
                  label="路由状态"
                  value={activeSiteView.route_status}
                  onChange={(event) => updateSiteViewField('route_status', event.target.value)}
                  options={[
                    { value: 'active', label: '正常可访问' },
                    { value: 'coming_soon', label: '即将上线' },
                    { value: 'hidden', label: '隐藏' },
                    { value: 'redirect', label: '重定向' },
                  ]}
                />
              </div>

              <Input label="Slug Override" value={activeSiteView.slug_override || ''} onChange={(event) => updateSiteViewField('slug_override', event.target.value)} />
              <Input label="SEO Title Override" value={activeSiteView.seo_title_override || ''} onChange={(event) => updateSiteViewField('seo_title_override', event.target.value)} />
              <Input label="SEO Description Override" value={activeSiteView.seo_description_override || ''} onChange={(event) => updateSiteViewField('seo_description_override', event.target.value)} />
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-slate-900">结构化扩展</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <p>内容块数量：{item.blocks.length}</p>
              <p>关联对象数量：{item.relations.length}</p>
              <p>下一阶段会在这里接入可视化 block/relations 编辑器；当前保存会保留已存在的数据。</p>
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-slate-900">AI 创作入口</h2>
            <p className="mt-2 text-sm text-slate-500">
              使用知识库和任务模板生成 brief、outline、draft、FAQ 或 SEO 元信息。
            </p>
            <div className="mt-4 flex gap-3">
              <Link href={`/ai/studio?contentId=${item.id}&taskKey=content_brief_planner&query=${encodeURIComponent(activeLocalization.title || item.canonical_slug)}`}>
                <Button variant="secondary">生成 Brief</Button>
              </Link>
              <Link href={`/ai/studio?contentId=${item.id}&taskKey=content_draft_generator&query=${encodeURIComponent(activeLocalization.title || item.canonical_slug)}`}>
                <Button>生成 Draft</Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}