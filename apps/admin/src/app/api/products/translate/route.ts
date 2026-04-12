/**
 * 产品翻译 API
 * POST /api/products/translate
 *
 * 使用 DashScope (通义千问) 对产品内容进行多语言翻译
 * 支持逐语言分步翻译，提高稳定性
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// 允许较长执行时间（逐语言翻译，每种语言约 30-60 秒）
export const maxDuration = 300; // 5 分钟

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 支持的语言
type SupportedLanguage = 'en' | 'zh' | 'th' | 'ja';

// 语言名称映射
const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: 'English',
  zh: '中文',
  th: 'ภาษาไทย',
  ja: '日本語',
};

const ALL_LANGS: SupportedLanguage[] = ['en', 'zh', 'th', 'ja'];

/**
 * 获取 OpenAI 兼容客户端（使用环境变量配置）
 */
function getAIClient(apiKey: string) {
  const { fetch } = require('undici');
  const baseURL = process.env.AI_BASE_URL || 'https://coding.dashscope.aliyuncs.com/v1';

  return new OpenAI({
    apiKey,
    baseURL,
    fetch,
    timeout: 180000, // 3 分钟超时（网络到中国大陆服务器可能较慢）
    maxRetries: 3,   // 3 次重试（含指数退避），应对间歇性连接失败
  });
}

/**
 * 翻译单种语言
 */
async function translateToOneLang(
  content: Record<string, string>,
  targetLang: SupportedLanguage,
  sourceLang: SupportedLanguage,
  client: OpenAI
): Promise<Record<string, string>> {
  const sourceLanguageName = LANGUAGE_NAMES[sourceLang];
  const targetLanguageName = LANGUAGE_NAMES[targetLang];
  const model = process.env.AI_MODEL || 'qwen3-coder-plus';

  const contentEntries = Object.entries(content)
    .map(([key, value]) => `${key}: "${value.replace(/"/g, '\\"')}"`)
    .join('\n');

  const prompt = `Translate the following product content from ${sourceLanguageName} to ${targetLanguageName}.

RULES:
1. Return ONLY valid JSON
2. Translate ALL fields to ${targetLanguageName}
3. Keep product names, brand names, and technical terms transliterated or in original form when appropriate
4. For HTML content (rich_description), preserve HTML tags in the translation
5. Make translations natural and professional for e-commerce

SOURCE CONTENT (${sourceLanguageName}):
${contentEntries}

Return format (EXACT JSON, no extra text):
{ ${Object.keys(content).map(k => `"${k}": "translated value"`).join(', ')} }`;

  console.log(`[Product Translation] Translating to ${targetLanguageName} (${targetLang})...`);

  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: 'You are a professional e-commerce translator. Return only valid JSON. /no_think' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.3,
  });

  const resultText = completion.choices[0].message.content;
  if (!resultText) {
    throw new Error(`No translation result for ${targetLanguageName}`);
  }

  // 清理可能存在的 markdown 代码块和思考过程
  let cleanText = resultText;

  // 移除 <think>...</think> 块
  cleanText = cleanText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

  if (cleanText.startsWith('```json')) {
    cleanText = cleanText.slice(7);
  } else if (cleanText.startsWith('```')) {
    cleanText = cleanText.slice(3);
  }
  if (cleanText.endsWith('```')) {
    cleanText = cleanText.slice(0, -3);
  }

  const result = JSON.parse(cleanText.trim());
  console.log(`[Product Translation] ${targetLanguageName} done, fields:`, Object.keys(result).length);
  return result;
}

/**
 * 翻译规格参数 (JSONB)
 */
async function translateSpecifications(
  specs: Record<string, string>,
  targetLang: SupportedLanguage,
  sourceLang: SupportedLanguage,
  client: OpenAI
): Promise<Record<string, string>> {
  const sourceLanguageName = LANGUAGE_NAMES[sourceLang];
  const targetLanguageName = LANGUAGE_NAMES[targetLang];
  const model = process.env.AI_MODEL || 'qwen3-coder-plus';

  const prompt = `Translate these product specifications from ${sourceLanguageName} to ${targetLanguageName}.

RULES:
1. Return ONLY valid JSON object
2. Translate BOTH keys and values
3. Keep measurement units, numbers, and technical terms accurate
4. Keep brand names in original form

SOURCE SPECIFICATIONS:
${JSON.stringify(specs, null, 2)}

Return EXACT JSON object with translated keys and values, no extra text.`;

  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: 'You are a professional product specification translator. Return only valid JSON. /no_think' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.2,
  });

  const resultText = completion.choices[0].message.content;
  if (!resultText) throw new Error(`No specs translation for ${targetLanguageName}`);

  let cleanText = resultText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  if (cleanText.startsWith('```json')) cleanText = cleanText.slice(7);
  else if (cleanText.startsWith('```')) cleanText = cleanText.slice(3);
  if (cleanText.endsWith('```')) cleanText = cleanText.slice(0, -3);

  return JSON.parse(cleanText.trim());
}

