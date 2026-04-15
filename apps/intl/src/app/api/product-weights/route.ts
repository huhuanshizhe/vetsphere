import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@vetsphere/shared/lib/supabase-admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/product-weights?ids=id1,id2,id3
 * 轻量级端点：根据产品ID批量返回重量数据
 * 用于结账页面刷新购物车中缺失的重量信息
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids');

    if (!idsParam) {
      return NextResponse.json({ weights: {} });
    }

    const ids = idsParam.split(',').filter(Boolean).slice(0, 50); // 最多50个
    if (ids.length === 0) {
      return NextResponse.json({ weights: {} });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('products')
      .select('id, weight, weight_unit')
      .in('id', ids);

    if (error) throw error;

    const weights: Record<string, { weight: number | null; weight_unit: string | null }> = {};
    (data || []).forEach((p: any) => {
      weights[p.id] = { weight: p.weight, weight_unit: p.weight_unit };
    });

    return NextResponse.json({ weights }, {
      headers: { 'Cache-Control': 'public, max-age=300' },
    });
  } catch (error) {
    console.error('Failed to fetch product weights:', error);
    return NextResponse.json({ weights: {} });
  }
}
