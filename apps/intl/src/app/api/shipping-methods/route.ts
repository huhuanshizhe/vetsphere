import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@vetsphere/shared/lib/supabase-admin';

export const dynamic = 'force-dynamic';

/**
 * 国家代码到货币的映射
 */
const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  // 亚洲
  JP: 'JPY', TH: 'THB', CN: 'CNY', HK: 'HKD', TW: 'TWD',
  SG: 'SGD', MY: 'MYR', ID: 'IDR', PH: 'PHP', VN: 'VND',
  KR: 'KRW', IN: 'INR',
  // 北美
  US: 'USD', CA: 'CAD', MX: 'MXN',
  // 南美
  BR: 'BRL', AR: 'ARS', CL: 'CLP', CO: 'COP', PE: 'PEN',
  // 欧洲
  GB: 'GBP', DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR',
  NL: 'EUR', BE: 'EUR', AT: 'EUR', CH: 'CHF', PL: 'PLN',
  SE: 'SEK', DK: 'DKK', NO: 'NOK', FI: 'EUR', IE: 'EUR',
  PT: 'EUR', CZ: 'CZK', HU: 'HUF', RO: 'RON', BG: 'BGN',
  HR: 'EUR', SK: 'EUR', SI: 'EUR', LT: 'EUR', LV: 'EUR',
  EE: 'EUR', GR: 'EUR', LU: 'EUR', RU: 'RUB',
  // 大洋洲
  AU: 'AUD', NZ: 'NZD',
  // 中东
  AE: 'AED', SA: 'SAR', IL: 'ILS', TR: 'TRY',
  // 非洲
  ZA: 'ZAR', EG: 'EGP', NG: 'NGN', KE: 'KES',
};

/**
 * 获取国家对应的货币代码
 */
function getCountryCurrency(countryCode: string): string {
  return COUNTRY_CURRENCY_MAP[countryCode.toUpperCase()] || 'USD';
}

/**
 * 格式化价格显示
 */
function formatPriceFormula(baseFee: number, perUnitFee: number, weight: number, currency: string, currencySymbol: string): string {
  const base = `${currencySymbol}${baseFee.toFixed(2)}`;
  if (perUnitFee === 0) {
    return `${base} flat rate`;
  }
  const calculated = baseFee + perUnitFee * weight;
  return `${base} + ${currencySymbol}${perUnitFee.toFixed(2)} × ${weight.toFixed(2)}kg = ${currencySymbol}${calculated.toFixed(2)}`;
}

/**
 * GET /api/shipping-methods
 * Returns shipping methods with rates for a specific country
 * Includes multi-currency pricing based on destination country
 *
 * Query params:
 * - country: ISO 3166-1 alpha-2 country code (e.g., US, TH, JP)
 * - weight: Order weight in kg (for weight-based pricing)
 */
