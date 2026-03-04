/**
 * 首页数据 API
 * GET /api/home - 获取首页聚合数据
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
    const siteCode = searchParams.get('site_code') || 'cn';

    // 并行加载所有首页数据
    const [
      featuredCoursesResult,
      featuredProductsResult,
      growthTracksResult,
      scenesResult,
      statsResult,
    ] = await Promise.all([
      // 推荐课程
      supabase
        .from('courses')
        .select('id, slug, title, subtitle, cover_image_url, price_cny, is_free, format, level, enrollment_count, avg_rating')
        .eq('status', 'published')
        .eq('is_featured', true)
        .eq('site_code', siteCode)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(8),
      
      // 推荐商品
      supabase
        .from('products')
        .select('id, slug, name, subtitle, cover_image_url, price_min, price_max, brand')
        .eq('status', 'published')
        .eq('is_featured', true)
        .eq('site_code', siteCode)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(6),
      
      // 成长方向（已就绪的）
      supabase
        .from('growth_tracks')
        .select('id, slug, name, tagline, icon, color, course_count')
        .eq('is_active', true)
        .eq('is_ready', true)
        .eq('site_code', siteCode)
        .order('group_order')
        .order('display_order')
        .limit(7),
      
      // 场景分类
      supabase
        .from('scene_categories')
        .select('id, code, name, description, icon, color')
        .eq('is_active', true)
        .is('parent_code', null)
        .order('display_order')
        .limit(6),
      
      // 统计数据
      Promise.all([
        supabase.from('courses').select('*', { count: 'exact', head: true }).eq('status', 'published').eq('site_code', siteCode).is('deleted_at', null),
        supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'published').eq('site_code', siteCode).is('deleted_at', null),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_doctor', true),
      ]),
    ]);

    // 处理统计数据
    const [coursesCount, productsCount, doctorsCount] = statsResult;

    return apiResponse(200, '查询成功', {
      featured_courses: featuredCoursesResult.data || [],
      featured_products: featuredProductsResult.data || [],
      growth_tracks: growthTracksResult.data || [],
      scenes: scenesResult.data || [],
      stats: {
        courses_count: coursesCount.count || 0,
        products_count: productsCount.count || 0,
        doctors_count: doctorsCount.count || 0,
      },
    });

  } catch (error) {
    console.error('首页数据API错误:', error);
    return apiResponse(500, '服务器内部错误');
  }
}