/**
 * 翻译 FAQ (JSONB)
 */
async function translateFaq(
  faq: Array<{question: string; answer: string}>,
  targetLang: SupportedLanguage,
  sourceLang: SupportedLanguage,
  client: OpenAI
): Promise<Array<{question: string; answer: string}>> {
  const sourceLanguageName = LANGUAGE_NAMES[sourceLang];
  const targetLanguageName = LANGUAGE_NAMES[targetLang];
  const model = process.env.AI_MODEL || 'qwen3-coder-plus';

  const prompt = `Translate these product FAQ items from ${sourceLanguageName} to ${targetLanguageName}.

RULES:
1. Return ONLY valid JSON array
2. Translate both "question" and "answer" fields
3. Keep translations professional and natural for e-commerce
4. Preserve technical terms where appropriate

SOURCE FAQ:
${JSON.stringify(faq, null, 2)}

Return EXACT JSON array with structure [{"question": "...", "answer": "..."}, ...], no extra text.`;

  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: 'You are a professional FAQ translator. Return only valid JSON array. /no_think' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.3,
  });

  const resultText = completion.choices[0].message.content;
  if (!resultText) throw new Error(`No FAQ translation for ${targetLanguageName}`);

  let cleanText = resultText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  if (cleanText.startsWith('```json')) cleanText = cleanText.slice(7);
  else if (cleanText.startsWith('```')) cleanText = cleanText.slice(3);
  if (cleanText.endsWith('```')) cleanText = cleanText.slice(0, -3);

  return JSON.parse(cleanText.trim());
}

/**
 * 生成 slug
 */
function generateSlug(text: string, lang: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 100);
}