export async function GET(request: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country')?.toUpperCase();
    const weight = parseFloat(searchParams.get('weight') || '0');

    // 获取目标货币
    const targetCurrency = country ? getCountryCurrency(country) : 'USD';

    // 获取汇率
    const { data: ratesData, error: ratesError } = await supabase
      .from('exchange_rates')
      .select('target_currency, rate')
      .in('target_currency', [targetCurrency, 'USD']);

    if (ratesError) throw ratesError;

    // 转换为 Map
    const exchangeRates: Record<string, number> = {};
    ratesData?.forEach(r => {
      exchangeRates[r.target_currency] = parseFloat(r.rate);
    });

    // 获取 USD 汇率（基准）
    const usdRate = exchangeRates['USD'] || 1;
    // 获取目标货币汇率
    const targetRate = exchangeRates[targetCurrency] || 1;
    // 换算系数：从 USD 到目标货币
    const conversionRate = targetRate / usdRate;

    // 如果没有国家，返回基本信息
    if (!country) {
      const { data, error } = await supabase
        .from('shipping_methods')
        .select('id, method_code, method_name, method_description, estimated_days_min, estimated_days_max, display_order')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;

      return NextResponse.json({
        currency: 'USD',
        currencySymbol: '$',
        zone: null,
        methods: data || [],
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=300',
        }
      });
    }

    // 查找匹配的配送区域
    const { data: zones, error: zoneError } = await supabase
      .from('shipping_zones')
      .select('id, zone_code, zone_name, countries')
      .eq('is_active', true);

    if (zoneError) throw zoneError;

    const matchingZone = zones?.find(z =>
      z.countries?.includes(country)
    );

    if (!matchingZone) {
      const { data: methods, error: methodError } = await supabase
        .from('shipping_methods')
        .select('id, method_code, method_name, method_description, estimated_days_min, estimated_days_max, display_order')
        .eq('is_active', true)
        .order('display_order');

      if (methodError) throw methodError;

      return NextResponse.json({
        currency: targetCurrency,
        currencySymbol: getCurrencySymbol(targetCurrency),
        zone: null,
        methods: methods || [],
        warning: `No shipping zone configured for country: ${country}`,
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=300',
        }
      });
    }

    // 获取该区域的运费配置
    const { data: rates, error: ratesError2 } = await supabase
      .from('shipping_rates')
      .select(`
        *,
        method:shipping_methods!method_id (
          id,
          method_code,
          method_name,
          method_description,
          estimated_days_min,
          estimated_days_max
        )
      `)
      .eq('zone_id', matchingZone.id)
      .eq('is_active', true)
      .order('display_order');

    if (ratesError2) throw ratesError2;

    // 计算运费（支持多货币）
    const methodsWithRates = rates?.map(rate => {
      const methodData = rate.method as any;
      let usdPrice = rate.price || 0;

      // 按重量计费
      if (rate.billing_type === 'weight') {
        if (weight > 0) {
          usdPrice = (rate.base_fee || 0) + (rate.per_unit_fee || 0) * weight;
        } else {
          usdPrice = rate.base_fee || 0;
        }
      }

      // 按件计费
      if (rate.billing_type === 'per_unit') {
        if (weight > 0) {
          usdPrice = (rate.base_fee || 0) + (rate.per_unit_fee || 0) * weight;
        } else {
          usdPrice = rate.base_fee || 0;
        }
      }

      // 转换为目标货币
      const convertedPrice = usdPrice * conversionRate;

      // 获取时效
      const daysMin = rate.estimated_days_min ?? methodData?.estimated_days_min;
      const daysMax = rate.estimated_days_max ?? methodData?.estimated_days_max;

      // 格式化显示
      const symbol = getCurrencySymbol(targetCurrency);
      let priceFormula = '';
      if (rate.billing_type === 'flat') {
        priceFormula = convertedPrice === 0 ? 'Free shipping' : `${symbol}${convertedPrice.toFixed(2)}`;
      } else if (rate.billing_type === 'weight' || rate.billing_type === 'per_unit') {
        const convertedBase = (rate.base_fee || 0) * conversionRate;
        const convertedPerUnit = (rate.per_unit_fee || 0) * conversionRate;
        if (weight > 0) {
          const total = convertedBase + convertedPerUnit * weight;
          priceFormula = `${symbol}${convertedBase.toFixed(2)} + ${symbol}${convertedPerUnit.toFixed(2)}/kg × ${weight.toFixed(2)}kg = ${symbol}${total.toFixed(2)}`;
        } else {
          priceFormula = `Estimated: ${symbol}${convertedBase.toFixed(2)} (base rate)`;
        }
      } else if (rate.billing_type === 'free') {
        priceFormula = 'Free shipping';
      }

      return {
        id: methodData?.id,
        method_code: methodData?.method_code,
        method_name: methodData?.method_name,
        method_description: methodData?.method_description,
        // USD 原价
        price_usd: usdPrice,
        // 目标货币价格
        price: convertedPrice,
        // 显示用的货币
        currency: targetCurrency,
        currencySymbol: symbol,
        price_formula: priceFormula,
        billing_type: rate.billing_type,
        base_fee_usd: rate.base_fee,
        base_fee: (rate.base_fee || 0) * conversionRate,
        per_unit_fee_usd: rate.per_unit_fee,
        per_unit_fee: (rate.per_unit_fee || 0) * conversionRate,
        weight_unit: rate.weight_unit,
        free_shipping_threshold: rate.free_shipping_threshold ? rate.free_shipping_threshold * conversionRate : null,
        estimated_days_min: daysMin,
        estimated_days_max: daysMax,
        display_order: rate.display_order,
      };
    }) || [];

    return NextResponse.json({
      currency: targetCurrency,
      currencySymbol: getCurrencySymbol(targetCurrency),
      conversionRate: conversionRate,
      zone: {
        code: matchingZone.zone_code,
        name: matchingZone.zone_name,
      },
      methods: methodsWithRates,
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300',
      }
    });

  } catch (error) {
    console.error('Failed to fetch shipping methods:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shipping methods' },
      { status: 500 }
    );
  }
}

/**
 * 获取货币符号
 */
function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    USD: '$', CNY: '¥', JPY: '¥', THB: '฿', EUR: '€', GBP: '£',
    KRW: '₩', HKD: 'HK$', TWD: 'NT$', SGD: 'S$', MYR: 'RM',
    PHP: '₱', IDR: 'Rp', VND: '₫', INR: '₹', BRL: 'R$',
    MXN: 'MX$', ARS: 'AR$', CLP: 'CL$', COP: 'CO$', PEN: 'S/',
    RUB: '₽', PLN: 'zł', CZK: 'Kč', HUF: 'Ft', RON: 'lei',
    BGN: 'лв', CHF: 'CHF', CAD: 'C$', AUD: 'A$', NZD: 'NZ$',
    SEK: 'kr', NOK: 'kr', DKK: 'kr', ILS: '₪', TRY: '₺',
    ZAR: 'R', EGP: 'E£', NGN: '₦', KES: 'KSh', AED: 'د.إ', SAR: '﷼',
  };
  return symbols[currency] || currency;
}
