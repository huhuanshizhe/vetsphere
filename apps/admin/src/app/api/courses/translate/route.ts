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

    // 生成多币种价格（仅保存已存在的列: price_cny）
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
      // 多币种价格（仅 price_cny 有对应 DB 列）
      price_cny: prices.price_cny,
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
    const { error: updateError } = await supabaseAdmin
      .from('courses')
      .update(fullUpdatePayload)
      .eq('id', courseId);

    // 如果失败（可能是列不存在），分步更新
    if (updateError) {
      console.warn('Full translation update failed, trying step-by-step:', updateError.message);
      
      // Step 1: 更新 JSONB 字段（这些列肯定存在）
      const jsonbPayload: Record<string, unknown> = {};
      if (updates.instructor) jsonbPayload.instructor = updates.instructor;
      if (updates.location) jsonbPayload.location = updates.location;
      if (updates.agenda) jsonbPayload.agenda = updates.agenda;
      if ((updates as any).services) jsonbPayload.services = (updates as any).services;

      if (Object.keys(jsonbPayload).length > 0) {
        const { error: jsonbError } = await supabaseAdmin
          .from('courses')
          .update(jsonbPayload)
          .eq('id', courseId);
        if (jsonbError) console.error('JSONB update failed:', jsonbError.message);
      }

      // Step 2: 尝试更新多语言文本列
      const textPayload: Record<string, unknown> = {};
      const textFields = [
        'title_en', 'title_zh', 'title_th', 'title_ja',
        'description_en', 'description_zh', 'description_th', 'description_ja',
      ];
      for (const f of textFields) {
        if (fullUpdatePayload[f] !== undefined) textPayload[f] = fullUpdatePayload[f];
      }
      if (fullUpdatePayload.translations_complete !== undefined) textPayload.translations_complete = fullUpdatePayload.translations_complete;
      if (fullUpdatePayload.translated_at !== undefined) textPayload.translated_at = fullUpdatePayload.translated_at;
      if (fullUpdatePayload.price_cny !== undefined) textPayload.price_cny = fullUpdatePayload.price_cny;

      if (Object.keys(textPayload).length > 0) {
        const { error: textError } = await supabaseAdmin
          .from('courses')
          .update(textPayload)
          .eq('id', courseId);
        if (textError) console.error('Text columns update failed:', textError.message);
      }
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
