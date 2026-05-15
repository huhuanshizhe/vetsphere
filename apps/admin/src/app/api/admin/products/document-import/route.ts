import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import {
  getVisionModelCandidates,
  normalizeCompatibleAIBaseUrl,
  shouldContinueVisionModelFallback,
} from '@/lib/ai-vision';
import { requireAdmin } from '@/lib/auth-middleware';
import { isOSSConfigured, uploadBufferToOSS } from '@/lib/oss';
import { writeAuditLog } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type SupportedLanguage = 'zh' | 'en' | 'th' | 'ja';
type SourceKind = 'image' | 'pdf';

interface ExtractedProductData {
  sourceLanguage: SupportedLanguage;
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

interface PreparedSource {
  kind: SourceKind;
  sourceName?: string;
  visionUrl?: string;
  extractedText?: string;
  coverImageUrl: string | null;
  sourceUrl: string | null;
  warnings: string[];
}

let pdfWorkerHref: string | null = null;

function generateEntityId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${timestamp}-${random}`;
}

function normalizeSupportedLanguage(value: unknown): SupportedLanguage {
  if (value === 'zh' || value === 'en' || value === 'th' || value === 'ja') {
    return value;
  }
  return 'zh';
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function detectSupportedLanguage(text: string): SupportedLanguage {
  if (/[\u0E00-\u0E7F]/.test(text)) return 'th';
  if (/[ぁ-んァ-ン]/.test(text)) return 'ja';
  if (/[\u4E00-\u9FFF]/.test(text)) return 'zh';
  return 'en';
}

function normalizeNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed.replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeFaq(value: unknown): Array<{ question: string; answer: string }> {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const question = normalizeString((item as Record<string, unknown>).question);
      const answer = normalizeString((item as Record<string, unknown>).answer);
      if (!question && !answer) return null;
      return { question, answer };
    })
    .filter(Boolean) as Array<{ question: string; answer: string }>;
}

function normalizeSpecs(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const output: Record<string, string> = {};
  for (const [key, itemValue] of Object.entries(value as Record<string, unknown>)) {
    const normalizedKey = normalizeString(key);
    const normalizedValue = normalizeString(itemValue);
    if (normalizedKey && normalizedValue) {
      output[normalizedKey] = normalizedValue;
    }
  }
  return output;
}

function stripCodeFence(value: string): string {
  let text = value.trim();
  if (text.startsWith('```json')) text = text.slice(7);
  else if (text.startsWith('```')) text = text.slice(3);
  if (text.endsWith('```')) text = text.slice(0, -3);
  return text.trim();
}

function isPdfType(nameOrUrl: string, contentType?: string | null): boolean {
  const lower = nameOrUrl.toLowerCase();
  return lower.endsWith('.pdf') || (contentType || '').toLowerCase().includes('application/pdf');
}

async function resolvePdfWorkerHref(): Promise<string | null> {
  if (pdfWorkerHref) return pdfWorkerHref;

  const relativeWorkerPath = path.join(
    'node_modules',
    'pdf-parse',
    'dist',
    'pdf-parse',
    'esm',
    'pdf.worker.mjs',
  );
  const candidates = [
    path.resolve(process.cwd(), relativeWorkerPath),
    path.resolve(process.cwd(), '..', relativeWorkerPath),
    path.resolve(process.cwd(), '..', '..', relativeWorkerPath),
  ];

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      pdfWorkerHref = pathToFileURL(candidate).href;
      return pdfWorkerHref;
    } catch {
      continue;
    }
  }

  return null;
}

