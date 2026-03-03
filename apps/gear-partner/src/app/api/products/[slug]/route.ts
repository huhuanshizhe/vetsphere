/**
 * 商品详情 API
 * GET /api/products/[slug] - 获取商品详情
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
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return apiResponse(400, '缺少商品标识');
    }

    // 查询商品详情
    const { data: product, error } = await supabase
      .from('products')
      .select(`
        *,
        product_images (
          id,
          image_url,
          image_type,
          alt_text,
          display_order
        ),
        product_tag_relations (
          product_tags (
            id,
            name,
            color
          )
        )
      `)
      .or(`slug.eq.${slug},id.eq.${slug}`)
      .eq('status', 'published')
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return apiResponse(404, '商品不存在');
      }
      console.error('查询商品详情失败:', error);
      return apiResponse(500, '查询失败');
    }

    // 增加浏览量
    await supabase
      .from('products')
      .update({ view_count: (product.view_count || 0) + 1 })
      .eq('id', product.id)
      .catch(() => {});

    // 处理图片排序
    const images = (product.product_images || []).sort(
      (a: any, b: any) => a.display_order - b.display_order
    );

    // 处理标签
    const tags = (product.product_tag_relations || [])
      .map((r: any) => r.product_tags)
      .filter(Boolean);

    // 查询相关商品
    const { data: relatedProducts } = await supabase
      .from('products')
      .select('id, slug, name, cover_image_url, price_min, price_max')
      .eq('scene_code', product.scene_code)
      .neq('id', product.id)
      .eq('status', 'published')
      .is('deleted_at', null)
      .limit(4);

    return apiResponse(200, '查询成功', {
      ...product,
      product_images: images,
      product_tag_relations: undefined,
      tags,
      related_products: relatedProducts || [],
    });

  } catch (error) {
    console.error('商品详情API错误:', error);
    return apiResponse(500, '服务器内部错误');
  }
}
