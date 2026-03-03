/**
 * 场景分类 API
 * GET /api/scenes - 获取商品场景分类列表
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
    const parentCode = searchParams.get('parent'); // 获取子分类
    const withCount = searchParams.get('with_count') === 'true'; // 是否返回商品数量

    // 查询场景分类
    let query = supabase
      .from('scene_categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (parentCode) {
      query = query.eq('parent_code', parentCode);
    } else {
      query = query.is('parent_code', null); // 只查询一级分类
    }

    const { data: scenes, error } = await query;

    if (error) {
      console.error('查询场景分类失败:', error);
      return apiResponse(500, '查询失败');
    }

    // 如果需要商品数量
    let scenesWithCount = scenes || [];
    if (withCount && scenes) {
      scenesWithCount = await Promise.all(
        scenes.map(async (scene) => {
          const { count } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('scene_code', scene.code)
            .eq('status', 'published')
            .is('deleted_at', null);
          
          return {
            ...scene,
            product_count: count || 0,
          };
        })
      );
    }

    return apiResponse(200, '查询成功', {
      scenes: scenesWithCount,
      total: scenesWithCount.length,
    });

  } catch (error) {
    console.error('场景分类API错误:', error);
    return apiResponse(500, '服务器内部错误');
  }
}