async function parsePdfText(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import('pdf-parse');
  const workerHref = await resolvePdfWorkerHref();

  if (workerHref) {
    PDFParse.setWorker(workerHref);
  }

  const parser = new PDFParse({ data: new Uint8Array(buffer) });

  try {
    const parsed = await parser.getText();
    return normalizeString(parsed?.text);
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

async function prepareSource(formData: FormData): Promise<PreparedSource> {
  const warnings: string[] = [];
  const file = formData.get('file');
  const imageOrPdfUrl = normalizeString(
    formData.get('sourceUrl') || formData.get('imageUrl') || formData.get('pdfUrl'),
  );
  const entityId = generateEntityId('product-source');

  if (file instanceof File && file.size > 0) {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = file.type || 'application/octet-stream';

    if (isPdfType(file.name, contentType)) {
      let extractedText = '';
      try {
        extractedText = await parsePdfText(buffer);
      } catch (error) {
        warnings.push(
          error instanceof Error
            ? `PDF 文本提取失败，已回退到基础草稿：${error.message}`
            : 'PDF 文本提取失败，已回退到基础草稿。',
        );
      }

      if (!extractedText) {
        warnings.push('未提取到 PDF 文本内容，将按文件名创建基础草稿。');
      }

      return {
        kind: 'pdf',
        sourceName: file.name,
        extractedText,
        coverImageUrl: null,
        sourceUrl: null,
        warnings,
      };
    }

    const dataUrl = `data:${contentType};base64,${buffer.toString('base64')}`;
    let coverImageUrl: string | null = null;
    if (isOSSConfigured()) {
      try {
        coverImageUrl = await uploadBufferToOSS(buffer, {
          entityId,
          contentType,
          prefix: 'vetsphere/products',
        });
      } catch (error) {
        warnings.push(
          error instanceof Error
            ? `产品主图上传到 OSS 失败：${error.message}`
            : '产品主图上传到 OSS 失败',
        );
      }
    } else {
      warnings.push('OSS 未配置，图片仅用于解析，未持久化到对象存储。');
    }

    return {
      kind: 'image',
      sourceName: file.name,
      visionUrl: dataUrl,
      coverImageUrl,
      sourceUrl: null,
      warnings,
    };
  }

  if (!imageOrPdfUrl) {
    throw new Error('请提供图片/PDF 文件，或提供可访问的资料 URL');
  }

  const response = await fetch(imageOrPdfUrl);
  if (!response.ok) {
    throw new Error(`下载资料失败：${response.status}`);
  }

  const contentType = response.headers.get('content-type') || 'application/octet-stream';
  const buffer = Buffer.from(await response.arrayBuffer());

  if (isPdfType(imageOrPdfUrl, contentType)) {
    let extractedText = '';
    try {
      extractedText = await parsePdfText(buffer);
    } catch (error) {
      warnings.push(
        error instanceof Error
          ? `PDF 文本提取失败，已回退到基础草稿：${error.message}`
          : 'PDF 文本提取失败，已回退到基础草稿。',
      );
    }

    if (!extractedText) {
      warnings.push('未提取到 PDF 文本内容，将按 URL 创建基础草稿。');
    }

    return {
      kind: 'pdf',
      sourceName: (() => {
        try {
          return new URL(imageOrPdfUrl).pathname.split('/').filter(Boolean).pop() || imageOrPdfUrl;
        } catch {
          return imageOrPdfUrl;
        }
      })(),
      extractedText,
      coverImageUrl: null,
      sourceUrl: imageOrPdfUrl,
      warnings,
    };
  }

  let coverImageUrl: string | null = imageOrPdfUrl;
  if (isOSSConfigured()) {
    try {
      coverImageUrl = await uploadBufferToOSS(buffer, {
        entityId,
        contentType,
        prefix: 'vetsphere/products',
      });
    } catch (error) {
      warnings.push(
        error instanceof Error
          ? `产品主图抓取后上传失败，保留原 URL：${error.message}`
          : '产品主图抓取后上传失败，保留原 URL',
      );
      coverImageUrl = imageOrPdfUrl;
    }
  }

  return {
    kind: 'image',
    sourceName: (() => {
      try {
        return new URL(imageOrPdfUrl).pathname.split('/').filter(Boolean).pop() || imageOrPdfUrl;
      } catch {
        return imageOrPdfUrl;
      }
    })(),
    visionUrl: imageOrPdfUrl,
    coverImageUrl,
    sourceUrl: imageOrPdfUrl,
    warnings,
  };
}

function isAIConfigured() {
  return Boolean(process.env.AI_API_KEY);
}

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    throw new Error('AI service not configured');
  }

  return new OpenAI({
    apiKey,
    baseURL: normalizeCompatibleAIBaseUrl(process.env.AI_BASE_URL || '') || undefined,
    timeout: 180000,
    maxRetries: 2,
  });
}

