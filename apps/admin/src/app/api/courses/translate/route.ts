/**
 * 课程翻译 API
 * POST /api/courses/translate
 * 
 * 使用 DashScope (通义千问) 对课程内容进行多语言翻译
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  translateCourse,
  extractTranslatableContent,
  PUBLISH_LANG_TO_CODE,
  generateAllPrices,
  type SupportedLanguage,
} from '@vetsphere/shared/services/translation';
import type { Course } from '@vetsphere/shared/types';

// 初始化 Supabase Admin Client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { courseId, preview } = await request.json();

    if (!courseId) {
      return NextResponse.json(
        { error: '缺少课程ID' },
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

    // 获取课程数据
    const { data: course, error: fetchError } = await supabaseAdmin
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (fetchError || !course) {
      return NextResponse.json(
        { error: '课程不存在' },
        { status: 404 }
      );
    }

    // 如果只是预览，返回待翻译内容
    if (preview) {
      // 数据库列名是 snake_case
      const publishLang = course.publish_language || 'zh';
      const sourceLang = PUBLISH_LANG_TO_CODE[publishLang] || 'zh';
      const content = extractTranslatableContent(course as Course, sourceLang);
      
      return NextResponse.json({
        success: true,
        preview: true,
        sourceLang,
        content,
      });
    }

    // 执行翻译
    const updates = await translateCourse(course as Course, apiKey);

    // 生成多币种价格
    const prices = generateAllPrices(course.price, course.currency || 'CNY');

    // 构建完整更新负载（包含所有语言后缀列）
    const fullUpdatePayload: Record<string, unknown> = {
      // 翻译后的标题 (源内容保留在 title 不变)
      title_en: (updates as Record<string, unknown>).title_en,
      title_zh: (updates as Record<string, unknown>).title_zh,
      title_th: (updates as Record<string, unknown>).title_th,
      title_ja: (updates as Record<string, unknown>).title_ja,
      // 翻译后的描述 (源内容保留在 description 不变)
      description_en: (updates as Record<string, unknown>).description_en,
      description_zh: (updates as Record<string, unknown>).description_zh,
      description_th: (updates as Record<string, unknown>).description_th,
      description_ja: (updates as Record<string, unknown>).description_ja,
      // 多币种价格
      price_cny: prices.price_cny,
      price_usd: prices.price_usd,
      price_jpy: prices.price_jpy,
      price_thb: prices.price_thb,
      // 讲师信息 (JSONB 包含所有语言版本)
      instructor: updates.instructor,
      // 地点信息 (JSONB 包含所有语言版本)
      location: updates.location,
      // 日程 (JSONB 包含所有语言版本)
      agenda: updates.agenda,
      // 行程服务 (JSONB 包含所有语言版本)
      services: (updates as any).services,
      // 翻译状态
      translations_complete: updates.translationsComplete,
      translated_at: updates.translatedAt,
    };

    // 清理 undefined 值（跳过源语言的翻译列）
    for (const key of Object.keys(fullUpdatePayload)) {
      if (fullUpdatePayload[key] === undefined) {
        delete fullUpdatePayload[key];
      }
    }

    // 尝试完整更新
    let { error: updateError } = await supabaseAdmin
      .from('courses')
      .update(fullUpdatePayload)
      .eq('id', courseId);

    // 如果失败（可能是列不存在），回退到只更新 JSONB 字段
    if (updateError && updateError.code === 'PGRST204') {
      console.log('Full update failed, falling back to JSONB-only update');
      
      // 将翻译内容嵌入到 JSONB 字段中
      const instructorWithTranslations = {
        ...updates.instructor,
        _translations: {
          title_en: (updates as Record<string, unknown>).title_en,
          title_zh: (updates as Record<string, unknown>).title_zh,
          title_th: (updates as Record<string, unknown>).title_th,
          title_ja: (updates as Record<string, unknown>).title_ja,
          description_en: (updates as Record<string, unknown>).description_en,
          description_zh: (updates as Record<string, unknown>).description_zh,
          description_th: (updates as Record<string, unknown>).description_th,
          description_ja: (updates as Record<string, unknown>).description_ja,
        },
      };

      const fallbackResult = await supabaseAdmin
        .from('courses')
        .update({
          instructor: instructorWithTranslations,
          location: updates.location,
          agenda: updates.agenda,
        })
        .eq('id', courseId);
      
      updateError = fallbackResult.error;
    }

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json(
        { error: '保存翻译失败: ' + updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '翻译完成',
      translatedAt: updates.translatedAt,
    });

  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '翻译服务异常' },
      { status: 500 }
    );
  }
}
