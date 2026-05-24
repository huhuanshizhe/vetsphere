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

interface CmsItemEditor {
  id: string;
  item_key: string;
  item_type: string;
  title: string;
  subtitle: string;
  description: string;
  image_url: string;
  icon: string;
  link_url: string;
  link_text: string;
  link_target: string;
  is_active: boolean;
  display_order: number;
  content_json: string;
}

interface CmsSectionEditor {
  id: string;
  section_key: string;
  section_type: string;
  title: string;
  subtitle: string;
  description: string;
  cta_text: string;
  cta_link: string;
  cta_style: string;
  is_active: boolean;
  display_order: number;
  content_json: string;
  style_config_json: string;
  items: CmsItemEditor[];
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

function createDraftId(prefix: 'section' | 'item') {
  return `draft-${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function isDraftId(id: string) {
  return id.startsWith('draft-');
}

function stringifyStructured(value: unknown, fallback = '{}') {
  if (value === null || value === undefined) return fallback;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return fallback;
  }
}

function normalizeOptionalText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseStructuredInput(value: string, fallback: unknown, label: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    throw new Error(`${label} 不是有效 JSON`);
  }
}

function buildItemEditor(item?: CmsItem, index = 0): CmsItemEditor {
  return {
    id: item?.id || createDraftId('item'),
    item_key: item?.item_key || '',
    item_type: item?.item_type || '',
    title: item?.title || '',
    subtitle: item?.subtitle || '',
    description: item?.description || '',
    image_url: item?.image_url || '',
    icon: item?.icon || '',
    link_url: item?.link_url || '',
    link_text: item?.link_text || '',
    link_target: item?.link_target || '_self',
    is_active: item?.is_active ?? true,
    display_order: item?.display_order ?? index,
    content_json: stringifyStructured(item?.content, '{}'),
  };
}

function buildSectionEditor(section?: CmsSectionWithItems, index = 0): CmsSectionEditor {
  return {
    id: section?.id || createDraftId('section'),
    section_key: section?.section_key || '',
    section_type: section?.section_type || '',
    title: section?.title || '',
    subtitle: section?.subtitle || '',
    description: section?.description || '',
    cta_text: section?.cta_text || '',
    cta_link: section?.cta_link || '',
    cta_style: section?.cta_style || '',
    is_active: section?.is_active ?? true,
    display_order: section?.display_order ?? index,
    content_json: stringifyStructured(section?.content, '{}'),
    style_config_json: stringifyStructured(section?.style_config, '{}'),
    items: (section?.items || []).map((item, itemIndex) => buildItemEditor(item, itemIndex)),
  };
}

function normalizeSectionOrder(sections: CmsSectionEditor[]) {
  return sections.map((section, index) => ({ ...section, display_order: index }));
}

function normalizeItemOrder(items: CmsItemEditor[]) {
  return items.map((item, index) => ({ ...item, display_order: index }));
}

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
  const [baselineSections, setBaselineSections] = useState<CmsSectionWithItems[]>([]);
  const [sectionEditors, setSectionEditors] = useState<CmsSectionEditor[]>([]);
  const [form, setForm] = useState<PageFormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

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
        setBaselineSections([]);
        setSectionEditors([]);
        setCollapsedSections({});
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
      setBaselineSections(nextSections);
      setSectionEditors(nextSections.map((section, index) => buildSectionEditor(section, index)));
      setCollapsedSections(
        nextSections.reduce<Record<string, boolean>>((accumulator, section) => {
          accumulator[section.id] = false;
          return accumulator;
        }, {}),
      );
      setForm(buildFormState(pageData as CmsPage));
    } catch (loadError) {
      console.error('加载 CMS 页面详情失败:', loadError);
      setError('加载 CMS 页面详情失败，请刷新重试。');
      setPage(null);
      setBaselineSections([]);
      setSectionEditors([]);
      setCollapsedSections({});
      setForm(null);
    } finally {
      setLoading(false);
    }
  }

  function updateSectionEditor(
    sectionId: string,
    updater: (current: CmsSectionEditor) => CmsSectionEditor,
  ) {
    setSectionEditors((current) =>
      current.map((section) => (section.id === sectionId ? updater(section) : section)),
    );
  }

  function updateSectionField<K extends keyof CmsSectionEditor>(
    sectionId: string,
    field: K,
    value: CmsSectionEditor[K],
  ) {
    updateSectionEditor(sectionId, (section) => ({ ...section, [field]: value }));
  }

  function addSection() {
    const nextSection = buildSectionEditor();
    setSectionEditors((current) => normalizeSectionOrder([...current, nextSection]));
    setCollapsedSections((current) => ({ ...current, [nextSection.id]: false }));
  }

  function removeSection(sectionId: string) {
    setSectionEditors((current) =>
      normalizeSectionOrder(current.filter((section) => section.id !== sectionId)),
    );
    setCollapsedSections((current) => {
      const next = { ...current };
      delete next[sectionId];
      return next;
    });
  }

  function toggleSectionCollapse(sectionId: string) {
    setCollapsedSections((current) => ({ ...current, [sectionId]: !current[sectionId] }));
  }

  function setAllSectionsCollapsed(nextCollapsed: boolean) {
    setCollapsedSections(
      sectionEditors.reduce<Record<string, boolean>>((accumulator, section) => {
        accumulator[section.id] = nextCollapsed;
        return accumulator;
      }, {}),
    );
  }

  function moveSection(sectionId: string, direction: 'up' | 'down') {
    setSectionEditors((current) => {
      const currentIndex = current.findIndex((section) => section.id === sectionId);
      if (currentIndex === -1) return current;

      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= current.length) return current;

      const next = [...current];
      [next[currentIndex], next[targetIndex]] = [next[targetIndex], next[currentIndex]];
      return normalizeSectionOrder(next);
    });
  }

  function updateSectionItems(
    sectionId: string,
    updater: (items: CmsItemEditor[]) => CmsItemEditor[],
  ) {
    updateSectionEditor(sectionId, (section) => ({ ...section, items: updater(section.items) }));
  }

  function addItem(sectionId: string) {
    updateSectionItems(sectionId, (items) => normalizeItemOrder([...items, buildItemEditor()]));
    setCollapsedSections((current) => ({ ...current, [sectionId]: false }));
  }

  function updateItemField<K extends keyof CmsItemEditor>(
    sectionId: string,
    itemId: string,
    field: K,
    value: CmsItemEditor[K],
  ) {
    updateSectionItems(sectionId, (items) =>
      items.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)),
    );
  }

  function removeItem(sectionId: string, itemId: string) {
    updateSectionItems(sectionId, (items) =>
      normalizeItemOrder(items.filter((item) => item.id !== itemId)),
    );
  }

  function moveItem(sectionId: string, itemId: string, direction: 'up' | 'down') {
    updateSectionItems(sectionId, (items) => {
      const currentIndex = items.findIndex((item) => item.id === itemId);
      if (currentIndex === -1) return items;

      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= items.length) return items;

      const next = [...items];
      [next[currentIndex], next[targetIndex]] = [next[targetIndex], next[currentIndex]];
      return normalizeItemOrder(next);
    });
  }

  async function saveSectionEditors(now: string) {
    const baselineSectionsById = new Map(baselineSections.map((section) => [section.id, section]));
    const baselineSectionIds = baselineSections.map((section) => section.id);
    const nextPersistedSectionIds = sectionEditors
      .map((section) => section.id)
      .filter((sectionId) => !isDraftId(sectionId));

    const removedSectionIds = baselineSectionIds.filter(
      (sectionId) => !nextPersistedSectionIds.includes(sectionId),
    );

    if (removedSectionIds.length > 0) {
      const { error: deleteSectionsError } = await supabase
        .from('cms_sections')
        .delete()
        .eq('page_id', pageId)
        .in('id', removedSectionIds);

      if (deleteSectionsError) throw deleteSectionsError;
    }

    for (const [sectionIndex, section] of sectionEditors.entries()) {
      const sectionKey = section.section_key.trim();
      const sectionType = section.section_type.trim();

      if (!sectionKey || !sectionType) {
        throw new Error(`第 ${sectionIndex + 1} 个区块缺少 section_key 或 section_type。`);
      }

      const sectionPayload = {
        page_id: pageId,
        section_key: sectionKey,
        section_type: sectionType,
        title: normalizeOptionalText(section.title),
        subtitle: normalizeOptionalText(section.subtitle),
        description: normalizeOptionalText(section.description),
        content: parseStructuredInput(
          section.content_json,
          {},
          `第 ${sectionIndex + 1} 个区块内容`,
        ),
        cta_text: normalizeOptionalText(section.cta_text),
        cta_link: normalizeOptionalText(section.cta_link),
        cta_style: normalizeOptionalText(section.cta_style),
        is_active: section.is_active,
        display_order: Number.isFinite(section.display_order)
          ? section.display_order
          : sectionIndex,
        style_config: parseStructuredInput(
          section.style_config_json,
          {},
          `第 ${sectionIndex + 1} 个区块样式配置`,
        ),
        updated_at: now,
      };

      let persistedSectionId = section.id;

      if (isDraftId(section.id)) {
        const { data: newSection, error: insertSectionError } = await supabase
          .from('cms_sections')
          .insert(sectionPayload)
          .select('*')
          .single();

        if (insertSectionError) throw insertSectionError;
        persistedSectionId = (newSection as CmsSection).id;
      } else {
        const { error: updateSectionError } = await supabase
          .from('cms_sections')
          .update(sectionPayload)
          .eq('id', section.id)
          .eq('page_id', pageId);

        if (updateSectionError) throw updateSectionError;
      }

      const baselineItems = !isDraftId(section.id)
        ? baselineSectionsById.get(section.id)?.items || []
        : [];
      const baselineItemIds = baselineItems.map((item) => item.id);
      const nextPersistedItemIds = section.items
        .map((item) => item.id)
        .filter((itemId) => !isDraftId(itemId));

      const removedItemIds = baselineItemIds.filter(
        (itemId) => !nextPersistedItemIds.includes(itemId),
      );

      if (removedItemIds.length > 0) {
        const { error: deleteItemsError } = await supabase
          .from('cms_items')
          .delete()
          .eq('section_id', persistedSectionId)
          .in('id', removedItemIds);

        if (deleteItemsError) throw deleteItemsError;
      }

      for (const [itemIndex, item] of section.items.entries()) {
        const itemPayload = {
          section_id: persistedSectionId,
          item_key: normalizeOptionalText(item.item_key),
          item_type: normalizeOptionalText(item.item_type),
          title: normalizeOptionalText(item.title),
          subtitle: normalizeOptionalText(item.subtitle),
          description: normalizeOptionalText(item.description),
          content: parseStructuredInput(
            item.content_json,
            {},
            `第 ${sectionIndex + 1} 个区块的第 ${itemIndex + 1} 个子项内容`,
          ),
          image_url: normalizeOptionalText(item.image_url),
          icon: normalizeOptionalText(item.icon),
          link_url: normalizeOptionalText(item.link_url),
          link_text: normalizeOptionalText(item.link_text),
          link_target: normalizeOptionalText(item.link_target) || '_self',
          is_active: item.is_active,
          display_order: Number.isFinite(item.display_order) ? item.display_order : itemIndex,
          updated_at: now,
        };

        if (isDraftId(item.id)) {
          const { error: insertItemError } = await supabase.from('cms_items').insert(itemPayload);
          if (insertItemError) throw insertItemError;
        } else {
          const { error: updateItemError } = await supabase
            .from('cms_items')
            .update(itemPayload)
            .eq('id', item.id)
            .eq('section_id', persistedSectionId);

          if (updateItemError) throw updateItemError;
        }
      }
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
      const totalItems = sectionEditors.reduce((sum, section) => sum + section.items.length, 0);

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

      await saveSectionEditors(now);

      await supabase.from('admin_audit_logs').insert({
        admin_user_id: authData.user?.id,
        module: 'cms',
        action: form.status === 'published' && page.status !== 'published' ? 'publish' : 'update',
        target_type: 'cms_page',
        target_id: page.id,
        target_name: form.name.trim(),
        changes_summary: `更新CMS页面: ${form.name.trim()}（${sectionEditors.length}个区块，${totalItems}个子项）`,
      });

      setNotice('保存成功，页面与区块结构已同步。');
      await loadPage();
    } catch (saveError) {
      console.error('保存 CMS 页面失败:', saveError);
      setError(saveError instanceof Error ? saveError.message : '保存失败，请重试。');
    } finally {
      setSaving(false);
    }
  }

  const stats = useMemo(() => {
    const activeSections = sectionEditors.filter((section) => section.is_active).length;
    const itemCount = sectionEditors.reduce((sum, section) => sum + section.items.length, 0);
    return {
      sectionCount: sectionEditors.length,
      activeSections,
      itemCount,
    };
  }, [sectionEditors]);

  const allSectionsCollapsed =
    sectionEditors.length > 0 && sectionEditors.every((section) => collapsedSections[section.id]);

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
            保存页面与区块
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
                <h2 className="text-lg font-semibold text-slate-900">区块编辑器</h2>
                <p className="mt-1 text-sm text-slate-500">
                  在当前页面直接新增、删除和调整区块及子项，保存时会和页面基础字段一起落库。
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge
                  status={
                    stats.activeSections === stats.sectionCount && stats.sectionCount > 0
                      ? 'active'
                      : 'draft'
                  }
                />
                {sectionEditors.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAllSectionsCollapsed(!allSectionsCollapsed)}
                  >
                    {allSectionsCollapsed ? '展开全部' : '折叠全部'}
                  </Button>
                )}
                <Button variant="secondary" size="sm" onClick={addSection}>
                  新增区块
                </Button>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              {sectionEditors.length === 0 ? (
                <EmptyState
                  icon="🧱"
                  title="当前没有区块"
                  description="点击右上角新增区块，即可开始配置页面结构。"
                  action={
                    <Button variant="secondary" onClick={addSection}>
                      新增第一个区块
                    </Button>
                  }
                />
              ) : (
                sectionEditors.map((section, sectionIndex) => (
                  <div key={section.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">
                            {section.title || section.section_key || `区块 ${sectionIndex + 1}`}
                          </p>
                          {section.section_key && (
                            <code className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                              {section.section_key}
                            </code>
                          )}
                          {section.section_type && (
                            <code className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                              {section.section_type}
                            </code>
                          )}
                        </div>
                        <p className="mt-2 text-sm text-slate-500">
                          {section.items.length} 个子项 · 排序 {section.display_order}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={section.is_active ? 'active' : 'hidden'} size="sm" />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveSection(section.id, 'up')}
                          disabled={sectionIndex === 0}
                        >
                          上移
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveSection(section.id, 'down')}
                          disabled={sectionIndex === sectionEditors.length - 1}
                        >
                          下移
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSectionCollapse(section.id)}
                        >
                          {collapsedSections[section.id] ? '展开' : '折叠'}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => removeSection(section.id)}>
                          移除区块
                        </Button>
                      </div>
                    </div>

                    {!collapsedSections[section.id] && (
                      <>
                        <div className="mt-4 grid gap-4 md:grid-cols-3">
                          <Input
                            label="section_key"
                            value={section.section_key}
                            onChange={(event) =>
                              updateSectionField(section.id, 'section_key', event.target.value)
                            }
                            placeholder="hero"
                          />
                          <Input
                            label="section_type"
                            value={section.section_type}
                            onChange={(event) =>
                              updateSectionField(section.id, 'section_type', event.target.value)
                            }
                            placeholder="card_grid"
                          />
                          <Input
                            label="display_order"
                            type="number"
                            value={String(section.display_order)}
                            onChange={(event) =>
                              updateSectionField(
                                section.id,
                                'display_order',
                                Number(event.target.value || sectionIndex),
                              )
                            }
                          />
                        </div>

                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          <Input
                            label="标题"
                            value={section.title}
                            onChange={(event) =>
                              updateSectionField(section.id, 'title', event.target.value)
                            }
                          />
                          <Input
                            label="副标题"
                            value={section.subtitle}
                            onChange={(event) =>
                              updateSectionField(section.id, 'subtitle', event.target.value)
                            }
                          />
                        </div>

                        <div className="mt-4 space-y-1.5">
                          <label className="block text-sm font-medium text-slate-700">
                            区块描述
                          </label>
                          <textarea
                            value={section.description}
                            onChange={(event) =>
                              updateSectionField(section.id, 'description', event.target.value)
                            }
                            rows={3}
                            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>

                        <div className="mt-4 grid gap-4 md:grid-cols-3">
                          <Input
                            label="CTA 文案"
                            value={section.cta_text}
                            onChange={(event) =>
                              updateSectionField(section.id, 'cta_text', event.target.value)
                            }
                          />
                          <Input
                            label="CTA 链接"
                            value={section.cta_link}
                            onChange={(event) =>
                              updateSectionField(section.id, 'cta_link', event.target.value)
                            }
                          />
                          <Input
                            label="CTA 样式"
                            value={section.cta_style}
                            onChange={(event) =>
                              updateSectionField(section.id, 'cta_style', event.target.value)
                            }
                            placeholder="primary"
                          />
                        </div>

                        <label className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-700">
                          <input
                            type="checkbox"
                            checked={section.is_active}
                            onChange={(event) =>
                              updateSectionField(section.id, 'is_active', event.target.checked)
                            }
                            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          启用区块
                        </label>

                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-slate-700">
                              content JSON
                            </label>
                            <textarea
                              value={section.content_json}
                              onChange={(event) =>
                                updateSectionField(section.id, 'content_json', event.target.value)
                              }
                              rows={8}
                              className="w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-slate-700">
                              style_config JSON
                            </label>
                            <textarea
                              value={section.style_config_json}
                              onChange={(event) =>
                                updateSectionField(
                                  section.id,
                                  'style_config_json',
                                  event.target.value,
                                )
                              }
                              rows={8}
                              className="w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                        </div>

                        <div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <h3 className="text-sm font-semibold text-slate-900">子项列表</h3>
                              <p className="mt-1 text-xs text-slate-500">
                                适用于卡片、列表项、功能点等可重复内容。
                              </p>
                            </div>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => addItem(section.id)}
                            >
                              新增子项
                            </Button>
                          </div>

                          <div className="mt-4 space-y-4">
                            {section.items.length === 0 ? (
                              <EmptyState
                                title="暂无子项"
                                description="为这个区块添加卡片、要点或 CTA 子项。"
                              />
                            ) : (
                              section.items.map((item, itemIndex) => (
                                <div
                                  key={item.id}
                                  className="rounded-md border border-slate-200 bg-white p-4"
                                >
                                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                      <p className="text-sm font-semibold text-slate-900">
                                        {item.title || item.item_key || `子项 ${itemIndex + 1}`}
                                      </p>
                                      <p className="mt-1 text-xs text-slate-500">
                                        {item.item_type || '未设置类型'} · 排序 {item.display_order}
                                      </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <StatusBadge
                                        status={item.is_active ? 'active' : 'hidden'}
                                        size="sm"
                                      />
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => moveItem(section.id, item.id, 'up')}
                                        disabled={itemIndex === 0}
                                      >
                                        上移
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => moveItem(section.id, item.id, 'down')}
                                        disabled={itemIndex === section.items.length - 1}
                                      >
                                        下移
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeItem(section.id, item.id)}
                                      >
                                        移除子项
                                      </Button>
                                    </div>
                                  </div>

                                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                                    <Input
                                      label="item_key"
                                      value={item.item_key}
                                      onChange={(event) =>
                                        updateItemField(
                                          section.id,
                                          item.id,
                                          'item_key',
                                          event.target.value,
                                        )
                                      }
                                      placeholder="feature-1"
                                    />
                                    <Input
                                      label="item_type"
                                      value={item.item_type}
                                      onChange={(event) =>
                                        updateItemField(
                                          section.id,
                                          item.id,
                                          'item_type',
                                          event.target.value,
                                        )
                                      }
                                      placeholder="card"
                                    />
                                    <Input
                                      label="display_order"
                                      type="number"
                                      value={String(item.display_order)}
                                      onChange={(event) =>
                                        updateItemField(
                                          section.id,
                                          item.id,
                                          'display_order',
                                          Number(event.target.value || itemIndex),
                                        )
                                      }
                                    />
                                  </div>

                                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                                    <Input
                                      label="标题"
                                      value={item.title}
                                      onChange={(event) =>
                                        updateItemField(
                                          section.id,
                                          item.id,
                                          'title',
                                          event.target.value,
                                        )
                                      }
                                    />
                                    <Input
                                      label="副标题"
                                      value={item.subtitle}
                                      onChange={(event) =>
                                        updateItemField(
                                          section.id,
                                          item.id,
                                          'subtitle',
                                          event.target.value,
                                        )
                                      }
                                    />
                                  </div>

                                  <div className="mt-4 space-y-1.5">
                                    <label className="block text-sm font-medium text-slate-700">
                                      子项描述
                                    </label>
                                    <textarea
                                      value={item.description}
                                      onChange={(event) =>
                                        updateItemField(
                                          section.id,
                                          item.id,
                                          'description',
                                          event.target.value,
                                        )
                                      }
                                      rows={3}
                                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                    />
                                  </div>

                                  <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                    <Input
                                      label="图标"
                                      value={item.icon}
                                      onChange={(event) =>
                                        updateItemField(
                                          section.id,
                                          item.id,
                                          'icon',
                                          event.target.value,
                                        )
                                      }
                                    />
                                    <Input
                                      label="图片 URL"
                                      value={item.image_url}
                                      onChange={(event) =>
                                        updateItemField(
                                          section.id,
                                          item.id,
                                          'image_url',
                                          event.target.value,
                                        )
                                      }
                                    />
                                    <Input
                                      label="链接 URL"
                                      value={item.link_url}
                                      onChange={(event) =>
                                        updateItemField(
                                          section.id,
                                          item.id,
                                          'link_url',
                                          event.target.value,
                                        )
                                      }
                                    />
                                    <Input
                                      label="链接文案"
                                      value={item.link_text}
                                      onChange={(event) =>
                                        updateItemField(
                                          section.id,
                                          item.id,
                                          'link_text',
                                          event.target.value,
                                        )
                                      }
                                    />
                                  </div>

                                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                                    <Input
                                      label="link_target"
                                      value={item.link_target}
                                      onChange={(event) =>
                                        updateItemField(
                                          section.id,
                                          item.id,
                                          'link_target',
                                          event.target.value,
                                        )
                                      }
                                      placeholder="_self"
                                    />
                                    <label className="flex items-center gap-2 pt-8 text-sm font-medium text-slate-700">
                                      <input
                                        type="checkbox"
                                        checked={item.is_active}
                                        onChange={(event) =>
                                          updateItemField(
                                            section.id,
                                            item.id,
                                            'is_active',
                                            event.target.checked,
                                          )
                                        }
                                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                      />
                                      启用子项
                                    </label>
                                  </div>

                                  <div className="mt-4 space-y-1.5">
                                    <label className="block text-sm font-medium text-slate-700">
                                      content JSON
                                    </label>
                                    <textarea
                                      value={item.content_json}
                                      onChange={(event) =>
                                        updateItemField(
                                          section.id,
                                          item.id,
                                          'content_json',
                                          event.target.value,
                                        )
                                      }
                                      rows={6}
                                      className="w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                    />
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </>
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
                这条详情页现在不仅补齐了 `/cms/pages/:id` 路由，也把 section 和 item
                的基础编辑能力收进来了。
              </p>
              <p>
                当前版本优先解决运维闭环：页面元信息、区块结构、子项内容都能在同一页保存，并补上了快速排序与折叠面板；如需更重的拖拽排序和可视预览，再单独扩展。
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