async function extractFromImage(visionUrl: string): Promise<ExtractedProductData> {
  const client = getOpenAIClient();
  const modelCandidates = getVisionModelCandidates({
    configuredVisionModel: process.env.AI_VISION_MODEL,
    fallbackModel: process.env.AI_MODEL,
  });
  const prompt = [
    'Extract structured product listing data from a medical device product image or poster.',
    'Do not translate. Keep the original source language.',
    'If a field is missing, return empty string, null, empty object, or empty array.',
    'Return JSON only with the following shape:',
    '{',
    '  "sourceLanguage": "zh|en|th|ja",',
    '  "name": "",',
    '  "brand": "",',
    '  "subtitle": "",',
    '  "description": "",',
    '  "richDescription": "",',
    '  "price": null,',
    '  "currency": "USD|CNY|JPY|THB",',
    '  "hasPrice": true,',
    '  "minOrderQuantity": null,',
    '  "packageQty": null,',
    '  "packageUnit": "",',
    '  "leadTime": "",',
    '  "unit": "",',
    '  "skuCode": "",',
    '  "focusKeyword": "",',
    '  "specifications": {"key":"value"},',
    '  "faq": [{"question":"","answer":""}],',
    '  "suggestedCategory": "",',
    '  "rawText": "",',
    '  "confidence": 0.0',
    '}',
  ].join('\n');

  let completion: Awaited<ReturnType<typeof client.chat.completions.create>> | null = null;
  let lastError: unknown = null;

  for (const model of modelCandidates) {
    try {
      completion = await client.chat.completions.create({
        model,
        temperature: 0.1,
        messages: [
          {
            role: 'system',
            content: 'Extract product data from posters and images. Return only valid JSON. /no_think',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: visionUrl } },
            ] as any,
          },
        ],
      });
      break;
    } catch (error) {
      lastError = error;
      if (shouldContinueVisionModelFallback(error) && model !== modelCandidates[modelCandidates.length - 1]) {
        continue;
      }
      throw error;
    }
  }

  if (!completion) {
    throw (lastError instanceof Error ? lastError : new Error('AI 未返回产品解析结果'));
  }

  const text = completion.choices[0]?.message?.content;
  if (!text) throw new Error('AI 未返回产品解析结果');
  return normalizeExtractedProduct(
    JSON.parse(stripCodeFence(text)) as Partial<ExtractedProductData>,
  );
}

