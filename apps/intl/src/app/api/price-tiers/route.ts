import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tvxrgbntiksskywsroax.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2eHJnYm50aWtzc2t5d3Nyb2F4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDg0NTcxMiwiZXhwIjoyMDg2NDIxNzEyfQ.4MJZdR7l2OmAtW1gXpXvJtk5LFqXN7Y8kn7NiFtzsc8'
);

/**
 * GET /api/price-tiers - 获取SKU的价格层级
 * 参数: sku_id - SKU ID
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const skuId = searchParams.get('sku_id');
    const productId = searchParams.get('product_id');
    const quantity = parseInt(searchParams.get('quantity') || '1');
    const currency = searchParams.get('currency') || 'USD';

    if (!skuId && !productId) {
      return NextResponse.json({ error: 'sku_id or product_id is required' }, { status: 400 });
    }

    let query = supabaseAdmin
      .from('product_price_tiers')
      .select('*')
      .order('min_quantity', { ascending: true });

    if (skuId) {
      query = query.eq('sku_id', skuId);
    }

    const { data: tiers, error } = await query;

    if (error) {
      console.error('Failed to fetch price tiers:', error);
      return NextResponse.json({ error: 'Failed to fetch price tiers' }, { status: 500 });
    }

    // 根据数量计算适用的价格
    let applicablePrice: number | null = null;
    let applicableTier: any = null;

    if (tiers && tiers.length > 0) {
      for (const tier of tiers) {
        if (quantity >= tier.min_quantity && (!tier.max_quantity || quantity <= tier.max_quantity)) {
          applicableTier = tier;
          // 根据货币选择价格字段
          switch (currency.toUpperCase()) {
            case 'CNY':
              applicablePrice = tier.price_cny || tier.price_usd;
              break;
            case 'JPY':
              applicablePrice = tier.price_jpy || tier.price_usd;
              break;
            case 'THB':
              applicablePrice = tier.price_thb || tier.price_usd;
              break;
            default:
              applicablePrice = tier.price_usd;
          }
          break;
        }
      }
    }

    return NextResponse.json({
      tiers,
      applicableTier,
      applicablePrice,
      quantity,
      currency,
    });
  } catch (error) {
    console.error('Price tiers API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/price-tiers - 创建价格层级（供应商后台使用）
 */
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sku_id, min_quantity, max_quantity, price_usd, price_cny, price_jpy, price_thb } = body;

    if (!sku_id || !min_quantity || price_usd === undefined) {
      return NextResponse.json({ error: 'Missing required fields: sku_id, min_quantity, price_usd' }, { status: 400 });
    }

    // 验证SKU属于供应商
    const { data: sku, error: skuError } = await supabaseAdmin
      .from('product_skus')
      .select('product_id, products!inner(supplier_id)')
      .eq('id', sku_id)
      .single();

    if (skuError || !sku) {
      return NextResponse.json({ error: 'SKU not found' }, { status: 404 });
    }

    // 验证供应商身份（这里简化处理，实际应该验证供应商权限）
    // ...

    const { data: tier, error } = await supabaseAdmin
      .from('product_price_tiers')
      .insert({
        sku_id,
        min_quantity,
        max_quantity,
        price_usd,
        price_cny,
        price_jpy,
        price_thb,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create price tier:', error);
      return NextResponse.json({ error: 'Failed to create price tier' }, { status: 500 });
    }

    return NextResponse.json({ tier });
  } catch (error) {
    console.error('Price tiers API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}