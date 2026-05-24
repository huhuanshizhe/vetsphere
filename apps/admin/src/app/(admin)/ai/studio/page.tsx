'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button, Card, Input, Select, ToastContainer, useToast } from '@/components/ui';
import { useSite } from '@/context/SiteContext';
import { apiFetch, getErrorMessage } from '@/lib/api-client';

interface Citation {
  id: string;
  title: string;
  sourceType: string | null;
  score: number;
  chunkText: string;
}

const TASK_OPTIONS = [
  { value: 'content_brief_planner', label: '内容 Brief 规划' },
  { value: 'content_outline_generator', label: '内容大纲生成' },
  { value: 'content_draft_generator', label: '内容初稿生成' },
  { value: 'content_section_expander', label: '单段扩写' },
  { value: 'content_faq_extractor', label: 'FAQ 抽取' },
  { value: 'content_glossary_extractor', label: '术语抽取' },
  { value: 'content_meta_generator', label: 'SEO 元信息生成' },
];

export default function ContentAiStudioPage() {
  const searchParams = useSearchParams();
  const { currentSite } = useSite();
  const siteCode = currentSite === 'global' ? 'intl' : currentSite;
  const { toasts, removeToast, success, error } = useToast();

  const [taskKey, setTaskKey] = useState(searchParams.get('taskKey') || 'content_brief_planner');
  const [contentId, setContentId] = useState(searchParams.get('contentId') || '');
  const [locale, setLocale] = useState('en');
  const [query, setQuery] = useState(searchParams.get('query') || '');
  const [instructions, setInstructions] = useState('');
  const [applyToContent, setApplyToContent] = useState(true);
  const [running, setRunning] = useState(false);
  const [outputText, setOutputText] = useState('');
  const [citations, setCitations] = useState<Citation[]>([]);

  useEffect(() => {
    setTaskKey(searchParams.get('taskKey') || 'content_brief_planner');
    setContentId(searchParams.get('contentId') || '');
    setQuery(searchParams.get('query') || '');
  }, [searchParams]);

  async function handleRun() {
    if (!query.trim()) {
      error('请先填写任务主题');
      return;
    }

    setRunning(true);
    try {
      const data = await apiFetch<{ output: Record<string, unknown>; citations: Citation[]; appliedToContent: boolean }>(
        '/api/v1/admin/content/generate',
        {
          method: 'POST',
          body: JSON.stringify({
            taskKey,
            contentId: contentId || null,
            locale,
            siteCode,
            query: query.trim(),
            instructions: instructions.trim() || null,
            applyToContent: Boolean(contentId && applyToContent),
          }),
        },
      );

      setOutputText(JSON.stringify(data.output || {}, null, 2));
      setCitations(data.citations || []);
      success(data.appliedToContent ? 'AI 输出已生成并写回内容草稿' : 'AI 输出已生成');
    } catch (runError) {
      error(getErrorMessage(runError));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <div>
        <h1 className="text-2xl font-bold text-slate-900">内容 AI 工作台</h1>
        <p className="mt-1 text-sm text-slate-500">基于内部知识库做任务型生成，输出可直接回写到内容草稿。</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <div className="space-y-4">
            <Select label="任务模板" value={taskKey} onChange={(event) => setTaskKey(event.target.value)} options={TASK_OPTIONS} />
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="内容 ID" value={contentId} onChange={(event) => setContentId(event.target.value)} placeholder="可选，绑定现有内容" />
              <Select label="语言" value={locale} onChange={(event) => setLocale(event.target.value)} options={[
                { value: 'en', label: 'English' },
                { value: 'ja', label: 'Japanese' },
                { value: 'th', label: 'Thai' },
                { value: 'zh', label: 'Chinese' },
              ]} />
            </div>
            <Input label="任务主题 / Query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="例如：Small animal endoscopy training hub" />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">附加指令</label>
              <textarea
                value={instructions}
                onChange={(event) => setInstructions(event.target.value)}
                rows={8}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="例如：强调适应症筛选、培训路径与器械采购决策。"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={applyToContent}
                onChange={(event) => setApplyToContent(event.target.checked)}
                disabled={!contentId}
              />
              生成后自动写回内容草稿
            </label>
            <div className="flex justify-end">
              <Button loading={running} onClick={() => void handleRun()}>
                运行任务
              </Button>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <h2 className="text-lg font-semibold text-slate-900">生成输出</h2>
            <p className="mt-1 text-sm text-slate-500">当前以 JSON 输出，便于直接回写、审核和二次加工。</p>
            <pre className="mt-4 max-h-[420px] overflow-auto rounded-lg bg-slate-950 p-4 text-xs leading-6 text-slate-100">
              {outputText || '{\n  "status": "idle"\n}'}
            </pre>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-slate-900">引用证据</h2>
            <div className="mt-4 space-y-3">
              {citations.length === 0 ? (
                <p className="text-sm text-slate-500">当前还没有引用证据。先完善知识库，或换一个更聚焦的 query。</p>
              ) : (
                citations.map((citation) => (
                  <div key={citation.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{citation.title}</p>
                        <p className="text-xs text-slate-500">{citation.sourceType || 'unknown source'}</p>
                      </div>
                      <span className="text-xs font-medium text-emerald-700">score {citation.score}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{citation.chunkText}</p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}