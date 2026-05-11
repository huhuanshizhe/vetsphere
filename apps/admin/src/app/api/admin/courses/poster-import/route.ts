import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { requireAdmin } from '@/lib/auth-middleware';
import { isOSSConfigured, uploadBufferToOSS } from '@/lib/oss';
import { writeAuditLog } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type SupportedLanguage = 'zh' | 'en' | 'th' | 'ja';

interface ExtractedAgendaItem {
  time: string;
  activity: string;
}

interface ExtractedAgendaDay {
  day: string;
  date: string;
  items: ExtractedAgendaItem[];
}

interface ExtractedCourseData {
  sourceLanguage: SupportedLanguage;
  title: string;
  subtitle?: string;
  description?: string;
  targetAudience?: string;
  price?: number | null;
  currency?: string;
  format?: string;
  level?: string;
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
  agenda?: ExtractedAgendaDay[];
  rawText?: string;
  confidence?: number;
}

function normalizeBaseUrl(rawBaseUrl: string): string {
  if (!rawBaseUrl) return rawBaseUrl;
  if (rawBaseUrl.includes('/v1')) return rawBaseUrl;
  return rawBaseUrl.endsWith('/') ? `${rawBaseUrl}v1` : `${rawBaseUrl}/v1`;
}

function normalizeModelName(value: string | undefined | null): string | null {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || null;
}

function getVisionModelCandidates(): string[] {
  const configuredVisionModel = normalizeModelName(process.env.AI_VISION_MODEL);
  const fallbackModel = normalizeModelName(process.env.AI_MODEL);
  const fallbackVisionModel =
    fallbackModel && /(^|-)vl(-|$)/i.test(fallbackModel) ? fallbackModel : null;

  return [
    configuredVisionModel,
    configuredVisionModel?.replace(/-latest$/i, ''),
    fallbackVisionModel,
    fallbackVisionModel?.replace(/-latest$/i, ''),
    'qwen-vl-max',
    'qwen-vl-plus',
  ].filter((model, index, allModels): model is string => {
    return Boolean(model) && allModels.indexOf(model) === index;
  });
}

function isUnsupportedModelError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  return message.includes('model') && message.includes('not supported');
}

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

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/[,，/\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeLevel(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === 'basic' || normalized === 'beginner' || normalized === '初级') return 'Basic';
  if (normalized === 'intermediate' || normalized === '中级') return 'Intermediate';
  if (normalized === 'advanced' || normalized === '高级') return 'Advanced';
  if (normalized === 'master' || normalized === 'expert' || normalized === '大师') return 'Master';
  return value.trim();
}

function normalizeFormat(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return 'offline';
  const normalized = value.trim().toLowerCase();
  if (normalized.includes('online') || normalized.includes('直播')) return 'online';
  if (
    normalized.includes('hybrid') ||
    normalized.includes('mixed') ||
    normalized.includes('线上线下')
  )
    return 'hybrid';
  if (normalized.includes('video') || normalized.includes('录播')) return 'video';
  return 'offline';
}

function stripCodeFence(value: string): string {
  let text = value.trim();
  if (text.startsWith('```json')) text = text.slice(7);
  else if (text.startsWith('```')) text = text.slice(3);
  if (text.endsWith('```')) text = text.slice(0, -3);
  return text.trim();
}

function applySourceLanguageFields(
  payload: Record<string, any>,
  extracted: ExtractedCourseData,
): void {
  const suffixMap: Record<SupportedLanguage, string | null> = {
    zh: '_zh',
    en: '_en',
    th: '_th',
    ja: '_ja',
  };

  const suffix = suffixMap[extracted.sourceLanguage];
  if (!suffix) return;

  if (suffix && extracted.title) payload[`title${suffix}`] = extracted.title;
  if (suffix && extracted.description) payload[`description${suffix}`] = extracted.description;
  if (suffix === '_zh' && extracted.targetAudience) {
    payload.targetAudience_zh = extracted.targetAudience;
  }
}

interface PreparedPosterSource {
  visionUrl: string;
  coverImageUrl: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  warnings: string[];
}

async function preparePosterSource(formData: FormData): Promise<PreparedPosterSource> {
  const warnings: string[] = [];
  const imageFile = formData.get('file');
  const imageUrl = String(formData.get('imageUrl') || '').trim();
  const entityId = generateEntityId('course-poster');

  if (imageFile instanceof File && imageFile.size > 0) {
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = imageFile.type || 'image/jpeg';
    const dataUrl = `data:${contentType};base64,${buffer.toString('base64')}`;
    let coverImageUrl: string | null = null;

    if (isOSSConfigured()) {
      try {
        coverImageUrl = await uploadBufferToOSS(buffer, {
          entityId,
          contentType,
          prefix: 'vetsphere/courses',
        });
      } catch (error) {
        warnings.push(
          error instanceof Error ? `海报上传到 OSS 失败：${error.message}` : '海报上传到 OSS 失败',
        );
      }
    } else {
      warnings.push('OSS 未配置，课程封面未持久化，仅使用海报做解析。');
    }

    return {
      visionUrl: dataUrl,
      coverImageUrl,
      sourceName: imageFile.name,
      sourceUrl: null,
      warnings,
    };
  }

  if (!imageUrl) {
    throw new Error('请提供海报文件或图片 URL');
  }

  let coverImageUrl: string | null = imageUrl;

  if (isOSSConfigured()) {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`下载海报失败: ${response.status}`);
      }
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const buffer = Buffer.from(await response.arrayBuffer());
      coverImageUrl = await uploadBufferToOSS(buffer, {
        entityId,
        contentType,
        prefix: 'vetsphere/courses',
      });
    } catch (error) {
      warnings.push(
        error instanceof Error
          ? `海报抓取或上传失败，改用原图 URL：${error.message}`
          : '海报抓取或上传失败，改用原图 URL',
      );
      coverImageUrl = imageUrl;
    }
  }

  return {
    visionUrl: imageUrl,
    coverImageUrl,
    sourceName: null,
    sourceUrl: imageUrl,
    warnings,
  };
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

