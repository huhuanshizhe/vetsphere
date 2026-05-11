'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Input, Select, StatusBadge } from '@/components/ui';
import { apiFetch, getErrorMessage } from '@/lib/api-client';

interface ExtractedCourseData {
  sourceLanguage: 'zh' | 'en' | 'th' | 'ja';
  title: string;
  subtitle?: string;
  description?: string;
  targetAudience?: string;
  price?: number | null;
  currency?: string;
  format?: string;
  level?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  teachingLanguages?: string[];
  specialties?: string[];
  instructorNames?: string[];
  location?: {
    city?: string;
    venue?: string;
    address?: string;
  };
  agenda?: Array<{
    day: string;
    date: string;
    items: Array<{ time: string; activity: string }>;
  }>;
  rawText?: string;
  confidence?: number;
}

interface ImportResult {
  data: {
    id: string;
    title: string;
    status: string;
    publish_language?: string;
  } | null;
  siteView: {
    site_code: string;
    publish_status: string;
  } | null;
  extracted: ExtractedCourseData;
  warnings: string[];
}

interface CreateCourseResult {
  data: {
    id: string;
    title: string;
    status: string;
  };
}

const siteOptions = [
  { value: 'cn', label: 'CN 中国站' },
  { value: 'intl', label: 'INTL 国际站' },
];

