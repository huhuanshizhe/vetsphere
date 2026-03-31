import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@vetsphere/shared/lib/supabase-admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/exchange-rates
 * 获取所有汇率（以 USD 为基准）
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('exchange_rates')
      .select('target_currency, rate, updated_at')
      .order('target_currency');

    if (error) throw error;

    // 转换为 Map 格式便于使用
    const rates: Record<string, { rate: number; updatedAt: string }> = {};
    data?.forEach(r => {
      rates[r.target_currency] = {
        rate: parseFloat(r.rate),
        updatedAt: r.updated_at,
      };
    });

    return NextResponse.json({
      base: 'USD',
      rates,
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600', // 缓存1小时
      }
    });
  } catch (error) {
    console.error('Failed to fetch exchange rates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exchange rates' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/exchange-rates
 * 从外部 API 更新汇率
 */
export async function POST(request: Request) {
  try {
    const supabase = getSupabaseAdmin();

    // 从 exchangerate-api 获取最新汇率
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    if (!response.ok) {
      throw new Error('Failed to fetch from exchange rate API');
    }

    const data = await response.json();
    const rates = data.rates;

    // 更新数据库中的汇率
    const updates = Object.entries(rates).map(([currency, rate]) => ({
      target_currency: currency,
      rate: rate as number,
      updated_at: new Date().toISOString(),
    }));

    // 使用 upsert 更新
    const { error } = await supabase
      .from('exchange_rates')
      .upsert(updates, {
        onConflict: 'target_currency',
        ignoreDuplicates: false,
      });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      updated: updates.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to update exchange rates:', error);
    return NextResponse.json(
      { error: 'Failed to update exchange rates' },
      { status: 500 }
    );
  }
}
