'use client';

import React, { useState, useEffect } from 'react';
import { Package, TrendingDown, Info } from 'lucide-react';
import { useLanguage } from '@vetsphere/shared/context/LanguageContext';

interface PriceTier {
  id: string;
  sku_id: string;
  min_quantity: number;
  max_quantity: number | null;
  price_usd: number;
  price_cny: number | null;
  price_jpy: number | null;
  price_thb: number | null;
}

interface PriceTierDisplayProps {
  skuId: string;
  currency?: string;
  className?: string;
  basePrice?: number; // 原价（用于计算折扣，优先使用此值）
  onQuantityChange?: (quantity: number) => void; // 数量变化时通知父组件
  onPriceChange?: (price: number | null, quantity: number) => void; // 价格变化时通知父组件（阶梯价格）
}

export default function PriceTierDisplay({ skuId, currency = 'USD', className = '', basePrice: basePriceProp, onQuantityChange, onPriceChange }: PriceTierDisplayProps) {
  const { t } = useLanguage();
  const pt = t.priceTiers;
  
  const [tiers, setTiers] = useState<PriceTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [applicablePrice, setApplicablePrice] = useState<number | null>(null);
  const [applicableTier, setApplicableTier] = useState<PriceTier | null>(null);

  // 使用传入的 basePrice 或从第一个阶梯价格推断
  const basePrice = basePriceProp || (tiers.length > 0 ? tiers[0].price_usd : null);

  // 根据当前货币获取正确的价格
  const getCurrentCurrencyPrice = (tier: PriceTier): number | null => {
    switch (currency.toUpperCase()) {
      case 'CNY':
        return tier.price_cny || null;
      case 'JPY':
        return tier.price_jpy || null;
      case 'THB':
        return tier.price_thb || null;
      default:
        return tier.price_usd || null;
    }
  };

  useEffect(() => {
    if (!skuId) return;

    const fetchPriceTiers = async () => {
      try {
        // 获取阶梯价格
        const res = await fetch(`/api/price-tiers?sku_id=${skuId}&currency=${currency}&quantity=${selectedQuantity}`);
        if (res.ok) {
          const data = await res.json();
          setTiers(data.tiers || []);
          setApplicableTier(data.applicableTier);
          
          // 根据当前货币获取正确的价格
          if (data.applicableTier) {
            const price = getCurrentCurrencyPrice(data.applicableTier);
            setApplicablePrice(price);
          } else {
            setApplicablePrice(null);
          }
        }
      } catch (error) {
        console.error('Failed to fetch price tiers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPriceTiers();
  }, [skuId, currency, selectedQuantity]);

  // Notify parent component when quantity or price changes
  useEffect(() => {
    if (onQuantityChange) {
      onQuantityChange(selectedQuantity);
    }
    if (onPriceChange) {
      onPriceChange(applicablePrice, selectedQuantity);
    }
  }, [selectedQuantity, applicablePrice, onQuantityChange, onPriceChange]);

  if (loading || tiers.length === 0) {
    return null;
  }

  const getQuantityLabel = (tier: PriceTier) => {
    if (tier.min_quantity && tier.max_quantity) {
      return `${tier.min_quantity}-${tier.max_quantity}`;
    }
    if (tier.min_quantity) {
      return `${tier.min_quantity}+`;
    }
    return 'Any';
  };

  const getPriceDisplay = (tier: PriceTier) => {
    switch (currency.toUpperCase()) {
      case 'CNY':
        return tier.price_cny || tier.price_usd;
      case 'JPY':
        return tier.price_jpy || tier.price_usd;
      case 'THB':
        return tier.price_thb || tier.price_usd;
      default:
        return tier.price_usd;
    }
  };

  const calculateSavings = (tier: PriceTier) => {
    // 使用原价（selling_price_usd）作为基准，而不是第一个阶梯的价格
    const originalPrice = basePrice || tiers[0]?.price_usd || 0;
    const tierPrice = getPriceDisplay(tier);
    if (originalPrice > 0 && tierPrice > 0) {
      const savings = ((originalPrice - tierPrice) / originalPrice) * 100;
      return savings > 0 ? Math.round(savings) : 0;
    }
    return 0;
  };

  const getCurrencySymbol = () => {
    const currencySymbols: Record<string, string> = {
      USD: '$',
      CNY: '¥',
      JPY: '¥',
      THB: '฿',
      EUR: '€',
      GBP: '£',
    };
    return currencySymbols[currency] || '$';
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Quantity Selector */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-slate-700">{pt.quantity}</label>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedQuantity(q => Math.max(1, q - 1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-300 hover:bg-slate-50"
          >
            -
          </button>
          <input
            type="number"
            value={selectedQuantity}
            onChange={e => setSelectedQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-16 text-center border border-slate-300 rounded-lg py-1"
            min="1"
          />
          <button
            onClick={() => setSelectedQuantity(q => q + 1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-300 hover:bg-slate-50"
          >
            +
          </button>
        </div>
      </div>

      {/* Price Tiers Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-700">{pt.bulkPricing}</h3>
            <span className="ml-auto text-xs text-slate-500 flex items-center gap-1">
              <Info className="w-3 h-3" />
              {pt.savings}
            </span>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {tiers.map((tier, index) => {
            const savings = calculateSavings(tier);
            const isApplicable = applicableTier?.id === tier.id;

            return (
              <div
                key={tier.id}
                className={`px-4 py-3 flex items-center justify-between transition-colors ${
                  isApplicable ? 'bg-emerald-50' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${
                    index === 0 ? 'bg-slate-200 text-slate-700' :
                    index === 1 ? 'bg-amber-200 text-amber-800' :
                    index === 2 ? 'bg-emerald-200 text-emerald-800' :
                    'bg-blue-200 text-blue-800'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {getQuantityLabel(tier)} {pt.units}
                    </p>
                    {savings > 0 && (
                      <p className="text-xs text-emerald-600 font-medium">
                        {pt.save} {savings}%
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <p className={`text-lg font-bold ${
                    isApplicable ? 'text-emerald-600' : 'text-slate-900'
                  }`}>
                    {getCurrencySymbol()}
                    {getPriceDisplay(tier).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-slate-500">{pt.perUnit}</p>
                  {isApplicable && (
                    <p className="text-xs text-emerald-600 font-medium">
                      {pt.selected}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Applied Tier Summary */}
      {applicableTier && applicablePrice && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="text-sm font-bold text-emerald-800">
                ✓ {pt.discountApplied}
              </p>
              <p className="text-xs text-emerald-700 mt-1">
                {pt.savingsInfo
                  .replace('{qty}', String(selectedQuantity))
                  .replace('{percent}', String(basePrice && applicablePrice ? Math.round((1 - applicablePrice / basePrice) * 100) : 0))}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-emerald-600">{t.common.total}</p>
              <p className="text-xl font-bold text-emerald-700">
                {getCurrencySymbol()}
                {(applicablePrice * selectedQuantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}