async function extractFromPdfText(text: string): Promise<ExtractedProductData> {
  const client = getOpenAIClient();
  const model = process.env.AI_MODEL || 'qwen3-coder-plus';
  const excerpt = text.slice(0, 24000);
  const prompt = [
    'Extract structured product listing data from the following medical device product document text.',
    'Do not translate. Keep the original source language.',
    'If a field is missing, return empty string, null, empty object, or empty array.',
    'Return JSON only with the following shape:',
    '{',
    '  "sourceLanguage": "zh|en|th|ja",',
    '  "name": "",',
    '  "brand": "",',
    '  "subtitle": "",',
    '  "description": "",',
    '  "richDescription": "",',
    '  "price": null,',
    '  "currency": "USD|CNY|JPY|THB",',
    '  "hasPrice": true,',
    '  "minOrderQuantity": null,',
    '  "packageQty": null,',
    '  "packageUnit": "",',
    '  "leadTime": "",',
    '  "unit": "",',
    '  "skuCode": "",',
    '  "focusKeyword": "",',
    '  "specifications": {"key":"value"},',
    '  "faq": [{"question":"","answer":""}],',
    '  "suggestedCategory": "",',
    '  "rawText": "",',
    '  "confidence": 0.0',
    '}',
    '',
    'DOCUMENT TEXT:',
    excerpt,
  ].join('\n');

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.1,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'Extract structured product data from technical documents. Return only valid JSON. /no_think',
      },
      { role: 'user', content: prompt },
    ],
  });

  const result = completion.choices[0]?.message?.content;
  if (!result) throw new Error('AI 未返回 PDF 解析结果');
  return normalizeExtractedProduct(
    JSON.parse(stripCodeFence(result)) as Partial<ExtractedProductData>,
    text,
  );
}

