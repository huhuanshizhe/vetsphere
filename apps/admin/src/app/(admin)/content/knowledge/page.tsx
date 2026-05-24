'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  EmptyState,
  Input,
  LoadingState,
  Select,
  ToastContainer,
  useToast,
} from '@/components/ui';
import { apiFetch, getErrorMessage } from '@/lib/api-client';
import { CONTENT_ADMIN_SITE_CODE } from '@/lib/content-admin';

interface KnowledgeAsset {
  id: string;
  source_type: string;
  source_id: string | null;
  site_code: string;
  locale: string;
  title: string;
  status: string;
  source_url: string | null;
  metadata_json: Record<string, unknown>;
  created_at: string;
}

interface RetrievedChunk {
  id: string;
  assetId: string;
  title: string;
  sourceType: string | null;
  chunkText: string;
  score: number;
}

const SOURCE_TYPE_OPTIONS = [
  { value: 'manual_note', label: '人工笔记' },
  { value: 'product_manual', label: '产品手册' },
  { value: 'course_material', label: '课程资料' },
  { value: 'case_report', label: '病例材料' },
  { value: 'faq_source', label: 'FAQ 素材' },
];

export default function ContentKnowledgePage() {
  const siteCode = CONTENT_ADMIN_SITE_CODE;
  const { toasts, removeToast, success, error } = useToast();

  const [items, setItems] = useState<KnowledgeAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [title, setTitle] = useState('');
  const [sourceType, setSourceType] = useState('manual_note');
  const [sourceUrl, setSourceUrl] = useState('');
  const [locale, setLocale] = useState('en');
  const [rawText, setRawText] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [procedure, setProcedure] = useState('');
  const [saving, setSaving] = useState(false);
  const [retrieveQuery, setRetrieveQuery] = useState('');
  const [retrieving, setRetrieving] = useState(false);
  const [chunks, setChunks] = useState<RetrievedChunk[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ siteCode });
      if (search) params.set('q', search);
      const data = await apiFetch<{ items: KnowledgeAsset[] }>(`/api/v1/admin/content/knowledge?${params.toString()}`);
      setItems(data.items || []);
    } catch (loadError) {
      error(`加载知识库失败：${getErrorMessage(loadError)}`);
    } finally {
      setLoading(false);
    }
  }, [error, search, siteCode]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const readyCount = useMemo(() => items.filter((item) => item.status === 'ready').length, [items]);

  async function handleImport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !rawText.trim()) {
      error('标题和正文都不能为空');
      return;
    }

    setSaving(true);
    try {
      const result = await apiFetch<{ assetId: string; chunkCount: number }>('/api/v1/admin/content/knowledge', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          sourceType,
          sourceUrl: sourceUrl || null,
          siteCode,
          locale,
          rawText,
          metadata: {
            specialty: specialty || null,
            procedure: procedure || null,
          },
        }),
      });

      success(`导入完成，切分 ${result.chunkCount} 个 chunk`);
      setTitle('');
      setSourceUrl('');
      setRawText('');
      setSpecialty('');
      setProcedure('');
      await loadData();
    } catch (importError) {
      error(getErrorMessage(importError));
    } finally {
      setSaving(false);
    }
  }

  async function handleRetrieve() {
    if (!retrieveQuery.trim()) {
      error('请输入检索问题');
      return;
    }

    setRetrieving(true);
    try {
      const data = await apiFetch<{ items: RetrievedChunk[] }>('/api/v1/admin/content/knowledge/retrieve', {
        method: 'POST',
        body: JSON.stringify({
          query: retrieveQuery.trim(),
          siteCode,
          locale,
          specialty: specialty || undefined,
          procedure: procedure || undefined,
        }),
      });
      setChunks(data.items || []);
      success(`命中 ${data.items?.length || 0} 条证据`);
    } catch (retrieveError) {
      error(getErrorMessage(retrieveError));
    } finally {
      setRetrieving(false);
    }
  }

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <div>
        <h1 className="text-2xl font-bold text-slate-900">内容知识库</h1>
        <p className="mt-1 text-sm text-slate-500">沉淀内部手册、课程材料、病例记录和 FAQ 素材，作为 RAG 的唯一证据源。</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">导入资产</h2>
              <p className="mt-1 text-sm text-slate-500">录入后会自动切分 chunk，供 AI 工作台检索与引用。</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              Ready {readyCount}/{items.length}
            </span>
          </div>

          <form className="space-y-4" onSubmit={handleImport}>
            <Input label="资产标题" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Flexible endoscopy training notes" />
            <div className="grid gap-4 md:grid-cols-2">
              <Select label="来源类型" value={sourceType} onChange={(event) => setSourceType(event.target.value)} options={SOURCE_TYPE_OPTIONS} />
              <Select label="语言" value={locale} onChange={(event) => setLocale(event.target.value)} options={[
                { value: 'en', label: 'English' },
                { value: 'ja', label: 'Japanese' },
                { value: 'th', label: 'Thai' },
                { value: 'zh', label: 'Chinese' },
              ]} />
            </div>
            <Input label="来源 URL" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://..." />
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="专科标签" value={specialty} onChange={(event) => setSpecialty(event.target.value)} placeholder="Small Animal Surgery" />
              <Input label="术式标签" value={procedure} onChange={(event) => setProcedure(event.target.value)} placeholder="Flexible Endoscopy" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">正文 / 资料原文</label>
              <textarea
                value={rawText}
                onChange={(event) => setRawText(event.target.value)}
                rows={14}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" loading={saving}>导入知识资产</Button>
            </div>
          </form>
        </Card>

        <div className="space-y-6">
          <Card>
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="flex-1">
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索资产标题或来源类型..." />
              </div>
              <Button variant="secondary" onClick={() => void loadData()}>刷新列表</Button>
            </div>

            <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto">
              {loading ? (
                <LoadingState text="加载知识资产..." />
              ) : items.length === 0 ? (
                <EmptyState icon="📚" title="暂无知识资产" description="先导入一批内部证据，AI 任务才有可信依据。" />
              ) : (
                items.map((item) => (
                  <div key={item.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.source_type} · {item.locale.toUpperCase()} · {new Date(item.created_at).toLocaleString('zh-CN')}
                        </p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">{item.status}</span>
                    </div>
                    {item.source_url && (
                      <p className="mt-2 truncate text-xs text-slate-500">{item.source_url}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-slate-900">检索预览</h2>
            <p className="mt-1 text-sm text-slate-500">先检查命中的证据质量，再去 AI 工作台执行生成任务。</p>
            <div className="mt-4 space-y-4">
              <Input value={retrieveQuery} onChange={(event) => setRetrieveQuery(event.target.value)} placeholder="例如：flexible endoscopy indications and training pathway" />
              <div className="flex justify-end">
                <Button loading={retrieving} onClick={() => void handleRetrieve()}>检索证据</Button>
              </div>
              <div className="space-y-3">
                {chunks.map((chunk) => (
                  <div key={chunk.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">{chunk.title}</p>
                      <span className="text-xs font-medium text-emerald-700">score {chunk.score}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{chunk.chunkText}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}