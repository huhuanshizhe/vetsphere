/**
 * CMS 页面内容 API
 * GET /api/cms/pages/[key] - 获取CMS页面内容
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 统一响应格式
function apiResponse<T>(code: number, message: string, data?: T) {
  return NextResponse.json({
    code,
    message,
    data,
    timestamp: new Date().toISOString(),
  }, { status: code >= 200 && code < 300 ? 200 : code });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;

    if (!key) {
      return apiResponse(400, '缺少页面标识');
    }

    // 查询CMS页面
    const { data: page, error } = await supabase
      .from('cms_pages')
      .select(`
        id,
        page_key,
        name,
        title,
        subtitle,
        description,
        seo_title,
        seo_description,
        seo_keywords,
        status,
        version,
        published_at,
        cms_sections (
          id,
          section_key,
          section_type,
          title,
          subtitle,
          description,
          content,
          cta_text,
          cta_link,
          cta_style,
          is_active,
          display_order,
          style_config,
          cms_items (
            id,
            item_key,
            item_type,
            title,
            subtitle,
            description,
            content,
            image_url,
            icon,
            link_url,
            link_text,
            link_target,
            is_active,
            display_order
          )
        )
      `)
      .eq('page_key', key)
      .eq('status', 'published')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return apiResponse(404, '页面不存在或未发布');
      }
      console.error('查询CMS页面失败:', error);
      return apiResponse(500, '查询失败');
    }

    // 处理sections排序和过滤
    const sections = (page.cms_sections || [])
      .filter((s: any) => s.is_active)
      .sort((a: any, b: any) => a.display_order - b.display_order)
      .map((section: any) => ({
        ...section,
        cms_items: (section.cms_items || [])
          .filter((item: any) => item.is_active)
          .sort((a: any, b: any) => a.display_order - b.display_order),
      }));

    return apiResponse(200, '查询成功', {
      page: {
        ...page,
        cms_sections: sections,
      },
    });

  } catch (error) {
    console.error('CMS页面API错误:', error);
    return apiResponse(500, '服务器内部错误');
  }
}