export async function POST(request: NextRequest) {
  try {
    const { productId } = await request.json();

    if (!productId) {
      return NextResponse.json(
        { error: '缺少产品ID' },
        { status: 400 }
      );
    }

    // 获取 API Key
    const apiKey = process.env.AI_API_KEY || process.env.DASHSCOPE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI API Key 未配置' },
        { status: 500 }
      );
    }

    // 获取产品数据
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (fetchError || !product) {
      return NextResponse.json(
        { error: '产品不存在' },
        { status: 404 }
      );
    }

    // 确定源语言和目标语言
    const sourceLang = (product.publish_language || 'zh') as SupportedLanguage;
    const targetLangs = ALL_LANGS.filter(l => l !== sourceLang);

    console.log('[Product Translation] Source:', sourceLang, 'Targets:', targetLangs);

    // 提取需要翻译的内容
    const translatableFields = [
      'name',
      'subtitle',
      'description',
      'rich_description',
      'brand',
      'packaging_info',
      'delivery_time',
      'warranty_info',
      'meta_title',
      'meta_description',
      'focus_keyword',
    ];

    const content: Record<string, string> = {};
    for (const field of translatableFields) {
      // 根据源语言读取正确的字段：中文→基础字段，其他→后缀字段
      const readKey = sourceLang === 'zh' ? field : `${field}_${sourceLang}`;
      const value = (product as Record<string, unknown>)[readKey];
      if (typeof value === 'string' && value.trim()) {
        content[field] = value;
      }
    }

    if (Object.keys(content).length === 0) {
      return NextResponse.json(
        { error: '没有可翻译的内容' },
        { status: 400 }
      );
    }

    console.log('[Product Translation] Fields to translate:', Object.keys(content));

    // 提取 specifications 和 faq（JSONB 字段）
    const specsReadKey = sourceLang === 'zh' ? 'specifications' : `specifications_${sourceLang}`;
    const sourceSpecs = (product as Record<string, unknown>)[specsReadKey];
    const hasSpecs = sourceSpecs && typeof sourceSpecs === 'object' && Object.keys(sourceSpecs).length > 0;

    const faqReadKey = sourceLang === 'zh' ? 'faq' : `faq_${sourceLang}`;
    const sourceFaq = (product as Record<string, unknown>)[faqReadKey];
    const hasFaq = Array.isArray(sourceFaq) && sourceFaq.length > 0;

    console.log('[Product Translation] Has specs:', hasSpecs, 'Has FAQ:', hasFaq);

    // 创建 AI 客户端
    const client = getAIClient(apiKey);

    // 逐语言分步翻译（更稳定，避免大请求超时）
    const updatePayload: Record<string, any> = {};
    const completedLangs: string[] = [];
    const failedLangs: string[] = [];

    for (const targetLang of targetLangs) {
      try {
        const translated = await translateToOneLang(content, targetLang, sourceLang, client);

        for (const [field, translatedValue] of Object.entries(translated)) {
          // 只写入已知的可翻译字段，忽略 AI 可能"发明"的字段名
          if (!translatableFields.includes(field)) continue;
          if (translatedValue && typeof translatedValue === 'string') {
            // 中文翻译写入基础字段（CN站使用），其他语言写入后缀字段
            if (targetLang === 'zh') {
              updatePayload[field] = translatedValue;
            } else {
              updatePayload[`${field}_${targetLang}`] = translatedValue;
            }

            // 为 name 字段生成 SEO 友好的 slug
            if (field === 'name' && translatedValue && targetLang !== 'zh') {
              const slugField = `slug_${targetLang}`;
              if (!updatePayload[slugField]) {
                updatePayload[slugField] = generateSlug(translatedValue, targetLang);
              }
            }
          }
        }

        // 翻译规格参数（JSONB）
        if (hasSpecs) {
          try {
            const translatedSpecs = await translateSpecifications(sourceSpecs as Record<string, string>, targetLang, sourceLang, client);
            const specsWriteKey = targetLang === 'zh' ? 'specifications' : `specifications_${targetLang}`;
            updatePayload[specsWriteKey] = translatedSpecs;
            console.log(`[Product Translation] Specs to ${LANGUAGE_NAMES[targetLang]} done`);
          } catch (specsError) {
            console.error(`[Product Translation] Specs translation failed for ${targetLang}:`, specsError instanceof Error ? specsError.message : specsError);
          }
        }

        // 翻译 FAQ（JSONB）
        if (hasFaq) {
          try {
            const translatedFaq = await translateFaq(sourceFaq as Array<{question: string; answer: string}>, targetLang, sourceLang, client);
            const faqWriteKey = targetLang === 'zh' ? 'faq' : `faq_${targetLang}`;
            updatePayload[faqWriteKey] = translatedFaq;
            console.log(`[Product Translation] FAQ to ${LANGUAGE_NAMES[targetLang]} done`);
          } catch (faqError) {
            console.error(`[Product Translation] FAQ translation failed for ${targetLang}:`, faqError instanceof Error ? faqError.message : faqError);
          }
        }

        completedLangs.push(targetLang);
        console.log(`[Product Translation] ${LANGUAGE_NAMES[targetLang]} completed (${completedLangs.length}/${targetLangs.length})`);
      } catch (langError) {
        console.error(`[Product Translation] Failed for ${LANGUAGE_NAMES[targetLang]}:`, langError instanceof Error ? langError.message : langError);
        failedLangs.push(targetLang);
      }
    }

    // 如果全部失败
    if (completedLangs.length === 0) {
      return NextResponse.json(
        { error: '所有语言翻译失败，请检查网络连接后重试' },
        { status: 500 }
      );
    }

    // 添加翻译完成标记和时间
    updatePayload.translated_at = new Date().toISOString();

    console.log('[Product Translation] Update payload keys:', Object.keys(updatePayload));

    // 更新产品
    const { error: updateError } = await supabase
      .from('products')
      .update(updatePayload)
      .eq('id', productId);

    if (updateError) {
      console.error('[Product Translation] Update failed:', updateError.message);
      return NextResponse.json(
        { error: '保存翻译失败: ' + updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: failedLangs.length > 0
        ? `部分翻译完成（${failedLangs.map(l => LANGUAGE_NAMES[l as SupportedLanguage]).join('、')}翻译失败）`
        : '翻译完成',
      sourceLang,
      targetLangs,
      completedLangs,
      failedLangs,
      translatedAt: updatePayload.translated_at,
    });

  } catch (error) {
    console.error('[Product Translation] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '翻译服务异常' },
      { status: 500 }
    );
  }
}