function buildFallbackExtractedCourse(source: PreparedPosterSource): ExtractedCourseData {
  const sourceLabel =
    humanizeSourceName(source.sourceName || '') ||
    humanizeSourceName(source.sourceUrl || '') ||
    humanizeSourceName(source.coverImageUrl || '');
  const title = sourceLabel || '海报导入课程草稿';
  const description = source.sourceUrl
    ? `基于海报链接创建的课程草稿，请补充课程简介、时间地点、讲师与价格信息。\n来源：${source.sourceUrl}`
    : '基于海报创建的课程草稿，请补充课程简介、时间地点、讲师与价格信息。';

  return {
    sourceLanguage: detectSupportedLanguage(`${title}\n${description}`),
    title,
    subtitle: '',
    description,
    targetAudience: '',
    price: null,
    currency: 'CNY',
    format: 'offline',
    level: undefined,
    startDate: null,
    endDate: null,
    teachingLanguages: [],
    specialties: [],
    instructorNames: [],
    location: {
      city: '',
      venue: '',
      address: '',
    },
    agenda: [],
    rawText: source.sourceUrl || '',
    confidence: 0,
  };
}

async function extractCourseDataFromPoster(visionUrl: string): Promise<ExtractedCourseData> {
  const apiKey = process.env.AI_API_KEY;
  const baseURL = normalizeBaseUrl(process.env.AI_BASE_URL || '');
  const modelCandidates = getVisionModelCandidates();

  if (!apiKey) {
    throw new Error('AI service not configured');
  }

  const openai = new OpenAI({ apiKey, baseURL: baseURL || undefined });
  const prompt = [
    'You are extracting structured course listing data from a course poster.',
    'Do not translate anything. Keep the source language exactly as it appears on the poster.',
    'Infer only what is visible. If a field is missing, return null, empty string, or empty array.',
    'Dates must use YYYY-MM-DD when the poster provides enough information, otherwise return null.',
    'Return JSON only with this shape:',
    '{',
    '  "sourceLanguage": "zh|en|th|ja",',
    '  "title": "",',
    '  "subtitle": "",',
    '  "description": "",',
    '  "targetAudience": "",',
    '  "price": null,',
    '  "currency": "CNY|USD|JPY|THB",',
    '  "format": "offline|online|hybrid|video",',
    '  "level": "Basic|Intermediate|Advanced|Master|free text",',
    '  "startDate": null,',
    '  "endDate": null,',
    '  "teachingLanguages": [],',
    '  "specialties": [],',
    '  "instructorNames": [],',
    '  "location": { "city": "", "venue": "", "address": "" },',
    '  "agenda": [{ "day": "", "date": "", "items": [{ "time": "", "activity": "" }] }],',
    '  "rawText": "",',
    '  "confidence": 0.0',
    '}',
  ].join('\n');

  let completion: Awaited<ReturnType<typeof openai.chat.completions.create>> | null = null;
  let lastError: unknown = null;

  for (const model of modelCandidates) {
    try {
      completion = await openai.chat.completions.create({
        model,
        temperature: 0.1,
        messages: [
          {
            role: 'system',
            content: 'Extract structured data from event posters. Return only valid JSON. /no_think',
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
      if (isUnsupportedModelError(error) && model !== modelCandidates[modelCandidates.length - 1]) {
        continue;
      }
      throw error;
    }
  }

  if (!completion) {
    throw (lastError instanceof Error ? lastError : new Error('AI 未返回海报解析结果'));
  }

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error('AI did not return extraction result');
  }

  const parsed = JSON.parse(stripCodeFence(content)) as Partial<ExtractedCourseData>;

  if (!parsed.title || !String(parsed.title).trim()) {
    throw new Error('AI 未能从海报中识别课程标题');
  }

  return {
    sourceLanguage: normalizeSupportedLanguage(parsed.sourceLanguage),
    title: String(parsed.title).trim(),
    subtitle: typeof parsed.subtitle === 'string' ? parsed.subtitle.trim() : '',
    description: typeof parsed.description === 'string' ? parsed.description.trim() : '',
    targetAudience: typeof parsed.targetAudience === 'string' ? parsed.targetAudience.trim() : '',
    price: typeof parsed.price === 'number' ? parsed.price : null,
    currency: typeof parsed.currency === 'string' ? parsed.currency.trim().toUpperCase() : 'CNY',
    format: normalizeFormat(parsed.format),
    level: normalizeLevel(parsed.level) ?? undefined,
    startDate:
      typeof parsed.startDate === 'string' && parsed.startDate.trim()
        ? parsed.startDate.trim()
        : null,
    endDate:
      typeof parsed.endDate === 'string' && parsed.endDate.trim() ? parsed.endDate.trim() : null,
    teachingLanguages: normalizeStringArray(parsed.teachingLanguages),
    specialties: normalizeStringArray(parsed.specialties),
    instructorNames: normalizeStringArray(parsed.instructorNames),
    location:
      parsed.location && typeof parsed.location === 'object'
        ? {
            city: typeof parsed.location.city === 'string' ? parsed.location.city.trim() : '',
            venue: typeof parsed.location.venue === 'string' ? parsed.location.venue.trim() : '',
            address:
              typeof parsed.location.address === 'string' ? parsed.location.address.trim() : '',
          }
        : { city: '', venue: '', address: '' },
    agenda: Array.isArray(parsed.agenda) ? parsed.agenda : [],
    rawText: typeof parsed.rawText === 'string' ? parsed.rawText.trim() : '',
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
  };
}

function buildCoursePayload(
  extracted: ExtractedCourseData,
  coverImageUrl: string | null,
  publishStatus: 'draft' | 'published',
  siteCode: string,
) {
  const payload: Record<string, any> = {
    title: extracted.title,
    subtitle: extracted.subtitle || null,
    description: extracted.description || extracted.rawText || '',
    specialty: extracted.specialties?.[0] || null,
    specialties: extracted.specialties || [],
    level: extracted.level,
    format: extracted.format || 'offline',
    price: extracted.price,
    currency: extracted.currency || 'CNY',
    startDate: extracted.startDate,
    endDate: extracted.endDate,
    coverImageUrl,
    imageUrl: coverImageUrl,
    location: {
      city: extracted.location?.city || '',
      venue: extracted.location?.venue || '',
      address: extracted.location?.address || '',
    },
    instructor: {
      name: extracted.instructorNames?.[0] || '',
      imageUrl: '',
      title: '',
      credentials: [],
      bio: '',
    },
    instructorNames: extracted.instructorNames || [],
    agenda: extracted.agenda || [],
    targetAudience: extracted.targetAudience || null,
    publishLanguage: extracted.sourceLanguage,
    teachingLanguages: extracted.teachingLanguages || [],
    translationsComplete: false,
    translatedAt: null,
    status: publishStatus,
    publishStatus,
    siteCode,
  };

  applySourceLanguageFields(payload, extracted);
  return payload;
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('response' in auth) return auth.response;

  try {
    const formData = await request.formData();
    const siteCode =
      String(formData.get('siteCode') || 'cn')
        .trim()
        .toLowerCase() || 'cn';
    const publishNow = String(formData.get('publishNow') || 'true').trim() !== 'false';
    const publishStatus = publishNow ? 'published' : 'draft';

    const source = await preparePosterSource(formData);
    const warnings = [...source.warnings];
    let extracted = buildFallbackExtractedCourse(source);
    let effectivePublishStatus: 'draft' | 'published' = publishStatus;

    try {
      extracted = await extractCourseDataFromPoster(source.visionUrl);
    } catch (error) {
      effectivePublishStatus = 'draft';
      warnings.push(
        error instanceof Error
          ? `AI 解析失败，已回退为课程草稿：${error.message}`
          : 'AI 解析失败，已回退为课程草稿。',
      );
    }

    const payload = buildCoursePayload(
      extracted,
      source.coverImageUrl,
      effectivePublishStatus,
      siteCode,
    );
    const authorization = request.headers.get('authorization');

    const createResponse = await fetch(`${request.nextUrl.origin}/api/v1/admin/courses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authorization ? { Authorization: authorization } : {}),
        cookie: request.headers.get('cookie') || '',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    const createJson = await createResponse.json().catch(() => ({}));
    if (!createResponse.ok) {
      const message = typeof createJson?.error === 'string' ? createJson.error : '课程创建失败';
      throw new Error(message);
    }

    writeAuditLog(request, auth.admin, {
      module: 'course',
      action: 'poster_import',
      targetType: 'course',
      targetId: createJson?.data?.id ?? null,
      targetName: extracted.title,
      newValue: {
        siteCode,
        publishStatus: effectivePublishStatus,
        extracted,
      },
      changesSummary: `通过海报导入课程并${effectivePublishStatus === 'published' ? '上架' : '保存草稿'}：${extracted.title}`,
    });

    return NextResponse.json({
      data: createJson?.data ?? null,
      siteView: createJson?.siteView ?? null,
      extracted,
      warnings,
    });
  } catch (error) {
    console.error('Poster import failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '海报导入失败' },
      { status: 500 },
    );
  }
}
