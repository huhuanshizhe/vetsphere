/**
 * 商品列表 API
 * GET /api/products - 获取商品列表（支持筛选、分页）
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
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // 分页参数
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('page_size') || '20');
    
    // 筛选参数
    const sceneCode = searchParams.get('scene');         // 场景分类
    const productType = searchParams.get('type');        // equipment, consumable, instrument...
    const brand = searchParams.get('brand');             // 品牌
    const priceMin = searchParams.get('price_min');      // 最低价
    const priceMax = searchParams.get('price_max');      // 最高价
    const isFeatured = searchParams.get('is_featured');  // true/false
    const keyword = searchParams.get('keyword');         // 关键词搜索
    
    // 排序参数
    const sortBy = searchParams.get('sort_by') || 'created_at'; // created_at, view_count, price_min
    const sortOrder = searchParams.get('sort_order') || 'desc';

    // 构建查询
    let query = supabase
      .from('products')
      .select(`
        id,
        slug,
        name,
        subtitle,
        product_type,
        scene_code,
        brand,
        model,
        price_min,
        price_max,
        cover_image_url,
        is_featured,
        view_count,
        status,
        published_at,
        created_at,
        tags
      `, { count: 'exact' })
      .eq('status', 'published')
      .is('deleted_at', null);

    // 应用筛选
    if (sceneCode) {
      query = query.eq('scene_code', sceneCode);
    }
    if (productType) {
      query = query.eq('product_type', productType);
    }
    if (brand) {
      query = query.ilike('brand', `%${brand}%`);
    }
    if (priceMin) {
      query = query.gte('price_min', parseFloat(priceMin));
    }
    if (priceMax) {
      query = query.lte('price_max', parseFloat(priceMax));
    }
    if (isFeatured === 'true') {
      query = query.eq('is_featured', true);
    }
    if (keyword) {
      query = query.or(`name.ilike.%${keyword}%,subtitle.ilike.%${keyword}%,brand.ilike.%${keyword}%`);
    }

    // 应用排序
    const ascending = sortOrder === 'asc';
    query = query.order(sortBy, { ascending });

    // 应用分页
    const from = (page - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);

    const { data: products, count, error } = await query;

    if (error) {
      console.error('查询商品列表失败:', error);
      return apiResponse(500, '查询失败');
    }

    return apiResponse(200, '查询成功', {
      items: products || [],
      pagination: {
        page,
        page_size: pageSize,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / pageSize),
      },
    });

  } catch (error) {
    console.error('商品列表API错误:', error);
    return apiResponse(500, '服务器内部错误');
  }
}
