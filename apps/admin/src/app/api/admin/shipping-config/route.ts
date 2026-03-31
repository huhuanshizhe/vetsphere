import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * GET /api/admin/shipping-config
 * 获取完整的运费配置：zones + methods + rates 全部关联
 */
export async function GET() {
  try {
    // 获取所有区域
    const { data: zones, error: zonesError } = await supabase
      .from('shipping_zones')
      .select('*')
      .order('display_order');

    if (zonesError) throw zonesError;

    // 获取所有运输方式
    const { data: methods, error: methodsError } = await supabase
      .from('shipping_methods')
      .select('*')
      .order('display_order');

    if (methodsError) throw methodsError;

    // 获取所有费率（关联 zone 和 method）
    const { data: rates, error: ratesError } = await supabase
      .from('shipping_rates')
      .select(`
        *,
        zone:shipping_zones!zone_id(id, zone_code, zone_name),
        method:shipping_methods!method_id(id, method_code, method_name, method_description)
      `)
      .order('display_order');

    if (ratesError) throw ratesError;

    // 构建完整的配置结构
    const config = {
      zones: zones || [],
      methods: methods || [],
      rates: rates || []
    };

    return NextResponse.json(config);
  } catch (error) {
    console.error('Failed to fetch shipping config:', error);
    return NextResponse.json({ error: 'Failed to fetch shipping config' }, { status: 500 });
  }
}

/**
 * POST /api/admin/shipping-config
 * 创建新的配送区域或运输方式
 * Body: { type: 'zone' | 'method', data: {...} }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, data } = body;

    if (type === 'zone') {
      // 创建配送区域
      const { data: zone, error } = await supabase
        .from('shipping_zones')
        .insert({
          zone_code: data.zone_code,
          zone_name: data.zone_name || { en: '', th: '', ja: '', zh: '' },
          region: data.region || 'other',
          countries: data.countries || [],
          billing_type: data.billing_type || 'flat',
          base_fee: data.base_fee || 0,
          currency: data.currency || 'USD',
          per_unit_fee: data.per_unit_fee || 0,
          weight_unit: data.weight_unit || 'kg',
          free_shipping_threshold: data.free_shipping_threshold || null,
          estimated_days_min: data.estimated_days_min || null,
          estimated_days_max: data.estimated_days_max || null,
          is_active: true,
          display_order: data.display_order || 0,
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, type: 'zone', data: zone });
    }

    if (type === 'method') {
      // 创建运输方式
      const { data: method, error } = await supabase
        .from('shipping_methods')
        .insert({
          method_code: data.method_code,
          method_name: data.method_name || { en: '', th: '', ja: '' },
          method_description: data.method_description || { en: '', th: '', ja: '' },
          estimated_days_min: data.estimated_days_min || null,
          estimated_days_max: data.estimated_days_max || null,
          is_active: true,
          display_order: data.display_order || 0,
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, type: 'method', data: method });
    }

    if (type === 'rate') {
      // 创建运费费率
      const { data: rate, error } = await supabase
        .from('shipping_rates')
        .insert({
          zone_id: data.zone_id,
          method_id: data.method_id,
          price: data.price || 0,
          billing_type: data.billing_type || 'flat',
          base_fee: data.base_fee || 0,
          per_unit_fee: data.per_unit_fee || 0,
          weight_unit: data.weight_unit || 'kg',
          free_shipping_threshold: data.free_shipping_threshold || null,
          estimated_days_min: data.estimated_days_min || null,
          estimated_days_max: data.estimated_days_max || null,
          is_active: true,
          display_order: data.display_order || 0,
        })
        .select(`
          *,
          zone:shipping_zones!zone_id(id, zone_code, zone_name),
          method:shipping_methods!method_id(id, method_code, method_name, method_description)
        `)
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, type: 'rate', data: rate });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('Failed to create shipping config:', error);
    return NextResponse.json({ error: 'Failed to create shipping config', details: error }, { status: 500 });
  }
}

/**
 * PUT /api/admin/shipping-config
 * 更新配送区域、运输方式或费率
 * Body: { type: 'zone' | 'method' | 'rate', id, data: {...} }
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { type, id, data } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    if (type === 'zone') {
      const { data: zone, error } = await supabase
        .from('shipping_zones')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, type: 'zone', data: zone });
    }

    if (type === 'method') {
      const { data: method, error } = await supabase
        .from('shipping_methods')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, type: 'method', data: method });
    }

    if (type === 'rate') {
      const { data: rate, error } = await supabase
        .from('shipping_rates')
        .update(data)
        .eq('id', id)
        .select(`
          *,
          zone:shipping_zones!zone_id(id, zone_code, zone_name),
          method:shipping_methods!method_id(id, method_code, method_name, method_description)
        `)
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, type: 'rate', data: rate });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('Failed to update shipping config:', error);
    return NextResponse.json({ error: 'Failed to update shipping config', details: error }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/shipping-config
 * 删除配送区域、运输方式或费率
 * Query: ?type=zone|method|rate&id=xxx
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (!id || !type) {
      return NextResponse.json({ error: 'Type and ID are required' }, { status: 400 });
    }

    let table = '';
    if (type === 'zone') table = 'shipping_zones';
    else if (type === 'method') table = 'shipping_methods';
    else if (type === 'rate') table = 'shipping_rates';
    else return NextResponse.json({ error: 'Invalid type' }, { status: 400 });

    // 如果删除区域，同时删除相关的费率
    if (type === 'zone') {
      await supabase.from('shipping_rates').delete().eq('zone_id', id);
    }

    // 如果删除运输方式，同时删除相关的费率
    if (type === 'method') {
      await supabase.from('shipping_rates').delete().eq('method_id', id);
    }

    const { error } = await supabase.from(table).delete().eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, type });
  } catch (error) {
    console.error('Failed to delete shipping config:', error);
    return NextResponse.json({ error: 'Failed to delete shipping config' }, { status: 500 });
  }
}
