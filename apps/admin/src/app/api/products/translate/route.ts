/**
 * 产品翻译 API
 * POST /api/products/translate
 *
 * 使用 DashScope (通义千问) 对产品内容进行多语言翻译
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 支持的语言
type SupportedLanguage = 'en' | 'th' | 'ja';

// 语言名称映射
const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: 'English',
  th: 'ภาษาไทย',
  ja: '日本語',
};

/**
 * 调用 DashScope API 进行翻译
 */
async function translateWithDashScope(
  content: Record<string, string>,
  targetLangs: SupportedLanguage[],
  apiKey: string
): Promise<Record<SupportedLanguage, Record<string, string>>> {
  const targetLanguageNames = targetLangs.map(l => LANGUAGE_NAMES[l]).join(', ');

  const contentEntries = Object.entries(content)
    .map(([key, value]) => `${key}: "${value.replace(/"/g, '\\"')}"`)
    .join('\n');

  const prompt = `Translate the following product content to these languages: ${targetLanguageNames}.

RULES:
1. Return ONLY valid JSON
2. Each language key contains the same structure with translated values
3. Keep product names, brand names, and technical terms transliterated or in original form when appropriate
4. For HTML content (rich_description), preserve HTML tags in the translation
5. Make translations natural and professional for e-commerce

SOURCE CONTENT:
${contentEntries}

Return format (EXACT structure required):
{
  "en": { ${Object.keys(content).map(k => `"${k}": "..."`).join(', ')} },
  "th": { ${Object.keys(content).map(k => `"${k}": "..."`).join(', ')} },
  "ja": { ${Object.keys(content).map(k => `"${k}": "..."`).join(', ')} }
}`;

  // 使用 OpenAI SDK + undici，避免 Turbopack fetch 问题
  const { fetch } = require('undici');

  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: 'https://coding.dashscope.aliyuncs.com/v1',
    fetch: fetch,
  });

  console.log('[Product Translation] Using OpenAI SDK with undici fetch');

  try {
    const completion = await client.chat.completions.create({
      model: 'qwen3.5-plus',
      messages: [
        { role: 'system', content: 'You are a professional e-commerce translator. Return only valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
    });

    const resultText = completion.choices[0].message.content;

    if (!resultText) {
      throw new Error('No translation result from DashScope');
    }

    // 清理可能存在的 markdown 代码块
    let cleanText = resultText;
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.slice(7);
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.slice(3);
    }
    if (cleanText.endsWith('```')) {
      cleanText = cleanText.slice(0, -3);
    }

    const result = JSON.parse(cleanText.trim());
    console.log('[Product Translation] Success, languages:', Object.keys(result));
    return result as Record<SupportedLanguage, Record<string, string>>;
  } catch (error) {
    console.error('[Product Translation] Error:', error);
    throw new Error(`DashScope API call failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
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

    // 获取 DashScope API Key
    const apiKey = process.env.DASHSCOPE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'DashScope API Key 未配置' },
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
    ];

    const content: Record<string, string> = {};
    for (const field of translatableFields) {
      const value = (product as Record<string, unknown>)[field];
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

    console.log('[Product Translation] Translating fields:', Object.keys(content));

    // 执行翻译
    const translations = await translateWithDashScope(content, ['en', 'th', 'ja'], apiKey);

    // 构建更新负载
    const updatePayload: Record<string, string> = {};

    for (const [lang, translatedContent] of Object.entries(translations)) {
      for (const [field, translatedValue] of Object.entries(translatedContent)) {
        if (translatedValue && typeof translatedValue === 'string') {
          updatePayload[`${field}_${lang}`] = translatedValue;

          // 为 slug 字段生成 SEO 友好的 URL 别名
          if (field === 'name' || field === 'subtitle') {
            const slugField = field === 'name' ? 'slug' : `slug_${lang}`;
            if (!updatePayload[slugField] && translatedValue) {
              updatePayload[slugField] = generateSlug(translatedValue, lang);
            }
          }
        }
      }
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
      message: '翻译完成',
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
