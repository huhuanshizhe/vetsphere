'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Input, Select, StatusBadge } from '@/components/ui';
import { apiFetch, getErrorMessage } from '@/lib/api-client';

interface ExtractedProductData {
  sourceLanguage: 'zh' | 'en' | 'th' | 'ja';
  name: string;
  brand?: string;
  subtitle?: string;
  description?: string;
  richDescription?: string;
  price?: number | null;
  currency?: string;
  hasPrice?: boolean;
  minOrderQuantity?: number | null;
  packageQty?: number | null;
  packageUnit?: string;
  leadTime?: string;
  unit?: string;
  skuCode?: string;
  focusKeyword?: string;
  specifications?: Record<string, string>;
  faq?: Array<{ question: string; answer: string }>;
  suggestedCategory?: string;
  rawText?: string;
  confidence?: number;
}

interface ImportResult {
  data: {
    id: string;
    name: string;
    status: string;
    publish_language?: string;
    site_view?: {
      site_code: string;
      publish_status: string;
    } | null;
  };
  extracted: ExtractedProductData;
  warnings: string[];
  sourceKind: 'image' | 'pdf';
}

const siteOptions = [
  { value: 'cn', label: 'CN 中国站' },
  { value: 'intl', label: 'INTL 国际站' },
];

export default function ProductDocumentImportPage() {
  const router = useRouter();
  const [sourceUrl, setSourceUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [siteCode, setSiteCode] = useState('cn');
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

  const sourceKindLabel = useMemo(() => {
    if (!file && !sourceUrl) return '';
    const target = file?.name || sourceUrl;
    return target.toLowerCase().endsWith('.pdf') || file?.type === 'application/pdf'
      ? 'PDF 文档'
      : '图片资料';
  }, [file, sourceUrl]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] || null;
    setFile(nextFile);
    setResult(null);
    setError('');

    if (previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    if (!nextFile) {
      setPreviewUrl(sourceUrl.trim());
      return;
    }

    if (nextFile.type === 'application/pdf' || nextFile.name.toLowerCase().endsWith('.pdf')) {
      setPreviewUrl('');
      return;
    }

    setPreviewUrl(URL.createObjectURL(nextFile));
  };

  const handleImport = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setResult(null);

    if (!file && !sourceUrl.trim()) {
      setError('请上传产品图片/PDF，或填写可访问的资料 URL');
      return;
    }

    const formData = new FormData();
    if (file) formData.append('file', file);
    if (sourceUrl.trim()) formData.append('sourceUrl', sourceUrl.trim());
    formData.append('siteCode', siteCode);

    setLoading(true);
    try {
      const json = await apiFetch<ImportResult>('/api/admin/products/document-import', {
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

  const specEntries = Object.entries(result?.extracted.specifications || {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">资料导入产品草稿</h1>
          <p className="mt-1 text-sm text-slate-500">
            支持产品海报、参数图片和可提取文本的 PDF，自动解析后创建草稿商品。
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => router.push('/products/new')}>
            手动新建
          </Button>
          <Button variant="secondary" onClick={() => router.push('/products')}>
            返回产品列表
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
        <Card className="space-y-5" padding="lg">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-900">导入设置</h2>
            <p className="text-sm text-slate-500">
              默认创建草稿，并为所选站点初始化 draft 站点视图，不直接上架。
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleImport}>
            <Select
              label="站点草稿归属"
              options={siteOptions}
              value={siteCode}
              onChange={(event) => setSiteCode(event.target.value)}
            />

            <Input
              label="资料 URL"
              placeholder="https://.../product-sheet.pdf 或 https://.../poster.jpg"
              value={sourceUrl}
              onChange={(event) => {
                setSourceUrl(event.target.value);
                if (!file) {
                  const next = event.target.value.trim();
                  setPreviewUrl(next.toLowerCase().endsWith('.pdf') ? '' : next);
                }
              }}
            />

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">本地文件</label>
              <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center transition-colors hover:border-emerald-400 hover:bg-emerald-50/40">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,.pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <span className="text-sm font-medium text-slate-700">点击选择产品图片或 PDF</span>
                <span className="mt-1 text-xs text-slate-500">
                  图片优先走视觉解析；PDF 目前支持可提取文本的资料单。
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
                解析资料并创建产品草稿
              </Button>
              {result?.data?.id ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => router.push(`/products/${result.data.id}`)}
                >
                  打开产品编辑页
                </Button>
              ) : null}
            </div>
          </form>
        </Card>

        <Card className="space-y-5" padding="lg">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-900">识别结果预览</h2>
            <p className="text-sm text-slate-500">
              先把资料内容沉淀成草稿，规格、FAQ、价格和图片都可以在产品详情页继续补全。
            </p>
          </div>

          {previewUrl ? (
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
              <img
                src={previewUrl}
                alt="产品资料预览"
                className="h-auto max-h-[420px] w-full object-contain"
              />
            </div>
          ) : (
            <div className="flex min-h-56 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-6 text-center text-sm text-slate-400">
              <div>{sourceKindLabel || '支持图片和 PDF 资料'}</div>
              <div className="mt-2 text-xs text-slate-400">
                PDF 不显示图像预览，但会解析文本内容。
              </div>
            </div>
          )}

          {result ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={result.data.status || 'draft'} />
                {result.data.site_view ? (
                  <StatusBadge status={result.data.site_view.publish_status} />
                ) : null}
                <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
                  源语言: {result.extracted.sourceLanguage.toUpperCase()}
                </span>
                <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
                  来源: {result.sourceKind === 'pdf' ? 'PDF' : '图片'}
                </span>
                {typeof result.extracted.confidence === 'number' ? (
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
                    识别置信度: {Math.round(result.extracted.confidence * 100)}%
                  </span>
                ) : null}
              </div>

              <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">产品名称</p>
                  <p className="mt-1 text-base font-semibold text-slate-900">
                    {result.extracted.name}
                  </p>
                </div>
                {result.extracted.brand ? (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">品牌</p>
                    <p className="mt-1 text-sm text-slate-700">{result.extracted.brand}</p>
                  </div>
                ) : null}
                {result.extracted.description ? (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">摘要描述</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {result.extracted.description}
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">商务信息</p>
                  <p className="mt-2 text-sm text-slate-700">
                    价格:{' '}
                    {result.extracted.price
                      ? `${result.extracted.currency || 'USD'} ${result.extracted.price}`
                      : '未识别'}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    MOQ: {result.extracted.minOrderQuantity || '未识别'}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    交期: {result.extracted.leadTime || '未识别'}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    SKU: {result.extracted.skuCode || '未识别'}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">包装与分类建议</p>
                  <p className="mt-2 text-sm text-slate-700">
                    包装数量: {result.extracted.packageQty || '未识别'}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    包装单位: {result.extracted.packageUnit || '未识别'}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    计量单位: {result.extracted.unit || '未识别'}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    分类建议: {result.extracted.suggestedCategory || '未识别'}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">规格参数</p>
                {specEntries.length ? (
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {specEntries.map(([key, value]) => (
                      <div
                        key={key}
                        className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700"
                      >
                        <span className="font-medium text-slate-900">{key}:</span> {value}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">
                    未识别到结构化规格，后续可在详情页继续补。
                  </p>
                )}
              </div>

              {result.extracted.faq?.length ? (
                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">FAQ</p>
                  <div className="mt-2 space-y-3 text-sm text-slate-700">
                    {result.extracted.faq.map((item, index) => (
                      <div key={`${item.question}-${index}`}>
                        <p className="font-medium text-slate-900">Q: {item.question}</p>
                        <p className="mt-1">A: {item.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {result.warnings?.length ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  {result.warnings.join('；')}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-500">
              导入后这里会显示识别出的产品名称、品牌、价格、规格、FAQ
              和来源类型，并提供跳转到产品编辑页的入口。
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