function humanizeSourceName(value: string): string {
  const normalized = normalizeString(value);
  if (!normalized) return '';

  const base = normalized.split(/[\\/]/).pop() || normalized;
  const withoutExtension = base.replace(/\.[^.]+$/, '');

  try {
    return decodeURIComponent(withoutExtension)
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  } catch {
    return withoutExtension.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
}

function buildFallbackExtractedProduct(source: PreparedSource): ExtractedProductData {
  const rawText = normalizeString(source.extractedText);
  const firstMeaningfulLine = rawText
    .split(/\r?\n/)
    .map((line) => normalizeString(line))
    .find((line) => line.length >= 4 && line.length <= 120);
  const sourceLabel =
    humanizeSourceName(source.sourceName || '') ||
    humanizeSourceName(source.sourceUrl || '') ||
    humanizeSourceName(source.coverImageUrl || '');
  const name = firstMeaningfulLine || sourceLabel || '导入商品草稿';
  const summary = rawText
    ? rawText.replace(/\s+/g, ' ').trim().slice(0, 600)
    : `基于${source.kind === 'pdf' ? 'PDF' : '图片'}资料创建的草稿，请补充商品详情。`;
  const specs: Record<string, string> = source.sourceUrl
    ? { source_reference: source.sourceUrl }
    : {};

  return normalizeExtractedProduct(
    {
      sourceLanguage: detectSupportedLanguage(`${name}\n${summary}`),
      name,
      description: summary,
      richDescription: summary,
      currency: 'USD',
      hasPrice: false,
      focusKeyword: sourceLabel || name,
      specifications: specs,
      faq: [],
      rawText: rawText || sourceLabel,
      confidence: 0,
    },
    rawText || sourceLabel,
  );
}

function normalizeExtractedProduct(
  parsed: Partial<ExtractedProductData>,
  rawTextFallback = '',
): ExtractedProductData {
  const name = normalizeString(parsed.name);
  if (!name) {
    throw new Error('AI 未能识别产品名称');
  }

  return {
    sourceLanguage: normalizeSupportedLanguage(parsed.sourceLanguage),
    name,
    brand: normalizeString(parsed.brand),
    subtitle: normalizeString(parsed.subtitle),
    description: normalizeString(parsed.description),
    richDescription: normalizeString(parsed.richDescription),
    price: normalizeNumber(parsed.price),
    currency: normalizeString(parsed.currency).toUpperCase() || 'USD',
    hasPrice: typeof parsed.hasPrice === 'boolean' ? parsed.hasPrice : true,
    minOrderQuantity: normalizeNumber(parsed.minOrderQuantity),
    packageQty: normalizeNumber(parsed.packageQty),
    packageUnit: normalizeString(parsed.packageUnit),
    leadTime: normalizeString(parsed.leadTime),
    unit: normalizeString(parsed.unit),
    skuCode: normalizeString(parsed.skuCode),
    focusKeyword: normalizeString(parsed.focusKeyword),
    specifications: normalizeSpecs(parsed.specifications),
    faq: normalizeFaq(parsed.faq),
    suggestedCategory: normalizeString(parsed.suggestedCategory),
    rawText: normalizeString(parsed.rawText) || rawTextFallback,
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
  };
}

function buildProductPayload(
  extracted: ExtractedProductData,
  source: PreparedSource,
  siteCode: string,
) {
  return {
    name: extracted.name,
    brand: extracted.brand || '',
    subtitle: extracted.subtitle || '',
    description: extracted.description || extracted.rawText || '',
    rich_description: extracted.richDescription || extracted.description || extracted.rawText || '',
    price: extracted.price,
    currency: extracted.currency || 'USD',
    has_price: extracted.hasPrice ?? true,
    min_order_quantity: extracted.minOrderQuantity,
    package_qty: extracted.packageQty,
    package_unit: extracted.packageUnit || '',
    lead_time: extracted.leadTime || '',
    unit: extracted.unit || '',
    sku_code: extracted.skuCode || '',
    focus_keyword: extracted.focusKeyword || '',
    specifications: extracted.specifications || {},
    faq: extracted.faq || [],
    image_url: source.coverImageUrl,
    cover_image_url: source.coverImageUrl,
    publish_language: extracted.sourceLanguage,
    status: 'draft',
    audit_status: 'draft',
    source_url: source.sourceUrl,
    siteCode,
  };
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('response' in auth) return auth.response;

  try {
    const formData = await request.formData();
    const siteCode = normalizeString(formData.get('siteCode')).toLowerCase() || 'cn';
    const source = await prepareSource(formData);
    const warnings = [...source.warnings];
    const canUseAIExtraction =
      isAIConfigured() && (source.kind === 'image' || normalizeString(source.extractedText).length > 0);
    let extracted = buildFallbackExtractedProduct(source);

    if (canUseAIExtraction) {
      try {
        extracted = source.kind === 'image'
          ? await extractFromImage(source.visionUrl || '')
          : await extractFromPdfText(source.extractedText || '');
      } catch (error) {
        warnings.push(
          error instanceof Error
            ? `AI 解析失败，已回退为基础草稿：${error.message}`
            : 'AI 解析失败，已回退为基础草稿。',
        );
      }
    }

    if (!isAIConfigured()) {
      warnings.push('AI 服务未配置，已按资料内容创建基础草稿，请在产品编辑页补全名称、描述、价格与规格。');
    } else if (source.kind === 'pdf' && !normalizeString(source.extractedText)) {
      warnings.push('PDF 文本提取不可用，已按文件名或 URL 创建基础草稿。');
    }

    const payload = buildProductPayload(extracted, source, siteCode);
    const authorization = request.headers.get('authorization');
    const createResponse = await fetch(`${request.nextUrl.origin}/api/v1/admin/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authorization ? { Authorization: authorization } : {}),
        cookie: request.headers.get('cookie') || '',
      },
      cache: 'no-store',
      body: JSON.stringify(payload),
    });

    const createJson = await createResponse.json().catch(() => ({}));
    if (!createResponse.ok) {
      throw new Error(
        typeof createJson?.error === 'string' ? createJson.error : '创建产品草稿失败',
      );
    }

    writeAuditLog(request, auth.admin, {
      module: 'product',
      action: 'document_import',
      targetType: 'product',
      targetId: createJson?.id ?? null,
      targetName: extracted.name,
      newValue: {
        siteCode,
        sourceKind: source.kind,
        extracted,
      },
      changesSummary: `通过资料导入创建产品草稿：${extracted.name}`,
    });

    return NextResponse.json({
      data: createJson,
      extracted,
      warnings,
      sourceKind: source.kind,
    });
  } catch (error) {
    console.error('Product document import failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '产品资料导入失败' },
      { status: 500 },
    );
  }
}
