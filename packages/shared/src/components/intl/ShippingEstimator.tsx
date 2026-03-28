'use client';

import React, { useState, useEffect } from 'react';
import { Truck, Globe, ChevronDown, Package, Loader2 } from 'lucide-react';
import { supabase } from '@vetsphere/shared/services/supabase';
import { useCart } from '@vetsphere/shared/context/CartContext';

// Types
interface ShippingZone {
  id: string;
  zone_code: string;
  zone_name: Record<string, string>;
  region: 'US' | 'EU' | 'SEA';
  countries: string[];
  billing_type: 'weight' | 'flat';
  base_fee: number;
  currency: string;
  per_unit_fee: number;
  weight_unit: string;
  estimated_days_min: number;
  estimated_days_max: number;
}

interface ShippingRate {
  zoneCode: string;
  zoneName: string;
  shippingCost: number;
  estimatedDays: string;
  currency: string;
}

interface CartShippingEstimate {
  totalWeight: number;
  weightUnit: string;
  rates: ShippingRate[];
  defaultRate: ShippingRate | null;
}

// Labels for different languages
const labels = {
  en: {
    title: 'Shipping Estimate',
    weight: 'Total Weight',
    days: 'Estimated Delivery',
    calculating: 'Calculating...',
    selectCountry: 'Select your country',
    noItems: 'Add items to see shipping options',
    zoneLabels: { US: 'United States', EU: 'Europe', SEA: 'Southeast Asia' },
  },
  th: {
    title: 'ประมาณการจัดส่ง',
    weight: 'น้ำหนักรวม',
    days: 'ระยะเวลาจัดส่งโดยประมาณ',
    calculating: 'กำลังคำนวณ...',
    selectCountry: 'เลือกประเทศของคุณ',
    noItems: 'เพิ่มสินค้าเพื่อดูตัวเลือกการจัดส่ง',
    zoneLabels: { US: 'สหรัฐอเมริกา', EU: 'ยุโรป', SEA: 'เอเชียตะวันออกเฉียงใต้' },
  },
  ja: {
    title: '配送見積もり',
    weight: '合計重量',
    days: 'お届け予定日',
    calculating: '計算中...',
    selectCountry: '国を選択',
    noItems: '商品を追加して配送オプションを表示',
    zoneLabels: { US: 'アメリカ合衆国', EU: 'ヨーロッパ', SEA: '東南アジア' },
  },
};

interface ShippingEstimatorProps {
  locale?: string;
  language?: string;
}

export default function ShippingEstimator({ locale = 'en', language = 'en' }: ShippingEstimatorProps) {
  const { cart } = useCart();
  const [estimate, setEstimate] = useState<CartShippingEstimate | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const t = labels[language as keyof typeof labels] || labels.en;

  // Calculate shipping when cart changes
  useEffect(() => {
    const calculateShipping = async () => {
      // Filter product items only
      const productItems = cart.filter(item => item.type === 'product');

      if (productItems.length === 0) {
        setEstimate(null);
        return;
      }

      setLoading(true);

      try {
        // Get shipping zones
        const { data: zones, error: zonesError } = await supabase
          .from('shipping_zones')
          .select('*')
          .eq('is_active', true)
          .order('display_order');

        if (zonesError || !zones) {
          console.error('Failed to fetch shipping zones:', zonesError);
          setLoading(false);
          return;
        }

        // Calculate total weight (use default 1kg if no weight data)
        const totalWeight = productItems.reduce((sum, item) => {
          // Default weight of 1kg per item if no weight info available
          const itemWeight = (item as any).weight || 1;
          return sum + itemWeight * item.quantity;
        }, 0);

        // Calculate rates for each zone
        const rates: ShippingRate[] = (zones as ShippingZone[]).map(zone => {
          let shippingCost = zone.base_fee;

          if (zone.billing_type === 'weight') {
            const weightInUnit = zone.weight_unit === 'g'
              ? totalWeight / 1000
              : zone.weight_unit === 'lb'
              ? totalWeight * 0.453592
              : totalWeight;
            shippingCost += zone.per_unit_fee * weightInUnit;
          }

          const estimatedDays = zone.estimated_days_min === zone.estimated_days_max
            ? `${zone.estimated_days_min} days`
            : `${zone.estimated_days_min}-${zone.estimated_days_max} days`;

          return {
            zoneCode: zone.zone_code,
            zoneName: zone.zone_name[language] || zone.zone_name['en'] || zone.zone_code,
            shippingCost: Math.round(shippingCost * 100) / 100,
            estimatedDays,
            currency: zone.currency,
          };
        });

        setEstimate({
          totalWeight: Math.round(totalWeight * 1000) / 1000,
          weightUnit: 'kg',
          rates,
          defaultRate: rates[0] || null,
        });
      } catch (error) {
        console.error('Failed to calculate shipping:', error);
      } finally {
        setLoading(false);
      }
    };

    calculateShipping();
  }, [cart, language]);

  // Don't render if no items
  if (cart.filter(i => i.type === 'product').length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00A884]/10 flex items-center justify-center">
            <Truck className="w-5 h-5 text-[#00A884]" />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-slate-900 text-sm">{t.title}</h3>
            {estimate && !loading && (
              <p className="text-xs text-slate-500">
                {t.weight}: {estimate.totalWeight} {estimate.weightUnit}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {estimate && !loading && (
            <span className="text-sm font-bold text-[#00A884]">
              From ${estimate.defaultRate?.shippingCost.toFixed(2) || '0.00'}
            </span>
          )}
          <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 text-[#00A884] animate-spin mr-2" />
              <span className="text-sm text-slate-500">{t.calculating}</span>
            </div>
          ) : estimate ? (
            <div className="pt-4 space-y-3">
              {/* Weight Info */}
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
                <Package className="w-4 h-4" />
                <span>{t.weight}: {estimate.totalWeight} {estimate.weightUnit}</span>
              </div>

              {/* Shipping Options */}
              <div className="space-y-2">
                {estimate.rates.map(rate => (
                  <div
                    key={rate.zoneCode}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <Globe className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="text-sm font-bold text-slate-800">{rate.zoneName}</p>
                        <p className="text-xs text-slate-500">{t.days}: {rate.estimatedDays}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900">
                        ${rate.shippingCost.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Note */}
              <p className="text-xs text-slate-400 text-center pt-2">
                Shipping calculated at checkout based on destination
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

// Mini shipping indicator for cart page
interface MiniShippingIndicatorProps {
  productCount: number;
  locale?: string;
  language?: string;
}

export function MiniShippingIndicator({
  productCount,
  locale = 'en',
  language = 'en',
}: MiniShippingIndicatorProps) {
  const t = labels[language as keyof typeof labels] || labels.en;

  if (productCount === 0) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      <Truck className="w-4 h-4 text-[#00A884]" />
      <span>
        Shipping calculated at checkout
      </span>
    </div>
  );
}