export default function NewCoursePage() {
  const router = useRouter();
  const [manualTitle, setManualTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [siteCode, setSiteCode] = useState('cn');
  const [publishNow, setPublishNow] = useState(true);
  const [manualCreating, setManualCreating] = useState(false);
  const [manualError, setManualError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] || null;
    setFile(nextFile);
    setResult(null);
    setError('');

    if (previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    if (nextFile) {
      setPreviewUrl(URL.createObjectURL(nextFile));
    } else {
      setPreviewUrl(imageUrl.trim());
    }
  };

  const handleImport = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setResult(null);

    if (!file && !imageUrl.trim()) {
      setError('请上传海报文件或填写海报图片 URL');
      return;
    }

    const formData = new FormData();
    if (file) formData.append('file', file);
    if (imageUrl.trim()) formData.append('imageUrl', imageUrl.trim());
    formData.append('siteCode', siteCode);
    formData.append('publishNow', String(publishNow));

    setLoading(true);
    try {
      const json = await apiFetch<ImportResult>('/api/admin/courses/poster-import', {
        method: 'POST',
        body: formData,
      });

      setResult(json);
    } catch (importError) {
      setError(getErrorMessage(importError) || '导入失败');
    } finally {
      setLoading(false);
    }
  };

  const handleManualCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setManualError('');

    const title = manualTitle.trim();
    if (!title) {
      setManualError('请先填写课程标题');
      return;
    }

    setManualCreating(true);
    try {
      const json = await apiFetch<CreateCourseResult>('/api/v1/admin/courses', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description: '',
          status: 'draft',
          format: 'offline',
          currency: 'CNY',
          publishLanguage: 'zh',
        }),
      });

      router.push(`/courses/${json.data.id}`);
    } catch (createError) {
      setManualError(getErrorMessage(createError) || '创建课程失败');
    } finally {
      setManualCreating(false);
    }
  };

  const detectedLanguage = result?.extracted.sourceLanguage || 'zh';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">新建课程</h1>
          <p className="mt-1 text-sm text-slate-500">
            支持先手工创建草稿课程继续编辑，也支持通过海报解析快速建课。
          </p>
        </div>
        <Button variant="secondary" onClick={() => router.push('/courses')}>
          返回课程列表
        </Button>
      </div>

      <div id="manual-create" className="scroll-mt-24">
        <Card className="space-y-5" padding="lg">
          <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-900">手工创建课程</h2>
          <p className="text-sm text-slate-500">
            先创建一个空白草稿课程，再进入编辑页手工补全内容和站点上架信息。
          </p>
          </div>

          <form className="space-y-4" onSubmit={handleManualCreate}>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <Input
                label="课程标题"
                placeholder="例如：猫专科牙科进阶课程"
                value={manualTitle}
                onChange={(event) => {
                  setManualTitle(event.target.value);
                  if (manualError) {
                    setManualError('');
                  }
                }}
              />
              <Button type="submit" loading={manualCreating}>
                创建草稿并进入编辑
              </Button>
            </div>

            {manualError ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {manualError}
              </div>
            ) : null}
          </form>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <div id="poster-import" className="scroll-mt-24">
          <Card className="space-y-5" padding="lg">
            <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-900">海报导入建课</h2>
            <p className="text-sm text-slate-500">支持本地上传，或直接粘贴可访问的海报图片 URL。</p>
            </div>

            <form className="space-y-5" onSubmit={handleImport}>
              <div className="grid gap-4 md:grid-cols-2">
                <Select
                  label="上架站点"
                  options={siteOptions}
                  value={siteCode}
                  onChange={(event) => setSiteCode(event.target.value)}
                />
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">发布动作</label>
                  <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={publishNow}
                      onChange={(event) => setPublishNow(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    导入后直接上架到所选站点
                  </label>
                </div>
              </div>

              <Input
                label="海报图片 URL"
                placeholder="https://.../poster.jpg"
                value={imageUrl}
                onChange={(event) => {
                  setImageUrl(event.target.value);
                  if (!file) {
                    setPreviewUrl(event.target.value.trim());
                  }
                }}
              />

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">本地上传</label>
              <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center transition-colors hover:border-emerald-400 hover:bg-emerald-50/40">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <span className="text-sm font-medium text-slate-700">点击选择海报图片</span>
                <span className="mt-1 text-xs text-slate-500">
                  推荐 JPG、PNG、WEBP。上传文件会优先于 URL 使用。
                </span>
                {file ? (
                  <span className="mt-3 text-xs text-emerald-700">已选择: {file.name}</span>
                ) : null}
              </label>
            </div>

            {error ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <div className="flex items-center gap-3">
              <Button type="submit" loading={loading}>
                {publishNow ? '解析海报并创建上架课程' : '解析海报并创建草稿'}
              </Button>
              {result?.data?.id ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => router.push(`/courses/${result.data?.id}`)}
                >
                  打开课程编辑页
                </Button>
              ) : null}
            </div>
            </form>
          </Card>
        </div>

        <Card className="space-y-5" padding="lg">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-900">海报预览与识别结果</h2>
            <p className="text-sm text-slate-500">
              先按海报源语言建课，翻译补全仍然走现有课程翻译流程。
            </p>
          </div>

          {previewUrl ? (
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
              <img
                src={previewUrl}
                alt="课程海报预览"
                className="h-auto max-h-[420px] w-full object-contain"
              />
            </div>
          ) : (
            <div className="flex min-h-56 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400">
              海报预览会显示在这里
            </div>
          )}

          {result ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={result.data?.status || 'draft'} />
                {result.siteView ? <StatusBadge status={result.siteView.publish_status} /> : null}
                <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
                  源语言: {detectedLanguage.toUpperCase()}
                </span>
                {typeof result.extracted.confidence === 'number' ? (
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
                    识别置信度: {Math.round(result.extracted.confidence * 100)}%
                  </span>
                ) : null}
              </div>

              <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">课程标题</p>
                  <p className="mt-1 text-base font-semibold text-slate-900">
                    {result.extracted.title}
                  </p>
                </div>
                {result.extracted.subtitle ? (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">副标题</p>
                    <p className="mt-1 text-sm text-slate-700">{result.extracted.subtitle}</p>
                  </div>
                ) : null}
                {result.extracted.description ? (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">课程描述</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {result.extracted.description}
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">时间与形式</p>
                  <p className="mt-2 text-sm text-slate-700">
                    开始: {result.extracted.startDate || '未识别'}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    结束: {result.extracted.endDate || '未识别'}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    形式: {result.extracted.format || 'offline'}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    等级: {result.extracted.level || '未识别'}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">地点与讲师</p>
                  <p className="mt-2 text-sm text-slate-700">
                    城市: {result.extracted.location?.city || '未识别'}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    场地: {result.extracted.location?.venue || '未识别'}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    讲师: {result.extracted.instructorNames?.join(' / ') || '未识别'}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">标签</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                  {(result.extracted.specialties || []).map((item) => (
                    <span key={item} className="rounded-full bg-slate-100 px-2.5 py-1">
                      {item}
                    </span>
                  ))}
                  {(result.extracted.teachingLanguages || []).map((item) => (
                    <span
                      key={item}
                      className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700"
                    >
                      授课: {item}
                    </span>
                  ))}
                  {result.extracted.price ? (
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">
                      价格: {result.extracted.currency || 'CNY'} {result.extracted.price}
                    </span>
                  ) : null}
                </div>
              </div>

              {result.warnings?.length ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  {result.warnings.join('；')}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-500">
              导入后这里会显示识别出的源语言、标题、时间地点、讲师和标签，并提供跳转到课程编辑页的入口。
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
